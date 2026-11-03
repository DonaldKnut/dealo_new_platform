import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  candidateInputSchema,
  shortlistEntryInputSchema,
  shortlistInputSchema,
  type CandidateInput,
  type ShortlistEntryInput,
  type ShortlistInput,
} from '@dealo/shared';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CandidatesService } from './candidates.service';

const STAFF = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.RECRUITER,
  UserRole.OPERATIONS,
] as const;

@ApiTags('candidates')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get('candidates')
  @Roles(...STAFF, UserRole.EMPLOYER)
  listCandidates() {
    return this.candidatesService.listCandidates();
  }

  @Post('candidates')
  @Roles(...STAFF)
  createCandidate(
    @Body(new ZodValidationPipe(candidateInputSchema)) body: CandidateInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.candidatesService.createCandidate(body, user.id);
  }

  @Patch('candidates/:id')
  @Roles(...STAFF)
  updateCandidate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(candidateInputSchema)) body: CandidateInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.candidatesService.updateCandidate(id, body, user.id);
  }

  @Get('shortlists')
  @Roles(...STAFF, UserRole.EMPLOYER)
  listShortlists() {
    return this.candidatesService.listShortlists();
  }

  @Post('shortlists')
  @Roles(...STAFF)
  createShortlist(
    @Body(new ZodValidationPipe(shortlistInputSchema)) body: ShortlistInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.candidatesService.createShortlist(body, user.id);
  }

  @Post('shortlists/:id/entries')
  @Roles(...STAFF)
  addEntry(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(shortlistEntryInputSchema)) body: ShortlistEntryInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.candidatesService.addEntry(id, body, user.id);
  }

  @Delete('shortlists/:id/entries/:entryId')
  @Roles(...STAFF)
  removeEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.candidatesService.removeEntry(id, entryId, user.id);
  }
}
