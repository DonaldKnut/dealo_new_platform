import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AGENT_CATALOG,
  AGENT_LIMIT_REACHED,
  AGENT_PLANS,
  agentConfigSchemas,
  EMPLOYMENT_TYPES,
  HIRING_AGENTS,
  jobInputSchema,
  type AgentConfig,
  type AgentOverview,
  type AgentPlan,
  type AgentTask as AgentTaskDto,
  type AgentTrigger,
  type DecideAgentTaskInput,
  type HiringAgentId,
  type RunAgentInput,
  type UpdateAgentInput,
} from '@dealo/shared';
import { ApplicationStatus, InterviewStatus, JobStatus, OfferStatus, Prisma, UserRole, WorkspaceRole, type AgentTask, type Job, type Organization } from '@prisma/client';
import type { Subscription } from 'rxjs';

import { ApplicationsService } from '../ats/applications.service';
import { AtsAccessService, isObjectId } from '../ats/ats-access.service';
import { teamNoticeEmail } from '../ats/ats-emails';
import { AtsEventsService, type AtsEvent } from '../ats/ats-events.service';
import { AtsToolsService } from '../ats/ats-tools.service';
import { HiringService } from '../ats/hiring.service';
import { JobsService } from '../ats/jobs.service';
import type { AuthUser } from '../auth/auth.types';
import { assertEmailVerified } from '../auth/verified-email';
import { PaymentRouterService } from '../payments/payment-router.service';
import { newReference, PAYMENT_PREFIX, PaystackClient, type PaystackTransaction } from '../payments/paystack.client';
import type { AppEnv } from '../config/env.validation';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgentBrainsService, payBand, type JobContext } from './agent-brains';

const DAY_MS = 86_400_000;
const SWEEP_MS = 15 * 60_000;
/** Rough minutes of recruiter time each finished task replaces, for the "time saved" figure. */
const MINUTES_SAVED: Record<HiringAgentId, number> = {
  screening: 45,
  job_post: 40,
  sourcing: 60,
  follow_up: 30,
  scheduling: 15,
  interview_kit: 50,
  pipeline_digest: 20,
};

type Trigger = AgentTrigger;

function lagos(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return { month: `${parts.year}-${parts.month}`, day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

const isSkilledTrade = (title: string) => /electric|plumb|weld|mechanic|technician|carpent|mason|tiler|painter|fitter|driver|artisan|operator|rigger|scaffold/i.test(title);

@Injectable()
export class HiringAgentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HiringAgentsService.name);
  private readonly appUrl: string;
  private subscription?: Subscription;
  private sweepTimer?: NodeJS.Timeout;
  private sweeping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AtsAccessService,
    private readonly events: AtsEventsService,
    private readonly applications: ApplicationsService,
    private readonly hiring: HiringService,
    private readonly jobs: JobsService,
    private readonly tools: AtsToolsService,
    private readonly brains: AgentBrainsService,
    private readonly email: EmailService,
    private readonly paystack: PaystackClient,
    private readonly payments: PaymentRouterService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/$/, '');
  }

  onModuleInit() {
    this.payments.register(PAYMENT_PREFIX.agents, 'hiring_agents_pro', (txn) => this.applyTransaction(txn));
    this.subscription = this.events.events$.subscribe((event) => void this.onEvent(event));
    this.sweepTimer = setInterval(() => void this.sweep(), SWEEP_MS);
    this.sweepTimer.unref();
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe();
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  // ------------------------------------------------------------ plan & usage

  private planOf(org: Pick<Organization, 'agentPlan' | 'agentPlanUntil'>): AgentPlan {
    return org.agentPlan === 'PRO' && org.agentPlanUntil && org.agentPlanUntil > new Date() ? 'PRO' : 'FREE';
  }

  /** Counts one agent run against the workspace's monthly allowance, or refuses when it is used up. */
  private async consume(org: Organization) {
    const month = lagos().month;
    const limit = AGENT_PLANS[this.planOf(org)].monthlyRuns;
    const usage = await this.prisma.agentUsage.upsert({
      where: { organizationId_month: { organizationId: org.id, month } },
      create: { organizationId: org.id, month, runs: 0 },
      update: {},
    });
    if (usage.runs >= limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          code: AGENT_LIMIT_REACHED,
          message: `This workspace has used all ${limit} agent runs for this month. Upgrade to Pro for ${AGENT_PLANS.PRO.monthlyRuns.toLocaleString()} runs a month.`,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    await this.prisma.agentUsage.update({ where: { id: usage.id }, data: { runs: { increment: 1 } } });
  }

  // ---------------------------------------------------------------- settings

  private config<A extends HiringAgentId>(agent: A, raw: unknown): AgentConfig<A> {
    const parsed = agentConfigSchemas[agent].safeParse(raw ?? {});
    return (parsed.success ? parsed.data : agentConfigSchemas[agent].parse({})) as AgentConfig<A>;
  }

  private async setting<A extends HiringAgentId>(orgId: string, agent: A) {
    const row = await this.prisma.agentSetting.findUnique({ where: { organizationId_agent: { organizationId: orgId, agent } } });
    return { row, enabled: Boolean(row?.enabled), config: this.config(agent, row?.config) };
  }

  private requireAgent(agent: string): HiringAgentId {
    if (!(HIRING_AGENTS as readonly string[]).includes(agent)) throw new NotFoundException('Unknown agent');
    return agent as HiringAgentId;
  }

  async overview(orgId: string, user: AuthUser): Promise<AgentOverview> {
    const { organization: org } = await this.access.require(orgId, user, WorkspaceRole.HIRING_MANAGER);
    const since = new Date(Date.now() - 30 * DAY_MS);
    const [rows, usage, grouped, pendingByAgent] = await Promise.all([
      this.prisma.agentSetting.findMany({ where: { organizationId: orgId } }),
      this.prisma.agentUsage.findUnique({ where: { organizationId_month: { organizationId: orgId, month: lagos().month } } }),
      this.prisma.agentTask.groupBy({ by: ['agent', 'status'], where: { organizationId: orgId, createdAt: { gte: since } }, _count: { _all: true } }),
      this.prisma.agentTask.groupBy({ by: ['agent'], where: { organizationId: orgId, status: 'PENDING' }, _count: { _all: true } }),
    ]);
    const plan = this.planOf(org);
    let minutes = 0;
    let tasks30d = 0;
    let approved30d = 0;
    const agents = HIRING_AGENTS.map((id) => {
      const row = rows.find((r) => r.agent === id);
      const mine = grouped.filter((g) => g.agent === id);
      const runs = mine.reduce((sum, g) => sum + g._count._all, 0);
      const approved = mine.filter((g) => g.status === 'APPROVED' || g.status === 'DONE').reduce((sum, g) => sum + g._count._all, 0);
      tasks30d += runs;
      approved30d += approved;
      minutes += approved * MINUTES_SAVED[id];
      return {
        id,
        enabled: Boolean(row?.enabled),
        config: this.config(id, row?.config) as Record<string, unknown>,
        lastRunAt: row?.lastRunAt?.toISOString() ?? null,
        stats: { runs30d: runs, approved30d: approved, pending: pendingByAgent.find((p) => p.agent === id)?._count._all ?? 0 },
      };
    });
    return {
      plan,
      planUntil: plan === 'PRO' ? org.agentPlanUntil!.toISOString() : null,
      usage: { month: lagos().month, runs: usage?.runs ?? 0, limit: AGENT_PLANS[plan].monthlyRuns },
      provider: this.brains.provider,
      paymentsEnabled: this.paystack.isConfigured,
      agents,
      pending: agents.reduce((sum, a) => sum + a.stats.pending, 0),
      impact: { tasks30d, approved30d, hoursSaved30d: Math.round((minutes / 60) * 10) / 10 },
    };
  }

  async updateAgent(orgId: string, agentRaw: string, input: UpdateAgentInput, user: AuthUser) {
    const agent = this.requireAgent(agentRaw);
    await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    const current = await this.setting(orgId, agent);
    const parsed = input.config ? agentConfigSchemas[agent].safeParse({ ...current.config, ...input.config }) : null;
    if (parsed && !parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Check the settings');
    const config = (parsed?.data ?? current.config) as Prisma.InputJsonValue;
    const row = await this.prisma.agentSetting.upsert({
      where: { organizationId_agent: { organizationId: orgId, agent } },
      create: { organizationId: orgId, agent, enabled: input.enabled ?? false, config, updatedById: user.id },
      update: { ...(input.enabled !== undefined ? { enabled: input.enabled } : {}), config, updatedById: user.id },
    });
    return { id: agent, enabled: row.enabled, config };
  }

  // -------------------------------------------------------------------- run

  async run(orgId: string, agentRaw: string, input: RunAgentInput, user: AuthUser) {
    const agent = this.requireAgent(agentRaw);
    const { organization } = await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    if (AGENT_CATALOG[agent].needsJob && !input.jobId) throw new BadRequestException('Pick a job for this agent');
    if (agent === 'job_post' && !input.brief) throw new BadRequestException('Tell the agent which job to write');
    if (agent === 'scheduling' && !input.applicationId) throw new BadRequestException('Pick the applicant to schedule');
    await this.consume(organization);
    const task = await this.dispatch(organization, agent, input, 'on_demand', user);
    await this.prisma.agentSetting.upsert({
      where: { organizationId_agent: { organizationId: orgId, agent } },
      create: { organizationId: orgId, agent, lastRunAt: new Date() },
      update: { lastRunAt: new Date() },
    });
    return this.toDto(task);
  }

  private async dispatch(org: Organization, agent: HiringAgentId, input: RunAgentInput, trigger: Trigger, actor?: AuthUser): Promise<AgentTask> {
    const { config } = await this.setting(org.id, agent);
    switch (agent) {
      case 'screening':
        return this.screening(org, await this.requireJob(org.id, input.jobId!), config as AgentConfig<'screening'>, trigger, actor);
      case 'job_post':
        return this.jobPost(org, input, config as AgentConfig<'job_post'>, actor);
      case 'sourcing':
        return this.sourcing(org, await this.requireJob(org.id, input.jobId!), actor);
      case 'follow_up':
        return this.followUp(org, config as AgentConfig<'follow_up'>, trigger, input.jobId, actor);
      case 'scheduling':
        return this.scheduling(org, input.applicationId!, config as AgentConfig<'scheduling'>, trigger, actor);
      case 'interview_kit':
        return this.interviewKit(org, await this.requireJob(org.id, input.jobId!), config as AgentConfig<'interview_kit'>, actor);
      case 'pipeline_digest':
        return this.digest(org, config as AgentConfig<'pipeline_digest'>, trigger, actor);
    }
  }

  private async requireJob(orgId: string, jobId: string) {
    if (!isObjectId(jobId)) throw new NotFoundException('Job not found');
    const job = await this.prisma.job.findFirst({ where: { id: jobId, organizationId: orgId } });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  private jobContext(job: Job, org: Organization): JobContext {
    return { title: job.title, location: job.location, description: job.description, mustHaves: job.mustHaves, roleFamily: job.roleFamily, orgName: org.name };
  }

  private createTask(org: Organization, data: Omit<Prisma.AgentTaskUncheckedCreateInput, 'organizationId'>) {
    return this.prisma.agentTask.create({ data: { organizationId: org.id, ...data } });
  }

  // --------------------------------------------------------------- screening

  private async screening(org: Organization, job: Job, config: AgentConfig<'screening'>, trigger: Trigger, actor?: AuthUser) {
    const firstStage = job.stages[0] ?? 'Applied';
    const nextStage = job.stages[1] ?? job.stages[0] ?? 'Screen';
    const apps = await this.prisma.application.findMany({
      where: { organizationId: org.id, jobId: job.id, status: ApplicationStatus.ACTIVE, stage: firstStage },
      select: { id: true, name: true, location: true, aiScore: true, aiFit: true, aiRunId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    if (!apps.length) {
      if (trigger === 'on_demand') throw new BadRequestException(`Nobody is waiting in “${firstStage}” for ${job.title}`);
      throw new BadRequestException('Nothing to screen');
    }
    const runs = await this.prisma.aiRun.findMany({ where: { id: { in: apps.map((a) => a.aiRunId).filter((id): id is string => Boolean(id)) } }, select: { id: true, output: true } });
    const reasons = new Map(runs.map((r) => [r.id, r.output as { summary?: string; strengths?: string[]; gaps?: string[] }]));
    const ranked = [...apps].sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1));
    const shortlist = new Set(ranked.filter((a) => (a.aiScore ?? -1) >= config.minScore).slice(0, config.shortlistSize).map((a) => a.id));
    const candidates = ranked.slice(0, 30).map((a) => {
      const why = a.aiRunId ? reasons.get(a.aiRunId) : undefined;
      return {
        applicationId: a.id,
        name: a.name,
        location: a.location,
        score: a.aiScore,
        fit: a.aiFit,
        summary: why?.summary ?? null,
        strengths: (why?.strengths ?? []).slice(0, 3),
        gaps: (why?.gaps ?? []).slice(0, 3),
        suggested: shortlist.has(a.id),
      };
    });
    const unscored = apps.filter((a) => a.aiScore === null).length;
    const payload = { jobId: job.id, jobTitle: job.title, fromStage: firstStage, nextStage, minScore: config.minScore, candidates, unscored, total: apps.length };
    const title = shortlist.size ? `Shortlist ${shortlist.size} for ${job.title}` : `No one reaches ${config.minScore}+ for ${job.title} yet`;
    const summary = shortlist.size
      ? `${shortlist.size} of ${apps.length} waiting applicants score ${config.minScore}+ against the must-haves. Approve to move them to “${nextStage}”.`
      : `${apps.length} applicants are waiting. None scored ${config.minScore}+; review the ranking or lower the bar in settings.`;

    // New applicants refresh the open shortlist for the job instead of piling up tasks.
    const open = await this.prisma.agentTask.findFirst({ where: { organizationId: org.id, agent: 'screening', jobId: job.id, status: 'PENDING' } });
    if (open) {
      return this.prisma.agentTask.update({ where: { id: open.id }, data: { title, summary, payload: payload as Prisma.InputJsonValue, trigger, provider: this.brains.provider } });
    }
    return this.createTask(org, { agent: 'screening', kind: 'SUGGESTION', title, summary, payload: payload as Prisma.InputJsonValue, jobId: job.id, trigger, provider: this.brains.provider, createdById: actor?.id });
  }

  // ---------------------------------------------------------------- job post

  private async jobPost(org: Organization, input: RunAgentInput, config: AgentConfig<'job_post'>, actor?: AuthUser) {
    const existing = input.jobId ? await this.requireJob(org.id, input.jobId) : null;
    const brief = input.brief!;
    const { value: draft, provider } = await this.brains.jobPost({
      title: brief.title,
      notes: brief.notes,
      location: brief.location || existing?.location || '',
      employmentType: brief.employmentType,
      workArrangement: brief.workArrangement,
      orgName: org.name,
      tone: config.tone,
      existing: existing ? { description: existing.description, mustHaves: existing.mustHaves } : undefined,
    });
    const band = payBand(draft.title);
    const flags = draft.biasFlags.length;
    return this.createTask(org, {
      agent: 'job_post',
      kind: 'DRAFT',
      title: existing ? `Improved post: ${draft.title}` : `New job post: ${draft.title}`,
      summary: `${draft.mustHaves.length} must-haves · ₦${draft.salary.minNaira.toLocaleString()}–₦${draft.salary.maxNaira.toLocaleString()} a month · ${flags ? `${flags} wording ${flags === 1 ? 'issue' : 'issues'} flagged` : 'no biased wording found'}.`,
      payload: { brief, draft, marketBand: band, jobId: existing?.id ?? null } as Prisma.InputJsonValue,
      jobId: existing?.id,
      trigger: 'on_demand',
      provider,
      createdById: actor?.id,
    });
  }

  // ---------------------------------------------------------------- sourcing

  private async sourcing(org: Organization, job: Job, actor?: AuthUser) {
    const { value: plan, provider } = await this.brains.sourcing(this.jobContext(job, org));
    const jobLink = `${this.appUrl}/careers/${org.slug}/${job.slug}`;
    const fill = (text: string) => text.replaceAll('{{jobLink}}', jobLink);
    const words = [job.title.split(/\s+/)[0] ?? job.title, ...plan.keywords.slice(0, 4)].filter((w) => w.length > 2);
    const where: Prisma.CandidateWhereInput = {
      OR: [
        ...words.map((w) => ({ roleTitle: { contains: w, mode: 'insensitive' as const } })),
        ...words.map((w) => ({ headline: { contains: w, mode: 'insensitive' as const } })),
        { skills: { hasSome: plan.keywords.slice(0, 8) } },
      ],
    };
    const [count, profiles] = await Promise.all([
      this.prisma.candidate.count({ where }),
      this.prisma.candidate.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 6,
        select: { headline: true, roleTitle: true, location: true, yearsExperience: true, skills: true, availability: true, openToWork: true },
      }),
    ]);
    const payload = {
      jobId: job.id,
      jobTitle: job.title,
      jobLink,
      plan: { ...plan, whatsapp: fill(plan.whatsapp), emailBody: fill(plan.emailBody) },
      pool: {
        count,
        profiles: profiles.map((p) => ({
          headline: p.headline || p.roleTitle || 'Professional',
          location: p.location,
          yearsExperience: p.yearsExperience,
          skills: p.skills.slice(0, 5),
          availability: p.availability,
          openToWork: p.openToWork,
        })),
      },
    };
    return this.createTask(org, {
      agent: 'sourcing',
      kind: 'DRAFT',
      title: `Sourcing plan for ${job.title}`,
      summary: `${plan.keywords.length} search keywords, WhatsApp and email outreach ready${count ? `, and ${count} matching ${count === 1 ? 'profile' : 'profiles'} in the Dealo talent pool` : ''}.`,
      payload: payload as Prisma.InputJsonValue,
      jobId: job.id,
      trigger: 'on_demand',
      provider,
      createdById: actor?.id,
    });
  }

  // --------------------------------------------------------------- follow-up

  private async followUp(org: Organization, config: AgentConfig<'follow_up'>, trigger: Trigger, jobId?: string, actor?: AuthUser) {
    const cutoff = new Date(Date.now() - config.idleDays * DAY_MS);
    const waiting = await this.prisma.application.findMany({
      where: { organizationId: org.id, status: ApplicationStatus.ACTIVE, stageChangedAt: { lt: cutoff }, ...(jobId ? { jobId } : {}) },
      select: { id: true, name: true, email: true, stage: true, stageChangedAt: true, job: { select: { id: true, title: true, stages: true } } },
      orderBy: { stageChangedAt: 'asc' },
      take: 150,
    });
    const recentlyEmailed = new Set(
      (
        await this.prisma.applicationEvent.findMany({
          where: { organizationId: org.id, applicationId: { in: waiting.map((a) => a.id) }, type: 'EMAIL_SENT', createdAt: { gte: cutoff } },
          select: { applicationId: true },
        })
      ).map((e) => e.applicationId),
    );
    const due = waiting.filter((a) => !recentlyEmailed.has(a.id) && a.stage !== a.job.stages[a.job.stages.length - 1]);
    const recipients = due.map((a) => ({
      applicationId: a.id,
      name: a.name,
      email: a.email.replace(/^(.{2}).*(@.*)$/, '$1***$2'),
      jobTitle: a.job.title,
      jobId: a.job.id,
      stage: a.stage,
      daysWaiting: Math.floor((Date.now() - a.stageChangedAt.getTime()) / DAY_MS),
    }));
    const message = {
      subject: 'An update on your application – {{jobTitle}}',
      body: `Hi {{firstName}},\n\nThank you for applying for the {{jobTitle}} role at {{company}}. We wanted you to know your application is still being reviewed, and you have not been forgotten.\n\nWe expect to have news for you soon. If anything has changed on your side, just reply to this email.\n\nBest regards,\n{{company}} hiring team`,
    };
    const title = recipients.length ? `${recipients.length} ${recipients.length === 1 ? 'person has' : 'people have'} waited ${config.idleDays}+ days` : 'Everyone has heard from you recently';
    const summary = recipients.length
      ? `Personal update emails are ready. Approve to send them to the people you tick.`
      : `No applicant has waited more than ${config.idleDays} days without hearing from you. Nice work.`;
    const payload = { idleDays: config.idleDays, recipients, message } as Prisma.InputJsonValue;
    if (!recipients.length) {
      return this.createTask(org, { agent: 'follow_up', kind: 'REPORT', status: 'DONE', title, summary, payload, trigger, provider: 'rules', createdById: actor?.id });
    }
    const open = await this.prisma.agentTask.findFirst({ where: { organizationId: org.id, agent: 'follow_up', status: 'PENDING', jobId: jobId ?? null } });
    if (open) return this.prisma.agentTask.update({ where: { id: open.id }, data: { title, summary, payload, trigger } });
    return this.createTask(org, { agent: 'follow_up', kind: 'SUGGESTION', title, summary, payload, jobId: jobId ?? null, trigger, provider: 'rules', createdById: actor?.id });
  }

  // -------------------------------------------------------------- scheduling

  private async proposeSlots(orgId: string, count: number, durationMin: number) {
    const busy = await this.prisma.interview.findMany({
      where: { organizationId: orgId, status: { in: [InterviewStatus.SCHEDULED, InterviewStatus.PROPOSED] }, startsAt: { gte: new Date() } },
      select: { startsAt: true, durationMin: true },
      take: 500,
    });
    const clashes = (start: Date) =>
      busy.some((b) => b.startsAt && Math.abs(b.startsAt.getTime() - start.getTime()) < Math.max(b.durationMin, durationMin) * 60_000);
    const slots: string[] = [];
    // One slot per weekday from tomorrow, at 10:00, 12:00 or 15:00 Lagos time (UTC+1 all year), whichever is free.
    for (let day = 1; slots.length < count && day < 21; day += 1) {
      const date = lagos(new Date(Date.now() + day * DAY_MS)).day;
      const weekday = new Date(`${date}T12:00:00+01:00`).getUTCDay();
      if (weekday === 0 || weekday === 6) continue;
      for (const hour of [10, 12, 15]) {
        const start = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+01:00`);
        if (!clashes(start)) {
          slots.push(start.toISOString());
          break;
        }
      }
    }
    return slots;
  }

  private async scheduling(org: Organization, applicationId: string, config: AgentConfig<'scheduling'>, trigger: Trigger, actor?: AuthUser) {
    if (!isObjectId(applicationId)) throw new NotFoundException('Applicant not found');
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, organizationId: org.id },
      include: { job: { select: { id: true, title: true } }, interviews: { where: { status: { in: [InterviewStatus.SCHEDULED, InterviewStatus.PROPOSED] } }, select: { id: true } } },
    });
    if (!app) throw new NotFoundException('Applicant not found');
    if (app.interviews.length) throw new ConflictException(`${app.name} already has an interview booked or offered`);
    const slots = await this.proposeSlots(org.id, config.slots, config.durationMin);
    const payload = { applicationId: app.id, name: app.name, jobId: app.job.id, jobTitle: app.job.title, kind: config.kind, durationMin: config.durationMin, slots } as Prisma.InputJsonValue;
    const task = await this.createTask(org, {
      agent: 'scheduling',
      kind: 'SUGGESTION',
      title: `Interview invite for ${app.name}`,
      summary: `${slots.length} open ${config.kind.toLowerCase().replace('_', ' ')} slots of ${config.durationMin} minutes for ${app.job.title}. ${app.name.split(/\s+/)[0]} picks the time that suits them.`,
      payload,
      jobId: app.job.id,
      applicationId: app.id,
      trigger,
      provider: 'rules',
      createdById: actor?.id,
    });
    if (config.autoSend && actor && trigger === 'stage_change') {
      try {
        return await this.approve(org, task, {}, actor);
      } catch (error) {
        this.logger.warn(`Scheduling agent could not auto-send for ${app.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return task;
  }

  // ----------------------------------------------------------- interview kit

  private async interviewKit(org: Organization, job: Job, config: AgentConfig<'interview_kit'>, actor?: AuthUser) {
    const { value: kit, provider } = await this.brains.interviewKit(this.jobContext(job, org), config.questionCount);
    const questions = kit.competencies.reduce((sum, c) => sum + c.questions.length, 0);
    return this.createTask(org, {
      agent: 'interview_kit',
      kind: 'DRAFT',
      title: `Interview kit for ${job.title}`,
      summary: `${questions} questions across ${kit.competencies.length} skills, with what good looks like and a ${kit.scorecard.length}-point scorecard.`,
      payload: { jobId: job.id, jobTitle: job.title, kit } as Prisma.InputJsonValue,
      jobId: job.id,
      trigger: 'on_demand',
      provider,
      createdById: actor?.id,
    });
  }

  // ------------------------------------------------------------------ digest

  private async digest(org: Organization, config: AgentConfig<'pipeline_digest'>, trigger: Trigger, actor?: AuthUser) {
    const now = Date.now();
    const [jobs, apps, upcoming, pastInterviews, waitingOffers] = await Promise.all([
      this.prisma.job.findMany({ where: { organizationId: org.id, status: JobStatus.OPEN }, select: { id: true, title: true, stages: true, publishedAt: true, createdAt: true } }),
      this.prisma.application.findMany({
        where: { organizationId: org.id, status: ApplicationStatus.ACTIVE },
        select: { id: true, jobId: true, stage: true, stageChangedAt: true, createdAt: true },
        take: 3000,
      }),
      this.prisma.interview.count({ where: { organizationId: org.id, status: InterviewStatus.SCHEDULED, startsAt: { gte: new Date(now), lte: new Date(now + 2 * DAY_MS) } } }),
      this.prisma.interview.findMany({
        where: { organizationId: org.id, status: { in: [InterviewStatus.SCHEDULED, InterviewStatus.COMPLETED] }, startsAt: { lt: new Date(now), gte: new Date(now - 14 * DAY_MS) } },
        select: { applicationId: true },
      }),
      this.prisma.offer.count({ where: { organizationId: org.id, status: OfferStatus.SENT, sentAt: { lt: new Date(now - 3 * DAY_MS) } } }),
    ]);
    const scored = new Set(
      (await this.prisma.scorecard.findMany({ where: { organizationId: org.id, applicationId: { in: pastInterviews.map((i) => i.applicationId) } }, select: { applicationId: true } })).map((s) => s.applicationId),
    );
    const missingFeedback = new Set(pastInterviews.map((i) => i.applicationId).filter((id) => !scored.has(id))).size;

    const perJob = jobs.map((job) => {
      const mine = apps.filter((a) => a.jobId === job.id);
      const last = job.stages[job.stages.length - 1];
      return {
        jobId: job.id,
        title: job.title,
        active: mine.length,
        new24h: mine.filter((a) => now - a.createdAt.getTime() < DAY_MS).length,
        unreviewed: mine.filter((a) => a.stage === job.stages[0] && now - a.createdAt.getTime() > 3 * DAY_MS).length,
        stuck: mine.filter((a) => a.stage !== job.stages[0] && a.stage !== last && now - a.stageChangedAt.getTime() > 5 * DAY_MS).length,
        quiet: mine.length === 0 && now - (job.publishedAt ?? job.createdAt).getTime() > 7 * DAY_MS,
      };
    });
    const totals = {
      openJobs: jobs.length,
      activeApplicants: apps.length,
      new24h: perJob.reduce((s, j) => s + j.new24h, 0),
      unreviewed: perJob.reduce((s, j) => s + j.unreviewed, 0),
      stuck: perJob.reduce((s, j) => s + j.stuck, 0),
      interviewsNext48h: upcoming,
      missingFeedback,
      offersWaiting: waitingOffers,
    };
    const jobLink = (id: string) => `/dashboard/ats/jobs/${id}`;
    const todos: Array<{ text: string; href: string; priority: 'high' | 'medium' | 'low' }> = [];
    for (const job of [...perJob].sort((a, b) => b.unreviewed + b.stuck - (a.unreviewed + a.stuck))) {
      if (job.unreviewed) todos.push({ text: `Review ${job.unreviewed} ${job.unreviewed === 1 ? 'applicant' : 'applicants'} waiting 3+ days for ${job.title}`, href: jobLink(job.jobId), priority: 'high' });
      if (job.stuck) todos.push({ text: `Move or reject ${job.stuck} stuck in ${job.title}`, href: jobLink(job.jobId), priority: 'medium' });
      if (job.quiet) todos.push({ text: `${job.title} has no applicants after a week – run the Sourcing agent or share the link`, href: jobLink(job.jobId), priority: 'medium' });
    }
    if (missingFeedback) todos.unshift({ text: `${missingFeedback} ${missingFeedback === 1 ? 'interview needs' : 'interviews need'} scorecards`, href: '/dashboard/ats/interviews', priority: 'high' });
    if (waitingOffers) todos.unshift({ text: `${waitingOffers} ${waitingOffers === 1 ? 'offer has' : 'offers have'} waited 3+ days for an answer – follow up`, href: '/dashboard/ats', priority: 'high' });

    const fallback = todos.length
      ? `${totals.new24h} new ${totals.new24h === 1 ? 'applicant' : 'applicants'} since yesterday across ${totals.openJobs} open ${totals.openJobs === 1 ? 'job' : 'jobs'}. Start with: ${todos[0]!.text.toLowerCase()}.`
      : `All clear: ${totals.openJobs} open ${totals.openJobs === 1 ? 'job' : 'jobs'}, nothing stuck and no feedback missing.`;
    const headline = await this.brains.digestHeadline({ company: org.name, totals, topTodos: todos.slice(0, 5).map((t) => t.text) }, fallback);

    const task = await this.createTask(org, {
      agent: 'pipeline_digest',
      kind: 'REPORT',
      status: 'DONE',
      title: `Hiring briefing · ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', weekday: 'long', day: 'numeric', month: 'short' }).format(new Date())}`,
      summary: headline.text,
      payload: { totals, perJob, todos: todos.slice(0, 12) } as Prisma.InputJsonValue,
      trigger,
      provider: headline.provider,
      createdById: actor?.id,
    });

    if (config.emailTeam && trigger === 'daily' && todos.length) {
      const team = await this.prisma.organizationMember.findMany({
        where: { organizationId: org.id, role: { in: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.RECRUITER] }, user: { isActive: true, isEmailVerified: true } },
        select: { user: { select: { email: true } } },
      });
      for (const member of team) {
        void this.email
          .send(
            teamNoticeEmail({
              to: member.user.email,
              subject: `Your hiring briefing – ${org.name}`,
              title: headline.text,
              lines: todos.slice(0, 6).map((t) => t.text),
              link: `${this.appUrl}/dashboard/ats/agents`,
            }),
          )
          .catch(() => undefined);
      }
    }
    return task;
  }

  // ------------------------------------------------------------------- tasks

  async tasks(orgId: string, user: AuthUser, filter: { status?: string; agent?: string; limit?: number }) {
    await this.access.require(orgId, user, WorkspaceRole.HIRING_MANAGER);
    const rows = await this.prisma.agentTask.findMany({
      where: {
        organizationId: orgId,
        ...(filter.status === 'PENDING' ? { status: 'PENDING' } : filter.status === 'HISTORY' ? { status: { not: 'PENDING' } } : {}),
        ...(filter.agent && (HIRING_AGENTS as readonly string[]).includes(filter.agent) ? { agent: filter.agent } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(filter.limit ?? 50, 1), 100),
    });
    return rows.map((row) => this.toDto(row));
  }

  async decide(orgId: string, taskId: string, input: DecideAgentTaskInput, user: AuthUser) {
    const { organization, userName } = await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    if (!isObjectId(taskId)) throw new NotFoundException('Task not found');
    const task = await this.prisma.agentTask.findFirst({ where: { id: taskId, organizationId: orgId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'PENDING') throw new ConflictException('This task was already handled');

    if (input.decision === 'DISMISS') {
      const updated = await this.prisma.agentTask.update({
        where: { id: task.id },
        data: { status: 'DISMISSED', decidedById: user.id, decidedByName: userName, decidedAt: new Date() },
      });
      return this.toDto(updated);
    }
    return this.toDto(await this.approve(organization, task, input, user, userName));
  }

  /** Claims the task first so two people approving at once cannot both run it. */
  private async approve(org: Organization, task: AgentTask, input: Pick<DecideAgentTaskInput, 'selection' | 'edits'>, user: AuthUser, userName = 'Agent') {
    const claimed = await this.prisma.agentTask.updateMany({ where: { id: task.id, status: 'PENDING' }, data: { status: 'APPROVED' } });
    if (!claimed.count) throw new ConflictException('This task was already handled');
    try {
      const result = await this.execute(org, task, input, user);
      return await this.prisma.agentTask.update({
        where: { id: task.id },
        data: { status: 'DONE', result, decidedById: user.id, decidedByName: userName, decidedAt: new Date() },
      });
    } catch (error) {
      await this.prisma.agentTask.update({ where: { id: task.id }, data: { status: 'PENDING' } });
      throw error;
    }
  }

  private async execute(org: Organization, task: AgentTask, input: Pick<DecideAgentTaskInput, 'selection' | 'edits'>, user: AuthUser): Promise<string> {
    const payload = task.payload as Record<string, any>;
    const pick = (ids: string[], fallback: string[]) => {
      const chosen = input.selection?.length ? input.selection.filter((id) => ids.includes(id)) : fallback;
      if (!chosen.length) throw new BadRequestException('Tick at least one person');
      return chosen;
    };

    switch (task.agent as HiringAgentId) {
      case 'screening': {
        const all = (payload.candidates as Array<{ applicationId: string; suggested: boolean }>).map((c) => c.applicationId);
        const ids = pick(all, (payload.candidates as Array<{ applicationId: string; suggested: boolean }>).filter((c) => c.suggested).map((c) => c.applicationId));
        const { moved } = await this.applications.moveStage(org.id, ids, payload.nextStage as string, user);
        return `Moved ${moved} ${moved === 1 ? 'person' : 'people'} to “${payload.nextStage}”.`;
      }
      case 'job_post': {
        const draft = payload.draft as { title: string; description: string; mustHaves: string[]; salary: { minNaira: number; maxNaira: number } };
        const brief = payload.brief as { location: string; employmentType: string; workArrangement: 'ONSITE' | 'HYBRID' | 'REMOTE' };
        const existing = payload.jobId ? await this.requireJob(org.id, payload.jobId as string) : null;
        const title = input.edits?.title ?? draft.title;
        const job = jobInputSchema.parse({
          title,
          roleFamily: existing?.roleFamily ?? (isSkilledTrade(title) ? 'SKILLED_TRADE' : 'OFFICE_PROFESSIONAL'),
          location: brief.location || existing?.location || 'Lagos',
          workArrangement: brief.workArrangement ?? existing?.workArrangement ?? 'ONSITE',
          employmentType: (EMPLOYMENT_TYPES as readonly string[]).includes(brief.employmentType) ? brief.employmentType : 'FULL_TIME',
          salaryMinMinor: draft.salary.minNaira ? draft.salary.minNaira * 100 : null,
          salaryMaxMinor: draft.salary.maxNaira ? draft.salary.maxNaira * 100 : null,
          currency: 'NGN',
          description: draft.description,
          mustHaves: draft.mustHaves.map((m) => m.slice(0, 120)).filter((m) => m.length >= 2).slice(0, 12),
          stages: existing?.stages,
          hiringManagerIds: existing?.hiringManagerIds ?? [],
        });
        if (existing) {
          await this.jobs.update(org.id, existing.id, job, user);
          return `Updated “${title}”.`;
        }
        const created = await this.jobs.create(org.id, job, user);
        await this.prisma.agentTask.update({ where: { id: task.id }, data: { jobId: created.id } });
        return `Saved “${title}” as a draft job. Publish it when you are ready.`;
      }
      case 'sourcing': {
        const plan = payload.plan as { emailSubject: string; emailBody: string };
        await this.tools.createTemplate(
          org.id,
          { name: `Outreach – ${payload.jobTitle as string}`.slice(0, 80), subject: (input.edits?.subject ?? plan.emailSubject).slice(0, 160), body: input.edits?.body ?? plan.emailBody },
          user,
        );
        return 'Saved the outreach email as a template you can send from any applicant.';
      }
      case 'follow_up': {
        await assertEmailVerified(this.prisma, user);
        const recipients = payload.recipients as Array<{ applicationId: string }>;
        const all = recipients.map((r) => r.applicationId);
        const ids = pick(all, all);
        const message = payload.message as { subject: string; body: string };
        const { sent } = await this.tools.bulkEmail(org.id, { applicationIds: ids, subject: input.edits?.subject ?? message.subject, body: input.edits?.body ?? message.body }, user);
        return `Sent ${sent} personal ${sent === 1 ? 'update' : 'updates'}.`;
      }
      case 'scheduling': {
        await assertEmailVerified(this.prisma, user);
        await this.hiring.schedule(
          org.id,
          payload.applicationId as string,
          {
            kind: payload.kind as 'VIDEO' | 'PHONE' | 'IN_PERSON',
            durationMin: payload.durationMin as number,
            slotOptions: (payload.slots as string[]).filter((s) => Date.parse(s) > Date.now()),
            interviewerIds: [],
            notes: 'Times proposed by the Dealo scheduling agent.',
          },
          user,
        );
        return `Sent ${payload.name as string} a link to pick an interview time.`;
      }
      case 'interview_kit': {
        await this.prisma.job.updateMany({ where: { id: payload.jobId as string, organizationId: org.id }, data: { interviewKit: payload.kit as Prisma.InputJsonValue } });
        return `Attached the interview kit to ${payload.jobTitle as string}.`;
      }
      case 'pipeline_digest':
        return 'Noted.';
    }
    throw new BadRequestException('Unknown agent');
  }

  // ----------------------------------------------------------- automation

  private async onEvent(event: AtsEvent) {
    try {
      const org = await this.prisma.organization.findUnique({ where: { id: event.organizationId } });
      if (!org?.isActive) return;
      if (event.type === 'application.created') {
        const { enabled, config } = await this.setting(org.id, 'screening');
        if (!enabled || !config.autoRun) return;
        const job = await this.requireJob(org.id, event.jobId);
        const open = await this.prisma.agentTask.count({ where: { organizationId: org.id, agent: 'screening', jobId: job.id, status: 'PENDING' } });
        // Refreshing an open shortlist is free; starting a new one counts as a run.
        if (!open) await this.consume(org);
        await this.screening(org, job, config, 'new_applicant');
      }
      if (event.type === 'application.stage_changed') {
        const { enabled, config } = await this.setting(org.id, 'scheduling');
        if (!enabled || event.to.trim().toLowerCase() !== config.interviewStage.trim().toLowerCase()) return;
        await this.consume(org);
        await this.scheduling(org, event.applicationId, config, 'stage_change', event.actor);
      }
    } catch (error) {
      this.logger.log(`Agent skipped ${event.type}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Daily agents run once per Lagos day, after the hour chosen in their settings. */
  private async sweep() {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      const now = lagos();
      const due = await this.prisma.agentSetting.findMany({ where: { enabled: true, agent: { in: ['follow_up', 'pipeline_digest'] } } });
      for (const row of due) {
        const agent = row.agent as 'follow_up' | 'pipeline_digest';
        const config = this.config(agent, row.config);
        if (now.hour < config.hour || (row.lastRunAt && lagos(row.lastRunAt).day === now.day)) continue;
        const org = await this.prisma.organization.findUnique({ where: { id: row.organizationId } });
        if (!org?.isActive) continue;
        await this.prisma.agentSetting.update({ where: { id: row.id }, data: { lastRunAt: new Date() } });
        try {
          await this.consume(org);
          if (agent === 'follow_up') await this.followUp(org, config as AgentConfig<'follow_up'>, 'daily');
          else await this.digest(org, config as AgentConfig<'pipeline_digest'>, 'daily');
        } catch (error) {
          this.logger.log(`Daily ${agent} skipped for ${org.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Agent sweep failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.sweeping = false;
    }
  }

  // ----------------------------------------------------------------- billing

  async upgrade(orgId: string, user: AuthUser) {
    const { organization } = await this.access.require(orgId, user, WorkspaceRole.ADMIN);
    if (!this.paystack.isConfigured) {
      throw new HttpException('Online payment is not switched on yet. Message Dealo on WhatsApp and we will upgrade you today.', HttpStatus.SERVICE_UNAVAILABLE);
    }
    const account = await this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
    if (!account) throw new ForbiddenException('Account not found');
    const pro = AGENT_PLANS.PRO;
    const reference = newReference(PAYMENT_PREFIX.agents);
    const invoice = await this.prisma.agentInvoice.create({
      data: { reference, organizationId: organization.id, userId: user.id, amountMinor: pro.priceMinor, currency: pro.currency, periodDays: pro.periodDays },
    });
    const session = await this.paystack.initialize({
      email: account.email,
      amountMinor: pro.priceMinor,
      currency: pro.currency,
      reference,
      callbackUrl: `${this.appUrl}/dashboard/ats/agents?upgrade=${reference}`,
      metadata: { product: 'dealo_hiring_agents', organizationId: organization.id, invoiceId: invoice.id },
    });
    await this.prisma.agentInvoice.update({ where: { id: invoice.id }, data: { authorizationUrl: session.authorization_url } });
    return { reference, authorizationUrl: session.authorization_url };
  }

  /** Grants Pro for a verified Paystack payment. Safe to call twice (webhook and return page). */
  private async applyTransaction(txn: PaystackTransaction) {
    const invoice = await this.prisma.agentInvoice.findUnique({ where: { reference: txn.reference } });
    if (!invoice || invoice.status !== 'PENDING') return;
    if (txn.status === 'success') {
      if (txn.amount !== invoice.amountMinor || txn.currency.toUpperCase() !== invoice.currency.toUpperCase()) {
        await this.prisma.agentInvoice.updateMany({
          where: { id: invoice.id, status: 'PENDING' },
          data: { status: 'FAILED', failureReason: `Amount mismatch: paid ${txn.amount} ${txn.currency}` },
        });
        return;
      }
      const claimed = await this.prisma.agentInvoice.updateMany({
        where: { id: invoice.id, status: 'PENDING' },
        data: { status: 'PAID', paidAt: txn.paid_at ? new Date(txn.paid_at) : new Date() },
      });
      if (claimed.count) await this.extendPro(invoice.organizationId, invoice.periodDays);
    } else if (txn.status === 'failed' || txn.status === 'abandoned') {
      await this.prisma.agentInvoice.updateMany({ where: { id: invoice.id, status: 'PENDING' }, data: { status: 'FAILED', failureReason: txn.gateway_response ?? txn.status } });
    }
  }

  async verifyUpgrade(orgId: string, reference: string, user: AuthUser) {
    await this.access.require(orgId, user, WorkspaceRole.HIRING_MANAGER);
    const invoice = await this.prisma.agentInvoice.findUnique({ where: { reference } });
    if (!invoice || invoice.organizationId !== orgId) throw new NotFoundException('Payment not found');
    if (invoice.status === 'PENDING') await this.applyTransaction(await this.paystack.verify(reference));
    const [fresh, org] = await Promise.all([
      this.prisma.agentInvoice.findUnique({ where: { id: invoice.id }, select: { status: true, failureReason: true } }),
      this.prisma.organization.findUnique({ where: { id: orgId }, select: { agentPlan: true, agentPlanUntil: true } }),
    ]);
    return { status: fresh?.status ?? 'PENDING', failureReason: fresh?.failureReason ?? null, plan: org ? this.planOf(org) : 'FREE', planUntil: org?.agentPlanUntil ?? null };
  }

  private async extendPro(orgId: string, days: number) {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { agentPlan: true, agentPlanUntil: true } });
    const from = this.planOf(org) === 'PRO' ? org.agentPlanUntil!.getTime() : Date.now();
    await this.prisma.organization.update({ where: { id: orgId }, data: { agentPlan: 'PRO', agentPlanUntil: new Date(from + days * DAY_MS) } });
  }

  /** Dealo staff: give a workspace Pro for some days (0 returns it to Free). */
  async setPlan(orgId: string, days: number, user: AuthUser) {
    if (!user.roles.includes(UserRole.SUPER_ADMIN)) throw new ForbiddenException('Only Dealo super admins can change agent plans');
    if (!isObjectId(orgId)) throw new NotFoundException('Workspace not found');
    if (days <= 0) await this.prisma.organization.update({ where: { id: orgId }, data: { agentPlan: 'FREE', agentPlanUntil: null } });
    else await this.extendPro(orgId, days);
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { agentPlan: true, agentPlanUntil: true } });
    return { plan: this.planOf(org), planUntil: org.agentPlanUntil };
  }

  // ------------------------------------------------------------------ mapping

  private toDto(row: AgentTask): AgentTaskDto {
    return {
      id: row.id,
      agent: row.agent as HiringAgentId,
      kind: row.kind as AgentTaskDto['kind'],
      status: row.status as AgentTaskDto['status'],
      title: row.title,
      summary: row.summary,
      payload: row.payload as Record<string, unknown>,
      jobId: row.jobId,
      applicationId: row.applicationId,
      trigger: row.trigger as AgentTrigger,
      provider: row.provider === 'gemini' ? 'gemini' : 'rules',
      result: row.result,
      decidedByName: row.decidedByName,
      decidedAt: row.decidedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
