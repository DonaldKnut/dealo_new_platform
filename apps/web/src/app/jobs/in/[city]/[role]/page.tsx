import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JobHubPage } from '@/components/jobs/job-hub-page';
import { searchJobsPublic } from '@/lib/jobs-public';
import { pageMetadata } from '@/lib/seo';
import { JOB_CITY_ROLE_PAIRS, cityHub, roleHub } from '@/lib/seo-job-hubs';

type Props = { params: Promise<{ city: string; role: string }> };

export function generateStaticParams() {
  return JOB_CITY_ROLE_PAIRS.map((p) => ({ city: p.city, role: p.role }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city, role } = await params;
  const c = cityHub(city);
  const r = roleHub(role);
  if (!c || !r) return { title: 'Jobs', robots: { index: false } };
  return pageMetadata({
    path: `/jobs/in/${c.slug}/${r.slug}`,
    title: `${r.name} jobs in ${c.name} — Dealo`,
    description: `Live ${r.name.toLowerCase()} jobs in ${c.name}. Apply with your Dealo CV or let Job Agent hunt overnight across Nigerian boards.`,
    keywords: [`${r.name} jobs ${c.name}`, `${r.name.toLowerCase()} jobs Nigeria`, ...c.keywords.slice(0, 2), ...r.keywords.slice(0, 2)],
  });
}

export default async function JobsCityRolePage({ params }: Props) {
  const { city, role } = await params;
  const c = cityHub(city);
  const r = roleHub(role);
  if (!c || !r) notFound();

  const result = await searchJobsPublic({
    q: r.query,
    location: c.locationQuery || undefined,
    remote: c.remote,
    pageSize: 30,
  });
  const jobs = result?.items ?? [];

  return (
    <JobHubPage
      path={`/jobs/in/${c.slug}/${r.slug}`}
      breadcrumbs={[
        { name: 'Jobs', path: '/jobs' },
        { name: c.name, path: `/jobs/in/${c.slug}` },
        { name: r.name, path: `/jobs/in/${c.slug}/${r.slug}` },
      ]}
      h1={`${r.name} jobs in ${c.name}`}
      intro={`High-intent openings for ${r.name.toLowerCase()} roles in ${c.name}. Each listing has its own page for Google — click through to apply on Dealo or the employer site.`}
      jobs={jobs}
      related={
        <p className="text-sm text-muted">
          See all{' '}
          <Link href={`/jobs/role/${r.slug}`} className="font-semibold text-brand">
            {r.name.toLowerCase()} jobs
          </Link>{' '}
          or everything in{' '}
          <Link href={`/jobs/in/${c.slug}`} className="font-semibold text-brand">
            {c.name}
          </Link>
          .
        </p>
      }
    />
  );
}
