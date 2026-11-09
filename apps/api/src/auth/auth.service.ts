import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, WorkspaceRole, type Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import type { Response } from 'express';
import type { LoginInput, OnboardingInput, RegisterInput } from '@dealo/shared';

import { RESERVED_SLUGS } from '../ats/workspaces.service';
import { CandidatesService } from '../candidates/candidates.service';
import { normalizeEmail } from '../common/normalize-email';
import type { AppEnv } from '../config/env.validation';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { AuthUser, JwtPayload } from './auth.types';

/** MongoDB: a token that was never revoked has no `revokedAt` at all, which `revokedAt: null` does not match. */
export const NOT_REVOKED = { OR: [{ revokedAt: null }, { revokedAt: { isSet: false } }] } satisfies Prisma.RefreshTokenWhereInput;

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

  loginWithGoogle(
    profile: { googleId: string; email: string; firstName: string; lastName: string; avatarUrl?: string; intendedRole?: 'EMPLOYER' | 'TALENT' },
    res: Response,
  ) {
    const { googleId, ...rest } = profile;
    return this.loginWithProvider('google', { ...rest, providerId: googleId }, res);
  }

  /**
   * Signs in (or signs up) with Google or LinkedIn. A provider email is only linked to an existing
   * Dealo account when the provider says it is verified, so nobody can take over an account.
   */
  async loginWithProvider(
    provider: 'google' | 'linkedin',
    profile: { providerId: string; email: string; firstName: string; lastName: string; avatarUrl?: string; intendedRole?: 'EMPLOYER' | 'TALENT' },
    res: Response,
  ) {
    const idField = provider === 'google' ? 'googleId' : 'linkedinId';
    const label = provider === 'google' ? 'Google' : 'LinkedIn';
    let user = provider === 'google' ? await this.usersService.findByGoogleId(profile.providerId) : await this.usersService.findByLinkedinId(profile.providerId);

    if (!user) {
      const existingByEmail = await this.usersService.findByEmail(profile.email);
      if (existingByEmail) {
        const providers = new Set(existingByEmail.authProvider.split('+'));
        if (!existingByEmail.passwordHash) providers.delete('local');
        providers.add(provider);
        await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            [idField]: profile.providerId,
            avatarUrl: existingByEmail.avatarUrl ?? profile.avatarUrl,
            authProvider: [...providers].sort().join('+'),
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
            [idField]: profile.providerId,
            avatarUrl: profile.avatarUrl,
            authProvider: provider,
            isEmailVerified: true,
            onboardingPending: true,
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
          avatarUrl: user.avatarUrl ?? profile.avatarUrl,
        },
      });
      user = await this.usersService.findById(user.id);
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException(`Unable to sign in with ${label}`);
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

  isLinkedinConfigured(): boolean {
    return Boolean(this.config.get('LINKEDIN_CLIENT_ID', { infer: true }) && this.config.get('LINKEDIN_CLIENT_SECRET', { infer: true }));
  }

  /** Where Google and LinkedIn send people back. It goes through the website so the sign-in cookie is set on the site's own domain. */
  oauthCallbackUrl(provider: 'google' | 'linkedin') {
    const explicit = this.config.get(provider === 'google' ? 'GOOGLE_CALLBACK_URL' : 'LINKEDIN_CALLBACK_URL', { infer: true });
    return explicit ?? `${this.config.get('APP_URL', { infer: true }).replace(/\/$/, '')}/api/v1/auth/${provider}/callback`;
  }

  linkedinAuthorizeUrl(state: string) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.get('LINKEDIN_CLIENT_ID', { infer: true })!,
      redirect_uri: this.oauthCallbackUrl('linkedin'),
      state,
      scope: 'openid profile email',
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /** "Sign In with LinkedIn using OpenID Connect": trade the code for a token, then read the person's profile. */
  async linkedinProfile(code: string) {
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(15_000),
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.oauthCallbackUrl('linkedin'),
        client_id: this.config.get('LINKEDIN_CLIENT_ID', { infer: true })!,
        client_secret: this.config.get('LINKEDIN_CLIENT_SECRET', { infer: true })!,
      }),
    });
    const token = (await tokenRes.json().catch(() => null)) as { access_token?: string; error_description?: string } | null;
    if (!tokenRes.ok || !token?.access_token) {
      throw new UnauthorizedException(`LinkedIn sign-in failed: ${token?.error_description ?? tokenRes.status}`);
    }
    const infoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(15_000),
    });
    const info = (await infoRes.json().catch(() => null)) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      given_name?: string;
      family_name?: string;
      picture?: string;
    } | null;
    if (!infoRes.ok || !info?.sub) throw new UnauthorizedException('LinkedIn did not return your profile');
    if (!info.email || info.email_verified === false) {
      throw new UnauthorizedException('Your LinkedIn email is not verified. Verify it on LinkedIn, or sign up with your email.');
    }
    return {
      providerId: info.sub,
      email: normalizeEmail(info.email),
      firstName: info.given_name || 'Dealo',
      lastName: info.family_name || 'User',
      avatarUrl: info.picture,
    };
  }

  async logout(res: Response, userId?: string) {
    if (userId) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, ...NOT_REVOKED },
        data: { revokedAt: new Date() },
      });
    }

    this.clearAuthCookies(res);
    return { success: true };
  }

  async me(userId: string): Promise<AuthUser & { isEmailVerified: boolean; avatarUrl: string | null; needsOnboarding: boolean }> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    return {
      ...this.toAuthUser(user),
      isEmailVerified: user.isEmailVerified,
      avatarUrl: user.avatarUrl ?? null,
      needsOnboarding: user.onboardingPending === true,
    };
  }

  /** Sets the role and details a new Google/LinkedIn account chose, then re-issues cookies so the new role applies at once. */
  async completeOnboarding(userId: string, input: OnboardingInput, res: Response) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) throw new UnauthorizedException();
    if (user.onboardingPending !== true) throw new BadRequestException('Your account is already set up');

    const roles = await this.prisma.role.findMany({ where: { code: { in: [UserRole.EMPLOYER, UserRole.TALENT] } } });
    const chosen = roles.find((role) => role.code === input.role);
    if (!chosen) throw new ConflictException('Requested role is not available');

    await this.prisma.userRoleAssignment.deleteMany({ where: { userId, roleId: { in: roles.map((role) => role.id) } } });
    await this.prisma.userRoleAssignment.create({ data: { userId, roleId: chosen.id } });
    await this.prisma.user.update({
      where: { id: userId },
      data: { firstName: input.firstName, lastName: input.lastName, onboardingPending: false },
    });

    const phone = input.phone || undefined;
    if (input.role === UserRole.TALENT) {
      const candidate = await this.candidatesService.ensureCandidateForUser({ ...user, firstName: input.firstName, lastName: input.lastName });
      await this.prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          fullName: `${input.firstName} ${input.lastName}`.trim(),
          ...(phone ? { phone } : {}),
          ...(input.roleTitle ? { roleTitle: input.roleTitle } : {}),
          ...(input.location ? { location: input.location } : {}),
        },
      });
    } else if (input.companyName) {
      await this.createCompany(userId, input.companyName);
    }

    await this.prisma.refreshToken.updateMany({ where: { userId, ...NOT_REVOKED }, data: { revokedAt: new Date() } });
    const updated = await this.usersService.findById(userId);
    const authUser = this.toAuthUser(updated!);
    await this.setAuthCookies(res, authUser, { rememberMe: true });
    return { user: authUser };
  }

  /** Someone invited to a team already belongs to that company, so only create one for founders. */
  private async createCompany(userId: string, name: string) {
    if (await this.prisma.organizationMember.count({ where: { userId } })) return;
    const base =
      name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50) || 'company';
    let slug = RESERVED_SLUGS.has(base) ? `${base}-${randomBytes(2).toString('hex')}` : base;
    for (let attempt = 0; attempt < 5 && (await this.prisma.organization.findUnique({ where: { slug }, select: { id: true } })); attempt++) {
      slug = `${base}-${randomBytes(2).toString('hex')}`;
    }
    await this.prisma.organization.create({
      data: { name, slug, members: { create: { userId, role: WorkspaceRole.OWNER, isOwner: true } } },
    });
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
      where: { userId: user.id, ...NOT_REVOKED },
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

  /**
   * Swaps a valid refresh cookie for new cookies (each refresh token works once). Seeing an
   * already-used token means it may have been stolen, so every session for that person ends.
   */
  async refresh(refreshToken: string | undefined, res: Response) {
    const fail = () => {
      this.clearAuthCookies(res);
      return new UnauthorizedException('Please sign in again');
    };
    if (!refreshToken) throw fail();
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, { secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }) });
    } catch {
      throw fail();
    }
    if (payload.type !== 'refresh' || !payload.sub) throw fail();

    const stored = await this.prisma.refreshToken.findFirst({ where: { tokenHash: this.hashToken(refreshToken), userId: payload.sub } });
    if (!stored || stored.expiresAt < new Date()) throw fail();
    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({ where: { userId: payload.sub, ...NOT_REVOKED }, data: { revokedAt: new Date() } });
      throw fail();
    }
    const claimed = await this.prisma.refreshToken.updateMany({ where: { id: stored.id, ...NOT_REVOKED }, data: { revokedAt: new Date() } });
    if (!claimed.count) throw fail();

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) throw fail();
    const authUser = this.toAuthUser(user);
    // Keep the original "remember me" choice: long-lived tokens stay long-lived.
    const rememberMe = stored.expiresAt.getTime() - stored.createdAt.getTime() > 8 * 24 * 60 * 60 * 1000;
    await this.setAuthCookies(res, authUser, { rememberMe });
    return { user: authUser };
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
      // Two refresh tokens made in the same second would otherwise be identical.
      ...(type === 'refresh' ? { jwtid: randomBytes(12).toString('hex') } : {}),
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
