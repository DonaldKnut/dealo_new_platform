import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  emailPreferenceSchema,
  type EmailPreferenceInput,
  newsletterCampaignInputSchema,
  newsletterSubscribeSchema,
  newsletterTestSchema,
  type NewsletterCampaignInput,
  type NewsletterSubscribeInput,
  type NewsletterTestInput,
} from '@dealo/shared';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { RequireVerifiedEmail } from '../common/verified-email.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EmailPreferencesService } from './email-preferences.service';
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
  constructor(
    private readonly newsletterService: NewsletterService,
    private readonly preferences: EmailPreferencesService,
  ) {}

  @Public()
  @Post('subscribe')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  subscribe(
    @Body(new ZodValidationPipe(newsletterSubscribeSchema)) body: NewsletterSubscribeInput,
  ) {
    return this.newsletterService.subscribe(body);
  }

  // ------------------------------------------------- unsubscribe (no sign-in; signed link)

  @Public()
  @Get('preferences')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  preferencesStatus(@Query('t') token: string) {
    return this.preferences.status(token ?? '');
  }

  @Public()
  @Post('unsubscribe')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  unsubscribe(@Body(new ZodValidationPipe(emailPreferenceSchema)) body: EmailPreferenceInput) {
    return this.preferences.unsubscribe(body.token, 'link', body.reason, body.campaignId);
  }

  @Public()
  @Post('resubscribe')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  resubscribe(@Body(new ZodValidationPipe(emailPreferenceSchema)) body: EmailPreferenceInput) {
    return this.preferences.resubscribe(body.token);
  }

  /** RFC 8058: mail apps POST here when someone taps their built-in "Unsubscribe" button. */
  @Public()
  @SkipThrottle()
  @Post('one-click')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async oneClick(@Query('t') token: string) {
    await this.preferences.unsubscribe(token ?? '', 'one_click');
    return { ok: true };
  }

  @Get('stats')
  @ApiCookieAuth()
  @Roles(...STAFF)
  stats() {
    return this.newsletterService.stats();
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
