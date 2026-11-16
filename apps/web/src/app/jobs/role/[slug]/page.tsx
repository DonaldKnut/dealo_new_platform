import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JobHubPage } from '@/components/jobs/job-hub-page';
import { searchJobsPublic } from '@/lib/jobs-public';
import { pageMetadata } from '@/lib/seo';
import { JOB_CITY_HUBS, JOB_ROLE_HUBS, roleHub } from '@/lib/seo-job-hubs';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return JOB_ROLE_HUBS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const hub = roleHub(slug);
  if (!hub) return { title: 'Jobs', robots: { index: false } };
  return pageMetadata({
    path: `/jobs/role/${hub.slug}`,
    title: hub.title,
    description: hub.description,
    keywords: hub.keywords,
  });
}

export default async function JobsByRolePage({ params }: Props) {
  const { slug } = await params;
  const hub = roleHub(slug);
  if (!hub) notFound();

  const result = await searchJobsPublic({ q: hub.query, pageSize: 30 });
  const jobs = result?.items ?? [];

  return (
    <JobHubPage
      path={`/jobs/role/${hub.slug}`}
      breadcrumbs={[
        { name: 'Jobs', path: '/jobs' },
        { name: hub.name, path: `/jobs/role/${hub.slug}` },
      ]}
      h1={hub.h1}
      intro={hub.intro}
      jobs={jobs}
      related={
        <div>
          <h2 className="font-display text-lg text-foreground">{hub.name} by city</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {JOB_CITY_HUBS.filter((c) => c.slug !== 'remote-nigeria' || hub.slug === 'software-engineer' || hub.slug === 'customer-service' || hub.slug === 'accountant').map(
              (city) => (
                <li key={city.slug}>
                  <Link
                    href={`/jobs/in/${city.slug}/${hub.slug}`}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-brand hover:text-brand"
                  >
                    {hub.name} in {city.name}
                  </Link>
                </li>
              ),
            )}
          </ul>
          <p className="mt-4 text-sm text-muted">
            Keep a sharp CV with the{' '}
            <Link href="/guides/cv-builder-nigeria" className="font-semibold text-brand">
              free CV builder for Nigeria
            </Link>
            , or automate with the{' '}
            <Link href="/guides/ai-job-agent-nigeria" className="font-semibold text-brand">
              AI Job Agent
            </Link>
            .
          </p>
        </div>
      }
    />
  );
}
