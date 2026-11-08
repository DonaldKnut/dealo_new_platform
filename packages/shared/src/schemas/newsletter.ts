import { z } from 'zod';

export const newsletterSegmentSchema = z.enum(['ALL', 'EMPLOYER', 'TALENT']);

export const newsletterCampaignInputSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  bodyHtml: z.string().trim().min(10).max(50_000),
  bodyText: z.string().trim().max(50_000).optional().or(z.literal('')),
  segment: newsletterSegmentSchema.default('ALL'),
});

export type NewsletterCampaignInput = z.infer<typeof newsletterCampaignInputSchema>;

export const UNSUBSCRIBE_REASONS = ['Too many emails', 'Not relevant to me', 'I never signed up', 'Other'] as const;

export const emailPreferenceSchema = z.object({
  token: z.string().trim().min(10).max(600),
  reason: z.string().trim().max(300).optional(),
  campaignId: z.string().trim().max(40).optional(),
});
export type EmailPreferenceInput = z.infer<typeof emailPreferenceSchema>;

/** Sends the draft to the signed-in staff member only, to check it in a real inbox. */
export const newsletterTestSchema = newsletterCampaignInputSchema.pick({ subject: true, bodyHtml: true });
export type NewsletterTestInput = z.infer<typeof newsletterTestSchema>;

export const newsletterSubscribeSchema = z.object({
  email: z.string().trim().email().max(255),
  firstName: z.string().trim().max(80).optional().or(z.literal('')),
  roleSegment: newsletterSegmentSchema.default('ALL'),
});

export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;
