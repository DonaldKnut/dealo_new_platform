import { z } from 'zod';

export const candidateScreenStatusSchema = z.enum([
  'NEW',
  'SCREENING',
  'SCREENED',
  'REJECTED',
]);

export const candidateInputSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  roleTitle: z.string().trim().max(120).optional().or(z.literal('')),
  location: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  screenStatus: candidateScreenStatusSchema.default('NEW'),
});

export type CandidateInput = z.infer<typeof candidateInputSchema>;

export const shortlistInputSchema = z.object({
  hireInquiryId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

export type ShortlistInput = z.infer<typeof shortlistInputSchema>;

export const shortlistEntryInputSchema = z.object({
  candidateId: z.string().min(1),
  rank: z.number().int().min(0).max(999).default(0),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

export type ShortlistEntryInput = z.infer<typeof shortlistEntryInputSchema>;
