import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_JOB_STAGES, type JobInput } from '@dealo/shared';
import { ApplicationStatus, JobStatus, WorkspaceRole, type Job } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { AtsAccessService, isObjectId } from './ats-access.service';

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
}
