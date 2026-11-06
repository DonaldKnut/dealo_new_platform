'use client';

import { JOB_APPLICATION_STATUSES, type JobApplicationStatus } from '@dealo/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Bookmark, Briefcase, CalendarCheck2, Check, Loader2, PartyPopper, Search, StickyNote, Trash2, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { DashHero } from '@/components/dashboard/dashboard-ui';
import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import { APPLICATION_STATUS_LABEL, jobsApi, type SavedJob, type TrackedApplication } from '@/lib/jobs-api';
import { cn } from '@/lib/utils';

import { CompanyLogo } from './company-logo';

const SOURCE_NAME: Record<string, string> = { remotive: 'Remotive', jobicy: 'Jobicy', arbeitnow: 'Arbeitnow' };

const STATUS_TONE: Record<JobApplicationStatus, string> = {
  SAVED: 'bg-surface text-muted',
  APPLIED: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  INTERVIEW: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  OFFER: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  HIRED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  REJECTED: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  WITHDRAWN: 'bg-surface text-muted',
};

export function MyApplicationsPanel() {
  const toast = useToast();
  const [tab, setTab] = useState<'applied' | 'saved'>('applied');
  const [apps, setApps] = useState<TrackedApplication[] | null>(null);
  const [saved, setSaved] = useState<SavedJob[] | null>(null);
  const [noteFor, setNoteFor] = useState<TrackedApplication | null>(null);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    jobsApi.applications().then(setApps).catch(() => setApps([]));
    jobsApi.saved().then(setSaved).catch(() => setSaved([]));
  }, []);

  const count = (statuses: JobApplicationStatus[]) => apps?.filter((a) => statuses.includes(a.status)).length ?? 0;

  const setStatus = async (app: TrackedApplication, status: JobApplicationStatus) => {
    setApps((list) => list?.map((a) => (a.id === app.id ? { ...a, status } : a)) ?? list);
    try {
      await jobsApi.updateApplication(app.id, { status });
      if (status === 'OFFER' || status === 'HIRED') toast.success(status === 'HIRED' ? 'Congratulations on the new job!' : 'An offer, well done!');
    } catch {
      setApps((list) => list?.map((a) => (a.id === app.id ? app : a)) ?? list);
      toast.error('Could not update it');
    }
  };

  const remove = async (app: TrackedApplication) => {
    if (!window.confirm(`Remove “${app.title}” from your list?`)) return;
    setApps((list) => list?.filter((a) => a.id !== app.id) ?? list);
    await jobsApi.removeApplication(app.id).catch(() => toast.error('Could not remove it'));
  };

  const unsave = async (job: SavedJob) => {
    setSaved((list) => list?.filter((s) => s.id !== job.id) ?? list);
    await jobsApi.unsave(job.listingId).catch(() => toast.error('Could not remove it'));
  };

  const saveNote = async () => {
    if (!noteFor) return;
    setSavingNote(true);
    try {
      const updated = await jobsApi.updateApplication(noteFor.id, { note: note.trim() || null });
      setApps((list) => list?.map((a) => (a.id === updated.id ? updated : a)) ?? list);
      setNoteFor(null);
    } catch {
      toast.error('Could not save the note');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Job search"
        title="My applications"
        subtitle="Every job you applied for or saved, in one list. Update the status as you hear back."
        actions={
          <Link href="/jobs" className="btn-primary text-sm">
            <Search className="h-4 w-4" /> Find jobs
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Briefcase} label="Applied" value={count(['APPLIED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'])} />
        <Stat icon={CalendarCheck2} label="Interviewing" value={count(['INTERVIEW'])} />
        <Stat icon={PartyPopper} label="Offers" value={count(['OFFER', 'HIRED'])} />
        <Stat icon={Bookmark} label="Saved" value={saved?.length ?? 0} />
      </div>

      <div role="tablist" className="inline-flex rounded-full border border-border bg-surface p-1">
        {(['applied', 'saved'] as const).map((id) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn('relative rounded-full px-4 py-1.5 text-sm font-semibold transition-colors', tab === id ? 'text-white dark:text-[#071f14]' : 'text-muted hover:text-foreground')}
          >
            {tab === id ? <motion.span layoutId="apps-tab" className="absolute inset-0 rounded-full bg-brand" transition={{ type: 'spring', stiffness: 420, damping: 34 }} /> : null}
            <span className="relative z-10">{id === 'applied' ? 'Applications' : 'Saved jobs'}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'applied' ? (
          <motion.div key="applied" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {apps === null ? (
              <Skeleton />
            ) : apps.length === 0 ? (
              <Empty title="No applications yet" body="Apply to a job on the Dealo job board and it shows up here, ready to track." />
            ) : (
              apps.map((app, i) => (
                <motion.article
                  key={app.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.03 }}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-elevated p-3 min-[340px]:p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <CompanyLogo name={app.company} src={null} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/jobs?job=${app.listingId}`} className="line-clamp-2 break-words text-sm font-semibold text-foreground hover:text-brand">
                        {app.title}
                      </Link>
                      <p className="truncate text-xs text-muted">
                        {app.company} · {app.source === 'dealo' ? (
                          <span className="inline-flex items-center gap-0.5 text-brand">
                            <Zap className="h-3 w-3" /> Dealo
                          </span>
                        ) : (
                          SOURCE_NAME[app.source] ?? app.source
                        )}{' '}
                        · {new Date(app.appliedAt).toLocaleDateString()}
                      </p>
                      {app.note ? <p className="mt-1 line-clamp-2 text-xs italic text-muted">“{app.note}”</p> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="relative">
                      <span className="sr-only">Status</span>
                      <select
                        value={app.status}
                        onChange={(e) => void setStatus(app, e.target.value as JobApplicationStatus)}
                        className={cn('cursor-pointer appearance-none rounded-full border-0 py-1.5 pl-3 pr-7 text-xs font-semibold outline-none ring-1 ring-border', STATUS_TONE[app.status])}
                      >
                        {JOB_APPLICATION_STATUSES.filter((s) => s !== 'SAVED').map((s) => (
                          <option key={s} value={s}>
                            {APPLICATION_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                      <Check className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 opacity-60" />
                    </label>
                    <button
                      type="button"
                      aria-label="Add a note"
                      onClick={() => {
                        setNoteFor(app);
                        setNote(app.note ?? '');
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted hover:text-brand"
                    >
                      <StickyNote className="h-4 w-4" />
                    </button>
                    <a href={app.url} target="_blank" rel="noopener noreferrer" aria-label="Open job" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted hover:text-brand">
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                    <button type="button" aria-label="Remove" onClick={() => void remove(app)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.article>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div key="saved" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-3 sm:grid-cols-2">
            {saved === null ? (
              <Skeleton />
            ) : saved.length === 0 ? (
              <div className="sm:col-span-2">
                <Empty title="No saved jobs" body="Tap the bookmark on any job to keep it here for later." />
              </div>
            ) : (
              saved.map((job) => (
                <article key={job.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated p-3">
                  <CompanyLogo name={job.company} src={null} className="h-10 w-10" />
                  <Link href={`/jobs?job=${job.listingId}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground hover:text-brand">{job.title}</span>
                    <span className="block truncate text-xs text-muted">{job.company}</span>
                  </Link>
                  <button type="button" aria-label="Remove from saved" onClick={() => void unsave(job)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </article>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <FormModal
        open={Boolean(noteFor)}
        onClose={() => setNoteFor(null)}
        title="Note"
        description={noteFor ? `${noteFor.title} · ${noteFor.company}` : undefined}
        icon={StickyNote}
        size="sm"
        mobile="auto"
        footer={
          <button type="button" className="btn-primary w-full min-[340px]:w-auto" disabled={savingNote} onClick={() => void saveNote()}>
            {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save note
          </button>
        }
      >
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          placeholder="Who you spoke to, interview date, salary they mentioned…"
          className="input-field min-h-[8rem] w-full"
        />
      </FormModal>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Briefcase; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-3 min-[340px]:p-4">
      <Icon className="h-4 w-4 text-brand" />
      <p className="mt-2 font-display text-2xl tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
      ))}
    </>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <Briefcase className="mx-auto h-8 w-8 text-muted" />
      <p className="mt-3 font-display text-xl text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>
      <Link href="/jobs" className="btn-primary mt-4 inline-flex text-sm">
        <Search className="h-4 w-4" /> Browse jobs
      </Link>
    </div>
  );
}
