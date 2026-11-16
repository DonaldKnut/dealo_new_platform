import type { Metadata } from 'next';

import { AuthPageHeader } from '@/components/auth/auth-shell';
import { VerifyWorkEmailStatus } from '@/components/ats/verify-work-email-status';

export const metadata: Metadata = {
  title: 'Confirm work email',
  description: 'Confirm the company work email for your Dealo hiring workspace.',
  robots: { index: false, follow: false },
};

export default async function VerifyWorkEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <AuthPageHeader
        eyebrow="Company verification"
        title="Confirm your work email"
        subtitle="This proves your company email matches the website you submitted."
      />
      <VerifyWorkEmailStatus token={params.token ?? ''} />
    </>
  );
}
