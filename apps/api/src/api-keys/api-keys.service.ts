import {
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import type { CreateApiKeyInput, UpdateApiKeyInput } from '@dealo/shared';
import { ApiKeyEnvironment } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKeyRateLimiter } from './api-key-rate-limiter';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_USAGE_ROWS = 20_000;

function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

function generatePlaintextKey(environment: ApiKeyEnvironment): { plaintext: string; prefix: string } {
  const token = randomBytes(24).toString('base64url');
  const prefix = environment === ApiKeyEnvironment.LIVE ? 'dk_live_' : 'dk_test_';
  const plaintext = `${prefix}${token}`;
  return { plaintext, prefix: plaintext.slice(0, 12) };
}

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimiter: ApiKeyRateLimiter,
  ) {}

  async create(input: CreateApiKeyInput, actor: AuthUser) {
    const { plaintext, prefix } = generatePlaintextKey(
      input.environment as ApiKeyEnvironment,
    );
    const keyHash = hashApiKey(plaintext);

    const record = await this.prisma.apiKey.create({
      data: {
        name: input.name,
        keyPrefix: prefix,
        keyHash,
        environment: input.environment as ApiKeyEnvironment,
        plan: input.plan,
        scopes: input.scopes,
        rateLimitPerMin: input.rateLimitPerMin,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        organizationId: input.organizationId ?? null,
        createdByUserId: actor.id,
      },
    });

    return {
      id: record.id,
      name: record.name,
      keyPrefix: record.keyPrefix,
      environment: record.environment,
      plan: record.plan,
      scopes: record.scopes,
      rateLimitPerMin: record.rateLimitPerMin,
      isActive: record.isActive,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      /** Shown only once — store securely. */
      apiKey: plaintext,
    };
  }

  async list() {
    const [keys, counts] = await Promise.all([
      this.prisma.apiKey.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          environment: true,
          plan: true,
          scopes: true,
          rateLimitPerMin: true,
          isActive: true,
          expiresAt: true,
          lastUsedAt: true,
          organizationId: true,
          createdByUserId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.apiUsageLog.groupBy({
        by: ['apiKeyId'],
        where: { createdAt: { gte: new Date(Date.now() - DAY_MS) } },
        _count: { _all: true },
      }),
    ]);

    const byKey = new Map(counts.map((row) => [row.apiKeyId, row._count._all]));
    return keys.map((key) => ({ ...key, requests24h: byKey.get(key.id) ?? 0 }));
  }

  async usage(id: string, days: number) {
    const key = await this.prisma.apiKey.findUnique({
      where: { id },
      select: { id: true, name: true, keyPrefix: true, rateLimitPerMin: true, plan: true },
    });
    if (!key) {
      throw new NotFoundException('API key not found');
    }

    const windowDays = Math.min(Math.max(Math.trunc(days) || 7, 1), 90);
    const from = new Date(Date.now() - windowDays * DAY_MS);
    const logs = await this.prisma.apiUsageLog.findMany({
      where: { apiKeyId: id, createdAt: { gte: from } },
      orderBy: { createdAt: 'desc' },
      take: MAX_USAGE_ROWS,
      select: { method: true, path: true, statusCode: true, latencyMs: true, createdAt: true },
    });

    const daily = new Map<string, { requests: number; errors: number }>();
    for (let i = windowDays - 1; i >= 0; i -= 1) {
      daily.set(new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10), {
        requests: 0,
        errors: 0,
      });
    }

    const endpoints = new Map<string, number>();
    let errors = 0;
    let rateLimited = 0;
    let latencyTotal = 0;

    for (const log of logs) {
      const bucket = daily.get(log.createdAt.toISOString().slice(0, 10));
      const isError = log.statusCode >= 400;
      if (bucket) {
        bucket.requests += 1;
        if (isError) bucket.errors += 1;
      }
      if (isError) errors += 1;
      if (log.statusCode === 429) rateLimited += 1;
      latencyTotal += log.latencyMs;
      const endpoint = `${log.method} ${log.path}`;
      endpoints.set(endpoint, (endpoints.get(endpoint) ?? 0) + 1);
    }

    return {
      key,
      from: from.toISOString(),
      days: windowDays,
      truncated: logs.length >= MAX_USAGE_ROWS,
      totals: {
        requests: logs.length,
        errors,
        rateLimited,
        avgLatencyMs: logs.length ? Math.round(latencyTotal / logs.length) : 0,
      },
      daily: [...daily.entries()].map(([date, value]) => ({ date, ...value })),
      topEndpoints: [...endpoints.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([endpoint, requests]) => ({ endpoint, requests })),
      recent: logs.slice(0, 25),
    };
  }

  /** Applies the per-key sliding window; rejected calls are still metered. */
  enforceRateLimit(principal: AuthUser, method: string, path: string) {
    if (!principal.apiKeyId || !principal.rateLimitPerMin) {
      return;
    }
    try {
      this.rateLimiter.consume(principal.apiKeyId, principal.rateLimitPerMin);
    } catch (error) {
      if (error instanceof HttpException) {
        void this.logUsage({
          apiKeyId: principal.apiKeyId,
          method,
          path,
          statusCode: error.getStatus(),
          latencyMs: 0,
        }).catch(() => undefined);
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateApiKeyInput) {
    const existing = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    return this.prisma.apiKey.update({
      where: { id },
      data: {
        name: input.name,
        plan: input.plan,
        scopes: input.scopes,
        rateLimitPerMin: input.rateLimitPerMin,
        isActive: input.isActive,
        expiresAt:
          input.expiresAt === undefined
            ? undefined
            : input.expiresAt === null
              ? null
              : new Date(input.expiresAt),
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        environment: true,
        plan: true,
        scopes: true,
        rateLimitPerMin: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async revoke(id: string) {
    const existing = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    return { id, revoked: true };
  }

  async authenticateBearer(token: string): Promise<AuthUser> {
    if (!token.startsWith('dk_live_') && !token.startsWith('dk_test_')) {
      throw new UnauthorizedException('Invalid API key');
    }

    const keyHash = hashApiKey(token);
    const record = await this.prisma.apiKey.findUnique({ where: { keyHash } });

    if (!record || !record.isActive) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
      throw new ForbiddenException('API key expired');
    }

    void this.prisma.apiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return {
      id: `apikey:${record.id}`,
      email: `apikey:${record.keyPrefix}***`,
      firstName: record.name,
      lastName: 'API',
      roles: [],
      permissions: [],
      authType: 'api_key',
      scopes: record.scopes,
      apiKeyId: record.id,
      apiKeyPlan: record.plan,
      rateLimitPerMin: record.rateLimitPerMin,
    };
  }

  async logUsage(input: {
    apiKeyId: string;
    method: string;
    path: string;
    statusCode: number;
    latencyMs: number;
  }) {
    await this.prisma.apiUsageLog.create({
      data: input,
    });
  }
}
