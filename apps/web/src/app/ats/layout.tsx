import type { Metadata } from 'next';

import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { APP_URL, pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/ats',
  title: 'Dealo ATS — hiring software with AI built in, made for Nigeria',
  description:
    'Post jobs, track every candidate on one board, and let AI do the first screen. A person always checks. Careers page, interview booking and offers included.',
  keywords: ['ATS Nigeria', 'applicant tracking system', 'recruitment software Lagos', 'AI CV screening', 'hiring software Africa'],
});

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Dealo ATS',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: `${APP_URL}/ats`,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
  publisher: { '@id': `${APP_URL}/#organization` },
};

export default function AtsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbsJsonLd items={[{ name: 'ATS', path: '/ats' }]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
      {children}
    </>
  );
}
