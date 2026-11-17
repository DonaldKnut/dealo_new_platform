import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  JOB_BOARD_TYPES,
  type EmailApplyInput,
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
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { findApplyEmail, sendFormalApplicationEmail } from './apply-email';
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
  applyEmail: true,
  url: true,
  publishedAt: true,
} satisfies Prisma.ExternalJobSelect;

type ExternalRow = Pick<
  ExternalJob,
  | 'id'
  | 'source'
  | 'title'
  | 'company'
  | 'companyLogo'
  | 'location'
  | 'remote'
  | 'employmentType'
  | 'category'
  | 'tags'
  | 'salaryText'
  | 'summary'
  | 'applyEmail'
  | 'url'
  | 'publishedAt'
>;

const ci = (value: string) => ({ contains: value, mode: 'insensitive' as const });
const asType = (value: string): JobBoardType => ((JOB_BOARD_TYPES as readonly string[]).includes(value) ? (value as JobBoardType) : 'OTHER');

function plainSummary(text: string, max = 240) {
  const flat = text.replace(/<[^>]+>/g, ' ').replace(/\*\*|__/g, '').replace(/^\s*[-*•]\s+/gm, '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 3).replace(/\s+\S*$/, '')}…` : flat;
}

@Injectable()
export class JobBoardService {
  private readonly logger = new Logger(JobBoardService.name);
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
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
      emailApply: false,
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
      emailApply: Boolean(job.applyEmail),
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

    // With no place chosen, Nigerian listings come before remote and overseas ones; otherwise the
    // newest European feed rows would fill every first page.
    const localFirst = wantExternal && !input.location;
    const inNigeria: Prisma.ExternalJobWhereInput = { OR: NIGERIA_PLACES.map((place) => ({ location: ci(place) })) };
    const localWhere: Prisma.ExternalJobWhereInput = { AND: [externalWhere, inNigeria] };
    const restWhere: Prisma.ExternalJobWhereInput = localFirst ? { AND: [externalWhere, { NOT: inNigeria }] } : externalWhere;

    const [dealoRows, dealoTotal, localRows, localTotal, restRows, restTotal, facets] = await Promise.all([
      wantDealo ? this.prisma.job.findMany({ where: dealoWhere, orderBy: { publishedAt: 'desc' }, take, select: DEALO_JOB_SELECT }) : [],
      wantDealo ? this.prisma.job.count({ where: dealoWhere }) : 0,
      localFirst ? this.prisma.externalJob.findMany({ where: localWhere, orderBy: { publishedAt: 'desc' }, take, select: EXTERNAL_LIST_SELECT }) : [],
      localFirst ? this.prisma.externalJob.count({ where: localWhere }) : 0,
      wantExternal ? this.prisma.externalJob.findMany({ where: restWhere, orderBy: { publishedAt: 'desc' }, take, select: EXTERNAL_LIST_SELECT }) : [],
      wantExternal ? this.prisma.externalJob.count({ where: restWhere }) : 0,
      this.facets(input, wantDealo, wantExternal),
    ]);

    /** Prefer stay-on-Dealo paths: Dealo Easy Apply → Email apply → full-text feeds → aggregator snippets. */
    const FULL_TEXT = new Set(['remotive', 'jobicy', 'arbeitnow']);
    const byRetentionThenDate = (a: JobListing, b: JobListing) => {
      const rank = (j: JobListing) => {
        if (j.kind === 'dealo' || j.easyApply) return 0;
        if (j.emailApply) return 1;
        if (FULL_TEXT.has(j.source.id)) return 2;
        return 3;
      };
      const diff = rank(a) - rank(b);
      return diff !== 0 ? diff : Date.parse(b.postedAt) - Date.parse(a.postedAt);
    };
    const dealo = dealoRows.map((j) => this.fromDealo(j));
    const local = localRows.map((j) => this.fromExternal(j));
    const rest = restRows.map((j) => this.fromExternal(j));
    const merged = localFirst
      ? [...[...dealo, ...local].sort(byRetentionThenDate), ...rest.sort(byRetentionThenDate)]
      : [...dealo, ...rest].sort(byRetentionThenDate);
    const start = (input.page - 1) * input.pageSize;
    const total = dealoTotal + localTotal + restTotal;
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
    const [jobs, dealo, external, emailApply, latest] = await Promise.all([
      this.prisma.job.findMany({ where, orderBy: { publishedAt: 'desc' }, take: 8, select: DEALO_JOB_SELECT }),
      this.prisma.job.count({ where }),
      this.prisma.externalJob.count(),
      this.prisma.externalJob.count({ where: { applyEmail: { not: null } } }),
      this.prisma.externalJob.findMany({ orderBy: { publishedAt: 'desc' }, take: 6, select: EXTERNAL_LIST_SELECT }),
    ]);
    const stayOnDealo = dealo + emailApply;
    return {
      dealo: jobs.map((j) => this.fromDealo(j)),
      latest: latest.map((j) => this.fromExternal(j)),
      counts: {
        dealo,
        external,
        total: dealo + external,
        emailApply,
        /** Listings where the seeker can finish apply without leaving Dealo. */
        stayOnDealo,
        stayOnDealoShare: dealo + external > 0 ? Math.round((stayOnDealo / (dealo + external)) * 1000) / 10 : 0,
      },
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

  async recordListingDetailView() {
    const now = new Date();
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    try {
      await this.prisma.jobBoardViewDay.upsert({
        where: { day },
        create: { day, views: 1 },
        update: { views: { increment: 1 } },
      });
    } catch (error) {
      this.logger.warn(`Could not record job detail view: ${error instanceof Error ? error.message : String(error)}`);
    }
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

  /** Email Easy Apply: send formal CV + letter via the shared Job Agent mailer; stay on Dealo. */
  async applyByEmail(listingId: string, input: EmailApplyInput, file: Express.Multer.File | undefined, user: AuthUser) {
    if (!file?.buffer?.length) throw new BadRequestException('Attach your CV as a PDF');
    if (!/^application\/pdf$/i.test(file.mimetype) && !/\.pdf$/i.test(file.originalname)) {
      throw new BadRequestException('CV must be a PDF');
    }
    const [kind, id] = listingId.split('_');
    if (kind !== 'ext' || !id || !/^[a-f0-9]{24}$/.test(id)) {
      throw new BadRequestException('Email apply is only for partner board jobs that name an inbox');
    }
    const job = await this.prisma.externalJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('This job is no longer listed');
    const to = job.applyEmail || findApplyEmail(job.description);
    if (!to) throw new BadRequestException('This listing does not include an apply email');
    if (!job.applyEmail) {
      await this.prisma.externalJob.update({ where: { id }, data: { applyEmail: to } }).catch(() => undefined);
    }

    if (input.resumeId) {
      const owned = await this.prisma.resume.count({ where: { id: input.resumeId, userId: user.id } });
      if (!owned) input = { ...input, resumeId: undefined };
    }

    await sendFormalApplicationEmail(this.email, {
      to,
      title: job.title,
      who: { name: input.name, email: input.email, phone: input.phone },
      note: input.coverNote,
      file: { buffer: file.buffer, originalname: file.originalname || 'cv.pdf' },
    });

    return this.prisma.jobApplicationLog.upsert({
      where: { userId_listingId: { userId: user.id, listingId } },
      create: {
        userId: user.id,
        listingId,
        title: job.title,
        company: job.company,
        url: job.url,
        source: job.source,
        resumeId: input.resumeId,
        note: 'email_apply',
        status: 'APPLIED',
      },
      update: {
        resumeId: input.resumeId,
        status: 'APPLIED',
        appliedAt: new Date(),
        note: 'email_apply',
      },
    });
  }

  /** Retention metrics for ops: share of board inventory / tracked applies that keep seekers on Dealo. */
  async retentionStats() {
    const now = new Date();
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 29 * 86_400_000);
    const FULL_TEXT = ['remotive', 'jobicy', 'arbeitnow'] as const;
    const [
      dealo,
      external,
      emailApply,
      fullText,
      fullTextWithEmail,
      emailAppliedLogs,
      dealoAppliedLogs,
      dealoAtsApplications,
      totalAppliedLogs,
      bySource,
      detailViews,
    ] = await Promise.all([
      this.prisma.job.count({ where: this.dealoWhere({ scope: 'dealo', page: 1, pageSize: 8 }) }),
      this.prisma.externalJob.count(),
      this.prisma.externalJob.count({ where: { applyEmail: { not: null } } }),
      this.prisma.externalJob.count({ where: { source: { in: [...FULL_TEXT] } } }),
      this.prisma.externalJob.count({ where: { source: { in: [...FULL_TEXT] }, applyEmail: { not: null } } }),
      this.prisma.jobApplicationLog.count({ where: { note: 'email_apply', appliedAt: { gte: since } } }),
      this.prisma.jobApplicationLog.count({ where: { source: 'dealo', appliedAt: { gte: since } } }),
      this.prisma.application.count({ where: { createdAt: { gte: since } } }),
      this.prisma.jobApplicationLog.count({ where: { appliedAt: { gte: since } } }),
      this.prisma.externalJob.groupBy({ by: ['source'], _count: { _all: true } }),
      this.prisma.jobBoardViewDay.aggregate({ where: { day: { gte: since } }, _sum: { views: true } }),
    ]);
    const stayOnDealo = dealo + emailApply;
    const inventory = dealo + external;
    const completedOnDealo = emailAppliedLogs + dealoAtsApplications;
    const completedTrackedOnDealo = emailAppliedLogs + dealoAppliedLogs;
    return {
      inventory: {
        dealo,
        external,
        emailApply,
        fullTextPartners: fullText,
        fullTextWithEmailApply: fullTextWithEmail,
        stayOnDealo,
        stayOnDealoSharePct: inventory > 0 ? Math.round((stayOnDealo / inventory) * 1000) / 10 : 0,
        bySource: Object.fromEntries(bySource.map((row) => [row.source, row._count._all])),
      },
      /** Aggregate detail-request conversion proxy; repeat requests are counted, not deduplicated visitors. */
      applicationsLast30Days: {
        total: totalAppliedLogs,
        dealo: dealoAppliedLogs,
        dealoAtsApplications,
        emailApply: emailAppliedLogs,
        completedOnDealo,
        completedOnDealoSharePct:
          totalAppliedLogs > 0 ? Math.round((completedTrackedOnDealo / totalAppliedLogs) * 1000) / 10 : 0,
        detailViews: detailViews._sum.views ?? 0,
        completedOnDealoPer100DetailViews:
          (detailViews._sum.views ?? 0) > 0 ? Math.round((completedOnDealo / (detailViews._sum.views ?? 1)) * 100_000) / 1000 : 0,
      },
      deferred: ['email bounce/complaint rates', 'reply tracking'],
      guidance: {
        prefer: ['Remotive', 'Jobicy', 'Arbeitnow', 'partner ATS sync (PUT /ats-api/jobs/sync)', 'Dealo ATS posts'],
        avoid: ['Scraping Jooble/Indeed/LinkedIn for HR emails', 'Auto-submit third-party forms without Assist pause rules'],
      },
    };
  }
}
