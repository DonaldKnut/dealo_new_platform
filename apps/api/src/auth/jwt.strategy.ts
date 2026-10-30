import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import type { AppEnv } from '../config/env.validation';
import type { AuthUser, JwtPayload } from './auth.types';

function cookieExtractor(req: Request): string | null {
  if (req?.cookies && typeof req.cookies.access_token === 'string') {
    return req.cookies.access_token;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService<AppEnv, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    if (payload.type !== 'access' || !payload.sub) {
      throw new UnauthorizedException('Invalid access token');
    }

    return {
      id: payload.sub,
      email: payload.email,
      firstName: '',
      lastName: '',
      roles: payload.roles,
      permissions: payload.permissions,
    };
  }
}
