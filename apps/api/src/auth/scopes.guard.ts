import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ApiScope } from '@dealo/shared';

import { SCOPES_KEY } from '../common/scopes.decorator';
import type { AuthUser } from './auth.types';

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<ApiScope[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    // Anonymous / JWT callers: scopes apply only to API keys.
    if (!user || user.authType !== 'api_key') {
      return true;
    }

    const scopes = user.scopes ?? [];
    const missing = required.filter((scope) => !scopes.includes(scope));
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing API scopes: ${missing.join(', ')}`);
    }

    return true;
  }
}
