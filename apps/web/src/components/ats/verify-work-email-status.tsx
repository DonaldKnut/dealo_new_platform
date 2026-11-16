'use client';

import { CheckCircle2, Loader2, MailWarning } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { apiFetch } from '@/lib/api';

type State = 'working' | 'done' | 'failed';

export function VerifyWorkEmailStatus({ token }: { token: string }) {
  const [state, setState] = useState<State>(token ? 'working' : 'failed');
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    apiFetch(`/ats/verify-work-email?token=${encodeURIComponent(token)}`, { method: 'POST' })
      .then(() => setState('done'))
      .catch(() => setState('failed'));
  }, [token]);

  if (state === 'working') {
    return (
      <p className="mt-8 flex items-center gap-2 text-sm text-muted" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Confirming your work email…
      </p>
    );
  }

  if (state === 'done') {
    return (
      <div className="mt-8 space-y-4" role="status">
        <p className="flex items-start gap-2 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          Your work email is confirmed. Dealo will review your company, then you can publish jobs.
        </p>
        <Link href="/dashboard/ats/settings" className="btn-primary inline-flex w-full justify-center">
          Back to ATS settings
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4" role="alert">
      <p className="flex items-start gap-2 text-sm text-danger">
        <MailWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        This link is invalid or was already used. Open ATS settings and resend the work-email link.
      </p>
      <Link href="/dashboard/ats/settings" className="btn-secondary inline-flex w-full justify-center">
        Open ATS settings
      </Link>
    </div>
  );
}
