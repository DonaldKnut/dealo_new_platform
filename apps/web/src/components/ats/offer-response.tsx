'use client';

import { motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, Loader2, MapPin, PartyPopper } from 'lucide-react';
import { useEffect, useState } from 'react';

import { CandidateLinkCard } from '@/components/ats/candidate-link-card';
import { ApiError } from '@/lib/api';
import { PERIOD_LABEL, atsApi, money, type OfferPreview } from '@/lib/ats-api';

export function OfferResponse({ token }: { token: string }) {
  const [data, setData] = useState<OfferPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<null | 'ACCEPTED' | 'DECLINED'>(null);

  useEffect(() => {
    atsApi
      .offerPreview(token)
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'This link is not valid'));
  }, [token]);

  const respond = async (decision: 'ACCEPTED' | 'DECLINED') => {
    if (decision === 'DECLINED' && !window.confirm('Decline this offer? You cannot undo this.')) return;
    setSaving(decision);
    setError(null);
    try {
      await atsApi.respondOffer(token, decision, note.trim() || undefined);
      setData((d) => (d ? { ...d, status: decision, respondedAt: new Date().toISOString() } : d));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send your reply');
    } finally {
      setSaving(null);
    }
  };

  if (!data) {
    return (
      <CandidateLinkCard>
        {error ? <p className="text-center text-sm text-danger">{error}</p> : <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted" />}
      </CandidateLinkCard>
    );
  }

  if (data.status === 'ACCEPTED') {
    return (
      <CandidateLinkCard organization={data.organization}>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <motion.span
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 12 }}
            className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand"
          >
            <PartyPopper className="h-7 w-7" />
          </motion.span>
          <h1 className="mt-4 font-display text-2xl text-foreground">Congratulations, {data.firstName}!</h1>
          <p className="mt-2 text-sm text-muted">
            You accepted the {data.jobTitle} role. {data.organization.name} will contact you about your first day.
          </p>
        </motion.div>
      </CandidateLinkCard>
    );
  }

  if (data.status !== 'SENT') {
    const message =
      data.status === 'DECLINED'
        ? 'You declined this offer. Thank you for letting the team know.'
        : data.status === 'EXPIRED'
          ? 'This offer has expired. Please contact the company if you are still interested.'
          : 'This offer is no longer available.';
    return (
      <CandidateLinkCard organization={data.organization}>
        <p className="text-center text-sm text-muted">{message}</p>
      </CandidateLinkCard>
    );
  }

  return (
    <CandidateLinkCard organization={data.organization}>
      <p className="eyebrow">Job offer</p>
      <h1 className="mt-1 break-words font-display text-2xl text-foreground min-[340px]:text-3xl">{data.jobTitle}</h1>
      <p className="mt-1 text-sm text-muted">Hi {data.firstName}, here is your offer.</p>

      <div className="mt-5 rounded-2xl border border-brand/30 bg-brand-soft/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">Pay</p>
        <p className="mt-1 break-words font-display text-3xl text-foreground">
          {money(data.payMinor, data.currency)}
          <span className="text-base text-muted"> / {PERIOD_LABEL[data.payPeriod] ?? data.payPeriod}</span>
        </p>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-foreground">
        <li className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-brand" /> Starts {new Date(data.startDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
        </li>
        <li className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-brand" /> <span className="min-w-0 break-words">{data.location}</span>
        </li>
      </ul>
      {data.notes ? <p className="mt-4 whitespace-pre-line break-words rounded-xl bg-surface p-3 text-sm text-foreground">{data.notes}</p> : null}

      <textarea
        className="input-field mt-5 min-h-[4.5rem]"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional message to the team"
        maxLength={1000}
      />
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      <div className="mt-3 grid gap-2 min-[340px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <button type="button" className="btn-primary" disabled={Boolean(saving)} onClick={() => respond('ACCEPTED')}>
          <CheckCircle2 className="h-4 w-4" /> {saving === 'ACCEPTED' ? 'Sending…' : 'Accept offer'}
        </button>
        <button type="button" className="btn-secondary" disabled={Boolean(saving)} onClick={() => respond('DECLINED')}>
          {saving === 'DECLINED' ? 'Sending…' : 'Decline'}
        </button>
      </div>
    </CandidateLinkCard>
  );
}
