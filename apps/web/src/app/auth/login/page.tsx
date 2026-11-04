import type { Metadata } from 'next';

import { AuthPageHeader } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/forms/login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Dealo as a company or a professional.',
  alternates: { canonical: '/auth/login' },
};

export default function LoginPage() {
  return (
    <>
      <AuthPageHeader
        eyebrow="Sign in"
        title="Welcome back"
        subtitle="See your hire requests, candidates, and account settings."
      />
      <LoginForm variant="page" />
    </>
  );
}
