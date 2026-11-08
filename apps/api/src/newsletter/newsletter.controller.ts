import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  newsletterCampaignInputSchema,
  newsletterSubscribeSchema,
  newsletterTestSchema,
  type NewsletterCampaignInput,
  type NewsletterSubscribeInput,
  type NewsletterTestInput,
} from '@dealo/shared';
import { Throttle } from '@nestjs/throttler';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { RequireVerifiedEmail } from '../common/verified-email.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { NewsletterService } from './newsletter.service';

const STAFF = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.RECRUITER,
  UserRole.OPERATIONS,
] as const;

@ApiTags('newsletter')
@Controller('newsletter')
@UseGuards(JwtAuthGuard)
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Public()
  @Post('subscribe')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  subscribe(
    @Body(new ZodValidationPipe(newsletterSubscribeSchema)) body: NewsletterSubscribeInput,
  ) {
    return this.newsletterService.subscribe(body);
  }

  @Get('campaigns')
  @ApiCookieAuth()
  @Roles(...STAFF)
  listCampaigns() {
    return this.newsletterService.listCampaigns();
  }

  @Post('campaigns')
  @ApiCookieAuth()
  @Roles(...STAFF)
  createCampaign(
    @Body(new ZodValidationPipe(newsletterCampaignInputSchema)) body: NewsletterCampaignInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.newsletterService.createCampaign(body, user);
  }

  @Post('campaigns/test')
  @ApiCookieAuth()
  @Roles(...STAFF)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  sendTest(@Body(new ZodValidationPipe(newsletterTestSchema)) body: NewsletterTestInput, @CurrentUser() user: AuthUser) {
    return this.newsletterService.sendTest(body, user);
  }

  @Post('campaigns/:id/send')
  @ApiCookieAuth()
  @Roles(...STAFF)
  @RequireVerifiedEmail()
  sendCampaign(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.newsletterService.sendCampaign(id, user);
  }

  @Get('subscribers')
  @ApiCookieAuth()
  @Roles(...STAFF)
  listSubscribers() {
    return this.newsletterService.listSubscribers();
  }
}
