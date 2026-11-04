import type { Metadata } from 'next';

import { AuthPageHeader } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/forms/reset-password-form';

export const metadata: Metadata = {
  title: 'Reset password',
  description: 'Choose a new password for your Dealo account.',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <AuthPageHeader
        eyebrow="Security"
        title="Choose a new password"
        subtitle="Use a strong password with letters and numbers. Other sessions will be signed out."
      />
      <ResetPasswordForm token={params.token ?? ''} />
    </>
  );
}
