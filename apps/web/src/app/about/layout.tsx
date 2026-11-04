import type { Metadata } from 'next';

import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/about',
  title: 'About Dealo — focused hiring for Nigeria and Africa',
  description:
    'Dealo helps Nigerian businesses hire checked office staff and skilled trades, and helps professionals find good jobs. Learn who we are and how we work.',
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbsJsonLd items={[{ name: 'About', path: '/about' }]} />
      {children}
    </>
  );
}
