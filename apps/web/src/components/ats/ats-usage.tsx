'use client';

import { motion } from 'framer-motion';
import { Gift } from 'lucide-react';

import type { WorkspaceDetail } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

function Meter({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, max)) * 100));
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-xs">
        <span className="font-semibold text-foreground">{label}</span>
        <span className={cn('tabular-nums', pct >= 100 ? 'font-semibold text-danger' : pct >= 80 ? 'text-amber-600 dark:text-amber-300' : 'text-muted')}>
          {used} of {max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border/50">
        <motion.div
          className={cn('h-full rounded-full', pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-amber-500' : 'bg-brand')}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  );
}

export function AtsUsageCard({ detail }: { detail: WorkspaceDetail }) {
  const { usage } = detail;
  return (
    <div className="space-y-3">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
        <Gift className="h-3.5 w-3.5" /> Free early access
      </p>
      <Meter label="Open jobs" used={usage.openJobs} max={usage.maxOpenJobs} />
      <Meter label="Team seats (including invites)" used={usage.seats} max={usage.maxSeats} />
      <p className="text-[11px] leading-relaxed text-muted">
        {usage.applications} applicants so far. No card needed. When paid plans arrive you will be told well ahead, and early workspaces keep a discount.
      </p>
    </div>
  );
}

/** Shown on the jobs list when the workspace is at its open-job limit. */
export function AtsLimitBanner({ detail }: { detail: WorkspaceDetail }) {
  const { openJobs, maxOpenJobs } = detail.usage;
  if (openJobs < maxOpenJobs) return null;
  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-200">
      You have {openJobs} of {maxOpenJobs} open jobs, the early-access limit. Close or pause one to publish another, or talk to Dealo for more.
    </div>
  );
}
