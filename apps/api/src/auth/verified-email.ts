import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EMAIL_NOT_VERIFIED } from '@dealo/shared';

import { VERIFIED_EMAIL_KEY } from '../common/verified-email.decorator';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './auth.types';

/** Read from the database, not the access token, so verifying takes effect without signing in again. */
export async function assertEmailVerified(prisma: PrismaService, user: AuthUser | undefined): Promise<void> {
  if (!user || user.authType === 'api_key') return;
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { isEmailVerified: true } });
  if (row?.isEmailVerified) return;
  throw new ForbiddenException({
    statusCode: 403,
    code: EMAIL_NOT_VERIFIED,
    message: 'Confirm your email address first. Use the link we sent you, or resend it from your dashboard.',
  });
}

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(VERIFIED_EMAIL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    await assertEmailVerified(this.prisma, request.user);
    return true;
  }
}
