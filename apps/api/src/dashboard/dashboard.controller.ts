import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthUser) {
    return this.dashboardService.overview(user);
  }

  @Get('requests')
  requests(@CurrentUser() user: AuthUser) {
    return this.dashboardService.requests(user);
  }
}
