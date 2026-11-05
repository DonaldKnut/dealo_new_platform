import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  aiReviewSchema,
  applicationNoteSchema,
  applySchema,
  createWorkspaceSchema,
  inviteMemberSchema,
  jobInputSchema,
  jobStatusSchema,
  moveStageSchema,
  rejectApplicationsSchema,
  updateApplicationSchema,
  updateMemberRoleSchema,
  updateWorkspaceSchema,
  type ApplyInput,
  type CreateWorkspaceInput,
  type InviteMemberInput,
  type JobInput,
  type UpdateWorkspaceInput,
} from '@dealo/shared';
import { JobStatus, UserRole, WorkspaceRole } from '@prisma/client';
import type { Response } from 'express';
import { memoryStorage } from 'multer';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ApplicationsService, CV_MAX_BYTES } from './applications.service';
import { JobsService } from './jobs.service';
import { WorkspacesService } from './workspaces.service';

const cvUpload = FileInterceptor('cv', { storage: memoryStorage(), limits: { fileSize: CV_MAX_BYTES } });

export function sendFile(res: Response, file: { fileName: string; mimeType: string; data: Buffer }) {
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', String(file.data.length));
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(file.data);
}

@ApiTags('ats')
@Controller('ats')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
export class AtsController {
  constructor(
    private readonly workspaces: WorkspacesService,
    private readonly jobs: JobsService,
    private readonly applications: ApplicationsService,
  ) {}

  // -------------------------------------------------------------- workspaces

  @Get('workspaces')
  @ApiOperation({ summary: 'Workspaces you belong to' })
  mine(@CurrentUser() user: AuthUser) {
    return this.workspaces.mine(user);
  }

  @Get('workspaces/slug-check')
  slugCheck(@Query('slug') slug = '') {
    return this.workspaces.slugAvailable(slug);
  }

  @Post('workspaces')
  @ApiOperation({ summary: 'Create a hiring workspace (you become the owner)' })
  create(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(createWorkspaceSchema)) body: CreateWorkspaceInput) {
    return this.workspaces.create(body, user);
  }

  @Get('workspaces/:orgId')
  detail(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string) {
    return this.workspaces.detail(orgId, user);
  }

  @Patch('workspaces/:orgId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(updateWorkspaceSchema)) body: UpdateWorkspaceInput,
  ) {
    return this.workspaces.update(orgId, body, user);
  }

  @Post('workspaces/:orgId/invites')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  invite(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: InviteMemberInput,
  ) {
    return this.workspaces.invite(orgId, body, user);
  }

  @Delete('workspaces/:orgId/invites/:inviteId')
  revokeInvite(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string, @Param('inviteId') inviteId: string) {
    return this.workspaces.revokeInvite(orgId, inviteId, user);
  }

  @Patch('workspaces/:orgId/members/:memberId')
  changeRole(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(updateMemberRoleSchema)) body: { role: WorkspaceRole },
  ) {
    return this.workspaces.changeRole(orgId, memberId, body.role, user);
  }

  @Delete('workspaces/:orgId/members/:memberId')
  removeMember(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string, @Param('memberId') memberId: string) {
    return this.workspaces.removeMember(orgId, memberId, user);
  }

  @Public()
  @Get('invites/:token')
  @ApiOperation({ summary: 'Public: preview a workspace invite' })
  previewInvite(@Param('token') token: string) {
    return this.workspaces.previewInvite(token);
  }

  @Post('invites/:token/accept')
  @HttpCode(200)
  acceptInvite(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    return this.workspaces.acceptInvite(token, user);
  }

  // -------------------------------------------------------------------- jobs

  @Get('workspaces/:orgId/jobs')
  listJobs(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string) {
    return this.jobs.list(orgId, user);
  }

  @Post('workspaces/:orgId/jobs')
  createJob(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string, @Body(new ZodValidationPipe(jobInputSchema)) body: JobInput) {
    return this.jobs.create(orgId, body, user);
  }

  @Post('workspaces/:orgId/jobs/from-inquiry/:inquiryId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECRUITER, UserRole.OPERATIONS)
  @ApiOperation({ summary: 'Dealo staff: turn a hiring request into a draft job' })
  fromInquiry(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string, @Param('inquiryId') inquiryId: string) {
    return this.jobs.fromHireInquiry(orgId, inquiryId, user);
  }

  @Get('workspaces/:orgId/jobs/:jobId')
  getJob(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string, @Param('jobId') jobId: string) {
    return this.jobs.get(orgId, jobId, user);
  }

  @Patch('workspaces/:orgId/jobs/:jobId')
  updateJob(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Param('jobId') jobId: string,
    @Body(new ZodValidationPipe(jobInputSchema)) body: JobInput,
  ) {
    return this.jobs.update(orgId, jobId, body, user);
  }

  @Post('workspaces/:orgId/jobs/:jobId/status')
  @HttpCode(200)
  setJobStatus(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Param('jobId') jobId: string,
    @Body(new ZodValidationPipe(jobStatusSchema)) body: { status: JobStatus },
  ) {
    return this.jobs.setStatus(orgId, jobId, body.status, user);
  }

  @Post('workspaces/:orgId/jobs/:jobId/duplicate')
  duplicateJob(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string, @Param('jobId') jobId: string) {
    return this.jobs.duplicate(orgId, jobId, user);
  }

  @Get('workspaces/:orgId/jobs/:jobId/board')
  @ApiOperation({ summary: 'Pipeline board for one job' })
  board(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Param('jobId') jobId: string,
    @Query('status') status?: string,
  ) {
    return this.applications.board(orgId, jobId, user, status);
  }

  @Post('workspaces/:orgId/jobs/:jobId/applications')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(cvUpload)
  addApplicant(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Param('jobId') jobId: string,
    @Body(new ZodValidationPipe(applySchema)) body: ApplyInput,
    @UploadedFile() file?: Express.Multer.File,
    @Query('source') source?: string,
  ) {
    const allowed = ['manual', 'referral', 'walk-in', 'linkedin', 'jobberman', 'whatsapp', 'other'];
    return this.applications.addManual(orgId, jobId, body, user, file, allowed.includes(source ?? '') ? source : 'manual');
  }

  // ------------------------------------------------------------ applications

  @Post('workspaces/:orgId/applications/move')
  @HttpCode(200)
  move(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(moveStageSchema)) body: { applicationIds: string[]; stage: string },
  ) {
    return this.applications.moveStage(orgId, body.applicationIds, body.stage, user);
  }

  @Post('workspaces/:orgId/applications/reject')
  @HttpCode(200)
  reject(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(rejectApplicationsSchema)) body: { applicationIds: string[]; notify: boolean; reason?: string },
  ) {
    return this.applications.reject(orgId, body.applicationIds, body.notify, body.reason, user);
  }

  @Get('workspaces/:orgId/applications/:id')
  application(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string, @Param('id') id: string) {
    return this.applications.detail(orgId, id, user);
  }

  @Patch('workspaces/:orgId/applications/:id')
  updateApplication(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateApplicationSchema)) body: { rating?: number | null; tags?: string[] },
  ) {
    return this.applications.update(orgId, id, body, user);
  }

  @Post('workspaces/:orgId/applications/:id/restore')
  @HttpCode(200)
  restore(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string, @Param('id') id: string) {
    return this.applications.restore(orgId, id, user);
  }

  @Post('workspaces/:orgId/applications/:id/notes')
  addNote(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(applicationNoteSchema)) body: { body: string },
  ) {
    return this.applications.addNote(orgId, id, body.body, user);
  }

  @Post('workspaces/:orgId/applications/:id/ai')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  rerunAi(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string, @Param('id') id: string) {
    return this.applications.rerunAi(orgId, id, user);
  }

  @Post('workspaces/:orgId/applications/:id/ai/review')
  @HttpCode(200)
  reviewAi(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(aiReviewSchema)) body: { decision: 'ACCEPTED' | 'DISMISSED' },
  ) {
    return this.applications.reviewAi(orgId, id, body.decision, user);
  }

  @Get('workspaces/:orgId/files/:fileId')
  async file(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string, @Param('fileId') fileId: string, @Res() res: Response) {
    sendFile(res, await this.applications.readFile(orgId, fileId, user));
  }
}

@ApiTags('careers')
@Controller('careers')
export class CareersController {
  constructor(private readonly applications: ApplicationsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Public: every open job (for sitemaps)' })
  index() {
    return this.applications.careersIndex();
  }

  @Public()
  @Get(':orgSlug')
  @ApiOperation({ summary: 'Public: a company careers page with open jobs' })
  careers(@Param('orgSlug') orgSlug: string) {
    return this.applications.careers(orgSlug);
  }

  @Public()
  @Get(':orgSlug/:jobSlug')
  job(@Param('orgSlug') orgSlug: string, @Param('jobSlug') jobSlug: string) {
    return this.applications.careersJob(orgSlug, jobSlug);
  }

  @Public()
  @Post(':orgSlug/:jobSlug/apply')
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Public: apply for a job (CV as the "cv" file field)' })
  @UseInterceptors(cvUpload)
  apply(
    @Param('orgSlug') orgSlug: string,
    @Param('jobSlug') jobSlug: string,
    @Body(new ZodValidationPipe(applySchema)) body: ApplyInput,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.applications.apply(orgSlug, jobSlug, body, file);
  }
}
