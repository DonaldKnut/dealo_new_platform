import { getApiBaseUrl } from '@/lib/api-base';
import type { PublicJob, PublicOrganization } from '@/lib/ats-api';

async function get<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, { next: { revalidate: 60 } });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const fetchCareers = (orgSlug: string) =>
  get<{ organization: PublicOrganization; jobs: PublicJob[] }>(`/careers/${encodeURIComponent(orgSlug)}`);

export const fetchCareersJob = (orgSlug: string, jobSlug: string) =>
  get<{ organization: PublicOrganization; job: PublicJob & { description: string } }>(
    `/careers/${encodeURIComponent(orgSlug)}/${encodeURIComponent(jobSlug)}`,
  );

export const fetchCareersIndex = async () =>
  (await get<Array<{ orgSlug: string; jobSlug: string; updatedAt: string }>>('/careers')) ?? [];
