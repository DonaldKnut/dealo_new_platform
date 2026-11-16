import type { JobListing } from '@dealo/shared';
import { ArrowRight, MapPin, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { safeJsonLd } from '@/components/ats/careers-shell';
import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { JOB_TYPE_LABEL, postedAgo } from '@/lib/jobs-api';
import { APP_URL } from '@/lib/seo';
import { JOB_CITY_HUBS, JOB_ROLE_HUBS } from '@/lib/seo-job-hubs';

export function JobHubPage({
  breadcrumbs,
  h1,
  intro,
  jobs,
  path,
  related,
}: {
  breadcrumbs: { name: string; path: string }[];
  h1: string;
  intro: string;
  jobs: JobListing[];
  path: string;
  related?: ReactNode;
}) {
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: jobs.slice(0, 30).map((job, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${APP_URL}/jobs/${job.id}`,
      name: `${job.title} at ${job.company}`,
    })),
  };

  return (
    <div className="pb-20 pt-24 min-[340px]:pt-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemList) }} />
      <BreadcrumbsJsonLd items={breadcrumbs} />

      <div className="container-page">
        <header className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">Dealo jobs</p>
          <h1 className="mt-3 font-display text-3xl leading-tight text-foreground min-[340px]:text-4xl sm:text-5xl">{h1}</h1>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/job-agent" className="btn-primary inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> Start Job Agent
            </Link>
            <Link href="/resume-builder" className="btn-secondary">
              Free CV builder
            </Link>
            <Link href="/jobs" className="btn-secondary">
              Full job board
            </Link>
          </div>
        </header>

        <section className="mx-auto mt-12 max-w-3xl">
          <h2 className="font-display text-xl text-foreground">Open roles</h2>
          {jobs.length ? (
            <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface-elevated">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Link href={`/jobs/${job.id}`} className="block px-4 py-4 transition hover:bg-brand-soft/30 min-[340px]:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{job.title}</p>
                        <p className="mt-0.5 text-sm text-muted">{job.company}</p>
                        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> {job.location}
                            {job.remote ? ' · Remote' : ''}
                          </span>
                          <span>{JOB_TYPE_LABEL[job.employmentType]}</span>
                          <span>{postedAgo(job.postedAt)}</span>
                        </p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-brand" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
              No live matches in this slice right now. Browse the{' '}
              <Link href="/jobs" className="font-semibold text-brand">
                full board
              </Link>{' '}
              or turn on{' '}
              <Link href="/job-agent" className="font-semibold text-brand">
                Job Agent
              </Link>{' '}
              so Dealo hunts overnight.
            </p>
          )}
        </section>

        {related ? <section className="mx-auto mt-12 max-w-3xl">{related}</section> : null}

        <nav className="mx-auto mt-14 max-w-3xl border-t border-border pt-8" aria-label="More job hubs">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Explore Nigeria</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {JOB_CITY_HUBS.map((city) => (
              <Link
                key={city.slug}
                href={`/jobs/in/${city.slug}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  path.includes(`/in/${city.slug}`) ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted hover:border-brand/40 hover:text-brand'
                }`}
              >
                {city.name}
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {JOB_ROLE_HUBS.map((role) => (
              <Link
                key={role.slug}
                href={`/jobs/role/${role.slug}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  path.includes(`/role/${role.slug}`) || path.endsWith(`/${role.slug}`)
                    ? 'border-brand bg-brand-soft text-brand'
                    : 'border-border text-muted hover:border-brand/40 hover:text-brand'
                }`}
              >
                {role.name}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
