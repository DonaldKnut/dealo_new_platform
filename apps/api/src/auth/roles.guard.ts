import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@prisma/client';
import type { ApiScope } from '@dealo/shared';

import { ROLES_KEY } from '../common/roles.decorator';
import { SCOPES_KEY } from '../common/scopes.decorator';
import type { AuthUser } from './auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      return false;
    }

    if (user.authType === 'api_key') {
      const requiredScopes = this.reflector.getAllAndOverride<ApiScope[]>(SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      // API keys may access role-gated routes only when scopes are also declared.
      return Boolean(requiredScopes?.length);
    }

    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
