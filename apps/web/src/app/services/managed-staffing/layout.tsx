import type { Metadata } from 'next';

import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/services/managed-staffing',
  title: 'Managed staffing in Nigeria — crews and office staff, fully managed',
  description:
    'Dealo supplies and manages office staff and skilled trade crews for you: contracts, attendance, standby cover and replacements, for one monthly fee.',
  keywords: ['managed staffing Nigeria', 'construction labour Lagos', 'outsourced staff Nigeria', 'standby workers'],
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
