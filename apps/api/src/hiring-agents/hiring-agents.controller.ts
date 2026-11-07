import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  decideAgentTaskSchema,
  runAgentSchema,
  updateAgentSchema,
  type DecideAgentTaskInput,
  type RunAgentInput,
  type UpdateAgentInput,
} from '@dealo/shared';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { HiringAgentsService } from './hiring-agents.service';

const verifySchema = z.object({ reference: z.string().trim().min(8).max(80) });
const planSchema = z.object({ days: z.coerce.number().int().min(0).max(3650) });

@ApiTags('hiring-agents')
@Controller('ats')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
export class HiringAgentsController {
  constructor(private readonly agents: HiringAgentsService) {}

  @Get('workspaces/:orgId/agents')
  @ApiOperation({ summary: 'Hiring Agents: plan, usage, each agent’s settings and results' })
  overview(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string) {
    return this.agents.overview(orgId, user);
  }

  @Patch('workspaces/:orgId/agents/:agent')
  update(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Param('agent') agent: string,
    @Body(new ZodValidationPipe(updateAgentSchema)) body: UpdateAgentInput,
  ) {
    return this.agents.updateAgent(orgId, agent, body, user);
  }

  @Post('workspaces/:orgId/agents/:agent/run')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Run an agent now; its result lands in the inbox' })
  run(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Param('agent') agent: string,
    @Body(new ZodValidationPipe(runAgentSchema)) body: RunAgentInput,
  ) {
    return this.agents.run(orgId, agent, body, user);
  }

  @Get('workspaces/:orgId/agent-tasks')
  tasks(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Query('status') status?: string,
    @Query('agent') agent?: string,
    @Query('limit') limit?: string,
  ) {
    return this.agents.tasks(orgId, user, { status, agent, limit: Number(limit) || undefined });
  }

  @Post('workspaces/:orgId/agent-tasks/:taskId/decide')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve or dismiss an agent suggestion (a person always decides)' })
  decide(
    @CurrentUser() user: AuthUser,
    @Param('orgId') orgId: string,
    @Param('taskId') taskId: string,
    @Body(new ZodValidationPipe(decideAgentTaskSchema)) body: DecideAgentTaskInput,
  ) {
    return this.agents.decide(orgId, taskId, body, user);
  }

  @Post('workspaces/:orgId/agents/upgrade')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start a Paystack checkout for Hiring Agents Pro' })
  upgrade(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string) {
    return this.agents.upgrade(orgId, user);
  }

  @Post('workspaces/:orgId/agents/upgrade/verify')
  @HttpCode(200)
  verify(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string, @Body(new ZodValidationPipe(verifySchema)) body: { reference: string }) {
    return this.agents.verifyUpgrade(orgId, body.reference, user);
  }

  @Post('admin/workspaces/:orgId/agent-plan')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Super admin: give a workspace Hiring Agents Pro for some days (0 = back to Free)' })
  setPlan(@CurrentUser() user: AuthUser, @Param('orgId') orgId: string, @Body(new ZodValidationPipe(planSchema)) body: { days: number }) {
    return this.agents.setPlan(orgId, body.days, user);
  }
}
