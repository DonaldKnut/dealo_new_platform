import { z } from 'zod';

export const SupportTicketPriority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export const SupportTicketStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_ON_USER: 'WAITING_ON_USER',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;

export const supportTicketCreateSchema = z.object({
  subject: z.string().trim().min(4).max(200),
  body: z.string().trim().min(8).max(5000),
  priority: z.enum([
    SupportTicketPriority.LOW,
    SupportTicketPriority.NORMAL,
    SupportTicketPriority.HIGH,
    SupportTicketPriority.URGENT,
  ]),
  category: z.string().trim().min(2).max(80),
});

export type SupportTicketCreateInput = z.infer<typeof supportTicketCreateSchema>;

export const supportTicketReplySchema = z.object({
  body: z.string().trim().min(1).max(5000),
  internal: z.boolean(),
});

export type SupportTicketReplyInput = z.infer<typeof supportTicketReplySchema>;

export const supportTicketStatusSchema = z.object({
  status: z.enum([
    SupportTicketStatus.OPEN,
    SupportTicketStatus.IN_PROGRESS,
    SupportTicketStatus.WAITING_ON_USER,
    SupportTicketStatus.RESOLVED,
    SupportTicketStatus.CLOSED,
  ]),
});

export type SupportTicketStatusInput = z.infer<typeof supportTicketStatusSchema>;
