'use client';

import { UNSUBSCRIBE_REASONS } from '@dealo/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { BellOff, BellRing, CheckCircle2, Loader2, MailX } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

type Status = { email: string; subscribed: boolean };

function explain(err: unknown) {
  if (err instanceof ApiError && err.status === 400) return 'This link is not valid. Use the Unsubscribe link at the bottom of your latest Dealo email.';
  if (err instanceof ApiError && err.status === 429) return 'Too many tries. Wait a minute and open the link again.';
  return 'We could not reach Dealo just now. Please try the link again in a moment.';
}

/**
 * Opened from the footer of a Dealo email. Unsubscribes straight away (one click, no sign-in),
 * then offers an optional reason and a way to undo.
 */
export function UnsubscribePanel() {
  const params = useSearchParams();
  const token = params.get('t') ?? '';
  const campaignId = params.get('c') ?? undefined;
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [thanked, setThanked] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setError('This link is missing its code. Use the Unsubscribe link at the bottom of a Dealo email.');
      return;
    }
    apiFetch<Status>('/newsletter/unsubscribe', { method: 'POST', json: { token, campaignId } })
      .then(setStatus)
      .catch((err) => setError(explain(err)));
  }, [token, campaignId]);

  const change = async (path: 'unsubscribe' | 'resubscribe', extra: Record<string, string> = {}) => {
    setBusy(true);
    try {
      setStatus(await apiFetch<Status>(`/newsletter/${path}`, { method: 'POST', json: { token, campaignId, ...extra } }));
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  const sendReason = async (value: string) => {
    setReason(value);
    await change('unsubscribe', { reason: value });
    setThanked(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface-elevated shadow-[0_24px_60px_rgba(4,47,46,0.12)]"
    >
      <div className="relative flex h-28 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_60%,rgba(20,184,166,0.22),transparent_70%)]">
        <svg aria-hidden viewBox="0 0 400 112" className="absolute inset-0 h-full w-full text-brand/20">
          <circle cx="200" cy="64" r="40" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="200" cy="64" r="70" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" />
        </svg>
        <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg dark:text-[#071f14]">
          {!status && !error ? <Loader2 className="h-6 w-6 animate-spin" /> : status?.subscribed ? <BellRing className="h-6 w-6" /> : error ? <MailX className="h-6 w-6" /> : <BellOff className="h-6 w-6" />}
        </span>
      </div>

      <div className="px-6 pb-6 pt-2 text-center">
        {error ? (
          <>
            <h1 className="font-display text-2xl text-foreground">Link not recognised</h1>
            <p className="mt-2 text-sm text-muted">{error}</p>
          </>
        ) : !status ? (
          <>
            <h1 className="font-display text-2xl text-foreground">Updating your preferences…</h1>
            <p className="mt-2 text-sm text-muted">One moment.</p>
          </>
        ) : status.subscribed ? (
          <>
            <h1 className="font-display text-2xl text-foreground">Welcome back</h1>
            <p className="mt-2 text-sm text-muted">
              <strong className="text-foreground">{status.email}</strong> will get Dealo news and updates again.
            </p>
            <button type="button" disabled={busy} onClick={() => void change('unsubscribe')} className="btn-secondary mt-5 text-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />} Unsubscribe again
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl text-foreground">You are unsubscribed</h1>
            <p className="mt-2 text-sm text-muted">
              <strong className="text-foreground">{status.email}</strong> will no longer get Dealo newsletters or announcements. Emails about your
              account, applications and payments still arrive.
            </p>

            <AnimatePresence mode="wait">
              {thanked ? (
                <motion.p key="thanks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                  <CheckCircle2 className="h-4 w-4" /> Thanks for telling us.
                </motion.p>
              ) : (
                <motion.div key="why" exit={{ opacity: 0 }} className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Mind telling us why? (optional)</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                    {UNSUBSCRIBE_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        disabled={busy}
                        onClick={() => void sendReason(r)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                          reason === r ? 'border-brand bg-brand-soft text-brand' : 'border-border text-foreground hover:border-brand hover:text-brand',
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 border-t border-border pt-4">
              <button type="button" disabled={busy} onClick={() => void change('resubscribe')} className="text-sm font-semibold text-brand hover:underline">
                {busy ? 'Saving…' : 'That was a mistake, keep me subscribed'}
              </button>
            </div>
          </>
        )}
        <p className="mt-6 text-xs text-muted">
          <Link href="/" className="hover:text-foreground">
            Back to Dealo
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
