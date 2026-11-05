'use client';

import { motion } from 'framer-motion';
import { Copy, Link2, MapPin, MoreHorizontal, Pause, Pencil, Play, Plus, Users, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AtsLimitBanner } from '@/components/ats/ats-usage';
import { useAtsWorkspace } from '@/components/ats/ats-workspace';
import { DashPanel, StatusChip } from '@/components/dashboard/dashboard-ui';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { ARRANGEMENT_LABEL, atsApi, canManage, formatPay, type AtsJob, type JobStatus } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

const FILTERS: Array<{ id: 'ALL' | JobStatus; label: string }> = [
  { id: 'OPEN', label: 'Open' },
  { id: 'DRAFT', label: 'Drafts' },
  { id: 'PAUSED', label: 'Paused' },
  { id: 'CLOSED', label: 'Closed' },
  { id: 'ALL', label: 'All' },
];

export function AtsJobsPanel() {
  const toast = useToast();
  const { orgId, current, reloadDetail } = useAtsWorkspace();
  const [jobs, setJobs] = useState<AtsJob[] | null>(null);
  const [filter, setFilter] = useState<'ALL' | JobStatus>('OPEN');
  const [menuJob, setMenuJob] = useState<AtsJob | null>(null);
  const manage = canManage(current?.myRole);

  const load = useCallback(async () => {
    if (!orgId) return;
    try {
      const list = await atsApi.jobs(orgId);
      setJobs(list);
      setFilter((f) => (f === 'OPEN' && !list.some((j) => j.status === 'OPEN') && list.length ? 'ALL' : f));
    } catch (err) {
      toast.error('Could not load jobs', err instanceof Error ? err.message : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => (jobs ?? []).filter((job) => filter === 'ALL' || job.status === filter), [jobs, filter]);

  const run = async (label: string, action: () => Promise<unknown>) => {
    setMenuJob(null);
    try {
      await action();
      toast.success(label);
      await Promise.all([load(), reloadDetail()]);
    } catch (err) {
      toast.error('That did not work', err instanceof ApiError ? err.message : '');
    }
  };

  const copyLink = async (job: AtsJob) => {
    const url = `${window.location.origin}/careers/${current?.workspace.slug}/${job.slug}`;
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setMenuJob(null);
    toast.success('Link copied', 'Share it on WhatsApp, LinkedIn or your website.');
  };

  return (
    <div className="space-y-4">
      {current ? <AtsLimitBanner detail={current} /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {FILTERS.map((f) => {
            const count = f.id === 'ALL' ? jobs?.length ?? 0 : (jobs ?? []).filter((j) => j.status === f.id).length;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  filter === f.id ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted hover:text-foreground',
                )}
              >
                {f.label} <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        {manage ? (
          <Link href="/dashboard/ats/jobs/new" className="btn-primary w-full text-sm sm:w-auto">
            <Plus className="h-4 w-4" /> New job
          </Link>
        ) : null}
      </div>

      {jobs === null ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="dash-panel h-40 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <DashPanel>
          <div className="py-6 text-center">
            <p className="font-display text-xl text-foreground">{jobs.length ? 'Nothing here' : 'Post your first job'}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              {jobs.length
                ? 'Try another filter.'
                : 'Write the job once. Dealo gives you a careers page link to share, collects CVs, and screens each applicant with AI.'}
            </p>
            {!jobs.length && manage ? (
              <Link href="/dashboard/ats/jobs/new" className="btn-primary mt-4 inline-flex text-sm">
                <Plus className="h-4 w-4" /> New job
              </Link>
            ) : null}
          </div>
        </DashPanel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((job, index) => {
            const total = job.pipeline?.reduce((sum, s) => sum + s.count, 0) ?? 0;
            const pay = formatPay(job);
            return (
              <motion.article
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="dash-panel group relative flex min-w-0 flex-col gap-3 p-4 transition hover:border-brand/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/dashboard/ats/jobs/${job.id}`} className="min-w-0 flex-1">
                    <h3 className="break-words font-display text-lg leading-snug text-foreground group-hover:text-brand">{job.title}</h3>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                      <span>· {ARRANGEMENT_LABEL[job.workArrangement]}</span>
                      {pay ? <span>· {pay}</span> : null}
                    </p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <StatusChip status={job.status} />
                    {manage ? (
                      <button
                        type="button"
                        aria-label="Job actions"
                        onClick={() => setMenuJob(job)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition hover:border-brand hover:text-brand"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <Link href={`/dashboard/ats/jobs/${job.id}`} className="block">
                  <div className="flex h-2 overflow-hidden rounded-full bg-border/60">
                    {total
                      ? job.pipeline?.map((s, i) =>
                          s.count ? (
                            <span
                              key={s.stage}
                              title={`${s.stage}: ${s.count}`}
                              className="h-full bg-brand"
                              style={{ width: `${(s.count / total) * 100}%`, opacity: 0.35 + (0.65 * (i + 1)) / (job.pipeline?.length ?? 1) }}
                            />
                          ) : null,
                        )
                      : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                    {job.pipeline?.map((s) => (
                      <span key={s.stage}>
                        {s.stage} <strong className="tabular-nums text-foreground">{s.count}</strong>
                      </span>
                    ))}
                  </div>
                </Link>
                <p className="inline-flex items-center gap-1 text-xs text-muted">
                  <Users className="h-3.5 w-3.5" /> {job.totalApplications ?? 0} applied in total
                </p>
              </motion.article>
            );
          })}
        </div>
      )}

      <BottomSheet open={Boolean(menuJob)} onClose={() => setMenuJob(null)} title={menuJob?.title}>
        {menuJob && orgId ? (
          <div className="grid gap-1 py-2">
            <SheetAction icon={Pencil} label="Edit job" href={`/dashboard/ats/jobs/${menuJob.id}/edit`} />
            {menuJob.status !== 'OPEN' ? (
              <SheetAction
                icon={Play}
                label={menuJob.status === 'DRAFT' ? 'Publish job' : 'Re-open job'}
                onClick={() => run('Job is live', () => atsApi.setJobStatus(orgId, menuJob.id, 'OPEN'))}
              />
            ) : (
              <>
                <SheetAction icon={Link2} label="Copy apply link" onClick={() => copyLink(menuJob)} />
                <SheetAction icon={Pause} label="Pause (stop new applicants)" onClick={() => run('Job paused', () => atsApi.setJobStatus(orgId, menuJob.id, 'PAUSED'))} />
              </>
            )}
            {menuJob.status !== 'CLOSED' ? (
              <SheetAction icon={XCircle} label="Close job" onClick={() => run('Job closed', () => atsApi.setJobStatus(orgId, menuJob.id, 'CLOSED'))} />
            ) : null}
            <SheetAction icon={Copy} label="Duplicate" onClick={() => run('Copy created as a draft', () => atsApi.duplicateJob(orgId, menuJob.id))} />
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}

function SheetAction({
  icon: Icon,
  label,
  onClick,
  href,
}: {
  icon: typeof Pencil;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const className =
    'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground transition hover:bg-surface';
  if (href) {
    return (
      <Link href={href} className={className}>
        <Icon className="h-4 w-4 text-brand" /> {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      <Icon className="h-4 w-4 text-brand" /> {label}
    </button>
  );
}
