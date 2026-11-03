import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  ApiScope,
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
import { RequireScopes } from '../common/scopes.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { HireInquiryService } from './hire-inquiry.service';

@ApiTags('hire-inquiries')
@Controller('hire-inquiries')
export class HireInquiryController {
  constructor(private readonly hireInquiryService: HireInquiryService) {}

  @Public()
  @Post()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Submit a hire inquiry',
    description:
      'Public web form endpoint. Partners may also call with a Bearer API key that includes hire-inquiries:write.',
  })
  @ApiBearerAuth('api_key')
  @RequireScopes(ApiScope.HIRE_INQUIRIES_WRITE)
  create(
    @Body(new ZodValidationPipe(hireInquirySchema)) body: HireInquiryInput,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.hireInquiryService.create(body, user);
  }

  @Get()
  @ApiCookieAuth()
  @ApiBearerAuth('api_key')
  @ApiOperation({ summary: 'List hire inquiries (staff JWT or API key with hire-inquiries:read)' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECRUITER, UserRole.OPERATIONS)
  @Permissions(PermissionCode.HIRE_INQUIRY_MANAGE)
  @RequireScopes(ApiScope.HIRE_INQUIRIES_READ)
  list(@CurrentUser() user: AuthUser) {
    return this.hireInquiryService.list(user);
  }

  @Patch(':id/status')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Update hire inquiry status (staff only)' })
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
