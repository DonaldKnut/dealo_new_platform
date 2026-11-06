import { z } from 'zod';

export const JOB_BOARD_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'TEMPORARY', 'INTERNSHIP', 'OTHER'] as const;
export type JobBoardType = (typeof JOB_BOARD_TYPES)[number];

export const JOB_BOARD_SOURCES = ['dealo', 'remotive', 'jobicy', 'arbeitnow'] as const;
export type JobBoardSource = (typeof JOB_BOARD_SOURCES)[number];

export const JOB_APPLICATION_STATUSES = ['SAVED', 'APPLIED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'] as const;
export type JobApplicationStatus = (typeof JOB_APPLICATION_STATUSES)[number];

const LISTING_ID = /^(dealo|ext)_[a-f0-9]{24}$/;
export const listingIdSchema = z.string().regex(LISTING_ID, 'Unknown job');

export const jobSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  location: z.string().trim().max(80).optional(),
  remote: z.enum(['true', 'false']).optional(),
  type: z.enum(JOB_BOARD_TYPES).optional(),
  category: z.string().trim().max(80).optional(),
  /** Only jobs posted in the last N days. */
  days: z.coerce.number().int().min(1).max(60).optional(),
  /** "dealo" = easy-apply jobs only, "external" = jobs from other boards only. */
  scope: z.enum(['all', 'dealo', 'external']).default('all'),
  page: z.coerce.number().int().min(1).max(50).default(1),
  pageSize: z.coerce.number().int().min(5).max(40).default(20),
});
export type JobSearchInput = z.infer<typeof jobSearchSchema>;

export const trackApplicationSchema = z.object({
  listingId: listingIdSchema,
  resumeId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
});
export type TrackApplicationInput = z.infer<typeof trackApplicationSchema>;

export const updateApplicationLogSchema = z.object({
  status: z.enum(JOB_APPLICATION_STATUSES).optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});
export type UpdateApplicationLogInput = z.infer<typeof updateApplicationLogSchema>;

export const saveJobSchema = z.object({ listingId: listingIdSchema });

/** One job as the board shows it, whether it is on Dealo or another site. */
export type JobListing = {
  id: string;
  kind: 'dealo' | 'external';
  title: string;
  company: string;
  companyLogo: string | null;
  location: string;
  remote: boolean;
  employmentType: JobBoardType;
  category: string | null;
  tags: string[];
  salary: string | null;
  summary: string;
  postedAt: string;
  source: { id: JobBoardSource; name: string; url: string };
  /** Dealo jobs: apply on Dealo with a CV. External jobs: apply on `applyUrl`. */
  easyApply: boolean;
  applyUrl: string;
  careers: { orgSlug: string; jobSlug: string } | null;
};

export type JobListingDetail = JobListing & {
  /** Sanitised HTML for external jobs; plain text with simple markdown for Dealo jobs. */
  description: string;
  descriptionFormat: 'html' | 'text';
  mustHaves: string[];
};

export type JobSearchResult = {
  items: JobListing[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  facets: { types: Array<{ value: JobBoardType; count: number }>; categories: Array<{ value: string; count: number }> };
};
