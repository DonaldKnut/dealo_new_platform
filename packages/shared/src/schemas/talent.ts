import { z } from 'zod';

import { RoleFamily } from '../enums';

export const candidateDocumentKindSchema = z.enum(['CV', 'CERTIFICATE', 'OTHER']);

export type CandidateDocumentKind = z.infer<typeof candidateDocumentKindSchema>;

export const TalentAvailability = {
  NOW: 'NOW',
  TWO_WEEKS: 'TWO_WEEKS',
  ONE_MONTH: 'ONE_MONTH',
  LATER: 'LATER',
} as const;

export type TalentAvailability = (typeof TalentAvailability)[keyof typeof TalentAvailability];

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .url('Enter a full link, starting with https://')
  .optional()
  .or(z.literal('').transform(() => undefined));

/** What a professional fills in about themselves. */
export const talentProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(150),
  phone: z.string().trim().max(30).optional(),
  roleTitle: z.string().trim().min(2, 'What job do you do?').max(120),
  roleFamily: z.enum([RoleFamily.OFFICE_PROFESSIONAL, RoleFamily.SKILLED_TRADE]),
  location: z.string().trim().min(2, 'Where do you live or work?').max(120),
  headline: z.string().trim().max(160).optional(),
  bio: z.string().trim().max(2000).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
  availability: z
    .enum([
      TalentAvailability.NOW,
      TalentAvailability.TWO_WEEKS,
      TalentAvailability.ONE_MONTH,
      TalentAvailability.LATER,
    ])
    .optional(),
  /** Minor units (kobo for NGN). */
  expectedPayMinor: z.coerce.number().int().min(0).max(100_000_000_000).optional(),
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  openToWork: z.boolean().default(true),
});

export type TalentProfileInput = z.infer<typeof talentProfileSchema>;
