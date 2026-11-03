import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { ApiKeysService } from '../api-keys/api-keys.service';
import { IS_PUBLIC_KEY } from '../common/public.decorator';
import type { AuthUser } from './auth.types';

@Injectable()
export class ApiKeyOrJwtGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeysService: ApiKeysService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // Still try API key / JWT so scoped public routes can see the principal when provided.
      await this.tryAttachPrincipal(context);
      return true;
    }

    const attached = await this.tryAttachPrincipal(context);
    if (attached) {
      return true;
    }

    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch {
      throw new UnauthorizedException('Authentication required');
    }
  }

  handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }

  private async tryAttachPrincipal(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthUser;
    }>();

    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return false;
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token.startsWith('dk_live_') && !token.startsWith('dk_test_')) {
      return false;
    }

    request.user = await this.apiKeysService.authenticateBearer(token);
    return true;
  }
}
