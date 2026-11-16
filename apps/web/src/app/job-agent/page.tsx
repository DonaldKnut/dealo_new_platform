import type { Metadata } from 'next';

import { JobAgentLanding } from '@/components/marketing/job-agent-landing';
import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/job-agent',
  title: 'AI Job Agent Nigeria — auto-apply & Assist for career pages',
  description:
    'Dealo Job Agent hunts Lagos, Abuja, and remote jobs overnight. Auto-sends Easy Apply and partner ATS; Assist fills Workday-style pages — you click Submit. Free to start.',
  keywords: [
    'AI job agent Nigeria',
    'auto apply jobs Nigeria',
    'AI job application',
    'jobs in Lagos',
    'remote jobs Nigeria',
    'apply to jobs automatically',
  ],
});

export default function JobAgentPage() {
  return (
    <>
      <BreadcrumbsJsonLd items={[{ name: 'Job Agent', path: '/job-agent' }]} />
      <JobAgentLanding />
    </>
  );
}
