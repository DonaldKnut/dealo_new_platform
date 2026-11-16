import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { jobAgentToggleSchema, type JobAgentToggleInput } from '@dealo/shared';
import { UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';

import { CV_MAX_BYTES } from '../ats/applications.service';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JobAgentService } from './job-agent.service';

@ApiTags('job-agent')
@ApiCookieAuth()
@Controller('job-agent')
export class JobAgentController {
  constructor(private readonly agent: JobAgentService) {}

  @Get()
  @ApiOperation({ summary: 'Job Agent: settings, plan, status, stats and recent runs' })
  overview(@CurrentUser() user: AuthUser) {
    return this.agent.overview(user);
  }

  @Put('settings')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Job Agent: save what to hunt for and how freely to apply' })
  save(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.agent.saveSettings(body, user);
  }

  @Put('assist-policy')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Job Agent: personal Assist allow/deny hosts and daily Assist cap' })
  saveAssistPolicy(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.agent.saveAssistPolicy(body, user);
  }

  @Post('cv')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Job Agent: the CV file (PDF or Word, "cv" field) it attaches to applications' })
  @UseInterceptors(FileInterceptor('cv', { storage: memoryStorage(), limits: { fileSize: CV_MAX_BYTES } }))
  uploadCv(@UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: AuthUser) {
    return this.agent.uploadCv(file, user);
  }

  @Post('toggle')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Job Agent: switch on (needs consent the first time) or off' })
  toggle(@Body(new ZodValidationPipe(jobAgentToggleSchema)) body: JobAgentToggleInput, @CurrentUser() user: AuthUser) {
    return this.agent.toggle(body, user);
  }

  @Post('run')
  @HttpCode(202)
  @Throttle({ default: { limit: 4, ttl: 60_000 } })
  @ApiOperation({ summary: 'Job Agent: search now instead of waiting for the next scheduled run' })
  run(@CurrentUser() user: AuthUser) {
    return this.agent.runNow(user);
  }

  @Get('vault')
  @ApiOperation({ summary: 'Apply vault: structured identity, history, Q&A and preferred CV' })
  getVault(@CurrentUser() user: AuthUser) {
    return this.agent.getVault(user);
  }

  @Put('vault')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Apply vault: update identity, work history, education, links, work-auth, salary, Q&A' })
  updateVault(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.agent.updateVault(body, user);
  }

  @Post('vault/regenerate-drafts')
  @HttpCode(200)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @ApiOperation({ summary: 'Apply vault: regenerate AI draft answers from preferred resume + saved Q&A' })
  regenerateDrafts(@CurrentUser() user: AuthUser) {
    return this.agent.regenerateVaultDrafts(user);
  }

  @Get('matches')
  @ApiOperation({ summary: 'Job Agent: jobs it found (inbox | auto | assist | APPLIED | SKIPPED | FAILED)' })
  matches(@Query('status') status: string | undefined, @CurrentUser() user: AuthUser) {
    return this.agent.listMatches(user, status && /^[A-Za-z_]{3,20}$/.test(status) ? status : undefined);
  }

  @Get('assist')
  @ApiOperation({ summary: 'Job Agent: pending site_assisted matches ready for supervised Assist' })
  assistQueue(@CurrentUser() user: AuthUser) {
    return this.agent.listPendingAssisted(user);
  }

  @Post('matches/batch-approve')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Job Agent: approve and send multiple SUGGESTED auto-channel matches' })
  batchApprove(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.agent.batchApprove(body, user);
  }

  @Post('matches/:id/approve')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Job Agent: send a suggested application now' })
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.agent.approve(id, user);
  }

  @Post('matches/:id/skip')
  @HttpCode(200)
  skip(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.agent.skip(id, user);
  }

  @Post('matches/:id/applied')
  @HttpCode(200)
  @ApiOperation({ summary: 'Job Agent: the person finished an Assist / outside application' })
  applied(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.agent.markApplied(id, user);
  }

  @Get('assist/:id/session')
  @ApiOperation({
    summary: 'Supervised Apply: vault + drafts + fill hints + site policy for one assisted match',
  })
  assistSession(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.agent.getAssistSession(id, user);
  }

  @Post('assist/:id/map-fields')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Supervised Apply: LLM/rules mapping for ambiguous form fields' })
  mapFields(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.agent.mapAssistFields(id, body, user);
  }

  @Post('matches/:id/assist-report')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Supervised Apply: extension reports fill outcome / field coverage; may mark applied',
  })
  assistReport(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.agent.reportAssist(id, body, user);
  }

  @Post('device-token')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Short-lived device token (dja_…) for the browser Assist extension' })
  deviceToken(@CurrentUser() user: AuthUser) {
    return this.agent.createDeviceToken(user);
  }

  @Post('credits/checkout')
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @ApiOperation({ summary: 'Job Agent: buy a pay-as-you-go apply credit pack (Paystack)' })
  checkoutCredits(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.agent.checkoutCreditPack(body, user);
  }

  @Post('credits/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Job Agent: verify a credit-pack payment after Paystack return' })
  verifyCredits(@Body() body: { reference?: string }, @CurrentUser() user: AuthUser) {
    if (!body.reference?.trim()) throw new BadRequestException('Missing payment reference');
    return this.agent.verifyCreditPack(user, body.reference.trim());
  }

  @Post('credits/grant')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Staff: grant or refund prepaid Job Agent apply credits' })
  grantCredits(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.agent.grantApplyCredits(body, user);
  }

  @Get('ops/host-frequency')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATIONS)
  @ApiOperation({
    summary: 'Staff/debug: ExternalJob URL host frequency to prioritize next ATS adapters',
  })
  hostFrequency(@Query('limit') limit: string | undefined) {
    const n = limit ? Number(limit) : 25;
    return this.agent.externalJobHostFrequency(Number.isFinite(n) ? n : 25);
  }

  @Get('ops/assist-abuse')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATIONS)
  @ApiOperation({ summary: 'Staff: Assist report outcomes / pauses / coverage for listing safety' })
  assistAbuse(@Query('days') days: string | undefined, @CurrentUser() user: AuthUser) {
    const n = days ? Number(days) : 7;
    return this.agent.assistAbuseMetrics(user, Number.isFinite(n) ? n : 7);
  }

  @Get('extension')
  @ApiOperation({ summary: 'Apply Copilot zip availability (sideload until Chrome Web Store listing)' })
  extensionInfo() {
    return this.agent.extensionDownloadInfo();
  }

  @Get('extension/download')
  @Header('Cache-Control', 'private, max-age=300')
  @ApiOperation({ summary: 'Download packaged Apply Copilot zip for Load unpacked / sideload' })
  downloadExtension(): StreamableFile {
    const { stream, bytes, fileName } = this.agent.openExtensionZipStream();
    return new StreamableFile(stream, {
      type: 'application/zip',
      disposition: `attachment; filename="${fileName}"`,
      length: bytes,
    });
  }
}
