import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { ApiKeyPlan, ApiPlanConfig } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const CONFIG_TTL_MS = 60_000;
const QUOTA_RESYNC_MS = 60_000;

function monthStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Cached plan configs plus a per-key monthly quota counter (resynced from usage logs). */
@Injectable()
export class ApiPlansService {
  private configs: Map<ApiKeyPlan, ApiPlanConfig> | null = null;
  private configsLoadedAt = 0;
  private readonly monthlyCounts = new Map<string, { month: number; count: number; syncedAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async getConfig(plan: ApiKeyPlan): Promise<ApiPlanConfig | undefined> {
    if (!this.configs || Date.now() - this.configsLoadedAt > CONFIG_TTL_MS) {
      const rows = await this.prisma.apiPlanConfig.findMany();
      this.configs = new Map(rows.map((row) => [row.plan, row]));
      this.configsLoadedAt = Date.now();
    }
    return this.configs.get(plan);
  }

  invalidate() {
    this.configs = null;
  }

  async enforceMonthlyQuota(apiKeyId: string, plan: ApiKeyPlan) {
    const config = await this.getConfig(plan);
    if (!config) return;

    const start = monthStart();
    const month = start.getTime();
    let entry = this.monthlyCounts.get(apiKeyId);
    if (!entry || entry.month !== month || Date.now() - entry.syncedAt > QUOTA_RESYNC_MS) {
      const count = await this.prisma.apiUsageLog.count({
        where: { apiKeyId, createdAt: { gte: start } },
      });
      entry = { month, count, syncedAt: Date.now() };
      this.monthlyCounts.set(apiKeyId, entry);
    }

    if (entry.count >= config.monthlyQuota) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Monthly quota of ${config.monthlyQuota.toLocaleString()} requests for the ${config.name} plan is used up. Upgrade your plan or wait until next month.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    entry.count += 1;
  }
}
