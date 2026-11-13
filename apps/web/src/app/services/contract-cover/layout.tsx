import type { Metadata } from 'next';

import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/services/contract-cover',
  title: 'Temp & contract cover — day rates for trades and office',
  description:
    'Short-term cover for skilled trades and office roles in Nigeria. Day rates plus clear Dealo mark-up. Built for absences, peaks, and repeat bookings.',
  keywords: ['temp staffing Nigeria', 'contract cover trades', 'day rate workers Lagos', 'short office cover'],
});

export default function ContractCoverLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbsJsonLd
        items={[
          { name: 'Services', path: '/services' },
          { name: 'Temp & contract cover', path: '/services/contract-cover' },
        ]}
      />
      {children}
    </>
  );
}
