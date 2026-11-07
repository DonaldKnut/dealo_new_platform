'use client';

import { AGENT_CATALOG, type AgentTask } from '@dealo/shared';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Cpu,
  ExternalLink,
  Loader2,
  MessageCircle,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { JobDescription } from '@/components/ats/job-description';
import { useToast } from '@/components/ui/toast';
import { agentsApi, TRIGGER_LABEL } from '@/lib/agents-api';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

import { AGENT_LOOK } from './agent-meta';

/* eslint-disable @typescript-eslint/no-explicit-any -- payload shapes are fixed per agent on the API */

const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 60) return m <= 1 ? 'just now' : `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

const lagosTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export function AgentTaskCard({ task, orgId, onChange, defaultOpen = false }: { task: AgentTask; orgId: string; onChange: (t: AgentTask) => void; defaultOpen?: boolean }) {
  const toast = useToast();
  const look = AGENT_LOOK[task.agent];
  const Icon = look.icon;
  const p = task.payload as any;
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState<'APPROVE' | 'DISMISS' | null>(null);

  const people: Array<{ applicationId: string; suggested?: boolean }> = useMemo(
    () => (task.agent === 'screening' ? p.candidates ?? [] : task.agent === 'follow_up' ? p.recipients ?? [] : []),
    [task.agent, p],
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(people.filter((x) => task.agent !== 'screening' || x.suggested).map((x) => x.applicationId)),
  );
  const [subject, setSubject] = useState<string>(p.message?.subject ?? p.plan?.emailSubject ?? '');
  const [body, setBody] = useState<string>(p.message?.body ?? p.plan?.emailBody ?? '');

  const pending = task.status === 'PENDING';
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const decide = async (decision: 'APPROVE' | 'DISMISS') => {
    setBusy(decision);
    try {
      const edits =
        task.agent === 'follow_up' || task.agent === 'sourcing'
          ? { ...(subject !== (p.message?.subject ?? p.plan?.emailSubject) ? { subject } : {}), ...(body !== (p.message?.body ?? p.plan?.emailBody) ? { body } : {}) }
          : undefined;
      const updated = await agentsApi.decide(orgId, task.id, {
        decision,
        ...(people.length && decision === 'APPROVE' ? { selection: [...selected] } : {}),
        ...(edits && Object.keys(edits).length ? { edits } : {}),
      });
      onChange(updated);
      toast.success(decision === 'APPROVE' ? 'Done' : 'Dismissed', updated.result ?? undefined);
    } catch (err) {
      toast.error('That did not work', err instanceof ApiError ? err.message : '');
    } finally {
      setBusy(null);
    }
  };

  const copy = async (text: string, what: string) => {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    toast.success(`${what} copied`);
  };

  const approveLabel =
    task.agent === 'screening'
      ? `Move ${selected.size} to “${p.nextStage}”`
      : task.agent === 'follow_up'
        ? `Send ${selected.size} ${selected.size === 1 ? 'update' : 'updates'}`
        : task.agent === 'scheduling'
          ? 'Send booking link'
          : task.agent === 'job_post'
            ? p.jobId
              ? 'Update the job'
              : 'Save as draft job'
            : task.agent === 'sourcing'
              ? 'Save email as template'
              : task.agent === 'interview_kit'
                ? 'Attach kit to job'
                : 'Mark as read';

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        'overflow-hidden rounded-[1.4rem] border bg-surface-elevated shadow-sm transition-shadow',
        pending ? 'border-border hover:shadow-lg' : 'border-border/70',
      )}
    >
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-3 p-3 text-left min-[340px]:p-4">
        <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg', look.gradient)}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
            <span className={cn('font-semibold', look.text)}>{AGENT_CATALOG[task.agent].name}</span>
            <span>·</span>
            <span>{TRIGGER_LABEL[task.trigger]}</span>
            <span>·</span>
            <span>{ago(task.createdAt)}</span>
          </span>
          <span className="mt-0.5 block break-words font-semibold leading-snug text-foreground">{task.title}</span>
          <span className="mt-0.5 block text-sm leading-relaxed text-muted">{task.summary}</span>
          {!pending ? (
            <span className={cn('mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', task.status === 'DISMISSED' ? 'bg-surface text-muted' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300')}>
              {task.status === 'DISMISSED' ? <X className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              {task.status === 'DISMISSED' ? 'Dismissed' : task.result ?? 'Done'}
              {task.decidedByName ? ` · ${task.decidedByName}` : ''}
            </span>
          ) : null}
        </span>
        <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="space-y-4 border-t border-border px-3 pb-4 pt-4 min-[340px]:px-4">
              {/* ---------------------------------------------------- screening */}
              {task.agent === 'screening' ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted">
                    Ranked by fit with the must-haves. {p.unscored ? `${p.unscored} still being read by the AI.` : ''} Tick who should move on.
                  </p>
                  {(p.candidates as any[]).map((c) => (
                    <label key={c.applicationId} className={cn('flex cursor-pointer gap-3 rounded-2xl border p-3 transition', selected.has(c.applicationId) ? 'border-brand bg-brand-soft/40' : 'border-border hover:border-brand/40')}>
                      <input type="checkbox" disabled={!pending} checked={selected.has(c.applicationId)} onChange={() => toggle(c.applicationId)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand)]" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-foreground">{c.name}</span>
                          {c.location ? <span className="text-xs text-muted">{c.location}</span> : null}
                        </span>
                        {c.summary ? <span className="mt-1 block text-xs leading-relaxed text-muted">{c.summary}</span> : null}
                        {c.strengths?.length || c.gaps?.length ? (
                          <span className="mt-1.5 flex flex-wrap gap-1">
                            {(c.strengths as string[]).map((s) => (
                              <span key={s} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">+ {s}</span>
                            ))}
                            {(c.gaps as string[]).map((s) => (
                              <span key={s} className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">– {s}</span>
                            ))}
                          </span>
                        ) : null}
                      </span>
                      <ScoreRing score={c.score} />
                    </label>
                  ))}
                  <Link href={`/dashboard/ats/jobs/${p.jobId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                    Open the {p.jobTitle} board <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : null}

              {/* ----------------------------------------------------- job post */}
              {task.agent === 'job_post' ? (
                <div className="space-y-4">
                  {(p.draft.biasFlags as any[]).length ? (
                    <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <AlertTriangle className="h-4 w-4 text-amber-600" /> Wording to fix
                      </p>
                      <ul className="mt-2 space-y-1.5 text-xs">
                        {(p.draft.biasFlags as any[]).map((f, i) => (
                          <li key={i}>
                            <span className="font-semibold text-foreground">“{f.phrase}”</span> <span className="text-muted">— {f.why} {f.suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" /> No biased or off-putting wording found.
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Fact label="Suggested pay (monthly)" value={`₦${Number(p.draft.salary.minNaira).toLocaleString()} – ₦${Number(p.draft.salary.maxNaira).toLocaleString()}`} note={p.draft.salary.note} />
                    <Fact label="Must-haves" value={`${p.draft.mustHaves.length}`} note={(p.draft.mustHaves as string[]).join(' · ')} />
                  </div>
                  <div className="max-h-80 overflow-y-auto rounded-2xl border border-border bg-surface p-3 min-[340px]:p-4">
                    <p className="font-display text-lg text-foreground">{p.draft.title}</p>
                    <JobDescription text={p.draft.description} className="mt-2" />
                  </div>
                </div>
              ) : null}

              {/* ----------------------------------------------------- sourcing */}
              {task.agent === 'sourcing' ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1.5">
                    {(p.plan.keywords as string[]).map((k) => (
                      <span key={k} className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs text-violet-700 dark:text-violet-300">{k}</span>
                    ))}
                  </div>
                  <CopyBlock label="LinkedIn search" text={p.plan.booleanSearch} onCopy={copy} action={{ href: p.plan.linkedinUrl, label: 'Open on LinkedIn' }} />
                  <CopyBlock label="Google search for LinkedIn profiles" text={p.plan.googleXray} onCopy={copy} action={{ href: `https://www.google.com/search?q=${encodeURIComponent(p.plan.googleXray)}`, label: 'Search Google' }} />
                  <CopyBlock label="WhatsApp message" text={p.plan.whatsapp} onCopy={copy} icon={MessageCircle} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(p.plan.channels as any[]).map((c) => (
                      <div key={c.name} className="rounded-2xl border border-border p-3">
                        <p className="text-sm font-semibold text-foreground">{c.name}</p>
                        <p className="mt-0.5 text-xs text-muted">{c.tip}</p>
                      </div>
                    ))}
                  </div>
                  {p.pool?.count ? (
                    <div className="rounded-2xl border border-brand/30 bg-brand-soft/40 p-3">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Users className="h-4 w-4 text-brand" /> {p.pool.count} matching {p.pool.count === 1 ? 'profile' : 'profiles'} in the Dealo talent pool
                      </p>
                      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                        {(p.pool.profiles as any[]).map((pr, i) => (
                          <li key={i} className="rounded-xl bg-surface-elevated p-2.5 text-xs">
                            <span className="block font-semibold text-foreground">{pr.headline}</span>
                            <span className="text-muted">
                              {[pr.location, pr.yearsExperience ? `${pr.yearsExperience} yrs` : null, pr.openToWork ? 'open to work' : null].filter(Boolean).join(' · ')}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[11px] text-muted">Names and contacts stay private. Ask Dealo recruiters to introduce you.</p>
                    </div>
                  ) : null}
                  <EmailEditor subject={subject} body={body} onSubject={setSubject} onBody={setBody} disabled={!pending} hint="Saved as a template: {{firstName}} becomes each person’s first name." />
                </div>
              ) : null}

              {/* ---------------------------------------------------- follow-up */}
              {task.agent === 'follow_up' && (p.recipients as any[])?.length ? (
                <div className="space-y-3">
                  <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                    {(p.recipients as any[]).map((r) => (
                      <label key={r.applicationId} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-2.5 text-sm hover:border-brand/40">
                        <input type="checkbox" disabled={!pending} checked={selected.has(r.applicationId)} onChange={() => toggle(r.applicationId)} className="h-4 w-4 accent-[var(--brand)]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground">{r.name}</span>
                          <span className="block truncate text-xs text-muted">
                            {r.jobTitle} · {r.stage}
                          </span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                          <Clock className="h-3 w-3" /> {r.daysWaiting}d
                        </span>
                      </label>
                    ))}
                  </div>
                  <EmailEditor subject={subject} body={body} onSubject={setSubject} onBody={setBody} disabled={!pending} hint="{{firstName}}, {{jobTitle}} and {{company}} are filled in for each person." />
                </div>
              ) : null}

              {/* --------------------------------------------------- scheduling */}
              {task.agent === 'scheduling' ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted">
                    {p.name} gets a link to pick one of these {String(p.kind).toLowerCase().replace('_', ' ')} slots ({p.durationMin} min, Lagos time):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(p.slots as string[]).map((s) => (
                      <span key={s} className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-foreground">{lagosTime(s)}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* ------------------------------------------------ interview kit */}
              {task.agent === 'interview_kit' ? (
                <div className="space-y-3">
                  <p className="rounded-xl bg-surface p-3 text-xs text-muted">
                    <span className="font-semibold text-foreground">Open:</span> {p.kit.opening}
                  </p>
                  {(p.kit.competencies as any[]).map((c) => (
                    <div key={c.name} className="rounded-2xl border border-border p-3">
                      <p className="text-sm font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted">{c.why}</p>
                      <ol className="mt-2 space-y-2">
                        {(c.questions as any[]).map((q, i) => (
                          <li key={i} className="text-sm">
                            <span className="text-foreground">{q.q}</span>
                            <span className="mt-1 block text-xs text-emerald-700 dark:text-emerald-300">Good answer: {q.lookFor}</span>
                            <span className="block text-xs text-rose-700 dark:text-rose-300">Red flag: {q.redFlags}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                  <div className="overflow-x-auto rounded-2xl border border-border">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-surface text-muted">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Score</th>
                          <th className="px-3 py-2 font-semibold">1</th>
                          <th className="px-3 py-2 font-semibold">3</th>
                          <th className="px-3 py-2 font-semibold">5</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(p.kit.scorecard as any[]).map((r) => (
                          <tr key={r.criterion} className="border-t border-border align-top">
                            <td className="px-3 py-2 font-semibold text-foreground">{r.criterion}</td>
                            <td className="px-3 py-2 text-muted">{r.one}</td>
                            <td className="px-3 py-2 text-muted">{r.three}</td>
                            <td className="px-3 py-2 text-muted">{r.five}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {/* ----------------------------------------------- pipeline digest */}
              {task.agent === 'pipeline_digest' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Fact label="New since yesterday" value={p.totals.new24h} />
                    <Fact label="Waiting 3+ days" value={p.totals.unreviewed} />
                    <Fact label="Stuck 5+ days" value={p.totals.stuck} />
                    <Fact label="Interviews (48h)" value={p.totals.interviewsNext48h} />
                  </div>
                  {(p.todos as any[]).length ? (
                    <ul className="space-y-1.5">
                      {(p.todos as any[]).map((t, i) => (
                        <li key={i}>
                          <Link href={t.href} className="flex items-start gap-2 rounded-xl border border-border p-2.5 text-sm transition hover:border-brand/50">
                            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', t.priority === 'high' ? 'bg-rose-500' : t.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500')} />
                            <span className="min-w-0 flex-1 text-foreground">{t.text}</span>
                            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">Nothing needs you today. 🎉</p>
                  )}
                </div>
              ) : null}

              <p className="flex items-center gap-1.5 text-[11px] text-muted">
                {task.provider === 'gemini' ? <Sparkles className="h-3.5 w-3.5 text-brand" /> : <Cpu className="h-3.5 w-3.5" />}
                {task.provider === 'gemini' ? 'Written by AI, checked by Dealo rules.' : 'Made with Dealo’s built-in rules.'} {AGENT_CATALOG[task.agent].approval}.
              </p>

              {pending ? (
                <div className="flex flex-col-reverse gap-2 min-[400px]:flex-row min-[400px]:justify-end">
                  <button type="button" className="btn-secondary text-sm" disabled={busy !== null} onClick={() => void decide('DISMISS')}>
                    {busy === 'DISMISS' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Dismiss
                  </button>
                  <button
                    type="button"
                    className="btn-primary text-sm"
                    disabled={busy !== null || (people.length > 0 && selected.size === 0)}
                    onClick={() => void decide('APPROVE')}
                  >
                    {busy === 'APPROVE' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {approveLabel}
                  </button>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}

function ScoreRing({ score }: { score: number | null }) {
  const value = score ?? 0;
  const tone = score === null ? 'stroke-border' : value >= 75 ? 'stroke-emerald-500' : value >= 55 ? 'stroke-amber-500' : 'stroke-rose-500';
  return (
    <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center" aria-label={score === null ? 'Not scored yet' : `Score ${value}`}>
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
        <circle cx="18" cy="18" r="15.5" className="fill-none stroke-border/60" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.5" className={cn('fill-none transition-all', tone)} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(value / 100) * 97.4} 97.4`} />
      </svg>
      <span className="text-xs font-bold tabular-nums text-foreground">{score === null ? '…' : value}</span>
    </span>
  );
}

function Fact({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-0.5 font-display text-lg tabular-nums text-foreground">{value}</p>
      {note ? <p className="mt-0.5 line-clamp-3 text-[11px] text-muted">{note}</p> : null}
    </div>
  );
}

function CopyBlock({
  label,
  text,
  onCopy,
  action,
  icon: Icon = Copy,
}: {
  label: string;
  text: string;
  onCopy: (text: string, what: string) => void;
  action?: { href: string; label: string };
  icon?: typeof Copy;
}) {
  return (
    <div className="rounded-2xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <div className="flex shrink-0 gap-1">
          {action ? (
            <a href={action.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-muted hover:text-brand">
              <ExternalLink className="h-3 w-3" /> <span className="hidden min-[400px]:inline">{action.label}</span>
            </a>
          ) : null}
          <button type="button" onClick={() => onCopy(text, label)} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-muted hover:text-brand">
            <Icon className="h-3 w-3" /> Copy
          </button>
        </div>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-muted">{text}</p>
    </div>
  );
}

function EmailEditor({
  subject,
  body,
  onSubject,
  onBody,
  disabled,
  hint,
}: {
  subject: string;
  body: string;
  onSubject: (v: string) => void;
  onBody: (v: string) => void;
  disabled: boolean;
  hint: string;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-border p-3">
      <p className="text-xs font-semibold text-foreground">Email</p>
      <input className="input-field text-sm" value={subject} disabled={disabled} onChange={(e) => onSubject(e.target.value)} maxLength={160} aria-label="Subject" />
      <textarea className="input-field min-h-[9rem] text-sm" value={body} disabled={disabled} onChange={(e) => onBody(e.target.value)} maxLength={5000} aria-label="Message" />
      <p className="text-[11px] text-muted">{hint}</p>
    </div>
  );
}
