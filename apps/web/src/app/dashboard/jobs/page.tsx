'use client';

import { Suspense } from 'react';

import { JobBoard } from '@/components/jobs/job-board';

export default function DashboardJobsPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] animate-pulse rounded-[1.5rem] bg-surface" />}>
      <JobBoard variant="dashboard" />
    </Suspense>
  );
}
