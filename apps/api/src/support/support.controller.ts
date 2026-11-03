import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  supportTicketCreateSchema,
  supportTicketReplySchema,
  supportTicketStatusSchema,
  type SupportTicketCreateInput,
  type SupportTicketReplyInput,
  type SupportTicketStatusInput,
} from '@dealo/shared';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SupportService } from './support.service';

@ApiTags('support')
@Controller('support')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  create(
    @Body(new ZodValidationPipe(supportTicketCreateSchema)) body: SupportTicketCreateInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.supportService.create(body, user);
  }

  @Get('tickets')
  list(@CurrentUser() user: AuthUser) {
    return this.supportService.list(user);
  }

  @Get('tickets/:id')
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.supportService.getOne(id, user);
  }

  @Post('tickets/:id/replies')
  reply(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(supportTicketReplySchema)) body: SupportTicketReplyInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.supportService.reply(id, body, user);
  }

  @Patch('tickets/:id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECRUITER, UserRole.OPERATIONS)
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(supportTicketStatusSchema)) body: SupportTicketStatusInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.supportService.updateStatus(id, body, user);
  }
}
