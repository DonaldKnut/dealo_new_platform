import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  createApiKeySchema,
  createSandboxApiKeySchema,
  PermissionCode,
  SANDBOX_KEY_POLICY,
  updateApiKeySchema,
  type CreateApiKeyInput,
  type CreateSandboxApiKeyInput,
  type UpdateApiKeyInput,
  UserRole,
} from '@dealo/shared';
import { Throttle } from '@nestjs/throttler';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/current-user.decorator';
import { Permissions } from '../common/permissions.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ApiKeysService } from './api-keys.service';

const SANDBOX_ROLES = [
  UserRole.EMPLOYER,
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.RECRUITER,
  UserRole.OPERATIONS,
] as const;

@ApiTags('api-keys')
@Controller('api-keys')
@ApiCookieAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(PermissionCode.API_KEYS_MANAGE)
  @ApiOperation({ summary: 'Create a partner API key (plaintext returned once)' })
  @ApiCreatedResponse({ description: 'API key created' })
  create(
    @Body(new ZodValidationPipe(createApiKeySchema)) body: CreateApiKeyInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.apiKeysService.create(body, user);
  }

  @Post('sandbox')
  @Roles(...SANDBOX_ROLES)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Self-serve: create a sandbox (dk_test_) key for your own account',
    description: `TEST environment, SANDBOX plan, fixed scopes and ${SANDBOX_KEY_POLICY.rateLimitPerMin}/min. Max ${SANDBOX_KEY_POLICY.maxActiveKeys} active keys per user.`,
  })
  @ApiCreatedResponse({ description: 'Sandbox key created (plaintext returned once)' })
  createSandbox(
    @Body(new ZodValidationPipe(createSandboxApiKeySchema)) body: CreateSandboxApiKeyInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.apiKeysService.createSandbox(body, user);
  }

  @Get('mine')
  @Roles(...SANDBOX_ROLES)
  @ApiOperation({ summary: 'Self-serve: list keys you created' })
  listMine(@CurrentUser() user: AuthUser) {
    return this.apiKeysService.listMine(user);
  }

  @Delete('mine/:id')
  @Roles(...SANDBOX_ROLES)
  @ApiOperation({ summary: 'Self-serve: revoke one of your keys' })
  revokeMine(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.apiKeysService.revokeMine(id, user);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(PermissionCode.API_KEYS_MANAGE)
  @ApiOperation({ summary: 'List API keys (masked)' })
  @ApiOkResponse({ description: 'API key list' })
  list() {
    return this.apiKeysService.list();
  }

  @Get(':id/usage')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(PermissionCode.API_KEYS_MANAGE)
  @ApiOperation({ summary: 'Usage metrics for an API key (daily, endpoints, recent calls)' })
  @ApiQuery({ name: 'days', required: false, description: 'Lookback window in days (1-90, default 7)' })
  @ApiOkResponse({ description: 'API key usage summary' })
  usage(@Param('id') id: string, @Query('days') days?: string) {
    return this.apiKeysService.usage(id, Number(days ?? 7));
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(PermissionCode.API_KEYS_MANAGE)
  @ApiOperation({ summary: 'Update API key metadata or status' })
  @ApiOkResponse({ description: 'API key updated' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateApiKeySchema)) body: UpdateApiKeyInput,
  ) {
    return this.apiKeysService.update(id, body);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(PermissionCode.API_KEYS_MANAGE)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiOkResponse({ description: 'API key revoked' })
  revoke(@Param('id') id: string) {
    return this.apiKeysService.revoke(id);
  }
}
