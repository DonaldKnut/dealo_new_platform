'use client';

import { JOB_BOARD_TYPES, type JobBoardType, type JobListing, type JobListingDetail, type JobSearchResult } from '@dealo/shared';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Briefcase,
  Building2,
  FileText,
  Globe2,
  Loader2,
  MapPin,
  Search,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import { useAuthSession } from '@/hooks/use-auth-session';
import { ApiError } from '@/lib/api';
import { JOB_TYPE_LABEL, jobsApi, type JobFilters, type TrackedApplication } from '@/lib/jobs-api';
import { rememberReturnTo } from '@/lib/resume-api';
import { cn } from '@/lib/utils';

import { ApplyModal } from './apply-modal';
import { JobCard, JobCardSkeleton } from './job-card';
import { JobDetail } from './job-detail';

const DATE_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '1', label: 'Last 24 hours' },
  { value: '3', label: 'Last 3 days' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
];

const POPULAR = ['Customer service', 'Sales', 'Software engineer', 'Accountant', 'Marketing', 'Electrician', 'Driver', 'Data analyst'];

function filtersFrom(params: URLSearchParams): JobFilters {
  const type = params.get('type');
  const days = Number(params.get('days'));
  const scope = params.get('scope');
  const remote = params.get('remote');
  return {
    q: params.get('q') ?? undefined,
    location: params.get('location') ?? undefined,
    remote: remote === 'true' || remote === 'false' ? remote : undefined,
    type: type && (JOB_BOARD_TYPES as readonly string[]).includes(type) ? (type as JobBoardType) : undefined,
    category: params.get('category') ?? undefined,
    days: days > 0 ? days : undefined,
    scope: scope === 'dealo' || scope === 'external' ? scope : 'all',
  };
}

function useDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return desktop;
}

export function JobBoard() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const desktop = useDesktop();
  const { user: me } = useAuthSession();

  const filters = useMemo(() => filtersFrom(new URLSearchParams(params.toString())), [params]);
  const selectedId = params.get('job');
  const filterKey = JSON.stringify(filters);

  const [q, setQ] = useState(filters.q ?? '');
  const [where, setWhere] = useState(filters.location ?? '');
  const [result, setResult] = useState<JobSearchResult | null>(null);
  const [items, setItems] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [featured, setFeatured] = useState<JobListing[]>([]);
  const [detail, setDetail] = useState<JobListingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [tracked, setTracked] = useState<Map<string, TrackedApplication>>(new Map());
  const [applyOpen, setApplyOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const detailCache = useRef(new Map<string, JobListingDetail>());
  const listTop = useRef<HTMLDivElement>(null);

  const setParams = useCallback(
    (patch: Record<string, string | undefined>, opts: { keepJob?: boolean } = {}) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '' || (key === 'scope' && value === 'all')) next.delete(key);
        else next.set(key, value);
      }
      if (!opts.keepJob && !('job' in patch)) next.delete('job');
      next.delete('apply');
      const text = next.toString();
      router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // ----------------------------------------------------------------- data

  useEffect(() => {
    setQ(filters.q ?? '');
    setWhere(filters.location ?? '');
    let active = true;
    setLoading(true);
    jobsApi
      .search(filters, 1)
      .then((res) => {
        if (!active) return;
        setResult(res);
        setItems(res.items);
      })
      .catch(() => active && toast.error('Could not load jobs', 'Check your connection and try again.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    jobsApi
      .featured()
      .then((f) => setFeatured(f.dealo))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!me) {
      setSaved(new Set());
      setTracked(new Map());
      return;
    }
    jobsApi.saved().then((list) => setSaved(new Set(list.map((s) => s.listingId)))).catch(() => undefined);
    jobsApi.applications().then((list) => setTracked(new Map(list.map((a) => [a.listingId, a])))).catch(() => undefined);
  }, [me]);

  // On desktop the first job opens beside the list, like a mail inbox.
  const activeId = selectedId ?? (desktop ? items[0]?.id : undefined) ?? null;

  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      return;
    }
    const cached = detailCache.current.get(activeId);
    if (cached) {
      setDetail(cached);
      return;
    }
    let active = true;
    setDetailLoading(true);
    jobsApi
      .detail(activeId)
      .then((d) => {
        detailCache.current.set(activeId, d);
        if (active) setDetail(d);
      })
      .catch((err) => {
        if (!active) return;
        setDetail(null);
        if (selectedId) toast.error('Job not found', err instanceof ApiError ? err.message : 'It may have closed.');
      })
      .finally(() => active && setDetailLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    if (params.get('apply') === '1' && detail && detail.id === selectedId) setApplyOpen(true);
  }, [params, detail, selectedId]);

  const loadMore = async () => {
    if (!result) return;
    setLoadingMore(true);
    try {
      const res = await jobsApi.search(filters, result.page + 1);
      setResult(res);
      setItems((current) => [...current, ...res.items.filter((job) => !current.some((c) => c.id === job.id))]);
    } catch {
      toast.error('Could not load more jobs');
    } finally {
      setLoadingMore(false);
    }
  };

  // -------------------------------------------------------------- actions

  const needSignIn = (why: string) => {
    toast.info('Sign in first', why);
    const back = `${pathname}?${params.toString()}`;
    rememberReturnTo(back);
    router.push(`/auth/login?next=${encodeURIComponent(back)}`);
  };

  const toggleSave = async (job: Pick<JobListing, 'id'>) => {
    if (!me) return needSignIn('Saved jobs follow you to any device.');
    const isSaved = saved.has(job.id);
    setSaved((s) => {
      const next = new Set(s);
      if (isSaved) next.delete(job.id);
      else next.add(job.id);
      return next;
    });
    try {
      if (isSaved) await jobsApi.unsave(job.id);
      else {
        await jobsApi.save(job.id);
        toast.success('Job saved', 'Find it later in My applications.');
      }
    } catch {
      setSaved((s) => {
        const next = new Set(s);
        if (isSaved) next.add(job.id);
        else next.delete(job.id);
        return next;
      });
      toast.error('That did not save');
    }
  };

  const openJob = (id: string) => setParams({ job: id }, { keepJob: true });
  const closeJob = () => setParams({ job: undefined });

  const submitSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    setParams({ q: q.trim() || undefined, location: where.trim() || undefined });
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeFilters = [
    filters.type ? { key: 'type', label: JOB_TYPE_LABEL[filters.type] } : null,
    filters.remote ? { key: 'remote', label: filters.remote === 'true' ? 'Remote' : 'On-site' } : null,
    filters.days ? { key: 'days', label: DATE_OPTIONS.find((d) => d.value === String(filters.days))?.label ?? `${filters.days} days` } : null,
    filters.category ? { key: 'category', label: filters.category } : null,
    filters.scope && filters.scope !== 'all' ? { key: 'scope', label: filters.scope === 'dealo' ? 'Easy apply' : 'Other sites' } : null,
  ].filter((f): f is { key: string; label: string } => Boolean(f));
  const isDefault = !filters.q && !filters.location && activeFilters.length === 0;

  // ----------------------------------------------------------------- view

  const filterControls = (
    <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-2">
      <Select
        label="Job type"
        value={filters.type ?? ''}
        onChange={(v) => setParams({ type: v || undefined })}
        options={[
          { value: '', label: 'All types' },
          ...JOB_BOARD_TYPES.filter((t) => t !== 'OTHER' || result?.facets.types.some((f) => f.value === 'OTHER')).map((t) => {
            const count = result?.facets.types.find((f) => f.value === t)?.count;
            return { value: t, label: `${JOB_TYPE_LABEL[t]}${count ? ` (${count})` : ''}` };
          }),
        ]}
      />
      <Select
        label="Work style"
        value={filters.remote ?? ''}
        onChange={(v) => setParams({ remote: v || undefined })}
        options={[
          { value: '', label: 'Remote or on-site' },
          { value: 'true', label: 'Remote only' },
          { value: 'false', label: 'On-site / hybrid' },
        ]}
      />
      <Select label="Date posted" value={filters.days ? String(filters.days) : ''} onChange={(v) => setParams({ days: v || undefined })} options={DATE_OPTIONS} />
      <Select
        label="Category"
        value={filters.category ?? ''}
        onChange={(v) => setParams({ category: v || undefined })}
        options={[
          { value: '', label: 'All categories' },
          ...(result?.facets.categories ?? []).map((c) => ({ value: c.value, label: `${c.value} (${c.count})` })),
          ...(filters.category && !result?.facets.categories.some((c) => c.value === filters.category) ? [{ value: filters.category, label: filters.category }] : []),
        ]}
      />
    </div>
  );

  const scopeTabs = (
    <div role="tablist" aria-label="Where to apply" className="inline-flex max-w-full overflow-x-auto rounded-full border border-border bg-surface p-1 scrollbar-none">
      {(
        [
          { id: 'all', label: 'All jobs', icon: Briefcase },
          { id: 'dealo', label: 'Easy apply', icon: Zap },
          { id: 'external', label: 'Other sites', icon: Globe2 },
        ] as const
      ).map((tab) => {
        const active = (filters.scope ?? 'all') === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => setParams({ scope: tab.id })}
            className={cn('relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors', active ? 'text-white dark:text-[#071f14]' : 'text-muted hover:text-foreground')}
          >
            {active ? <motion.span layoutId="jobs-scope" className="absolute inset-0 rounded-full bg-brand" transition={{ type: 'spring', stiffness: 420, damping: 34 }} /> : null}
            <Icon className="relative z-10 h-3.5 w-3.5" />
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="pb-16">
      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden border-b border-border bg-[radial-gradient(ellipse_at_top,var(--hero-glow),transparent_60%)] pb-8 pt-24 min-[340px]:pt-28 sm:pb-12 sm:pt-32">
        <div aria-hidden className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="container-page relative">
          <p className="eyebrow inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Dealo job board
          </p>
          <h1 className="display-title mt-3 max-w-3xl text-[1.9rem] leading-[1.05] text-foreground min-[340px]:text-4xl sm:text-5xl lg:text-6xl">
            Find work that fits. <span className="text-brand">Apply in one tap.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted min-[340px]:text-base sm:text-lg">
            Fresh jobs from Dealo employers and trusted job sites, updated through the day. Send the CV you built on Dealo, and track every application in one place.
          </p>

          <form
            onSubmit={submitSearch}
            className="mt-6 flex flex-col gap-2 rounded-[1.4rem] border border-border bg-surface-elevated/90 p-2 shadow-[0_24px_60px_-28px_rgba(4,47,46,0.45)] backdrop-blur sm:mt-8 md:flex-row md:items-center md:rounded-full md:p-2"
          >
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full px-3 py-2.5 focus-within:bg-surface">
              <Search className="h-4 w-4 shrink-0 text-brand" />
              <span className="sr-only">Job title, skill or company</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, skill or company" className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted" maxLength={120} />
              {q ? (
                <button type="button" aria-label="Clear" onClick={() => setQ('')} className="text-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </label>
            <span aria-hidden className="hidden h-6 w-px bg-border md:block" />
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full px-3 py-2.5 focus-within:bg-surface md:max-w-xs">
              <MapPin className="h-4 w-4 shrink-0 text-brand" />
              <span className="sr-only">Location</span>
              <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="City, country or “remote”" className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted" maxLength={80} />
            </label>
            <button type="submit" className="btn-primary justify-center rounded-full px-6">
              <Search className="h-4 w-4" /> Search
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-muted">Popular:</span>
            {POPULAR.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setParams({ q: term })}
                className="rounded-full border border-border bg-surface-elevated/70 px-2.5 py-1 text-xs text-foreground transition hover:border-brand hover:text-brand"
              >
                {term}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <strong className="font-semibold text-foreground tabular-nums">{result ? result.total.toLocaleString() : '…'}</strong> open jobs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-brand" /> Easy apply on Dealo jobs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5 text-brand" /> Also from Remotive, Jobicy and Arbeitnow
            </span>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- featured */}
      {isDefault && featured.length ? (
        <section className="container-page pt-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow inline-flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Easy apply
              </p>
              <h2 className="mt-1 font-display text-xl text-foreground sm:text-2xl">Hiring now on Dealo</h2>
            </div>
            <button type="button" onClick={() => setParams({ scope: 'dealo' })} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand">
              See all <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="scrollbar-none -mx-2 mt-4 flex snap-x gap-3 overflow-x-auto px-2 pb-2">
            {featured.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => openJob(job.id)}
                className="group w-[min(17rem,80vw)] shrink-0 snap-start rounded-2xl border border-brand/25 bg-gradient-to-br from-brand-soft/70 to-surface-elevated p-4 text-left transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg"
              >
                <p className="truncate text-xs font-semibold text-brand">{job.company}</p>
                <p className="mt-1 line-clamp-2 font-semibold text-foreground group-hover:text-brand">{job.title}</p>
                <p className="mt-2 flex items-center gap-1 truncate text-xs text-muted">
                  <MapPin className="h-3.5 w-3.5 shrink-0" /> {job.location}
                </p>
                {job.salary ? <p className="mt-1 text-xs font-semibold text-foreground">{job.salary}</p> : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------- results */}
      <section ref={listTop} className="container-page scroll-mt-24 pt-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {scopeTabs}
          <div className="hidden lg:block">{filterControls}</div>
          <button type="button" onClick={() => setFiltersOpen(true)} className="btn-secondary self-start text-sm lg:hidden">
            <SlidersHorizontal className="h-4 w-4" /> Filters{activeFilters.length ? ` (${activeFilters.length})` : ''}
          </button>
        </div>

        {activeFilters.length || filters.q || filters.location ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {filters.q ? <Chip label={`“${filters.q}”`} onRemove={() => setParams({ q: undefined })} /> : null}
            {filters.location ? <Chip label={filters.location} onRemove={() => setParams({ location: undefined })} /> : null}
            {activeFilters.map((f) => (
              <Chip key={f.key} label={f.label} onRemove={() => setParams({ [f.key]: undefined })} />
            ))}
            <button type="button" onClick={() => router.replace(pathname, { scroll: false })} className="text-xs font-semibold text-brand hover:underline">
              Clear all
            </button>
          </div>
        ) : null}

        <p className="mt-4 text-sm text-muted" aria-live="polite">
          {loading ? 'Searching…' : result ? `${result.total.toLocaleString()} ${result.total === 1 ? 'job' : 'jobs'}${filters.q ? ` for “${filters.q}”` : ''}` : ''}
        </p>

        <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="min-w-0 space-y-3">
            {loading ? (
              Array.from({ length: 6 }, (_, i) => <JobCardSkeleton key={i} />)
            ) : items.length ? (
              <>
                {items.map((job, index) => (
                  <div key={job.id}>
                    <JobCard
                      job={job}
                      index={index}
                      active={desktop && job.id === activeId}
                      saved={saved.has(job.id)}
                      onOpen={() => openJob(job.id)}
                      onToggleSave={() => void toggleSave(job)}
                    />
                    {index === 4 ? <CvPromo /> : null}
                  </div>
                ))}
                {result?.hasMore ? (
                  <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="btn-secondary w-full justify-center">
                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Show more jobs
                  </button>
                ) : (
                  <p className="py-4 text-center text-xs text-muted">That&apos;s every job for this search.</p>
                )}
              </>
            ) : (
              <EmptyState onReset={() => router.replace(pathname, { scroll: false })} />
            )}
            <EmployerPromo />
          </div>

          <aside className="hidden min-w-0 lg:block">
            <div className="sticky top-[calc(5.5rem+var(--safe-top))] h-[calc(100vh-7rem)] overflow-hidden rounded-[1.5rem] border border-border bg-surface-elevated shadow-sm">
              <AnimatePresence mode="wait">
                {detail ? (
                  <motion.div key={detail.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="h-full">
                    <JobDetail
                      job={detail}
                      saved={saved.has(detail.id)}
                      applied={tracked.has(detail.id)}
                      onApply={() => setApplyOpen(true)}
                      onToggleSave={() => void toggleSave(detail)}
                    />
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted">
                    {detailLoading || loading ? <Loader2 className="h-6 w-6 animate-spin text-brand" /> : <Briefcase className="h-8 w-8 text-brand" />}
                    {detailLoading || loading ? 'Loading job…' : 'Pick a job to see the details.'}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </aside>
        </div>
      </section>

      {/* ------------------------------------------------------ phone sheets */}
      <FormModal open={!desktop && Boolean(selectedId)} onClose={closeJob} size="lg" bodyClassName="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {detail && detail.id === selectedId ? (
          <JobDetail
            job={detail}
            compact
            onClose={closeJob}
            saved={saved.has(detail.id)}
            applied={tracked.has(detail.id)}
            onApply={() => setApplyOpen(true)}
            onToggleSave={() => void toggleSave(detail)}
          />
        ) : (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        )}
      </FormModal>

      <FormModal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters" icon={SlidersHorizontal} mobile="auto" footer={<button type="button" className="btn-primary w-full" onClick={() => setFiltersOpen(false)}>Show {result?.total.toLocaleString() ?? ''} jobs</button>}>
        {filterControls}
      </FormModal>

      {detail ? (
        <ApplyModal
          job={detail}
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
          me={me}
          tracked={tracked.get(detail.id) ?? null}
          onTracked={(app) => setTracked((m) => new Map(m).set(app.listingId, app))}
        />
      ) : null}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-semibold text-muted lg:sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'input-field w-full cursor-pointer py-2 text-sm lg:w-auto lg:max-w-[13rem] lg:rounded-full lg:pr-8',
          value && 'border-brand text-brand',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
      <span className="truncate">{label}</span>
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="rounded-full hover:bg-brand/10">
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <SearchX className="mx-auto h-8 w-8 text-muted" />
      <p className="mt-3 font-display text-xl text-foreground">No jobs match yet</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Try fewer words, a nearby city, or “remote”. New jobs arrive through the day.</p>
      <button type="button" onClick={onReset} className="btn-secondary mt-4 text-sm">
        Clear search
      </button>
    </div>
  );
}

function CvPromo() {
  return (
    <Link
      href="/resume-builder"
      className="mt-3 flex items-center gap-3 overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-300/20 via-brand-soft/60 to-surface-elevated p-4 transition hover:border-amber-400"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30">
        <FileText className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">Stand out with a CV recruiters love</span>
        <span className="block text-xs text-muted">Build one in 10 minutes, then apply to these jobs in one tap.</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}

function EmployerPromo() {
  return (
    <Link href="/ats" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:border-brand/50">
      <Building2 className="h-5 w-5 shrink-0 text-brand" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">Hiring? Post jobs here for free</span>
        <span className="block text-xs text-muted">Dealo ATS puts your jobs on this board with Easy apply, plus AI screening.</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}
