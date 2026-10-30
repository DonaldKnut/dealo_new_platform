'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { UserRole, registerSchema, type RegisterInput } from '@dealo/shared';
import { BriefcaseBusiness, LockKeyhole, Mail, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthField, AuthSelectField } from '@/components/auth/auth-field';
import { AuthNavLink } from '@/components/forms/auth-nav-link';
import { AuthDivider, OAuthGoogleButton } from '@/components/forms/oauth-google-button';
import { FormStatus } from '@/components/forms/form-status';
import { PrivacyConsent } from '@/components/forms/privacy-consent';
import { useServerFormStatus } from '@/hooks/use-server-form-status';
import { ApiError, apiFetch } from '@/lib/api';

const registerFormSchema = registerSchema.extend({
  acceptPrivacy: z.boolean().refine((value) => value === true, {
    message: 'Accept the privacy policy to create an account',
  }),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export function RegisterForm({
  onSuccess,
  variant = 'modal',
}: {
  onSuccess?: () => void;
  variant?: 'modal' | 'page';
}) {
  const { serverError, serverMessage, setServerError, setServerMessage, clear } =
    useServerFormStatus();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    mode: 'onChange',
    defaultValues: { role: UserRole.EMPLOYER, acceptPrivacy: false },
  });

  const role = watch('role');
  const canSubmit = registerFormSchema.safeParse(watch()).success;

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
      onSuccess?.();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Unable to create account.');
    }
  });

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
      <OAuthGoogleButton
        label="Continue with Google"
        role={role === UserRole.TALENT ? 'TALENT' : 'EMPLOYER'}
      />
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
        autoComplete="new-password"
        placeholder="Min. 8 chars, letter + number"
        error={errors.password?.message}
        {...register('password')}
      />
      <AuthSelectField
        label="I am joining as"
        icon={BriefcaseBusiness}
        error={errors.role?.message}
        {...register('role')}
      >
        <option value={UserRole.EMPLOYER}>Employer</option>
        <option value={UserRole.TALENT}>Professional / Talent</option>
      </AuthSelectField>

      <PrivacyConsent
        registration={register('acceptPrivacy')}
        error={errors.acceptPrivacy?.message}
        termsLabel="Terms of Service"
      />

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
