import { z } from 'zod';

import { JOB_BOARD_TYPES } from './job-board';

export const JOB_AGENT_MODES = ['AUTO', 'REVIEW'] as const;
export type JobAgentMode = (typeof JOB_AGENT_MODES)[number];

export const JOB_AGENT_REMOTE = ['ANY', 'REMOTE_ONLY', 'ONSITE_ONLY'] as const;
export type JobAgentRemote = (typeof JOB_AGENT_REMOTE)[number];

/**
 * SUGGESTED: can be sent by Dealo (Easy Apply or email) and waits for the person's approval.
 * READY: an outside job prepared for the person; it must be finished on the employer's site.
 */
export const JOB_AGENT_MATCH_STATUSES = ['SUGGESTED', 'READY', 'APPLIED', 'SKIPPED', 'FAILED'] as const;
export type JobAgentMatchStatus = (typeof JOB_AGENT_MATCH_STATUSES)[number];

/** easy_apply: sent straight into the employer's Dealo ATS. email: the listing asks for CVs by email. site: the person applies on the job's own page. */
export type JobAgentChannel = 'easy_apply' | 'email' | 'site';

export const JOB_AGENT_PLANS = {
  FREE: { name: 'Free', dailyApplications: 2, runEveryHours: 12, maxTargets: 3, matchesPerRun: 10, aiMatching: false, coverNotes: false, emailApply: false },
  PREMIUM: { name: 'Premium', dailyApplications: 15, runEveryHours: 3, maxTargets: 8, matchesPerRun: 25, aiMatching: true, coverNotes: true, emailApply: true },
} as const;
export type JobAgentPlan = keyof typeof JOB_AGENT_PLANS;

const term = (max: number) => z.string().trim().min(2).max(max);

export const jobAgentSettingsSchema = z.object({
  resumeId: z.string().regex(/^[a-f0-9]{24}$/, 'Choose one of your CVs').nullable().default(null),
  targetTitles: z.array(term(80)).min(1, 'Add at least one job title').max(8),
  locations: z.array(term(80)).max(8).default([]),
  remote: z.enum(JOB_AGENT_REMOTE).default('ANY'),
  employmentTypes: z.array(z.enum(JOB_BOARD_TYPES)).max(JOB_BOARD_TYPES.length).default([]),
  mustHave: z.array(term(40)).max(10).default([]),
  exclude: z.array(term(60)).max(20).default([]),
  minScore: z.number().int().min(40).max(95).default(70),
  dailyLimit: z.number().int().min(1).max(25).default(5),
  mode: z.enum(JOB_AGENT_MODES).default('REVIEW'),
  coverNotes: z.boolean().default(true),
  emailApply: z.boolean().default(false),
  phone: z.union([z.string().trim().min(7, 'Enter a real phone number').max(30), z.literal('')]).default(''),
});
export type JobAgentSettings = z.infer<typeof jobAgentSettingsSchema>;

export const jobAgentToggleSchema = z.object({
  enabled: z.boolean(),
  /** Required the first time: the person agrees the agent may send applications in their name. */
  consent: z.boolean().optional(),
});
export type JobAgentToggleInput = z.infer<typeof jobAgentToggleSchema>;

export type JobAgentMatchDto = {
  id: string;
  listingId: string;
  kind: 'dealo' | 'external';
  channel: JobAgentChannel;
  title: string;
  company: string;
  location: string;
  url: string;
  score: number;
  reasons: string[];
  gaps: string[];
  coverNote: string | null;
  status: JobAgentMatchStatus;
  error: string | null;
  createdAt: string;
  appliedAt: string | null;
};

export type JobAgentRunDto = {
  id: string;
  trigger: string;
  scanned: number;
  matched: number;
  applied: number;
  queued: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type JobAgentOverview = {
  plan: JobAgentPlan;
  limits: (typeof JOB_AGENT_PLANS)[JobAgentPlan];
  enabled: boolean;
  consented: boolean;
  settings: JobAgentSettings | null;
  cv: { fileName: string; updatedAt: string; stale: boolean } | null;
  status: { lastRunAt: string | null; nextRunAt: string | null; lastError: string | null; canRunNow: boolean };
  stats: { appliedToday: number; appliedWeek: number; appliedTotal: number; suggested: number; ready: number; dailyAllowance: number };
  suggestedTitles: string[];
  runs: JobAgentRunDto[];
  aiAvailable: boolean;
};
