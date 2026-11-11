import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { AuthIssue } from '@dealo/shared';
import type { Response } from 'express';

import type { AppEnv } from '../config/env.validation';

/** Passport would otherwise dump a 401 JSON page when Google sends `error=` or the code exchange fails. */
@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService<AppEnv, true>) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ query?: { error?: string } }>();
    const denied = req.query?.error;
    if (denied) {
      this.bounce(context, denied === 'access_denied' ? AuthIssue.OAUTH_CANCELLED : AuthIssue.OAUTH_FAILED);
      return false;
    }
    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      this.bounce(context, AuthIssue.OAUTH_FAILED);
      return false;
    }
  }

  private bounce(context: ExecutionContext, code: string) {
    const res = context.switchToHttp().getResponse<Response>();
    if (res.headersSent) return;
    const appUrl = this.config.get('APP_URL', { infer: true }).replace(/\/$/, '');
    res.redirect(`${appUrl}/auth/login?auth=${encodeURIComponent(code)}`);
  }
}
