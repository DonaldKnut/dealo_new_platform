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
  ASSIST_DISCLOSURE,
  JOB_AGENT_CREDIT_PACKS,
  JOB_AGENT_PLANS,
  applyVaultDraftsSchema,
  applyVaultEducationItemSchema,
  applyVaultIdentitySchema,
  applyVaultLinksSchema,
  applyVaultQaPairSchema,
  applyVaultSalarySchema,
  applyVaultUpdateSchema,
  applyVaultWorkAuthSchema,
  applyVaultWorkItemSchema,
  assistMapFieldsSchema,
  assistReportSchema,
  assistSitePolicyForUrl,
  isAssistedChannel,
  isAutoChannel,
  jobAgentBatchApproveSchema,
  jobAgentCreditPackCheckoutSchema,
  jobAgentSettingsSchema,
  renderEmailHtml,
  resumeDataSchema,
  type ApplyVaultDto,
  type AssistFieldMapping,
  type AssistSessionDto,
  type JobAgentChannel,
  type JobAgentMatchDto,
  type JobAgentMatchStatus,
  type JobAgentOverview,
  type JobAgentPlan,
  type JobAgentSettings,
  type JobAgentToggleInput,
  type ResumeData,
} from '@dealo/shared';
import { JobStatus, Prisma, type ApplyVault, type JobAgentMatch, type JobAgentProfile } from '@prisma/client';
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
import { PaymentRouterService } from '../payments/payment-router.service';
import { newReference, PAYMENT_PREFIX, PaystackClient, type PaystackTransaction } from '../payments/paystack.client';
import { PrismaService } from '../prisma/prisma.service';
import { findAtsAdapter } from './ats-adapters';
import { DeviceTokenService } from './device-token.service';
import {
  canSendDigestEmail,
  computeAssistConfidence,
  DIGEST_THROTTLE_MS,
  isMorningDigestWindow,
  isOvernightLagos,
  mergeVaultQaPairs,
  morningDigestBody,
  morningDigestTitle,
  questionKeyFromLabel,
  type VaultQaPair,
} from './job-agent-intelligence';
import {
  classifyChannel,
  cvText,
  findApplyEmail,
  isScam,
  scoreJob,
  suggestTitles,
  yearsOfExperience,
  type JobCandidate,
  type SeekerProfile,
} from './job-agent-matcher';

const TICK_MS = 10 * 60_000;
const LEASE_MS = 9 * 60_000;
const PROFILES_PER_TICK = 25;
const PARALLEL_RUNS = 3;
const MANUAL_COOLDOWN_MS = 10 * 60_000;
const DAY_MS = 86_400_000;
const AI_RERANK = 8;
/** Refresh vault drafts overnight if older than this. */
const VAULT_DRAFT_STALE_MS = 36 * 3_600_000;

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

type Planned = {
  candidate: JobCandidate;
  score: number;
  reasons: string[];
  gaps: string[];
  coverNote: string | null;
  channel: Exclude<JobAgentChannel, 'site'>;
  channelReason: string;
  applyEmail: string | null;
};

const vaultDraftsAiSchema = z.object({
  coverBlurb: z.string().max(2000).default(''),
  commonAnswers: z
    .array(
      z.object({
        questionKey: z.string().min(1).max(80),
        question: z.string().min(1).max(400),
        answer: z.string().max(4000),
      }),
    )
    .max(20)
    .default([]),
});

const fieldMapAiSchema = z.object({
  mappings: z
    .array(
      z.object({
        fieldId: z.string().min(1).max(80),
        vaultKey: z.string().min(1).max(80),
        value: z.string().max(4000).default(''),
        confidence: z.number().min(0).max(1).default(0.5),
      }),
    )
    .max(60)
    .default([]),
});

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
    private readonly deviceTokens: DeviceTokenService,
    private readonly paystack: PaystackClient,
    private readonly payments: PaymentRouterService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/$/, '');
  }

  onModuleInit() {
    this.payments.register(PAYMENT_PREFIX.applyCredits, 'job_agent_credits', (txn) => this.applyCreditPackPayment(txn));
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
    const [profile, plan, resumes, vault, account] = await Promise.all([
      this.prisma.jobAgentProfile.findUnique({ where: { userId: user.id }, omit: { cvData: true } }),
      this.planFor(user.id),
      this.prisma.resume.findMany({ where: { userId: user.id, kind: 'RESUME' }, orderBy: { updatedAt: 'desc' }, select: { id: true, data: true, updatedAt: true }, take: 20 }),
      this.prisma.applyVault.findUnique({ where: { userId: user.id }, select: { id: true, identity: true, preferredResumeId: true } }),
      this.prisma.user.findUnique({ where: { id: user.id }, select: { applyCreditBalance: true } }),
    ]);
    const limits = JOB_AGENT_PLANS[plan];
    const today = startOfLagosDay();
    const [appliedToday, appliedWeek, appliedTotal, suggested, ready, runs, overnightSent] = await Promise.all([
      this.appliedSince(user.id, today),
      this.appliedSince(user.id, new Date(Date.now() - 7 * DAY_MS)),
      this.prisma.jobAgentMatch.count({ where: { userId: user.id, status: 'APPLIED' } }),
      this.prisma.jobAgentMatch.count({ where: { userId: user.id, status: 'SUGGESTED' } }),
      this.prisma.jobAgentMatch.count({ where: { userId: user.id, status: 'READY' } }),
      this.prisma.jobAgentRun.findMany({ where: { userId: user.id }, orderBy: { startedAt: 'desc' }, take: 8 }),
      this.prisma.jobAgentMatch.count({
        where: {
          userId: user.id,
          status: 'APPLIED',
          appliedAt: { gte: today },
          channel: { in: ['easy_apply', 'email', 'ats_api'] },
        },
      }),
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
    const dailyAllowance = Math.min(profile?.dailyLimit ?? limits.dailyApplications, limits.dailyApplications);
    const creditsRemaining = Math.max(0, dailyAllowance - appliedToday);
    const creditBalance = Math.max(0, account?.applyCreditBalance ?? 0);
    const identity = vault?.identity ? applyVaultIdentitySchema.safeParse(vault.identity) : null;

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
      stats: {
        appliedToday,
        appliedWeek,
        appliedTotal,
        suggested,
        ready,
        dailyAllowance,
        creditsRemaining,
        creditBalance,
        totalCreditsAvailable: creditsRemaining + creditBalance,
      },
      creditPacks: JOB_AGENT_CREDIT_PACKS,
      paymentsEnabled: this.paystack.isConfigured,
      digest:
        overnightSent || ready
          ? { sent: overnightSent, ready, at: profile?.lastDigestAt?.toISOString() ?? null }
          : null,
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
      vaultReady: Boolean(identity?.success && identity.data.fullName.trim()),
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
    else if (status === 'auto') where.status = 'SUGGESTED';
    else if (status === 'assist') {
      where.status = 'READY';
      where.OR = [{ channel: 'site_assisted' }, { channel: 'site' }];
    } else if (status) where.status = status;
    const rows = await this.prisma.jobAgentMatch.findMany({ where, orderBy: [{ score: 'desc' }, { createdAt: 'desc' }], take: 120 });
    return rows.map((m) => this.toDto(m));
  }

  async approve(matchId: string, user: AuthUser) {
    const match = await this.ownedMatch(matchId, user);
    if (match.status !== 'SUGGESTED') throw new BadRequestException('This job is not waiting for approval');
    if (!isAutoChannel(match.channel)) throw new BadRequestException('This match needs Assist, not auto-send');
    const profile = await this.prisma.jobAgentProfile.findUnique({ where: { userId: user.id } });
    if (!profile?.cvData) throw new BadRequestException('Attach the CV your agent should send');
    const { walletSpend } = await this.assertCredits(user.id, profile, 'auto');
    const account = await this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true, firstName: true, lastName: true } });
    if (!account) throw new NotFoundException('Account not found');
    const ok = await this.send(match, profile, account);
    if (ok) await this.spendWalletCredits(user.id, walletSpend);
    return this.toDto(await this.prisma.jobAgentMatch.findUniqueOrThrow({ where: { id: match.id } }));
  }

  /** Batch-approve SUGGESTED auto-channel matches (easy_apply / email / ats_api). */
  async batchApprove(raw: unknown, user: AuthUser) {
    const parsed = jobAgentBatchApproveSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Pick at least one match');
    const profile = await this.prisma.jobAgentProfile.findUnique({ where: { userId: user.id } });
    if (!profile?.cvData) throw new BadRequestException('Attach the CV your agent should send');
    const account = await this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true, firstName: true, lastName: true } });
    if (!account) throw new NotFoundException('Account not found');

    const results: JobAgentMatchDto[] = [];
    let sent = 0;
    let failed = 0;
    for (const id of parsed.data.ids) {
      const match = await this.prisma.jobAgentMatch.findFirst({ where: { id, userId: user.id, status: 'SUGGESTED' } });
      if (!match || !isAutoChannel(match.channel)) continue;
      let walletSpend = 0;
      try {
        ({ walletSpend } = await this.assertCredits(user.id, profile, 'auto'));
      } catch {
        break;
      }
      const ok = await this.send(match, profile, account);
      if (ok) {
        await this.spendWalletCredits(user.id, walletSpend);
        sent += 1;
      } else failed += 1;
      results.push(this.toDto(await this.prisma.jobAgentMatch.findUniqueOrThrow({ where: { id: match.id } })));
    }
    return { sent, failed, matches: results };
  }

  async skip(matchId: string, user: AuthUser) {
    const match = await this.ownedMatch(matchId, user);
    if (match.status === 'APPLIED') throw new BadRequestException('Already applied');
    return this.toDto(await this.prisma.jobAgentMatch.update({ where: { id: match.id }, data: { status: 'SKIPPED' } }));
  }

  /** The person finished an outside / Assist application on the employer's site. */
  async markApplied(matchId: string, user: AuthUser) {
    const match = await this.ownedMatch(matchId, user);
    if (match.status === 'APPLIED') return this.toDto(match);
    let walletSpend = 0;
    if (isAssistedChannel(match.channel) || match.status === 'READY') {
      const profile = await this.prisma.jobAgentProfile.findUnique({ where: { userId: user.id }, omit: { cvData: true } });
      if (profile) ({ walletSpend } = await this.assertCredits(user.id, profile, 'assist'));
    }
    const updated = await this.prisma.jobAgentMatch.update({
      where: { id: match.id },
      data: { status: 'APPLIED', appliedAt: new Date(), error: null },
    });
    await this.spendWalletCredits(user.id, walletSpend);
    await this.logApplication(updated, user.id, null, 'Applied via Assist / employer site');
    return this.toDto(updated);
  }

  /**
   * Daily free allowance is spent first; prepaid applyCreditBalance covers overflow (pay-as-you-go).
   * Returns how many prepaid credits to debit after a successful apply.
   */
  private async assertCredits(userId: string, profile: Pick<JobAgentProfile, 'dailyLimit'>, kind: 'auto' | 'assist') {
    const plan = await this.planFor(userId);
    const limits = JOB_AGENT_PLANS[plan];
    const cost = kind === 'auto' ? limits.creditCostAuto : limits.creditCostAssist;
    const allowance = Math.min(profile.dailyLimit, limits.dailyApplications);
    const used = await this.appliedSince(userId, startOfLagosDay());
    const freeLeft = Math.max(0, allowance - used);
    if (freeLeft >= cost) return { walletSpend: 0 };

    const account = await this.prisma.user.findUnique({ where: { id: userId }, select: { applyCreditBalance: true } });
    const wallet = Math.max(0, account?.applyCreditBalance ?? 0);
    const fromWallet = cost - freeLeft;
    if (wallet < fromWallet) {
      throw new HttpException(
        `You have used today's ${allowance} free apply credits and have no prepaid balance left. Buy a credit pack or upgrade Premium for a higher daily allowance.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return { walletSpend: fromWallet };
  }

  private async spendWalletCredits(userId: string, amount: number) {
    if (amount <= 0) return;
    const claimed = await this.prisma.user.updateMany({
      where: { id: userId, applyCreditBalance: { gte: amount } },
      data: { applyCreditBalance: { decrement: amount } },
    });
    if (!claimed.count) {
      throw new HttpException('Prepaid apply credits ran out. Buy another pack to continue.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async ownedMatch(id: string, user: AuthUser) {
    if (!/^[a-f0-9]{24}$/.test(id)) throw new NotFoundException('Match not found');
    const match = await this.prisma.jobAgentMatch.findFirst({ where: { id, userId: user.id } });
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }

  private toDto(m: JobAgentMatch): JobAgentMatchDto {
    const channel = (m.channel === 'site' ? 'site_assisted' : m.channel) as JobAgentChannel;
    return {
      id: m.id,
      listingId: m.listingId,
      kind: m.kind as JobAgentMatchDto['kind'],
      channel,
      channelReason: m.channelReason ?? null,
      title: m.title,
      company: m.company,
      location: m.location,
      url: m.url,
      score: m.score,
      reasons: m.reasons,
      gaps: m.gaps,
      coverNote: m.coverNote ?? null,
      assistConfidence: typeof m.assistConfidence === 'number' ? m.assistConfidence : null,
      assistCoveragePct: typeof m.assistCoveragePct === 'number' ? m.assistCoveragePct : null,
      assistPauses: m.assistPauses ?? [],
      assistLastOutcome: m.assistLastOutcome ?? null,
      status: m.status as JobAgentMatchStatus,
      error: m.error ?? null,
      createdAt: m.createdAt.toISOString(),
      appliedAt: m.appliedAt?.toISOString() ?? null,
    };
  }

  // ------------------------------------------------------------------- vault
  // Apply vault stores seeker identity/history for offline apply. It never opens jobs;
  // Dealo listing trust is enforced only on JobStatus.OPEN in JobsService.

  async getVault(user: AuthUser): Promise<ApplyVaultDto> {
    const vault = await this.prisma.applyVault.findUnique({ where: { userId: user.id } });
    if (!vault) {
      const seeded = await this.seedVaultFromResume(user);
      return this.vaultToDto(seeded);
    }
    return this.vaultToDto(vault);
  }

  async updateVault(raw: unknown, user: AuthUser): Promise<ApplyVaultDto> {
    // Safety: vault v1 never stores third-party passwords / payment secrets.
    if (raw && typeof raw === 'object') {
      const blob = JSON.stringify(raw).toLowerCase();
      if (/"password"|"passwd"|"creditcard"|"cardnumber"|"cvv"|"ssn"/.test(blob)) {
        throw new BadRequestException('Apply vault does not store passwords or payment details. Sign in on employer sites yourself.');
      }
    }
    const parsed = applyVaultUpdateSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Check your vault');
    const input = parsed.data;
    if (input.preferredResumeId) {
      const owned = await this.prisma.resume.count({ where: { id: input.preferredResumeId, userId: user.id, kind: 'RESUME' } });
      if (!owned) throw new NotFoundException('CV not found');
    }
    const data: Prisma.ApplyVaultUpdateInput = {};
    if (input.identity !== undefined) data.identity = input.identity;
    if (input.workHistory !== undefined) data.workHistory = input.workHistory;
    if (input.education !== undefined) data.education = input.education;
    if (input.links !== undefined) data.links = input.links;
    if (input.workAuth !== undefined) data.workAuth = input.workAuth;
    if (input.salaryExpectation !== undefined) data.salaryExpectation = input.salaryExpectation;
    // Explicit vault editor upsert replaces qaPairs; Assist learning merges via learnVaultQa.
    if (input.qaPairs !== undefined) data.qaPairs = input.qaPairs;
    if (input.preferredResumeId !== undefined) data.preferredResumeId = input.preferredResumeId;

    const vault = await this.prisma.applyVault.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        identity: input.identity ?? {},
        workHistory: input.workHistory ?? [],
        education: input.education ?? [],
        links: input.links ?? {},
        workAuth: input.workAuth ?? {},
        salaryExpectation: input.salaryExpectation ?? {},
        qaPairs: input.qaPairs ?? [],
        preferredResumeId: input.preferredResumeId ?? null,
      },
      update: data,
    });

    // Keep Job Agent preferred CV in sync when the vault names one.
    if (input.preferredResumeId) {
      await this.prisma.jobAgentProfile.updateMany({ where: { userId: user.id }, data: { resumeId: input.preferredResumeId } });
    }
    return this.vaultToDto(vault);
  }

  /** Persist edited/confirmed Q&A into ApplyVault (Assist learning). */
  private async learnVaultQa(userId: string, incoming: VaultQaPair[]) {
    if (!incoming.length) return;
    const vault = await this.prisma.applyVault.findUnique({ where: { userId } });
    const existing = applyVaultQaPairSchema.array().safeParse(vault?.qaPairs ?? []);
    const merged = mergeVaultQaPairs(existing.success ? existing.data : [], incoming);
    if (!vault) {
      await this.prisma.applyVault.create({ data: { userId, qaPairs: merged } });
      return;
    }
    await this.prisma.applyVault.update({ where: { userId }, data: { qaPairs: merged } });
  }

  /** AI drafts from preferred resume + saved Q&A for reuse on Assist / cover notes. */
  async regenerateVaultDrafts(user: AuthUser): Promise<ApplyVaultDto> {
    const vault = await this.ensureVault(user);
    const resumeId = vault.preferredResumeId ?? (await this.prisma.jobAgentProfile.findUnique({ where: { userId: user.id }, select: { resumeId: true } }))?.resumeId;
    const resume = resumeId ? await this.prisma.resume.findFirst({ where: { id: resumeId, userId: user.id, kind: 'RESUME' } }) : null;
    const parsed = resume ? resumeDataSchema.safeParse(resume.data) : null;
    if (!parsed?.success) throw new BadRequestException('Choose a preferred CV so drafts can be generated from it');

    const qa = applyVaultQaPairSchema.array().safeParse(vault.qaPairs ?? []);
    const pastAnswers = qa.success ? qa.data.filter((q) => q.answer.trim()).slice(0, 20) : [];
    const data = parsed.data;
    const cvBlock = [
      `Name: ${data.personal.fullName}`,
      `Headline: ${data.personal.headline}`,
      `Summary: ${data.summary.slice(0, 900)}`,
      `Skills: ${data.skills.slice(0, 30).join(', ')}`,
      `Experience: ${data.experience
        .slice(0, 5)
        .map((e) => `${e.role} at ${e.company}: ${e.bullets.slice(0, 2).join(' ')}`)
        .join(' | ')}`,
      `Education: ${data.education.map((e) => `${e.qualification} ${e.field}, ${e.school}`).join('; ')}`,
      pastAnswers.length ? `Saved answers:\n${pastAnswers.map((q) => `- ${q.question}: ${q.answer}`).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    let drafts = {
      coverBlurb: data.summary.slice(0, 600) || `I am ${data.personal.fullName || 'a candidate'} interested in roles that match my background.`,
      commonAnswers: [
        {
          questionKey: 'why_company',
          question: 'Why do you want to work here?',
          answer: pastAnswers.find((q) => q.questionKey === 'why_company')?.answer || `I am drawn to teams where I can apply my experience as ${data.personal.headline || 'a professional'} and grow with the company.`,
        },
        {
          questionKey: 'years_experience',
          question: 'How many years of relevant experience do you have?',
          answer: String(yearsOfExperience(data) ?? ''),
        },
        {
          questionKey: 'notice_period',
          question: 'What is your notice period?',
          answer: pastAnswers.find((q) => q.questionKey === 'notice_period')?.answer || 'I can discuss a start date that works for both of us.',
        },
      ],
    };

    if (this.gemini.isConfigured) {
      try {
        const judged = await this.gemini.json(
          `You prepare reusable application answers for one job seeker.
coverBlurb: 70-120 words, first person, warm, no greeting/sign-off, only facts from the CV.
commonAnswers: 5-8 frequent application questions with short honest answers grounded in the CV and any saved answers.
questionKey: snake_case. Reply as JSON.`,
          cvBlock,
          vaultDraftsAiSchema,
        );
        const coverBlurb = String(judged.coverBlurb ?? '').trim() || drafts.coverBlurb;
        const commonAnswers =
          Array.isArray(judged.commonAnswers) && judged.commonAnswers.length > 0
            ? judged.commonAnswers
            : drafts.commonAnswers;
        drafts = { coverBlurb, commonAnswers };
      } catch (error) {
        this.logger.debug(`Vault draft AI skipped: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const updated = await this.prisma.applyVault.update({
      where: { userId: user.id },
      data: { drafts, draftsUpdatedAt: new Date() },
    });
    return this.vaultToDto(updated);
  }

  async listPendingAssisted(user: AuthUser) {
    return this.listMatches(user, 'assist');
  }

  /**
   * Short-lived opaque device token for the Supervised Apply browser extension.
   * Extension sends `Authorization: Bearer dja_…` (wired in ApiKeyOrJwtGuard).
   */
  async createDeviceToken(user: AuthUser) {
    await assertEmailVerified(this.prisma, user);
    return this.deviceTokens.create(user.id);
  }

  /** Resolve a device token to a user id, or null. */
  resolveDeviceToken(token: string): string | null {
    return this.deviceTokens.resolveUserId(token);
  }

  /** Pack for the extension / dashboard Continue apply flow. */
  async getAssistSession(matchId: string, user: AuthUser): Promise<AssistSessionDto> {
    const match = await this.ownedMatch(matchId, user);
    if (!isAssistedChannel(match.channel) && match.status !== 'READY') {
      throw new BadRequestException('This match is not an assisted apply');
    }
    const [vault, profile, plan, account] = await Promise.all([
      this.getVault(user),
      this.prisma.jobAgentProfile.findUnique({ where: { userId: user.id }, omit: { cvData: true } }),
      this.planFor(user.id),
      this.prisma.user.findUnique({ where: { id: user.id }, select: { applyCreditBalance: true } }),
    ]);
    const limits = JOB_AGENT_PLANS[plan];
    const allowance = Math.min(profile?.dailyLimit ?? limits.dailyApplications, limits.dailyApplications);
    const used = await this.appliedSince(user.id, startOfLagosDay());
    const freeLeft = Math.max(0, allowance - used);
    const wallet = Math.max(0, account?.applyCreditBalance ?? 0);
    const resumeId = vault.preferredResumeId ?? profile?.resumeId ?? null;
    const resume = resumeId
      ? await this.prisma.resume.findFirst({ where: { id: resumeId, userId: user.id, kind: 'RESUME' }, select: { id: true, title: true } })
      : null;
    const cvFile = profile?.cvFileName ?? null;

    return {
      match: this.toDto(match),
      vault,
      coverNote: match.coverNote ?? (vault.drafts.coverBlurb || null),
      cv: {
        resumeId: resume?.id ?? null,
        fileName: resume?.title ? `${resume.title}.pdf` : cvFile,
        hint: 'Attach your preferred CV when the site shows a file picker. Dealo never uploads files without your click.',
      },
      sitePolicy: assistSitePolicyForUrl(match.url),
      disclosure: ASSIST_DISCLOSURE,
      fillHints: this.buildFillHints(vault, match.coverNote),
      creditsRemaining: freeLeft + wallet,
    };
  }

  /**
   * LLM assist for ambiguous form fields. Rules-based mapping stays in the extension;
   * this only runs for fields the client marks as unclear.
   */
  async mapAssistFields(matchId: string, raw: unknown, user: AuthUser): Promise<{ mappings: AssistFieldMapping[] }> {
    const match = await this.ownedMatch(matchId, user);
    const parsed = assistMapFieldsSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Check field descriptors');
    if (parsed.data.learnAnswers?.length) {
      await this.learnVaultQa(user.id, parsed.data.learnAnswers);
    }
    const vault = await this.getVault(user);
    const hints = this.buildFillHints(vault, match.coverNote);

    if (!this.gemini.isConfigured) {
      return { mappings: this.ruleMapFields(parsed.data.fields, hints) };
    }

    try {
      const judged = await this.gemini.json(
        `You map job-application form fields to values from a seeker's vault.
Only use values present in fillHints / vault summary. Never invent passwords or payment details.
vaultKey should be a short snake_case key. confidence 0-1. Skip fields you cannot map. Reply as JSON.`,
        JSON.stringify({
          job: { title: match.title, company: match.company },
          fillHints: hints,
          fields: parsed.data.fields,
        }).slice(0, 12_000),
        fieldMapAiSchema,
      );
      return {
        mappings: (judged.mappings ?? []).map((m) => ({
          fieldId: m.fieldId,
          vaultKey: m.vaultKey,
          value: m.value ?? '',
          confidence: m.confidence ?? 0.5,
        })),
      };
    } catch (error) {
      this.logger.debug(`Assist field map AI skipped: ${error instanceof Error ? error.message : String(error)}`);
      return { mappings: this.ruleMapFields(parsed.data.fields, hints) };
    }
  }

  /** Extension reports fill outcome; optionally marks applied (spends assist credit). */
  async reportAssist(matchId: string, raw: unknown, user: AuthUser) {
    const match = await this.ownedMatch(matchId, user);
    const parsed = assistReportSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Check assist report');
    const report = parsed.data;
    const coveragePct = report.fieldsTotal > 0 ? Math.round((report.fieldsFilled / report.fieldsTotal) * 100) : null;

    if (report.editedAnswers?.length) {
      await this.learnVaultQa(user.id, report.editedAnswers);
    }

    const persisted = await this.prisma.jobAgentMatch.update({
      where: { id: match.id },
      data: {
        assistCoveragePct: coveragePct ?? undefined,
        assistPauses: report.pauses ?? [],
        assistLastOutcome: report.outcome,
        ...(typeof coveragePct === 'number'
          ? {
              assistConfidence: computeAssistConfidence({
                score: match.score,
                hasCoverNote: Boolean(match.coverNote),
                vaultIdentityReady: true,
                draftAnswerCount: 0,
                qaPairCount: report.editedAnswers?.length ?? 0,
                lastCoveragePct: coveragePct,
              }),
            }
          : {}),
      },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'JOB_AGENT_ASSIST_REPORT',
      entityType: 'JobAgentMatch',
      entityId: match.id,
      metadata: {
        outcome: report.outcome,
        host: report.host ?? null,
        fieldsTotal: report.fieldsTotal,
        fieldsFilled: report.fieldsFilled,
        fieldsAmbiguous: report.fieldsAmbiguous,
        fieldsSkipped: report.fieldsSkipped,
        pauses: report.pauses,
        learnedAnswers: report.editedAnswers?.length ?? 0,
        coverage: coveragePct,
        notes: report.notes ?? null,
      },
    });

    if (report.markApplied || report.outcome === 'submitted_by_user') {
      const applied = await this.markApplied(matchId, user);
      return { ...applied, coveragePct, learned: report.editedAnswers?.length ?? 0 };
    }
    return {
      match: this.toDto(persisted),
      reported: true,
      learned: report.editedAnswers?.length ?? 0,
      coveragePct,
    };
  }

  private buildFillHints(vault: ApplyVaultDto, coverNote: string | null): Record<string, string> {
    const hints: Record<string, string> = {};
    const put = (key: string, value: string | number | null | undefined) => {
      const text = value == null ? '' : String(value).trim();
      if (text) hints[key] = text;
    };
    put('full_name', vault.identity.fullName);
    put('first_name', vault.identity.fullName.split(/\s+/)[0]);
    put('last_name', vault.identity.fullName.split(/\s+/).slice(1).join(' '));
    put('email', vault.identity.email);
    put('phone', vault.identity.phone);
    put('location', vault.identity.location);
    put('city', vault.identity.location.split(',')[0]?.trim());
    put('linkedin', vault.links.linkedin);
    put('website', vault.links.website);
    put('portfolio', vault.links.portfolio);
    put('github', vault.links.github);
    put('salary_min', vault.salaryExpectation.min);
    put('salary_max', vault.salaryExpectation.max);
    put('salary_currency', vault.salaryExpectation.currency);
    put('needs_sponsorship', vault.workAuth.needsSponsorship ? 'Yes' : 'No');
    put('work_auth_notes', vault.workAuth.notes);
    put('cover_letter', coverNote || vault.drafts.coverBlurb);
    put('cover_blurb', vault.drafts.coverBlurb);
    for (const qa of vault.qaPairs) {
      if (qa.answer.trim()) put(`qa_${qa.questionKey}`, qa.answer);
    }
    for (const draft of vault.drafts.commonAnswers) {
      if (draft.answer.trim()) put(`draft_${draft.questionKey}`, draft.answer);
    }
    const latest = vault.workHistory[0];
    if (latest) {
      put('current_title', latest.role);
      put('current_company', latest.company);
    }
    const edu = vault.education[0];
    if (edu) {
      put('school', edu.school);
      put('degree', edu.qualification);
      put('field_of_study', edu.field);
    }
    return hints;
  }

  private ruleMapFields(
    fields: { id: string; name: string; label: string; autocomplete: string; type: string; ariaLabel: string; placeholder: string }[],
    hints: Record<string, string>,
  ): AssistFieldMapping[] {
    const rules: { re: RegExp; key: string }[] = [
      { re: /email|e-mail/i, key: 'email' },
      { re: /phone|mobile|tel/i, key: 'phone' },
      { re: /first.?name|given.?name/i, key: 'first_name' },
      { re: /last.?name|family.?name|surname/i, key: 'last_name' },
      { re: /full.?name|^name$/i, key: 'full_name' },
      { re: /linkedin/i, key: 'linkedin' },
      { re: /github/i, key: 'github' },
      { re: /portfolio|personal.?site|website|url/i, key: 'website' },
      { re: /cover|letter|message|motivation/i, key: 'cover_letter' },
      { re: /city|location|address/i, key: 'location' },
      { re: /salary|compensation|expect/i, key: 'salary_min' },
      { re: /sponsor|visa|work.?auth/i, key: 'needs_sponsorship' },
      { re: /school|university|college/i, key: 'school' },
      { re: /degree|qualification/i, key: 'degree' },
      { re: /company|employer/i, key: 'current_company' },
      { re: /title|role|position/i, key: 'current_title' },
    ];
    const qaHints = Object.entries(hints).filter(([key]) => key.startsWith('qa_') || key.startsWith('draft_'));
    const out: AssistFieldMapping[] = [];
    for (const field of fields) {
      const blob = `${field.name} ${field.label} ${field.autocomplete} ${field.ariaLabel} ${field.placeholder}`;
      if (/password|passwd|credit.?card|card.?number|cvv|ssn|social.?security|routing|iban/i.test(blob)) continue;
      if (field.type === 'password') continue;
      const hit = rules.find((r) => r.re.test(blob) || r.re.test(field.autocomplete));
      if (hit && hints[hit.key]) {
        out.push({ fieldId: field.id, vaultKey: hit.key, value: hints[hit.key], confidence: 0.85 });
        continue;
      }
      // Match custom Q&A / draft answers by label similarity (shared with extension field-map).
      const labelKey = questionKeyFromLabel(field.label || field.name || field.ariaLabel, '');
      if (!labelKey || labelKey.length < 4) continue;
      const qaHit = qaHints.find(([key]) => {
        const bare = key.replace(/^(qa_|draft_)/, '');
        return bare === labelKey || bare.includes(labelKey) || labelKey.includes(bare);
      });
      if (qaHit) {
        out.push({ fieldId: field.id, vaultKey: qaHit[0], value: qaHit[1], confidence: 0.72 });
      }
    }
    return out;
  }

  /** Pay-as-you-go credit pack checkout (Paystack). */
  async checkoutCreditPack(raw: unknown, user: AuthUser) {
    if (!this.paystack.isConfigured) {
      throw new BadRequestException('Online payments are not switched on yet. Add Paystack keys and try again.');
    }
    const parsed = jobAgentCreditPackCheckoutSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Choose a credit pack');
    const pack = JOB_AGENT_CREDIT_PACKS.find((p) => p.id === parsed.data.packId);
    if (!pack) throw new BadRequestException('Unknown credit pack');
    const account = await this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
    if (!account) throw new ForbiddenException('Account not found');

    const reference = newReference(PAYMENT_PREFIX.applyCredits);
    const invoice = await this.prisma.applyCreditInvoice.create({
      data: {
        reference,
        userId: user.id,
        packId: pack.id,
        credits: pack.credits,
        amountMinor: pack.priceMinor,
        currency: 'NGN',
      },
    });
    try {
      const session = await this.paystack.initialize({
        email: account.email,
        amountMinor: pack.priceMinor,
        currency: 'NGN',
        reference,
        callbackUrl: `${this.appUrl}/dashboard/job-agent?credits=${reference}`,
        metadata: {
          product: 'job_agent_credits',
          packId: pack.id,
          credits: pack.credits,
          userId: user.id,
          invoiceId: invoice.id,
        },
      });
      await this.prisma.applyCreditInvoice.update({
        where: { id: invoice.id },
        data: { authorizationUrl: session.authorization_url },
      });
      return { reference, authorizationUrl: session.authorization_url, pack };
    } catch (error) {
      await this.prisma.applyCreditInvoice.update({
        where: { id: invoice.id },
        data: { status: 'CANCELLED', failureReason: 'Checkout could not be started' },
      });
      throw error;
    }
  }

  async verifyCreditPack(user: AuthUser, reference: string) {
    const invoice = await this.prisma.applyCreditInvoice.findUnique({ where: { reference } });
    if (!invoice || invoice.userId !== user.id) throw new NotFoundException('Payment not found');
    if (invoice.status === 'PENDING') await this.applyCreditPackPayment(await this.paystack.verify(reference));
    const [fresh, account] = await Promise.all([
      this.prisma.applyCreditInvoice.findUnique({ where: { id: invoice.id }, select: { status: true, failureReason: true, credits: true } }),
      this.prisma.user.findUnique({ where: { id: user.id }, select: { applyCreditBalance: true } }),
    ]);
    return {
      status: fresh?.status ?? 'PENDING',
      failureReason: fresh?.failureReason ?? null,
      credits: fresh?.credits ?? invoice.credits,
      creditBalance: account?.applyCreditBalance ?? 0,
    };
  }

  private async applyCreditPackPayment(txn: PaystackTransaction) {
    if (!txn.reference.startsWith(PAYMENT_PREFIX.applyCredits)) return;
    const invoice = await this.prisma.applyCreditInvoice.findUnique({ where: { reference: txn.reference } });
    if (!invoice || invoice.status !== 'PENDING') return;
    if (txn.status !== 'success') {
      if (txn.status === 'failed' || txn.status === 'abandoned') {
        await this.prisma.applyCreditInvoice.updateMany({
          where: { id: invoice.id, status: 'PENDING' },
          data: { status: 'FAILED', failureReason: txn.gateway_response ?? txn.status },
        });
      }
      return;
    }
    if (txn.amount !== invoice.amountMinor || txn.currency.toUpperCase() !== invoice.currency.toUpperCase()) {
      await this.prisma.applyCreditInvoice.updateMany({
        where: { id: invoice.id, status: 'PENDING' },
        data: { status: 'FAILED', failureReason: `Amount mismatch: paid ${txn.amount} ${txn.currency}` },
      });
      return;
    }
    const claimed = await this.prisma.applyCreditInvoice.updateMany({
      where: { id: invoice.id, status: 'PENDING' },
      data: {
        status: 'PAID',
        paidAt: txn.paid_at ? new Date(txn.paid_at) : new Date(),
        providerTxnId: String(txn.id),
      },
    });
    if (!claimed.count) return;
    await this.prisma.user.update({
      where: { id: invoice.userId },
      data: { applyCreditBalance: { increment: invoice.credits } },
    });
    await this.audit.record({
      action: 'JOB_AGENT_CREDITS_PAID',
      entityType: 'User',
      entityId: invoice.userId,
      actorId: invoice.userId,
      metadata: { reference: invoice.reference, credits: invoice.credits, packId: invoice.packId, amountMinor: invoice.amountMinor },
    });
  }

  /**
   * Rank ExternalJob URL hosts by frequency so we expand ATS adapters where they matter most.
   * Excludes hosts that already have an offline adapter.
   */
  async externalJobHostFrequency(limit = 25) {
    const rows = await this.prisma.externalJob.findMany({
      where: { publishedAt: { gte: new Date(Date.now() - 30 * DAY_MS) } },
      select: { url: true },
      take: 8_000,
    });
    const counts = new Map<string, number>();
    for (const row of rows) {
      try {
        const host = new URL(row.url).hostname.replace(/^www\./i, '').toLowerCase();
        if (!host) continue;
        counts.set(host, (counts.get(host) ?? 0) + 1);
      } catch {
        /* skip bad urls */
      }
    }
    const adapterHost = (host: string) =>
      /(^|\.)(greenhouse|lever|workable|ashbyhq)\.(io|co|com)$/i.test(host) ||
      Boolean(findAtsAdapter(`https://${host}/j/ABCDEF12`)) ||
      Boolean(findAtsAdapter(`https://${host}/acme/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`)) ||
      Boolean(findAtsAdapter(`https://${host}/jobs/1234567`));
    return [...counts.entries()]
      .map(([host, count]) => ({
        host,
        count,
        hasAdapter: adapterHost(host),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, Math.min(100, Math.max(5, limit)));
  }

  private async ensureVault(user: AuthUser) {
    const existing = await this.prisma.applyVault.findUnique({ where: { userId: user.id } });
    if (existing) return existing;
    return this.seedVaultFromResume(user);
  }

  private async seedVaultFromResume(user: AuthUser): Promise<ApplyVault> {
    const profile = await this.prisma.jobAgentProfile.findUnique({ where: { userId: user.id }, select: { resumeId: true, phone: true } });
    const resume =
      (profile?.resumeId
        ? await this.prisma.resume.findFirst({ where: { id: profile.resumeId, userId: user.id, kind: 'RESUME' } })
        : null) ??
      (await this.prisma.resume.findFirst({ where: { userId: user.id, kind: 'RESUME' }, orderBy: { updatedAt: 'desc' } }));
    const account = await this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true, firstName: true, lastName: true } });
    const parsed = resume ? resumeDataSchema.safeParse(resume.data) : null;
    const data = parsed?.success ? parsed.data : null;

    return this.prisma.applyVault.create({
      data: {
        userId: user.id,
        preferredResumeId: resume?.id ?? null,
        identity: {
          fullName: data?.personal.fullName || `${account?.firstName ?? ''} ${account?.lastName ?? ''}`.trim(),
          email: data?.personal.email || account?.email || '',
          phone: data?.personal.phone || profile?.phone || '',
          location: data?.personal.location || '',
        },
        workHistory: (data?.experience ?? []).map((e) => ({
          id: e.id,
          role: e.role,
          company: e.company,
          location: e.location,
          start: e.start,
          end: e.end,
          current: e.current,
          bullets: e.bullets,
        })),
        education: (data?.education ?? []).map((e) => ({
          id: e.id,
          school: e.school,
          qualification: e.qualification,
          field: e.field,
          start: e.start,
          end: e.end,
        })),
        links: {
          linkedin: data?.personal.linkedin || '',
          website: data?.personal.website || '',
          portfolio: '',
          github: '',
        },
        workAuth: { authorizedCountries: ['Nigeria'], needsSponsorship: false, notes: '' },
        salaryExpectation: { min: null, max: null, currency: 'NGN', period: 'YEAR' },
        qaPairs: [],
        drafts: {},
      },
    });
  }

  private vaultToDto(vault: ApplyVault): ApplyVaultDto {
    const identity = applyVaultIdentitySchema.safeParse(vault.identity ?? {});
    const workHistory = applyVaultWorkItemSchema.array().safeParse(vault.workHistory ?? []);
    const education = applyVaultEducationItemSchema.array().safeParse(vault.education ?? []);
    const links = applyVaultLinksSchema.safeParse(vault.links ?? {});
    const workAuth = applyVaultWorkAuthSchema.safeParse(vault.workAuth ?? {});
    const salary = applyVaultSalarySchema.safeParse(vault.salaryExpectation ?? {});
    const qaPairs = applyVaultQaPairSchema.array().safeParse(vault.qaPairs ?? []);
    const drafts = applyVaultDraftsSchema.safeParse(vault.drafts ?? {});
    return {
      identity: identity.success ? identity.data : applyVaultIdentitySchema.parse({}),
      workHistory: workHistory.success ? workHistory.data : [],
      education: education.success ? education.data : [],
      links: links.success ? links.data : applyVaultLinksSchema.parse({}),
      workAuth: workAuth.success ? workAuth.data : applyVaultWorkAuthSchema.parse({}),
      salaryExpectation: salary.success ? salary.data : applyVaultSalarySchema.parse({}),
      qaPairs: qaPairs.success ? qaPairs.data : [],
      preferredResumeId: vault.preferredResumeId ?? null,
      drafts: drafts.success ? drafts.data : applyVaultDraftsSchema.parse({}),
      draftsUpdatedAt: vault.draftsUpdatedAt?.toISOString() ?? null,
      updatedAt: vault.updatedAt?.toISOString() ?? null,
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
      const overnight = isOvernightLagos();
      const trigger = freshDealoJobs ? 'new_job' : overnight ? 'overnight' : 'schedule';
      const worker = async () => {
        for (let next = queue.shift(); next; next = queue.shift()) {
          if (!(await this.claim(next.id))) continue;
          await this.runProfile(next.id, trigger).catch((error: unknown) =>
            this.logger.warn(`Job Agent run ${next!.id} failed: ${error instanceof Error ? error.message : String(error)}`),
          );
        }
      };
      await Promise.all(Array.from({ length: PARALLEL_RUNS }, worker));

      // Morning window: email digests deferred overnight (same lastDigestAt throttle).
      if (isMorningDigestWindow()) {
        await this.morningDigestSweep().catch((error: unknown) =>
          this.logger.warn(`Job Agent morning digest sweep failed: ${error instanceof Error ? error.message : String(error)}`),
        );
      }
    } finally {
      this.ticking = false;
    }
  }

  /**
   * Delivers “N sent, M ready for 60-second assists” for profiles that ran overnight
   * and have not received a digest within the throttle window.
   */
  private async morningDigestSweep() {
    const since = new Date(Date.now() - DIGEST_THROTTLE_MS);
    const profiles = await this.prisma.jobAgentProfile.findMany({
      where: {
        enabled: true,
        OR: [{ lastDigestAt: null }, { lastDigestAt: { isSet: false } }, { lastDigestAt: { lt: since } }],
        lastRunAt: { gte: since },
      },
      take: 40,
      select: { id: true, userId: true, lastDigestAt: true },
    });
    for (const profile of profiles) {
      const account = await this.prisma.user.findUnique({
        where: { id: profile.userId },
        select: { email: true, firstName: true, isActive: true },
      });
      if (!account?.isActive) continue;
      const windowStart = profile.lastDigestAt ?? new Date(Date.now() - DAY_MS);
      const [sent, ready] = await Promise.all([
        this.prisma.jobAgentMatch.count({
          where: {
            userId: profile.userId,
            status: 'APPLIED',
            appliedAt: { gte: windowStart },
            channel: { in: ['easy_apply', 'email', 'ats_api'] },
          },
        }),
        this.prisma.jobAgentMatch.count({
          where: { userId: profile.userId, status: 'READY', OR: [{ channel: 'site_assisted' }, { channel: 'site' }] },
        }),
      ]);
      if (!sent && !ready) continue;
      const full = await this.prisma.jobAgentProfile.findUnique({ where: { id: profile.id } });
      if (!full || !canSendDigestEmail(full.lastDigestAt)) continue;
      await this.sendMorningDigest(full, account, { sent, ready });
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
        .map<Planned>(({ candidate, result }) => ({
          candidate,
          ...result,
          coverNote: null,
          channel: candidate.kind === 'dealo' ? 'easy_apply' : 'site_assisted',
          channelReason: candidate.kind === 'dealo' ? 'Dealo Easy Apply listing' : 'Pending enrichment',
          applyEmail: null,
        }));

      planned = await this.enrich(planned, data.data, profile, limits.aiMatching, limits.coverNotes && profile.coverNotes);
      planned = planned.filter((p) => p.score >= profile.minScore).sort((a, b) => b.score - a.score);

      const emailApplyAllowed = Boolean(limits.emailApply && profile.emailApply);
      for (const p of planned) {
        const decision = classifyChannel({
          kind: p.candidate.kind,
          url: p.candidate.url,
          applyEmail: p.applyEmail,
          emailApplyAllowed,
        });
        p.channel = decision.channel;
        p.channelReason = decision.reason;
        p.applyEmail = decision.applyEmail;
      }

      // Overnight / scheduled: refresh vault drafts so Assist packs have answers ready.
      const vaultPrep = await this.ensureVaultDraftsForRun(profile.userId, trigger === 'overnight' || isOvernightLagos());

      const created: JobAgentMatch[] = [];
      for (const p of planned) {
        try {
          const assisted = p.channel === 'site_assisted';
          let coverNote = p.coverNote;
          if (assisted && !coverNote && vaultPrep.coverBlurb) coverNote = vaultPrep.coverBlurb;
          const assistConfidence = assisted
            ? computeAssistConfidence({
                score: p.score,
                hasCoverNote: Boolean(coverNote),
                vaultIdentityReady: vaultPrep.identityReady,
                draftAnswerCount: vaultPrep.draftAnswerCount,
                qaPairCount: vaultPrep.qaPairCount,
              })
            : null;
          created.push(
            await this.prisma.jobAgentMatch.create({
              data: {
                userId: profile.userId,
                listingId: p.candidate.listingId,
                kind: p.candidate.kind,
                channel: p.channel,
                channelReason: p.channelReason.slice(0, 240),
                title: p.candidate.title.slice(0, 200),
                company: p.candidate.company.slice(0, 160),
                location: p.candidate.location.slice(0, 160),
                url: p.candidate.url,
                applyEmail: p.channel === 'email' ? p.applyEmail : null,
                score: p.score,
                reasons: p.reasons,
                gaps: p.gaps,
                coverNote,
                assistConfidence: assistConfidence ?? undefined,
                status: assisted ? 'READY' : 'SUGGESTED',
              },
            }),
          );
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
        }
      }

      let applied = 0;
      // AUTO (and overnight AUTO): send easy_apply / email / ats_api using free daily + prepaid credits.
      if (profile.mode === 'AUTO' && profile.cvData) {
        for (const match of created.filter((m) => m.status === 'SUGGESTED' && isAutoChannel(m.channel)).sort((a, b) => b.score - a.score)) {
          let walletSpend = 0;
          try {
            ({ walletSpend } = await this.assertCredits(profile.userId, profile, 'auto'));
          } catch {
            break;
          }
          if (await this.send(match, profile, account)) {
            await this.spendWalletCredits(profile.userId, walletSpend);
            applied += 1;
          }
        }
      }

      const readyAssists = created.filter((m) => m.status === 'READY' || isAssistedChannel(m.channel)).length;
      const queued = created.length - applied;
      if (created.length) await this.tellPerson(profile, account, { sent: applied, ready: readyAssists, queued });
      return finish({ scanned, matched: created.length, applied, queued });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 300) : 'Unknown error';
      this.logger.warn(`Job Agent run for ${profile.userId} failed: ${message}`);
      return finish({ error: 'The agent hit a problem and will try again later' });
    }
  }

  /**
   * Ensures Apply vault drafts exist for overnight assist packing.
   * Regenerates when missing or stale (no Gemini required — falls back to CV summary).
   */
  private async ensureVaultDraftsForRun(userId: string, preferRefresh: boolean) {
    const empty = { coverBlurb: '', draftAnswerCount: 0, qaPairCount: 0, identityReady: false };
    try {
      const vault = await this.prisma.applyVault.findUnique({ where: { userId } });
      if (!vault) {
        const seeded = await this.seedVaultFromResume({ id: userId } as AuthUser);
        const dto = this.vaultToDto(seeded);
        return {
          coverBlurb: dto.drafts.coverBlurb,
          draftAnswerCount: dto.drafts.commonAnswers.length,
          qaPairCount: dto.qaPairs.length,
          identityReady: Boolean(dto.identity.fullName.trim()),
        };
      }
      const dto = this.vaultToDto(vault);
      const stale = !vault.draftsUpdatedAt || Date.now() - vault.draftsUpdatedAt.getTime() > VAULT_DRAFT_STALE_MS;
      const needsDrafts = !dto.drafts.coverBlurb && dto.drafts.commonAnswers.length === 0;
      if (preferRefresh && (stale || needsDrafts)) {
        try {
          const refreshed = await this.regenerateVaultDrafts({ id: userId } as AuthUser);
          return {
            coverBlurb: refreshed.drafts.coverBlurb,
            draftAnswerCount: refreshed.drafts.commonAnswers.length,
            qaPairCount: refreshed.qaPairs.length,
            identityReady: Boolean(refreshed.identity.fullName.trim()),
          };
        } catch (error) {
          this.logger.debug(`Vault draft refresh skipped: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      return {
        coverBlurb: dto.drafts.coverBlurb,
        draftAnswerCount: dto.drafts.commonAnswers.length,
        qaPairCount: dto.qaPairs.length,
        identityReady: Boolean(dto.identity.fullName.trim()),
      };
    } catch (error) {
      this.logger.debug(`Vault prep skipped: ${error instanceof Error ? error.message : String(error)}`);
      return empty;
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

  /** Sends one application on an offline channel. Returns true when it went out (or had already gone out). */
  private async send(match: JobAgentMatch, profile: JobAgentProfile, account: { email: string; firstName: string; lastName: string }) {
    if (!profile.cvData || !profile.cvFileName) return false;
    if (isAssistedChannel(match.channel)) return false;

    const [resume, vault] = await Promise.all([
      profile.resumeId ? this.prisma.resume.findUnique({ where: { id: profile.resumeId }, select: { data: true } }) : null,
      this.prisma.applyVault.findUnique({ where: { userId: profile.userId } }),
    ]);
    const personal = resume ? resumeDataSchema.safeParse(resume.data) : null;
    const vaultIdentity = vault?.identity ? applyVaultIdentitySchema.safeParse(vault.identity) : null;
    const vaultLinks = vault?.links ? applyVaultLinksSchema.safeParse(vault.links) : null;
    const name =
      (vaultIdentity?.success && vaultIdentity.data.fullName.trim()) ||
      (personal?.success && personal.data.personal.fullName) ||
      `${account.firstName} ${account.lastName}`.trim();
    const email = (vaultIdentity?.success && vaultIdentity.data.email.trim()) || account.email;
    const phone =
      (vaultIdentity?.success && vaultIdentity.data.phone.trim()) ||
      profile.phone ||
      (personal?.success ? personal.data.personal.phone : '') ||
      undefined;
    const location =
      (vaultIdentity?.success && vaultIdentity.data.location.trim()) ||
      (personal?.success ? personal.data.personal.location : '') ||
      undefined;
    const file = { buffer: Buffer.from(profile.cvData), size: profile.cvData.length, originalname: profile.cvFileName };

    try {
      let applicationId: string | null = null;
      if (match.channel === 'easy_apply') {
        try {
          const result = await this.applications.applyFromAgent(
            match.listingId.replace(/^dealo_/, ''),
            { name, email, phone, location, coverNote: match.coverNote ?? undefined },
            file,
          );
          applicationId = result.id;
        } catch (error) {
          if (!(error instanceof ConflictException)) throw error;
        }
      } else if (match.channel === 'email' && match.applyEmail) {
        await this.sendEmailApplication(match, { name, email, phone }, file);
      } else if (match.channel === 'ats_api') {
        const adapter = findAtsAdapter(match.url);
        if (!adapter) {
          await this.prisma.jobAgentMatch.update({
            where: { id: match.id },
            data: {
              channel: 'site_assisted',
              channelReason: 'No ATS adapter available — moved to Assist',
              status: 'READY',
              assistConfidence: computeAssistConfidence({
                score: match.score,
                hasCoverNote: Boolean(match.coverNote),
                vaultIdentityReady: Boolean(name && email),
                draftAnswerCount: 0,
                qaPairCount: 0,
              }),
              error: null,
            },
          });
          return false;
        }
        const result = await adapter.apply(
          {
            fullName: name,
            email,
            phone,
            location,
            linkedin: vaultLinks?.success ? vaultLinks.data.linkedin || undefined : personal?.success ? personal.data.personal.linkedin || undefined : undefined,
            website: vaultLinks?.success ? vaultLinks.data.website || undefined : personal?.success ? personal.data.personal.website || undefined : undefined,
            coverNote: match.coverNote ?? undefined,
          },
          { url: match.url, title: match.title, company: match.company },
          { buffer: file.buffer, fileName: file.originalname, mimeType: 'application/pdf' },
        );
        if (!result.ok) {
          if (result.retryAsAssisted) {
            await this.prisma.jobAgentMatch.update({
              where: { id: match.id },
              data: {
                channel: 'site_assisted',
                channelReason: `ATS ${adapter.id} unavailable: ${result.reason}`.slice(0, 240),
                status: 'READY',
                assistConfidence: computeAssistConfidence({
                  score: match.score,
                  hasCoverNote: Boolean(match.coverNote),
                  vaultIdentityReady: Boolean(name && email),
                  draftAnswerCount: 0,
                  qaPairCount: 0,
                }),
                error: null,
              },
            });
            return false;
          }
          throw new BadRequestException(result.reason);
        }
        applicationId = result.externalId ?? null;
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

  /**
   * In-app notice every run that found something.
   * Overnight: in-app only (email deferred to morning digest sweep).
   * Daytime: email with digest copy, throttled via lastDigestAt (20h).
   */
  private async tellPerson(
    profile: JobAgentProfile,
    account: { email: string; firstName: string },
    counts: { sent: number; ready: number; queued: number },
  ) {
    const { sent, ready, queued } = counts;
    // Prefer explicit ready assists; fall back to queued remainder for REVIEW mode.
    const readyForCopy = ready > 0 ? ready : Math.max(0, queued - sent);
    const title =
      sent || readyForCopy
        ? morningDigestTitle({ sent, ready: readyForCopy })
        : `Your Job Agent found ${queued} job${queued === 1 ? '' : 's'} for you`;
    const body = morningDigestBody({ sent, ready: readyForCopy });
    await this.notifications.notify([profile.userId], {
      type: 'job_agent.run',
      title,
      body,
      link: '/dashboard/job-agent',
    });

    // Defer email overnight so the morning digest is the one people open.
    if (isOvernightLagos() && !isMorningDigestWindow()) return;
    if (!canSendDigestEmail(profile.lastDigestAt)) return;
    if (!sent && !readyForCopy) return;
    await this.sendMorningDigest(profile, account, { sent, ready: readyForCopy }, { notify: false });
  }

  private async sendMorningDigest(
    profile: JobAgentProfile,
    account: { email: string; firstName: string },
    counts: { sent: number; ready: number },
    opts: { notify: boolean } = { notify: true },
  ) {
    const title = morningDigestTitle(counts);
    const body = morningDigestBody(counts);
    const link = `${this.appUrl}/dashboard/job-agent`;
    if (opts.notify) {
      await this.notifications.notify([profile.userId], {
        type: 'job_agent.digest',
        title,
        body,
        link: '/dashboard/job-agent',
      });
    }
    const html = renderEmailHtml(
      `<h2>${escapeHtml(title)}</h2>
<p>Hi ${escapeHtml(account.firstName || 'there')}, your Dealo Job Agent worked overnight on channels it can send without you (Easy Apply, email, partner ATS) and packed Assist drafts for career pages.</p>
<ul>${counts.sent ? `<li><strong>${counts.sent}</strong> application${counts.sent === 1 ? '' : 's'} sent with your CV</li>` : ''}${
        counts.ready
          ? `<li><strong>${counts.ready}</strong> ready for a 60-second Assist — open, review fills, you click Submit</li>`
          : ''
      }</ul>
<p><a href="${link}">Open your Job Agent</a> to finish assists or review what went out.</p>`,
      {
        siteUrl: this.appUrl,
        preheader: title,
        footerNote: 'You get this because your Job Agent is switched on. Turn it off any time from your dashboard.',
      },
    );
    await this.email
      .send({ to: account.email, subject: title, html, text: `${title}. ${body} ${link}` })
      .then(() => this.prisma.jobAgentProfile.update({ where: { id: profile.id }, data: { lastDigestAt: new Date() } }))
      .catch((error: unknown) => this.logger.warn(`Job Agent digest failed: ${String(error)}`));
  }
}
