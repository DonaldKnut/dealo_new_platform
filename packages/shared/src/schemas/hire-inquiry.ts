import { z } from 'zod';

import { ServiceType, WorkArrangement } from '../enums';

export const hireInquirySchema = z
  .object({
    companyName: z.string().trim().min(2).max(200),
    contactName: z.string().trim().min(2).max(150),
    email: z.string().email().max(255),
    phone: z.string().trim().min(7).max(30),
    serviceType: z.enum([ServiceType.DIRECT_RECRUITMENT, ServiceType.MANAGED_STAFFING]),
    roleTitle: z.string().trim().min(2).max(200),
    numberOfProfessionals: z.coerce.number().int().min(1).max(500),
    location: z.string().trim().min(2).max(200),
    workArrangement: z.enum([
      WorkArrangement.ONSITE,
      WorkArrangement.HYBRID,
      WorkArrangement.REMOTE,
    ]),
    expectedStartDate: z.string().optional(),
    compensationMinMinor: z.coerce.number().int().nonnegative().optional(),
    compensationMaxMinor: z.coerce.number().int().nonnegative().optional(),
    currency: z.string().length(3).default('NGN'),
    durationNotes: z.string().trim().max(1000).optional(),
    requirements: z.string().trim().min(20).max(5000),
    additionalNotes: z.string().trim().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.compensationMinMinor !== undefined &&
      data.compensationMaxMinor !== undefined &&
      data.compensationMaxMinor < data.compensationMinMinor
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['compensationMaxMinor'],
        message: 'Maximum compensation must be greater than or equal to minimum',
      });
    }

    if (data.serviceType === ServiceType.MANAGED_STAFFING && !data.durationNotes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['durationNotes'],
        message: 'Expected duration or engagement notes are required for managed staffing',
      });
    }
  });

export type HireInquiryInput = z.infer<typeof hireInquirySchema>;
