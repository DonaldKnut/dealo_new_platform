import type { Metadata } from 'next';

import { OfferResponse } from '@/components/ats/offer-response';

export const metadata: Metadata = {
  title: 'Your job offer',
  robots: { index: false, follow: false },
};

export default async function OfferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OfferResponse token={token} />;
}
