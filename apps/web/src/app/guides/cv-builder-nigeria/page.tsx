import type { Metadata } from 'next';
import Link from 'next/link';

import { SeoGuide } from '@/components/marketing/seo-guide';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/guides/cv-builder-nigeria',
  title: 'Free CV builder Nigeria — ATS-ready PDF',
  description:
    'Build a professional CV for Nigerian employers on your phone. Clean templates, PDF download, and ready for Dealo Job Agent Easy Apply.',
  keywords: ['free CV builder Nigeria', 'CV maker Lagos', 'resume builder Nigeria', 'ATS CV Nigeria'],
});

export default function CvBuilderNigeriaGuidePage() {
  return (
    <SeoGuide
      path="/guides/cv-builder-nigeria"
      eyebrow="CV"
      title="Free CV builder for Nigeria"
      lead="Hiring software should read your CV as text — not a screenshot. Dealo’s builder is phone-first and Job Agent ready."
    >
      <p>
        Use the{' '}
        <Link href="/resume-builder" className="font-semibold text-brand">
          free CV builder
        </Link>
        : pick a template, fill simple steps, download a PDF. Keep photos and tribe fields out — skills and outcomes win interviews.
      </p>
      <p>
        Then attach that CV (or upload your own PDF/Word) in{' '}
        <Link href="/job-agent" className="font-semibold text-brand">
          Job Agent
        </Link>{' '}
        so matching and Easy Apply use one source of truth.
      </p>
      <p>
        Looking for roles? Try{' '}
        <Link href="/jobs/in/lagos" className="font-semibold text-brand">
          jobs in Lagos
        </Link>{' '}
        or{' '}
        <Link href="/jobs/role/admin" className="font-semibold text-brand">
          admin jobs
        </Link>
        .
      </p>
    </SeoGuide>
  );
}
