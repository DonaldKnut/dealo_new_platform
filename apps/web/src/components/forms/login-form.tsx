'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type LoginInput } from '@dealo/shared';
import { LockKeyhole, Mail, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthIssueDialog, authIssueFromError } from '@/components/auth/auth-issue-dialog';
import { AuthField } from '@/components/auth/auth-field';
import { AuthNavLink } from '@/components/forms/auth-nav-link';
import { AuthDivider, SocialSignIn } from '@/components/forms/oauth-google-button';
import { FormStatus } from '@/components/forms/form-status';
import { useModal } from '@/components/modals/modal-context';
import { useServerFormStatus } from '@/hooks/use-server-form-status';
import { getDashboardHome } from '@/hooks/use-auth-session';
import { useToast } from '@/components/ui/toast';
import { ApiError, apiFetch } from '@/lib/api';
import { logClientAudit } from '@/lib/client-audit';
import { loadRememberedAuth, saveRememberedAuth } from '@/lib/remember-auth';
import { cn } from '@/lib/utils';

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
  const [issue, setIssue] = useState<ReturnType<typeof authIssueFromError>>(null);
  const isPage = variant === 'page';

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
      const next = new URLSearchParams(window.location.search).get('next');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
      router.push(safeNext ?? getDashboardHome(result.user?.roles ?? []));
      router.refresh();
    } catch (error) {
      const code = authIssueFromError(error);
      const message = error instanceof ApiError ? error.message : 'We could not sign you in.';
      setServerError(message);
      if (code) setIssue(code);
      toast.error('Sign in failed', message);
    }
  });

  const forgotControl =
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
    );

  return (
    <form
      onSubmit={onSubmit}
      className={cn('mt-8 flex flex-col gap-4', isPage && 'max-lg:mt-10 max-lg:gap-5')}
      noValidate
    >
      <AuthIssueDialog code={issue} open={Boolean(issue)} onClose={() => setIssue(null)} />

      {/* Desktop / modal: OAuth first. Page mobile: OAuth after email submit. */}
      <div className={cn(isPage && 'order-4 max-lg:mt-4 lg:order-1')}>
        <SocialSignIn intent="signin" verb="Continue" mobilePills={isPage} />
      </div>
      <div className={cn(isPage ? 'order-2 hidden lg:order-2 lg:block' : undefined)}>
        <AuthDivider />
      </div>

      <div className={cn('space-y-4', isPage && 'order-1 space-y-5 lg:order-3')}>
        <AuthField
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          mobileUnderline={isPage}
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
          mobileUnderline={isPage}
          trailing={forgotControl}
          {...register('password')}
        />

        <div
          className={cn(
            'flex flex-col gap-3 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between',
            isPage && 'max-lg:hidden',
          )}
        >
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="h-4 w-4 rounded border-border" {...register('rememberMe')} />
            <span>Remember me</span>
          </label>
          <p className="text-[11px] text-muted">Stay signed in on this device.</p>
        </div>

        <FormStatus error={serverError} message={serverMessage} />
        {issue === 'EMAIL_UNVERIFIED' ? (
          <button
            type="button"
            className="text-sm font-semibold text-brand hover:underline"
            onClick={async () => {
              const email = watch('email');
              try {
                await apiFetch('/auth/request-verification', { method: 'POST', json: { email } });
                toast.success(
                  'Check your inbox',
                  'If that email is on Dealo, we sent a fresh confirmation link.',
                );
              } catch {
                toast.error('Could not send', 'Wait a minute and try again.');
              }
            }}
          >
            Send the confirmation link again
          </button>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className={cn(
            'btn-primary w-full border border-brand-strong/30',
            isPage &&
              'max-lg:h-12 max-lg:rounded-full max-lg:border-[1.5px] max-lg:border-white/50 max-lg:bg-foreground max-lg:text-background max-lg:shadow-[0_0_0_1px_rgba(11,31,30,0.18)] max-lg:hover:bg-foreground/90 max-lg:hover:text-background max-lg:dark:border-white/40 max-lg:dark:bg-white max-lg:dark:text-[#04140d] max-lg:dark:shadow-[0_0_0_1px_rgba(255,255,255,0.35)] max-lg:dark:hover:bg-white/90',
          )}
        >
          {isSubmitting ? 'Signing in…' : isPage ? (
            <>
              <span className="lg:hidden">Log in with Email</span>
              <span className="hidden lg:inline">Sign in</span>
            </>
          ) : (
            'Sign in'
          )}
        </button>

        {isPage ? (
          <p className="text-center text-[13px] text-muted lg:hidden">
            Forgot password?{' '}
            <Link href="/auth/forgot-password" className="font-medium text-foreground underline-offset-2 hover:underline">
              Reset it
            </Link>
          </p>
        ) : null}
      </div>

      <p
        className={cn(
          'text-center text-sm text-muted',
          isPage && 'order-5 max-lg:mt-2 max-lg:text-[13px] lg:order-4',
        )}
      >
        {isPage ? (
          <>
            <span className="lg:hidden">New user? </span>
            <span className="hidden lg:inline">New to Dealo? </span>
          </>
        ) : (
          'New to Dealo? '
        )}
        <AuthNavLink variant={variant} href="/auth/register" modalView="register">
          {isPage ? (
            <>
              <span className="lg:hidden">Sign up</span>
              <span className="hidden lg:inline">Create an account</span>
            </>
          ) : (
            'Create an account'
          )}
        </AuthNavLink>
      </p>

      {/* Onboarding Welcome Callout */}
      <div
        className={cn(
          'rounded-2xl border border-border/80 bg-surface/50 p-3.5 text-xs text-muted backdrop-blur-xs dark:bg-white/[0.03]',
          isPage && 'order-6 mt-1 lg:order-5',
        )}
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand dark:bg-brand/20">
            <Sparkles className="h-3 w-3" />
          </span>
          <p className="leading-relaxed">
            <span className="font-semibold text-foreground">Getting started with Dealo?</span>{' '}
            Employers can post roles and receive AI-screened shortlists in 48 hours. Professionals can build a free ATS-optimized CV and apply to verified jobs.
          </p>
        </div>
      </div>
    </form>
  );
}
