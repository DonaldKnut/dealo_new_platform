import type { Metadata } from 'next';

import { JobAgentLanding } from '@/components/marketing/job-agent-landing';
import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/job-agent',
  title: 'Job Agent — AI that applies to jobs in Nigeria for you',
  description:
    'Your own AI agent reads your CV, watches thousands of Nigerian and remote jobs around the clock, and applies to the ones that fit while you get on with your day. Free to start.',
  keywords: ['auto apply jobs Nigeria', 'AI job application', 'job agent', 'apply to jobs automatically', 'jobs in Lagos', 'remote jobs Nigeria'],
});

export default function JobAgentPage() {
  return (
    <>
      <BreadcrumbsJsonLd items={[{ name: 'Job Agent', path: '/job-agent' }]} />
      <JobAgentLanding />
    </>
  );
}
