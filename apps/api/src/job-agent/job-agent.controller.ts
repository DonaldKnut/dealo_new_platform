import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { jobAgentToggleSchema, type JobAgentToggleInput } from '@dealo/shared';
import { memoryStorage } from 'multer';

import { CV_MAX_BYTES } from '../ats/applications.service';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/current-user.decorator';
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

  @Get('matches')
  @ApiOperation({ summary: 'Job Agent: jobs it found ("inbox", or a status such as APPLIED)' })
  matches(@Query('status') status: string | undefined, @CurrentUser() user: AuthUser) {
    return this.agent.listMatches(user, status && /^[A-Za-z_]{3,20}$/.test(status) ? status : undefined);
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
  @ApiOperation({ summary: 'Job Agent: the person finished an outside application on the employer site' })
  applied(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.agent.markApplied(id, user);
  }
}
