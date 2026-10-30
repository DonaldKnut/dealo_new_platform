import type { Metadata } from 'next';

import { AuthPageHeader } from '@/components/auth/auth-shell';
import { RegisterForm } from '@/components/forms/register-form';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Join Dealo as an employer or professional.',
};

export default function RegisterPage() {
  return (
    <>
      <AuthPageHeader
        eyebrow="Join Dealo"
        title="Create your account"
        subtitle="Register with email or Google. Verification helps keep the talent network trusted."
      />
      <RegisterForm variant="page" />
    </>
  );
}
