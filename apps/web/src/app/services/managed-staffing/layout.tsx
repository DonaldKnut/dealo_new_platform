import type { Metadata } from 'next';

import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/services/managed-staffing',
  title: 'Managed staffing Nigeria — Dealo hires and runs your crew',
  description:
    'Tell Dealo the headcount. We hire, pay, and manage office staff or skilled trades. You get the work done — one clear monthly fee.',
  keywords: ['managed staffing Nigeria', 'outsourced staff Lagos', 'construction labour Nigeria', 'Dealo managed workforce'],
});

export default function ManagedStaffingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbsJsonLd
        items={[
          { name: 'Services', path: '/services' },
          { name: 'Managed staffing', path: '/services/managed-staffing' },
        ]}
      />
      {children}
    </>
  );
}
