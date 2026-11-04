import type { Metadata } from 'next';

import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/for-employers',
  title: 'Hire talent in Nigeria — office staff & skilled trades',
  description:
    'Recruit office staff in Lagos and skilled trades across Nigeria and Africa. Dealo sends checked shortlists for local employers and global teams.',
  keywords: ['hire talent Nigeria', 'recruit office staff Lagos', 'skilled trades staffing Africa', 'managed staffing Nigeria'],
});

export default function ForEmployersLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbsJsonLd items={[{ name: 'For employers', path: '/for-employers' }]} />
      {children}
    </>
  );
}
