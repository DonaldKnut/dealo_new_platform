import { z } from 'zod';

export const newsletterSegmentSchema = z.enum(['ALL', 'EMPLOYER', 'TALENT']);

export const newsletterCampaignInputSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  bodyHtml: z.string().trim().min(10).max(50_000),
  bodyText: z.string().trim().max(50_000).optional().or(z.literal('')),
  segment: newsletterSegmentSchema.default('ALL'),
});

export type NewsletterCampaignInput = z.infer<typeof newsletterCampaignInputSchema>;

export const newsletterSubscribeSchema = z.object({
  email: z.string().trim().email().max(255),
  firstName: z.string().trim().max(80).optional().or(z.literal('')),
  roleSegment: newsletterSegmentSchema.default('ALL'),
});

export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;
