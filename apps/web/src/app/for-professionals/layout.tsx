import type { Metadata } from 'next';

import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/for-professionals',
  title: 'Find office & skilled trade jobs in Nigeria — join free',
  description:
    'Build a free profile, upload your CV and get matched to checked employers for office and skilled trade jobs across Nigeria and Africa.',
  keywords: ['jobs in Lagos', 'electrician jobs Nigeria', 'office jobs Nigeria', 'skilled trade jobs Africa'],
});

export default function ForProfessionalsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbsJsonLd items={[{ name: 'For professionals', path: '/for-professionals' }]} />
      {children}
    </>
  );
}
