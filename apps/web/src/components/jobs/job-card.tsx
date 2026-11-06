'use client';

import type { JobListing } from '@dealo/shared';
import { motion } from 'framer-motion';
import { Bookmark, BookmarkCheck, Clock, MapPin, Wallet, Zap } from 'lucide-react';

import { JOB_TYPE_LABEL, postedAgo } from '@/lib/jobs-api';
import { cn } from '@/lib/utils';

import { CompanyLogo } from './company-logo';

export function JobCard({
  job,
  active,
  saved,
  onOpen,
  onToggleSave,
  index = 0,
}: {
  job: JobListing;
  active?: boolean;
  saved?: boolean;
  onOpen: () => void;
  onToggleSave: () => void;
  index?: number;
}) {
  const fresh = Date.now() - Date.parse(job.postedAt) < 36 * 3_600_000;
  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.03, duration: 0.25 }}
      className={cn(
        'group relative rounded-2xl border bg-surface-elevated p-3 transition-all duration-200 min-[340px]:p-4',
        active
          ? 'border-brand shadow-[0_14px_34px_-18px_color-mix(in_srgb,var(--brand)_70%,transparent)] ring-1 ring-brand/30'
          : 'border-border hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg',
      )}
    >
      <button type="button" onClick={onOpen} className="absolute inset-0 z-0 rounded-2xl" aria-label={`${job.title} at ${job.company}`} />
      <div className="pointer-events-none relative z-10 flex gap-3">
        <CompanyLogo name={job.company} src={job.companyLogo} className="h-10 w-10 min-[340px]:h-12 min-[340px]:w-12" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {job.easyApply ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:text-[#071f14]">
                <Zap className="h-3 w-3" /> Easy apply
              </span>
            ) : null}
            {fresh ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">New</span> : null}
          </div>
          <h3 className="mt-1 line-clamp-2 break-words pr-8 text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-brand">
            {job.title}
          </h3>
          <p className="mt-0.5 truncate text-sm text-muted">{job.company}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{job.location}</span>
            </span>
            {job.salary ? (
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Wallet className="h-3.5 w-3.5 shrink-0 text-brand" /> {job.salary}
              </span>
            ) : null}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {job.employmentType !== 'OTHER' ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground">{JOB_TYPE_LABEL[job.employmentType]}</span>
            ) : null}
            {job.remote ? <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground">Remote</span> : null}
            {job.category ? <span className="hidden max-w-[10rem] truncate rounded-full border border-border px-2 py-0.5 text-[11px] text-muted min-[400px]:inline">{job.category}</span> : null}
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted">
              <Clock className="h-3 w-3" /> {postedAgo(job.postedAt)}
              <span className="hidden min-[340px]:inline">· {job.source.name}</span>
            </span>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleSave}
        aria-label={saved ? 'Remove from saved jobs' : 'Save job'}
        aria-pressed={saved}
        className={cn(
          'absolute right-2.5 top-2.5 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border transition min-[340px]:right-3 min-[340px]:top-3',
          saved ? 'border-brand bg-brand-soft text-brand' : 'border-border bg-surface-elevated text-muted hover:border-brand hover:text-brand',
        )}
      >
        {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      </button>
    </motion.article>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-4">
      <div className="flex gap-3">
        <div className="h-12 w-12 animate-pulse rounded-xl bg-surface" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-surface" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-surface" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-surface" />
        </div>
      </div>
    </div>
  );
}
