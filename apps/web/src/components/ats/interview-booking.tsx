'use client';

import { motion } from 'framer-motion';
import { CalendarCheck, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { CandidateLinkCard } from '@/components/ats/candidate-link-card';
import { ApiError } from '@/lib/api';
import { KIND_LABEL, atsApi, whenLabel, type BookingPreview } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

export function InterviewBooking({ token }: { token: string }) {
  const [data, setData] = useState<BookingPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    atsApi
      .booking(token)
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'This link is not valid'));
  }, [token]);

  const days = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const option of data?.options ?? []) {
      const key = new Date(option).toDateString();
      map.set(key, [...(map.get(key) ?? []), option]);
    }
    return [...map.entries()];
  }, [data]);

  const book = async () => {
    if (!chosen) return;
    setSaving(true);
    setError(null);
    try {
      const result = await atsApi.book(token, chosen);
      setData((d) => (d ? { ...d, status: 'SCHEDULED', startsAt: result.startsAt } : d));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not book that time');
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <CandidateLinkCard>
        {error ? <p className="text-center text-sm text-danger">{error}</p> : <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted" />}
      </CandidateLinkCard>
    );
  }

  const how = `${KIND_LABEL[data.kind] ?? data.kind} · ${data.durationMin} minutes`;

  if (data.status === 'SCHEDULED' && data.startsAt) {
    return (
      <CandidateLinkCard organization={data.organization}>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
            <CalendarCheck className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-display text-2xl text-foreground">You are booked</h1>
          <p className="mt-2 text-lg font-semibold text-foreground">{whenLabel(data.startsAt)}</p>
          <p className="mt-1 text-sm text-muted">
            {data.jobTitle} · {how}
          </p>
          {data.location ? <p className="mt-2 break-words text-sm text-foreground">{data.location}</p> : null}
          <p className="mt-4 text-xs text-muted">We emailed you a calendar invite. Reply to that email if you need to change the time.</p>
        </motion.div>
      </CandidateLinkCard>
    );
  }

  if (data.status !== 'PROPOSED') {
    return (
      <CandidateLinkCard organization={data.organization}>
        <p className="text-center text-sm text-muted">This interview is no longer open for booking.</p>
      </CandidateLinkCard>
    );
  }

  return (
    <CandidateLinkCard organization={data.organization}>
      <h1 className="font-display text-2xl text-foreground">Hi {data.firstName}, pick a time</h1>
      <p className="mt-1 text-sm text-muted">
        Interview for <strong className="text-foreground">{data.jobTitle}</strong>. {how}. Times are shown in your phone&apos;s time zone.
      </p>
      {days.length === 0 ? (
        <p className="mt-5 rounded-xl bg-surface p-3 text-sm text-muted">All the offered times have passed. Please reply to the email so the team can send new ones.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {days.map(([day, options]) => (
            <div key={day}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                {new Date(options[0]).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <div className="grid grid-cols-1 gap-2 min-[300px]:grid-cols-2">
                {options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setChosen(option)}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-sm font-semibold transition',
                      chosen === option ? 'border-brand bg-brand text-white dark:text-[#071f14]' : 'border-border text-foreground hover:border-brand',
                    )}
                  >
                    {new Date(option).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button type="button" className="btn-primary w-full" disabled={!chosen || saving} onClick={book}>
            {saving ? 'Booking…' : chosen ? `Book ${whenLabel(chosen)}` : 'Choose a time'}
          </button>
        </div>
      )}
    </CandidateLinkCard>
  );
}
