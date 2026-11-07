import { z } from 'zod';

export const HIRING_AGENTS = ['screening', 'job_post', 'sourcing', 'follow_up', 'scheduling', 'interview_kit', 'pipeline_digest'] as const;
export type HiringAgentId = (typeof HIRING_AGENTS)[number];

export type AgentTrigger = 'new_applicant' | 'stage_change' | 'daily' | 'on_demand';

/** What each agent does, shared by the API, the dashboard and the sales page. */
export const AGENT_CATALOG: Record<
  HiringAgentId,
  { name: string; tagline: string; description: string; triggers: AgentTrigger[]; needsJob: boolean; output: string; approval: string }
> = {
  screening: {
    name: 'Screening agent',
    tagline: 'Reads every CV and builds your shortlist',
    description:
      'Scores each new applicant against the job’s must-haves, explains why, and puts forward a ranked shortlist. Nobody moves until you approve.',
    triggers: ['new_applicant', 'on_demand'],
    needsJob: true,
    output: 'Ranked shortlist with reasons',
    approval: 'Approve to move the people you tick to the next stage',
  },
  job_post: {
    name: 'Job post agent',
    tagline: 'Writes job ads people actually finish reading',
    description:
      'Turns a few notes into a clear, fair job post with must-haves, a salary range for the Nigerian market, and flags for biased or off-putting words.',
    triggers: ['on_demand'],
    needsJob: false,
    output: 'Ready-to-post job ad, salary guide and bias check',
    approval: 'Approve to save it as a draft job you can publish',
  },
  sourcing: {
    name: 'Sourcing agent',
    tagline: 'Finds people who are not applying yet',
    description:
      'Builds LinkedIn and Google search strings, writes WhatsApp and email outreach, and shows matching profiles from the Dealo talent pool.',
    triggers: ['on_demand'],
    needsJob: true,
    output: 'Search strings, outreach messages and talent-pool matches',
    approval: 'Approve to save the outreach as an email template',
  },
  follow_up: {
    name: 'Candidate follow-up agent',
    tagline: 'No applicant is left waiting in silence',
    description:
      'Every day, finds people stuck in a stage too long and drafts a warm, personal update for each. You send them in one tap.',
    triggers: ['daily', 'on_demand'],
    needsJob: false,
    output: 'Personal update emails for waiting candidates',
    approval: 'Approve to send the emails you tick',
  },
  scheduling: {
    name: 'Scheduling agent',
    tagline: 'Interview times sorted before you ask',
    description:
      'When someone reaches the interview stage, it picks open times in working hours, avoids clashes, and prepares a self-booking invite.',
    triggers: ['stage_change', 'on_demand'],
    needsJob: false,
    output: 'Interview invite with time options',
    approval: 'Approve to send the booking link (or let it send by itself)',
  },
  interview_kit: {
    name: 'Interview kit agent',
    tagline: 'Fair, consistent interviews every time',
    description:
      'Creates role-specific questions, what a good answer sounds like, red flags, and a 1–5 scoring guide so every interviewer scores the same way.',
    triggers: ['on_demand'],
    needsJob: true,
    output: 'Question bank and scorecard guide',
    approval: 'Approve to attach the kit to the job',
  },
  pipeline_digest: {
    name: 'Pipeline health agent',
    tagline: 'Your hiring stand-up, written for you',
    description:
      'Each morning it checks every job: new applicants, stuck candidates, missing feedback and offers waiting, then tells your team what to do first.',
    triggers: ['daily', 'on_demand'],
    needsJob: false,
    output: 'Daily report and to-do list, by email and in the inbox',
    approval: 'Read-only: nothing changes without you',
  },
};

// ------------------------------------------------------------------- plans

export const AGENT_PLANS = {
  FREE: { name: 'Free', monthlyRuns: 50, priceMinor: 0 },
  PRO: { name: 'Pro', monthlyRuns: 2000, priceMinor: 2_500_000, currency: 'NGN', periodDays: 30 },
} as const;
export type AgentPlan = keyof typeof AGENT_PLANS;

/** Error `code` when a workspace has used its monthly agent runs. */
export const AGENT_LIMIT_REACHED = 'AGENT_LIMIT_REACHED' as const;

// ------------------------------------------------------------------ config

const workingHour = z.coerce.number().int().min(6).max(20);

export const agentConfigSchemas = {
  screening: z.object({
    autoRun: z.boolean().default(true),
    shortlistSize: z.coerce.number().int().min(3).max(20).default(5),
    minScore: z.coerce.number().int().min(0).max(100).default(60),
  }),
  job_post: z.object({ tone: z.enum(['friendly', 'formal']).default('friendly') }),
  sourcing: z.object({}),
  follow_up: z.object({ idleDays: z.coerce.number().int().min(2).max(30).default(5), hour: workingHour.default(10) }),
  scheduling: z.object({
    interviewStage: z.string().trim().min(2).max(40).default('Interview'),
    kind: z.enum(['VIDEO', 'PHONE', 'IN_PERSON']).default('VIDEO'),
    durationMin: z.coerce.number().int().min(15).max(120).default(30),
    slots: z.coerce.number().int().min(2).max(5).default(3),
    autoSend: z.boolean().default(false),
  }),
  interview_kit: z.object({ questionCount: z.coerce.number().int().min(4).max(15).default(8) }),
  pipeline_digest: z.object({ hour: workingHour.default(8), emailTeam: z.boolean().default(true) }),
} satisfies Record<HiringAgentId, z.ZodTypeAny>;

export type AgentConfig<A extends HiringAgentId> = z.infer<(typeof agentConfigSchemas)[A]>;

export const updateAgentSchema = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Unknown id');

export const runAgentSchema = z.object({
  jobId: objectId.optional(),
  applicationId: objectId.optional(),
  /** Job post agent only. */
  brief: z
    .object({
      title: z.string().trim().min(2).max(140),
      notes: z.string().trim().max(3000).default(''),
      location: z.string().trim().max(140).default(''),
      employmentType: z.string().trim().max(30).default('FULL_TIME'),
      workArrangement: z.enum(['ONSITE', 'HYBRID', 'REMOTE']).default('ONSITE'),
    })
    .optional(),
});
export type RunAgentInput = z.infer<typeof runAgentSchema>;

export const decideAgentTaskSchema = z.object({
  decision: z.enum(['APPROVE', 'DISMISS']),
  /** Application ids to act on, when the task lists people. Defaults to everyone suggested. */
  selection: z.array(objectId).max(200).optional(),
  /** Small edits before approving, e.g. a different email subject. */
  edits: z
    .object({
      subject: z.string().trim().min(2).max(200).optional(),
      body: z.string().trim().min(10).max(5000).optional(),
      title: z.string().trim().min(2).max(140).optional(),
    })
    .optional(),
});
export type DecideAgentTaskInput = z.infer<typeof decideAgentTaskSchema>;

export type AgentTaskStatus = 'PENDING' | 'APPROVED' | 'DISMISSED' | 'DONE' | 'FAILED';
export type AgentTaskKind = 'SUGGESTION' | 'DRAFT' | 'REPORT';

export type AgentTask = {
  id: string;
  agent: HiringAgentId;
  kind: AgentTaskKind;
  status: AgentTaskStatus;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  jobId: string | null;
  applicationId: string | null;
  trigger: AgentTrigger;
  provider: 'gemini' | 'rules';
  result: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export type AgentOverview = {
  plan: AgentPlan;
  planUntil: string | null;
  usage: { month: string; runs: number; limit: number };
  provider: 'gemini' | 'rules';
  paymentsEnabled: boolean;
  agents: Array<{
    id: HiringAgentId;
    enabled: boolean;
    config: Record<string, unknown>;
    lastRunAt: string | null;
    stats: { runs30d: number; approved30d: number; pending: number };
  }>;
  pending: number;
  impact: { tasks30d: number; approved30d: number; hoursSaved30d: number };
};
