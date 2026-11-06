import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppEnv } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { collapseDuplicates, FEED_FETCHERS, FEED_INFO, type FeedSource } from './job-feeds';

const KEEP_DAYS = 30;
const CHECK_EVERY_MS = 30 * 60_000;

@Injectable()
export class JobFeedsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobFeedsService.name);
  private readonly enabled: boolean;
  private running = false;
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.enabled = config.get('JOB_FEEDS_ENABLED', { infer: true }) !== 'false';
  }

  onModuleInit() {
    if (!this.enabled) return;
    // The host may have just woken from sleep; wait for the app to settle, then catch up.
    this.timers.push(setTimeout(() => void this.syncStale(), 20_000));
    this.timers.push(setInterval(() => void this.syncStale(), CHECK_EVERY_MS));
    this.timers.forEach((t) => t.unref());
  }

  onModuleDestroy() {
    this.timers.forEach((t) => clearTimeout(t));
  }

  async status() {
    const rows = await this.prisma.jobFeedSync.findMany();
    const counts = await this.prisma.externalJob.groupBy({ by: ['source'], _count: { _all: true } });
    return (Object.keys(FEED_INFO) as FeedSource[]).map((source) => {
      const row = rows.find((r) => r.source === source);
      return {
        source,
        name: FEED_INFO[source].name,
        jobs: counts.find((c) => c.source === source)?._count._all ?? 0,
        lastRunAt: row?.lastRunAt ?? null,
        lastOkAt: row?.lastOkAt ?? null,
        lastCount: row?.lastCount ?? 0,
        lastError: row?.lastError ?? null,
      };
    });
  }

  /** Refreshes every feed that is due. `force` ignores the per-feed minimum gap (admin button). */
  async syncStale(force = false) {
    if (this.running) return { skipped: true as const };
    this.running = true;
    const results: Record<string, number | string> = {};
    try {
      for (const source of Object.keys(FEED_INFO) as FeedSource[]) {
        const row = await this.prisma.jobFeedSync.findUnique({ where: { source } });
        const due = !row?.lastRunAt || Date.now() - row.lastRunAt.getTime() >= FEED_INFO[source].minIntervalMs;
        if (!due && !(force && source !== 'remotive')) continue;
        results[source] = await this.syncOne(source);
      }
      const { count } = await this.prisma.externalJob.deleteMany({
        where: { publishedAt: { lt: new Date(Date.now() - KEEP_DAYS * 86_400_000) } },
      });
      if (count) results.pruned = count;
      return { skipped: false as const, results };
    } finally {
      this.running = false;
    }
  }

  private async syncOne(source: FeedSource): Promise<number | string> {
    const now = new Date();
    try {
      const raw = await FEED_FETCHERS[source]();
      const jobs = collapseDuplicates(raw);
      const unique = [...new Map(jobs.map((job) => [job.sourceId, job])).values()];
      const ids = unique.map((job) => job.sourceId);
      // Copies merged into another listing (same job posted per city) are removed if stored earlier.
      const merged = raw.map((job) => job.sourceId).filter((id) => !ids.includes(id));
      if (merged.length) await this.prisma.externalJob.deleteMany({ where: { source, sourceId: { in: merged } } });
      const known = new Set(
        (await this.prisma.externalJob.findMany({ where: { source, sourceId: { in: ids } }, select: { sourceId: true } })).map((r) => r.sourceId),
      );
      // Listings rarely change once posted, so known ones only get their "last seen" time refreshed.
      const fresh = unique.filter((job) => !known.has(job.sourceId));
      if (fresh.length) await this.prisma.externalJob.createMany({ data: fresh.map((job) => ({ ...job, fetchedAt: now })) });
      if (known.size) await this.prisma.externalJob.updateMany({ where: { source, sourceId: { in: [...known] } }, data: { fetchedAt: now } });
      const rawLocation = new Map(raw.map((job) => [job.sourceId, job.location]));
      for (const job of unique.filter((j) => known.has(j.sourceId) && j.location !== rawLocation.get(j.sourceId))) {
        await this.prisma.externalJob.updateMany({ where: { source, sourceId: job.sourceId }, data: { location: job.location, remote: job.remote } });
      }
      await this.prisma.jobFeedSync.upsert({
        where: { source },
        create: { source, lastRunAt: now, lastOkAt: now, lastCount: jobs.length },
        update: { lastRunAt: now, lastOkAt: now, lastCount: jobs.length, lastError: null },
      });
      this.logger.log(`${FEED_INFO[source].name}: ${jobs.length} jobs`);
      return jobs.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.jobFeedSync
        .upsert({
          where: { source },
          create: { source, lastRunAt: now, lastError: message.slice(0, 500) },
          update: { lastRunAt: now, lastError: message.slice(0, 500) },
        })
        .catch(() => undefined);
      this.logger.warn(`${FEED_INFO[source].name} sync failed: ${message}`);
      return `failed: ${message}`;
    }
  }
}
