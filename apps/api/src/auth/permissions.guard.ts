import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ApiScope, PermissionCode } from '@dealo/shared';

import { PERMISSIONS_KEY } from '../common/permissions.decorator';
import { SCOPES_KEY } from '../common/scopes.decorator';
import type { AuthUser } from './auth.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
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
      return Boolean(requiredScopes?.length);
    }

    if (user.roles.includes('SUPER_ADMIN')) {
      return true;
    }

    return required.every((permission) => user.permissions.includes(permission));
  }
}
