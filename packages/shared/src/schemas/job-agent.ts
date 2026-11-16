import { z } from 'zod';

import { JOB_BOARD_TYPES } from './job-board';

export const JOB_AGENT_MODES = ['AUTO', 'REVIEW'] as const;
export type JobAgentMode = (typeof JOB_AGENT_MODES)[number];

export const JOB_AGENT_REMOTE = ['ANY', 'REMOTE_ONLY', 'ONSITE_ONLY'] as const;
export type JobAgentRemote = (typeof JOB_AGENT_REMOTE)[number];

/**
 * SUGGESTED: can be sent by Dealo (Easy Apply, email, or ATS API) and waits for approval (or auto-send).
 * READY: an outside job prepared for supervised Assist; it must be finished on the employer's site.
 */
export const JOB_AGENT_MATCH_STATUSES = ['SUGGESTED', 'READY', 'APPLIED', 'SKIPPED', 'FAILED'] as const;
export type JobAgentMatchStatus = (typeof JOB_AGENT_MATCH_STATUSES)[number];

/**
 * easy_apply: Dealo ATS.
 * email: listing asks for CVs by email (Premium + consent).
 * ats_api: known partner ATS host with an offline adapter.
 * site_assisted: career page / board — fill via Assist (extension) with user confirmation.
 * site: legacy alias for site_assisted (older matches).
 */
export const JOB_AGENT_CHANNELS = ['easy_apply', 'email', 'ats_api', 'site_assisted', 'site'] as const;
export type JobAgentChannel = (typeof JOB_AGENT_CHANNELS)[number];

export const isAssistedChannel = (channel: string) => channel === 'site_assisted' || channel === 'site';
export const isAutoChannel = (channel: string) => channel === 'easy_apply' || channel === 'email' || channel === 'ats_api';

export const JOB_AGENT_PLANS = {
  FREE: {
    name: 'Free',
    dailyApplications: 2,
    /** Max assisted (site) completes per Lagos day on Free. */
    dailyAssistCap: 3,
    runEveryHours: 12,
    maxTargets: 3,
    matchesPerRun: 10,
    aiMatching: false,
    coverNotes: false,
    emailApply: false,
    /** Apply credits spent per offline (auto) send. */
    creditCostAuto: 1,
    /** Assist costs more on Free — supervised fill is the expensive path. */
    creditCostAssist: 2,
  },
  PREMIUM: {
    name: 'Premium',
    dailyApplications: 15,
    dailyAssistCap: 25,
    runEveryHours: 3,
    maxTargets: 8,
    matchesPerRun: 25,
    aiMatching: true,
    coverNotes: true,
    emailApply: true,
    creditCostAuto: 1,
    creditCostAssist: 1,
  },
} as const;
export type JobAgentPlan = keyof typeof JOB_AGENT_PLANS;

/**
 * Pay-as-you-go credit packs (NGN). Daily free allowance is spent first;
 * prepaid balance covers overflow so auto + Assist keep working after the free cap.
 */
export const JOB_AGENT_CREDIT_PACKS = [
  { id: 'pack_10', credits: 10, priceMinor: 250_000, label: '10 applies' }, // ₦2,500
  { id: 'pack_40', credits: 40, priceMinor: 800_000, label: '40 applies' }, // ₦8,000
  { id: 'pack_100', credits: 100, priceMinor: 1_800_000, label: '100 applies' }, // ₦18,000
] as const;
export type JobAgentCreditPackId = (typeof JOB_AGENT_CREDIT_PACKS)[number]['id'];

export const jobAgentCreditPackCheckoutSchema = z.object({
  packId: z.enum(['pack_10', 'pack_40', 'pack_100']),
});
export type JobAgentCreditPackCheckout = z.infer<typeof jobAgentCreditPackCheckoutSchema>;

/** Staff grant/refund prepaid Job Agent apply credits (positive = grant, negative = refund/clawback). */
export const grantApplyCreditsSchema = z.object({
  userId: z.string().regex(/^[a-f0-9]{24}$/),
  credits: z.number().int().min(-10_000).max(10_000).refine((n) => n !== 0, 'credits must be non-zero'),
  note: z.string().trim().max(240).optional(),
});
export type GrantApplyCreditsInput = z.infer<typeof grantApplyCreditsSchema>;

export const jobAgentAssistPolicySchema = z.object({
  /** Extra hosts Assist must never auto-fill (added to platform deny list). */
  denyHosts: z.array(z.string().trim().min(3).max(120)).max(40).default([]),
  /** Hosts the user explicitly allows even if on a soft deny list (never overrides LinkedIn/Indeed hard denials). */
  allowHosts: z.array(z.string().trim().min(3).max(120)).max(40).default([]),
  /** Optional personal Assist daily cap (clamped by plan). */
  assistDailyCap: z.number().int().min(0).max(50).nullable().default(null),
});
export type JobAgentAssistPolicyInput = z.infer<typeof jobAgentAssistPolicySchema>;

const term = (max: number) => z.string().trim().min(2).max(max);
const short = (max: number) => z.string().trim().max(max).default('');

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

export const applyVaultIdentitySchema = z
  .object({
    fullName: short(120),
    email: short(200),
    phone: short(40),
    location: short(140),
  })
  .default({});

export const applyVaultWorkItemSchema = z.object({
  id: z.string().trim().min(1).max(40),
  role: short(140),
  company: short(140),
  location: short(140),
  start: short(30),
  end: short(30),
  current: z.boolean().default(false),
  bullets: z.array(z.string().trim().max(400)).max(12).default([]),
});

export const applyVaultEducationItemSchema = z.object({
  id: z.string().trim().min(1).max(40),
  school: short(160),
  qualification: short(140),
  field: short(140),
  start: short(30),
  end: short(30),
});

export const applyVaultLinksSchema = z
  .object({
    linkedin: short(300),
    website: short(300),
    portfolio: short(300),
    github: short(300),
  })
  .default({});

export const applyVaultWorkAuthSchema = z
  .object({
    authorizedCountries: z.array(z.string().trim().min(2).max(80)).max(12).default([]),
    needsSponsorship: z.boolean().default(false),
    notes: short(400),
  })
  .default({});

export const applyVaultSalarySchema = z
  .object({
    min: z.number().int().min(0).max(1_000_000_000).nullable().default(null),
    max: z.number().int().min(0).max(1_000_000_000).nullable().default(null),
    currency: z.string().trim().min(3).max(8).default('NGN'),
    period: z.enum(['YEAR', 'MONTH', 'HOUR']).default('YEAR'),
  })
  .default({});

export const applyVaultQaPairSchema = z.object({
  questionKey: z.string().trim().min(1).max(80),
  question: z.string().trim().min(1).max(400),
  answer: z.string().trim().max(4000).default(''),
});

export const applyVaultDraftsSchema = z
  .object({
    coverBlurb: short(2000),
    commonAnswers: z
      .array(
        z.object({
          questionKey: z.string().trim().min(1).max(80),
          question: z.string().trim().min(1).max(400),
          answer: z.string().trim().max(4000),
        }),
      )
      .max(40)
      .default([]),
  })
  .default({});

export const applyVaultUpdateSchema = z.object({
  identity: applyVaultIdentitySchema.optional(),
  workHistory: z.array(applyVaultWorkItemSchema).max(20).optional(),
  education: z.array(applyVaultEducationItemSchema).max(10).optional(),
  links: applyVaultLinksSchema.optional(),
  workAuth: applyVaultWorkAuthSchema.optional(),
  salaryExpectation: applyVaultSalarySchema.optional(),
  qaPairs: z.array(applyVaultQaPairSchema).max(80).optional(),
  preferredResumeId: z.string().regex(/^[a-f0-9]{24}$/).nullable().optional(),
});
export type ApplyVaultUpdate = z.infer<typeof applyVaultUpdateSchema>;

export type ApplyVaultDto = {
  identity: z.infer<typeof applyVaultIdentitySchema>;
  workHistory: z.infer<typeof applyVaultWorkItemSchema>[];
  education: z.infer<typeof applyVaultEducationItemSchema>[];
  links: z.infer<typeof applyVaultLinksSchema>;
  workAuth: z.infer<typeof applyVaultWorkAuthSchema>;
  salaryExpectation: z.infer<typeof applyVaultSalarySchema>;
  qaPairs: z.infer<typeof applyVaultQaPairSchema>[];
  preferredResumeId: string | null;
  drafts: z.infer<typeof applyVaultDraftsSchema>;
  draftsUpdatedAt: string | null;
  updatedAt: string | null;
};

export const jobAgentBatchApproveSchema = z.object({
  ids: z.array(z.string().regex(/^[a-f0-9]{24}$/)).min(1).max(25),
});
export type JobAgentBatchApproveInput = z.infer<typeof jobAgentBatchApproveSchema>;

export type JobAgentMatchDto = {
  id: string;
  listingId: string;
  kind: 'dealo' | 'external';
  channel: JobAgentChannel;
  channelReason: string | null;
  title: string;
  company: string;
  location: string;
  url: string;
  score: number;
  reasons: string[];
  gaps: string[];
  coverNote: string | null;
  /** 0–1 prep readiness for Assist (overnight pack). Null on auto-channel matches. */
  assistConfidence: number | null;
  /** Last Assist fill coverage 0–100 from extension report. */
  assistCoveragePct: number | null;
  /** Last Assist pause reasons. */
  assistPauses: string[];
  /** Last Assist report outcome. */
  assistLastOutcome: string | null;
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

export type JobAgentCreditReceipt = {
  id: string;
  kind: 'purchase' | 'grant' | 'refund';
  credits: number;
  label: string;
  reference: string | null;
  at: string;
  status: string;
};

export type JobAgentOverview = {
  plan: JobAgentPlan;
  limits: (typeof JOB_AGENT_PLANS)[JobAgentPlan];
  enabled: boolean;
  consented: boolean;
  settings: JobAgentSettings | null;
  cv: { fileName: string; updatedAt: string; stale: boolean } | null;
  status: { lastRunAt: string | null; nextRunAt: string | null; lastError: string | null; canRunNow: boolean };
  stats: {
    appliedToday: number;
    appliedWeek: number;
    appliedTotal: number;
    suggested: number;
    ready: number;
    dailyAllowance: number;
    /** Remaining free daily credits (dailyAllowance − appliedToday, floored at 0). */
    creditsRemaining: number;
    /** Prepaid pay-as-you-go balance (spent after daily free allowance). */
    creditBalance: number;
    /** Effective credits left today = free remaining + prepaid balance. */
    totalCreditsAvailable: number;
    /** Assist completes today (site_assisted / site). */
    assistedToday: number;
    /** Effective Assist daily cap after plan + personal clamp. */
    assistDailyCap: number;
  };
  /** Personal Assist host policy (merged with platform denials at session time). */
  assistPolicy: {
    denyHosts: string[];
    allowHosts: string[];
    assistDailyCap: number | null;
    planAssistCap: number;
  };
  /** Plan credit costs so the UI can show auto vs Assist pricing. */
  pricing: { creditCostAuto: number; creditCostAssist: number };
  creditPacks: typeof JOB_AGENT_CREDIT_PACKS;
  creditReceipts: JobAgentCreditReceipt[];
  paymentsEnabled: boolean;
  /** Sideload zip availability (Chrome Web Store listing is separate). */
  extension: { downloadAvailable: boolean; chromeStoreUrl: string | null };
  /** Last overnight / morning digest snapshot for light UI (null if none yet today). */
  digest: { sent: number; ready: number; at: string | null } | null;
  suggestedTitles: string[];
  runs: JobAgentRunDto[];
  aiAvailable: boolean;
  vaultReady: boolean;
};

/** Hosts where Supervised Apply must not auto-fill (login walls / third-party accounts). */
export const ASSIST_DENY_HOSTS = [
  'linkedin.com',
  'www.linkedin.com',
  'indeed.com',
  'www.indeed.com',
  'glassdoor.com',
  'www.glassdoor.com',
  'facebook.com',
  'www.facebook.com',
] as const;

/** Hard denials that user allowHosts can never override. */
export const ASSIST_HARD_DENY_HOSTS = [
  'linkedin.com',
  'www.linkedin.com',
  'indeed.com',
  'www.indeed.com',
  'facebook.com',
  'www.facebook.com',
] as const;

/** Clear product disclosure for supervised Assist / extension. */
export const ASSIST_DISCLOSURE =
  'Dealo Assist fills forms from your Apply vault with your consent. It never stores third-party passwords, never auto-submits, and pauses on CAPTCHA, login walls, file pickers, and fee/payment fields. You confirm every hard step.';

export const assistFieldDescriptorSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().max(120).default(''),
  label: z.string().trim().max(240).default(''),
  autocomplete: z.string().trim().max(80).default(''),
  type: z.string().trim().max(40).default('text'),
  ariaLabel: z.string().trim().max(240).default(''),
  placeholder: z.string().trim().max(240).default(''),
});
export type AssistFieldDescriptor = z.infer<typeof assistFieldDescriptorSchema>;

export const assistMapFieldsSchema = z.object({
  fields: z.array(assistFieldDescriptorSchema).min(1).max(60),
  /** Optional edited/confirmed Q&A to upsert into the Apply vault (learning path). */
  learnAnswers: z.array(applyVaultQaPairSchema).max(40).optional(),
});
export type AssistMapFieldsInput = z.infer<typeof assistMapFieldsSchema>;

export const assistFieldMappingSchema = z.object({
  fieldId: z.string().trim().min(1).max(80),
  vaultKey: z.string().trim().min(1).max(80),
  value: z.string().trim().max(4000).default(''),
  confidence: z.number().min(0).max(1).default(0.5),
});
export type AssistFieldMapping = z.infer<typeof assistFieldMappingSchema>;

export const ASSIST_REPORT_OUTCOMES = [
  'filled',
  'submitted_by_user',
  'paused_captcha',
  'paused_sso',
  'paused_file',
  'paused_fee',
  'denied_host',
  'abandoned',
  'error',
] as const;
export type AssistReportOutcome = (typeof ASSIST_REPORT_OUTCOMES)[number];

export const assistReportSchema = z.object({
  outcome: z.enum(ASSIST_REPORT_OUTCOMES),
  /** When true, spend an assist credit and mark the match APPLIED (same as /applied). */
  markApplied: z.boolean().default(false),
  host: z.string().trim().max(200).optional(),
  fieldsTotal: z.number().int().min(0).max(500).default(0),
  fieldsFilled: z.number().int().min(0).max(500).default(0),
  fieldsAmbiguous: z.number().int().min(0).max(500).default(0),
  fieldsSkipped: z.number().int().min(0).max(500).default(0),
  pauses: z.array(z.string().trim().max(80)).max(20).default([]),
  notes: z.string().trim().max(1000).optional(),
  /**
   * Answers the user edited (or confirmed) after Assist filled the form.
   * Upserted into ApplyVault.qaPairs so the next apply learns.
   */
  editedAnswers: z.array(applyVaultQaPairSchema).max(40).optional(),
});
export type AssistReportInput = z.infer<typeof assistReportSchema>;


export type AssistSitePolicy = {
  allowed: boolean;
  reason: string;
  denyHosts: string[];
};

export type AssistSessionDto = {
  match: JobAgentMatchDto;
  vault: ApplyVaultDto;
  coverNote: string | null;
  cv: { resumeId: string | null; fileName: string | null; hint: string };
  sitePolicy: AssistSitePolicy;
  disclosure: string;
  /** Flat key→value hints the extension can apply with local rules. */
  fillHints: Record<string, string>;
  creditsRemaining: number;
};

function hostMatches(host: string, pattern: string) {
  const bare = pattern.toLowerCase().replace(/^www\./, '');
  return host === bare || host.endsWith(`.${bare}`);
}

/**
 * Evaluate whether the extension may fill on this host.
 * Deny known credential-walled boards (+ optional personal deny list); everything else is allowed with disclosure.
 * `allowHosts` can soften personal denials but never LinkedIn/Indeed/Facebook hard denials.
 */
export function assistSitePolicyForUrl(
  url: string,
  opts?: { denyHosts?: string[]; allowHosts?: string[] },
): AssistSitePolicy {
  const denyHosts = [...ASSIST_DENY_HOSTS, ...(opts?.denyHosts ?? [])];
  const allowHosts = opts?.allowHosts ?? [];
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return { allowed: false, reason: 'Invalid job URL', denyHosts };
  }

  const hardDenied = ASSIST_HARD_DENY_HOSTS.some((d) => hostMatches(host, d));
  if (hardDenied) {
    return {
      allowed: false,
      reason: 'This host requires your own account login. Use the prep pack and apply manually — Dealo will not fill forms here.',
      denyHosts,
    };
  }

  const userAllowed = allowHosts.some((d) => hostMatches(host, d));
  const denied = denyHosts.some((d) => hostMatches(host, d));
  if (denied && !userAllowed) {
    return {
      allowed: false,
      reason: 'This host is on your Assist deny list (or the platform list). Remove it in Job Agent settings or use the prep pack.',
      denyHosts,
    };
  }
  return {
    allowed: true,
    reason: 'Site allowed for supervised fill. Confirm Submit yourself; Dealo never auto-submits.',
    denyHosts,
  };
}
