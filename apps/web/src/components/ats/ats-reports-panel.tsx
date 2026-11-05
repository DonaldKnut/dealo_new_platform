'use client';

import { motion } from 'framer-motion';
import { Clock, Handshake, Loader2, Sparkles, UserCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAtsWorkspace } from '@/components/ats/ats-workspace';
import { DashKpi, DashPanel, StatusChip } from '@/components/dashboard/dashboard-ui';
import { atsApi, canManage, type AtsReport } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

const RANGES = [30, 90, 180, 365];

export function AtsReportsPanel() {
  const { orgId, current } = useAtsWorkspace();
  const [days, setDays] = useState(90);
  const [report, setReport] = useState<AtsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !canManage(current?.myRole)) return;
    setReport(null);
    atsApi
      .reports(orgId, days)
      .then(setReport)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load reports'));
  }, [orgId, days, current?.myRole]);

  if (!canManage(current?.myRole)) {
    return (
      <DashPanel>
        <p className="text-sm text-muted">Reports are for recruiters, admins and owners.</p>
      </DashPanel>
    );
  }
  if (error) return <p className="text-sm text-danger">{error}</p>;

  const maxFunnel = Math.max(1, report?.funnel[0]?.count ?? 1);
  const maxWeek = Math.max(1, ...(report?.weekly.map((w) => w.applications) ?? [1]));
  const maxSource = Math.max(1, ...(report?.sources.map((s) => s.applied) ?? [1]));

  return (
    <div className="space-y-4">
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setDays(r)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
              days === r ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted hover:text-foreground',
            )}
          >
            Last {r === 365 ? 'year' : `${r} days`}
          </button>
        ))}
      </div>

      {!report ? (
        <div className="flex min-h-[30vh] items-center justify-center text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 min-[400px]:grid-cols-2 xl:grid-cols-4">
            <DashKpi label="Applied" value={String(report.totals.applications)} hint={`${report.totals.inProgress} still in progress`} icon={Users} />
            <DashKpi label="Hired" value={String(report.totals.hired)} hint={`${report.totals.rejected} not moved forward`} icon={UserCheck} delay={0.05} />
            <DashKpi
              label="Time to hire"
              value={report.timeToHire.averageDays === null ? '—' : `${report.timeToHire.averageDays}d`}
              hint={report.timeToHire.medianDays === null ? 'No hires yet in this period' : `Middle value ${report.timeToHire.medianDays} days`}
              icon={Clock}
              delay={0.1}
            />
            <DashKpi
              label="Offers accepted"
              value={report.offers.sent ? `${Math.round((report.offers.accepted / report.offers.sent) * 100)}%` : '—'}
              hint={`${report.offers.accepted} of ${report.offers.sent} offers`}
              icon={Handshake}
              delay={0.15}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DashPanel title="Hiring funnel">
              <ul className="space-y-2.5">
                {report.funnel.map((step, index) => {
                  const pct = Math.round((step.count / maxFunnel) * 100);
                  const fromPrev = index > 0 && report.funnel[index - 1].count ? Math.round((step.count / report.funnel[index - 1].count) * 100) : null;
                  return (
                    <li key={step.step}>
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-xs">
                        <span className="font-semibold text-foreground">{step.step}</span>
                        <span className="tabular-nums text-muted">
                          {step.count}
                          {fromPrev !== null ? ` · ${fromPrev}% of previous` : ''}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-border/50">
                        <motion.div
                          className="h-full rounded-full bg-brand"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: index * 0.08 }}
                          style={{ opacity: 1 - index * 0.12 }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </DashPanel>

            <DashPanel title="Applications per week">
              <div className="flex h-40 items-end gap-1">
                {report.weekly.map((week, index) => (
                  <div key={week.weekStart} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`Week of ${week.weekStart}: ${week.applications}`}>
                    <span className="text-[10px] tabular-nums text-muted">{week.applications || ''}</span>
                    <motion.div
                      className="w-full rounded-t-md bg-brand/80"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(2, (week.applications / maxWeek) * 120)}px` }}
                      transition={{ duration: 0.5, delay: index * 0.03 }}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted">Each bar is one week. Most recent on the right.</p>
            </DashPanel>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <DashPanel title="Where people come from">
              {report.sources.length === 0 ? <p className="text-sm text-muted">No applications yet.</p> : null}
              <ul className="space-y-2.5">
                {report.sources.map((s) => (
                  <li key={s.source}>
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-xs">
                      <span className="font-semibold capitalize text-foreground">{s.source === 'careers' ? 'Careers page' : s.source.replace(/-/g, ' ')}</span>
                      <span className="tabular-nums text-muted">
                        {s.applied} applied · {s.hired} hired
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-border/50">
                      <div className="h-full rounded-full bg-brand/70" style={{ width: `${(s.applied / maxSource) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </DashPanel>

            <DashPanel title="Jobs">
              <ul className="divide-y divide-border">
                {report.jobs.map((job) => (
                  <li key={job.id} className="py-2.5">
                    <Link href={`/dashboard/ats/jobs/${job.id}`} className="group flex flex-col gap-1 min-[400px]:flex-row min-[400px]:items-center">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground group-hover:text-brand">{job.title}</span>
                      <span className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                        <StatusChip status={job.status} />
                        <span>{job.applications} applied</span>
                        <span>{job.hired} hired</span>
                        {job.daysOpen !== null ? <span>{job.daysOpen}d open</span> : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {report.totals.avgAiScore !== null ? (
                <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted">
                  <Sparkles className="h-3.5 w-3.5 text-brand" /> Average AI fit score {report.totals.avgAiScore}. A guide only; people decide.
                </p>
              ) : null}
            </DashPanel>
          </div>
        </>
      )}
    </div>
  );
}
