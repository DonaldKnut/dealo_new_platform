import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  grantPremiumSchema,
  paymentReferenceSchema,
  resumeAiBulletsSchema,
  resumeAiCoverLetterSchema,
  resumeAiSummarySchema,
  resumeAiTailorSchema,
  saveResumeSchema,
  type ResumeData,
  type SaveResumeInput,
} from '@dealo/shared';
import { UserRole } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ResumeAiService } from './resume-ai.service';
import { ResumesService } from './resumes.service';

@ApiTags('resumes')
@Controller('resumes')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
export class ResumesController {
  constructor(
    private readonly resumes: ResumesService,
    private readonly ai: ResumeAiService,
  ) {}

  @Get('plan')
  @ApiOperation({ summary: 'Free or premium, with limits and usage' })
  async plan(@CurrentUser() user: AuthUser) {
    return { ...(await this.resumes.plan(user)), aiProvider: this.ai.provider };
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.resumes.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(saveResumeSchema)) body: SaveResumeInput) {
    return this.resumes.create(body, user);
  }

  // ---------------------------------------------------------------- AI (premium)

  @Post('ai/bullets')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async bullets(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(resumeAiBulletsSchema)) body: { role: string; company: string; text: string }) {
    await this.resumes.requirePremium(user);
    return this.ai.bullets(body);
  }

  @Post('ai/summary')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async summary(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(resumeAiSummarySchema)) body: { data: ResumeData }) {
    await this.resumes.requirePremium(user);
    return this.ai.summary(body.data);
  }

  @Post('ai/tailor')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async tailor(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(resumeAiTailorSchema)) body: { data: ResumeData; jobDescription: string },
  ) {
    await this.resumes.requirePremium(user);
    return this.ai.tailor(body.data, body.jobDescription);
  }

  @Post('ai/cover-letter')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async coverLetter(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(resumeAiCoverLetterSchema)) body: { data: ResumeData; jobTitle: string; company: string; jobDescription: string },
  ) {
    await this.resumes.requirePremium(user);
    return this.ai.coverLetter(body.data, body);
  }

  // ---------------------------------------------------------------- Premium payment

  @Post('premium/checkout')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Start a Paystack checkout for CV builder Premium' })
  checkoutPremium(@CurrentUser() user: AuthUser) {
    return this.resumes.checkoutPremium(user);
  }

  @Post('premium/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Confirm a Premium payment after returning from Paystack' })
  verifyPremium(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(paymentReferenceSchema)) body: { reference: string }) {
    return this.resumes.verifyPremium(user, body.reference);
  }

  @Post('admin/premium')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: give or remove job-seeker premium (days = 0 removes it)' })
  grant(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(grantPremiumSchema)) body: { userId: string; days: number }) {
    return this.resumes.grantPremium(body.userId, body.days, user);
  }

  // ---------------------------------------------------------------- one CV

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.resumes.get(id, user);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodValidationPipe(saveResumeSchema)) body: SaveResumeInput) {
    return this.resumes.update(id, body, user);
  }

  @Post(':id/duplicate')
  duplicate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.resumes.duplicate(id, user);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.resumes.remove(id, user);
  }

  @Post(':id/downloaded')
  @HttpCode(200)
  downloaded(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.resumes.markDownloaded(id, user);
  }

  @Post(':id/share-profile')
  @HttpCode(200)
  @ApiOperation({ summary: 'Job seekers: copy CV details into your Dealo profile' })
  share(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.resumes.shareToProfile(id, user);
  }
}
