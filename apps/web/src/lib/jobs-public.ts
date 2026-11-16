import type { JobListing, JobListingDetail, JobSearchResult } from '@dealo/shared';

import { getApiBaseUrl } from '@/lib/api-base';

async function get<T>(path: string, revalidate = 120): Promise<T | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, { next: { revalidate } });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const fetchJobListing = (listingId: string) =>
  get<JobListingDetail>(`/jobs/listing/${encodeURIComponent(listingId)}`, 300);

export const fetchFeaturedJobs = () =>
  get<{ dealo: JobListing[]; latest: JobListing[]; counts: { dealo: number; external: number; total: number } }>(
    '/jobs/featured',
    120,
  );

export async function searchJobsPublic(params: {
  q?: string;
  location?: string;
  remote?: 'true' | 'false';
  page?: number;
  pageSize?: number;
}): Promise<JobSearchResult | null> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.location) query.set('location', params.location);
  if (params.remote) query.set('remote', params.remote);
  query.set('page', String(params.page ?? 1));
  query.set('pageSize', String(Math.min(40, Math.max(5, params.pageSize ?? 20))));
  return get<JobSearchResult>(`/jobs?${query.toString()}`, 120);
}

/** Crawl budget: paginate public search for sitemap (max ~2k). */
export async function fetchSitemapJobIds(limit = 2_000): Promise<Array<{ id: string; postedAt: string }>> {
  const out: Array<{ id: string; postedAt: string }> = [];
  const seen = new Set<string>();
  const pageSize = 40;
  const maxPages = Math.ceil(limit / pageSize);
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await searchJobsPublic({ page, pageSize });
    if (!result?.items.length) break;
    for (const job of result.items) {
      if (seen.has(job.id)) continue;
      seen.add(job.id);
      out.push({ id: job.id, postedAt: job.postedAt });
      if (out.length >= limit) return out;
    }
    if (!result.hasMore) break;
  }
  return out;
}

export function plainJobText(htmlOrText: string, max = 160) {
  const text = htmlOrText
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}
