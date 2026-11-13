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
  JOB_AGENT_PLANS,
  jobAgentSettingsSchema,
  renderEmailHtml,
  resumeDataSchema,
  type JobAgentChannel,
  type JobAgentMatchDto,
  type JobAgentMatchStatus,
  type JobAgentOverview,
  type JobAgentPlan,
  type JobAgentSettings,
  type JobAgentToggleInput,
  type ResumeData,
} from '@dealo/shared';
import { JobStatus, Prisma, type JobAgentMatch, type JobAgentProfile } from '@prisma/client';
import { z } from 'zod';

import { GeminiClient } from '../ai/gemini.client';
import { ApplicationsService, CV_MAX_BYTES, CV_MIME } from '../ats/applications.service';
import type { AuthUser } from '../auth/auth.types';
import { assertEmailVerified } from '../auth/verified-email';
import { AuditLogService } from '../common/audit-log.service';
import { verifiedMime } from '../common/file-signature';
import type { AppEnv } from '../config/env.validation';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { cvText, findApplyEmail, isScam, scoreJob, suggestTitles, yearsOfExperience, type JobCandidate, type SeekerProfile } from './job-agent-matcher';

const TICK_MS = 10 * 60_000;
const LEASE_MS = 9 * 60_000;
const PROFILES_PER_TICK = 25;
const PARALLEL_RUNS = 3;
const MANUAL_COOLDOWN_MS = 10 * 60_000;
const DAY_MS = 86_400_000;
const AI_RERANK = 8;

const aiJudgementSchema = z.object({
  score: z.number().min(0).max(100),
  reasons: z.array(z.string().min(1).max(160)).max(3).default([]),
  gaps: z.array(z.string().min(1).max(160)).max(3).default([]),
  coverNote: z.string().max(1600).optional(),
  scam: z.boolean().default(false),
});

const plainText = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** Midnight in Lagos (UTC+1, no daylight saving), so "today" matches what the person sees. */
function startOfLagosDay(now = Date.now()) {
  const lagos = new Date(now + 3_600_000);
  return new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate()) - 3_600_000);
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

type Planned = { candidate: JobCandidate; score: number; reasons: string[]; gaps: string[]; coverNote: string | null; channel: JobAgentChannel; applyEmail: string | null };

@Injectable()
export class JobAgentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobAgentService.name);
  private readonly appUrl: string;
  private timer?: NodeJS.Timeout;
  private ticking = false;
  private lastTickAt = new Date();

  constructor(
    private readonly prisma: PrismaService,
    private readonly applications: ApplicationsService,
    private readonly gemini: GeminiClient,
    private readonly email: EmailService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditLogService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/$/, '');
  }

  onModuleInit() {
    const run = () =>
      void this.tick().catch((error: unknown) => this.logger.warn(`Job Agent sweep failed: ${error instanceof Error ? error.message : String(error)}`));
    // Give a freshly woken host a moment before the first sweep.
    const first = setTimeout(run, 45_000);
    this.timer = setInterval(run, TICK_MS);
    first.unref();
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // -------------------------------------------------------------------- plan

  private async planFor(userId: string): Promise<JobAgentPlan> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { premiumUntil: true } });
    return user?.premiumUntil && user.premiumUntil > new Date() ? 'PREMIUM' : 'FREE';
  }

  private appliedSince(userId: string, since: Date) {
    return this.prisma.jobAgentMatch.count({ where: { userId, status: 'APPLIED', appliedAt: { gte: since } } });
  }

  // ---------------------------------------------------------------- overview

  async overview(user: AuthUser): Promise<JobAgentOverview> {
    const [profile, plan, resumes] = await Promise.all([
      this.prisma.jobAgentProfile.findUnique({ where: { userId: user.id }, omit: { cvData: true } }),
      this.planFor(user.id),
      this.prisma.resume.findMany({ where: { userId: user.id, kind: 'RESUME' }, orderBy: { updatedAt: 'desc' }, select: { id: true, data: true, updatedAt: true }, take: 20 }),
    ]);
    const limits = JOB_AGENT_PLANS[plan];
    const today = startOfLagosDay();
    const [appliedToday, appliedWeek, appliedTotal, suggested, ready, runs] = await Promise.all([
      this.appliedSince(user.id, today),
      this.appliedSince(user.id, new Date(Date.now() - 7 * DAY_MS)),
      this.prisma.jobAgentMatch.count({ where: { userId: user.id, status: 'APPLIED' } }),
      this.prisma.jobAgentMatch.count({ where: { userId: user.id, status: 'SUGGESTED' } }),
      this.prisma.jobAgentMatch.count({ where: { userId: user.id, status: 'READY' } }),
      this.prisma.jobAgentRun.findMany({ where: { userId: user.id }, orderBy: { startedAt: 'desc' }, take: 8 }),
    ]);

    const chosen = resumes.find((r) => r.id === profile?.resumeId) ?? resumes[0];
    const parsed = chosen ? resumeDataSchema.safeParse(chosen.data) : null;
    const settings: JobAgentSettings | null = profile
      ? {
          resumeId: profile.resumeId ?? null,
          targetTitles: profile.targetTitles,
          locations: profile.locations,
          remote: profile.remote as JobAgentSettings['remote'],
          employmentTypes: profile.employmentTypes as JobAgentSettings['employmentTypes'],
          mustHave: profile.mustHave,
          exclude: profile.exclude,
          minScore: profile.minScore,
          dailyLimit: profile.dailyLimit,
          mode: profile.mode as JobAgentSettings['mode'],
          coverNotes: profile.coverNotes,
          emailApply: profile.emailApply,
          phone: profile.phone ?? '',
        }
      : null;
    const linkedResume = resumes.find((r) => r.id === profile?.resumeId);

    return {
      plan,
      limits,
      enabled: Boolean(profile?.enabled),
      consented: Boolean(profile?.consentAt),
      settings,
      cv:
        profile?.cvFileName && profile.cvUpdatedAt
          ? { fileName: profile.cvFileName, updatedAt: profile.cvUpdatedAt.toISOString(), stale: Boolean(linkedResume && linkedResume.updatedAt > profile.cvUpdatedAt) }
          : null,
      status: {
        lastRunAt: profile?.lastRunAt?.toISOString() ?? null,
        nextRunAt: profile?.enabled ? (profile.nextRunAt?.toISOString() ?? new Date().toISOString()) : null,
        lastError: profile?.lastError ?? null,
        canRunNow: !profile?.lastRunAt || Date.now() - profile.lastRunAt.getTime() > MANUAL_COOLDOWN_MS,
      },
      stats: { appliedToday, appliedWeek, appliedTotal, suggested, ready, dailyAllowance: Math.min(profile?.dailyLimit ?? limits.dailyApplications, limits.dailyApplications) },
      suggestedTitles: parsed?.success ? suggestTitles(parsed.data) : [],
      runs: runs.map((r) => ({
        id: r.id,
        trigger: r.trigger,
        scanned: r.scanned,
        matched: r.matched,
        applied: r.applied,
        queued: r.queued,
        error: r.error ?? null,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt?.toISOString() ?? null,
      })),
      aiAvailable: this.gemini.isConfigured,
    };
  }

  // ---------------------------------------------------------------- settings

  async saveSettings(raw: unknown, user: AuthUser) {
    const parsed = jobAgentSettingsSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Check your settings');
    const input = parsed.data;
    const plan = await this.planFor(user.id);
    const limits = JOB_AGENT_PLANS[plan];
    if (input.targetTitles.length > limits.maxTargets) {
      throw new ForbiddenException(`Your plan follows up to ${limits.maxTargets} job titles. Upgrade to Premium for ${JOB_AGENT_PLANS.PREMIUM.maxTargets}.`);
    }
    if (input.resumeId) {
      const owned = await this.prisma.resume.count({ where: { id: input.resumeId, userId: user.id, kind: 'RESUME' } });
      if (!owned) throw new NotFoundException('CV not found');
    }
    const data = {
      ...input,
      dailyLimit: Math.min(input.dailyLimit, limits.dailyApplications),
      emailApply: limits.emailApply ? input.emailApply : false,
      coverNotes: limits.coverNotes ? input.coverNotes : false,
      phone: input.phone || null,
    };
    await this.prisma.jobAgentProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: { ...data, nextRunAt: new Date() },
    });
    return this.overview(user);
  }

  async uploadCv(file: Express.Multer.File | undefined, user: AuthUser) {
    if (!file) throw new BadRequestException('Attach your CV as a PDF');
    if (file.size > CV_MAX_BYTES) throw new BadRequestException('Your CV must be 8 MB or smaller');
    const mime = verifiedMime(file.buffer, CV_MIME);
    if (!mime) throw new BadRequestException('Upload your CV as a PDF or Word file');
    const profile = await this.prisma.jobAgentProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!profile) throw new BadRequestException('Save your Job Agent settings first');
    await this.prisma.jobAgentProfile.update({
      where: { userId: user.id },
      data: { cvFileName: file.originalname.slice(0, 160) || 'cv.pdf', cvData: new Uint8Array(file.buffer), cvUpdatedAt: new Date() },
    });
    return this.overview(user);
  }

  async toggle(input: JobAgentToggleInput, user: AuthUser) {
    const profile = await this.prisma.jobAgentProfile.findUnique({ where: { userId: user.id }, omit: { cvData: true } });
    if (!profile) throw new BadRequestException('Save your Job Agent settings first');
    if (input.enabled) {
      await assertEmailVerified(this.prisma, user);
      if (!profile.consentAt && !input.consent) {
        throw new BadRequestException('Please confirm the agent may send applications in your name');
      }
      if (!profile.cvFileName) throw new BadRequestException('Attach the CV your agent should send');
    }
    await this.prisma.jobAgentProfile.update({
      where: { userId: user.id },
      data: {
        enabled: input.enabled,
        ...(input.enabled ? { nextRunAt: new Date(), lastError: null } : {}),
        ...(input.enabled && !profile.consentAt ? { consentAt: new Date() } : {}),
      },
    });
    await this.audit.record({ action: input.enabled ? 'JOB_AGENT_ON' : 'JOB_AGENT_OFF', entityType: 'JobAgent', entityId: profile.id, actorId: user.id });
    return this.overview(user);
  }

  async runNow(user: AuthUser) {
    const profile = await this.prisma.jobAgentProfile.findUnique({ where: { userId: user.id }, select: { id: true, lastRunAt: true, cvFileName: true } });
    if (!profile) throw new BadRequestException('Save your Job Agent settings first');
    if (profile.lastRunAt && Date.now() - profile.lastRunAt.getTime() < MANUAL_COOLDOWN_MS) {
      throw new HttpException('Your agent just searched. Give it a few minutes before the next search.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const claimed = await this.claim(profile.id);
    if (!claimed) throw new ConflictException('Your agent is already searching');
    void this.runProfile(profile.id, 'manual').catch((error: unknown) => this.logger.warn(`Manual Job Agent run failed: ${String(error)}`));
    return { started: true };
  }

  // ----------------------------------------------------------------- matches

  async listMatches(user: AuthUser, status?: string) {
    const where: Prisma.JobAgentMatchWhereInput = { userId: user.id };
    if (status === 'inbox') where.status = { in: ['SUGGESTED', 'READY'] };
    else if (status) where.status = status;
    const rows = await this.prisma.jobAgentMatch.findMany({ where, orderBy: [{ createdAt: 'desc' }], take: 120 });
    return rows.map((m) => this.toDto(m));
  }

  async approve(matchId: string, user: AuthUser) {
    const match = await this.ownedMatch(matchId, user);
    if (match.status !== 'SUGGESTED') throw new BadRequestException('This job is not waiting for approval');
    const profile = await this.prisma.jobAgentProfile.findUnique({ where: { userId: user.id } });
    if (!profile?.cvData) throw new BadRequestException('Attach the CV your agent should send');
    const plan = await this.planFor(user.id);
    const allowance = Math.min(profile.dailyLimit, JOB_AGENT_PLANS[plan].dailyApplications);
    if ((await this.appliedSince(user.id, startOfLagosDay())) >= allowance) {
      throw new HttpException(`You have used today's ${allowance} applications. More tomorrow, or upgrade for a higher limit.`, HttpStatus.TOO_MANY_REQUESTS);
    }
    const account = await this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true, firstName: true, lastName: true } });
    if (!account) throw new NotFoundException('Account not found');
    await this.send(match, profile, account);
    return this.toDto(await this.prisma.jobAgentMatch.findUniqueOrThrow({ where: { id: match.id } }));
  }

  async skip(matchId: string, user: AuthUser) {
    const match = await this.ownedMatch(matchId, user);
    if (match.status === 'APPLIED') throw new BadRequestException('Already applied');
    return this.toDto(await this.prisma.jobAgentMatch.update({ where: { id: match.id }, data: { status: 'SKIPPED' } }));
  }

  /** The person finished an outside application on the employer's site. */
  async markApplied(matchId: string, user: AuthUser) {
    const match = await this.ownedMatch(matchId, user);
    const updated = await this.prisma.jobAgentMatch.update({ where: { id: match.id }, data: { status: 'APPLIED', appliedAt: new Date(), error: null } });
    await this.logApplication(updated, user.id, null, 'Applied from your Job Agent');
    return this.toDto(updated);
  }

  private async ownedMatch(id: string, user: AuthUser) {
    if (!/^[a-f0-9]{24}$/.test(id)) throw new NotFoundException('Match not found');
    const match = await this.prisma.jobAgentMatch.findFirst({ where: { id, userId: user.id } });
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }

  private toDto(m: JobAgentMatch): JobAgentMatchDto {
    return {
      id: m.id,
      listingId: m.listingId,
      kind: m.kind as JobAgentMatchDto['kind'],
      channel: m.channel as JobAgentChannel,
      title: m.title,
      company: m.company,
      location: m.location,
      url: m.url,
      score: m.score,
      reasons: m.reasons,
      gaps: m.gaps,
      coverNote: m.coverNote ?? null,
      status: m.status as JobAgentMatchStatus,
      error: m.error ?? null,
      createdAt: m.createdAt.toISOString(),
      appliedAt: m.appliedAt?.toISOString() ?? null,
    };
  }

  // --------------------------------------------------------------- scheduler

  /** Atomically takes a profile for one run, so two API instances never run it together. */
  private async claim(profileId: string) {
    const now = new Date();
    const { count } = await this.prisma.jobAgentProfile.updateMany({
      where: { id: profileId, OR: [{ leaseUntil: null }, { leaseUntil: { isSet: false } }, { leaseUntil: { lt: now } }] },
      data: { leaseUntil: new Date(now.getTime() + LEASE_MS) },
    });
    return count === 1;
  }

  async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      // A new Dealo job is the one place the agent can apply instantly, so wake every agent for it.
      const since = this.lastTickAt;
      this.lastTickAt = new Date();
      const freshDealoJobs = await this.prisma.job.count({ where: { status: JobStatus.OPEN, publishedAt: { gte: since } } });
      if (freshDealoJobs) await this.prisma.jobAgentProfile.updateMany({ where: { enabled: true }, data: { nextRunAt: new Date() } });

      const due = await this.prisma.jobAgentProfile.findMany({
        where: { enabled: true, OR: [{ nextRunAt: null }, { nextRunAt: { isSet: false } }, { nextRunAt: { lte: new Date() } }] },
        orderBy: { nextRunAt: 'asc' },
        take: PROFILES_PER_TICK,
        select: { id: true },
      });
      const queue = [...due];
      const worker = async () => {
        for (let next = queue.shift(); next; next = queue.shift()) {
          if (!(await this.claim(next.id))) continue;
          await this.runProfile(next.id, freshDealoJobs ? 'new_job' : 'schedule').catch((error: unknown) =>
            this.logger.warn(`Job Agent run ${next!.id} failed: ${error instanceof Error ? error.message : String(error)}`),
          );
        }
      };
      await Promise.all(Array.from({ length: PARALLEL_RUNS }, worker));
    } finally {
      this.ticking = false;
    }
  }

  // ----------------------------------------------------------------- the run

  async runProfile(profileId: string, trigger: string) {
    const profile = await this.prisma.jobAgentProfile.findUnique({ where: { id: profileId } });
    if (!profile) return;
    const run = await this.prisma.jobAgentRun.create({ data: { userId: profile.userId, trigger } });
    const plan = await this.planFor(profile.userId);
    const limits = JOB_AGENT_PLANS[plan];
    const finish = async (data: { scanned?: number; matched?: number; applied?: number; queued?: number; error?: string | null }) => {
      await this.prisma.jobAgentRun.update({ where: { id: run.id }, data: { ...data, finishedAt: new Date() } });
      await this.prisma.jobAgentProfile.update({
        where: { id: profile.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt: new Date(Date.now() + limits.runEveryHours * 3_600_000),
          leaseUntil: null,
          lastError: data.error ?? null,
        },
      });
    };

    try {
      const account = await this.prisma.user.findUnique({ where: { id: profile.userId }, select: { email: true, firstName: true, lastName: true, isActive: true } });
      if (!account?.isActive) {
        await this.prisma.jobAgentProfile.update({ where: { id: profile.id }, data: { enabled: false } });
        return finish({ error: 'Account is not active' });
      }
      const resume = profile.resumeId ? await this.prisma.resume.findFirst({ where: { id: profile.resumeId, userId: profile.userId } }) : null;
      const data = resume ? resumeDataSchema.safeParse(resume.data) : null;
      if (!data?.success) return finish({ error: 'Choose the CV your agent should use' });

      const seeker = this.seekerFrom(profile, data.data);
      const { candidates, scanned } = await this.candidatesFor(profile, seeker);
      let planned = candidates
        .map((candidate) => ({ candidate, result: scoreJob(seeker, candidate) }))
        .filter((r): r is { candidate: JobCandidate; result: NonNullable<ReturnType<typeof scoreJob>> } => r.result !== null)
        .filter((r) => r.result.score >= profile.minScore - (limits.aiMatching && this.gemini.isConfigured ? 12 : 0))
        .sort((a, b) => b.result.score - a.result.score)
        // Boards repost the same job under new ids; keep the best-scoring copy of each company + title.
        .filter(
          (r, index, list) =>
            list.findIndex((o) => `${o.candidate.company}|${o.candidate.title}`.toLowerCase() === `${r.candidate.company}|${r.candidate.title}`.toLowerCase()) === index,
        )
        .slice(0, limits.matchesPerRun)
        .map<Planned>(({ candidate, result }) => ({ candidate, ...result, coverNote: null, channel: candidate.kind === 'dealo' ? 'easy_apply' : 'site', applyEmail: null }));

      planned = await this.enrich(planned, data.data, profile, limits.aiMatching, limits.coverNotes && profile.coverNotes);
      planned = planned.filter((p) => p.score >= profile.minScore).sort((a, b) => b.score - a.score);

      if (limits.emailApply && profile.emailApply) {
        for (const p of planned) if (p.candidate.kind === 'external' && p.applyEmail) p.channel = 'email';
      }

      const created: JobAgentMatch[] = [];
      for (const p of planned) {
        try {
          created.push(
            await this.prisma.jobAgentMatch.create({
              data: {
                userId: profile.userId,
                listingId: p.candidate.listingId,
                kind: p.candidate.kind,
                channel: p.channel,
                title: p.candidate.title.slice(0, 200),
                company: p.candidate.company.slice(0, 160),
                location: p.candidate.location.slice(0, 160),
                url: p.candidate.url,
                applyEmail: p.channel === 'email' ? p.applyEmail : null,
                score: p.score,
                reasons: p.reasons,
                gaps: p.gaps,
                coverNote: p.coverNote,
                status: p.channel === 'site' ? 'READY' : 'SUGGESTED',
              },
            }),
          );
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
        }
      }

      let applied = 0;
      if (profile.mode === 'AUTO' && profile.cvData) {
        const allowance = Math.min(profile.dailyLimit, limits.dailyApplications);
        let usedToday = await this.appliedSince(profile.userId, startOfLagosDay());
        for (const match of created.filter((m) => m.status === 'SUGGESTED').sort((a, b) => b.score - a.score)) {
          if (usedToday >= allowance) break;
          if (await this.send(match, profile, account)) {
            applied += 1;
            usedToday += 1;
          }
        }
      }

      const queued = created.length - applied;
      if (created.length) await this.tellPerson(profile, account, applied, queued);
      return finish({ scanned, matched: created.length, applied, queued });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 300) : 'Unknown error';
      this.logger.warn(`Job Agent run for ${profile.userId} failed: ${message}`);
      return finish({ error: 'The agent hit a problem and will try again later' });
    }
  }

  private seekerFrom(profile: JobAgentProfile, data: ResumeData): SeekerProfile {
    return {
      titles: profile.targetTitles,
      skills: [...new Set(data.skills.map((s) => s.trim()).filter((s) => s.length >= 2))].slice(0, 30),
      years: yearsOfExperience(data),
      cvText: cvText(data),
      mustHave: profile.mustHave,
      exclude: profile.exclude,
      locations: profile.locations,
      remote: profile.remote as SeekerProfile['remote'],
      types: profile.employmentTypes,
    };
  }

  /** Recent Dealo and outside jobs whose title shares a word with what the person wants, minus anything already seen. */
  private async candidatesFor(profile: JobAgentProfile, seeker: SeekerProfile) {
    const words = [...new Set(seeker.titles.flatMap((t) => t.toLowerCase().split(/[^a-z0-9+#]+/)).filter((w) => w.length >= 3))].slice(0, 16);
    if (!words.length) return { candidates: [], scanned: 0 };
    const titleOr = words.map((w) => ({ title: { contains: w, mode: 'insensitive' as const } }));

    const [seen, applied, dealoJobs, externalJobs] = await Promise.all([
      this.prisma.jobAgentMatch.findMany({ where: { userId: profile.userId }, select: { listingId: true, title: true, company: true } }),
      this.prisma.jobApplicationLog.findMany({ where: { userId: profile.userId }, select: { listingId: true } }),
      this.prisma.job.findMany({
        where: {
          status: JobStatus.OPEN,
          organization: { is: { isActive: true, careersEnabled: true } },
          OR: titleOr,
          ...(seeker.remote === 'REMOTE_ONLY' ? { workArrangement: 'REMOTE' as const } : {}),
        },
        orderBy: { publishedAt: 'desc' },
        take: 150,
        include: { organization: { select: { name: true, slug: true } } },
      }),
      this.prisma.externalJob.findMany({
        where: {
          publishedAt: { gte: new Date(Date.now() - 14 * DAY_MS) },
          OR: titleOr,
          ...(seeker.remote === 'REMOTE_ONLY' ? { remote: true } : seeker.remote === 'ONSITE_ONLY' ? { remote: false } : {}),
        },
        orderBy: { publishedAt: 'desc' },
        take: 350,
        select: { id: true, source: true, title: true, company: true, location: true, remote: true, employmentType: true, summary: true, tags: true, category: true, url: true, publishedAt: true },
      }),
    ]);
    const skip = new Set([...seen, ...applied].map((r) => r.listingId));
    const seenRoles = new Set(seen.map((r) => `${r.company}|${r.title}`.toLowerCase()));

    const candidates: JobCandidate[] = [
      ...dealoJobs.map<JobCandidate>((job) => ({
        listingId: `dealo_${job.id}`,
        kind: 'dealo',
        title: job.title,
        company: job.organization.name,
        location: job.location,
        remote: job.workArrangement === 'REMOTE',
        employmentType: job.employmentType,
        text: job.description.slice(0, 4000),
        mustHaves: job.mustHaves,
        url: `${this.appUrl}/careers/${job.organization.slug}/${job.slug}`,
        publishedAt: job.publishedAt ?? job.createdAt,
      })),
      ...externalJobs.map<JobCandidate>((job) => ({
        listingId: `ext_${job.id}`,
        kind: 'external',
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.remote,
        employmentType: job.employmentType,
        text: `${job.summary} ${job.tags.join(' ')} ${job.category ?? ''}`,
        mustHaves: [],
        url: job.url,
        publishedAt: job.publishedAt,
      })),
    ].filter((c) => !skip.has(c.listingId) && !seenRoles.has(`${c.company}|${c.title}`.toLowerCase()));

    return { candidates, scanned: dealoJobs.length + externalJobs.length };
  }

  /**
   * Loads full descriptions for the shortlist, finds apply-by-email addresses, and (Premium) asks the AI
   * to re-judge the top matches and write a short, honest cover note for each.
   */
  private async enrich(planned: Planned[], data: ResumeData, profile: JobAgentProfile, useAi: boolean, writeNotes: boolean) {
    const externalIds = planned.filter((p) => p.candidate.kind === 'external').map((p) => p.candidate.listingId.slice(4));
    const full = externalIds.length
      ? await this.prisma.externalJob.findMany({ where: { id: { in: externalIds } }, select: { id: true, description: true } })
      : [];
    const descriptions = new Map(full.map((j) => [`ext_${j.id}`, plainText(j.description)]));
    for (const p of planned) {
      const text = descriptions.get(p.candidate.listingId);
      if (!text) continue;
      p.candidate = { ...p.candidate, text: text.slice(0, 6000) };
      p.applyEmail = findApplyEmail(text);
    }
    planned = planned.filter((p) => !isScam(p.candidate.text));

    if (!useAi || !this.gemini.isConfigured) return planned;

    const cv = [
      `Headline: ${data.personal.headline}`,
      `Summary: ${data.summary.slice(0, 700)}`,
      `Skills: ${data.skills.slice(0, 25).join(', ')}`,
      `Experience: ${data.experience
        .slice(0, 4)
        .map((e) => `${e.role} at ${e.company} (${e.start}–${e.current ? 'now' : e.end}): ${e.bullets.slice(0, 2).join(' ')}`)
        .join(' | ')}`,
      `Education: ${data.education.map((e) => `${e.qualification} ${e.field}, ${e.school}`).join('; ')}`,
      `Wants: ${profile.targetTitles.join(', ')}${profile.locations.length ? ` in ${profile.locations.join(', ')}` : ''}`,
    ].join('\n');
    const system = `You are a strict, fair recruiter matching one job seeker to one job in Nigeria or remote.
Score 0-100 for how likely this person is to be shortlisted (title fit, skills, seniority, location). Be honest; do not inflate.
reasons: up to 3 short, specific reasons in plain English, addressed to the job seeker ("You have…").
gaps: up to 3 short, specific gaps or risks.
scam: true if the job asks for payment, is vague about the employer and pay while promising a lot, or looks fake.
${writeNotes ? 'coverNote: 90-140 words, first person, warm and specific to this job and company, using ONLY facts from the CV. No placeholders, no invented achievements, no greeting line, no sign-off.' : 'coverNote: omit.'}
Reply as JSON: {"score": number, "reasons": string[], "gaps": string[], "scam": boolean${writeNotes ? ', "coverNote": string' : ''}}`;

    const top = planned.slice(0, AI_RERANK);
    await Promise.all(
      top.map(async (p) => {
        try {
          const judged = await this.gemini.json(
            system,
            `CV:\n${cv}\n\nJOB:\nTitle: ${p.candidate.title}\nCompany: ${p.candidate.company}\nLocation: ${p.candidate.location}${p.candidate.remote ? ' (remote)' : ''}\nDescription: ${p.candidate.text.slice(0, 3000)}\nRequirements: ${p.candidate.mustHaves.join('; ') || 'not listed'}`,
            aiJudgementSchema,
          );
          if (judged.scam) {
            p.score = 0;
            return;
          }
          p.score = Math.round(p.score * 0.4 + judged.score * 0.6);
          if (judged.reasons?.length) p.reasons = judged.reasons;
          if (judged.gaps?.length) p.gaps = judged.gaps;
          if (writeNotes && judged.coverNote) p.coverNote = judged.coverNote.trim();
        } catch (error) {
          this.logger.debug(`AI judgement skipped: ${error instanceof Error ? error.message : String(error)}`);
        }
      }),
    );
    return planned.filter((p) => p.score > 0);
  }

  // -------------------------------------------------------------- applying

  /** Sends one application. Returns true when it went out (or had already gone out). */
  private async send(match: JobAgentMatch, profile: JobAgentProfile, account: { email: string; firstName: string; lastName: string }) {
    if (!profile.cvData || !profile.cvFileName) return false;
    const resume = profile.resumeId ? await this.prisma.resume.findUnique({ where: { id: profile.resumeId }, select: { data: true } }) : null;
    const personal = resume ? resumeDataSchema.safeParse(resume.data) : null;
    const name = (personal?.success && personal.data.personal.fullName) || `${account.firstName} ${account.lastName}`.trim();
    const phone = profile.phone || (personal?.success ? personal.data.personal.phone : '') || undefined;
    const location = (personal?.success ? personal.data.personal.location : '') || undefined;
    const file = { buffer: Buffer.from(profile.cvData), size: profile.cvData.length, originalname: profile.cvFileName };

    try {
      let applicationId: string | null = null;
      if (match.channel === 'easy_apply') {
        try {
          const result = await this.applications.applyFromAgent(match.listingId.replace(/^dealo_/, ''), { name, email: account.email, phone, location, coverNote: match.coverNote ?? undefined }, file);
          applicationId = result.id;
        } catch (error) {
          if (!(error instanceof ConflictException)) throw error;
        }
      } else if (match.channel === 'email' && match.applyEmail) {
        await this.sendEmailApplication(match, { name, email: account.email, phone }, file);
      } else {
        return false;
      }
      const updated = await this.prisma.jobAgentMatch.update({
        where: { id: match.id },
        data: { status: 'APPLIED', appliedAt: new Date(), applicationId, error: null },
      });
      await this.logApplication(updated, profile.userId, profile.resumeId ?? null, 'Sent by your Job Agent');
      return true;
    } catch (error) {
      const reason = error instanceof HttpException ? error.message : 'Could not send this application';
      await this.prisma.jobAgentMatch.update({ where: { id: match.id }, data: { status: 'FAILED', error: reason.slice(0, 300) } });
      return false;
    }
  }

  private async sendEmailApplication(match: JobAgentMatch, who: { name: string; email: string; phone?: string }, file: { buffer: Buffer; originalname: string }) {
    const note = match.coverNote ?? `I would like to apply for the ${match.title} role at ${match.company}. My CV is attached, and I would welcome the chance to talk.`;
    const html = `<p>Dear Hiring Team,</p>
<p>${escapeHtml(note).replace(/\n+/g, '</p><p>')}</p>
<p>Kind regards,<br/>${escapeHtml(who.name)}<br/>${escapeHtml(who.email)}${who.phone ? `<br/>${escapeHtml(who.phone)}` : ''}</p>
<p style="color:#6b7280;font-size:12px">Sent through Dealo on behalf of ${escapeHtml(who.name)}, who asked us to apply for this role. Reply to this email to reach them directly.</p>`;
    await this.email.send({
      to: match.applyEmail!,
      subject: `Application: ${match.title} — ${who.name}`.slice(0, 180),
      html,
      text: `Dear Hiring Team,\n\n${note}\n\nKind regards,\n${who.name}\n${who.email}${who.phone ? `\n${who.phone}` : ''}\n\nSent through Dealo on behalf of ${who.name}. Reply to reach them directly.`,
      headers: { 'Reply-To': who.email },
      attachments: [{ filename: file.originalname, content: file.buffer, contentType: 'application/pdf' }],
    });
  }

  private async logApplication(match: JobAgentMatch, userId: string, resumeId: string | null, note: string) {
    const source = match.kind === 'dealo' ? 'dealo' : 'external';
    await this.prisma.jobApplicationLog
      .upsert({
        where: { userId_listingId: { userId, listingId: match.listingId } },
        create: { userId, listingId: match.listingId, title: match.title, company: match.company, url: match.url, source, resumeId, note },
        update: { status: 'APPLIED', appliedAt: new Date(), note },
      })
      .catch((error: unknown) => this.logger.warn(`Could not log agent application: ${String(error)}`));
  }

  /** In-app notice every run that found something, and at most one email a day so people are never spammed. */
  private async tellPerson(profile: JobAgentProfile, account: { email: string; firstName: string }, applied: number, queued: number) {
    const title = applied
      ? `Your Job Agent applied to ${applied} job${applied === 1 ? '' : 's'}`
      : `Your Job Agent found ${queued} job${queued === 1 ? '' : 's'} for you`;
    const body = applied && queued ? `${queued} more are ready for you to review.` : queued ? 'Review them and apply in one tap.' : 'See them in your Job Agent.';
    await this.notifications.notify([profile.userId], { type: 'job_agent.run', title, body, link: '/dashboard/job-agent' });

    if (profile.lastDigestAt && Date.now() - profile.lastDigestAt.getTime() < 20 * 3_600_000) return;
    const link = `${this.appUrl}/dashboard/job-agent`;
    const html = renderEmailHtml(
      `<h2>${escapeHtml(title)}</h2>
<p>Hi ${escapeHtml(account.firstName || 'there')}, your Dealo Job Agent has been searching while you were away.</p>
<ul>${applied ? `<li><strong>${applied}</strong> application${applied === 1 ? '' : 's'} sent with your CV</li>` : ''}${queued ? `<li><strong>${queued}</strong> strong match${queued === 1 ? '' : 'es'} ready for you</li>` : ''}</ul>
<p><a href="${link}">Open your Job Agent</a> to see every match, the reasons it fits and what to do next.</p>`,
      { siteUrl: this.appUrl, preheader: title, footerNote: 'You get this because your Job Agent is switched on. Turn it off any time from your dashboard.' },
    );
    await this.email
      .send({ to: account.email, subject: title, html, text: `${title}. ${body} ${link}` })
      .then(() => this.prisma.jobAgentProfile.update({ where: { id: profile.id }, data: { lastDigestAt: new Date() } }))
      .catch((error: unknown) => this.logger.warn(`Job Agent digest failed: ${String(error)}`));
  }
}
