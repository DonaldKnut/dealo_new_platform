import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';
import type { Request } from 'express';

import { normalizeEmail } from '../common/normalize-email';
import type { AppEnv } from '../config/env.validation';

export type GoogleProfileUser = {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  intendedRole?: 'EMPLOYER' | 'TALENT';
  intent: 'signin' | 'signup';
  stateNonce?: string;
};

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService<AppEnv, true>) {
    const clientID = config.get('GOOGLE_CLIENT_ID', { infer: true }) || 'missing-google-client-id';
    const clientSecret =
      config.get('GOOGLE_CLIENT_SECRET', { infer: true }) || 'missing-google-client-secret';
    // Same rule as AuthService.oauthCallbackUrl: back through the website, so the cookie is first-party.
    const callbackURL =
      config.get('GOOGLE_CALLBACK_URL', { infer: true }) ??
      `${config.get('APP_URL', { infer: true }).replace(/\/$/, '')}/api/v1/auth/google/callback`;

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  validate(
    req: Request,
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const emailEntry = profile.emails?.[0];
    const email = emailEntry?.value;
    if (!email) {
      done(new UnauthorizedException('Google account did not return an email'), undefined);
      return;
    }
    if (emailEntry?.verified === false) {
      done(new UnauthorizedException('Your Google email is not verified'), undefined);
      return;
    }

    let intendedRole: 'EMPLOYER' | 'TALENT' | undefined;
    let intent: 'signin' | 'signup' = 'signin';
    let stateNonce: string | undefined;
    const state = typeof req.query?.state === 'string' ? req.query.state : undefined;
    try {
      if (state) {
        const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
          n?: string;
          role?: string;
          intent?: string;
        };
        if (parsed.role === 'EMPLOYER' || parsed.role === 'TALENT') intendedRole = parsed.role;
        if (parsed.intent === 'signup' || parsed.intent === 'signin') intent = parsed.intent;
        if (parsed.n) stateNonce = parsed.n;
      }
    } catch {
      intendedRole = undefined;
    }

    const user: GoogleProfileUser = {
      googleId: profile.id,
      email: normalizeEmail(email),
      firstName: profile.name?.givenName || 'Dealo',
      lastName: profile.name?.familyName || 'User',
      avatarUrl: profile.photos?.[0]?.value,
      intendedRole,
      intent,
      stateNonce,
    };

    done(null, user);
  }
}
