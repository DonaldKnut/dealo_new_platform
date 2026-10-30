import type { Metadata } from 'next';

import { AuthPageHeader } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/forms/login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Dealo employer or talent workspace.',
};

export default function LoginPage() {
  return (
    <>
      <AuthPageHeader
        eyebrow="Sign in"
        title="Welcome back"
        subtitle="Access your hiring workspace, talent pipeline, and account settings."
      />
      <LoginForm variant="page" />
    </>
  );
}
