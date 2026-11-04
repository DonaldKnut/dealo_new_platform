import type { Metadata } from 'next';

import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { pageMetadata } from '@/lib/seo';

const STEPS = [
  { name: 'Share the role', text: 'Tell Dealo the job, skills, location, budget and how you want to hire.' },
  { name: 'We check candidates', text: 'Recruiters and AI agents test skills, review work and call references.' },
  { name: 'Interview the shortlist', text: 'Meet the top 2 or 3 ranked people, usually within 48 hours.' },
  { name: 'Hire with backup', text: 'Contracts handled, plus a free replacement within 90 days if needed.' },
];

export const metadata: Metadata = pageMetadata({
  path: '/how-it-works',
  title: 'How hiring with Dealo works — 4 simple steps',
  description:
    'Share the role, we check candidates, you interview a short ranked list, then hire with a 90-day replacement promise. See every step.',
});

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to hire checked staff with Dealo',
  totalTime: 'P2D',
  step: STEPS.map((step, index) => ({ '@type': 'HowToStep', position: index + 1, name: step.name, text: step.text })),
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbsJsonLd items={[{ name: 'How it works', path: '/how-it-works' }]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      {children}
    </>
  );
}
