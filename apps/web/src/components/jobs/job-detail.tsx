'use client';

import type { JobListingDetail } from '@dealo/shared';
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Link2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

import { JobDescription } from '@/components/ats/job-description';
import { useToast } from '@/components/ui/toast';
import { JOB_TYPE_LABEL, postedAgo } from '@/lib/jobs-api';
import { cn } from '@/lib/utils';

import { CompanyLogo } from './company-logo';

export function JobDetail({
  job,
  saved,
  applied,
  onApply,
  onToggleSave,
  compact,
  onClose,
}: {
  job: JobListingDetail;
  saved: boolean;
  applied: boolean;
  onApply: () => void;
  onToggleSave: () => void;
  /** Phone sheet: the header actions stick to the bottom instead. */
  compact?: boolean;
  onClose?: () => void;
}) {
  const toast = useToast();

  const share = async () => {
    const url = `${window.location.origin}/jobs?job=${job.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `${job.title} at ${job.company}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied', 'Send it to a friend who fits.');
      }
    } catch {
      // The person closed the share sheet.
    }
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onApply} className="btn-primary min-w-0 flex-1 justify-center text-sm min-[400px]:flex-none">
        {applied ? (
          <>
            <CheckCircle2 className="h-4 w-4" /> Applied · view
          </>
        ) : job.easyApply ? (
          <>
            <Zap className="h-4 w-4" /> Easy apply
          </>
        ) : (
          <>
            Apply on {job.source.name} <ArrowUpRight className="h-4 w-4" />
          </>
        )}
      </button>
      <button
        type="button"
        onClick={onToggleSave}
        aria-pressed={saved}
        className={cn('btn-secondary px-3 text-sm', saved && 'border-brand text-brand')}
        aria-label={saved ? 'Remove from saved jobs' : 'Save job'}
      >
        {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        <span className="hidden min-[400px]:inline">{saved ? 'Saved' : 'Save'}</span>
      </button>
      <button type="button" onClick={() => void share()} className="btn-secondary px-3 text-sm" aria-label="Share job">
        <Link2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <article className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border p-4 min-[340px]:p-5 sm:p-6">
        <div className="flex items-start gap-3 min-[340px]:gap-4">
          <CompanyLogo name={job.company} src={job.companyLogo} className="h-12 w-12 min-[340px]:h-14 min-[340px]:w-14" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm text-muted">
              <Building2 className="h-3.5 w-3.5 shrink-0" /> {job.company}
            </p>
            <h2 className="mt-1 break-words font-display text-xl leading-tight text-foreground min-[340px]:text-2xl">{job.title}</h2>
          </div>
          {onClose ? (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition hover:border-brand hover:text-brand"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
          <Meta icon={MapPin}>{job.location}</Meta>
          {job.employmentType !== 'OTHER' ? <Meta icon={Briefcase}>{JOB_TYPE_LABEL[job.employmentType]}</Meta> : null}
          {job.remote ? <Meta icon={Sparkles}>Remote</Meta> : null}
          {job.salary ? (
            <Meta icon={Wallet} strong>
              {job.salary}
            </Meta>
          ) : null}
          <Meta icon={Clock}>Posted {postedAgo(job.postedAt)}</Meta>
        </div>
        {!compact ? <div className="mt-5">{actions}</div> : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 min-[340px]:p-5 sm:p-6">
        {job.easyApply ? (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand-soft/60 p-3 text-sm">
            <Zap className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <p className="text-foreground">
              <span className="font-semibold">Apply in one tap.</span> <span className="text-muted">Send the CV you built on Dealo. No new account or forms on another site.</span>
            </p>
          </div>
        ) : null}

        {job.mustHaves.length ? (
          <section className="mb-5">
            <h3 className="text-sm font-semibold text-foreground">What they need</h3>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {job.mustHaves.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h3 className="mb-2 text-sm font-semibold text-foreground">About the job</h3>
          {job.descriptionFormat === 'html' ? (
            // Sanitised on the server: only simple text formatting and safe links remain.
            <div className="job-html" dangerouslySetInnerHTML={{ __html: job.description }} />
          ) : (
            <JobDescription text={job.description} />
          )}
        </section>

        {job.tags.length ? (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {job.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-surface px-2.5 py-1 text-[11px] text-muted">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <footer className="mt-6 space-y-3 border-t border-border pt-4 text-xs text-muted">
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            Never pay anyone to apply or to get an interview. Report suspicious jobs to Dealo.
          </p>
          {job.kind === 'external' ? (
            <p>
              Listed on{' '}
              <a href={job.source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline-offset-2 hover:underline">
                {job.source.name}
              </a>
              . You apply on their site; Dealo helps you send a strong CV and keep track.
            </p>
          ) : job.careers ? (
            <p>
              More roles at{' '}
              <Link href={`/careers/${job.careers.orgSlug}`} className="font-semibold text-foreground underline-offset-2 hover:underline">
                {job.company}
              </Link>
              .
            </p>
          ) : null}
        </footer>
      </div>

      {compact ? <div className="border-t border-border bg-background/95 p-3 pb-[calc(0.75rem+var(--safe-bottom))] backdrop-blur">{actions}</div> : null}
    </article>
  );
}

function Meta({ icon: Icon, children, strong }: { icon: typeof MapPin; children: React.ReactNode; strong?: boolean }) {
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1 rounded-full border border-border px-2.5 py-1', strong ? 'font-semibold text-foreground' : 'text-muted')}>
      <Icon className={cn('h-3.5 w-3.5 shrink-0', strong && 'text-brand')} />
      <span className="truncate">{children}</span>
    </span>
  );
}
