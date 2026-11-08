import { Controller, Get, Headers, HttpCode, Post, Req, type RawBodyRequest } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';

import { Public } from '../common/public.decorator';
import { PaymentRouterService } from './payment-router.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly router: PaymentRouterService) {}

  @Public()
  @Get('config')
  @ApiOperation({ summary: 'Whether online payments are on, test or live mode, and the public key' })
  config() {
    return this.router.config();
  }

  /** Paste this URL into Paystack: Settings → API Keys & Webhooks → Webhook URL. */
  @Public()
  @SkipThrottle()
  @Post('paystack/webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  paystackWebhook(@Req() req: RawBodyRequest<Request>, @Headers('x-paystack-signature') signature?: string) {
    return this.router.handleWebhook(req.rawBody, signature);
  }
}
