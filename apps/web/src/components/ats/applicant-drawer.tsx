'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarClock,
  ClipboardCheck,
  Download,
  FileText,
  Handshake,
  History,
  Loader2,
  Mail,
  MapPin,
  MapPinCheck,
  MessageCircle,
  Phone,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Star,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { AiReviewBar } from '@/components/ai/ai-review-bar';
import { AiBadge } from '@/components/ats/application-card';
import { useAtsWorkspace } from '@/components/ats/ats-workspace';
import { Section } from '@/components/ats/drawer-section';
import { EmailComposeSheet } from '@/components/ats/email-compose-sheet';
import { InterviewsSection, OffersSection, ScorecardsSection } from '@/components/ats/hiring-sections';
import { PlaceHireSheet } from '@/components/ats/place-hire-sheet';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { atsApi, canManage, type ApplicationDetail } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'interviews' | 'scorecards' | 'offer' | 'timeline';

const TABS: Array<{ id: Tab; label: string; icon: typeof UserRound }> = [
  { id: 'overview', label: 'Overview', icon: UserRound },
  { id: 'interviews', label: 'Interviews', icon: CalendarClock },
  { id: 'scorecards', label: 'Scorecards', icon: ClipboardCheck },
  { id: 'offer', label: 'Offer', icon: Handshake },
  { id: 'timeline', label: 'Timeline', icon: History },
];

export function ApplicantDrawer({
  orgId,
  applicationId,
  onClose,
  onChanged,
}: {
  orgId: string;
  applicationId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!applicationId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [applicationId, onClose]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {applicationId ? (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-[#071f14]/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            className="relative flex h-full w-full max-w-[40rem] flex-col border-l border-border bg-background shadow-2xl"
          >
            <DrawerBody key={applicationId} orgId={orgId} applicationId={applicationId} onClose={onClose} onChanged={onChanged} />
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function DrawerBody({
  orgId,
  applicationId,
  onClose,
  onChanged,
}: {
  orgId: string;
  applicationId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const { current } = useAtsWorkspace();
  const [data, setData] = useState<ApplicationDetail | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState<string | null>(null);
  const [emailing, setEmailing] = useState(false);
  const [placing, setPlacing] = useState(false);
  const isDealoWorkspace = current?.workspace.slug === 'dealo';

  const load = useCallback(async () => {
    try {
      setData(await atsApi.application(orgId, applicationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load');
    }
  }, [orgId, applicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data || data.application.aiScore !== null) return;
    const timer = window.setTimeout(() => void load(), 5000);
    return () => window.clearTimeout(timer);
  }, [data, load]);

  const act = async (label: string, action: () => Promise<unknown>) => {
    try {
      await action();
      if (label) toast.success(label);
      await load();
      onChanged();
    } catch (err) {
      toast.error('That did not work', err instanceof ApiError ? err.message : '');
    }
  };

  if (error) {
    return (
      <div className="p-5">
        <CloseButton onClose={onClose} />
        <p className="mt-6 text-sm text-danger">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const { application: app, job } = data;
  const manage = canManage(data.myRole);
  const initials = app.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const phoneDigits = app.phone?.replace(/[^\d]/g, '').replace(/^0/, '234');

  return (
    <>
      <div className="border-b border-border px-3 pb-3 pt-[max(0.75rem,var(--safe-top))] min-[340px]:px-5">
        <div className="flex items-start gap-3">
          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft font-display text-lg text-brand min-[340px]:inline-flex">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="break-words font-display text-lg leading-tight text-foreground min-[340px]:text-xl">{app.name}</h2>
            <p className="mt-0.5 truncate text-xs text-muted">
              {job.title} · applied {new Date(app.createdAt).toLocaleDateString()}
            </p>
          </div>
          <CloseButton onClose={onClose} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <a href={`mailto:${app.email}`} className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-border px-2.5 py-1 text-muted hover:text-brand">
            <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{app.email}</span>
          </a>
          {app.phone ? (
            <>
              <a href={`tel:${app.phone}`} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-muted hover:text-brand">
                <Phone className="h-3.5 w-3.5" /> {app.phone}
              </a>
              <a
                href={`https://wa.me/${phoneDigits}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-muted hover:text-brand"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </>
          ) : null}
          {app.location ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-muted">
              <MapPin className="h-3.5 w-3.5" /> {app.location}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-col gap-2 min-[340px]:flex-row min-[340px]:items-center">
          {app.status === 'ACTIVE' || app.status === 'HIRED' ? (
            <select
              aria-label="Stage"
              disabled={!manage}
              value={app.stage}
              onChange={(e) => {
                const stage = e.target.value;
                const final = stage === job.stages[job.stages.length - 1];
                if (final && !window.confirm('Mark this person as hired?')) return;
                void act(final ? 'Marked as hired' : `Moved to ${stage}`, () => atsApi.move(orgId, [app.id], stage));
              }}
              className="input-field py-2 text-sm min-[340px]:flex-1"
            >
              {job.stages.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          ) : (
            <span className="rounded-full bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger">Rejected from {app.stage}</span>
          )}
          {manage ? (
            app.status === 'REJECTED' ? (
              <button type="button" className="btn-secondary py-2 text-xs" onClick={() => void act('Back in the pipeline', () => atsApi.restore(orgId, app.id))}>
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </button>
            ) : app.status === 'ACTIVE' ? (
              <button
                type="button"
                className="btn-secondary py-2 text-xs text-danger"
                onClick={() => {
                  const notify = window.confirm('Send them a polite "not this time" email?');
                  void act('Rejected', () => atsApi.reject(orgId, [app.id], notify));
                }}
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
            ) : null
          ) : null}
          {manage ? (
            <button type="button" className="btn-secondary py-2 text-xs" onClick={() => setEmailing(true)}>
              <Mail className="h-3.5 w-3.5" /> Email
            </button>
          ) : null}
        </div>
        {manage && app.status === 'HIRED' && isDealoWorkspace ? (
          <button
            type="button"
            onClick={() => setPlacing(true)}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand/50 px-3 py-2 text-xs font-semibold text-brand"
          >
            <MapPinCheck className="h-3.5 w-3.5" /> Put on a Workforce site
          </button>
        ) : null}
      </div>

      <EmailComposeSheet orgId={orgId} applicationIds={emailing ? [app.id] : null} onClose={() => setEmailing(false)} onSent={() => void load()} />
      {isDealoWorkspace ? (
        <PlaceHireSheet
          orgId={orgId}
          applicationId={app.id}
          defaultRole={job.title}
          open={placing}
          onClose={() => setPlacing(false)}
          onPlaced={() => void load()}
        />
      ) : null}

      <div className="border-b border-border px-2 min-[340px]:px-4">
        <div className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const count =
              t.id === 'interviews' ? data.interviews.length : t.id === 'scorecards' ? data.scorecards.length + data.scorecardsHidden : t.id === 'offer' ? data.offers.length : 0;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'relative inline-flex shrink-0 items-center gap-1.5 px-2.5 py-2.5 text-xs font-semibold transition',
                  tab === t.id ? 'text-brand' : 'text-muted hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {count ? <span className="rounded-full bg-surface px-1.5 tabular-nums">{count}</span> : null}
                {tab === t.id ? <motion.span layoutId="drawer-tab" className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-brand" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 pb-[calc(1rem+var(--safe-bottom))] min-[340px]:px-5">
        {tab === 'overview' ? <Overview data={data} orgId={orgId} manage={manage} act={act} /> : null}
        {tab === 'interviews' ? <InterviewsSection data={data} orgId={orgId} manage={manage} reload={load} /> : null}
        {tab === 'scorecards' ? <ScorecardsSection data={data} orgId={orgId} reload={load} /> : null}
        {tab === 'offer' ? <OffersSection data={data} orgId={orgId} manage={manage} reload={load} onChanged={onChanged} /> : null}
        {tab === 'timeline' ? <Timeline data={data} orgId={orgId} reload={load} /> : null}
      </div>
    </>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition hover:border-brand hover:text-brand"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function Overview({
  data,
  orgId,
  manage,
  act,
}: {
  data: ApplicationDetail;
  orgId: string;
  manage: boolean;
  act: (label: string, action: () => Promise<unknown>) => Promise<void>;
}) {
  const { application: app, ai, cv } = data;
  const [tag, setTag] = useState('');
  const [rerunning, setRerunning] = useState(false);

  return (
    <div className="space-y-3">
      <Section
        title="AI first screen"
        action={
          manage ? (
            <button
              type="button"
              disabled={rerunning}
              onClick={async () => {
                setRerunning(true);
                await act('Screened again', () => atsApi.rerunAi(orgId, app.id));
                setRerunning(false);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand disabled:opacity-60"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', rerunning && 'animate-spin')} /> Run again
            </button>
          ) : null
        }
      >
        {ai ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <AiBadge score={app.aiScore} fit={app.aiFit} className="px-2.5 py-1 text-xs" />
              <span className="text-xs font-semibold text-foreground">{ai.output.fit.toLowerCase()} fit</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground">{ai.output.summary}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <List title="Strengths" items={ai.output.strengths} tone="good" />
              <List title="Gaps to check" items={ai.output.gaps} tone="warn" />
            </div>
            {ai.output.interviewQuestions.length ? <List title="Questions to ask" items={ai.output.interviewQuestions} /> : null}
            <AiReviewBar
              key={ai.id}
              runId={ai.id}
              provider={ai.provider === 'gemini' ? 'gemini' : 'rules'}
              initialStatus={ai.status}
              onDecide={(decision) => atsApi.reviewAi(orgId, app.id, decision)}
            />
          </div>
        ) : app.aiScore === null ? (
          <p className="inline-flex items-center gap-2 text-sm text-muted">
            <Sparkles className="h-4 w-4 animate-pulse text-brand" /> Screening now. This takes a few seconds.
          </p>
        ) : (
          <p className="text-sm text-muted">No AI notes saved for this person. Use &ldquo;Run again&rdquo; to screen them.</p>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          The AI never sees name, gender, age or photo. It only suggests. Your team decides.
        </p>
      </Section>

      {manage ? (
        <Section title="Your rating">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onClick={() => void act('', () => atsApi.updateApplication(orgId, app.id, { rating: app.rating === n ? null : n }))}
                className="p-0.5 text-amber-500 transition hover:scale-110"
              >
                <Star className={cn('h-5 w-5', (app.rating ?? 0) >= n ? 'fill-current' : 'opacity-40')} />
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {app.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
                {t}
                <button
                  type="button"
                  aria-label={`Remove ${t}`}
                  onClick={() => void act('', () => atsApi.updateApplication(orgId, app.id, { tags: app.tags.filter((x) => x !== t) }))}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const value = tag.trim().toLowerCase();
                if (!value || app.tags.includes(value)) return;
                setTag('');
                void act('', () => atsApi.updateApplication(orgId, app.id, { tags: [...app.tags, value] }));
              }}
            >
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="+ tag"
                maxLength={30}
                className="w-20 rounded-full border border-dashed border-border bg-transparent px-2 py-0.5 text-xs outline-none focus:border-brand"
              />
            </form>
          </div>
        </Section>
      ) : null}

      {app.coverNote ? (
        <Section title="Their note">
          <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground">{app.coverNote}</p>
        </Section>
      ) : null}

      <Section title="CV">{cv ? <CvViewer orgId={orgId} cv={cv} /> : <p className="text-sm text-muted">No CV attached.</p>}</Section>
    </div>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone?: 'good' | 'warn' }) {
  if (!items.length) return null;
  return (
    <div className="min-w-0">
      <p className={cn('text-[11px] font-semibold', tone === 'good' ? 'text-brand' : tone === 'warn' ? 'text-amber-600 dark:text-amber-300' : 'text-muted')}>{title}</p>
      <ul className="mt-1 space-y-1 text-xs leading-relaxed text-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-1.5 break-words">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CvViewer({ orgId, cv }: { orgId: string; cv: NonNullable<ApplicationDetail['cv']> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;
    fetch(atsApi.fileUrl(orgId, cv.id), { credentials: 'include' })
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [orgId, cv.id]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex min-w-0 items-center gap-1.5 text-sm text-foreground">
          <FileText className="h-4 w-4 shrink-0 text-brand" />
          <span className="truncate">{cv.fileName}</span>
          <span className="shrink-0 text-xs text-muted">{Math.max(1, Math.round(cv.byteSize / 1024))} KB</span>
        </p>
        {url ? (
          <a href={url} download={cv.fileName} className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
            <Download className="h-3.5 w-3.5" /> Download
          </a>
        ) : null}
      </div>
      {failed ? <p className="text-xs text-danger">Could not open the CV.</p> : null}
      {url && cv.mimeType === 'application/pdf' ? (
        <iframe title="CV preview" src={url} className="h-[60vh] w-full rounded-xl border border-border bg-white" />
      ) : null}
      {url && cv.mimeType !== 'application/pdf' ? <p className="text-xs text-muted">Word files can&apos;t be previewed here. Download to open.</p> : null}
      {!url && !failed ? <div className="h-24 animate-pulse rounded-xl bg-surface" /> : null}
    </div>
  );
}

const EVENT_LABEL: Record<string, string> = {
  APPLIED: 'Applied',
  ADDED: 'Added',
  AI_SCREENED: 'AI screen',
  AI_REVIEWED: 'AI reviewed',
  STAGE_CHANGED: 'Moved',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
  RESTORED: 'Restored',
  RATED: 'Rated',
  NOTE: 'Note',
  INTERVIEW_SCHEDULED: 'Interview',
  INTERVIEW_PROPOSED: 'Interview slots sent',
  INTERVIEW_BOOKED: 'Interview booked',
  INTERVIEW_CANCELLED: 'Interview cancelled',
  INTERVIEW_COMPLETED: 'Interview done',
  SCORECARD: 'Scorecard',
  OFFER_SENT: 'Offer sent',
  OFFER_ACCEPTED: 'Offer accepted',
  OFFER_DECLINED: 'Offer declined',
  OFFER_WITHDRAWN: 'Offer withdrawn',
  EMAIL_SENT: 'Email',
  PLACED: 'Placed on site',
};

function Timeline({ data, orgId, reload }: { data: ApplicationDetail; orgId: string; reload: () => Promise<void> }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    try {
      await atsApi.addNote(orgId, data.application.id, note.trim());
      setNote('');
      await reload();
    } catch (err) {
      toast.error('Could not save note', err instanceof ApiError ? err.message : '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="space-y-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for your team (the applicant never sees it)"
          maxLength={4000}
          className="input-field min-h-[5rem]"
        />
        <button type="submit" disabled={saving || !note.trim()} className="btn-primary w-full text-sm min-[340px]:w-auto">
          {saving ? 'Saving…' : 'Add note'}
        </button>
      </form>
      <ol className="relative space-y-3 border-l border-border pl-4">
        {data.events.map((event) => (
          <li key={event.id} className="relative">
            <span
              className={cn(
                'absolute -left-[1.3rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-background',
                event.type === 'NOTE' ? 'bg-amber-500' : event.type.startsWith('AI') ? 'bg-sky-500' : event.type === 'REJECTED' ? 'bg-danger' : 'bg-brand',
              )}
            />
            <p className="text-xs text-muted">
              <strong className="text-foreground">{EVENT_LABEL[event.type] ?? event.type}</strong>
              {event.actorName ? ` · ${event.actorName}` : ''} · {new Date(event.createdAt).toLocaleString()}
            </p>
            {event.body ? <p className="mt-0.5 whitespace-pre-line break-words text-sm text-foreground">{event.body}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
