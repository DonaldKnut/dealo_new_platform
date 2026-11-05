import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CareersHeader, PoweredByDealo, brandStyle, safeJsonLd } from '@/components/ats/careers-shell';
import { CareersJobList } from '@/components/ats/careers-job-list';
import { fetchCareers } from '@/lib/careers-public';
import { APP_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ orgSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params;
  const data = await fetchCareers(orgSlug);
  if (!data) return { title: 'Careers page not found', robots: { index: false } };
  const { organization: org, jobs } = data;
  return pageMetadata({
    path: `/careers/${org.slug}`,
    title: `Jobs at ${org.name}`,
    description: `${jobs.length} open ${jobs.length === 1 ? 'job' : 'jobs'} at ${org.name}. ${org.about?.slice(0, 120) ?? 'Apply online in a few minutes.'}`,
  });
}

export default async function CareersPage({ params }: Props) {
  const { orgSlug } = await params;
  const data = await fetchCareers(orgSlug);
  if (!data) notFound();
  const { organization: org, jobs } = data;

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    url: org.website ?? `${APP_URL}/careers/${org.slug}`,
    logo: org.logoUrl ?? undefined,
    description: org.about ?? undefined,
  };

  return (
    <div style={brandStyle(org)} className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(orgJsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: `${org.name} careers`, path: `/careers/${org.slug}` }])),
        }}
      />
      <CareersHeader org={org}>
        <h1 className="mt-6 max-w-3xl font-display text-3xl leading-tight text-foreground min-[340px]:text-4xl sm:text-5xl">
          Work at {org.name}
        </h1>
        {org.about ? <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-muted sm:text-base">{org.about}</p> : null}
      </CareersHeader>
      <main className="mx-auto w-full max-w-5xl px-3 pt-8 min-[340px]:px-5 sm:px-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          {jobs.length} open {jobs.length === 1 ? 'job' : 'jobs'}
        </p>
        <CareersJobList orgSlug={org.slug} jobs={jobs} />
        <PoweredByDealo />
      </main>
    </div>
  );
}
