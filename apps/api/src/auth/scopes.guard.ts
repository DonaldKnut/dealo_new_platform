import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ApiScope } from '@dealo/shared';

import { IS_PUBLIC_KEY } from '../common/public.decorator';
import { SCOPES_KEY } from '../common/scopes.decorator';
import type { AuthUser } from './auth.types';

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const required = this.reflector.getAllAndOverride<ApiScope[]>(SCOPES_KEY, targets);

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    // Anonymous / JWT callers: scopes apply only to API keys (and OAuth tokens, which act as API keys).
    if (!user || user.authType !== 'api_key') {
      return true;
    }

    if (!required || required.length === 0) {
      // Deny by default: API keys inherit their owner's identity, so any signed-in route that
      // doesn't declare scopes is treated as dashboard-only.
      if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
        return true;
      }
      throw new ForbiddenException('This endpoint is not available to API keys. Sign in to the dashboard instead.');
    }

    const scopes = user.scopes ?? [];
    const missing = required.filter((scope) => !scopes.includes(scope));
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing API scopes: ${missing.join(', ')}`);
    }

    return true;
  }
}
