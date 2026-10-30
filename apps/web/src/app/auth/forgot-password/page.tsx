import type { Metadata } from 'next';

import { AuthPageHeader } from '@/components/auth/auth-shell';
import { ForgotPasswordForm } from '@/components/forms/forgot-password-form';

export const metadata: Metadata = {
  title: 'Forgot password',
  description: 'Reset your Dealo account password.',
};

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthPageHeader
        eyebrow="Security"
        title="Reset your password"
        subtitle="We’ll email a secure reset link if an account exists for that address."
      />
      <ForgotPasswordForm variant="page" />
    </>
  );
}
