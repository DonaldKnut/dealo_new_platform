import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Post,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from '@dealo/shared';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';

import type { AppEnv } from '../config/env.validation';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import type { GoogleProfileUser } from './google.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

const LINKEDIN_STATE_COOKIE = 'li_oauth_state';

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput) {
    return this.authService.register(body);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(body, res);
  }

  @Public()
  @Get('google')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  googleAuth(@Query('role') role: string | undefined, @Res() res: Response) {
    if (!this.authService.isGoogleConfigured()) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      );
    }

    const statePayload =
      role === 'EMPLOYER' || role === 'TALENT'
        ? Buffer.from(JSON.stringify({ role }), 'utf8').toString('base64url')
        : '';
    const params = new URLSearchParams({
      client_id: this.config.get('GOOGLE_CLIENT_ID', { infer: true })!,
      redirect_uri: this.authService.oauthCallbackUrl('google'),
      response_type: 'code',
      scope: 'email profile',
      access_type: 'online',
      prompt: 'select_account',
    });
    if (statePayload) {
      params.set('state', statePayload);
    }

    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request & { user: GoogleProfileUser },
    @Res() res: Response,
  ) {
    if (!this.authService.isGoogleConfigured()) {
      throw new ServiceUnavailableException('Google sign-in is not configured');
    }

    const appUrl = this.config.get('APP_URL', { infer: true }).replace(/\/$/, '');
    try {
      await this.authService.loginWithGoogle(req.user, res);
    } catch (err) {
      return res.redirect(`${appUrl}/auth/login?error=${encodeURIComponent(err instanceof HttpException ? err.message : 'Google sign-in failed. Please try again.')}`);
    }
    return res.redirect(`${appUrl}/dashboard`);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOkResponse({ description: 'New sign-in cookies from the refresh cookie' })
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh((req.cookies as Record<string, string> | undefined)?.refresh_token, res);
  }

  @Public()
  @Get('providers')
  @ApiOkResponse({ description: 'Which social sign-in buttons to show' })
  providers() {
    return { google: this.authService.isGoogleConfigured(), linkedin: this.authService.isLinkedinConfigured() };
  }

  @Public()
  @Get('linkedin')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  linkedinAuth(@Query('role') role: string | undefined, @Res() res: Response) {
    if (!this.authService.isLinkedinConfigured()) {
      throw new ServiceUnavailableException('LinkedIn sign-in is not configured. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET.');
    }
    const nonce = randomBytes(16).toString('base64url');
    const state = Buffer.from(JSON.stringify({ n: nonce, role: role === 'EMPLOYER' || role === 'TALENT' ? role : undefined }), 'utf8').toString('base64url');
    // The nonce must come back with LinkedIn's redirect; it stops someone else's sign-in being forced onto this browser.
    res.cookie(LINKEDIN_STATE_COOKIE, nonce, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      path: '/',
      maxAge: 10 * 60_000,
    });
    return res.redirect(this.authService.linkedinAuthorizeUrl(state));
  }

  @Public()
  @Get('linkedin/callback')
  async linkedinCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const appUrl = this.config.get('APP_URL', { infer: true }).replace(/\/$/, '');
    const fail = (reason: string) => res.redirect(`${appUrl}/auth/login?error=${encodeURIComponent(reason)}`);
    const expected = (req.cookies as Record<string, string> | undefined)?.[LINKEDIN_STATE_COOKIE];
    res.clearCookie(LINKEDIN_STATE_COOKIE, { path: '/' });
    if (error) return fail(error === 'user_cancelled_login' || error === 'user_cancelled_authorize' ? 'LinkedIn sign-in was cancelled' : 'LinkedIn sign-in failed');
    let parsed: { n?: string; role?: 'EMPLOYER' | 'TALENT' } = {};
    try {
      parsed = JSON.parse(Buffer.from(state ?? '', 'base64url').toString('utf8')) as typeof parsed;
    } catch {
      parsed = {};
    }
    if (!code || !expected || parsed.n !== expected) return fail('LinkedIn sign-in expired. Please try again.');
    try {
      const profile = await this.authService.linkedinProfile(code);
      await this.authService.loginWithProvider('linkedin', { ...profile, intendedRole: parsed.role }, res);
      return res.redirect(`${appUrl}/dashboard`);
    } catch (err) {
      return fail(err instanceof HttpException ? err.message : 'LinkedIn sign-in failed. Please try again.');
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiCookieAuth()
  logout(@CurrentUser() user: AuthUser | undefined, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res, user?.id);
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOkResponse({ description: 'Current authenticated user' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.id);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @HttpCode(200)
  @ApiCookieAuth()
  @Throttle({ default: { limit: 3, ttl: 10 * 60_000 } })
  resendVerification(@CurrentUser() user: AuthUser) {
    return this.authService.resendVerification(user.id);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput,
  ) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput) {
    return this.authService.resetPassword(body.token, body.password);
  }
}
