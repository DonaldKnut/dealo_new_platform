import type { Metadata } from 'next';

import { AuthPageHeader } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/forms/login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Dealo as a company or a professional.',
  alternates: { canonical: '/auth/login' },
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <>
      <AuthPageHeader
        eyebrow="Onboarding & Sign in"
        title="Welcome back"
        subtitle="Sign in to your Dealo workspace. Whether you're hiring verified talent or finding your next role, pick up right where you left off."
      />
      <LoginForm variant="page" />
    </>
  );
}
