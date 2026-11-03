import { z } from 'zod';

export const clientAuditEventSchema = z.object({
  action: z.string().trim().min(2).max(120),
  entityType: z.string().trim().min(2).max(80).default('Frontend'),
  entityId: z.string().trim().max(120).optional(),
  metadata: z.record(z.unknown()).optional(),
  path: z.string().trim().max(500).optional(),
});

export type ClientAuditEventInput = z.infer<typeof clientAuditEventSchema>;
