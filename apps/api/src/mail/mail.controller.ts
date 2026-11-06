import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  mailAllUsersSchema,
  mailOneUserSchema,
  type MailAllUsersInput,
  type MailOneUserInput,
} from '@dealo/shared';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RequireVerifiedEmail } from '../common/verified-email.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MailService } from './mail.service';

@ApiTags('mail')
@Controller('mail')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@RequireVerifiedEmail()
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('one')
  mailOne(
    @Body(new ZodValidationPipe(mailOneUserSchema)) body: MailOneUserInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mailService.mailOne(body, user);
  }

  @Post('all')
  mailAll(
    @Body(new ZodValidationPipe(mailAllUsersSchema)) body: MailAllUsersInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mailService.mailAll(body, user);
  }
}
