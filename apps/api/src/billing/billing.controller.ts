import { Body, Controller, Get, Headers, HttpCode, Param, Patch, Post, Req, type RawBodyRequest } from '@nestjs/common';
import { ApiCookieAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  apiPlanCheckoutSchema,
  apiPlanParamSchema,
  apiPlanVerifySchema,
  PermissionCode,
  updateApiPlanConfigSchema,
  type ApiPlanCheckoutInput,
  type ApiPlanVerifyInput,
  type UpdateApiPlanConfigInput,
  UserRole,
} from '@dealo/shared';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { ApiKeyPlan } from '@prisma/client';
import type { Request } from 'express';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/current-user.decorator';
import { Permissions } from '../common/permissions.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { BillingService } from './billing.service';

const SUBSCRIBER_ROLES = [
  UserRole.EMPLOYER,
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.RECRUITER,
  UserRole.OPERATIONS,
] as const;

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Public()
  @Get('api-plans')
  @ApiOperation({ summary: 'Public API plan catalogue (prices in minor units)' })
  listPlans() {
    return this.billingService.listPlans();
  }

  @Patch('api-plans/:plan')
  @ApiCookieAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(PermissionCode.PRICING_MANAGE)
  @ApiOperation({ summary: 'Admin: edit plan price, limits and quotas' })
  updatePlan(
    @Param('plan', new ZodValidationPipe(apiPlanParamSchema)) plan: ApiKeyPlan,
    @Body(new ZodValidationPipe(updateApiPlanConfigSchema)) body: UpdateApiPlanConfigInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.billingService.updatePlan(plan, body, user);
  }

  @Get('api/me')
  @ApiCookieAuth()
  @Roles(...SUBSCRIBER_ROLES)
  @ApiOperation({ summary: 'Your API plan, usage this month and invoices' })
  myBilling(@CurrentUser() user: AuthUser) {
    return this.billingService.myBilling(user);
  }

  @Post('api/checkout')
  @ApiCookieAuth()
  @Roles(...SUBSCRIBER_ROLES)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Start a Paystack checkout for an API plan' })
  checkout(
    @Body(new ZodValidationPipe(apiPlanCheckoutSchema)) body: ApiPlanCheckoutInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.billingService.checkout(user, body.plan);
  }

  @Post('api/verify')
  @HttpCode(200)
  @ApiCookieAuth()
  @Roles(...SUBSCRIBER_ROLES)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Confirm a payment after returning from Paystack' })
  verify(
    @Body(new ZodValidationPipe(apiPlanVerifySchema)) body: ApiPlanVerifyInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.billingService.verifyForUser(user, body.reference);
  }

  @Get('api/admin')
  @ApiCookieAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE)
  @Permissions(PermissionCode.INVOICE_MANAGE)
  @ApiOperation({ summary: 'Admin: API revenue, active subscriptions and invoices' })
  adminOverview() {
    return this.billingService.adminOverview();
  }

  @Public()
  @SkipThrottle()
  @Post('paystack/webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  paystackWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature?: string,
  ) {
    return this.billingService.handlePaystackWebhook(req.rawBody, signature);
  }
}
