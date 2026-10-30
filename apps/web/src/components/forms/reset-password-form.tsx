'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema } from '@dealo/shared';
import { LockKeyhole } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthField } from '@/components/auth/auth-field';
import { FormStatus } from '@/components/forms/form-status';
import { useServerFormStatus } from '@/hooks/use-server-form-status';
import { ApiError, apiFetch } from '@/lib/api';

const formSchema = resetPasswordSchema
  .omit({ token: true })
  .extend({
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const { serverError, serverMessage, setServerError, setServerMessage, clear } =
    useServerFormStatus();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  });

  const canSubmit = formSchema.safeParse(watch()).success && Boolean(token);

  const onSubmit = handleSubmit(async (values) => {
    clear();
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        json: { token, password: values.password },
      });
      setServerMessage('Password updated. You can sign in now.');
      setTimeout(() => router.push('/auth/login'), 1200);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Unable to reset password.');
    }
  });

  if (!token) {
    return (
      <div className="mt-8 space-y-4">
        <p className="text-sm text-danger">This reset link is missing or invalid.</p>
        <Link href="/auth/forgot-password" className="btn-secondary inline-flex">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
      <AuthField
        label="New password"
        icon={LockKeyhole}
        type="password"
        autoComplete="new-password"
        placeholder="Min. 8 chars, letter + number"
        error={errors.password?.message}
        {...register('password')}
      />
      <AuthField
        label="Confirm password"
        icon={LockKeyhole}
        type="password"
        autoComplete="new-password"
        placeholder="Repeat password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <FormStatus error={serverError} message={serverMessage} />
      <button type="submit" className="btn-primary w-full" disabled={!canSubmit || isSubmitting}>
        {isSubmitting ? 'Updating…' : 'Update password'}
      </button>
      <p className="text-center text-sm text-muted">
        <Link href="/auth/login" className="font-semibold text-brand">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
