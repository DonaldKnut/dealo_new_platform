import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

import type { AppEnv } from '../config/env.validation';

const PAYSTACK_BASE = 'https://api.paystack.co';

export type PaystackTransaction = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at?: string | null;
  gateway_response?: string;
  channel?: string;
  customer?: { email?: string; customer_code?: string };
  metadata?: Record<string, unknown> | string | null;
};

export type PaystackRefund = {
  id: number;
  status: string;
  amount: number;
  currency: string;
  transaction: { id: number; reference: string } | number;
};

/** Every product's payment reference starts with one of these, so webhooks can be routed. */
export const PAYMENT_PREFIX = {
  api: 'dealo_api_',
  agents: 'dealo_agents_',
  cvPremium: 'dealo_cv_',
} as const;

export function newReference(prefix: string) {
  return `${prefix}${randomBytes(10).toString('hex')}`;
}

/** Naira to kobo (Paystack amounts are always in the smallest unit). */
export const toMinor = (major: number) => Math.round(major * 100);

/** Thin Paystack REST client. Every call fails clearly until PAYSTACK_SECRET_KEY is set. */
@Injectable()
export class PaystackClient {
  private readonly secretKey?: string;
  readonly publicKey?: string;

  constructor(config: ConfigService<AppEnv, true>) {
    this.secretKey = config.get('PAYSTACK_SECRET_KEY', { infer: true });
    this.publicKey = config.get('PAYSTACK_PUBLIC_KEY', { infer: true });
  }

  get isConfigured() {
    return Boolean(this.secretKey);
  }

  /** "test" or "live", read from the key prefix, so the UI can warn when test mode is on. */
  get mode(): 'test' | 'live' | null {
    if (!this.secretKey) return null;
    return this.secretKey.startsWith('sk_live_') ? 'live' : 'test';
  }

  async initialize(input: {
    email: string;
    amountMinor: number;
    currency: string;
    reference: string;
    callbackUrl: string;
    metadata: Record<string, unknown>;
    channels?: Array<'card' | 'bank' | 'ussd' | 'bank_transfer' | 'mobile_money' | 'qr'>;
  }): Promise<{ authorization_url: string; access_code: string; reference: string }> {
    return this.request('POST', '/transaction/initialize', {
      email: input.email,
      amount: input.amountMinor,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
      ...(input.channels ? { channels: input.channels } : {}),
    });
  }

  verify(reference: string): Promise<PaystackTransaction> {
    return this.request('GET', `/transaction/verify/${encodeURIComponent(reference)}`);
  }

  /** Full refund unless an amount (in kobo) is given. */
  refund(reference: string, amountMinor?: number, note?: string): Promise<PaystackRefund> {
    return this.request('POST', '/refund', {
      transaction: reference,
      ...(amountMinor ? { amount: amountMinor } : {}),
      ...(note ? { merchant_note: note.slice(0, 200) } : {}),
    });
  }

  /** Paystack signs webhook bodies with HMAC-SHA512 using the secret key. */
  isValidSignature(rawBody: Buffer | undefined, signature: string | undefined) {
    if (!this.secretKey || !rawBody || !signature) return false;
    const expected = Buffer.from(createHmac('sha512', this.secretKey).update(rawBody).digest('hex'));
    const presented = Buffer.from(signature);
    return expected.length === presented.length && timingSafeEqual(expected, presented);
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    if (!this.secretKey) {
      throw new ServiceUnavailableException('Online payments are not switched on yet. Contact Dealo and we will help you today.');
    }
    const response = await fetch(`${PAYSTACK_BASE}${path}`, {
      method,
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await response.json().catch(() => null)) as { status: boolean; message: string; data: T } | null;
    if (!response.ok || !json?.status) {
      throw new ServiceUnavailableException(`Payment provider error: ${json?.message ?? response.status}`);
    }
    return json.data;
  }
}
