import { Body, Controller, Delete, Get, Header, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createOAuthClientSchema, PermissionCode, type CreateOAuthClientInput, UserRole } from '@dealo/shared';
import { Throttle } from '@nestjs/throttler';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/current-user.decorator';
import { Permissions } from '../common/permissions.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { OAuthService } from './oauth.service';

function parseBasicAuth(header?: string): { clientId?: string; clientSecret?: string } {
  if (!header?.startsWith('Basic ')) return {};
  const decoded = Buffer.from(header.slice(6).trim(), 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 0) return {};
  return {
    clientId: decodeURIComponent(decoded.slice(0, separator)),
    clientSecret: decodeURIComponent(decoded.slice(separator + 1)),
  };
}

@ApiTags('oauth')
@Controller()
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Public()
  @Post('oauth/token')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'OAuth2 client-credentials token',
    description:
      'Exchange client_id/client_secret (HTTP Basic or form body) for a 1-hour Bearer token. Optional space-separated `scope` narrows the backing API key scopes.',
  })
  @ApiConsumes('application/x-www-form-urlencoded', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['grant_type'],
      properties: {
        grant_type: { type: 'string', example: 'client_credentials' },
        client_id: { type: 'string' },
        client_secret: { type: 'string' },
        scope: { type: 'string', example: 'hire-inquiries:read' },
      },
    },
  })
  token(@Body() body: Record<string, string | undefined>, @Headers('authorization') authorization?: string) {
    const basic = parseBasicAuth(authorization);
    return this.oauthService.issueToken({
      grantType: body?.grant_type,
      clientId: basic.clientId ?? body?.client_id,
      clientSecret: basic.clientSecret ?? body?.client_secret,
      scope: body?.scope,
    });
  }

  @Get('api-keys/:id/oauth-clients')
  @ApiCookieAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(PermissionCode.API_KEYS_MANAGE)
  @ApiOperation({ summary: 'List OAuth clients for an API key' })
  list(@Param('id') id: string) {
    return this.oauthService.listClients(id);
  }

  @Post('api-keys/:id/oauth-clients')
  @ApiCookieAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(PermissionCode.API_KEYS_MANAGE)
  @ApiOperation({ summary: 'Create an OAuth client for an API key (secret returned once)' })
  create(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createOAuthClientSchema)) body: CreateOAuthClientInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.oauthService.createClient(id, body.name, user);
  }

  @Delete('oauth-clients/:id')
  @ApiCookieAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(PermissionCode.API_KEYS_MANAGE)
  @ApiOperation({ summary: 'Revoke an OAuth client (outstanding tokens stop working)' })
  revoke(@Param('id') id: string) {
    return this.oauthService.revokeClient(id);
  }
}
