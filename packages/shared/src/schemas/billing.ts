import { z } from 'zod';

import { ApiKeyPlan } from '../enums';

const planEnum = z.enum([ApiKeyPlan.SANDBOX, ApiKeyPlan.PARTNER, ApiKeyPlan.ENTERPRISE]);

export const apiPlanCheckoutSchema = z.object({
  plan: z.enum([ApiKeyPlan.PARTNER, ApiKeyPlan.ENTERPRISE]),
});

export type ApiPlanCheckoutInput = z.infer<typeof apiPlanCheckoutSchema>;

export const apiPlanVerifySchema = z.object({
  reference: z.string().trim().min(6).max(120),
});

export type ApiPlanVerifyInput = z.infer<typeof apiPlanVerifySchema>;

/** Any Paystack reference coming back from checkout. */
export const paymentReferenceSchema = z.object({
  reference: z.string().trim().regex(/^dealo_[a-z]+_[a-f0-9]{20}$/, 'Unknown payment reference'),
});

/** "₦25,000" from 2500000 kobo; other currencies use their code. */
export function formatMinor(amountMinor: number, currency = 'NGN') {
  const major = amountMinor / 100;
  const amount = major.toLocaleString('en-NG', { maximumFractionDigits: major % 1 ? 2 : 0 });
  return currency.toUpperCase() === 'NGN' ? `₦${amount}` : `${currency.toUpperCase()} ${amount}`;
}

export type PremiumOffer = { priceMinor: number; currency: string; periodDays: number; paymentsEnabled: boolean };

export const updateApiPlanConfigSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(300).optional().nullable(),
  /** Minor units (e.g. kobo for NGN). */
  priceMinor: z.number().int().min(0).max(1_000_000_000).optional(),
  currency: z.string().trim().length(3).optional(),
  periodDays: z.number().int().min(1).max(366).optional(),
  rateLimitPerMin: z.number().int().min(1).max(10_000).optional(),
  monthlyQuota: z.number().int().min(1).max(100_000_000).optional(),
  maxLiveKeys: z.number().int().min(0).max(100).optional(),
  isPurchasable: z.boolean().optional(),
});

export type UpdateApiPlanConfigInput = z.infer<typeof updateApiPlanConfigSchema>;

export const apiPlanParamSchema = planEnum;

export const createLiveApiKeySchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export type CreateLiveApiKeyInput = z.infer<typeof createLiveApiKeySchema>;
