'use client';

import { Building2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { ROLE_LABEL, atsApi, rememberWorkspace, type WorkspaceRole } from '@/lib/ats-api';
import { fetchAuthMe } from '@/lib/dashboard-api';

type Preview = { organization: { name: string; logoUrl: string | null }; role: WorkspaceRole; email: string };

export function InviteAccept({ token }: { token: string }) {
  const router = useRouter();
  const toast = useToast();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    atsApi
      .previewInvite(token)
      .then(setPreview)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Invite not found'));
    fetchAuthMe()
      .then(() => setSignedIn(true))
      .catch(() => setSignedIn(false));
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    try {
      const { organizationId } = await atsApi.acceptInvite(token);
      rememberWorkspace(organizationId);
      toast.success('You joined the team');
      router.push('/dashboard/ats');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not accept the invite');
      setAccepting(false);
    }
  };

  const next = encodeURIComponent(`/ats/invite/${token}`);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-3 pb-16 pt-24 min-[340px]:px-5">
      <div className="rounded-[1.5rem] border border-border bg-surface-elevated p-5 text-center shadow-sm">
        {error ? (
          <>
            <h1 className="font-display text-2xl text-foreground">Invite problem</h1>
            <p className="mt-2 text-sm text-muted">{error}</p>
            <Link href="/" className="btn-secondary mt-5 w-full">
              Go home
            </Link>
          </>
        ) : !preview || signedIn === null ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted" />
        ) : (
          <>
            {preview.organization.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.organization.logoUrl} alt="" className="mx-auto h-14 w-14 rounded-2xl border border-border bg-white object-contain p-1.5" />
            ) : (
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <Building2 className="h-6 w-6" />
              </span>
            )}
            <h1 className="mt-4 font-display text-2xl text-foreground">Join {preview.organization.name}</h1>
            <p className="mt-2 text-sm text-muted">
              You were invited as a <strong className="text-foreground">{ROLE_LABEL[preview.role].toLowerCase()}</strong> on Dealo ATS. Use the
              account for <strong className="text-foreground">{preview.email}</strong>.
            </p>
            {signedIn ? (
              <button type="button" className="btn-primary mt-5 w-full" onClick={accept} disabled={accepting}>
                {accepting ? 'Joining…' : 'Accept and open'}
              </button>
            ) : (
              <div className="mt-5 grid gap-2">
                <Link href={`/auth/login?next=${next}`} className="btn-primary w-full">
                  Sign in to accept
                </Link>
                <Link href={`/auth/register?next=${next}`} className="btn-secondary w-full">
                  Create an account
                </Link>
                <p className="text-[11px] text-muted">After you verify your email, open this link again.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
