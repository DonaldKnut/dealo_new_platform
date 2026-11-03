import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import type { CreateApiKeyInput, UpdateApiKeyInput } from '@dealo/shared';
import { ApiKeyEnvironment } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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

  list() {
    return this.prisma.apiKey.findMany({
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
    });
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
