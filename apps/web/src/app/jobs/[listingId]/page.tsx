import { ArrowLeft, Briefcase, ExternalLink, MapPin, Sparkles, Wallet, Zap } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JobDescription } from '@/components/ats/job-description';
import { safeJsonLd } from '@/components/ats/careers-shell';
import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { JOB_TYPE_LABEL, postedAgo } from '@/lib/jobs-api';
import { fetchJobListing, plainJobText } from '@/lib/jobs-public';
import { APP_URL, pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ listingId: string }> };

const RESERVED = new Set(['in', 'role', 'nigeria']);

const SCHEMA_EMPLOYMENT: Record<string, string> = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  CONTRACT: 'CONTRACTOR',
  FREELANCE: 'CONTRACTOR',
  TEMPORARY: 'TEMPORARY',
  INTERNSHIP: 'INTERN',
  OTHER: 'OTHER',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { listingId } = await params;
  if (RESERVED.has(listingId)) return { title: 'Jobs', robots: { index: false } };
  const job = await fetchJobListing(listingId);
  if (!job) return { title: 'Job not found', robots: { index: false, follow: true } };
  const loc = job.remote ? 'Remote' : job.location;
  return pageMetadata({
    path: `/jobs/${job.id}`,
    title: `${job.title} at ${job.company} · ${loc}`,
    description: plainJobText(job.summary || job.description, 155),
    keywords: [job.title, `${job.title} ${job.location}`, 'jobs in Nigeria', job.company, job.remote ? 'remote jobs Nigeria' : 'Lagos jobs'].filter(
      Boolean,
    ),
  });
}

export default async function JobListingPage({ params }: Props) {
  const { listingId } = await params;
  if (RESERVED.has(listingId)) notFound();
  const job = await fetchJobListing(listingId);
  if (!job) notFound();

  const posted = new Date(job.postedAt);
  const validThrough = new Date(posted.getTime() + 60 * 86_400_000);
  const descriptionHtml =
    job.descriptionFormat === 'html'
      ? job.description
      : job.description
          .split(/\n{2,}/)
          .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
          .join('');

  const jobJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: descriptionHtml,
    identifier: { '@type': 'PropertyValue', name: 'Dealo', value: job.id },
    datePosted: posted.toISOString(),
    validThrough: validThrough.toISOString(),
    employmentType: SCHEMA_EMPLOYMENT[job.employmentType] ?? 'OTHER',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company,
      logo: job.companyLogo ?? undefined,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location || 'Nigeria',
        addressCountry: 'NG',
      },
    },
    ...(job.remote
      ? { jobLocationType: 'TELECOMMUTE', applicantLocationRequirements: { '@type': 'Country', name: 'Nigeria' } }
      : {}),
    directApply: job.easyApply || job.emailApply,
    url: `${APP_URL}/jobs/${job.id}`,
  };

  const applyHref = job.careers
    ? `/careers/${job.careers.orgSlug}/${job.careers.jobSlug}`
    : job.easyApply || job.emailApply
      ? `/jobs?job=${encodeURIComponent(job.id)}&apply=1`
      : job.applyUrl;
  const stayOnDealo = Boolean(job.easyApply || job.emailApply || job.careers);

  return (
    <article className="pb-20 pt-24 min-[340px]:pt-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jobJsonLd) }} />
      <BreadcrumbsJsonLd
        items={[
          { name: 'Jobs', path: '/jobs' },
          { name: job.title, path: `/jobs/${job.id}` },
        ]}
      />

      <div className="container-page max-w-3xl">
        <Link href="/jobs" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-brand">
          <ArrowLeft className="h-4 w-4" /> All jobs
        </Link>

        <header className="mt-6">
          <div className="flex flex-wrap gap-2">
            {job.easyApply ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:text-[#071f14]">
                <Zap className="h-3 w-3" /> Easy apply
              </span>
            ) : null}
            {job.emailApply ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                Email apply
              </span>
            ) : null}
            <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted">{job.source.name}</span>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted">{postedAgo(job.postedAt)}</span>
          </div>
          <h1 className="mt-4 font-display text-3xl leading-tight text-foreground min-[340px]:text-4xl sm:text-5xl">{job.title}</h1>
          <p className="mt-2 text-lg text-muted">{job.company}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-brand" /> {job.location}
              {job.remote ? ' · Remote' : ''}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-brand" /> {JOB_TYPE_LABEL[job.employmentType]}
            </span>
            {job.salary ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Wallet className="h-4 w-4 text-brand" /> {job.salary}
              </span>
            ) : null}
          </div>
        </header>

        <div className="mt-8 flex flex-wrap gap-3">
          {stayOnDealo ? (
            <Link href={applyHref} className="btn-primary">
              {job.emailApply && !job.easyApply ? 'Email apply on Dealo' : 'Apply on Dealo'}
            </Link>
          ) : (
            <a href={applyHref} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-1.5">
              Apply on {job.source.name} <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <Link href="/job-agent" className="btn-secondary inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" /> Let Job Agent hunt for you
          </Link>
          <Link href="/resume-builder" className="btn-secondary">
            Build a CV
          </Link>
        </div>

        <section className="prose-dealo mt-10 max-w-none">
          <h2 className="font-display text-xl text-foreground">About the role</h2>
          <JobDescription className="mt-4" text={job.description || job.summary} />
          {job.mustHaves?.length ? (
            <div className="mt-8">
              <h3 className="font-display text-lg text-foreground">Must-haves</h3>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
                {job.mustHaves.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <aside className="mt-12 rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
          <p className="font-semibold text-foreground">Looking in {job.location.split(',')[0] || 'Nigeria'}?</p>
          <p className="mt-1">
            Browse{' '}
            <Link href="/jobs/in/lagos" className="font-semibold text-brand">
              jobs in Lagos
            </Link>
            ,{' '}
            <Link href="/jobs/in/abuja" className="font-semibold text-brand">
              Abuja
            </Link>
            , or{' '}
            <Link href="/jobs/in/remote-nigeria" className="font-semibold text-brand">
              remote Nigeria
            </Link>
            . Or turn on the{' '}
            <Link href="/job-agent" className="font-semibold text-brand">
              Job Agent
            </Link>{' '}
            to apply while you sleep.
          </p>
        </aside>
      </div>
    </article>
  );
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
