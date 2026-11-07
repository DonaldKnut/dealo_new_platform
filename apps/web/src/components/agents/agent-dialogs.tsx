'use client';

import { AGENT_CATALOG, AGENT_LIMIT_REACHED, type AgentTask, type HiringAgentId } from '@dealo/shared';
import { Loader2, Play, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { FormField } from '@/components/forms/form-field';
import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import { agentsApi } from '@/lib/agents-api';
import { ApiError } from '@/lib/api';
import { atsApi, type AtsJob, type ApplicationCard } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

import { AGENT_LOOK } from './agent-meta';

export function isLimitError(err: unknown) {
  return err instanceof ApiError && (err.details as { code?: string } | undefined)?.code === AGENT_LIMIT_REACHED;
}

// ------------------------------------------------------------------- run

export function RunAgentModal({
  orgId,
  agent,
  onClose,
  onDone,
  onLimit,
}: {
  orgId: string;
  agent: HiringAgentId | null;
  onClose: () => void;
  onDone: (task: AgentTask) => void;
  onLimit: () => void;
}) {
  const toast = useToast();
  const [jobs, setJobs] = useState<AtsJob[] | null>(null);
  const [jobId, setJobId] = useState('');
  const [people, setPeople] = useState<ApplicationCard[] | null>(null);
  const [applicationId, setApplicationId] = useState('');
  const [brief, setBrief] = useState({ title: '', notes: '', location: '', employmentType: 'FULL_TIME', workArrangement: 'ONSITE' as 'ONSITE' | 'HYBRID' | 'REMOTE' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!agent) return;
    setJobId('');
    setApplicationId('');
    setPeople(null);
    atsApi
      .jobs(orgId)
      .then((list) => setJobs(list.filter((j) => j.status !== 'CLOSED')))
      .catch(() => setJobs([]));
  }, [agent, orgId]);

  useEffect(() => {
    if (agent !== 'scheduling' || !jobId) return;
    setPeople(null);
    atsApi
      .board(orgId, jobId)
      .then((b) => setPeople(b.applications))
      .catch(() => setPeople([]));
  }, [agent, jobId, orgId]);

  if (!agent) return null;
  const meta = AGENT_CATALOG[agent];
  const look = AGENT_LOOK[agent];
  const needsJob = meta.needsJob || agent === 'scheduling';
  const canRun = agent === 'job_post' ? brief.title.trim().length >= 2 : agent === 'scheduling' ? Boolean(applicationId) : needsJob ? Boolean(jobId) : true;

  const run = async () => {
    setBusy(true);
    try {
      const task = await agentsApi.run(orgId, agent, {
        ...(jobId ? { jobId } : {}),
        ...(agent === 'scheduling' ? { applicationId } : {}),
        ...(agent === 'job_post' ? { brief } : {}),
      });
      onDone(task);
      toast.success(`${meta.name} finished`, task.status === 'PENDING' ? 'Review it in your inbox.' : task.summary);
    } catch (err) {
      if (isLimitError(err)) onLimit();
      else toast.error('The agent could not finish', err instanceof ApiError ? err.message : '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal
      open
      onClose={onClose}
      icon={look.icon}
      title={`Run the ${meta.name.toLowerCase()}`}
      description={meta.description}
      footer={
        <button type="button" className="btn-primary w-full min-[340px]:w-auto" disabled={!canRun || busy} onClick={() => void run()}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Working…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Run now
            </>
          )}
        </button>
      }
    >
      <div className="space-y-4">
        {agent === 'job_post' ? (
          <>
            <FormField label="Job title">
              <input className="input-field" value={brief.title} maxLength={140} placeholder="e.g. Customer Service Lead" onChange={(e) => setBrief((b) => ({ ...b, title: e.target.value }))} />
            </FormField>
            <FormField label="Notes for the agent" optional hint="Duties, must-haves, pay, hours, anything special. Rough notes are fine.">
              <textarea
                className="input-field min-h-[7rem]"
                value={brief.notes}
                maxLength={3000}
                placeholder={'- Handles 60+ calls a day\n- 2 years in fintech support\n- Shift work, Ikeja office'}
                onChange={(e) => setBrief((b) => ({ ...b, notes: e.target.value }))}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Location" optional>
                <input className="input-field" value={brief.location} maxLength={140} placeholder="Ikeja, Lagos" onChange={(e) => setBrief((b) => ({ ...b, location: e.target.value }))} />
              </FormField>
              <FormField label="Type">
                <select className="input-field" value={brief.employmentType} onChange={(e) => setBrief((b) => ({ ...b, employmentType: e.target.value }))}>
                  <option value="FULL_TIME">Full-time</option>
                  <option value="PART_TIME">Part-time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="TEMPORARY">Temporary</option>
                  <option value="INTERNSHIP">Internship</option>
                </select>
              </FormField>
              <FormField label="Work style">
                <select className="input-field" value={brief.workArrangement} onChange={(e) => setBrief((b) => ({ ...b, workArrangement: e.target.value as typeof b.workArrangement }))}>
                  <option value="ONSITE">On-site</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="REMOTE">Remote</option>
                </select>
              </FormField>
            </div>
            {jobs?.length ? (
              <FormField label="Improve an existing job instead" optional>
                <select className="input-field" value={jobId} onChange={(e) => setJobId(e.target.value)}>
                  <option value="">No, write a new job</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : null}
          </>
        ) : null}

        {agent !== 'job_post' && agent !== 'pipeline_digest' ? (
          <FormField label={needsJob ? 'Job' : 'Job'} optional={!needsJob} hint={!needsJob ? 'Leave empty to check every job.' : undefined}>
            {jobs === null ? (
              <div className="h-11 animate-pulse rounded-xl bg-surface" />
            ) : jobs.length ? (
              <select className="input-field" value={jobId} onChange={(e) => setJobId(e.target.value)}>
                <option value="">{needsJob ? 'Choose a job…' : 'All jobs'}</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted">Create a job first.</p>
            )}
          </FormField>
        ) : null}

        {agent === 'scheduling' && jobId ? (
          <FormField label="Applicant">
            {people === null ? (
              <div className="h-11 animate-pulse rounded-xl bg-surface" />
            ) : people.length ? (
              <select className="input-field" value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
                <option value="">Choose who to invite…</option>
                {people.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.stage}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted">No active applicants for this job.</p>
            )}
          </FormField>
        ) : null}

        {agent === 'pipeline_digest' ? <p className="text-sm text-muted">Checks every open job now and writes today’s briefing. It does not change anything.</p> : null}

        <div className={cn('rounded-2xl p-3 text-xs', look.tint)}>
          <span className={cn('font-semibold', look.text)}>Output:</span> <span className="text-foreground">{meta.output}.</span>{' '}
          <span className="text-muted">{meta.approval}.</span>
        </div>
      </div>
    </FormModal>
  );
}

// -------------------------------------------------------------- settings

type Field =
  | { key: string; label: string; type: 'toggle'; hint?: string }
  | { key: string; label: string; type: 'number'; min: number; max: number; suffix?: string; hint?: string }
  | { key: string; label: string; type: 'select'; options: Array<{ value: string; label: string }>; hint?: string }
  | { key: string; label: string; type: 'text'; hint?: string };

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6).map((h) => ({ value: String(h), label: `${String(h).padStart(2, '0')}:00` }));

const FIELDS: Record<HiringAgentId, Field[]> = {
  screening: [
    { key: 'autoRun', label: 'Refresh the shortlist each time someone applies', type: 'toggle' },
    { key: 'shortlistSize', label: 'Shortlist size', type: 'number', min: 3, max: 20, suffix: 'people' },
    { key: 'minScore', label: 'Lowest score to shortlist', type: 'number', min: 0, max: 100, suffix: '/ 100' },
  ],
  job_post: [{ key: 'tone', label: 'Writing tone', type: 'select', options: [{ value: 'friendly', label: 'Friendly' }, { value: 'formal', label: 'Formal' }] }],
  sourcing: [],
  follow_up: [
    { key: 'idleDays', label: 'Follow up after', type: 'number', min: 2, max: 30, suffix: 'days in one stage' },
    { key: 'hour', label: 'Check every morning at (Lagos)', type: 'select', options: HOURS },
  ],
  scheduling: [
    { key: 'interviewStage', label: 'Stage that means “interview”', type: 'text', hint: 'When someone is moved to this stage, the agent prepares an invite.' },
    { key: 'kind', label: 'Interview type', type: 'select', options: [{ value: 'VIDEO', label: 'Video call' }, { value: 'PHONE', label: 'Phone call' }, { value: 'IN_PERSON', label: 'In person' }] },
    { key: 'durationMin', label: 'Length', type: 'number', min: 15, max: 120, suffix: 'minutes' },
    { key: 'slots', label: 'Times to offer', type: 'number', min: 2, max: 5, suffix: 'options' },
    { key: 'autoSend', label: 'Send the invite by itself (skip approval)', type: 'toggle', hint: 'The candidate is emailed straight away when moved to the interview stage.' },
  ],
  interview_kit: [{ key: 'questionCount', label: 'Number of questions', type: 'number', min: 4, max: 15 }],
  pipeline_digest: [
    { key: 'hour', label: 'Send the briefing at (Lagos)', type: 'select', options: HOURS },
    { key: 'emailTeam', label: 'Email it to owners, admins and recruiters', type: 'toggle' },
  ],
};

export function AgentSettingsModal({
  orgId,
  agent,
  config,
  onClose,
  onSaved,
}: {
  orgId: string;
  agent: HiringAgentId | null;
  config: Record<string, unknown>;
  onClose: () => void;
  onSaved: (config: Record<string, unknown>) => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<Record<string, unknown>>(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(config), [config, agent]);
  if (!agent) return null;
  const fields = FIELDS[agent];

  const save = async () => {
    setSaving(true);
    try {
      const result = await agentsApi.update(orgId, agent, { config: draft });
      onSaved(result.config);
      toast.success('Settings saved');
      onClose();
    } catch (err) {
      toast.error('Could not save', err instanceof ApiError ? err.message : '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      open
      onClose={onClose}
      icon={Settings2}
      title={`${AGENT_CATALOG[agent].name} settings`}
      size="sm"
      mobile="auto"
      footer={
        fields.length ? (
          <button type="button" className="btn-primary w-full min-[340px]:w-auto" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
          </button>
        ) : undefined
      }
    >
      {fields.length ? (
        <div className="space-y-4">
          {fields.map((field) =>
            field.type === 'toggle' ? (
              <label key={field.key} className="flex cursor-pointer items-start justify-between gap-3">
                <span>
                  <span className="block text-sm font-medium text-foreground">{field.label}</span>
                  {field.hint ? <span className="block text-xs text-muted">{field.hint}</span> : null}
                </span>
                <Switch checked={Boolean(draft[field.key])} onChange={(v) => setDraft((d) => ({ ...d, [field.key]: v }))} label={field.label} />
              </label>
            ) : (
              <FormField key={field.key} label={field.label} hint={field.hint}>
                {field.type === 'number' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="input-field w-28"
                      min={field.min}
                      max={field.max}
                      value={String(draft[field.key] ?? '')}
                      onChange={(e) => setDraft((d) => ({ ...d, [field.key]: Number(e.target.value) }))}
                    />
                    {field.suffix ? <span className="text-sm text-muted">{field.suffix}</span> : null}
                  </div>
                ) : field.type === 'select' ? (
                  <select className="input-field" value={String(draft[field.key] ?? '')} onChange={(e) => setDraft((d) => ({ ...d, [field.key]: /^\d+$/.test(e.target.value) ? Number(e.target.value) : e.target.value }))}>
                    {field.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input className="input-field" value={String(draft[field.key] ?? '')} maxLength={40} onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))} />
                )}
              </FormField>
            ),
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">This agent works from the job you pick each time, so there is nothing to set up.</p>
      )}
    </FormModal>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50', checked ? 'bg-brand' : 'bg-border')}
    >
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}
