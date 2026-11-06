import type { JobApplicationStatus, JobBoardType, JobListing, JobListingDetail, JobSearchResult } from '@dealo/shared';

import { apiFetch } from '@/lib/api';

export type JobFilters = {
  q?: string;
  location?: string;
  remote?: 'true' | 'false';
  type?: JobBoardType;
  category?: string;
  days?: number;
  scope?: 'all' | 'dealo' | 'external';
};

export type SavedJob = { id: string; listingId: string; title: string; company: string; createdAt: string };

export type TrackedApplication = {
  id: string;
  listingId: string;
  title: string;
  company: string;
  url: string;
  source: string;
  resumeId: string | null;
  status: JobApplicationStatus;
  note: string | null;
  appliedAt: string;
  updatedAt: string;
};

function query(filters: JobFilters & { page?: number; pageSize?: number }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && !(key === 'scope' && value === 'all')) params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

export const jobsApi = {
  search: (filters: JobFilters, page = 1) => apiFetch<JobSearchResult>(`/jobs${query({ ...filters, page })}`),
  featured: () => apiFetch<{ dealo: JobListing[]; latest: JobListing[]; counts: { dealo: number; external: number; total: number } }>('/jobs/featured'),
  detail: (listingId: string) => apiFetch<JobListingDetail>(`/jobs/listing/${listingId}`),

  saved: () => apiFetch<SavedJob[]>('/jobs/me/saved'),
  save: (listingId: string) => apiFetch<SavedJob>('/jobs/me/saved', { method: 'POST', json: { listingId } }),
  unsave: (listingId: string) => apiFetch(`/jobs/me/saved/${listingId}`, { method: 'DELETE' }),

  applications: () => apiFetch<TrackedApplication[]>('/jobs/me/applications'),
  track: (listingId: string, resumeId?: string) =>
    apiFetch<TrackedApplication>('/jobs/me/applications', { method: 'POST', json: { listingId, ...(resumeId ? { resumeId } : {}) } }),
  updateApplication: (id: string, body: { status?: JobApplicationStatus; note?: string | null }) =>
    apiFetch<TrackedApplication>(`/jobs/me/applications/${id}`, { method: 'PATCH', json: body }),
  removeApplication: (id: string) => apiFetch(`/jobs/me/applications/${id}`, { method: 'DELETE' }),
};

export const JOB_TYPE_LABEL: Record<JobBoardType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  FREELANCE: 'Freelance',
  TEMPORARY: 'Temporary',
  INTERNSHIP: 'Internship',
  OTHER: 'Not specified',
};

export const APPLICATION_STATUS_LABEL: Record<JobApplicationStatus, string> = {
  SAVED: 'Saved',
  APPLIED: 'Applied',
  INTERVIEW: 'Interviewing',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Not selected',
  WITHDRAWN: 'Withdrawn',
};

export function postedAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 60) return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  return weeks < 5 ? `${weeks}w ago` : new Date(iso).toLocaleDateString();
}

/** Stable pastel colour for a company without a logo. */
export function companyColor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const palette = ['#0f766e', '#1d4ed8', '#7c3aed', '#b45309', '#be123c', '#0369a1', '#4d7c0f', '#9333ea'];
  return palette[hash % palette.length];
}
