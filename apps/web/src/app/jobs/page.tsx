import type { Metadata } from 'next';
import { Suspense } from 'react';

import { JobBoard } from '@/components/jobs/job-board';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/jobs',
  title: 'Jobs in Nigeria and remote jobs — apply with your Dealo CV',
  description:
    'Search fresh jobs from Dealo employers and trusted job sites. Filter by type, location and remote work, apply in one tap with the CV you built on Dealo, and track every application.',
  keywords: ['jobs in Nigeria', 'remote jobs', 'Lagos jobs', 'job board', 'easy apply jobs', 'jobs for graduates', 'skilled trade jobs'],
});

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <JobBoard />
    </Suspense>
  );
}
