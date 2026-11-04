import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/services',
  title: 'Recruitment & staffing services in Nigeria and Africa',
  description:
    'Direct hiring and managed staffing for office staff and skilled trades. Checked people, clear prices, and a 90-day replacement promise.',
  keywords: ['recruitment services Nigeria', 'staffing agency Lagos', 'skilled trades staffing Africa'],
});

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
