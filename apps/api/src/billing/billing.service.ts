import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SANDBOX_KEY_POLICY, type UpdateApiPlanConfigInput } from '@dealo/shared';
import {
  ApiInvoiceStatus,
  ApiKeyEnvironment,
  ApiKeyPlan,
  ApiSubscriptionStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';

import { ApiPlansService } from '../api-keys/api-plans.service';
import type { AuthUser } from '../auth/auth.types';
import { AuditLogService } from '../common/audit-log.service';
import type { AppEnv } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackClient, type PaystackTransaction } from './paystack.client';

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRY_SWEEP_MS = 60 * 60 * 1000;

function monthStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

@Injectable()
export class BillingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillingService.name);
  private sweepTimer?: NodeJS.Timeout;
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackClient,
    private readonly plans: ApiPlansService,
    private readonly auditLog: AuditLogService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/$/, '');
  }

  onModuleInit() {
    void this.expireLapsedSubscriptions();
    this.sweepTimer = setInterval(() => void this.expireLapsedSubscriptions(), EXPIRY_SWEEP_MS);
    this.sweepTimer.unref();
  }

  onModuleDestroy() {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  // ------------------------------------------------------------------ plans

  async listPlans() {
    const rows = await this.prisma.apiPlanConfig.findMany({ orderBy: { priceMinor: 'asc' } });
    return {
      paymentsEnabled: this.paystack.isConfigured,
      plans: rows.map((row) => ({
        plan: row.plan,
        name: row.name,
        description: row.description,
        priceMinor: row.priceMinor,
        currency: row.currency,
        periodDays: row.periodDays,
        rateLimitPerMin: row.rateLimitPerMin,
        monthlyQuota: row.monthlyQuota,
        maxLiveKeys: row.maxLiveKeys,
        isPurchasable: row.isPurchasable,
      })),
    };
  }

  async updatePlan(plan: ApiKeyPlan, input: UpdateApiPlanConfigInput, actor: AuthUser) {
    const existing = await this.prisma.apiPlanConfig.findUnique({ where: { plan } });
    if (!existing) throw new NotFoundException('Plan config not found — run the database seed');

    const updated = await this.prisma.apiPlanConfig.update({
      where: { plan },
      data: { ...input, currency: input.currency?.toUpperCase() },
    });
    this.plans.invalidate();

    if (input.rateLimitPerMin !== undefined) {
      await this.prisma.apiKey.updateMany({
        where: { plan, environment: ApiKeyEnvironment.LIVE },
        data: { rateLimitPerMin: updated.rateLimitPerMin },
      });
    }

    await this.auditLog.record({
      action: 'API_PLAN_UPDATED',
      entityType: 'ApiPlanConfig',
      entityId: updated.id,
      actorId: actor.id,
      metadata: { plan, changes: input },
    });
    return updated;
  }

  // ----------------------------------------------------------- subscriber

  async myBilling(user: AuthUser) {
    const [subscription, invoices, keys] = await Promise.all([
      this.prisma.apiSubscription.findUnique({ where: { userId: user.id } }),
      this.prisma.apiInvoice.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          reference: true,
          plan: true,
          amountMinor: true,
          currency: true,
          status: true,
          paidAt: true,
          createdAt: true,
        },
      }),
      this.prisma.apiKey.findMany({ where: { createdByUserId: user.id }, select: { id: true } }),
    ]);

    const requestsThisMonth = keys.length
      ? await this.prisma.apiUsageLog.count({
          where: { apiKeyId: { in: keys.map((key) => key.id) }, createdAt: { gte: monthStart() } },
        })
      : 0;

    const activePlan =
      subscription &&
      subscription.status === ApiSubscriptionStatus.ACTIVE &&
      subscription.currentPeriodEnd.getTime() > Date.now()
        ? subscription.plan
        : ApiKeyPlan.SANDBOX;
    const config = await this.plans.getConfig(activePlan);

    return {
      activePlan,
      planConfig: config ?? null,
      subscription,
      requestsThisMonth,
      invoices,
      paymentsEnabled: this.paystack.isConfigured,
    };
  }

  async checkout(user: AuthUser, plan: ApiKeyPlan) {
    const config = await this.prisma.apiPlanConfig.findUnique({ where: { plan } });
    if (!config || !config.isPurchasable || config.priceMinor <= 0) {
      throw new BadRequestException('This plan cannot be purchased online');
    }

    const account = await this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
    if (!account) throw new ForbiddenException('Account not found');

    const reference = `dealo_api_${randomBytes(10).toString('hex')}`;
    const invoice = await this.prisma.apiInvoice.create({
      data: {
        reference,
        userId: user.id,
        plan,
        amountMinor: config.priceMinor,
        currency: config.currency,
        periodDays: config.periodDays,
      },
    });

    try {
      const session = await this.paystack.initialize({
        email: account.email,
        amountMinor: config.priceMinor,
        currency: config.currency,
        reference,
        callbackUrl: `${this.appUrl}/dashboard/developer?billing=return`,
        metadata: { invoiceId: invoice.id, plan, userId: user.id, product: 'dealo_api' },
      });
      await this.prisma.apiInvoice.update({
        where: { id: invoice.id },
        data: { authorizationUrl: session.authorization_url },
      });
      return { reference, authorizationUrl: session.authorization_url };
    } catch (error) {
      await this.prisma.apiInvoice.update({
        where: { id: invoice.id },
        data: { status: ApiInvoiceStatus.CANCELLED, failureReason: 'Checkout could not be started' },
      });
      throw error;
    }
  }

  async verifyForUser(user: AuthUser, reference: string) {
    const invoice = await this.prisma.apiInvoice.findUnique({ where: { reference } });
    if (!invoice || invoice.userId !== user.id) throw new NotFoundException('Payment not found');
    if (invoice.status === ApiInvoiceStatus.PENDING) {
      await this.applyTransaction(await this.paystack.verify(reference));
    }
    return this.prisma.apiInvoice.findUnique({
      where: { reference },
      select: { reference: true, status: true, plan: true, paidAt: true, failureReason: true },
    });
  }

  // --------------------------------------------------------------- webhook

  async handlePaystackWebhook(rawBody: Buffer | undefined, signature: string | undefined) {
    if (!this.paystack.isValidSignature(rawBody, signature)) {
      throw new ForbiddenException('Invalid signature');
    }
    const event = JSON.parse(rawBody!.toString('utf8')) as { event: string; data: PaystackTransaction };
    if (event.event === 'charge.success' && event.data?.reference?.startsWith('dealo_api_')) {
      // Never trust the webhook body alone: re-verify with Paystack before granting access.
      await this.applyTransaction(await this.paystack.verify(event.data.reference));
    }
    return { received: true };
  }

  /** Idempotent: a reference can only move PENDING -> PAID/FAILED once. */
  private async applyTransaction(txn: PaystackTransaction) {
    const invoice = await this.prisma.apiInvoice.findUnique({ where: { reference: txn.reference } });
    if (!invoice || invoice.status !== ApiInvoiceStatus.PENDING) return;

    if (txn.status !== 'success') {
      if (txn.status === 'failed' || txn.status === 'abandoned') {
        await this.prisma.apiInvoice.updateMany({
          where: { id: invoice.id, status: ApiInvoiceStatus.PENDING },
          data: { status: ApiInvoiceStatus.FAILED, failureReason: txn.gateway_response ?? txn.status },
        });
      }
      return;
    }

    if (txn.amount !== invoice.amountMinor || txn.currency.toUpperCase() !== invoice.currency.toUpperCase()) {
      await this.prisma.apiInvoice.updateMany({
        where: { id: invoice.id, status: ApiInvoiceStatus.PENDING },
        data: {
          status: ApiInvoiceStatus.FAILED,
          failureReason: `Amount mismatch: paid ${txn.amount} ${txn.currency}, expected ${invoice.amountMinor} ${invoice.currency}`,
        },
      });
      this.logger.warn(`Paystack amount mismatch for ${invoice.reference}`);
      return;
    }

    const claimed = await this.prisma.apiInvoice.updateMany({
      where: { id: invoice.id, status: ApiInvoiceStatus.PENDING },
      data: {
        status: ApiInvoiceStatus.PAID,
        paidAt: txn.paid_at ? new Date(txn.paid_at) : new Date(),
        providerTxnId: String(txn.id),
      },
    });
    if (claimed.count === 0) return;

    const now = Date.now();
    const existing = await this.prisma.apiSubscription.findUnique({ where: { userId: invoice.userId } });
    const extendsCurrent =
      existing?.status === ApiSubscriptionStatus.ACTIVE &&
      existing.plan === invoice.plan &&
      existing.currentPeriodEnd.getTime() > now;
    const periodStart = extendsCurrent ? existing.currentPeriodEnd : new Date(now);
    const periodEnd = new Date(periodStart.getTime() + invoice.periodDays * DAY_MS);

    const subscription = await this.prisma.apiSubscription.upsert({
      where: { userId: invoice.userId },
      update: {
        plan: invoice.plan,
        status: ApiSubscriptionStatus.ACTIVE,
        currentPeriodStart: extendsCurrent ? existing.currentPeriodStart : periodStart,
        currentPeriodEnd: periodEnd,
      },
      create: {
        userId: invoice.userId,
        plan: invoice.plan,
        status: ApiSubscriptionStatus.ACTIVE,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });
    await this.prisma.apiInvoice.update({
      where: { id: invoice.id },
      data: { subscriptionId: subscription.id },
    });

    const config = await this.plans.getConfig(invoice.plan);
    await this.prisma.apiKey.updateMany({
      where: { createdByUserId: invoice.userId, environment: ApiKeyEnvironment.LIVE },
      data: { plan: invoice.plan, ...(config ? { rateLimitPerMin: config.rateLimitPerMin } : {}) },
    });

    await this.auditLog.record({
      action: 'API_PLAN_PAID',
      entityType: 'ApiInvoice',
      entityId: invoice.id,
      actorId: invoice.userId,
      metadata: {
        plan: invoice.plan,
        amountMinor: invoice.amountMinor,
        currency: invoice.currency,
        periodEnd: periodEnd.toISOString(),
      },
    });
  }

  /** Lapsed plans fall back to sandbox limits; live keys keep working at those limits. */
  private async expireLapsedSubscriptions() {
    try {
      const lapsed = await this.prisma.apiSubscription.findMany({
        where: { status: ApiSubscriptionStatus.ACTIVE, currentPeriodEnd: { lt: new Date() } },
      });
      for (const subscription of lapsed) {
        await this.prisma.apiSubscription.update({
          where: { id: subscription.id },
          data: { status: ApiSubscriptionStatus.EXPIRED },
        });
        const sandbox = await this.plans.getConfig(ApiKeyPlan.SANDBOX);
        await this.prisma.apiKey.updateMany({
          where: { createdByUserId: subscription.userId, environment: ApiKeyEnvironment.LIVE },
          data: {
            plan: ApiKeyPlan.SANDBOX,
            rateLimitPerMin: sandbox?.rateLimitPerMin ?? SANDBOX_KEY_POLICY.rateLimitPerMin,
          },
        });
        this.logger.log(`API subscription ${subscription.id} expired; keys downgraded to sandbox`);
      }
    } catch (error) {
      this.logger.warn(`Subscription expiry sweep failed: ${String(error)}`);
    }
  }

  // ------------------------------------------------------------------ admin

  async adminOverview() {
    const [invoices, subscriptions] = await Promise.all([
      this.prisma.apiInvoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      }),
      this.prisma.apiSubscription.findMany({
        where: { status: ApiSubscriptionStatus.ACTIVE },
        include: { user: { select: { email: true } } },
        orderBy: { currentPeriodEnd: 'asc' },
      }),
    ]);

    const paid = invoices.filter((invoice) => invoice.status === ApiInvoiceStatus.PAID);
    const revenueByCurrency = paid.reduce<Record<string, number>>((acc, invoice) => {
      acc[invoice.currency] = (acc[invoice.currency] ?? 0) + invoice.amountMinor;
      return acc;
    }, {});

    return {
      revenueByCurrency,
      activeSubscriptions: subscriptions.map((subscription) => ({
        id: subscription.id,
        email: subscription.user.email,
        plan: subscription.plan,
        currentPeriodEnd: subscription.currentPeriodEnd,
      })),
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        reference: invoice.reference,
        email: invoice.user.email,
        plan: invoice.plan,
        amountMinor: invoice.amountMinor,
        currency: invoice.currency,
        status: invoice.status,
        paidAt: invoice.paidAt,
        failureReason: invoice.failureReason,
        createdAt: invoice.createdAt,
      })),
    };
  }
}
