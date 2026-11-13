import type { Metadata } from 'next';

import { BreadcrumbsJsonLd } from '@/components/seo/breadcrumbs-json-ld';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/services/talent-training',
  title: 'Training after hire — onboarding modules for placed talent',
  description:
    'Employers pay for short onboarding and upskilling modules after Dealo places talent: site safety, tools, office onboarding, and customer service.',
  keywords: ['talent onboarding Nigeria', 'employer training modules', 'upskilling after hire', 'site safety training'],
});

export default function TalentTrainingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbsJsonLd
        items={[
          { name: 'Services', path: '/services' },
          { name: 'Training after hire', path: '/services/talent-training' },
        ]}
      />
      {children}
    </>
  );
}
