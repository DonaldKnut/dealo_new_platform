import { ArrowLeft, Banknote, Briefcase, CheckCircle2, MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CareersApplyForm } from '@/components/ats/careers-apply-form';
import { CareersHeader, PoweredByDealo, brandStyle, safeJsonLd } from '@/components/ats/careers-shell';
import { JobDescription, plainSummary } from '@/components/ats/job-description';
import { ARRANGEMENT_LABEL, EMPLOYMENT_LABEL, formatPay } from '@/lib/ats-api';
import { fetchCareersJob } from '@/lib/careers-public';
import { APP_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ orgSlug: string; jobSlug: string }> };

const SCHEMA_EMPLOYMENT: Record<string, string> = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  CONTRACT: 'CONTRACTOR',
  TEMPORARY: 'TEMPORARY',
  INTERNSHIP: 'INTERN',
};

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, jobSlug } = await params;
  const data = await fetchCareersJob(orgSlug, jobSlug);
  if (!data) return { title: 'Job not found', robots: { index: false } };
  const { organization: org, job } = data;
  return pageMetadata({
    path: `/careers/${org.slug}/${job.slug}`,
    title: `${job.title} at ${org.name} — ${job.location}`,
    description: plainSummary(job.description, 155),
  });
}

export default async function CareersJobPage({ params }: Props) {
  const { orgSlug, jobSlug } = await params;
  const data = await fetchCareersJob(orgSlug, jobSlug);
  if (!data) notFound();
  const { organization: org, job } = data;
  const pay = formatPay(job);
  const posted = job.publishedAt ? new Date(job.publishedAt) : new Date(job.updatedAt);
  const validThrough = new Date(posted.getTime() + 60 * 86_400_000);

  const jobJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description
      .split(/\n{2,}/)
      .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
      .join(''),
    identifier: { '@type': 'PropertyValue', name: org.name, value: job.id },
    datePosted: posted.toISOString(),
    validThrough: validThrough.toISOString(),
    employmentType: SCHEMA_EMPLOYMENT[job.employmentType] ?? 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: org.name,
      sameAs: org.website ?? undefined,
      logo: org.logoUrl ?? undefined,
    },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: job.location, addressCountry: 'NG' },
    },
    ...(job.workArrangement === 'REMOTE'
      ? { jobLocationType: 'TELECOMMUTE', applicantLocationRequirements: { '@type': 'Country', name: 'Nigeria' } }
      : {}),
    ...(job.salaryMinMinor || job.salaryMaxMinor
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: job.currency,
            value: {
              '@type': 'QuantitativeValue',
              minValue: job.salaryMinMinor ? job.salaryMinMinor / 100 : undefined,
              maxValue: job.salaryMaxMinor ? job.salaryMaxMinor / 100 : undefined,
              unitText: 'MONTH',
            },
          },
        }
      : {}),
    directApply: true,
    url: `${APP_URL}/careers/${org.slug}/${job.slug}`,
  };

  return (
    <div style={brandStyle(org)} className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jobJsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: `${org.name} careers`, path: `/careers/${org.slug}` },
              { name: job.title, path: `/careers/${org.slug}/${job.slug}` },
            ]),
          ),
        }}
      />
      <CareersHeader org={org}>
        <Link href={`/careers/${org.slug}`} className="mt-6 inline-flex items-center gap-1 text-sm text-muted hover:text-brand">
          <ArrowLeft className="h-4 w-4" /> All jobs
        </Link>
        <h1 className="mt-3 max-w-3xl break-words font-display text-3xl leading-tight text-foreground min-[340px]:text-4xl sm:text-5xl">{job.title}</h1>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Chip icon={MapPin}>
            {job.location} · {ARRANGEMENT_LABEL[job.workArrangement]}
          </Chip>
          <Chip icon={Briefcase}>{EMPLOYMENT_LABEL[job.employmentType] ?? job.employmentType}</Chip>
          {pay ? <Chip icon={Banknote}>{pay} a month</Chip> : null}
        </div>
      </CareersHeader>

      <main className="mx-auto grid w-full max-w-5xl gap-8 px-3 pt-8 min-[340px]:px-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-8">
          <section>
            <h2 className="font-display text-2xl text-foreground">About the job</h2>
            <JobDescription text={job.description} className="mt-3" />
          </section>
          {job.mustHaves.length ? (
            <section>
              <h2 className="font-display text-2xl text-foreground">What you need</h2>
              <ul className="mt-3 space-y-2">
                {job.mustHaves.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-foreground sm:text-base">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span className="min-w-0 break-words">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <aside id="apply" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[1.5rem] border border-border bg-surface-elevated p-4 shadow-sm min-[340px]:p-5">
            <h2 className="font-display text-2xl text-foreground">Apply now</h2>
            <p className="mb-4 mt-1 text-sm text-muted">Takes about two minutes.</p>
            <CareersApplyForm orgSlug={org.slug} jobSlug={job.slug} orgName={org.name} />
          </div>
        </aside>
      </main>
      <div className="mx-auto max-w-5xl px-3 min-[340px]:px-5 sm:px-6">
        <PoweredByDealo />
      </div>
    </div>
  );
}

function Chip({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-muted">
      <Icon className="h-3.5 w-3.5 shrink-0 text-brand" />
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}
