import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  JOB_BOARD_TYPES,
  type JobBoardType,
  type JobListing,
  type JobListingDetail,
  type JobSearchInput,
  type JobSearchResult,
  type TrackApplicationInput,
  type UpdateApplicationLogInput,
} from '@dealo/shared';
import { JobStatus, Prisma, RoleFamily, WorkArrangement, type ExternalJob, type Job, type Organization } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import type { AppEnv } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { FEED_INFO, isNigeria, NIGERIA_PLACES, type FeedSource, salaryRange } from './job-feeds';

const ROLE_FAMILY_LABEL: Record<RoleFamily, string> = {
  OFFICE_PROFESSIONAL: 'Office & professional',
  SKILLED_TRADE: 'Skilled trades',
};

const DEALO_JOB_SELECT = {
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
  createdAt: true,
  organization: { select: { name: true, slug: true, logoUrl: true } },
} satisfies Prisma.JobSelect;

type DealoJobRow = Pick<
  Job,
  'id' | 'title' | 'slug' | 'roleFamily' | 'location' | 'workArrangement' | 'employmentType' | 'salaryMinMinor' | 'salaryMaxMinor' | 'currency' | 'description' | 'mustHaves' | 'publishedAt' | 'createdAt'
> & { organization: Pick<Organization, 'name' | 'slug' | 'logoUrl'> };

const EXTERNAL_LIST_SELECT = {
  id: true,
  source: true,
  title: true,
  company: true,
  companyLogo: true,
  location: true,
  remote: true,
  employmentType: true,
  category: true,
  tags: true,
  salaryText: true,
  summary: true,
  url: true,
  publishedAt: true,
} satisfies Prisma.ExternalJobSelect;

type ExternalRow = Omit<ExternalJob, 'description' | 'sourceId' | 'fetchedAt'>;

const ci = (value: string) => ({ contains: value, mode: 'insensitive' as const });
const asType = (value: string): JobBoardType => ((JOB_BOARD_TYPES as readonly string[]).includes(value) ? (value as JobBoardType) : 'OTHER');

function plainSummary(text: string, max = 240) {
  const flat = text.replace(/<[^>]+>/g, ' ').replace(/\*\*|__/g, '').replace(/^\s*[-*•]\s+/gm, '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 3).replace(/\s+\S*$/, '')}…` : flat;
}

@Injectable()
export class JobBoardService {
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/$/, '');
  }

  // ------------------------------------------------------------------ mapping

  private fromDealo(job: DealoJobRow): JobListing {
    const careers = { orgSlug: job.organization.slug, jobSlug: job.slug };
    return {
      id: `dealo_${job.id}`,
      kind: 'dealo',
      title: job.title,
      company: job.organization.name,
      companyLogo: job.organization.logoUrl,
      location: job.location,
      remote: job.workArrangement === WorkArrangement.REMOTE,
      employmentType: asType(job.employmentType),
      category: ROLE_FAMILY_LABEL[job.roleFamily],
      tags: [job.workArrangement === WorkArrangement.HYBRID ? 'Hybrid' : null, ...job.mustHaves].filter((t): t is string => Boolean(t)).slice(0, 5),
      salary: salaryRange(
        job.salaryMinMinor ? Math.round(job.salaryMinMinor / 100) : null,
        job.salaryMaxMinor ? Math.round(job.salaryMaxMinor / 100) : null,
        job.currency,
        'month',
      ),
      summary: plainSummary(job.description),
      postedAt: (job.publishedAt ?? job.createdAt).toISOString(),
      source: { id: 'dealo', name: 'Dealo', url: `${this.appUrl}/careers/${careers.orgSlug}` },
      easyApply: true,
      applyUrl: `${this.appUrl}/careers/${careers.orgSlug}/${careers.jobSlug}`,
      careers,
    };
  }

  private fromExternal(job: ExternalRow): JobListing {
    const info = FEED_INFO[job.source as FeedSource];
    return {
      id: `ext_${job.id}`,
      kind: 'external',
      title: job.title,
      company: job.company,
      companyLogo: job.companyLogo,
      location: job.location,
      remote: job.remote,
      employmentType: asType(job.employmentType),
      category: job.category,
      tags: job.tags,
      salary: job.salaryText,
      summary: job.summary,
      postedAt: job.publishedAt.toISOString(),
      source: { id: job.source as FeedSource, name: info?.name ?? job.source, url: info?.url ?? job.url },
      easyApply: false,
      applyUrl: job.url,
      careers: null,
    };
  }

  // ------------------------------------------------------------------- search

  private dealoWhere(input: JobSearchInput, withType = true): Prisma.JobWhereInput {
    const and: Prisma.JobWhereInput[] = [{ status: JobStatus.OPEN }, { organization: { is: { isActive: true, careersEnabled: true } } }];
    if (input.q) and.push({ OR: [{ title: ci(input.q) }, { description: ci(input.q) }, { organization: { is: { name: ci(input.q) } } }] });
    if (input.location) {
      and.push(
        /^remote$/i.test(input.location)
          ? { workArrangement: WorkArrangement.REMOTE }
          : isNigeria(input.location)
            ? { OR: NIGERIA_PLACES.map((place) => ({ location: ci(place) })) }
            : { location: ci(input.location) },
      );
    }
    if (input.remote === 'true') and.push({ workArrangement: WorkArrangement.REMOTE });
    if (input.remote === 'false') and.push({ workArrangement: { not: WorkArrangement.REMOTE } });
    if (withType && input.type) and.push({ employmentType: input.type });
    if (input.category) {
      const family = (Object.keys(ROLE_FAMILY_LABEL) as RoleFamily[]).find((f) => ROLE_FAMILY_LABEL[f].toLowerCase() === input.category!.toLowerCase());
      and.push(family ? { roleFamily: family } : { id: { in: [] } });
    }
    if (input.days) and.push({ publishedAt: { gte: new Date(Date.now() - input.days * 86_400_000) } });
    return { AND: and };
  }

  private externalWhere(input: JobSearchInput, withType = true): Prisma.ExternalJobWhereInput {
    const and: Prisma.ExternalJobWhereInput[] = [];
    if (input.q) and.push({ OR: [{ title: ci(input.q) }, { company: ci(input.q) }, { category: ci(input.q) }, { summary: ci(input.q) }] });
    if (input.location) {
      and.push(
        /^remote$/i.test(input.location)
          ? { remote: true }
          : isNigeria(input.location)
            ? { OR: NIGERIA_PLACES.map((place) => ({ location: ci(place) })) }
            : { location: ci(input.location) },
      );
    }
    if (input.remote === 'true') and.push({ remote: true });
    if (input.remote === 'false') and.push({ remote: false });
    if (withType && input.type) and.push({ employmentType: input.type });
    if (input.category) and.push({ category: { equals: input.category, mode: 'insensitive' } });
    if (input.days) and.push({ publishedAt: { gte: new Date(Date.now() - input.days * 86_400_000) } });
    return { AND: and };
  }

  async search(input: JobSearchInput): Promise<JobSearchResult> {
    const wantDealo = input.scope !== 'external';
    const wantExternal = input.scope !== 'dealo';
    const take = input.page * input.pageSize;
    const dealoWhere = this.dealoWhere(input);
    const externalWhere = this.externalWhere(input);

    const [dealoRows, dealoTotal, externalRows, externalTotal, facets] = await Promise.all([
      wantDealo ? this.prisma.job.findMany({ where: dealoWhere, orderBy: { publishedAt: 'desc' }, take, select: DEALO_JOB_SELECT }) : [],
      wantDealo ? this.prisma.job.count({ where: dealoWhere }) : 0,
      wantExternal ? this.prisma.externalJob.findMany({ where: externalWhere, orderBy: { publishedAt: 'desc' }, take, select: EXTERNAL_LIST_SELECT }) : [],
      wantExternal ? this.prisma.externalJob.count({ where: externalWhere }) : 0,
      this.facets(input, wantDealo, wantExternal),
    ]);

    const merged = [...dealoRows.map((j) => this.fromDealo(j)), ...externalRows.map((j) => this.fromExternal(j))].sort(
      (a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt),
    );
    const start = (input.page - 1) * input.pageSize;
    const total = dealoTotal + externalTotal;
    return {
      items: merged.slice(start, start + input.pageSize),
      total,
      page: input.page,
      pageSize: input.pageSize,
      hasMore: start + input.pageSize < total,
      facets,
    };
  }

  /** Counts per job type and category, ignoring the type filter so people can switch between types. */
  private async facets(input: JobSearchInput, wantDealo: boolean, wantExternal: boolean): Promise<JobSearchResult['facets']> {
    const typeCounts = new Map<JobBoardType, number>();
    const categoryCounts = new Map<string, number>();
    const add = <K>(map: Map<K, number>, key: K, n: number) => map.set(key, (map.get(key) ?? 0) + n);

    const [dealoTypes, dealoFamilies, externalTypes, externalCategories] = await Promise.all([
      wantDealo ? this.prisma.job.groupBy({ by: ['employmentType'], where: this.dealoWhere(input, false), _count: { _all: true } }) : [],
      wantDealo ? this.prisma.job.groupBy({ by: ['roleFamily'], where: this.dealoWhere({ ...input, category: undefined }), _count: { _all: true } }) : [],
      wantExternal ? this.prisma.externalJob.groupBy({ by: ['employmentType'], where: this.externalWhere(input, false), _count: { _all: true } }) : [],
      wantExternal
        ? this.prisma.externalJob.groupBy({ by: ['category'], where: this.externalWhere({ ...input, category: undefined }), _count: { _all: true } })
        : [],
    ]);
    dealoTypes.forEach((row) => add(typeCounts, asType(row.employmentType), row._count._all));
    externalTypes.forEach((row) => add(typeCounts, asType(row.employmentType), row._count._all));
    dealoFamilies.forEach((row) => add(categoryCounts, ROLE_FAMILY_LABEL[row.roleFamily], row._count._all));
    externalCategories.forEach((row) => row.category && add(categoryCounts, row.category, row._count._all));

    return {
      types: [...typeCounts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
      categories: [...categoryCounts]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 14),
    };
  }

  async featured() {
    const where = this.dealoWhere({ scope: 'dealo', page: 1, pageSize: 8 });
    const [jobs, dealo, external, latest] = await Promise.all([
      this.prisma.job.findMany({ where, orderBy: { publishedAt: 'desc' }, take: 8, select: DEALO_JOB_SELECT }),
      this.prisma.job.count({ where }),
      this.prisma.externalJob.count(),
      this.prisma.externalJob.findMany({ orderBy: { publishedAt: 'desc' }, take: 6, select: EXTERNAL_LIST_SELECT }),
    ]);
    return {
      dealo: jobs.map((j) => this.fromDealo(j)),
      latest: latest.map((j) => this.fromExternal(j)),
      counts: { dealo, external, total: dealo + external },
    };
  }

  // ------------------------------------------------------------------- detail

  async detail(listingId: string): Promise<JobListingDetail> {
    const [kind, id] = listingId.split('_');
    if (!id || !/^[a-f0-9]{24}$/.test(id)) throw new NotFoundException('This job is no longer listed');
    if (kind === 'dealo') {
      const job = await this.prisma.job.findFirst({
        where: { id, status: JobStatus.OPEN, organization: { is: { isActive: true, careersEnabled: true } } },
        select: DEALO_JOB_SELECT,
      });
      if (!job) throw new NotFoundException('This job is closed or no longer listed');
      return { ...this.fromDealo(job), description: job.description, descriptionFormat: 'text', mustHaves: job.mustHaves };
    }
    if (kind === 'ext') {
      const job = await this.prisma.externalJob.findUnique({ where: { id } });
      if (!job) throw new NotFoundException('This job is no longer listed');
      return { ...this.fromExternal(job), description: job.description, descriptionFormat: 'html', mustHaves: [] };
    }
    throw new NotFoundException('This job is no longer listed');
  }

  // ------------------------------------------------------------ saved & applied

  listSaved(user: AuthUser) {
    return this.prisma.savedJob.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 200 });
  }

  async save(listingId: string, user: AuthUser) {
    const job = await this.detail(listingId);
    return this.prisma.savedJob.upsert({
      where: { userId_listingId: { userId: user.id, listingId } },
      create: { userId: user.id, listingId, title: job.title, company: job.company },
      update: {},
    });
  }

  async unsave(listingId: string, user: AuthUser) {
    await this.prisma.savedJob.deleteMany({ where: { userId: user.id, listingId } });
    return { ok: true };
  }

  listApplications(user: AuthUser) {
    return this.prisma.jobApplicationLog.findMany({ where: { userId: user.id }, orderBy: { appliedAt: 'desc' }, take: 300 });
  }

  async track(input: TrackApplicationInput, user: AuthUser) {
    const job = await this.detail(input.listingId);
    if (input.resumeId) {
      const owned = await this.prisma.resume.count({ where: { id: input.resumeId, userId: user.id } });
      if (!owned) input = { ...input, resumeId: undefined };
    }
    return this.prisma.jobApplicationLog.upsert({
      where: { userId_listingId: { userId: user.id, listingId: input.listingId } },
      create: {
        userId: user.id,
        listingId: input.listingId,
        title: job.title,
        company: job.company,
        url: job.applyUrl,
        source: job.source.id,
        resumeId: input.resumeId,
      },
      update: { resumeId: input.resumeId, status: 'APPLIED', appliedAt: new Date() },
    });
  }

  async updateApplication(id: string, input: UpdateApplicationLogInput, user: AuthUser) {
    if (!/^[a-f0-9]{24}$/.test(id)) throw new NotFoundException('Application not found');
    const { count } = await this.prisma.jobApplicationLog.updateMany({
      where: { id, userId: user.id },
      data: { ...(input.status ? { status: input.status } : {}), ...(input.note !== undefined ? { note: input.note } : {}) },
    });
    if (!count) throw new NotFoundException('Application not found');
    return this.prisma.jobApplicationLog.findUniqueOrThrow({ where: { id } });
  }

  async removeApplication(id: string, user: AuthUser) {
    if (!/^[a-f0-9]{24}$/.test(id)) throw new NotFoundException('Application not found');
    await this.prisma.jobApplicationLog.deleteMany({ where: { id, userId: user.id } });
    return { ok: true };
  }
}
