import { z } from 'zod';

export const mailOneUserSchema = z.object({
  userId: z.string().min(1).optional(),
  email: z.string().email().optional(),
  subject: z.string().trim().min(3).max(200),
  bodyHtml: z.string().trim().min(8).max(50_000),
  bodyText: z.string().trim().max(50_000).optional(),
}).refine((data) => Boolean(data.userId || data.email), {
  message: 'Provide userId or email',
  path: ['email'],
});

export type MailOneUserInput = z.infer<typeof mailOneUserSchema>;

export const mailAllUsersSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  bodyHtml: z.string().trim().min(8).max(50_000),
  bodyText: z.string().trim().max(50_000).optional(),
  roleFilter: z.enum(['ALL', 'EMPLOYER', 'TALENT', 'STAFF']),
});

export type MailAllUsersInput = z.infer<typeof mailAllUsersSchema>;
