import { z } from 'zod';

import { RoleFamily, WorkArrangement } from '../enums';

export const WorkspaceRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  RECRUITER: 'RECRUITER',
  HIRING_MANAGER: 'HIRING_MANAGER',
} as const;

export type WorkspaceRole = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

export const DEFAULT_JOB_STAGES = ['Applied', 'Screened', 'Interview', 'Offer', 'Hired'] as const;

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP'] as const;

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes only');

const optionalUrl = z.string().trim().url().max(300).optional().or(z.literal('').transform(() => undefined));

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Enter your company name').max(120),
  slug: slugSchema,
  website: optionalUrl,
  logoUrl: optionalUrl,
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  website: optionalUrl,
  logoUrl: optionalUrl,
  about: z.string().trim().max(2000).optional().nullable(),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a colour like #0f766e')
    .optional()
    .nullable(),
  careersEnabled: z.boolean().optional(),
});

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

const workspaceRoleEnum = z.enum([WorkspaceRole.ADMIN, WorkspaceRole.RECRUITER, WorkspaceRole.HIRING_MANAGER]);

export const inviteMemberSchema = z.object({
  email: z.string().trim().email('Enter a valid email').max(255),
  role: workspaceRoleEnum.default(WorkspaceRole.RECRUITER),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({ role: workspaceRoleEnum });

export const jobInputSchema = z.object({
  title: z.string().trim().min(2, 'Enter a job title').max(140),
  roleFamily: z.enum([RoleFamily.OFFICE_PROFESSIONAL, RoleFamily.SKILLED_TRADE]),
  location: z.string().trim().min(2, 'Where is the job?').max(140),
  workArrangement: z.enum([WorkArrangement.ONSITE, WorkArrangement.HYBRID, WorkArrangement.REMOTE]),
  employmentType: z.enum(EMPLOYMENT_TYPES).default('FULL_TIME'),
  salaryMinMinor: z.coerce.number().int().min(0).optional().nullable(),
  salaryMaxMinor: z.coerce.number().int().min(0).optional().nullable(),
  currency: z.string().trim().length(3).default('NGN'),
  description: z.string().trim().min(20, 'Describe the job in a few sentences').max(20_000),
  mustHaves: z.array(z.string().trim().min(2).max(120)).max(12).default([]),
  stages: z.array(z.string().trim().min(2).max(40)).min(2).max(10).optional(),
  hiringManagerIds: z.array(z.string().trim().min(1)).max(10).default([]),
});

export type JobInput = z.infer<typeof jobInputSchema>;

export const jobStatusSchema = z.object({ status: z.enum(['DRAFT', 'OPEN', 'PAUSED', 'CLOSED']) });

/** Public apply form (multipart: the CV is sent as a file field). */
export const applySchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(140),
  email: z.string().trim().email('Enter a valid email').max(255),
  phone: z.string().trim().max(30).optional(),
  location: z.string().trim().max(140).optional(),
  coverNote: z.string().trim().max(3000).optional(),
  /** Honeypot: real people leave this empty. */
  website: z.string().max(0).optional(),
});

export type ApplyInput = z.infer<typeof applySchema>;

export const moveStageSchema = z.object({
  applicationIds: z.array(z.string().trim().min(1)).min(1).max(100),
  stage: z.string().trim().min(1).max(40),
});

export const rejectApplicationsSchema = z.object({
  applicationIds: z.array(z.string().trim().min(1)).min(1).max(100),
  notify: z.boolean().default(false),
  reason: z.string().trim().max(500).optional(),
});

export const updateApplicationSchema = z.object({
  rating: z.number().int().min(1).max(5).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
});

export const applicationNoteSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const scheduleInterviewSchema = z
  .object({
    kind: z.enum(['VIDEO', 'PHONE', 'IN_PERSON']).default('VIDEO'),
    durationMin: z.coerce.number().int().min(10).max(240).default(30),
    location: z.string().trim().max(300).optional(),
    interviewerIds: z.array(z.string().trim().min(1)).max(10).default([]),
    /** Either a fixed time, or 2–6 options the candidate picks from. */
    startsAt: z.string().datetime().optional(),
    slotOptions: z.array(z.string().datetime()).max(6).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((value) => value.startsAt || (value.slotOptions && value.slotOptions.length >= 1), {
    message: 'Pick a time or offer at least one slot',
  });

export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewSchema>;

export const bookSlotSchema = z.object({ startsAt: z.string().datetime() });

export const scorecardSchema = z.object({
  rating: z.number().int().min(1).max(5),
  recommendation: z.enum(['YES', 'MAYBE', 'NO']),
  criteria: z.record(z.string().max(60), z.number().int().min(1).max(5)).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export type ScorecardInput = z.infer<typeof scorecardSchema>;

export const offerInputSchema = z.object({
  payMinor: z.coerce.number().int().min(1),
  currency: z.string().trim().length(3).default('NGN'),
  payPeriod: z.enum(['MONTH', 'YEAR', 'DAY', 'WEEK', 'PROJECT']).default('MONTH'),
  startDate: z.string().trim().min(8),
  notes: z.string().trim().max(3000).optional(),
});

export type OfferInput = z.infer<typeof offerInputSchema>;

export const offerResponseSchema = z.object({
  decision: z.enum(['ACCEPTED', 'DECLINED']),
  note: z.string().trim().max(1000).optional(),
});
