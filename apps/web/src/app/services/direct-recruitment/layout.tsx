import type { Metadata } from 'next';

import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/services/direct-recruitment',
  title: 'Direct hiring in Nigeria — checked candidates onto your payroll',
  description:
    'Dealo finds, checks and shortlists office staff and skilled trades for your company payroll. Pay per hire, with a 90-day free replacement.',
  keywords: ['recruitment agency Nigeria', 'direct hire Lagos', 'hire office staff Nigeria', 'hire electricians Lagos'],
});

export default function DirectRecruitmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbsJsonLd
        items={[
          { name: 'Services', path: '/services' },
          { name: 'Direct hiring', path: '/services/direct-recruitment' },
        ]}
      />
      {children}
    </>
  );
}
