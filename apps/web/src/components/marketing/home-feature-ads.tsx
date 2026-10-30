'use client';

import {
  BadgeCheck,
  Building2,
  Handshake,
  ShieldCheck,
  TimerReset,
  Workflow,
} from 'lucide-react';

import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';

export function HomeFeatureAds() {
  return (
    <FeatureAdGrid
      eyebrow="Why Dealo"
      title="Recruitment that behaves like an operating system"
      description="Built for companies and organizations that plan to hire staff into their administrative structure — or want Dealo to run staffing for them."
      items={[
        {
          icon: Building2,
          title: 'Direct recruitment',
          body: 'Role brief → sourcing → screening → shortlist → interviews → placement.',
        },
        {
          icon: Handshake,
          title: 'Managed staffing',
          body: 'Agreed commercial terms with Dealo carrying the hiring operations.',
        },
        {
          icon: Workflow,
          title: 'Clear stages',
          body: 'Everyone knows where a role sits — from intake to placement.',
        },
        {
          icon: ShieldCheck,
          title: 'Trusted network',
          body: 'Verification-minded onboarding for professionals and employers.',
        },
        {
          icon: TimerReset,
          title: 'Faster decisions',
          body: 'Shortlists arrive screened against your brief, not open-ended noise.',
        },
        {
          icon: BadgeCheck,
          title: 'Workspace ready',
          body: 'Dashboard foundations for requests, pipeline, and team collaboration.',
        },
      ]}
    />
  );
}
