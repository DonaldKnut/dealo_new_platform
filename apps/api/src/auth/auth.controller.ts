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

    const apiUrl = this.config.get('API_URL', { infer: true });
    const statePayload =
      role === 'EMPLOYER' || role === 'TALENT'
        ? Buffer.from(JSON.stringify({ role }), 'utf8').toString('base64url')
        : '';
    const params = new URLSearchParams({
      client_id: this.config.get('GOOGLE_CLIENT_ID', { infer: true })!,
      redirect_uri:
        this.config.get('GOOGLE_CALLBACK_URL', { infer: true }) ??
        `${apiUrl}/api/v1/auth/google/callback`,
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

    await this.authService.loginWithGoogle(req.user, res);
    const appUrl = this.config.get('APP_URL', { infer: true });
    return res.redirect(`${appUrl}/dashboard`);
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
