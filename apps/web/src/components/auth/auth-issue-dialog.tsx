'use client';

import { AuthIssue, type AuthIssueCode } from '@dealo/shared';
import { ShieldAlert, UserRoundPlus, UserRoundSearch } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useModal } from '@/components/modals/modal-context';
import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';

const CODES = new Set<string>(Object.values(AuthIssue));

function asIssue(value: string | null | undefined): AuthIssueCode | null {
  if (!value) return null;
  const code = value.toUpperCase().replace(/-/g, '_');
  return CODES.has(code) ? (code as AuthIssueCode) : null;
}

export function authIssueFromError(error: unknown): AuthIssueCode | null {
  if (!(error instanceof ApiError) || typeof error.details !== 'object' || !error.details) return null;
  const body = error.details as { code?: unknown };
  return asIssue(typeof body.code === 'string' ? body.code : null);
}

function providerLabel(provider?: string | null) {
  if (provider === 'linkedin') return 'LinkedIn';
  if (provider === 'google') return 'Google';
  return 'that';
}

function copyFor(code: AuthIssueCode, provider?: string | null) {
  const social = providerLabel(provider);
  switch (code) {
    case AuthIssue.NO_ACCOUNT:
      return {
        icon: UserRoundSearch,
        title: 'We didn’t find an account',
        body: `${social === 'that' ? 'That login' : `That ${social} login`} isn’t registered on Dealo yet. Create an account first — it takes about a minute.`,
        action: 'Create account' as const,
        tone: 'warning' as const,
      };
    case AuthIssue.ACCOUNT_EXISTS:
      return {
        icon: UserRoundPlus,
        title: 'You already have an account',
        body: 'This email is already on Dealo. Sign in instead — don’t create a second account.',
        action: 'Sign in' as const,
        tone: 'info' as const,
      };
    case AuthIssue.ACCOUNT_LOCKED:
      return {
        icon: ShieldAlert,
        title: 'Too many attempts',
        body: 'This account is briefly locked after several failed sign-ins. Wait 15 minutes, or reset your password.',
        action: 'Reset password' as const,
        tone: 'error' as const,
      };
    case AuthIssue.EMAIL_UNVERIFIED:
      return {
        icon: ShieldAlert,
        title: 'Confirm your email first',
        body: 'We sent a confirmation link when you created the account. Open it, then sign in.',
        action: 'Close' as const,
        tone: 'warning' as const,
      };
    case AuthIssue.OAUTH_ONLY:
      return {
        icon: UserRoundSearch,
        title: 'Use Google or LinkedIn',
        body: 'This email was created with Google or LinkedIn. Continue with that button — there is no password yet.',
        action: 'Close' as const,
        tone: 'info' as const,
      };
    case AuthIssue.OAUTH_CANCELLED:
      return {
        icon: ShieldAlert,
        title: 'Sign-in was cancelled',
        body: 'You closed the Google or LinkedIn window before finishing. Try again when you’re ready.',
        action: 'Close' as const,
        tone: 'info' as const,
      };
    case AuthIssue.ACCOUNT_DISABLED:
      return {
        icon: ShieldAlert,
        title: 'This account is paused',
        body: 'We couldn’t sign you in. If this is a surprise, contact Dealo support.',
        action: 'Close' as const,
        tone: 'error' as const,
      };
    default:
      return {
        icon: ShieldAlert,
        title: 'Sign-in didn’t finish',
        body: 'Something went wrong with Google or LinkedIn. Try again, or use your email and password.',
        action: 'Close' as const,
        tone: 'error' as const,
      };
  }
}

export function AuthIssueDialog({
  code,
  provider,
  open,
  onClose,
}: {
  code: AuthIssueCode | null;
  provider?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const modal = useModal();
  const copy = useMemo(() => (code ? copyFor(code, provider) : null), [code, provider]);
  if (!copy || !code) return null;
  const onAuthPage = pathname.startsWith('/auth');

  const go = () => {
    onClose();
    if (copy.action === 'Create account') {
      if (onAuthPage) router.push('/auth/register');
      else modal.switchTo('register');
      return;
    }
    if (copy.action === 'Sign in') {
      if (onAuthPage) router.push('/auth/login');
      else modal.switchTo('login');
      return;
    }
    if (copy.action === 'Reset password') {
      if (onAuthPage) router.push('/auth/forgot-password');
      else modal.switchTo('forgot-password');
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={copy.title}
      description={copy.body}
      icon={copy.icon}
      size="sm"
      mobile="auto"
      footer={
        <>
          {copy.action !== 'Close' ? (
            <button type="button" className="btn-secondary" onClick={onClose}>
              Close
            </button>
          ) : null}
          <button type="button" className="btn-primary" onClick={go}>
            {copy.action === 'Close' ? 'OK' : copy.action}
          </button>
        </>
      }
    >
      <p className="text-sm text-muted">
        Dealo never opens an account just because Google or LinkedIn recognised an email. You choose sign in or create
        account on purpose.
      </p>
    </FormModal>
  );
}

/** Reads `?auth=` after Google/LinkedIn return, shows a toast + modal, then cleans the URL. */
export function AuthIssueFromUrl() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [issue, setIssue] = useState<{ code: AuthIssueCode; provider: string | null } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const code = asIssue(params.get('auth')) ?? (params.get('error') ? AuthIssue.OAUTH_FAILED : null);
    if (!code) return;
    const provider = params.get('provider');
    const copy = copyFor(code, provider);
    toast[copy.tone === 'error' ? 'error' : copy.tone === 'warning' ? 'warning' : 'info'](copy.title, copy.body);
    setIssue({ code, provider });
    setOpen(true);
    const next = new URLSearchParams(params.toString());
    next.delete('auth');
    next.delete('error');
    next.delete('provider');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return (
    <AuthIssueDialog
      code={issue?.code ?? null}
      provider={issue?.provider}
      open={open && Boolean(issue)}
      onClose={() => setOpen(false)}
    />
  );
}
