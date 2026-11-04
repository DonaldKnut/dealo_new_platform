import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  assignCoverSchema,
  attendanceSchema,
  createPlacementSchema,
  createWorkSiteSchema,
  opsNoteSchema,
  PermissionCode,
  updatePlacementSchema,
  updateWorkSiteSchema,
  type AssignCoverInput,
  type AttendanceInput,
  type CreatePlacementInput,
  type CreateWorkSiteInput,
  type OpsNoteInput,
  type UpdatePlacementInput,
  type UpdateWorkSiteInput,
  UserRole,
} from '@dealo/shared';
import { AttendanceKind } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Permissions } from '../common/permissions.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { OpsService } from './ops.service';

const OPS_STAFF = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATIONS, UserRole.RECRUITER] as const;

@ApiTags('workforce-ops')
@ApiCookieAuth()
@Controller('ops')
@UseGuards(JwtAuthGuard)
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  // ---------------------------------------------------------------- staff

  @Get('sites')
  @Roles(...OPS_STAFF)
  @Permissions(PermissionCode.PLACEMENT_MANAGE)
  @ApiOperation({ summary: 'Sites with today’s crew, standby and cover counts' })
  listSites() {
    return this.ops.listSites();
  }

  @Post('sites')
  @Roles(...OPS_STAFF)
  @Permissions(PermissionCode.PLACEMENT_MANAGE)
  @ApiOperation({ summary: 'Create a work site with a geofence' })
  createSite(
    @Body(new ZodValidationPipe(createWorkSiteSchema)) body: CreateWorkSiteInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ops.createSite(body, user);
  }

  @Patch('sites/:id')
  @Roles(...OPS_STAFF)
  @Permissions(PermissionCode.PLACEMENT_MANAGE)
  updateSite(@Param('id') id: string, @Body(new ZodValidationPipe(updateWorkSiteSchema)) body: UpdateWorkSiteInput) {
    return this.ops.updateSite(id, body);
  }

  @Get('sites/:id/console')
  @Roles(...OPS_STAFF)
  @Permissions(PermissionCode.PLACEMENT_MANAGE)
  @ApiOperation({ summary: 'Live console: roster, attendance, arrival, standby, SLA and activity feed' })
  console(@Param('id') id: string) {
    return this.ops.siteConsole(id);
  }

  @Post('sites/:id/placements')
  @Roles(...OPS_STAFF)
  @Permissions(PermissionCode.PLACEMENT_MANAGE)
  addPlacement(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createPlacementSchema)) body: CreatePlacementInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ops.addPlacement(id, body, user);
  }

  @Patch('placements/:id')
  @Roles(...OPS_STAFF)
  @Permissions(PermissionCode.PLACEMENT_MANAGE)
  updatePlacement(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePlacementSchema)) body: UpdatePlacementInput,
  ) {
    return this.ops.updatePlacement(id, body);
  }

  @Post('sites/:id/muster')
  @HttpCode(200)
  @Roles(...OPS_STAFF)
  @Permissions(PermissionCode.PLACEMENT_MANAGE)
  @ApiOperation({ summary: 'Run the placement agent’s muster now (marks no-shows, opens cover)' })
  muster(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ops.runMuster(id, user);
  }

  @Post('sites/:id/notes')
  @Roles(...OPS_STAFF)
  @Permissions(PermissionCode.PLACEMENT_MANAGE)
  note(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(opsNoteSchema)) body: OpsNoteInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ops.addNote(id, body.message, user);
  }

  @Post('covers/:id/assign')
  @HttpCode(200)
  @Roles(...OPS_STAFF)
  @Permissions(PermissionCode.PLACEMENT_MANAGE)
  @ApiOperation({ summary: 'Send a standby worker to fill a cover request' })
  assignCover(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignCoverSchema)) body: AssignCoverInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ops.assignCover(id, body.standbyPlacementId, user);
  }

  // -------------------------------------------------------------- workers

  @Get('me')
  @Roles(UserRole.TALENT)
  @ApiOperation({ summary: 'Worker: my active placements and today’s check-in state' })
  myPlacements(@CurrentUser() user: AuthUser) {
    return this.ops.myPlacements(user);
  }

  @Post('me/check-in')
  @HttpCode(200)
  @Roles(UserRole.TALENT)
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @ApiOperation({ summary: 'Worker: check in with GPS (must be inside the site geofence)' })
  checkIn(@Body(new ZodValidationPipe(attendanceSchema)) body: AttendanceInput, @CurrentUser() user: AuthUser) {
    return this.ops.recordAttendance(user, body, AttendanceKind.CHECK_IN);
  }

  @Post('me/check-out')
  @HttpCode(200)
  @Roles(UserRole.TALENT)
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  checkOut(@Body(new ZodValidationPipe(attendanceSchema)) body: AttendanceInput, @CurrentUser() user: AuthUser) {
    return this.ops.recordAttendance(user, body, AttendanceKind.CHECK_OUT);
  }
}
