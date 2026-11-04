import { z } from 'zod';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour time like 07:30');

export const createWorkSiteSchema = z.object({
  name: z.string().trim().min(2, 'Give the site a name').max(120),
  address: z.string().trim().max(240).optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().int().min(50).max(5000).default(200),
  timezone: z.string().trim().min(3).max(60).default('Africa/Lagos'),
  shiftStart: hhmm.default('07:30'),
  shiftEnd: hhmm.default('17:30'),
  graceMinutes: z.coerce.number().int().min(0).max(120).default(15),
  slaCoverHours: z.coerce.number().int().min(1).max(168).default(48),
  hireInquiryId: z.string().trim().min(1).optional(),
});

export type CreateWorkSiteInput = z.infer<typeof createWorkSiteSchema>;

export const updateWorkSiteSchema = createWorkSiteSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateWorkSiteInput = z.infer<typeof updateWorkSiteSchema>;

export const createPlacementSchema = z.object({
  candidateId: z.string().trim().min(1, 'Pick a professional'),
  roleTitle: z.string().trim().min(2).max(120),
  isStandby: z.boolean().default(false),
  startDate: z.string().trim().min(8).optional(),
});

export type CreatePlacementInput = z.infer<typeof createPlacementSchema>;

export const updatePlacementSchema = z.object({
  isStandby: z.boolean().optional(),
  ended: z.boolean().optional(),
  roleTitle: z.string().trim().min(2).max(120).optional(),
});

export type UpdatePlacementInput = z.infer<typeof updatePlacementSchema>;

export const attendanceSchema = z.object({
  placementId: z.string().trim().min(1),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracyMeters: z.coerce.number().min(0).max(100_000).optional(),
});

export type AttendanceInput = z.infer<typeof attendanceSchema>;

export const assignCoverSchema = z.object({
  standbyPlacementId: z.string().trim().min(1, 'Pick a standby worker'),
});

export type AssignCoverInput = z.infer<typeof assignCoverSchema>;

export const opsNoteSchema = z.object({
  message: z.string().trim().min(2).max(500),
});

export type OpsNoteInput = z.infer<typeof opsNoteSchema>;
