import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  jobSearchSchema,
  saveJobSchema,
  trackApplicationSchema,
  updateApplicationLogSchema,
  type JobSearchInput,
  type TrackApplicationInput,
  type UpdateApplicationLogInput,
} from '@dealo/shared';
import { UserRole } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JobBoardService } from './job-board.service';
import { JobFeedsService } from './job-feeds.service';

@ApiTags('jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobBoardController {
  constructor(
    private readonly board: JobBoardService,
    private readonly feeds: JobFeedsService,
  ) {}

  @Public()
  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Search Dealo jobs and jobs from partner boards' })
  search(@Query(new ZodValidationPipe(jobSearchSchema)) query: JobSearchInput) {
    return this.board.search(query);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Newest easy-apply Dealo jobs, plus counts for the board' })
  featured() {
    return this.board.featured();
  }

  @Public()
  @Get('listing/:listingId')
  @ApiOperation({ summary: 'One job with its full description' })
  detail(@Param('listingId') listingId: string) {
    return this.board.detail(listingId);
  }

  // ------------------------------------------------------------- signed in

  @Get('me/saved')
  @ApiCookieAuth()
  saved(@CurrentUser() user: AuthUser) {
    return this.board.listSaved(user);
  }

  @Post('me/saved')
  @ApiCookieAuth()
  save(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(saveJobSchema)) body: { listingId: string }) {
    return this.board.save(body.listingId, user);
  }

  @Delete('me/saved/:listingId')
  @ApiCookieAuth()
  unsave(@CurrentUser() user: AuthUser, @Param('listingId') listingId: string) {
    return this.board.unsave(listingId, user);
  }

  @Get('me/applications')
  @ApiCookieAuth()
  applications(@CurrentUser() user: AuthUser) {
    return this.board.listApplications(user);
  }

  @Post('me/applications')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Record that you applied (Dealo or another site), so you can track it' })
  track(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(trackApplicationSchema)) body: TrackApplicationInput) {
    return this.board.track(body, user);
  }

  @Patch('me/applications/:id')
  @ApiCookieAuth()
  updateApplication(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateApplicationLogSchema)) body: UpdateApplicationLogInput,
  ) {
    return this.board.updateApplication(id, body, user);
  }

  @Delete('me/applications/:id')
  @ApiCookieAuth()
  removeApplication(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.board.removeApplication(id, user);
  }

  // ------------------------------------------------------------------ admin

  @Get('admin/feeds')
  @ApiCookieAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  feedStatus() {
    return this.feeds.status();
  }

  @Post('admin/sync')
  @HttpCode(200)
  @ApiCookieAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: refresh partner job feeds now (Remotive still keeps its 6-hour gap)' })
  sync() {
    return this.feeds.syncStale(true);
  }
}
