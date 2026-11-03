import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  clientAuditEventSchema,
  type ClientAuditEventInput,
} from '@dealo/shared';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditLogService } from '../common/audit-log.service';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
export class AuditController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  list(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.auditLog.list({
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
      entityType: entityType || undefined,
    });
  }

  /** Frontend client-side audit events (auth required). */
  @Post('client')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async clientEvent(
    @Body(new ZodValidationPipe(clientAuditEventSchema)) body: ClientAuditEventInput,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    await this.auditLog.record({
      action: body.action,
      entityType: body.entityType ?? 'Frontend',
      entityId: body.entityId,
      actorId: user.id,
      metadata: {
        ...(body.metadata ?? {}),
        path: body.path,
        source: 'web-client',
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { ok: true };
  }
}
