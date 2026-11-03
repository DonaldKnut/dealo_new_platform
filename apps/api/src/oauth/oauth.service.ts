import { HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

import { ApiKeysService } from '../api-keys/api-keys.service';
import type { AuthUser } from '../auth/auth.types';
import type { AppEnv } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';

export const OAUTH_TOKEN_TTL_SECONDS = 3600;
const TOKEN_TYPE = 'oauth_cc';

type OAuthTokenPayload = {
  typ: typeof TOKEN_TYPE;
  sub: string;
  cid: string;
  scope: string;
};

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

/** RFC 6749 §5.2 error body. */
function oauthError(error: string, description: string, status = HttpStatus.BAD_REQUEST) {
  return new HttpException({ error, error_description: description }, status);
}

@Injectable()
export class OAuthService {
  /** Derived so OAuth tokens can never validate as dashboard session JWTs (and vice versa). */
  private readonly signingSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly apiKeys: ApiKeysService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.signingSecret = createHmac('sha256', config.get('JWT_ACCESS_SECRET', { infer: true }))
      .update('dealo-oauth-client-credentials')
      .digest('hex');
  }

  // ---------------------------------------------------------------- clients

  async createClient(apiKeyId: string, name: string, actor: AuthUser) {
    const key = await this.prisma.apiKey.findUnique({ where: { id: apiKeyId } });
    if (!key) throw new NotFoundException('API key not found');

    const clientId = `dc_${randomBytes(12).toString('hex')}`;
    const clientSecret = `dcs_${randomBytes(32).toString('base64url')}`;
    const client = await this.prisma.oAuthClient.create({
      data: {
        name,
        clientId,
        clientSecretHash: sha256(clientSecret),
        apiKeyId,
        createdByUserId: actor.id,
      },
      select: { id: true, name: true, clientId: true, apiKeyId: true, isActive: true, createdAt: true },
    });
    return { ...client, clientSecret };
  }

  listClients(apiKeyId: string) {
    return this.prisma.oAuthClient.findMany({
      where: { apiKeyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        clientId: true,
        apiKeyId: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  async revokeClient(id: string) {
    const existing = await this.prisma.oAuthClient.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('OAuth client not found');
    await this.prisma.oAuthClient.update({ where: { id }, data: { isActive: false } });
    return { id, revoked: true };
  }

  // ------------------------------------------------------------------ tokens

  async issueToken(input: {
    grantType?: string;
    clientId?: string;
    clientSecret?: string;
    scope?: string;
  }) {
    if (input.grantType !== 'client_credentials') {
      throw oauthError('unsupported_grant_type', 'Only grant_type=client_credentials is supported');
    }
    if (!input.clientId || !input.clientSecret) {
      throw oauthError('invalid_client', 'Client authentication failed', HttpStatus.UNAUTHORIZED);
    }

    const client = await this.prisma.oAuthClient.findUnique({
      where: { clientId: input.clientId },
      include: { apiKey: true },
    });
    const presented = Buffer.from(sha256(input.clientSecret));
    const stored = Buffer.from(client?.clientSecretHash ?? sha256(randomBytes(16).toString('hex')));
    const secretOk = presented.length === stored.length && timingSafeEqual(presented, stored);

    if (!client || !secretOk || !client.isActive || !client.apiKey.isActive) {
      throw oauthError('invalid_client', 'Client authentication failed', HttpStatus.UNAUTHORIZED);
    }
    if (client.apiKey.expiresAt && client.apiKey.expiresAt.getTime() < Date.now()) {
      throw oauthError('invalid_client', 'Backing API key has expired', HttpStatus.UNAUTHORIZED);
    }

    const allowed = client.apiKey.scopes;
    const requested = input.scope?.trim() ? input.scope.trim().split(/\s+/) : allowed;
    const invalid = requested.filter((scope) => !allowed.includes(scope));
    if (invalid.length > 0) {
      throw oauthError('invalid_scope', `Scopes not granted to this client: ${invalid.join(' ')}`);
    }

    const scope = [...new Set(requested)].join(' ');
    const payload: OAuthTokenPayload = { typ: TOKEN_TYPE, sub: client.apiKeyId, cid: client.clientId, scope };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.signingSecret,
      expiresIn: OAUTH_TOKEN_TTL_SECONDS,
      audience: 'dealo-api',
    });

    void this.prisma.oAuthClient
      .update({ where: { id: client.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: OAUTH_TOKEN_TTL_SECONDS,
      scope,
    };
  }

  /** True when the bearer looks like one of our OAuth tokens (unverified peek). */
  isOAuthToken(token: string) {
    const decoded = this.jwt.decode<Partial<OAuthTokenPayload> | null>(token);
    return decoded?.typ === TOKEN_TYPE;
  }

  async authenticateAccessToken(token: string): Promise<AuthUser> {
    let payload: OAuthTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<OAuthTokenPayload>(token, {
        secret: this.signingSecret,
        audience: 'dealo-api',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const client = await this.prisma.oAuthClient.findUnique({
      where: { clientId: payload.cid },
      select: { id: true, isActive: true, apiKeyId: true },
    });
    if (!client || !client.isActive || client.apiKeyId !== payload.sub) {
      throw new UnauthorizedException('OAuth client revoked');
    }

    const principal = await this.apiKeys.principalForKeyId(payload.sub);
    const tokenScopes = payload.scope.split(' ').filter(Boolean);
    return {
      ...principal,
      scopes: (principal.scopes ?? []).filter((scope) => tokenScopes.includes(scope)),
      oauthClientId: client.id,
    };
  }
}
