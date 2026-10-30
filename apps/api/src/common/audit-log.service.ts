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
    metadata?: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata,
      },
    });
  }
}
