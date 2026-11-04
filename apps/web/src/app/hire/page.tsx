import type { Metadata } from 'next';

import { OpenModalOnMount } from '@/components/open-modal-on-mount';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/hire',
  title: 'Request a hire — get a checked shortlist in 48 hours',
  description:
    'Tell Dealo who you need: office staff or skilled trades. Fill a 3-minute form and get checked candidates, usually within 48 hours.',
});

export default function HirePage() {
  return (
    <section className="container-page pt-24 pb-20">
      <OpenModalOnMount modal="hire" />
      <p className="eyebrow">Hiring request</p>
      <h1 className="display-title mt-3 text-4xl sm:text-5xl">Opening your request form…</h1>
      <p className="mt-4 max-w-lg text-muted">
        If the form does not appear, refresh the page or use Hire talent in the header.
      </p>
    </section>
  );
}
