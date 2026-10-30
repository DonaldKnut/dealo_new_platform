'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@dealo/shared';
import { Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { AuthField } from '@/components/auth/auth-field';
import { AuthNavLink } from '@/components/forms/auth-nav-link';
import { FormStatus } from '@/components/forms/form-status';
import { useServerFormStatus } from '@/hooks/use-server-form-status';
import { ApiError, apiFetch } from '@/lib/api';

export function ForgotPasswordForm({ variant = 'modal' }: { variant?: 'modal' | 'page' }) {
  const { serverError, serverMessage, setServerError, setServerMessage, clear } =
    useServerFormStatus();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
  });

  const canSubmit = forgotPasswordSchema.safeParse(watch()).success;

  const onSubmit = handleSubmit(async (values) => {
    clear();
    try {
      await apiFetch('/auth/forgot-password', { method: 'POST', json: values });
      setServerMessage('If an account exists for that email, a reset link has been sent.');
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Unable to send reset email.');
    }
  });

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
      <p className="text-sm text-muted">
        Enter the email on your account. We&apos;ll send a secure link to reset your password.
      </p>
      <AuthField
        label="Email"
        icon={Mail}
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <FormStatus error={serverError} message={serverMessage} />
      <button type="submit" className="btn-primary w-full" disabled={!canSubmit || isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </button>
      <p className="text-center text-sm text-muted">
        Remembered it?{' '}
        <AuthNavLink variant={variant} href="/auth/login" modalView="login">
          Back to sign in
        </AuthNavLink>
      </p>
    </form>
  );
}
