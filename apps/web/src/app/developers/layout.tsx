import type { Metadata } from 'next';

import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/developers',
  title: 'Dealo API — hiring API for Nigeria and Africa',
  description:
    'Connect your HR or staffing app to Dealo. Free test keys, OAuth2, signed webhooks and simple monthly plans paid with Paystack.',
  keywords: ['hiring API', 'recruitment API Nigeria', 'HR API Africa', 'staffing API', 'webhooks'],
});

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbsJsonLd items={[{ name: 'Developers', path: '/developers' }]} />
      {children}
    </>
  );
}
