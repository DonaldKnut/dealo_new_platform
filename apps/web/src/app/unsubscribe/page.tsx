import type { Metadata } from 'next';
import { Suspense } from 'react';

import { UnsubscribePanel } from '@/components/newsletter/unsubscribe-panel';

export const metadata: Metadata = {
  title: 'Email preferences',
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <section className="container-page flex min-h-[75dvh] items-center justify-center py-24">
      <Suspense>
        <UnsubscribePanel />
      </Suspense>
    </section>
  );
}
