import { z } from 'zod';

export const hireInquiryStatusUpdateSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'CLOSED']),
});

export type HireInquiryStatusUpdate = z.infer<typeof hireInquiryStatusUpdateSchema>;
