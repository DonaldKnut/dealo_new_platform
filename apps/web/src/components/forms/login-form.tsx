'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type LoginInput } from '@dealo/shared';
import { LockKeyhole, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthField } from '@/components/auth/auth-field';
import { AuthNavLink } from '@/components/forms/auth-nav-link';
import { AuthDivider, OAuthGoogleButton } from '@/components/forms/oauth-google-button';
import { FormStatus } from '@/components/forms/form-status';
import { useModal } from '@/components/modals/modal-context';
import { useServerFormStatus } from '@/hooks/use-server-form-status';
import { getDashboardHome } from '@/hooks/use-auth-session';
import { useToast } from '@/components/ui/toast';
import { ApiError, apiFetch } from '@/lib/api';
import { logClientAudit } from '@/lib/client-audit';
import { loadRememberedAuth, saveRememberedAuth } from '@/lib/remember-auth';

const loginFormSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginForm({
  onSuccess,
  variant = 'modal',
}: {
  onSuccess?: () => void;
  variant?: 'modal' | 'page';
}) {
  const modal = useModal();
  const router = useRouter();
  const toast = useToast();
  const { serverError, serverMessage, setServerError, setServerMessage, clear } =
    useServerFormStatus();
  const [hydrated, setHydrated] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  useEffect(() => {
    const remembered = loadRememberedAuth();
    if (remembered?.rememberMe) {
      reset({
        email: remembered.email,
        password: '',
        rememberMe: true,
      });
    }
    setHydrated(true);
  }, [reset]);

  const canSubmit = hydrated && loginFormSchema.safeParse(watch()).success;

  const onSubmit = handleSubmit(async (values) => {
    clear();
    try {
      const payload: LoginInput = {
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
      };
      const result = await apiFetch<{ user: { roles: string[] } }>('/auth/login', {
        method: 'POST',
        json: payload,
      });
      saveRememberedAuth(values.email, Boolean(values.rememberMe));
      setServerMessage('Signed in successfully.');
      toast.success('Welcome back', 'Signed in successfully.');
      logClientAudit({ action: 'AUTH_LOGIN_UI', entityType: 'Auth' });
      onSuccess?.();
      if (variant === 'modal') {
        modal.close();
      }
      router.push(getDashboardHome(result.user?.roles ?? []));
      router.refresh();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unable to sign in.';
      setServerError(message);
      toast.error('Sign in failed', message);
    }
  });

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
      <OAuthGoogleButton />
      <AuthDivider />

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
        autoComplete="current-password"
        placeholder="••••••••"
        error={errors.password?.message}
        trailing={
          variant === 'page' ? (
            <Link href="/auth/forgot-password" className="text-xs font-semibold text-brand">
              Forgot password?
            </Link>
          ) : (
            <button
              type="button"
              className="text-xs font-semibold text-brand"
              onClick={() => modal.switchTo('forgot-password')}
            >
              Forgot password?
            </button>
          )
        }
        {...register('password')}
      />

      <div className="flex flex-col gap-3 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" className="h-4 w-4 rounded border-border" {...register('rememberMe')} />
          <span>Remember me</span>
        </label>
        <p className="text-[11px] text-muted">Keeps you signed in longer on this device.</p>
      </div>

      <FormStatus error={serverError} message={serverMessage} />

      <button type="submit" className="btn-primary w-full" disabled={!canSubmit || isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-center text-sm text-muted">
        New to Dealo?{' '}
        <AuthNavLink variant={variant} href="/auth/register" modalView="register">
          Create an account
        </AuthNavLink>
      </p>
    </form>
  );
}
