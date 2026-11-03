import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  hireInquirySchema,
  hireInquiryStatusUpdateSchema,
  type HireInquiryInput,
  type HireInquiryStatusUpdate,
  PermissionCode,
} from '@dealo/shared';
import { Throttle } from '@nestjs/throttler';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/current-user.decorator';
import { Permissions } from '../common/permissions.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HireInquiryService } from './hire-inquiry.service';

@ApiTags('hire-inquiries')
@Controller('hire-inquiries')
@UseGuards(JwtAuthGuard)
export class HireInquiryController {
  constructor(private readonly hireInquiryService: HireInquiryService) {}

  @Public()
  @Post()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  create(@Body(new ZodValidationPipe(hireInquirySchema)) body: HireInquiryInput) {
    return this.hireInquiryService.create(body);
  }

  @Get()
  @ApiCookieAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECRUITER, UserRole.OPERATIONS)
  @Permissions(PermissionCode.HIRE_INQUIRY_MANAGE)
  list() {
    return this.hireInquiryService.list();
  }

  @Patch(':id/status')
  @ApiCookieAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECRUITER, UserRole.OPERATIONS)
  @Permissions(PermissionCode.HIRE_INQUIRY_MANAGE)
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(hireInquiryStatusUpdateSchema)) body: HireInquiryStatusUpdate,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hireInquiryService.updateStatus(id, body, user.id);
  }
}
