import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    action: string;
    entityType: string;
    entityId?: string;
    actorId?: string;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        actorId: params.actorId,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  list(params?: { take?: number; skip?: number; entityType?: string }) {
    const take = Math.min(params?.take ?? 100, 200);
    const skip = params?.skip ?? 0;
    return this.prisma.auditLog.findMany({
      where: params?.entityType ? { entityType: params.entityType } : undefined,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}
