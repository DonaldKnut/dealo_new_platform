import { z } from 'zod';

export const WebhookEvent = {
  HIRE_INQUIRY_CREATED: 'hire_inquiry.created',
  HIRE_INQUIRY_STATUS_UPDATED: 'hire_inquiry.status_updated',
  APPLICATION_CREATED: 'application.created',
  APPLICATION_STAGE_CHANGED: 'application.stage_changed',
  OFFER_ACCEPTED: 'offer.accepted',
  PING: 'ping',
} as const;

export type WebhookEvent = (typeof WebhookEvent)[keyof typeof WebhookEvent];

export const SUBSCRIBABLE_WEBHOOK_EVENTS = [
  WebhookEvent.HIRE_INQUIRY_CREATED,
  WebhookEvent.HIRE_INQUIRY_STATUS_UPDATED,
  WebhookEvent.APPLICATION_CREATED,
  WebhookEvent.APPLICATION_STAGE_CHANGED,
  WebhookEvent.OFFER_ACCEPTED,
] as const;

const webhookEventEnum = z.enum(SUBSCRIBABLE_WEBHOOK_EVENTS);

export const createWebhookEndpointSchema = z.object({
  url: z.string().trim().url().max(2048),
  description: z.string().trim().max(200).optional(),
  events: z.array(webhookEventEnum).min(1),
  /** Admin-only: receive events for every inquiry, not just your own. */
  isGlobal: z.boolean().optional().default(false),
});

export type CreateWebhookEndpointInput = z.infer<typeof createWebhookEndpointSchema>;

export const updateWebhookEndpointSchema = z.object({
  url: z.string().trim().url().max(2048).optional(),
  description: z.string().trim().max(200).optional().nullable(),
  events: z.array(webhookEventEnum).min(1).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateWebhookEndpointInput = z.infer<typeof updateWebhookEndpointSchema>;
