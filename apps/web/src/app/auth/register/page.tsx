import type { Metadata } from 'next';

import { AuthPageHeader } from '@/components/auth/auth-shell';
import { RegisterForm } from '@/components/forms/register-form';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Join Dealo as a company or a professional.',
};

export default function RegisterPage() {
  return (
    <>
      <AuthPageHeader
        eyebrow="Join Dealo"
        title="Create your account"
        subtitle="Sign up with email or Google. We verify accounts to keep Dealo trusted."
      />
      <RegisterForm variant="page" />
    </>
  );
}
