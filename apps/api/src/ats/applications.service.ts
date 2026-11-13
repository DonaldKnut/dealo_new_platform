import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { WebhookEvent, type ApplyInput } from '@dealo/shared';
import {
  ApplicationStatus,
  JobStatus,
  Prisma,
  WorkspaceRole,
  type Application,
  type Job,
  type Organization,
} from '@prisma/client';

import { AiService } from '../ai/ai.service';
import type { AuthUser } from '../auth/auth.types';
import { assertEmailVerified } from '../auth/verified-email';
import { verifiedMime } from '../common/file-signature';
import { normalizeEmail } from '../common/normalize-email';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { AtsAccessService, isObjectId, type WorkspaceAccess } from './ats-access.service';
import { AtsEventsService } from './ats-events.service';
import { applicationReceivedEmail, rejectionEmail } from './ats-emails';

export const CV_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
export const CV_MAX_BYTES = 8 * 1024 * 1024;
/** Caps careers-page applications so one job can't be flooded (and its confirmation emails abused). */
const MAX_DAILY_APPLICATIONS_PER_JOB = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

const PUBLIC_JOB_SELECT = {
  id: true,
  title: true,
  slug: true,
  roleFamily: true,
  location: true,
  workArrangement: true,
  employmentType: true,
  salaryMinMinor: true,
  salaryMaxMinor: true,
  currency: true,
  description: true,
  mustHaves: true,
  publishedAt: true,
  updatedAt: true,
} satisfies Prisma.JobSelect;

const PUBLIC_ORG_SELECT = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  website: true,
  about: true,
  brandColor: true,
  careersEnabled: true,
  isActive: true,
} satisfies Prisma.OrganizationSelect;

const CARD_SELECT = {
  id: true,
  jobId: true,
  name: true,
  email: true,
  location: true,
  source: true,
  stage: true,
  stageChangedAt: true,
  status: true,
  rating: true,
  tags: true,
  aiScore: true,
  aiFit: true,
  cvFileId: true,
  createdAt: true,
} satisfies Prisma.ApplicationSelect;

export function applicationPayload(app: Pick<Application, 'id' | 'jobId' | 'stage' | 'status' | 'source' | 'createdAt'>, job: Pick<Job, 'title'>) {
  return {
    application: {
      id: app.id,
      jobId: app.jobId,
      jobTitle: job.title,
      stage: app.stage,
      status: app.status,
      source: app.source,
      createdAt: app.createdAt.toISOString(),
    },
  };
}

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AtsAccessService,
    private readonly email: EmailService,
    private readonly ai: AiService,
    private readonly webhooks: WebhooksService,
    private readonly events: AtsEventsService,
  ) {}

  // ----------------------------------------------------------------- careers

  private async publicOrg(orgSlug: string) {
    const org = await this.prisma.organization.findUnique({ where: { slug: orgSlug.toLowerCase() }, select: PUBLIC_ORG_SELECT });
    if (!org || !org.isActive || !org.careersEnabled) throw new NotFoundException('Careers page not found');
    return org;
  }

  async careers(orgSlug: string) {
    const org = await this.publicOrg(orgSlug);
    const jobs = await this.prisma.job.findMany({
      where: { organizationId: org.id, status: JobStatus.OPEN },
      orderBy: { publishedAt: 'desc' },
      select: PUBLIC_JOB_SELECT,
    });
    const { isActive: _a, careersEnabled: _c, ...organization } = org;
    const summarise = (text: string) =>
      text
        .replace(/<[^>]+>/g, ' ')
        .replace(/\*\*/g, '')
        .replace(/^\s*[-*•]\s+/gm, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 220);
    return { organization, jobs: jobs.map(({ description, ...job }) => ({ ...job, summary: summarise(description) })) };
  }

  /** Every public job, for the sitemap. */
  async careersIndex() {
    const jobs = await this.prisma.job.findMany({
      where: { status: JobStatus.OPEN, organization: { isActive: true, careersEnabled: true } },
      select: { slug: true, updatedAt: true, organization: { select: { slug: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });
    return jobs.map((job) => ({ orgSlug: job.organization.slug, jobSlug: job.slug, updatedAt: job.updatedAt }));
  }

  async careersJob(orgSlug: string, jobSlug: string) {
    const org = await this.publicOrg(orgSlug);
    const job = await this.prisma.job.findFirst({
      where: { organizationId: org.id, slug: jobSlug.toLowerCase(), status: JobStatus.OPEN },
      select: PUBLIC_JOB_SELECT,
    });
    if (!job) throw new NotFoundException('This job is closed or does not exist');
    const { isActive: _a, careersEnabled: _c, ...organization } = org;
    return { organization, job };
  }

  /** Public apply. A duplicate email for the same job is rejected with 409. */
  async apply(orgSlug: string, jobSlug: string, input: ApplyInput, file?: Express.Multer.File) {
    if (input.website) throw new BadRequestException('Could not send your application');
    const org = await this.publicOrg(orgSlug);
    const job = await this.prisma.job.findFirst({
      where: { organizationId: org.id, slug: jobSlug.toLowerCase(), status: JobStatus.OPEN },
    });
    if (!job) throw new NotFoundException('This job is closed or does not exist');

    const today = await this.prisma.application.count({
      where: { jobId: job.id, source: 'careers', createdAt: { gte: new Date(Date.now() - DAY_MS) } },
    });
    if (today >= MAX_DAILY_APPLICATIONS_PER_JOB) {
      throw new HttpException('This job has had a lot of applications today. Please try again tomorrow.', HttpStatus.TOO_MANY_REQUESTS);
    }

    return this.createApplication(
      { ...org, id: org.id },
      job,
      input,
      file,
      'careers',
      job.createdById,
    );
  }

  /**
   * A job seeker's Job Agent applies for them. Same checks and screening as the careers page,
   * marked with its own source so employers can see and filter agent applications.
   */
  async applyFromAgent(jobId: string, input: ApplyInput, file: Pick<Express.Multer.File, 'buffer' | 'size' | 'originalname'>) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, status: JobStatus.OPEN, organization: { is: { isActive: true, careersEnabled: true } } },
      include: { organization: { select: { id: true, name: true } } },
    });
    if (!job) throw new NotFoundException('This job is closed or does not exist');
    const today = await this.prisma.application.count({ where: { jobId: job.id, createdAt: { gte: new Date(Date.now() - DAY_MS) } } });
    if (today >= MAX_DAILY_APPLICATIONS_PER_JOB) {
      throw new HttpException('This job has had a lot of applications today.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const { organization, ...jobRow } = job;
    return this.createApplication(organization, jobRow, input, file as Express.Multer.File, 'job_agent', job.createdById);
  }

  /** Recruiter adds someone by hand (e.g. a referral or a walk-in). */
  async addManual(orgId: string, jobId: string, input: ApplyInput, user: AuthUser, file?: Express.Multer.File, source = 'manual') {
    const access = await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    const job = await this.requireJob(orgId, jobId);
    return this.createApplication(access.organization, job, input, file, source, user.id, access);
  }

  private async createApplication(
    org: Pick<Organization, 'id' | 'name'>,
    job: Job,
    input: ApplyInput,
    file: Express.Multer.File | undefined,
    source: string,
    actorId: string,
    access?: WorkspaceAccess,
  ) {
    const email = normalizeEmail(input.email);
    const duplicate = await this.prisma.application.findUnique({ where: { jobId_email: { jobId: job.id, email } } });
    if (duplicate) throw new ConflictException('You have already applied for this job');

    let cvFileId: string | undefined;
    if (file) {
      if (file.size > CV_MAX_BYTES) throw new BadRequestException('Your CV must be 8 MB or smaller');
      const mimeType = verifiedMime(file.buffer, CV_MIME);
      if (!mimeType) throw new BadRequestException('Upload your CV as a PDF or Word file');
      const stored = await this.prisma.atsFile.create({
        data: {
          organizationId: org.id,
          fileName: file.originalname.slice(0, 160),
          mimeType,
          byteSize: file.size,
          data: new Uint8Array(file.buffer),
        },
        select: { id: true },
      });
      cvFileId = stored.id;
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    const application = await this.prisma.application.create({
      data: {
        organizationId: org.id,
        jobId: job.id,
        name: input.name,
        email,
        phone: input.phone,
        location: input.location,
        coverNote: input.coverNote,
        source,
        stage: job.stages[0] ?? 'Applied',
        userId: existingUser?.id,
        cvFileId,
      },
    });
    await this.event(application, access ? 'ADDED' : 'APPLIED', access, {
      body: access ? `Added by ${access.userName}` : `Applied through the careers page`,
    });

    if (source === 'careers') {
      void this.email
        .send(applicationReceivedEmail({ to: email, name: input.name, jobTitle: job.title, orgName: org.name }))
        .catch(() => undefined);
    }
    this.webhooks.dispatchWorkspaceEvent(WebhookEvent.APPLICATION_CREATED, org.id, applicationPayload(application, job));
    void this.screen(application.id, actorId)
      .catch((error: unknown) => this.logger.warn(`AI screen failed for application ${application.id}: ${String(error)}`))
      .finally(() => this.events.emit({ type: 'application.created', organizationId: org.id, jobId: job.id, applicationId: application.id }));

    return { id: application.id, jobTitle: job.title, organization: org.name };
  }

  private async screen(applicationId: string, actorId: string) {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId }, include: { job: true } });
    if (!application) return null;
    const cv = application.cvFileId
      ? await this.prisma.atsFile.findUnique({ where: { id: application.cvFileId }, select: { mimeType: true, data: true } })
      : null;
    const result = await this.ai.screenApplicant({
      applicationId,
      actorId,
      job: application.job,
      applicant: { location: application.location, coverNote: application.coverNote },
      cv: cv?.data ? { mimeType: cv.mimeType, data: Buffer.from(cv.data) } : null,
    });
    await this.prisma.application.update({
      where: { id: applicationId },
      data: { aiScore: Math.round(result.score), aiFit: result.fit, aiRunId: result.runId },
    });
    await this.prisma.applicationEvent.create({
      data: {
        organizationId: application.organizationId,
        applicationId,
        type: 'AI_SCREENED',
        actorName: 'Dealo AI',
        body: `${result.fit} fit · score ${Math.round(result.score)}`,
        meta: { runId: result.runId, provider: result.provider },
      },
    });
    return result;
  }

  // ---------------------------------------------------------------- pipeline

  private async requireJob(orgId: string, jobId: string) {
    if (!isObjectId(jobId)) throw new NotFoundException('Job not found');
    const job = await this.prisma.job.findFirst({ where: { id: jobId, organizationId: orgId } });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  private assertJobVisible(access: WorkspaceAccess, job: Pick<Job, 'hiringManagerIds'>) {
    if (access.role === WorkspaceRole.HIRING_MANAGER && !job.hiringManagerIds.includes(access.userId)) {
      throw new ForbiddenException('You are not a hiring manager on this job');
    }
  }

  async requireApplication(orgId: string, applicationId: string, user: AuthUser, min: WorkspaceRole = WorkspaceRole.HIRING_MANAGER) {
    const access = await this.access.require(orgId, user, min);
    if (!isObjectId(applicationId)) throw new NotFoundException('Applicant not found');
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, organizationId: orgId },
      include: { job: true },
    });
    if (!application) throw new NotFoundException('Applicant not found');
    this.assertJobVisible(access, application.job);
    return { access, application };
  }

  async board(orgId: string, jobId: string, user: AuthUser, status = 'ACTIVE') {
    const access = await this.access.require(orgId, user);
    const job = await this.requireJob(orgId, jobId);
    this.assertJobVisible(access, job);
    const statuses = Object.values(ApplicationStatus) as string[];
    const applications = await this.prisma.application.findMany({
      where: { jobId, ...(statuses.includes(status) ? { status: status as ApplicationStatus } : {}) },
      orderBy: [{ aiScore: 'desc' }, { createdAt: 'asc' }],
      select: CARD_SELECT,
      take: 1000,
    });
    return { job, myRole: access.role, applications };
  }

  async detail(orgId: string, applicationId: string, user: AuthUser) {
    const { access, application } = await this.requireApplication(orgId, applicationId, user);
    const [events, cv, aiRun, interviews, scorecards, offers] = await Promise.all([
      this.prisma.applicationEvent.findMany({ where: { applicationId }, orderBy: { createdAt: 'desc' }, take: 200 }),
      application.cvFileId
        ? this.prisma.atsFile.findUnique({ where: { id: application.cvFileId }, select: { id: true, fileName: true, mimeType: true, byteSize: true } })
        : null,
      application.aiRunId ? this.prisma.aiRun.findUnique({ where: { id: application.aiRunId } }) : null,
      this.prisma.interview.findMany({ where: { applicationId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.scorecard.findMany({ where: { applicationId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.offer.findMany({ where: { applicationId }, orderBy: { createdAt: 'desc' } }),
    ]);
    const { job, ...rest } = application;
    // Scorecards stay hidden from a reviewer until they submit their own (avoids anchoring).
    const mine = scorecards.find((card) => card.reviewerId === access.userId);
    const visibleScorecards = mine || AtsAccessService.canManage(access.role) ? scorecards : [];
    return {
      application: rest,
      job: { id: job.id, title: job.title, stages: job.stages, status: job.status, slug: job.slug },
      myRole: access.role,
      myUserId: access.userId,
      cv,
      ai: aiRun ? { id: aiRun.id, status: aiRun.status, provider: aiRun.provider, model: aiRun.model, output: aiRun.output, createdAt: aiRun.createdAt } : null,
      events,
      interviews: interviews.map(({ bookingTokenHash: _b, ...item }) => item),
      scorecards: visibleScorecards,
      scorecardsHidden: scorecards.length - visibleScorecards.length,
      offers: offers.map(({ responseTokenHash: _r, ...item }) => item),
    };
  }

  async moveStage(orgId: string, applicationIds: string[], stage: string, user: AuthUser) {
    const access = await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    const ids = applicationIds.filter(isObjectId);
    const applications = await this.prisma.application.findMany({
      where: { id: { in: ids }, organizationId: orgId },
      include: { job: { select: { id: true, title: true, stages: true } } },
    });
    if (!applications.length) throw new NotFoundException('Applicant not found');

    let moved = 0;
    for (const application of applications) {
      if (!application.job.stages.includes(stage)) {
        throw new BadRequestException(`“${stage}” is not a stage for ${application.job.title}`);
      }
      if (application.stage === stage && application.status === ApplicationStatus.ACTIVE) continue;
      const isFinal = stage === application.job.stages[application.job.stages.length - 1];
      const updated = await this.prisma.application.update({
        where: { id: application.id },
        data: {
          stage,
          stageChangedAt: new Date(),
          status: isFinal ? ApplicationStatus.HIRED : ApplicationStatus.ACTIVE,
        },
      });
      await this.event(updated, isFinal ? 'HIRED' : 'STAGE_CHANGED', access, {
        body: `${application.stage} → ${stage}`,
        meta: { from: application.stage, to: stage },
      });
      this.webhooks.dispatchWorkspaceEvent(WebhookEvent.APPLICATION_STAGE_CHANGED, orgId, {
        ...applicationPayload(updated, application.job),
        previousStage: application.stage,
      });
      this.events.emit({ type: 'application.stage_changed', organizationId: orgId, jobId: application.jobId, applicationId: application.id, from: application.stage, to: stage, actor: user });
      moved += 1;
    }
    return { moved };
  }

  async reject(orgId: string, applicationIds: string[], notify: boolean, reason: string | undefined, user: AuthUser) {
    const access = await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    if (notify) await assertEmailVerified(this.prisma, user);
    const applications = await this.prisma.application.findMany({
      where: { id: { in: applicationIds.filter(isObjectId) }, organizationId: orgId, status: { not: ApplicationStatus.REJECTED } },
      include: { job: { select: { title: true } } },
    });
    for (const application of applications) {
      const updated = await this.prisma.application.update({
        where: { id: application.id },
        data: { status: ApplicationStatus.REJECTED, stageChangedAt: new Date() },
      });
      await this.event(updated, 'REJECTED', access, { body: reason ? `Not moving forward: ${reason}` : 'Not moving forward', meta: { notified: notify } });
      if (notify) {
        void this.email
          .send(rejectionEmail({ to: application.email, name: application.name, jobTitle: application.job.title, orgName: access.organization.name, reason }))
          .catch(() => undefined);
      }
    }
    return { rejected: applications.length };
  }

  async restore(orgId: string, applicationId: string, user: AuthUser) {
    const { access, application } = await this.requireApplication(orgId, applicationId, user, WorkspaceRole.RECRUITER);
    const updated = await this.prisma.application.update({
      where: { id: application.id },
      data: { status: ApplicationStatus.ACTIVE, stageChangedAt: new Date() },
    });
    await this.event(updated, 'RESTORED', access, { body: `Back in ${application.stage}` });
    return updated;
  }

  async update(orgId: string, applicationId: string, input: { rating?: number | null; tags?: string[] }, user: AuthUser) {
    const { access } = await this.requireApplication(orgId, applicationId, user, WorkspaceRole.RECRUITER);
    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        ...(input.rating !== undefined ? { rating: input.rating } : {}),
        ...(input.tags ? { tags: [...new Set(input.tags.map((tag) => tag.toLowerCase()))] } : {}),
      },
    });
    if (input.rating !== undefined) {
      await this.event(updated, 'RATED', access, { body: input.rating ? `Rated ${input.rating}/5` : 'Rating cleared' });
    }
    return updated;
  }

  async addNote(orgId: string, applicationId: string, body: string, user: AuthUser) {
    const { access, application } = await this.requireApplication(orgId, applicationId, user);
    return this.event(application, 'NOTE', access, { body });
  }

  async rerunAi(orgId: string, applicationId: string, user: AuthUser) {
    await this.requireApplication(orgId, applicationId, user, WorkspaceRole.RECRUITER);
    return this.screen(applicationId, user.id);
  }

  async reviewAi(orgId: string, applicationId: string, decision: 'ACCEPTED' | 'DISMISSED', user: AuthUser) {
    const { access, application } = await this.requireApplication(orgId, applicationId, user);
    if (!application.aiRunId) throw new NotFoundException('No AI result to review');
    await this.prisma.aiRun.update({
      where: { id: application.aiRunId },
      data: { status: decision, reviewedById: user.id, reviewedAt: new Date() },
    });
    await this.event(application, 'AI_REVIEWED', access, { body: decision === 'ACCEPTED' ? 'AI suggestion accepted' : 'AI suggestion dismissed' });
    return { ok: true };
  }

  /** The CV an applicant sent, for partner integrations that pull applications into their own system. */
  async readApplicationCv(orgId: string, applicationId: string, user: AuthUser) {
    if (!isObjectId(applicationId)) throw new NotFoundException('Application not found');
    const application = await this.prisma.application.findFirst({ where: { id: applicationId, organizationId: orgId }, select: { cvFileId: true } });
    if (!application?.cvFileId) throw new NotFoundException('This application has no CV');
    return this.readFile(orgId, application.cvFileId, user);
  }

  async readFile(orgId: string, fileId: string, user: AuthUser) {
    const access = await this.access.require(orgId, user);
    if (!isObjectId(fileId)) throw new NotFoundException('File not found');
    const file = await this.prisma.atsFile.findFirst({ where: { id: fileId, organizationId: orgId } });
    if (!file?.data) throw new NotFoundException('File not found');
    if (access.role === WorkspaceRole.HIRING_MANAGER) {
      const owner = await this.prisma.application.findFirst({ where: { cvFileId: fileId }, include: { job: true } });
      if (!owner) throw new NotFoundException('File not found');
      this.assertJobVisible(access, owner.job);
    }
    return { fileName: file.fileName, mimeType: file.mimeType, data: Buffer.from(file.data) };
  }

  async event(
    application: Pick<Application, 'id' | 'organizationId'>,
    type: string,
    access: WorkspaceAccess | undefined,
    extra: { body?: string; meta?: Prisma.InputJsonValue } = {},
  ) {
    return this.prisma.applicationEvent.create({
      data: {
        organizationId: application.organizationId,
        applicationId: application.id,
        type,
        actorId: access?.userId,
        actorName: access?.userName,
        body: extra.body,
        meta: extra.meta,
      },
    });
  }
}
