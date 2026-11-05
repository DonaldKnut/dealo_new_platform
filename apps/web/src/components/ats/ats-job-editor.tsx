'use client';

import { DEFAULT_JOB_STAGES, EMPLOYMENT_TYPES, jobInputSchema, type JobInput } from '@dealo/shared';
import { AnimatePresence, Reorder, motion } from 'framer-motion';
import { ArrowLeft, Bold, GripVertical, List, Loader2, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useAtsWorkspace } from '@/components/ats/ats-workspace';
import { JobDescription } from '@/components/ats/job-description';
import { FormField } from '@/components/forms/form-field';
import { DashPanel } from '@/components/dashboard/dashboard-ui';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { EMPLOYMENT_LABEL, atsApi, type AtsJob } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

type Draft = {
  title: string;
  roleFamily: JobInput['roleFamily'];
  location: string;
  workArrangement: JobInput['workArrangement'];
  employmentType: JobInput['employmentType'];
  salaryMin: string;
  salaryMax: string;
  currency: string;
  description: string;
  mustHaves: string[];
  stages: string[];
  hiringManagerIds: string[];
};

const EMPTY: Draft = {
  title: '',
  roleFamily: 'OFFICE_PROFESSIONAL',
  location: '',
  workArrangement: 'ONSITE',
  employmentType: 'FULL_TIME',
  salaryMin: '',
  salaryMax: '',
  currency: 'NGN',
  description: '',
  mustHaves: [],
  stages: DEFAULT_JOB_STAGES.filter((s) => s !== 'Hired'),
  hiringManagerIds: [],
};

const fromJob = (job: AtsJob): Draft => ({
  title: job.title,
  roleFamily: job.roleFamily,
  location: job.location,
  workArrangement: job.workArrangement,
  employmentType: job.employmentType as Draft['employmentType'],
  salaryMin: job.salaryMinMinor ? String(job.salaryMinMinor / 100) : '',
  salaryMax: job.salaryMaxMinor ? String(job.salaryMaxMinor / 100) : '',
  currency: job.currency,
  description: job.description,
  mustHaves: job.mustHaves,
  stages: job.stages.filter((s) => s !== 'Hired'),
  hiringManagerIds: job.hiringManagerIds,
});

export function AtsJobEditor({ jobId }: { jobId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const { orgId, current, reloadDetail } = useAtsWorkspace();
  const [draft, setDraft] = useState<Draft | null>(jobId ? null : EMPTY);
  const [mustHave, setMustHave] = useState('');
  const [newStage, setNewStage] = useState('');
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState<false | 'draft' | 'publish'>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AtsJob['status']>('DRAFT');
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!jobId || !orgId) return;
    atsApi
      .job(orgId, jobId)
      .then((job) => {
        setDraft(fromJob(job));
        setStatus(job.status);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the job'));
  }, [jobId, orgId]);

  if (!draft) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-muted">
        {error ? <p className="text-sm text-danger">{error}</p> : <Loader2 className="h-5 w-5 animate-spin" />}
      </div>
    );
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  const wrap = (kind: 'bold' | 'list') => {
    const el = textRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end);
    const insert =
      kind === 'bold'
        ? `**${selected || 'bold text'}**`
        : (selected || 'First point\nSecond point')
            .split('\n')
            .map((line) => `- ${line.replace(/^\s*[-*•]\s+/, '')}`)
            .join('\n');
    const before = value.slice(0, start);
    const pad = kind === 'list' && before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    set('description', `${before}${pad}${insert}${value.slice(end)}`);
    requestAnimationFrame(() => el.focus());
  };

  const addMustHave = () => {
    const value = mustHave.trim();
    if (value.length < 2 || draft.mustHaves.includes(value) || draft.mustHaves.length >= 12) return;
    set('mustHaves', [...draft.mustHaves, value]);
    setMustHave('');
  };

  const addStage = () => {
    const value = newStage.trim();
    if (value.length < 2 || value.toLowerCase() === 'hired' || draft.stages.includes(value) || draft.stages.length >= 9) return;
    set('stages', [...draft.stages, value]);
    setNewStage('');
  };

  const save = async (publish: boolean) => {
    if (!orgId) return;
    setError(null);
    const toMinor = (v: string) => (v.trim() ? Math.round(Number(v.replace(/,/g, '')) * 100) : null);
    const parsed = jobInputSchema.safeParse({
      title: draft.title,
      roleFamily: draft.roleFamily,
      location: draft.location,
      workArrangement: draft.workArrangement,
      employmentType: draft.employmentType,
      salaryMinMinor: toMinor(draft.salaryMin),
      salaryMaxMinor: toMinor(draft.salaryMax),
      currency: draft.currency,
      description: draft.description,
      mustHaves: draft.mustHaves,
      stages: [...draft.stages, 'Hired'],
      hiringManagerIds: draft.hiringManagerIds,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form');
      return;
    }
    setSaving(publish ? 'publish' : 'draft');
    try {
      const job = jobId ? await atsApi.updateJob(orgId, jobId, parsed.data) : await atsApi.createJob(orgId, parsed.data);
      if (publish && job.status !== 'OPEN') await atsApi.setJobStatus(orgId, job.id, 'OPEN');
      await reloadDetail();
      toast.success(publish ? 'Job is live' : 'Saved', publish ? 'Share the apply link to start getting applicants.' : undefined);
      router.push(`/dashboard/ats/jobs/${job.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the job');
    } finally {
      setSaving(false);
    }
  };

  const managers = current?.members ?? [];

  return (
    <div className="space-y-4">
      <Link href={jobId ? `/dashboard/ats/jobs/${jobId}` : '/dashboard/ats'} className="inline-flex items-center gap-1 text-sm text-muted hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <DashPanel title={jobId ? 'Edit job' : 'New job'}>
          <div className="space-y-4">
            <FormField label="Job title">
              <input className="input-field" value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="Site electrician" maxLength={140} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Type of role">
                <select className="input-field" value={draft.roleFamily} onChange={(e) => set('roleFamily', e.target.value as Draft['roleFamily'])}>
                  <option value="OFFICE_PROFESSIONAL">Office role</option>
                  <option value="SKILLED_TRADE">Skilled trade</option>
                </select>
              </FormField>
              <FormField label="Contract">
                <select className="input-field" value={draft.employmentType} onChange={(e) => set('employmentType', e.target.value as Draft['employmentType'])}>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {EMPLOYMENT_LABEL[t]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Location">
                <input className="input-field" value={draft.location} onChange={(e) => set('location', e.target.value)} placeholder="Lekki, Lagos" />
              </FormField>
              <FormField label="Where they work">
                <select className="input-field" value={draft.workArrangement} onChange={(e) => set('workArrangement', e.target.value as Draft['workArrangement'])}>
                  <option value="ONSITE">On site</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="REMOTE">Remote</option>
                </select>
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem]">
              <FormField label="Lowest pay" optional help="Monthly pay in naira (or the currency you pick). Showing pay gets more applicants.">
                <input className="input-field" inputMode="numeric" value={draft.salaryMin} onChange={(e) => set('salaryMin', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="250,000" />
              </FormField>
              <FormField label="Highest pay" optional>
                <input className="input-field" inputMode="numeric" value={draft.salaryMax} onChange={(e) => set('salaryMax', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="400,000" />
              </FormField>
              <FormField label="Currency">
                <select className="input-field" value={draft.currency} onChange={(e) => set('currency', e.target.value)}>
                  {['NGN', 'GHS', 'KES', 'ZAR', 'USD', 'GBP', 'EUR'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField
              label="Job description"
              help="What the person will do, who they work with, and what you offer. Use the buttons for bold text and bullet points."
            >
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="flex flex-wrap items-center gap-1 border-b border-border bg-surface/60 px-2 py-1.5">
                  <ToolbarButton label="Bold" onClick={() => wrap('bold')}>
                    <Bold className="h-3.5 w-3.5" />
                  </ToolbarButton>
                  <ToolbarButton label="Bullet list" onClick={() => wrap('list')}>
                    <List className="h-3.5 w-3.5" />
                  </ToolbarButton>
                  <span className="flex-1" />
                  <button type="button" onClick={() => setPreview((p) => !p)} className="rounded-full px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-soft">
                    {preview ? 'Write' : 'Preview'}
                  </button>
                </div>
                {preview ? (
                  <div className="min-h-[14rem] p-3">
                    <JobDescription text={draft.description || 'Nothing written yet.'} />
                  </div>
                ) : (
                  <textarea
                    ref={textRef}
                    className="block min-h-[14rem] w-full resize-y bg-transparent p-3 text-sm leading-relaxed text-foreground outline-none"
                    value={draft.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder={'About the job\n\nWhat you will do\n- Install and test wiring on new sites\n- Keep the site safe\n\nWhat we offer\n- Monthly pay and transport allowance'}
                    maxLength={20000}
                  />
                )}
              </div>
            </FormField>

            <FormField label="Must-haves" help="Short items the AI checks each CV against, e.g. 'COREN licence' or '3 years in solar'. Up to 12.">
              <div className="flex flex-col gap-2 min-[340px]:flex-row">
                <input
                  className="input-field"
                  value={mustHave}
                  onChange={(e) => setMustHave(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addMustHave();
                    }
                  }}
                  placeholder="3 years wiring commercial buildings"
                  maxLength={120}
                />
                <button type="button" className="btn-secondary shrink-0 text-sm" onClick={addMustHave}>
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <AnimatePresence>
                  {draft.mustHaves.map((item) => (
                    <motion.span
                      key={item}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand"
                    >
                      <span className="min-w-0 break-words">{item}</span>
                      <button type="button" aria-label={`Remove ${item}`} onClick={() => set('mustHaves', draft.mustHaves.filter((m) => m !== item))}>
                        <X className="h-3 w-3" />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </FormField>
          </div>
        </DashPanel>

        <div className="space-y-4">
          <DashPanel title="Hiring steps">
            <p className="mb-3 text-xs leading-relaxed text-muted">Drag to reorder. Everyone starts in the first step. &ldquo;Hired&rdquo; is always last.</p>
            <Reorder.Group axis="y" values={draft.stages} onReorder={(stages) => set('stages', stages)} className="space-y-1.5">
              {draft.stages.map((stage) => (
                <Reorder.Item
                  key={stage}
                  value={stage}
                  className="flex cursor-grab items-center gap-2 rounded-xl border border-border bg-surface-elevated px-2.5 py-2 text-sm active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate">{stage}</span>
                  {draft.stages.length > 1 ? (
                    <button type="button" aria-label={`Remove ${stage}`} onClick={() => set('stages', draft.stages.filter((s) => s !== stage))} className="text-muted hover:text-danger">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </Reorder.Item>
              ))}
            </Reorder.Group>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-dashed border-border px-2.5 py-2 text-sm text-muted">
              <span className="h-4 w-4 shrink-0" />
              Hired
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className="input-field"
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addStage();
                  }
                }}
                placeholder="Trade test"
                maxLength={40}
              />
              <button type="button" aria-label="Add step" className="btn-secondary shrink-0 px-3" onClick={addStage}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </DashPanel>

          {managers.length > 1 ? (
            <DashPanel title="Hiring managers">
              <p className="mb-3 text-xs text-muted">Hiring managers only see the jobs you add them to.</p>
              <div className="space-y-1">
                {managers.map((m) => {
                  const on = draft.hiringManagerIds.includes(m.userId);
                  return (
                    <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          set('hiringManagerIds', on ? draft.hiringManagerIds.filter((id) => id !== m.userId) : [...draft.hiringManagerIds, m.userId])
                        }
                        className="accent-[var(--brand)]"
                      />
                      <span className="min-w-0 flex-1 truncate">{m.name}</span>
                    </label>
                  );
                })}
              </div>
            </DashPanel>
          ) : null}

          <DashPanel>
            {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
            <div className="grid gap-2">
              {status !== 'OPEN' ? (
                <button type="button" className="btn-primary w-full" disabled={Boolean(saving)} onClick={() => save(true)}>
                  {saving === 'publish' ? 'Publishing…' : 'Save and publish'}
                </button>
              ) : null}
              <button type="button" className={cn(status === 'OPEN' ? 'btn-primary' : 'btn-secondary', 'w-full')} disabled={Boolean(saving)} onClick={() => save(false)}>
                {saving === 'draft' ? 'Saving…' : status === 'OPEN' ? 'Save changes' : 'Save as draft'}
              </button>
            </div>
          </DashPanel>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-brand-soft hover:text-brand"
    >
      {children}
    </button>
  );
}
