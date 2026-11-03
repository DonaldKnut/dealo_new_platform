import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createWebhookEndpointSchema,
  updateWebhookEndpointSchema,
  type CreateWebhookEndpointInput,
  type UpdateWebhookEndpointInput,
  UserRole,
} from '@dealo/shared';
import { Throttle } from '@nestjs/throttler';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { WebhooksService } from './webhooks.service';

const WEBHOOK_ROLES = [
  UserRole.EMPLOYER,
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.RECRUITER,
  UserRole.OPERATIONS,
] as const;

@ApiTags('webhooks')
@ApiCookieAuth()
@Controller('webhooks')
@Roles(...WEBHOOK_ROLES)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  @ApiOperation({ summary: 'List webhook endpoints (yours; admins see all)' })
  list(@CurrentUser() user: AuthUser) {
    return this.webhooksService.list(user);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Register a webhook endpoint (signing secret returned once)',
    description:
      'Events are POSTed as JSON with headers X-Dealo-Event, X-Dealo-Delivery and X-Dealo-Signature (t=<unix>,v1=<HMAC-SHA256 hex of "<t>.<body>">).',
  })
  create(
    @Body(new ZodValidationPipe(createWebhookEndpointSchema)) body: CreateWebhookEndpointInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.webhooksService.create(body, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update URL, events or active state' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWebhookEndpointSchema)) body: UpdateWebhookEndpointInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.webhooksService.update(id, body, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook endpoint and its delivery history' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.webhooksService.remove(id, user);
  }

  @Post(':id/rotate-secret')
  @ApiOperation({ summary: 'Rotate the signing secret (new secret returned once)' })
  rotateSecret(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.webhooksService.rotateSecret(id, user);
  }

  @Post(':id/test')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send a signed ping event now' })
  sendTest(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.webhooksService.sendTest(id, user);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Last 50 deliveries for an endpoint' })
  deliveries(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.webhooksService.deliveries(id, user);
  }

  @Post('deliveries/:deliveryId/redeliver')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Retry a delivery immediately' })
  redeliver(@Param('deliveryId') deliveryId: string, @CurrentUser() user: AuthUser) {
    return this.webhooksService.redeliver(deliveryId, user);
  }
}
