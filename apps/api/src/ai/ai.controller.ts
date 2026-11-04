import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  aiBlogDraftRequestSchema,
  aiReviewSchema,
  aiScreenRequestSchema,
  type AiBlogDraftRequest,
  type AiReviewInput,
  type AiScreenRequest,
  UserRole,
} from '@dealo/shared';
import { Throttle } from '@nestjs/throttler';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AiService } from './ai.service';

const STAFF = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECRUITER, UserRole.OPERATIONS] as const;

@ApiTags('ai')
@ApiCookieAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard)
@Roles(...STAFF)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('status')
  @ApiOperation({ summary: 'Which AI provider is active (Gemini or built-in rules)' })
  status() {
    return this.ai.status();
  }

  @Post('screen')
  @HttpCode(200)
  @ApiOperation({ summary: 'Screening agent: score a professional against a job (human review required)' })
  screen(@Body(new ZodValidationPipe(aiScreenRequestSchema)) body: AiScreenRequest, @CurrentUser() user: AuthUser) {
    return this.ai.screen(body, user);
  }

  @Post('verify/:candidateId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verification agent: checklist of documents and details to confirm' })
  verify(@Param('candidateId') candidateId: string, @CurrentUser() user: AuthUser) {
    return this.ai.verify(candidateId, user);
  }

  @Post('source/:hireInquiryId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sourcing agent: keywords, outreach draft and best matches from the talent pool' })
  source(@Param('hireInquiryId') hireInquiryId: string, @CurrentUser() user: AuthUser) {
    return this.ai.source(hireInquiryId, user);
  }

  @Post('ops-summary/:siteId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Placement agent: plain-English brief for a site' })
  opsSummary(@Param('siteId') siteId: string, @CurrentUser() user: AuthUser) {
    return this.ai.opsSummary(siteId, user);
  }

  @Post('blog-draft')
  @HttpCode(200)
  @ApiOperation({ summary: 'Draft a blog article (needs GEMINI_API_KEY)' })
  blogDraft(@Body(new ZodValidationPipe(aiBlogDraftRequestSchema)) body: AiBlogDraftRequest, @CurrentUser() user: AuthUser) {
    return this.ai.blogDraft(body, user);
  }

  @Post('runs/:id/review')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept or dismiss an AI suggestion (human review)' })
  review(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(aiReviewSchema)) body: AiReviewInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ai.review(id, body.decision, body.note, user);
  }

  @Get('history/:subjectType/:subjectId')
  @ApiOperation({ summary: 'Past AI suggestions for a candidate, request or site' })
  history(@Param('subjectType') subjectType: string, @Param('subjectId') subjectId: string) {
    return this.ai.history(subjectType, subjectId);
  }
}
