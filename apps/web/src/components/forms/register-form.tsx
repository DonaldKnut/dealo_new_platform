'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { UserRole, registerSchema, type RegisterInput } from '@dealo/shared';
import { LockKeyhole, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { AuthField } from '@/components/auth/auth-field';
import { AuthRoleDropdown } from '@/components/auth/auth-role-dropdown';
import { AuthNavLink } from '@/components/forms/auth-nav-link';
import { AuthDivider, SocialSignIn } from '@/components/forms/oauth-google-button';
import { FormStatus } from '@/components/forms/form-status';
import { useToast } from '@/components/ui/toast';
import { useServerFormStatus } from '@/hooks/use-server-form-status';
import { ApiError, apiFetch } from '@/lib/api';

type RegisterFormValues = RegisterInput;

const ROLE_HELP =
  'Pick Employer if you want to hire people. Pick Professional if you want a job.';

export function RegisterForm({
  onSuccess,
  variant = 'modal',
}: {
  onSuccess?: () => void;
  variant?: 'modal' | 'page';
}) {
  const toast = useToast();
  const { serverError, serverMessage, setServerError, setServerMessage, clear } =
    useServerFormStatus();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: { role: UserRole.EMPLOYER },
  });

  const role = watch('role');
  const canSubmit = registerSchema.safeParse(watch()).success;

  const onSubmit = handleSubmit(async (values) => {
    clear();
    try {
      const payload: RegisterInput = {
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        role: values.role,
      };
      const result = await apiFetch<{ message: string }>('/auth/register', {
        method: 'POST',
        json: payload,
      });
      setServerMessage(result.message);
      toast.success('Account created', result.message);
      onSuccess?.();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'We could not create your account.';
      setServerError(message);
      toast.error('Sign up failed', message);
    }
  });

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
      <SocialSignIn role={role === UserRole.TALENT ? 'TALENT' : 'EMPLOYER'} />
      <AuthDivider />

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField
          label="First name"
          icon={User}
          autoComplete="given-name"
          placeholder="Ada"
          error={errors.firstName?.message}
          {...register('firstName')}
        />
        <AuthField
          label="Last name"
          icon={User}
          autoComplete="family-name"
          placeholder="Okafor"
          error={errors.lastName?.message}
          {...register('lastName')}
        />
      </div>
      <AuthField
        label="Email"
        icon={Mail}
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <AuthField
        label="Password"
        icon={LockKeyhole}
        type="password"
        revealable
        autoComplete="new-password"
        placeholder="8 or more, with a letter and a number"
        error={errors.password?.message}
        {...register('password')}
      />
      <AuthRoleDropdown
        control={control}
        name="role"
        label="I am joining as"
        help={ROLE_HELP}
        error={errors.role?.message}
      />

      <p className="text-xs leading-relaxed text-muted">
        When you make an account, you agree to Dealo&apos;s{' '}
        <Link href="/privacy" className="font-semibold text-brand underline-offset-2 hover:underline">
          Privacy Policy
        </Link>{' '}
        and{' '}
        <Link href="/terms" className="font-semibold text-brand underline-offset-2 hover:underline">
          Terms of Service
        </Link>
        .
      </p>

      <FormStatus error={serverError} message={serverMessage} />

      <button type="submit" className="btn-primary w-full" disabled={!canSubmit || isSubmitting}>
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>
      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <AuthNavLink variant={variant} href="/auth/login" modalView="login">
          Sign in
        </AuthNavLink>
      </p>
    </form>
  );
}
