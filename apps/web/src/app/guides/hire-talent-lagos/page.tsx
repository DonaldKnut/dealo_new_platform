import type { Metadata } from 'next';
import Link from 'next/link';

import { SeoGuide } from '@/components/marketing/seo-guide';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/guides/hire-talent-lagos',
  title: 'Hire talent in Lagos — checked office & trades',
  description:
    'Hire checked office staff and skilled trades in Lagos with Dealo. AI screening plus recruiters, shortlists in 48 hours, 90-day replacement.',
  keywords: ['hire talent Lagos', 'recruitment agency Lagos', 'hire electricians Lagos', 'staffing Lagos Nigeria'],
});

export default function HireTalentLagosGuidePage() {
  return (
    <SeoGuide
      path="/guides/hire-talent-lagos"
      eyebrow="Employers"
      title="Hire talent in Lagos"
      lead="Lagos hiring is competitive. Dealo combines AI screening with human recruiters so you see fewer, better people — office and skilled trades."
    >
      <p>
        <Link href="/hire" className="font-semibold text-brand">
          Request a hire
        </Link>{' '}
        in about three minutes. Direct hire or{' '}
        <Link href="/services/managed-staffing" className="font-semibold text-brand">
          managed staffing
        </Link>{' '}
        if you want Dealo to run contracts and cover.
      </p>
      <p>
        Posting on your own careers site? Use{' '}
        <Link href="/ats" className="font-semibold text-brand">
          Dealo ATS
        </Link>{' '}
        so roles appear under `/careers/your-company` with JobPosting schema — and show up for Job Agent seekers.
      </p>
      <p>
        Candidates browse{' '}
        <Link href="/jobs/in/lagos" className="font-semibold text-brand">
          jobs in Lagos
        </Link>{' '}
        and apply with one CV. You get quality in; they get speed out.
      </p>
    </SeoGuide>
  );
}
