import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_JOB_STAGES,
  EMAIL_NOT_VERIFIED,
  ORG_NOT_VERIFIED,
  type ApiJobSyncInput,
  type JobInput,
} from '@dealo/shared';
import {
  ApplicationStatus,
  JobStatus,
  OrgVerificationStatus,
  UserRole,
  WorkspaceRole,
  type Job,
  type Organization,
} from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { AtsAccessService, isObjectId, type WorkspaceAccess } from './ats-access.service';

const STAFF_PUBLISH_OVERRIDE: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.RECRUITER,
  UserRole.OPERATIONS,
];

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'job'
  );
}

/** Stages always end with "Hired"; duplicates and blanks are dropped. */
function normalizeStages(stages?: string[]) {
  const list = (stages?.length ? stages : [...DEFAULT_JOB_STAGES]).map((stage) => stage.trim()).filter(Boolean);
  const unique = [...new Set(list.filter((stage) => stage.toLowerCase() !== 'hired'))];
  return [...unique, 'Hired'];
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AtsAccessService,
  ) {}

  private async uniqueSlug(orgId: string, title: string, excludeId?: string) {
    const base = slugify(title);
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const taken = await this.prisma.job.findFirst({ where: { organizationId: orgId, slug }, select: { id: true } });
      if (!taken || taken.id === excludeId) return slug;
    }
    return `${base}-${Date.now()}`;
  }

  async requireJob(orgId: string, jobId: string) {
    if (!isObjectId(jobId)) throw new NotFoundException('Job not found');
    const job = await this.prisma.job.findFirst({ where: { id: jobId, organizationId: orgId } });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async list(orgId: string, user: AuthUser) {
    const access = await this.access.require(orgId, user);
    const jobs = await this.prisma.job.findMany({
      where: {
        organizationId: orgId,
        ...(access.role === WorkspaceRole.HIRING_MANAGER ? { hiringManagerIds: { has: user.id } } : {}),
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
    const counts = await this.prisma.application.groupBy({
      by: ['jobId', 'stage'],
      where: { organizationId: orgId, status: ApplicationStatus.ACTIVE },
      _count: { _all: true },
    });
    const totals = await this.prisma.application.groupBy({
      by: ['jobId'],
      where: { organizationId: orgId },
      _count: { _all: true },
    });
    return jobs.map((job) => ({
      ...job,
      totalApplications: totals.find((t) => t.jobId === job.id)?._count._all ?? 0,
      pipeline: job.stages.map((stage) => ({
        stage,
        count: counts.find((c) => c.jobId === job.id && c.stage === stage)?._count._all ?? 0,
      })),
    }));
  }

  async get(orgId: string, jobId: string, user: AuthUser) {
    await this.access.require(orgId, user);
    return this.requireJob(orgId, jobId);
  }

  async create(orgId: string, input: JobInput, user: AuthUser, extra: Partial<Pick<Job, 'hireInquiryId'>> = {}) {
    await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    this.checkSalary(input);
    return this.prisma.job.create({
      data: {
        organizationId: orgId,
        title: input.title,
        slug: await this.uniqueSlug(orgId, input.title),
        roleFamily: input.roleFamily,
        location: input.location,
        workArrangement: input.workArrangement,
        employmentType: input.employmentType,
        salaryMinMinor: input.salaryMinMinor ?? null,
        salaryMaxMinor: input.salaryMaxMinor ?? null,
        currency: input.currency,
        description: input.description,
        mustHaves: input.mustHaves,
        stages: normalizeStages(input.stages),
        hiringManagerIds: input.hiringManagerIds.filter(isObjectId),
        createdById: user.id,
        ...extra,
      },
    });
  }

  async update(orgId: string, jobId: string, input: JobInput, user: AuthUser) {
    await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    const job = await this.requireJob(orgId, jobId);
    this.checkSalary(input);
    const stages = normalizeStages(input.stages ?? job.stages);
    const removed = job.stages.filter((stage) => !stages.includes(stage));
    if (removed.length) {
      const inUse = await this.prisma.application.count({ where: { jobId, stage: { in: removed }, status: ApplicationStatus.ACTIVE } });
      if (inUse) throw new BadRequestException(`Move people out of “${removed.join(', ')}” before removing it`);
    }
    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        title: input.title,
        slug: input.title === job.title ? job.slug : await this.uniqueSlug(orgId, input.title, jobId),
        roleFamily: input.roleFamily,
        location: input.location,
        workArrangement: input.workArrangement,
        employmentType: input.employmentType,
        salaryMinMinor: input.salaryMinMinor ?? null,
        salaryMaxMinor: input.salaryMaxMinor ?? null,
        currency: input.currency,
        description: input.description,
        mustHaves: input.mustHaves,
        stages,
        hiringManagerIds: input.hiringManagerIds.filter(isObjectId),
      },
    });
  }

  async setStatus(orgId: string, jobId: string, status: JobStatus, user: AuthUser) {
    const access = await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    const job = await this.requireJob(orgId, jobId);
    if (status === JobStatus.OPEN && job.status !== JobStatus.OPEN) {
      await this.assertCanOpen(access, user);
      const open = await this.prisma.job.count({ where: { organizationId: orgId, status: JobStatus.OPEN } });
      if (open >= access.organization.maxOpenJobs) {
        throw new BadRequestException(`Your plan allows ${access.organization.maxOpenJobs} open jobs. Close one first.`);
      }
    }
    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        status,
        publishedAt: status === JobStatus.OPEN ? job.publishedAt ?? new Date() : job.publishedAt,
        closedAt: status === JobStatus.CLOSED ? new Date() : null,
      },
    });
  }

  /**
   * Partner sync: creates or updates each job by the partner's own id and opens or closes it.
   * Opening respects publish trust (email + org verification / staff override) and the open-job limit;
   * OPEN requests that fail those gates are SKIPPED (same pattern as the limit). CLOSED sync still runs.
   */
  async syncFromPartner(orgId: string, items: ApiJobSyncInput['jobs'], user: AuthUser) {
    const access = await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    let open = await this.prisma.job.count({ where: { organizationId: orgId, status: JobStatus.OPEN } });
    const results: { externalId: string; jobId: string | null; status: string; error?: string }[] = [];
    let openGateError: string | null = null;
    try {
      await this.assertCanOpen(access, user);
    } catch (error) {
      openGateError = this.exceptionMessage(error, 'Cannot publish jobs yet');
    }
    for (const item of items) {
      try {
        this.checkSalary(item);
        const existing = await this.prisma.job.findFirst({ where: { organizationId: orgId, externalRef: item.externalId } });
        const wantsOpen = item.status === 'OPEN';
        if (wantsOpen && existing?.status !== JobStatus.OPEN) {
          if (openGateError) {
            results.push({ externalId: item.externalId, jobId: existing?.id ?? null, status: 'SKIPPED', error: openGateError });
            continue;
          }
          if (open >= access.organization.maxOpenJobs) {
            results.push({ externalId: item.externalId, jobId: existing?.id ?? null, status: 'SKIPPED', error: `Open-job limit (${access.organization.maxOpenJobs}) reached` });
            continue;
          }
        }
        const data = {
          title: item.title,
          roleFamily: item.roleFamily,
          location: item.location,
          workArrangement: item.workArrangement,
          employmentType: item.employmentType,
          salaryMinMinor: item.salaryMinMinor ?? null,
          salaryMaxMinor: item.salaryMaxMinor ?? null,
          currency: item.currency,
          description: item.description,
          mustHaves: item.mustHaves,
          status: wantsOpen ? JobStatus.OPEN : JobStatus.CLOSED,
          closedAt: wantsOpen ? null : new Date(),
        };
        const job = existing
          ? await this.prisma.job.update({
              where: { id: existing.id },
              data: {
                ...data,
                slug: item.title === existing.title ? existing.slug : await this.uniqueSlug(orgId, item.title, existing.id),
                publishedAt: wantsOpen ? existing.publishedAt ?? new Date() : existing.publishedAt,
              },
            })
          : await this.prisma.job.create({
              data: {
                ...data,
                organizationId: orgId,
                externalRef: item.externalId,
                slug: await this.uniqueSlug(orgId, item.title),
                stages: normalizeStages(item.stages),
                hiringManagerIds: [],
                createdById: user.id,
                publishedAt: wantsOpen ? new Date() : null,
              },
            });
        if (wantsOpen && existing?.status !== JobStatus.OPEN) open += 1;
        if (!wantsOpen && existing?.status === JobStatus.OPEN) open -= 1;
        results.push({ externalId: item.externalId, jobId: job.id, status: job.status });
      } catch (error) {
        results.push({ externalId: item.externalId, jobId: null, status: 'FAILED', error: error instanceof Error ? error.message : 'Could not save this job' });
      }
    }
    return { results, synced: results.filter((r) => r.status === 'OPEN' || r.status === 'CLOSED').length };
  }

  async duplicate(orgId: string, jobId: string, user: AuthUser) {
    await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    const job = await this.requireJob(orgId, jobId);
    const title = `${job.title} (copy)`;
    return this.prisma.job.create({
      data: {
        organizationId: orgId,
        title,
        slug: await this.uniqueSlug(orgId, title),
        roleFamily: job.roleFamily,
        location: job.location,
        workArrangement: job.workArrangement,
        employmentType: job.employmentType,
        salaryMinMinor: job.salaryMinMinor,
        salaryMaxMinor: job.salaryMaxMinor,
        currency: job.currency,
        description: job.description,
        mustHaves: job.mustHaves,
        stages: job.stages,
        hiringManagerIds: job.hiringManagerIds,
        createdById: user.id,
      },
    });
  }

  /** Turn a Dealo hiring request into a draft job in the given workspace. */
  async fromHireInquiry(orgId: string, inquiryId: string, user: AuthUser) {
    if (!isObjectId(inquiryId)) throw new NotFoundException('Hiring request not found');
    const inquiry = await this.prisma.hireInquiry.findUnique({ where: { id: inquiryId } });
    if (!inquiry) throw new NotFoundException('Hiring request not found');
    const existing = await this.prisma.job.findFirst({ where: { organizationId: orgId, hireInquiryId: inquiryId } });
    if (existing) return existing;

    return this.create(
      orgId,
      {
        title: inquiry.roleTitle,
        roleFamily: inquiry.roleFamily,
        location: inquiry.location,
        workArrangement: inquiry.workArrangement,
        employmentType: inquiry.serviceType === 'MANAGED_STAFFING' ? 'CONTRACT' : 'FULL_TIME',
        salaryMinMinor: inquiry.compensationMinMinor,
        salaryMaxMinor: inquiry.compensationMaxMinor,
        currency: inquiry.currency,
        description: [
          `${inquiry.companyName} is hiring ${inquiry.numberOfProfessionals} × ${inquiry.roleTitle} in ${inquiry.location}.`,
          inquiry.requirements,
          inquiry.durationNotes ? `Duration: ${inquiry.durationNotes}` : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
        mustHaves: [],
        hiringManagerIds: [],
      },
      user,
      { hireInquiryId: inquiryId },
    );
  }

  private checkSalary(input: JobInput) {
    if (input.salaryMinMinor && input.salaryMaxMinor && input.salaryMaxMinor < input.salaryMinMinor) {
      throw new BadRequestException('Highest pay must be the same as or more than lowest pay');
    }
  }

  /**
   * Publishing requires a confirmed actor email (JWT user or API-key owner) and a VERIFIED org.
   * Dealo staff can override the org verification gate; JOB_PARTNER eligibility stays elsewhere.
   */
  private async assertCanOpen(access: WorkspaceAccess, user: AuthUser) {
    const emailUserId = user.authType === 'api_key' ? access.userId : user.id;
    const account = await this.prisma.user.findUnique({
      where: { id: emailUserId },
      select: { isEmailVerified: true },
    });
    if (!account?.isEmailVerified) {
      throw new ForbiddenException({
        statusCode: 403,
        code: EMAIL_NOT_VERIFIED,
        message:
          'Confirm your email address before publishing a job. Use the link we sent you, or resend it from your dashboard.',
      });
    }

    const staffOverride =
      access.support || user.roles.some((role) => STAFF_PUBLISH_OVERRIDE.includes(role));
    if (!staffOverride && access.organization.verificationStatus !== OrgVerificationStatus.VERIFIED) {
      throw new ForbiddenException({
        statusCode: 403,
        code: ORG_NOT_VERIFIED,
        message: this.orgVerifyMessage(access.organization),
      });
    }
  }

  private orgVerifyMessage(org: Organization) {
    if (org.verificationStatus === OrgVerificationStatus.PENDING) {
      return org.workEmailVerifiedAt
        ? 'Dealo is still reviewing your company. You can save drafts meanwhile.'
        : 'Confirm your work email, then wait for Dealo to approve your company before publishing.';
    }
    if (org.verificationStatus === OrgVerificationStatus.REJECTED) {
      return org.verificationNote
        ? `Company verification was declined: ${org.verificationNote}`
        : 'Company verification was declined. Update your details in ATS settings and submit again.';
    }
    return 'Verify your company in ATS settings (website + work email) before publishing a job.';
  }

  private exceptionMessage(error: unknown, fallback: string) {
    if (error instanceof ForbiddenException || error instanceof BadRequestException) {
      const body = error.getResponse();
      if (typeof body === 'string') return body;
      if (typeof body === 'object' && body && 'message' in body) {
        const message = (body as { message: unknown }).message;
        if (typeof message === 'string') return message;
        if (Array.isArray(message)) return message.join(', ');
      }
    }
    return error instanceof Error ? error.message : fallback;
  }
}
