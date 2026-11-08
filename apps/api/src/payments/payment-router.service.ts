import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PaystackClient, type PaystackTransaction } from './paystack.client';

/** Applies a verified transaction to one product. Must be idempotent: Paystack retries webhooks. */
export type TransactionHandler = (txn: PaystackTransaction) => Promise<void>;

type PaystackEvent = { event: string; data?: { id?: number; reference?: string; transaction?: { reference?: string } | number } & Record<string, unknown> };

/**
 * One place where every Paystack payment lands. Products register the reference prefix they
 * own (see PAYMENT_PREFIX); webhooks and "I'm back from checkout" checks are routed to them.
 */
@Injectable()
export class PaymentRouterService {
  private readonly logger = new Logger(PaymentRouterService.name);
  private readonly handlers = new Map<string, { product: string; apply: TransactionHandler }>();

  constructor(
    private readonly paystack: PaystackClient,
    private readonly prisma: PrismaService,
  ) {}

  register(prefix: string, product: string, apply: TransactionHandler) {
    this.handlers.set(prefix, { product, apply });
  }

  private handlerFor(reference: string) {
    for (const [prefix, handler] of this.handlers) if (reference.startsWith(prefix)) return handler;
    return null;
  }

  /** Re-checks a payment with Paystack and hands it to its product. Never trusts the caller's copy. */
  async settle(reference: string) {
    const handler = this.handlerFor(reference);
    if (!handler) return null;
    const txn = await this.paystack.verify(reference);
    await handler.apply(txn);
    return txn;
  }

  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined) {
    if (!this.paystack.isValidSignature(rawBody, signature)) {
      throw new ForbiddenException('Invalid signature');
    }
    let event: PaystackEvent;
    try {
      event = JSON.parse(rawBody!.toString('utf8')) as PaystackEvent;
    } catch {
      return { received: true };
    }

    const reference =
      event.data?.reference ?? (typeof event.data?.transaction === 'object' ? event.data.transaction?.reference : undefined) ?? null;
    const handler = reference ? this.handlerFor(reference) : null;
    const eventKey = `${event.event}:${event.data?.id ?? reference ?? Date.now()}`;

    try {
      await this.prisma.paymentEvent.create({
        data: { eventKey, event: event.event, reference, product: handler?.product ?? null },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { received: true, duplicate: true };
      }
      throw error;
    }

    try {
      if (event.event === 'charge.success' && reference && handler) {
        await handler.apply(await this.paystack.verify(reference));
        await this.mark(eventKey, 'HANDLED');
      } else {
        // refund.*, transfer.*, subscription.* etc. are logged for finance; nothing to grant.
        await this.mark(eventKey, handler || !reference ? 'LOGGED' : 'UNKNOWN_REFERENCE');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Paystack ${event.event} for ${reference ?? 'unknown'} failed: ${message}`);
      // Drop the record so Paystack's automatic retry is processed instead of skipped as a duplicate.
      await this.prisma.paymentEvent.deleteMany({ where: { eventKey } }).catch(() => undefined);
      throw error;
    }
    return { received: true };
  }

  private mark(eventKey: string, status: string) {
    return this.prisma.paymentEvent.update({ where: { eventKey }, data: { status } }).catch(() => undefined);
  }

  config() {
    return {
      enabled: this.paystack.isConfigured,
      mode: this.paystack.mode,
      publicKey: this.paystack.publicKey ?? null,
      currency: 'NGN',
      products: [...this.handlers.values()].map((h) => h.product),
    };
  }
}
