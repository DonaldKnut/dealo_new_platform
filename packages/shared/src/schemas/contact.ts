import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().email().max(255),
  company: z.string().trim().max(200).optional(),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(20).max(4000),
});

export type ContactInput = z.infer<typeof contactSchema>;
