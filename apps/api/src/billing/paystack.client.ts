import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

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
};

@Injectable()
export class PaystackClient {
  private readonly secretKey?: string;

  constructor(config: ConfigService<AppEnv, true>) {
    this.secretKey = config.get('PAYSTACK_SECRET_KEY', { infer: true });
  }

  get isConfigured() {
    return Boolean(this.secretKey);
  }

  async initialize(input: {
    email: string;
    amountMinor: number;
    currency: string;
    reference: string;
    callbackUrl: string;
    metadata: Record<string, unknown>;
  }): Promise<{ authorization_url: string; access_code: string; reference: string }> {
    return this.request('POST', '/transaction/initialize', {
      email: input.email,
      amount: input.amountMinor,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    });
  }

  verify(reference: string): Promise<PaystackTransaction> {
    return this.request('GET', `/transaction/verify/${encodeURIComponent(reference)}`);
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
      throw new ServiceUnavailableException('Online payments are not configured yet. Contact Dealo sales.');
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
    const json = (await response.json().catch(() => null)) as
      | { status: boolean; message: string; data: T }
      | null;
    if (!response.ok || !json?.status) {
      throw new ServiceUnavailableException(`Payment provider error: ${json?.message ?? response.status}`);
    }
    return json.data;
  }
}
