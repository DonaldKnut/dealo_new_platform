import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import type { Response } from 'express';
import type { LoginInput, RegisterInput } from '@dealo/shared';

import { CandidatesService } from '../candidates/candidates.service';
import { normalizeEmail } from '../common/normalize-email';
import type { AppEnv } from '../config/env.validation';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { AuthUser, JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly candidatesService: CandidatesService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppEnv, true>,
    private readonly emailService: EmailService,
  ) {}

  async register(input: RegisterInput) {
    const email = normalizeEmail(input.email);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const role = await this.prisma.role.findUnique({ where: { code: input.role } });
    if (!role) {
      throw new ConflictException('Requested role is not available');
    }

    const passwordHash = await argon2.hash(input.password);
    const emailVerifyToken = randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        emailVerifyToken: this.hashToken(emailVerifyToken),
        roles: {
          create: [{ roleId: role.id }],
        },
      },
    });

    if (input.role === UserRole.TALENT) {
      await this.candidatesService.ensureCandidateForUser(user);
    }

    await this.sendVerificationEmail(email, emailVerifyToken, true);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      message: 'Registration successful. Please verify your email.',
    };
  }

  async login(input: LoginInput, res: Response) {
    const user = await this.usersService.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Continue with Google, or set a password via reset.',
      );
    }

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const authUser = this.toAuthUser(user);
    await this.setAuthCookies(res, authUser, { rememberMe: Boolean(input.rememberMe) });

    return {
      user: authUser,
    };
  }

  async loginWithGoogle(
    profile: {
      googleId: string;
      email: string;
      firstName: string;
      lastName: string;
      avatarUrl?: string;
      intendedRole?: 'EMPLOYER' | 'TALENT';
    },
    res: Response,
  ) {
    let user = await this.usersService.findByGoogleId(profile.googleId);

    if (!user) {
      const existingByEmail = await this.usersService.findByEmail(profile.email);
      if (existingByEmail) {
        await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId: profile.googleId,
            avatarUrl: profile.avatarUrl,
            authProvider: existingByEmail.passwordHash ? 'local+google' : 'google',
            isEmailVerified: true,
            emailVerifyToken: null,
            lastLoginAt: new Date(),
          },
        });
        user = await this.usersService.findById(existingByEmail.id);
      } else {
        const roleCode = profile.intendedRole === 'TALENT' ? UserRole.TALENT : UserRole.EMPLOYER;
        const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
        if (!role) {
          throw new ConflictException('Requested role is not available');
        }

        const created = await this.prisma.user.create({
          data: {
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            googleId: profile.googleId,
            avatarUrl: profile.avatarUrl,
            authProvider: 'google',
            isEmailVerified: true,
            lastLoginAt: new Date(),
            roles: {
              create: [{ roleId: role.id }],
            },
          },
        });
        user = await this.usersService.findById(created.id);
      }
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          avatarUrl: profile.avatarUrl ?? user.avatarUrl,
        },
      });
      user = await this.usersService.findById(user.id);
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Unable to sign in with Google');
    }

    if (user.roles.includes(UserRole.TALENT)) {
      await this.candidatesService.ensureCandidateForUser(user);
    }

    const authUser = this.toAuthUser(user);
    await this.setAuthCookies(res, authUser, { rememberMe: true });
    return { user: authUser };
  }

  isGoogleConfigured(): boolean {
    return Boolean(
      this.config.get('GOOGLE_CLIENT_ID', { infer: true }) &&
        this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
    );
  }

  async logout(res: Response, userId?: string) {
    if (userId) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    this.clearAuthCookies(res);
    return { success: true };
  }

  async me(userId: string): Promise<AuthUser & { isEmailVerified: boolean }> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    return { ...this.toAuthUser(user), isEmailVerified: user.isEmailVerified };
  }

  async verifyEmail(token: string) {
    if (!token) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }
    // Links sent before tokens were hashed still carry the raw value.
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ emailVerifyToken: this.hashToken(token) }, { emailVerifyToken: token }] },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
      },
    });

    return { success: true };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, isEmailVerified: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.isEmailVerified) {
      return { success: true, alreadyVerified: true };
    }

    const token = randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifyToken: this.hashToken(token) },
    });
    await this.sendVerificationEmail(user.email, token, false);
    return { success: true, alreadyVerified: false };
  }

  private async sendVerificationEmail(to: string, token: string, welcome: boolean) {
    const link = `${this.config.get('APP_URL', { infer: true }).replace(/\/$/, '')}/auth/verify-email?token=${token}`;
    const intro = welcome ? 'Welcome to Dealo.' : 'Here is a fresh link to confirm your Dealo email address.';
    await this.emailService.send({
      to,
      subject: 'Verify your Dealo account',
      html: `<p>${intro}</p><p><a href="${link}">Verify your email</a></p><p>If you didn't ask for this, you can ignore this email.</p>`,
      text: `${intro} Verify your email: ${link}`,
    });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
    });

    // Always return success to avoid account enumeration.
    if (!user) {
      return { success: true };
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: this.hashToken(token),
        passwordResetExpires: expires,
      },
    });

    const appUrl = this.config.get('APP_URL', { infer: true });
    await this.emailService.send({
      to: user.email,
      subject: 'Reset your Dealo password',
      html: `<p>Reset your password using this link (valid for 1 hour):</p><p><a href="${appUrl}/auth/reset-password?token=${token}">Reset password</a></p>`,
      text: `Reset your password: ${appUrl}/auth/reset-password?token=${token}`,
    });

    return { success: true };
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = this.hashToken(token);
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await argon2.hash(password);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: UserRole[];
    permissions: string[];
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      permissions: user.permissions,
    };
  }

  private async setAuthCookies(
    res: Response,
    user: AuthUser,
    options?: { rememberMe?: boolean },
  ): Promise<void> {
    const rememberMe = Boolean(options?.rememberMe);
    const refreshMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const accessToken = await this.signToken(user, 'access');
    const refreshToken = await this.signToken(user, 'refresh', rememberMe ? '30d' : undefined);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshMs),
      },
    });

    const secure = this.config.get('COOKIE_SECURE', { infer: true });
    const domain = this.config.get('COOKIE_DOMAIN', { infer: true });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      domain,
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      domain,
      path: '/',
      maxAge: refreshMs,
    });
  }

  private clearAuthCookies(res: Response): void {
    const domain = this.config.get('COOKIE_DOMAIN', { infer: true });
    const secure = this.config.get('COOKIE_SECURE', { infer: true });

    res.clearCookie('access_token', { httpOnly: true, sameSite: 'lax', secure, domain, path: '/' });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      domain,
      path: '/',
    });
  }

  private async signToken(
    user: AuthUser,
    type: 'access' | 'refresh',
    refreshOverride?: `${number}d`,
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      type,
    };

    const secret =
      type === 'access'
        ? this.config.get('JWT_ACCESS_SECRET', { infer: true })
        : this.config.get('JWT_REFRESH_SECRET', { infer: true });

    const expiresIn =
      type === 'access'
        ? this.config.get('JWT_ACCESS_TTL', { infer: true })
        : (refreshOverride ?? this.config.get('JWT_REFRESH_TTL', { infer: true }));

    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn: expiresIn as `${number}m` | `${number}d` | `${number}s`,
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
