import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  AuthIssue,
  forgotPasswordSchema,
  loginSchema,
  onboardingSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type OnboardingInput,
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
import { authCodeOf } from './auth-errors';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { GoogleOAuthGuard } from './google-oauth.guard';
import type { GoogleProfileUser } from './google.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

const LINKEDIN_STATE_COOKIE = 'li_oauth_state';
const GOOGLE_STATE_COOKIE = 'g_oauth_state';

function oauthIntent(raw: string | undefined): 'signin' | 'signup' {
  return raw === 'signup' ? 'signup' : 'signin';
}

function oauthHome(intent: 'signin' | 'signup') {
  return intent === 'signup' ? '/auth/register' : '/auth/login';
}

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  private setOauthStateCookie(res: Response, name: string, nonce: string) {
    res.cookie(name, nonce, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      path: '/',
      maxAge: 10 * 60_000,
    });
  }

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput) {
    return this.authService.register(body);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(body, res);
  }

  @Public()
  @Get('google')
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  googleAuth(
    @Query('role') role: string | undefined,
    @Query('intent') intentRaw: string | undefined,
    @Res() res: Response,
  ) {
    if (!this.authService.isGoogleConfigured()) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      );
    }

    const intent = oauthIntent(intentRaw);
    const nonce = randomBytes(16).toString('base64url');
    const state = Buffer.from(
      JSON.stringify({
        n: nonce,
        intent,
        role: role === 'EMPLOYER' || role === 'TALENT' ? role : undefined,
      }),
      'utf8',
    ).toString('base64url');
    this.setOauthStateCookie(res, GOOGLE_STATE_COOKIE, nonce);
    const params = new URLSearchParams({
      client_id: this.config.get('GOOGLE_CLIENT_ID', { infer: true })!,
      redirect_uri: this.authService.oauthCallbackUrl('google'),
      response_type: 'code',
      scope: 'email profile',
      access_type: 'online',
      prompt: 'select_account',
      state,
    });

    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(
    @Req() req: Request & { user?: GoogleProfileUser },
    @Res() res: Response,
  ) {
    const appUrl = this.config.get('APP_URL', { infer: true }).replace(/\/$/, '');
    const expected = (req.cookies as Record<string, string> | undefined)?.[GOOGLE_STATE_COOKIE];
    res.clearCookie(GOOGLE_STATE_COOKIE, { path: '/' });
    const profile = req.user;
    const intent = profile?.intent === 'signup' ? 'signup' : 'signin';
    const fail = (code: string) => res.redirect(`${appUrl}${oauthHome(intent)}?auth=${encodeURIComponent(code)}&provider=google`);
    if (!this.authService.isGoogleConfigured()) return fail(AuthIssue.OAUTH_FAILED);
    if (!profile || !expected || profile.stateNonce !== expected) return fail(AuthIssue.OAUTH_FAILED);
    try {
      await this.authService.loginWithGoogle(profile, res, intent);
    } catch (err) {
      return fail(authCodeOf(err));
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
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  linkedinAuth(
    @Query('role') role: string | undefined,
    @Query('intent') intentRaw: string | undefined,
    @Res() res: Response,
  ) {
    if (!this.authService.isLinkedinConfigured()) {
      throw new ServiceUnavailableException('LinkedIn sign-in is not configured. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET.');
    }
    const nonce = randomBytes(16).toString('base64url');
    const intent = oauthIntent(intentRaw);
    const state = Buffer.from(
      JSON.stringify({
        n: nonce,
        intent,
        role: role === 'EMPLOYER' || role === 'TALENT' ? role : undefined,
      }),
      'utf8',
    ).toString('base64url');
    this.setOauthStateCookie(res, LINKEDIN_STATE_COOKIE, nonce);
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
    let parsed: { n?: string; role?: 'EMPLOYER' | 'TALENT'; intent?: 'signin' | 'signup' } = {};
    try {
      parsed = JSON.parse(Buffer.from(state ?? '', 'base64url').toString('utf8')) as typeof parsed;
    } catch {
      parsed = {};
    }
    const intent = parsed.intent === 'signup' ? 'signup' : 'signin';
    const fail = (authCode: string) =>
      res.redirect(`${appUrl}${oauthHome(intent)}?auth=${encodeURIComponent(authCode)}&provider=linkedin`);
    const expected = (req.cookies as Record<string, string> | undefined)?.[LINKEDIN_STATE_COOKIE];
    res.clearCookie(LINKEDIN_STATE_COOKIE, { path: '/' });
    if (error) {
      return fail(
        error === 'user_cancelled_login' || error === 'user_cancelled_authorize'
          ? AuthIssue.OAUTH_CANCELLED
          : AuthIssue.OAUTH_FAILED,
      );
    }
    if (!code || !expected || parsed.n !== expected) return fail(AuthIssue.OAUTH_FAILED);
    try {
      const profile = await this.authService.linkedinProfile(code);
      await this.authService.loginWithProvider('linkedin', { ...profile, intendedRole: parsed.role }, res, intent);
      return res.redirect(`${appUrl}/dashboard`);
    } catch (err) {
      return fail(authCodeOf(err));
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

  @Post('onboarding')
  @HttpCode(200)
  @ApiCookieAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOkResponse({ description: 'Role and details chosen after a first Google or LinkedIn sign-in' })
  completeOnboarding(
    @Body(new ZodValidationPipe(onboardingSchema)) body: OnboardingInput,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.completeOnboarding(user.id, body, res);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('request-verification')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 10 * 60_000 } })
  requestVerification(@Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput) {
    return this.authService.requestVerification(body.email);
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
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
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
