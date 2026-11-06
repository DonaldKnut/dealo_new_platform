import type { Metadata } from 'next';

import { AuthPageHeader } from '@/components/auth/auth-shell';
import { VerifyEmailStatus } from '@/components/forms/verify-email-status';

export const metadata: Metadata = {
  title: 'Confirm your email',
  description: 'Confirm the email address on your Dealo account.',
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <AuthPageHeader
        eyebrow="Security"
        title="Confirm your email"
        subtitle="This keeps your account safe and lets you send emails from Dealo."
      />
      <VerifyEmailStatus token={params.token ?? ''} />
    </>
  );
}
