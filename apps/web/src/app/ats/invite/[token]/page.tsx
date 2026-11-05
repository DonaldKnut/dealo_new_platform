import type { Metadata } from 'next';

import { InviteAccept } from '@/components/ats/invite-accept';

export const metadata: Metadata = {
  title: 'Join a hiring team',
  robots: { index: false, follow: false },
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteAccept token={token} />;
}
