import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JobHubPage } from '@/components/jobs/job-hub-page';
import { searchJobsPublic } from '@/lib/jobs-public';
import { pageMetadata } from '@/lib/seo';
import { JOB_CITY_HUBS, JOB_ROLE_HUBS, cityHub } from '@/lib/seo-job-hubs';

type Props = { params: Promise<{ city: string }> };

export function generateStaticParams() {
  return JOB_CITY_HUBS.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const hub = cityHub(city);
  if (!hub) return { title: 'Jobs', robots: { index: false } };
  return pageMetadata({
    path: `/jobs/in/${hub.slug}`,
    title: hub.title,
    description: hub.description,
    keywords: hub.keywords,
  });
}

export default async function JobsInCityPage({ params }: Props) {
  const { city } = await params;
  const hub = cityHub(city);
  if (!hub) notFound();

  const result = await searchJobsPublic({
    location: hub.locationQuery || undefined,
    remote: hub.remote,
    pageSize: 30,
  });
  const jobs = result?.items ?? [];

  return (
    <JobHubPage
      path={`/jobs/in/${hub.slug}`}
      breadcrumbs={[
        { name: 'Jobs', path: '/jobs' },
        { name: hub.name, path: `/jobs/in/${hub.slug}` },
      ]}
      h1={hub.h1}
      intro={hub.intro}
      jobs={jobs}
      related={
        <div>
          <h2 className="font-display text-lg text-foreground">Popular roles in {hub.name}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {JOB_ROLE_HUBS.slice(0, 5).map((role) => (
              <li key={role.slug}>
                <Link href={`/jobs/in/${hub.slug}/${role.slug}`} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-brand hover:text-brand">
                  {role.name} in {hub.name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            Employers hiring in {hub.name}:{' '}
            <Link href="/hire" className="font-semibold text-brand">
              request a hire
            </Link>{' '}
            or see{' '}
            <Link href="/guides/hire-talent-lagos" className="font-semibold text-brand">
              hire talent in Lagos
            </Link>
            .
          </p>
        </div>
      }
    />
  );
}
