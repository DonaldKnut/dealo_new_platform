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
  PermissionCode,
  updateApiKeySchema,
  type CreateApiKeyInput,
  type UpdateApiKeyInput,
  UserRole,
} from '@dealo/shared';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/current-user.decorator';
import { Permissions } from '../common/permissions.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ApiKeysService } from './api-keys.service';

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
