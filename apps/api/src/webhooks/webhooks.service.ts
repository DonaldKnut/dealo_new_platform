import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WebhookEvent,
  type CreateWebhookEndpointInput,
  type UpdateWebhookEndpointInput,
} from '@dealo/shared';
import { Prisma, UserRole, WebhookDeliveryStatus, type HireInquiry, type WebhookEndpoint } from '@prisma/client';
import { randomBytes } from 'crypto';

import type { AuthUser } from '../auth/auth.types';
import type { AppEnv } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import {
  SIGNATURE_HEADER,
  assertSafeWebhookUrl,
  generateWebhookSecret,
  signWebhookPayload,
} from './webhook-security';

/** Delay before attempt N+1, indexed by attempts already made. */
const RETRY_DELAYS_MS = [0, 30_000, 2 * 60_000, 10 * 60_000, 60 * 60_000];
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length;
const REQUEST_TIMEOUT_MS = 10_000;
const CLAIM_LEASE_MS = 60_000;
const SWEEP_INTERVAL_MS = 30_000;
const AUTO_DISABLE_AFTER_FAILURES = 50;

const ENDPOINT_SELECT = {
  id: true,
  url: true,
  description: true,
  events: true,
  isActive: true,
  isGlobal: true,
  ownerUserId: true,
  organizationId: true,
  failureCount: true,
  lastDeliveryAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WebhookEndpointSelect;

function isAdmin(user: AuthUser) {
  return user.roles.includes(UserRole.SUPER_ADMIN) || user.roles.includes(UserRole.ADMIN);
}

function hireInquiryPayload(inquiry: HireInquiry) {
  return {
    id: inquiry.id,
    status: inquiry.status,
    companyName: inquiry.companyName,
    roleTitle: inquiry.roleTitle,
    roleFamily: inquiry.roleFamily,
    serviceType: inquiry.serviceType,
    numberOfProfessionals: inquiry.numberOfProfessionals,
    location: inquiry.location,
    workArrangement: inquiry.workArrangement,
    isTest: inquiry.isTest,
    createdAt: inquiry.createdAt.toISOString(),
    updatedAt: inquiry.updatedAt.toISOString(),
  };
}

@Injectable()
export class WebhooksService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhooksService.name);
  private sweepTimer?: NodeJS.Timeout;
  private readonly isProduction: boolean;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.isProduction = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  onModuleInit() {
    this.sweepTimer = setInterval(() => void this.sweepDue(), SWEEP_INTERVAL_MS);
    this.sweepTimer.unref();
  }

  onModuleDestroy() {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  // ---------------------------------------------------------------- endpoints

  list(user: AuthUser) {
    return this.prisma.webhookEndpoint.findMany({
      where: isAdmin(user) ? {} : { ownerUserId: user.id },
      orderBy: { createdAt: 'desc' },
      select: ENDPOINT_SELECT,
    });
  }

  async create(input: CreateWebhookEndpointInput, user: AuthUser) {
    if (input.isGlobal && !isAdmin(user)) {
      throw new ForbiddenException('Only admins can create global webhooks');
    }
    await assertSafeWebhookUrl(input.url, this.isProduction);

    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    const secret = generateWebhookSecret();
    const endpoint = await this.prisma.webhookEndpoint.create({
      data: {
        url: input.url,
        description: input.description,
        events: input.events,
        isGlobal: input.isGlobal ?? false,
        secret,
        ownerUserId: user.id,
        organizationId: membership?.organizationId ?? null,
      },
      select: ENDPOINT_SELECT,
    });
    return { ...endpoint, secret };
  }

  async update(id: string, input: UpdateWebhookEndpointInput, user: AuthUser) {
    await this.findOwned(id, user);
    if (input.url) {
      await assertSafeWebhookUrl(input.url, this.isProduction);
    }
    return this.prisma.webhookEndpoint.update({
      where: { id },
      data: {
        url: input.url,
        description: input.description,
        events: input.events,
        isActive: input.isActive,
        ...(input.isActive ? { failureCount: 0 } : {}),
      },
      select: ENDPOINT_SELECT,
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOwned(id, user);
    await this.prisma.webhookDelivery.deleteMany({ where: { endpointId: id } });
    await this.prisma.webhookEndpoint.delete({ where: { id } });
    return { id, deleted: true };
  }

  async rotateSecret(id: string, user: AuthUser) {
    await this.findOwned(id, user);
    const secret = generateWebhookSecret();
    await this.prisma.webhookEndpoint.update({ where: { id }, data: { secret } });
    return { id, secret };
  }

  async deliveries(id: string, user: AuthUser) {
    await this.findOwned(id, user);
    return this.prisma.webhookDelivery.findMany({
      where: { endpointId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        event: true,
        status: true,
        attempts: true,
        responseCode: true,
        error: true,
        nextAttemptAt: true,
        deliveredAt: true,
        createdAt: true,
        payload: true,
      },
    });
  }

  async sendTest(id: string, user: AuthUser) {
    const endpoint = await this.findOwned(id, user);
    const [delivery] = await this.enqueue([endpoint], WebhookEvent.PING, {
      message: 'Dealo webhook test',
      endpointId: endpoint.id,
    });
    await this.attempt(delivery.id);
    return this.prisma.webhookDelivery.findUnique({
      where: { id: delivery.id },
      select: { id: true, status: true, responseCode: true, error: true, attempts: true },
    });
  }

  async redeliver(deliveryId: string, user: AuthUser) {
    const delivery = await this.prisma.webhookDelivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundException('Delivery not found');
    await this.findOwned(delivery.endpointId, user);

    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: WebhookDeliveryStatus.PENDING, attempts: 0, nextAttemptAt: new Date(), error: null },
    });
    await this.attempt(deliveryId);
    return this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      select: { id: true, status: true, responseCode: true, error: true, attempts: true },
    });
  }

  // ------------------------------------------------------------------ events

  /** Fire-and-forget; never throws into the calling request. */
  dispatchHireInquiryEvent(
    event: typeof WebhookEvent.HIRE_INQUIRY_CREATED | typeof WebhookEvent.HIRE_INQUIRY_STATUS_UPDATED,
    inquiry: HireInquiry,
    extra: Record<string, unknown> = {},
  ) {
    void (async () => {
      const keyOwnerId = inquiry.apiKeyId
        ? (
            await this.prisma.apiKey.findUnique({
              where: { id: inquiry.apiKeyId },
              select: { createdByUserId: true },
            })
          )?.createdByUserId
        : undefined;

      const audience: Prisma.WebhookEndpointWhereInput[] = [{ isGlobal: true }];
      if (inquiry.organizationId) audience.push({ organizationId: inquiry.organizationId });
      if (keyOwnerId) audience.push({ ownerUserId: keyOwnerId });

      const endpoints = await this.prisma.webhookEndpoint.findMany({
        where: { isActive: true, events: { has: event }, OR: audience },
      });
      if (endpoints.length === 0) return;

      const deliveries = await this.enqueue(endpoints, event, {
        hireInquiry: hireInquiryPayload(inquiry),
        ...extra,
      }, !inquiry.isTest);
      await Promise.all(deliveries.map((delivery) => this.attempt(delivery.id)));
    })().catch((error: unknown) => {
      this.logger.error(`Webhook dispatch failed for ${event}: ${String(error)}`);
    });
  }

  /** ATS events go only to the workspace's own endpoints, never to global (Dealo) ones. */
  dispatchWorkspaceEvent(event: string, organizationId: string, data: Record<string, unknown>) {
    void (async () => {
      const endpoints = await this.prisma.webhookEndpoint.findMany({
        where: { isActive: true, events: { has: event }, organizationId },
      });
      if (endpoints.length === 0) return;
      const deliveries = await this.enqueue(endpoints, event, data);
      await Promise.all(deliveries.map((delivery) => this.attempt(delivery.id)));
    })().catch((error: unknown) => {
      this.logger.error(`Webhook dispatch failed for ${event}: ${String(error)}`);
    });
  }

  private async enqueue(
    endpoints: Pick<WebhookEndpoint, 'id'>[],
    event: string,
    data: Record<string, unknown>,
    livemode = true,
  ) {
    const eventId = `evt_${randomBytes(12).toString('hex')}`;
    const createdAt = new Date();
    return Promise.all(
      endpoints.map((endpoint) =>
        this.prisma.webhookDelivery.create({
          data: {
            endpointId: endpoint.id,
            event,
            payload: {
              id: eventId,
              type: event,
              livemode,
              createdAt: createdAt.toISOString(),
              data,
            } as Prisma.InputJsonValue,
            nextAttemptAt: createdAt,
          },
          select: { id: true },
        }),
      ),
    );
  }

  // ---------------------------------------------------------------- delivery

  private async sweepDue() {
    try {
      const due = await this.prisma.webhookDelivery.findMany({
        where: { status: WebhookDeliveryStatus.PENDING, nextAttemptAt: { lte: new Date() } },
        select: { id: true },
        take: 25,
      });
      await Promise.all(due.map((delivery) => this.attempt(delivery.id)));
    } catch (error) {
      this.logger.warn(`Webhook sweep failed: ${String(error)}`);
    }
  }

  /** Claims a due delivery with a short lease so concurrent workers don't double-send. */
  private async attempt(deliveryId: string) {
    const now = new Date();
    const claimed = await this.prisma.webhookDelivery.updateMany({
      where: { id: deliveryId, status: WebhookDeliveryStatus.PENDING, nextAttemptAt: { lte: now } },
      data: { nextAttemptAt: new Date(now.getTime() + CLAIM_LEASE_MS) },
    });
    if (claimed.count === 0) return;

    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { endpoint: true },
    });
    if (!delivery) return;
    if (!delivery.endpoint.isActive) {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: WebhookDeliveryStatus.FAILED, error: 'Endpoint disabled', nextAttemptAt: null },
      });
      return;
    }

    const body = JSON.stringify(delivery.payload);
    const attempts = delivery.attempts + 1;
    let responseCode: number | null = null;
    let responseBody: string | null = null;
    let error: string | null = null;

    try {
      await assertSafeWebhookUrl(delivery.endpoint.url, this.isProduction);
      const response = await fetch(delivery.endpoint.url, {
        method: 'POST',
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Dealo-Webhooks/1.0',
          'X-Dealo-Event': delivery.event,
          'X-Dealo-Delivery': delivery.id,
          [SIGNATURE_HEADER]: signWebhookPayload(delivery.endpoint.secret, body),
        },
        body,
      });
      responseCode = response.status;
      responseBody = (await response.text().catch(() => '')).slice(0, 1000);
      if (!response.ok) error = `HTTP ${response.status}`;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    const succeeded = error === null;
    const exhausted = !succeeded && attempts >= MAX_ATTEMPTS;

    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        attempts,
        responseCode,
        responseBody,
        error,
        status: succeeded
          ? WebhookDeliveryStatus.SUCCEEDED
          : exhausted
            ? WebhookDeliveryStatus.FAILED
            : WebhookDeliveryStatus.PENDING,
        deliveredAt: succeeded ? new Date() : null,
        nextAttemptAt:
          succeeded || exhausted ? null : new Date(Date.now() + RETRY_DELAYS_MS[attempts]),
      },
    });

    if (succeeded) {
      await this.prisma.webhookEndpoint.update({
        where: { id: delivery.endpointId },
        data: { failureCount: 0, lastDeliveryAt: new Date() },
      });
    } else if (exhausted) {
      const endpoint = await this.prisma.webhookEndpoint.update({
        where: { id: delivery.endpointId },
        data: { failureCount: { increment: 1 }, lastDeliveryAt: new Date() },
      });
      if (endpoint.failureCount >= AUTO_DISABLE_AFTER_FAILURES) {
        await this.prisma.webhookEndpoint.update({
          where: { id: endpoint.id },
          data: { isActive: false },
        });
        this.logger.warn(`Disabled webhook ${endpoint.id} after ${endpoint.failureCount} failed deliveries`);
      }
    } else if (RETRY_DELAYS_MS[attempts] <= SWEEP_INTERVAL_MS) {
      setTimeout(() => void this.attempt(deliveryId), RETRY_DELAYS_MS[attempts]).unref();
    }
  }

  private async findOwned(id: string, user: AuthUser) {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!endpoint || (endpoint.ownerUserId !== user.id && !isAdmin(user))) {
      throw new NotFoundException('Webhook endpoint not found');
    }
    return endpoint;
  }
}
