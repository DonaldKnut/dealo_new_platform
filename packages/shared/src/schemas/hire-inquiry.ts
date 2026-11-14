import { z } from 'zod';

import { RoleFamily, ServiceType, WorkArrangement } from '../enums';

export const hireInquirySchema = z
  .object({
    companyName: z.string().trim().min(2).max(200),
    contactName: z.string().trim().min(2).max(150),
    email: z.string().email().max(255),
    phone: z.string().trim().min(7).max(30),
    roleFamily: z.enum([RoleFamily.OFFICE_PROFESSIONAL, RoleFamily.SKILLED_TRADE]),
    serviceType: z.enum([
      ServiceType.DIRECT_RECRUITMENT,
      ServiceType.MANAGED_STAFFING,
      ServiceType.CONTRACT_COVER,
      ServiceType.TALENT_TRAINING,
    ]),
    roleTitle: z
      .string()
      .trim()
      .min(2)
      .max(200)
      .refine((value) => !/\d/.test(value), {
        message: 'Role title should not include numbers',
      }),
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
    // One short sentence is enough — sales can deepen on the call.
    requirements: z.string().trim().min(8).max(5000),
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

    const needsDuration =
      data.serviceType === ServiceType.MANAGED_STAFFING ||
      data.serviceType === ServiceType.CONTRACT_COVER ||
      data.roleFamily === RoleFamily.SKILLED_TRADE;

    if (needsDuration && !data.durationNotes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['durationNotes'],
        message:
          data.serviceType === ServiceType.CONTRACT_COVER
            ? 'How many days of cover do you need?'
            : data.roleFamily === RoleFamily.SKILLED_TRADE
              ? 'Contract length or site duration is required for skilled trades'
              : 'Expected duration or engagement notes are required for managed staffing',
      });
    }
  });

export type HireInquiryInput = z.infer<typeof hireInquirySchema>;
