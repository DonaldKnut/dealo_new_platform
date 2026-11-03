import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** Role-aware workspace overview (admin | employer | talent). */
  @Get('overview')
  overview(@CurrentUser() user: AuthUser) {
    return this.dashboardService.overview(user);
  }

  @Get('admin/ops')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.RECRUITER,
    UserRole.OPERATIONS,
  )
  adminOps(@CurrentUser() user: AuthUser) {
    return this.dashboardService.overview(user);
  }

  @Get('employer/workspace')
  @Roles(UserRole.EMPLOYER, UserRole.SUPER_ADMIN, UserRole.ADMIN)
  employerWorkspace(@CurrentUser() user: AuthUser) {
    return this.dashboardService.overview(user);
  }

  @Get('talent/workspace')
  @Roles(UserRole.TALENT, UserRole.SUPER_ADMIN, UserRole.ADMIN)
  talentWorkspace(@CurrentUser() user: AuthUser) {
    return this.dashboardService.overview(user);
  }

  @Get('requests')
  requests(@CurrentUser() user: AuthUser) {
    return this.dashboardService.requests(user);
  }

  @Get('users')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.RECRUITER,
    UserRole.OPERATIONS,
  )
  users(@CurrentUser() user: AuthUser) {
    return this.dashboardService.users(user);
  }

  @Get('organization')
  organization(@CurrentUser() user: AuthUser) {
    return this.dashboardService.organization(user);
  }
}
