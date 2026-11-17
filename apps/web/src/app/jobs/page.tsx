import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { safeJsonLd } from '@/components/ats/careers-shell';
import { JobBoard } from '@/components/jobs/job-board';
import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { fetchFeaturedJobs } from '@/lib/jobs-public';
import { APP_URL, pageMetadata } from '@/lib/seo';
import { JOB_CITY_HUBS, JOB_ROLE_HUBS } from '@/lib/seo-job-hubs';

export const metadata: Metadata = pageMetadata({
  path: '/jobs',
  title: 'Jobs in Nigeria — Lagos, Abuja, remote & Easy Apply',
  description:
    'Search fresh jobs in Lagos, Abuja, Port Harcourt, and remote Nigeria. Easy Apply with your Dealo CV, track applications, or let Job Agent hunt overnight.',
  keywords: [
    'jobs in Nigeria',
    'jobs in Lagos',
    'jobs in Abuja',
    'remote jobs Nigeria',
    'Easy Apply Nigeria',
    'job board Nigeria',
    'vacancies Lagos',
  ],
});

export default async function JobsPage() {
  const featured = await fetchFeaturedJobs();
  const teaser = [...(featured?.dealo ?? []), ...(featured?.latest ?? [])].slice(0, 12);
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Jobs in Nigeria on Dealo',
    itemListElement: teaser.map((job, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${APP_URL}/jobs/${job.id}`,
      name: `${job.title} at ${job.company}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemList) }} />
      <BreadcrumbsJsonLd items={[{ name: 'Jobs', path: '/jobs' }]} />

      {/* Crawlable hub links — slim, responsive strip above the board. */}
      <nav
        className="container-page border-b border-border/70 pt-[calc(3.5rem+var(--safe-top)+0.75rem)] min-[340px]:pt-[calc(4.25rem+var(--safe-top)+0.85rem)] sm:pt-[calc(5rem+var(--safe-top)+1rem)]"
        aria-label="Jobs by city and role"
      >
        <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-3 min-[340px]:gap-2 min-[340px]:pb-3.5">
          {JOB_CITY_HUBS.map((c) => (
            <Link
              key={c.slug}
              href={`/jobs/in/${c.slug}`}
              className="inline-flex shrink-0 items-center rounded-full border border-border/80 bg-surface-elevated/80 px-3 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-brand hover:text-brand min-[340px]:text-xs"
            >
              {c.name}
            </Link>
          ))}
          <span aria-hidden className="mx-0.5 hidden h-6 w-px shrink-0 self-center bg-border sm:block" />
          {JOB_ROLE_HUBS.slice(0, 5).map((r) => (
            <Link
              key={r.slug}
              href={`/jobs/role/${r.slug}`}
              className="inline-flex shrink-0 items-center rounded-full border border-transparent bg-transparent px-2.5 py-1.5 text-[11px] font-medium text-muted transition hover:bg-surface hover:text-brand min-[340px]:text-xs"
            >
              {r.name}
            </Link>
          ))}
        </div>
      </nav>

      {teaser.length ? (
        <ul className="sr-only">
          {teaser.map((job) => (
            <li key={job.id}>
              <Link href={`/jobs/${job.id}`}>
                {job.title} at {job.company}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <Suspense fallback={<div className="min-h-[50vh]" />}>
        <JobBoard />
      </Suspense>
    </>
  );
}
