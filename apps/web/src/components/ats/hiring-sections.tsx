'use client';

import { CalendarPlus, Check, Copy, Lock, Plus, Send, Star, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { useAtsWorkspace } from '@/components/ats/ats-workspace';
import { FormField } from '@/components/forms/form-field';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { KIND_LABEL, PERIOD_LABEL, atsApi, money, whenLabel, type ApplicationDetail, type Interview } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

import { Section } from './drawer-section';

type Props = { data: ApplicationDetail; orgId: string; reload: () => Promise<void> };

const toIso = (local: string) => (local ? new Date(local).toISOString() : '');
const defaultSlot = (daysAhead: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
};

function useAct(reload: () => Promise<void>) {
  const toast = useToast();
  return async (label: string, action: () => Promise<unknown>) => {
    try {
      const result = await action();
      toast.success(label);
      await reload();
      return result;
    } catch (err) {
      toast.error('That did not work', err instanceof ApiError ? err.message : '');
      return null;
    }
  };
}

const STATUS_TONE: Record<Interview['status'], string> = {
  PROPOSED: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  SCHEDULED: 'bg-brand-soft text-brand',
  COMPLETED: 'bg-border/70 text-muted',
  CANCELLED: 'bg-danger/10 text-danger',
};

export function InterviewsSection({ data, orgId, manage, reload }: Props & { manage: boolean }) {
  const { current } = useAtsWorkspace();
  const toast = useToast();
  const act = useAct(reload);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'slots' | 'fixed'>('slots');
  const [kind, setKind] = useState<Interview['kind']>('VIDEO');
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState('');
  const [fixed, setFixed] = useState(defaultSlot(2, 10));
  const [slots, setSlots] = useState([defaultSlot(2, 10), defaultSlot(2, 14), defaultSlot(3, 11)]);
  const [interviewers, setInterviewers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const active = data.application.status === 'ACTIVE';

  const submit = async () => {
    setSaving(true);
    const result = await act(mode === 'slots' ? 'Times sent to the candidate' : 'Interview booked and invites sent', () =>
      atsApi.schedule(orgId, data.application.id, {
        kind,
        durationMin: duration,
        location: location || undefined,
        interviewerIds: interviewers,
        ...(mode === 'fixed' ? { startsAt: toIso(fixed) } : { slotOptions: slots.filter(Boolean).map(toIso) }),
      }),
    );
    setSaving(false);
    if (result) {
      setOpen(false);
      setLastLink((result as { bookingLink?: string }).bookingLink ?? null);
    }
  };

  return (
    <div className="space-y-3">
      {manage && active ? (
        open ? (
          <Section
            title="New interview"
            action={
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            }
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-1 rounded-full border border-border p-1 text-xs font-semibold">
                {(['slots', 'fixed'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn('rounded-full px-2 py-1.5', mode === m ? 'bg-brand text-white dark:text-[#071f14]' : 'text-muted')}
                  >
                    {m === 'slots' ? 'They pick a time' : 'Set the time'}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 min-[400px]:grid-cols-2">
                <FormField label="How">
                  <select className="input-field" value={kind} onChange={(e) => setKind(e.target.value as Interview['kind'])}>
                    {Object.entries(KIND_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Length">
                  <select className="input-field" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                    {[15, 30, 45, 60, 90, 120].map((m) => (
                      <option key={m} value={m}>
                        {m} minutes
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <FormField label={kind === 'IN_PERSON' ? 'Address' : kind === 'PHONE' ? 'Phone number to call' : 'Meeting link'} optional>
                <input
                  className="input-field"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={kind === 'IN_PERSON' ? '12 Admiralty Way, Lekki' : kind === 'PHONE' ? 'We will call you on…' : 'https://meet.google.com/…'}
                />
              </FormField>
              {mode === 'fixed' ? (
                <FormField label="Date and time">
                  <input type="datetime-local" className="input-field" value={fixed} onChange={(e) => setFixed(e.target.value)} />
                </FormField>
              ) : (
                <FormField label="Times they can pick" hint="We email a link. They pick one and everyone gets a calendar invite.">
                  <div className="space-y-2">
                    {slots.map((slot, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="datetime-local"
                          className="input-field"
                          value={slot}
                          onChange={(e) => setSlots((list) => list.map((s, i) => (i === index ? e.target.value : s)))}
                        />
                        {slots.length > 1 ? (
                          <button
                            type="button"
                            aria-label="Remove time"
                            onClick={() => setSlots((list) => list.filter((_, i) => i !== index))}
                            className="shrink-0 px-1 text-muted hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                    {slots.length < 6 ? (
                      <button type="button" onClick={() => setSlots((list) => [...list, defaultSlot(4, 10)])} className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                        <Plus className="h-3.5 w-3.5" /> Add a time
                      </button>
                    ) : null}
                  </div>
                </FormField>
              )}
              {current && current.members.length > 1 ? (
                <FormField label="Interviewers" optional>
                  <div className="flex flex-wrap gap-1.5">
                    {current.members.map((m) => {
                      const on = interviewers.includes(m.userId);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setInterviewers((list) => (on ? list.filter((id) => id !== m.userId) : [...list, m.userId]))}
                          className={cn(
                            'inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-xs',
                            on ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted',
                          )}
                        >
                          {on ? <Check className="h-3 w-3" /> : null}
                          <span className="truncate">{m.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </FormField>
              ) : null}
              <button type="button" className="btn-primary w-full" disabled={saving} onClick={submit}>
                <Send className="h-4 w-4" /> {saving ? 'Sending…' : mode === 'slots' ? 'Send times' : 'Book and send invites'}
              </button>
            </div>
          </Section>
        ) : (
          <button type="button" className="btn-secondary w-full text-sm" onClick={() => setOpen(true)}>
            <CalendarPlus className="h-4 w-4" /> Schedule interview
          </button>
        )
      ) : null}

      {lastLink ? (
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(lastLink).catch(() => undefined);
            toast.success('Booking link copied', 'Send it on WhatsApp if they have not seen the email.');
          }}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand/50 px-3 py-2 text-xs font-semibold text-brand"
        >
          <Copy className="h-3.5 w-3.5" /> Copy booking link
        </button>
      ) : null}

      {data.interviews.length === 0 ? <p className="py-4 text-center text-sm text-muted">No interviews yet.</p> : null}
      {data.interviews.map((interview) => (
        <InterviewRow key={interview.id} interview={interview} manage={manage} orgId={orgId} act={act} />
      ))}
    </div>
  );
}

function InterviewRow({
  interview,
  manage,
  orgId,
  act,
}: {
  interview: Interview;
  manage: boolean;
  orgId: string;
  act: ReturnType<typeof useAct>;
}) {
  const [moving, setMoving] = useState(false);
  const [when, setWhen] = useState(defaultSlot(1, 10));
  const live = interview.status === 'SCHEDULED' || interview.status === 'PROPOSED';
  return (
    <div className="rounded-2xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {interview.startsAt ? whenLabel(interview.startsAt) : `${interview.slotOptions.length} times offered`}
        </p>
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS_TONE[interview.status])}>
          {interview.status === 'PROPOSED' ? 'Waiting for them' : interview.status.toLowerCase()}
        </span>
      </div>
      <p className="mt-1 break-words text-xs text-muted">
        {KIND_LABEL[interview.kind]} · {interview.durationMin} min{interview.location ? ` · ${interview.location}` : ''}
      </p>
      {interview.status === 'PROPOSED' ? (
        <ul className="mt-2 flex flex-wrap gap-1">
          {interview.slotOptions.map((s) => (
            <li key={s} className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted">
              {whenLabel(s)}
            </li>
          ))}
        </ul>
      ) : null}
      {manage && live ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {interview.status === 'SCHEDULED' ? (
            <button type="button" className="text-xs font-semibold text-brand" onClick={() => void act('Marked as done', () => atsApi.updateInterview(orgId, interview.id, { status: 'COMPLETED' }))}>
              Mark done
            </button>
          ) : null}
          <button type="button" className="text-xs font-semibold text-brand" onClick={() => setMoving((m) => !m)}>
            {interview.status === 'PROPOSED' ? 'Set a time' : 'Move'}
          </button>
          <button
            type="button"
            className="text-xs font-semibold text-danger"
            onClick={() => window.confirm('Cancel this interview? We will email the candidate.') && void act('Interview cancelled', () => atsApi.updateInterview(orgId, interview.id, { status: 'CANCELLED' }))}
          >
            Cancel
          </button>
        </div>
      ) : null}
      {moving ? (
        <div className="mt-2 flex flex-col gap-2 min-[340px]:flex-row">
          <input type="datetime-local" className="input-field" value={when} onChange={(e) => setWhen(e.target.value)} />
          <button
            type="button"
            className="btn-primary shrink-0 px-3 py-2 text-xs"
            onClick={async () => {
              const ok = await act('New time sent', () => atsApi.updateInterview(orgId, interview.id, { startsAt: toIso(when) }));
              if (ok) setMoving(false);
            }}
          >
            Save
          </button>
        </div>
      ) : null}
    </div>
  );
}

const RECOMMEND = [
  { id: 'YES', label: 'Yes, hire', tone: 'border-brand bg-brand-soft text-brand' },
  { id: 'MAYBE', label: 'Maybe', tone: 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  { id: 'NO', label: 'No', tone: 'border-danger bg-danger/10 text-danger' },
] as const;

const CRITERIA = ['Skills for the job', 'Experience', 'Communication', 'Reliability'];

export function ScorecardsSection({ data, orgId, reload }: Props) {
  const act = useAct(reload);
  const mine = data.scorecards.find((s) => s.reviewerId === data.myUserId);
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [recommendation, setRecommendation] = useState<'YES' | 'MAYBE' | 'NO' | null>(mine?.recommendation ?? null);
  const [criteria, setCriteria] = useState<Record<string, number>>(mine?.criteria ?? {});
  const [notes, setNotes] = useState(mine?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!rating || !recommendation) return;
    setSaving(true);
    await act('Scorecard saved', () => atsApi.scorecard(orgId, data.application.id, { rating, recommendation, criteria, notes: notes || undefined }));
    setSaving(false);
  };

  const yes = data.scorecards.filter((s) => s.recommendation === 'YES').length;
  const avg = data.scorecards.length ? data.scorecards.reduce((sum, s) => sum + s.rating, 0) / data.scorecards.length : 0;

  return (
    <div className="space-y-3">
      <Section title="Your scorecard">
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs text-muted">Overall</p>
            <Stars value={rating} onChange={setRating} />
          </div>
          <div className="space-y-1.5">
            {CRITERIA.map((c) => (
              <div key={c} className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-xs text-foreground">{c}</span>
                <Stars small value={criteria[c] ?? 0} onChange={(v) => setCriteria((all) => ({ ...all, [c]: v }))} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {RECOMMEND.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRecommendation(r.id)}
                className={cn('rounded-xl border px-1 py-2 text-xs font-semibold', recommendation === r.id ? r.tone : 'border-border text-muted')}
              >
                {r.label}
              </button>
            ))}
          </div>
          <textarea className="input-field min-h-[4.5rem]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What stood out? Any worries?" maxLength={4000} />
          <button type="button" className="btn-primary w-full text-sm" disabled={!rating || !recommendation || saving} onClick={submit}>
            {saving ? 'Saving…' : mine ? 'Update scorecard' : 'Submit scorecard'}
          </button>
        </div>
      </Section>

      {data.scorecardsHidden > 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted">
          <Lock className="h-3.5 w-3.5 shrink-0" /> {data.scorecardsHidden} teammate scorecard{data.scorecardsHidden === 1 ? '' : 's'} hidden until you submit yours, so you are not swayed.
        </p>
      ) : null}

      {data.scorecards.length ? (
        <Section title={`Team · ${avg.toFixed(1)}/5 · ${yes} of ${data.scorecards.length} say yes`}>
          <ul className="space-y-2">
            {data.scorecards.map((s) => (
              <li key={s.id} className="rounded-xl border border-border p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-foreground">{s.reviewerName}</span>
                  <span className="text-xs text-muted">
                    {s.rating}/5 · {RECOMMEND.find((r) => r.id === s.recommendation)?.label}
                  </span>
                </div>
                {s.notes ? <p className="mt-1 whitespace-pre-line break-words text-xs text-foreground">{s.notes}</p> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function Stars({ value, onChange, small }: { value: number; onChange: (v: number) => void; small?: boolean }) {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" aria-label={`${n} of 5`} onClick={() => onChange(n)} className="p-0.5 text-amber-500 transition hover:scale-110">
          <Star className={cn(small ? 'h-4 w-4' : 'h-6 w-6', value >= n ? 'fill-current' : 'opacity-35')} />
        </button>
      ))}
    </div>
  );
}

export function OffersSection({ data, orgId, manage, reload, onChanged }: Props & { manage: boolean; onChanged: () => void }) {
  const toast = useToast();
  const act = useAct(async () => {
    await reload();
    onChanged();
  });
  const [pay, setPay] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [period, setPeriod] = useState('MONTH');
  const [start, setStart] = useState(defaultSlot(14, 9).slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const live = data.offers.find((o) => o.status === 'SENT' || o.status === 'DRAFT');
  const canOffer = manage && data.application.status === 'ACTIVE';

  const submit = async (send: boolean) => {
    const payMinor = Math.round(Number(pay.replace(/,/g, '')) * 100);
    if (!payMinor) {
      toast.error('Enter the pay');
      return;
    }
    setSaving(true);
    const result = await act(send ? 'Offer sent' : 'Offer saved as a draft', () =>
      atsApi.createOffer(orgId, data.application.id, { payMinor, currency, payPeriod: period as 'MONTH', startDate: start, notes: notes || undefined, send }),
    );
    setSaving(false);
    if (result) setLink((result as { link?: string }).link ?? null);
  };

  return (
    <div className="space-y-3">
      {canOffer ? (
        <Section title={live ? 'Make a new offer (replaces the current one)' : 'Make an offer'}>
          <div className="space-y-3">
            <div className="grid gap-3 min-[400px]:grid-cols-[minmax(0,1fr)_5.5rem]">
              <FormField label="Pay">
                <input className="input-field" inputMode="numeric" value={pay} onChange={(e) => setPay(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="350,000" />
              </FormField>
              <FormField label="Currency">
                <select className="input-field" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {['NGN', 'GHS', 'KES', 'ZAR', 'USD', 'GBP', 'EUR'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </FormField>
            </div>
            <div className="grid gap-3 min-[400px]:grid-cols-2">
              <FormField label="Per">
                <select className="input-field" value={period} onChange={(e) => setPeriod(e.target.value)}>
                  {Object.entries(PERIOD_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Start date">
                <input type="date" className="input-field" value={start} onChange={(e) => setStart(e.target.value)} />
              </FormField>
            </div>
            <FormField label="Other details" optional hint="Benefits, working hours, probation, documents to bring.">
              <textarea className="input-field min-h-[4.5rem]" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={3000} />
            </FormField>
            <div className="grid gap-2 min-[340px]:grid-cols-2">
              <button type="button" className="btn-secondary text-sm" disabled={saving} onClick={() => submit(false)}>
                Save draft
              </button>
              <button type="button" className="btn-primary text-sm" disabled={saving} onClick={() => submit(true)}>
                <Send className="h-4 w-4" /> Send offer
              </button>
            </div>
          </div>
        </Section>
      ) : null}

      {link ? (
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(link).catch(() => undefined);
            toast.success('Offer link copied');
          }}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand/50 px-3 py-2 text-xs font-semibold text-brand"
        >
          <Copy className="h-3.5 w-3.5" /> Copy offer link
        </button>
      ) : null}

      {data.offers.length === 0 ? <p className="py-4 text-center text-sm text-muted">No offers yet.</p> : null}
      {data.offers.map((offer) => (
        <div key={offer.id} className="rounded-2xl border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              {money(offer.payMinor, offer.currency)} / {PERIOD_LABEL[offer.payPeriod] ?? offer.payPeriod}
            </p>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                offer.status === 'ACCEPTED' ? 'bg-brand text-white dark:text-[#071f14]' : offer.status === 'DECLINED' ? 'bg-danger/10 text-danger' : 'bg-surface text-muted',
              )}
            >
              {offer.status === 'SENT' ? 'waiting for reply' : offer.status.toLowerCase()}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">Starts {new Date(offer.startDate).toLocaleDateString()}</p>
          {offer.responseNote ? <p className="mt-1 break-words text-xs text-foreground">“{offer.responseNote}”</p> : null}
          {manage && (offer.status === 'SENT' || offer.status === 'DRAFT') ? (
            <div className="mt-2 flex gap-3">
              {offer.status === 'DRAFT' ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-brand"
                  onClick={async () => {
                    const result = await act('Offer sent', () => atsApi.sendOffer(orgId, offer.id));
                    if (result) setLink((result as { link: string }).link);
                  }}
                >
                  Send now
                </button>
              ) : null}
              <button type="button" className="text-xs font-semibold text-danger" onClick={() => window.confirm('Withdraw this offer?') && void act('Offer withdrawn', () => atsApi.withdrawOffer(orgId, offer.id))}>
                Withdraw
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
