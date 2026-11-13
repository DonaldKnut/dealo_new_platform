'use client';

import {
  JOB_AGENT_PLANS,
  JOB_BOARD_TYPES,
  RESUME_COLORS,
  isPremiumColor,
  isPremiumFont,
  isPremiumTemplate,
  resumeDataSchema,
  resumeStyleSchema,
  type JobAgentMatchDto,
  type JobAgentOverview,
  type JobAgentSettings,
  type JobBoardType,
} from '@dealo/shared';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  FileText,
  Filter,
  Inbox,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Play,
  Radar,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import type { TranslationKey } from '@/components/i18n/dictionaries';
import { fill } from '@/components/i18n/fill';
import { useLocale } from '@/components/i18n/locale-context';
import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { jobAgentApi } from '@/lib/job-agent-api';
import { JOB_TYPE_LABEL } from '@/lib/jobs-api';
import { resumeApi, type SavedResume } from '@/lib/resume-api';
import { cn } from '@/lib/utils';

type Tab = 'inbox' | 'APPLIED' | 'SKIPPED';
type T = (key: TranslationKey) => string;

const DEFAULT_SETTINGS: JobAgentSettings = {
  resumeId: null,
  targetTitles: [],
  locations: [],
  remote: 'ANY',
  employmentTypes: [],
  mustHave: [],
  exclude: [],
  minScore: 70,
  dailyLimit: 2,
  mode: 'REVIEW',
  coverNotes: true,
  emailApply: false,
  phone: '',
};

const CITY_IDEAS = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu'];

function relative(t: T, iso: string | null, future = false) {
  if (!iso) return '—';
  const diff = (new Date(iso).getTime() - Date.now()) / 60_000;
  const minutes = Math.round(future ? diff : -diff);
  if (minutes <= 0) return t(future ? 'ja.time.soon' : 'ja.time.now');
  if (minutes < 60) return fill(t(future ? 'ja.time.inMin' : 'ja.time.minAgo'), { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return fill(t(future ? 'ja.time.inH' : 'ja.time.hAgo'), { n: hours });
  return fill(t(future ? 'ja.time.inD' : 'ja.time.dAgo'), { n: Math.round(hours / 24) });
}

async function cvPdf(resume: SavedResume, premium: boolean) {
  const { buildPdf, pdfFileName } = await import('@/components/resume/resume-pdf');
  const data = resumeDataSchema.parse(resume.data);
  const style = resumeStyleSchema.parse({ template: resume.template, accentColor: resume.accentColor, font: resume.font });
  const doc = {
    kind: 'RESUME' as const,
    data: premium ? data : { ...data, design: { ...data.design, art: 'none' as const } },
    style: premium
      ? style
      : {
          template: isPremiumTemplate(style.template) ? ('classic' as const) : style.template,
          font: isPremiumFont(style.font) ? ('helvetica' as const) : style.font,
          accentColor: isPremiumColor(style.accentColor) ? RESUME_COLORS[0] : style.accentColor,
        },
  };
  const blob = await buildPdf(doc, !premium, resume.title);
  return new File([blob], pdfFileName(doc), { type: 'application/pdf' });
}

// ------------------------------------------------------------------- visuals

export function RadarVisual({ active, searching, className }: { active: boolean; searching: boolean; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn('relative shrink-0', className ?? 'h-28 w-28 min-[360px]:h-40 min-[360px]:w-40 sm:h-48 sm:w-48')} aria-hidden>
      {[1, 0.72, 0.44].map((s) => (
        <span key={s} className="absolute inset-0 m-auto rounded-full border border-[#7cff4d]/20" style={{ width: `${s * 100}%`, height: `${s * 100}%` }} />
      ))}
      <span className="absolute inset-0 m-auto h-px w-full bg-[#7cff4d]/10" />
      <span className="absolute inset-0 m-auto h-full w-px bg-[#7cff4d]/10" />
      {active && !reduce ? (
        <motion.span
          className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(124,255,77,0.45),rgba(124,255,77,0)_28%)]"
          animate={{ rotate: 360 }}
          transition={{ duration: searching ? 1.6 : 4.5, repeat: Infinity, ease: 'linear' }}
        />
      ) : null}
      {active
        ? [
            { x: '24%', y: '30%', d: 0 },
            { x: '68%', y: '22%', d: 0.8 },
            { x: '62%', y: '70%', d: 1.6 },
            { x: '30%', y: '66%', d: 2.4 },
          ].map((dot) => (
            <motion.span
              key={dot.x}
              className="absolute h-1.5 w-1.5 rounded-full bg-[#7cff4d] shadow-[0_0_12px_#7cff4d] min-[360px]:h-2 min-[360px]:w-2"
              style={{ left: dot.x, top: dot.y }}
              animate={reduce ? undefined : { opacity: [0, 1, 0], scale: [0.6, 1.2, 0.6] }}
              transition={{ duration: 3.2, repeat: Infinity, delay: dot.d }}
            />
          ))
        : null}
      <span className="absolute inset-0 m-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#1f6b4a,#062417_70%)] ring-2 ring-[#7cff4d]/40 min-[360px]:h-14 min-[360px]:w-14">
        <Bot className={cn('h-5 w-5 min-[360px]:h-6 min-[360px]:w-6', active ? 'text-[#c9ffb0]' : 'text-white/40')} />
      </span>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#14b8a6' : '#f59e0b';
  return (
    <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center min-[300px]:h-14 min-[300px]:w-14">
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-border" />
        <motion.circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <span className="font-display text-xs font-semibold tabular-nums text-foreground min-[300px]:text-sm">{score}</span>
    </span>
  );
}

function Switch({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn('relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition disabled:opacity-50', on ? 'bg-[#7cff4d] shadow-[0_0_24px_rgba(124,255,77,0.45)]' : 'bg-white/20')}
    >
      <motion.span layout className={cn('h-6 w-6 rounded-full shadow', on ? 'ml-auto bg-[#062417]' : 'bg-white')} transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
    </button>
  );
}

function Chips({
  label,
  values,
  onChange,
  placeholder,
  ideas = [],
  ideasLabel,
  max,
  hint,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  ideas?: string[];
  ideasLabel?: string;
  max: number;
  hint?: string;
}) {
  const { t } = useLocale();
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const value = raw.trim().replace(/,$/, '');
    if (value.length < 2 || values.length >= max || values.some((v) => v.toLowerCase() === value.toLowerCase())) return;
    onChange([...values, value.slice(0, 80)]);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && values.length) onChange(values.slice(0, -1));
  };
  const freshIdeas = ideas.filter((i) => !values.some((v) => v.toLowerCase() === i.toLowerCase())).slice(0, 6);
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <span className="shrink-0 text-[10.5px] text-muted">
          {values.length}/{max}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface-elevated px-2 py-1.5 transition focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(15,118,110,0.12)]">
        <AnimatePresence initial={false}>
          {values.map((v) => (
            <motion.span
              key={v}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand"
            >
              <span className="truncate">{v}</span>
              <button type="button" aria-label={fill(t('ja.wz.removeX'), { x: v })} onClick={() => onChange(values.filter((x) => x !== v))} className="shrink-0 rounded-full hover:bg-brand/10">
                <X className="h-3 w-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft && add(draft)}
          disabled={values.length >= max}
          placeholder={values.length >= max ? t('ja.wz.limitReached') : placeholder}
          className="min-w-[6rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted"
        />
      </div>
      {freshIdeas.length ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {ideasLabel ? <span className="text-[10.5px] text-muted">{ideasLabel}:</span> : null}
          {freshIdeas.map((idea) => (
            <button key={idea} type="button" onClick={() => add(idea)} className="rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted transition hover:border-brand hover:text-brand">
              + {idea}
            </button>
          ))}
        </div>
      ) : null}
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

// --------------------------------------------------------------------- panel

export function JobAgentPanel() {
  const toast = useToast();
  const { t } = useLocale();
  const [overview, setOverview] = useState<JobAgentOverview | null>(null);
  const [matches, setMatches] = useState<JobAgentMatchDto[] | null>(null);
  const [tab, setTab] = useState<Tab>('inbox');
  const [setupOpen, setSetupOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [, setNow] = useState(0);
  const pollRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      setOverview(await jobAgentApi.overview());
    } catch (err) {
      toast.error(t('ja.toast.loadFail'), err instanceof ApiError ? err.message : '');
    }
  }, [toast, t]);

  const loadMatches = useCallback(async (which: Tab) => {
    setMatches(null);
    setMatches(await jobAgentApi.matches(which).catch(() => []));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void loadMatches(tab);
  }, [tab, loadMatches]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow((n) => n + 1), 30_000);
    return () => {
      window.clearInterval(timer);
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  // Back from Paystack: confirm Premium (unlocks Job Agent limits + CV fonts).
  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get('premium');
    if (!reference) return;
    window.history.replaceState(null, '', window.location.pathname);
    void resumeApi
      .verifyPremium(reference)
      .then((result) => {
        if (result.status === 'PAID') toast.success(t('ja.toast.paid'), t('ja.toast.paidBody'));
        else if (result.status === 'FAILED') toast.error(t('ja.toast.payFail'), result.failureReason ?? t('ja.toast.payFailBody'));
        else toast.success(t('ja.toast.payPending'), t('ja.toast.payPendingBody'));
        return load();
      })
      .catch((err) => toast.error(t('ja.toast.payFail'), err instanceof ApiError ? err.message : ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const premium = overview?.plan === 'PREMIUM';
  const configured = Boolean(overview?.settings);

  const toggle = async (enabled: boolean, consent?: boolean) => {
    if (enabled && !overview?.consented && !consent) return setConsentOpen(true);
    setBusy('toggle');
    try {
      setOverview(await jobAgentApi.toggle(enabled, consent));
      setConsentOpen(false);
      toast.success(t(enabled ? 'ja.toast.on' : 'ja.toast.off'), t(enabled ? 'ja.toast.onBody' : 'ja.toast.offBody'));
    } catch (err) {
      toast.error(t('ja.toast.changeFail'), err instanceof ApiError ? err.message : '');
    } finally {
      setBusy(null);
    }
  };

  const runNow = async () => {
    setBusy('run');
    try {
      await jobAgentApi.runNow();
      setSearching(true);
      const before = overview?.status.lastRunAt;
      let tries = 0;
      pollRef.current = window.setInterval(async () => {
        tries += 1;
        const fresh = await jobAgentApi.overview().catch(() => null);
        if (fresh && (fresh.status.lastRunAt !== before || tries > 30)) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          setOverview(fresh);
          setSearching(false);
          void loadMatches(tab);
          const last = fresh.runs[0];
          if (last) toast.success(t('ja.toast.searchDone'), last.matched ? fill(t('ja.toast.searchFound'), { n: last.matched, a: last.applied }) : t('ja.toast.searchNone'));
        }
      }, 4000);
    } catch (err) {
      toast.error(t('ja.toast.searchFail'), err instanceof ApiError ? err.message : '');
    } finally {
      setBusy(null);
    }
  };

  const act = async (match: JobAgentMatchDto, action: 'approve' | 'skip' | 'applied') => {
    setBusy(`${action}:${match.id}`);
    try {
      const updated = action === 'approve' ? await jobAgentApi.approve(match.id) : action === 'skip' ? await jobAgentApi.skip(match.id) : await jobAgentApi.markApplied(match.id);
      setMatches((list) => (tab === 'inbox' ? list?.filter((m) => m.id !== match.id) : list?.map((m) => (m.id === match.id ? updated : m))) ?? null);
      if (action === 'approve') {
        if (updated.status === 'APPLIED') toast.success(t('ja.toast.sent'), `${match.title} · ${match.company}`);
        else toast.error(t('ja.toast.notSent'), updated.error ?? t('ja.toast.tryLater'));
      }
      if (action === 'applied') toast.success(t('ja.toast.marked'), t('ja.toast.markedBody'));
      void load();
    } catch (err) {
      toast.error(t('ja.toast.actFail'), err instanceof ApiError ? err.message : '');
    } finally {
      setBusy(null);
    }
  };

  const upgrade = async () => {
    setBusy('upgrade');
    try {
      const { authorizationUrl } = await resumeApi.checkoutPremium('job-agent');
      window.location.assign(authorizationUrl);
    } catch (err) {
      toast.error(t('ja.toast.payFail'), err instanceof ApiError ? err.message : t('ja.toast.payFailBody'));
      setBusy(null);
    }
  };

  if (!overview) {
    return (
      <div className="space-y-4">
        <div className="h-64 animate-pulse rounded-[2rem] bg-surface" />
        <div className="grid grid-cols-1 gap-3 min-[300px]:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  const { status, stats, limits } = overview;
  const planName = t(premium ? 'ja.premium' : 'ja.free');
  const statusLine = !configured
    ? t('ja.status.notSetUp')
    : searching
      ? t('ja.status.searching')
      : overview.enabled
        ? fill(t('ja.status.hunting'), { when: relative(t, status.nextRunAt, true) })
        : t('ja.status.paused');

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      {/* ------------------------------------------------------- command centre */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#05170e] p-4 text-white shadow-[0_30px_80px_-30px_rgba(4,47,46,0.7)] min-[360px]:rounded-[2rem] min-[360px]:p-5 sm:p-7"
      >
        <span aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#14b8a6]/30 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-[#7cff4d]/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:gap-6">
          <RadarVisual active={overview.enabled || searching} searching={searching} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b8ff9a] min-[300px]:text-[11px]">{t('ja.eyebrow')}</p>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', premium ? 'bg-amber-400/20 text-amber-200' : 'bg-white/10 text-white/70')}>
                {premium ? <Crown className="h-3 w-3" /> : null}
                {planName}
              </span>
            </div>
            <h1 className="mt-2 break-words font-display text-xl leading-tight min-[360px]:text-2xl sm:text-4xl">{t('ja.title')}</h1>
            <p className="mt-2 max-w-xl text-[13px] text-white/70 sm:text-sm">{t('ja.subtitle')}</p>
            <p className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium min-[300px]:text-xs">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', overview.enabled || searching ? 'animate-pulse bg-[#7cff4d]' : 'bg-white/40')} />
              <span className="truncate">{statusLine}</span>
            </p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center md:flex-col md:items-end">
            {configured ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3">
                <span className="text-sm font-semibold">{t(overview.enabled ? 'ja.on' : 'ja.off')}</span>
                <Switch on={overview.enabled} disabled={busy === 'toggle'} onChange={(v) => void toggle(v)} label={t('ja.switchLabel')} />
              </div>
            ) : null}
            <div className="flex flex-col gap-2 min-[300px]:flex-row min-[300px]:flex-wrap">
              {configured ? (
                <button
                  type="button"
                  onClick={() => void runNow()}
                  disabled={!status.canRunNow || searching || busy === 'run'}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#7cff4d] px-4 py-2 text-sm font-semibold text-[#062417] transition hover:brightness-95 disabled:opacity-50"
                  title={status.canRunNow ? t('ja.searchNow') : t('ja.searchedRecently')}
                >
                  {busy === 'run' || searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {t('ja.searchNow')}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setSetupOpen(true)}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition',
                  configured ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[#7cff4d] text-[#062417] hover:brightness-95',
                )}
              >
                <Settings2 className="h-4 w-4" />
                {t(configured ? 'ja.settings' : 'ja.setUp')}
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ---------------------------------------------------------- warnings */}
      <AnimatePresence>
        {status.lastError ? <Banner key="err" tone="warn" icon={AlertTriangle} text={status.lastError} action={t('ja.warn.fix')} onAction={() => setSetupOpen(true)} /> : null}
        {overview.cv?.stale ? <Banner key="stale" tone="info" icon={RefreshCw} text={t('ja.warn.stale')} action={t('ja.warn.refresh')} onAction={() => setSetupOpen(true)} /> : null}
        {configured && !overview.cv ? <Banner key="nocv" tone="warn" icon={FileText} text={t('ja.warn.noCv')} action={t('ja.warn.attach')} onAction={() => setSetupOpen(true)} /> : null}
      </AnimatePresence>

      {!configured ? (
        <Onboarding onStart={() => setSetupOpen(true)} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 min-[300px]:grid-cols-2 lg:grid-cols-4">
            <Stat delay={0} icon={Send} label={t('ja.stat.sentToday')} value={`${stats.appliedToday}/${stats.dailyAllowance}`} hint={t('ja.stat.resets')} />
            <Stat delay={0.05} icon={Zap} label={t('ja.stat.week')} value={String(stats.appliedWeek)} hint={fill(t('ja.stat.total'), { n: stats.appliedTotal })} />
            <Stat delay={0.1} icon={Inbox} label={t('ja.stat.waiting')} value={String(stats.suggested + stats.ready)} hint={fill(t('ja.stat.waitingHint'), { a: stats.suggested, b: stats.ready })} />
            <Stat delay={0.15} icon={Clock} label={t('ja.stat.last')} value={relative(t, status.lastRunAt)} hint={fill(t('ja.stat.every'), { h: limits.runEveryHours, plan: planName })} />
          </div>

          {!premium ? <UpgradeCard onUpgrade={() => void upgrade()} busy={busy === 'upgrade'} /> : null}

          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <section className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div role="tablist" className="scrollbar-none flex max-w-full overflow-x-auto rounded-full border border-border bg-surface p-1">
                  {(
                    [
                      ['inbox', 'ja.tab.inbox'],
                      ['APPLIED', 'ja.tab.sent'],
                      ['SKIPPED', 'ja.tab.skipped'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      role="tab"
                      type="button"
                      aria-selected={tab === id}
                      onClick={() => setTab(id)}
                      className="relative shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold transition min-[300px]:px-4 min-[300px]:text-sm"
                    >
                      {tab === id ? <motion.span layoutId="ja-tab" className="absolute inset-0 rounded-full bg-brand shadow" transition={{ type: 'spring', stiffness: 400, damping: 32 }} /> : null}
                      <span className={cn('relative', tab === id ? 'text-white dark:text-[#071f14]' : 'text-muted hover:text-foreground')}>
                        {t(label)}
                        {id === 'inbox' && stats.suggested + stats.ready ? <span className="ml-1.5 rounded-full bg-white/25 px-1.5 text-[10px]">{stats.suggested + stats.ready}</span> : null}
                      </span>
                    </button>
                  ))}
                </div>
                <Link href="/dashboard/applications" className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
                  {t('ja.allApps')} <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {matches === null ? (
                  [0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-surface" />)
                ) : matches.length ? (
                  <AnimatePresence initial={false}>
                    {matches.map((m, i) => (
                      <MatchCard key={m.id} index={i} match={m} busy={busy} onAct={(a) => void act(m, a)} />
                    ))}
                  </AnimatePresence>
                ) : (
                  <EmptyInbox tab={tab} enabled={overview.enabled} />
                )}
              </div>
            </section>

            <aside className="min-w-0 space-y-4">
              <div className="rounded-2xl border border-border bg-surface-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t('ja.side.hunts')}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {overview.settings!.targetTitles.map((title) => (
                    <span key={title} className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
                      <Target className="h-3 w-3 shrink-0" /> <span className="truncate">{title}</span>
                    </span>
                  ))}
                  {(overview.settings!.locations.length ? overview.settings!.locations : [t(overview.settings!.remote === 'REMOTE_ONLY' ? 'ja.side.remoteOnly' : 'ja.side.anywhere')]).map((l) => (
                    <span key={l} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted">
                      <MapPin className="h-3 w-3" /> {l}
                    </span>
                  ))}
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-2 text-xs min-[300px]:grid-cols-2">
                  <div className="rounded-xl bg-surface p-2">
                    <dt className="text-muted">{t('ja.side.mode')}</dt>
                    <dd className="font-semibold text-foreground">{t(overview.settings!.mode === 'AUTO' ? 'ja.mode.auto' : 'ja.mode.review')}</dd>
                  </div>
                  <div className="rounded-xl bg-surface p-2">
                    <dt className="text-muted">{t('ja.side.min')}</dt>
                    <dd className="font-semibold text-foreground">{overview.settings!.minScore}%</dd>
                  </div>
                </dl>
                {overview.cv ? (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-brand" /> <span className="truncate">{fill(t('ja.side.sends'), { file: overview.cv.fileName })}</span>
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-border bg-surface-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t('ja.activity')}</p>
                <ol className="mt-3 space-y-3">
                  {overview.runs.length ? (
                    overview.runs.map((r, i) => (
                      <motion.li key={r.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex gap-2.5">
                        <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', r.error ? 'bg-amber-500' : r.applied ? 'bg-emerald-500' : 'bg-brand/60')} />
                        <div className="min-w-0 text-xs">
                          <p className="font-semibold text-foreground">
                            {r.error ? t('ja.act.problem') : r.applied ? fill(t('ja.act.sent'), { n: r.applied }) : r.matched ? fill(t('ja.act.found'), { n: r.matched }) : t('ja.act.none')}
                          </p>
                          <p className="text-muted">
                            {fill(t('ja.act.checked'), { n: r.scanned, when: relative(t, r.startedAt) })}
                            {r.trigger === 'new_job' ? ` · ${t('ja.act.newJob')}` : r.trigger === 'manual' ? ` · ${t('ja.act.manual')}` : ''}
                          </p>
                        </div>
                      </motion.li>
                    ))
                  ) : (
                    <li className="text-xs text-muted">{t('ja.act.empty')}</li>
                  )}
                </ol>
              </div>

              <div className="rounded-2xl border border-brand/20 bg-brand-soft/40 p-4 text-xs leading-relaxed text-foreground">
                <p className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-brand" /> {t('ja.safe.title')}
                </p>
                <ul className="mt-2 space-y-1 text-muted">
                  {(['ja.safe.1', 'ja.safe.2', 'ja.safe.3', 'ja.safe.4'] as const).map((k) => (
                    <li key={k}>· {t(k)}</li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </>
      )}

      <SetupWizard
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        overview={overview}
        onSaved={(o) => {
          setOverview(o);
          setSetupOpen(false);
          if (!o.enabled) toast.success(t('ja.toast.saved'), t('ja.toast.savedBody'));
        }}
      />

      <FormModal
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        title={t('ja.consent.title')}
        description={t('ja.consent.desc')}
        icon={ShieldCheck}
        size="sm"
        mobile="auto"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setConsentOpen(false)}>
              {t('ja.consent.no')}
            </button>
            <button type="button" className="btn-primary" disabled={busy === 'toggle'} onClick={() => void toggle(true, true)}>
              {busy === 'toggle' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t('ja.consent.yes')}
            </button>
          </>
        }
      >
        <ul className="space-y-2.5 text-sm text-foreground">
          {[
            t('ja.consent.1'),
            t(overview.settings?.mode === 'AUTO' ? 'ja.consent.auto' : 'ja.consent.review'),
            t('ja.consent.3'),
            premium && overview.settings?.emailApply ? t('ja.consent.email') : null,
            t('ja.consent.5'),
          ]
            .filter((line): line is string => Boolean(line))
            .map((line, i) => (
              <motion.li key={line} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {line}
              </motion.li>
            ))}
        </ul>
      </FormModal>
    </div>
  );
}

// ----------------------------------------------------------------- pieces

function Banner({ tone, icon: Icon, text, action, onAction }: { tone: 'warn' | 'info'; icon: typeof AlertTriangle; text: string; action: string; onAction: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn('flex flex-col gap-2 overflow-hidden rounded-2xl border px-4 py-3 text-sm min-[360px]:flex-row min-[360px]:items-start', tone === 'warn' ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100' : 'border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-100')}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1">{text}</p>
      <button type="button" className="self-start font-semibold underline" onClick={onAction}>
        {action}
      </button>
    </motion.div>
  );
}

function Stat({ icon: Icon, label, value, hint, delay }: { icon: typeof Send; label: string; value: string; hint: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} whileHover={{ y: -2 }} className="min-w-0 rounded-2xl border border-border bg-surface-elevated p-3.5 min-[360px]:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 truncate font-display text-xl tabular-nums text-foreground min-[360px]:text-2xl">{value}</p>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </motion.div>
  );
}

function UpgradeCard({ onUpgrade, busy }: { onUpgrade: () => void; busy: boolean }) {
  const { t } = useLocale();
  const pro = JOB_AGENT_PLANS.PREMIUM;
  const free = JOB_AGENT_PLANS.FREE;
  const perks = [
    { icon: Send, label: fill(t('ja.up.f1'), { a: pro.dailyApplications, b: free.dailyApplications }) },
    { icon: Sparkles, label: t('ja.up.f2') },
    { icon: Mail, label: t('ja.up.f3') },
    { icon: Radar, label: fill(t('ja.up.f4'), { c: pro.runEveryHours }) },
  ] as const;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 via-surface-elevated to-surface-elevated p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-[#3b2400] shadow-lg shadow-amber-500/30">
          <Crown className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{t('ja.up.title')}</p>
          <p className="mt-0.5 text-xs text-muted">{fill(t('ja.up.body'), { a: pro.dailyApplications, b: free.dailyApplications, c: pro.runEveryHours, d: free.runEveryHours })}</p>
          <ul className="mt-3 grid gap-1.5 min-[360px]:grid-cols-2">
            {perks.map((p) => (
              <li key={p.label} className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-background/40 px-2.5 py-1.5 text-[11px] text-foreground">
                <p.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300" />
                <span className="min-w-0 leading-snug">{p.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={onUpgrade} disabled={busy} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {t('ja.up.cta')}
        </button>
      </div>
    </motion.div>
  );
}

export function JobAgentSteps({ className }: { className?: string }) {
  const { t } = useLocale();
  const steps = [
    { icon: FileText, title: t('ja.ob.1t'), body: t('ja.ob.1b') },
    { icon: Target, title: t('ja.ob.2t'), body: t('ja.ob.2b') },
    { icon: Radar, title: t('ja.ob.3t'), body: t('ja.ob.3b') },
  ];
  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4', className)}>
      {steps.map((s, i) => (
        <motion.div
          key={s.title}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-border bg-surface/60 p-4"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <s.icon className="h-4 w-4" />
          </span>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{fill(t('ja.ob.step'), { n: i + 1 })}</p>
          <p className="font-semibold text-foreground">{s.title}</p>
          <p className="mt-1 text-xs text-muted">{s.body}</p>
        </motion.div>
      ))}
    </div>
  );
}

function Onboarding({ onStart }: { onStart: () => void }) {
  const { t } = useLocale();
  return (
    <div className="rounded-[1.5rem] border border-border bg-surface-elevated p-4 min-[360px]:p-5 sm:rounded-[1.75rem] sm:p-7">
      <JobAgentSteps />
      <button type="button" onClick={onStart} className="btn-primary mt-5 w-full justify-center min-[360px]:w-auto">
        <Settings2 className="h-4 w-4" /> {t('ja.setUp')}
      </button>
    </div>
  );
}

function EmptyInbox({ tab, enabled }: { tab: Tab; enabled: boolean }) {
  const { t } = useLocale();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-dashed border-border px-4 py-10 text-center sm:px-6 sm:py-12">
      <Inbox className="mx-auto h-8 w-8 text-muted" />
      <p className="mt-3 font-semibold text-foreground">{t(tab === 'inbox' ? 'ja.empty.inbox' : tab === 'APPLIED' ? 'ja.empty.sent' : 'ja.empty.skipped')}</p>
      <p className="mt-1 text-sm text-muted">{t(tab === 'inbox' ? (enabled ? 'ja.empty.on' : 'ja.empty.off') : 'ja.empty.later')}</p>
    </motion.div>
  );
}

const CHANNEL: Record<JobAgentMatchDto['channel'], { label: TranslationKey; icon: typeof Zap; tone: string }> = {
  easy_apply: { label: 'ja.ch.easy', icon: Zap, tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  email: { label: 'ja.ch.email', icon: Mail, tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  site: { label: 'ja.ch.site', icon: ArrowUpRight, tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
};

function MatchCard({ match, busy, index, onAct }: { match: JobAgentMatchDto; busy: string | null; index: number; onAct: (a: 'approve' | 'skip' | 'applied') => void }) {
  const { t } = useLocale();
  const [showNote, setShowNote] = useState(false);
  const [copied, setCopied] = useState(false);
  const channel = CHANNEL[match.channel];
  const working = busy?.endsWith(match.id);

  const copyNote = () => {
    if (!match.coverNote) return;
    void navigator.clipboard?.writeText(match.coverNote).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
      transition={{ delay: Math.min(index, 8) * 0.04 }}
      className="min-w-0 rounded-2xl border border-border bg-surface-elevated p-3.5 transition hover:border-brand/30 hover:shadow-lg hover:shadow-brand/5 min-[360px]:p-4 sm:p-5"
    >
      <div className="flex gap-3 min-[360px]:gap-4">
        <ScoreRing score={match.score} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold min-[300px]:text-[10.5px]', channel.tone)}>
              <channel.icon className="h-3 w-3" /> {t(channel.label)}
            </span>
            {match.status === 'APPLIED' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> {fill(t('ja.card.sentAgo'), { when: relative(t, match.appliedAt) })}
              </span>
            ) : null}
            {match.status === 'FAILED' ? <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-red-600">{t('ja.card.failed')}</span> : null}
          </div>
          <h3 className="mt-1.5 break-words font-semibold leading-snug text-foreground">{match.title}</h3>
          <p className="break-words text-[13px] text-muted min-[300px]:text-sm">
            {match.company} · {match.location}
          </p>
        </div>
      </div>

      {match.reasons.length ? (
        <ul className="mt-3 space-y-1">
          {match.reasons.map((r) => (
            <li key={r} className="flex gap-1.5 text-[13px] text-foreground/90">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> <span className="min-w-0">{r}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {match.gaps.length ? (
        <ul className="mt-1.5 space-y-1">
          {match.gaps.map((g) => (
            <li key={g} className="flex gap-1.5 text-[12.5px] text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span className="min-w-0">{g}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {match.error ? <p className="mt-2 text-xs text-red-600">{match.error}</p> : null}

      {match.coverNote ? (
        <div className="mt-3">
          <button type="button" onClick={() => setShowNote((v) => !v)} className="inline-flex items-center gap-1 text-left text-xs font-semibold text-brand">
            <Sparkles className="h-3.5 w-3.5 shrink-0" /> {t(showNote ? 'ja.card.hideNote' : 'ja.card.showNote')}
          </button>
          <AnimatePresence>
            {showNote ? (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-2 rounded-xl bg-surface p-3 text-[13px] leading-relaxed text-foreground/90">
                  <p className="whitespace-pre-line break-words">{match.coverNote}</p>
                  <button type="button" onClick={copyNote} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {t(copied ? 'ja.card.copied' : 'ja.card.copy')}
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 min-[300px]:flex-row min-[300px]:flex-wrap min-[300px]:items-center">
        {match.status === 'SUGGESTED' ? (
          <button type="button" disabled={working} onClick={() => onAct('approve')} className="btn-primary justify-center text-sm">
            {busy === `approve:${match.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {t('ja.card.send')}
          </button>
        ) : null}
        {match.status === 'READY' ? (
          <>
            <a
              href={match.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => match.coverNote && navigator.clipboard?.writeText(match.coverNote).catch(() => undefined)}
              className="btn-primary justify-center text-sm"
            >
              <ArrowUpRight className="h-4 w-4" /> {t('ja.card.open')}
            </a>
            <button type="button" disabled={working} onClick={() => onAct('applied')} className="btn-secondary justify-center text-sm">
              {busy === `applied:${match.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t('ja.card.applied')}
            </button>
          </>
        ) : null}
        {match.status === 'APPLIED' || match.status === 'FAILED' ? (
          <a href={match.url} target="_blank" rel="noopener noreferrer" className="btn-secondary justify-center text-sm">
            <ArrowUpRight className="h-4 w-4" /> {t('ja.card.view')}
          </a>
        ) : null}
        {match.status === 'SUGGESTED' || match.status === 'READY' ? (
          <button type="button" disabled={working} onClick={() => onAct('skip')} className="text-sm font-semibold text-muted hover:text-foreground min-[300px]:ml-auto">
            {t('ja.card.skip')}
          </button>
        ) : null}
      </div>
      {match.status === 'READY' && match.coverNote ? <p className="mt-2 text-[11px] text-muted">{t('ja.card.copyHint')}</p> : null}
    </motion.article>
  );
}

// -------------------------------------------------------------- setup wizard

const STEPS = [
  { key: 'ja.wz.step1', icon: FileText },
  { key: 'ja.wz.step2', icon: Target },
  { key: 'ja.wz.step3', icon: Filter },
  { key: 'ja.wz.step4', icon: Zap },
] as const;

function SetupWizard({ open, onClose, overview, onSaved }: { open: boolean; onClose: () => void; overview: JobAgentOverview; onSaved: (o: JobAgentOverview) => void }) {
  const toast = useToast();
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const premium = overview.plan === 'PREMIUM';
  const limits = overview.limits;
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<JobAgentSettings>(DEFAULT_SETTINGS);
  const [resumes, setResumes] = useState<SavedResume[] | null>(null);
  const [ownFile, setOwnFile] = useState<File | null>(null);
  const [saving, setSaving] = useState<null | 'settings' | 'cv'>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setOwnFile(null);
    setForm({
      ...DEFAULT_SETTINGS,
      ...(overview.settings ?? { targetTitles: overview.suggestedTitles.slice(0, limits.maxTargets) }),
      dailyLimit: Math.min(overview.settings?.dailyLimit ?? limits.dailyApplications, limits.dailyApplications),
    });
    resumeApi
      .list()
      .then((list) => {
        const cvs = list.filter((r) => r.kind === 'RESUME');
        setResumes(cvs);
        setForm((f) => ({ ...f, resumeId: f.resumeId ?? cvs[0]?.id ?? null }));
      })
      .catch(() => setResumes([]));
  }, [open, overview, limits]);

  const set = <K extends keyof JobAgentSettings>(key: K, value: JobAgentSettings[K]) => setForm((f) => ({ ...f, [key]: value }));
  const selected = useMemo(() => resumes?.find((r) => r.id === form.resumeId) ?? null, [resumes, form.resumeId]);

  const stepError = (index: number) => {
    if (index === 0 && !form.resumeId && !ownFile) return t('ja.toast.needCv');
    if (index === 1 && !form.targetTitles.length) return t('ja.toast.needTitle');
    return null;
  };

  const go = (next: number) => {
    if (next > step) {
      const problem = stepError(step);
      if (problem) return toast.error(problem);
    }
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const save = async () => {
    const problem = stepError(0) ?? stepError(1);
    if (problem) return toast.error(problem);
    setSaving('settings');
    try {
      let next = await jobAgentApi.save(form);
      setSaving('cv');
      const file = ownFile ?? (selected ? await cvPdf(selected, premium) : null);
      if (file) next = await jobAgentApi.uploadCv(file);
      onSaved(next);
    } catch (err) {
      toast.error(t('ja.toast.saveFail'), err instanceof ApiError ? err.message : err instanceof Error ? err.message : '');
    } finally {
      setSaving(null);
    }
  };

  const strictness = t(form.minScore >= 85 ? 'ja.wz.s1' : form.minScore >= 70 ? 'ja.wz.s2' : form.minScore >= 55 ? 'ja.wz.s3' : 'ja.wz.s4');
  const last = step === STEPS.length - 1;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={t('ja.wz.title')}
      description={t('ja.wz.desc')}
      icon={Radar}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary justify-center" onClick={step === 0 ? onClose : () => go(step - 1)}>
            {step === 0 ? (
              t('ja.wz.cancel')
            ) : (
              <>
                <ArrowLeft className="h-4 w-4" /> {t('ja.wz.back')}
              </>
            )}
          </button>
          {last ? (
            <button type="button" className="btn-primary justify-center" disabled={Boolean(saving)} onClick={() => void save()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving === 'cv' ? t('ja.wz.preparing') : saving ? t('ja.wz.saving') : t('ja.wz.save')}
            </button>
          ) : (
            <button type="button" className="btn-primary justify-center" onClick={() => go(step + 1)}>
              {t('ja.wz.next')} <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </>
      }
    >
      {/* Stepper */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 min-[360px]:gap-2">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => (i < step ? go(i) : i === step + 1 ? go(i) : undefined)}
                className="group flex min-w-0 flex-1 flex-col items-center gap-1.5"
                aria-current={current ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition',
                    current ? 'border-brand bg-brand text-white shadow-lg shadow-brand/30 dark:text-[#071f14]' : done ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted',
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : <s.icon className="h-3.5 w-3.5" />}
                </span>
                <span className={cn('hidden w-full truncate text-center text-[11px] font-semibold min-[400px]:block', current ? 'text-foreground' : 'text-muted')}>{t(s.key)}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-brand to-emerald-400" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
        </div>
        <p className="mt-2 text-center text-xs font-semibold text-foreground min-[400px]:hidden">{t(STEPS[step]!.key)}</p>
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            initial={reduce ? false : { opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            {step === 0 ? (
              <section>
                <p className="text-sm text-muted">{t('ja.wz.cvIntro')}</p>
                {resumes === null ? (
                  <div className="mt-3 h-16 animate-pulse rounded-xl bg-surface" />
                ) : resumes.length ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {resumes.map((r) => {
                      const active = form.resumeId === r.id && !ownFile;
                      return (
                        <motion.button
                          key={r.id}
                          type="button"
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            set('resumeId', r.id);
                            setOwnFile(null);
                          }}
                          className={cn('flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition', active ? 'border-brand bg-brand-soft/50 ring-1 ring-brand' : 'border-border hover:border-brand/40')}
                        >
                          <FileText className="h-5 w-5 shrink-0 text-brand" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground">{r.title}</span>
                            <span className="block text-[11px] text-muted">{fill(t('ja.wz.edited'), { when: relative(t, r.updatedAt) })}</span>
                          </span>
                          {active ? <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" /> : null}
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-sm text-muted">
                    {t('ja.wz.noCv')}{' '}
                    <Link href="/resume-builder/new" className="font-semibold text-brand">
                      {t('ja.wz.build')}
                    </Link>{' '}
                    {t('ja.wz.orUpload')}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => setOwnFile(e.target.files?.[0] ?? null)} />
                  <button type="button" onClick={() => fileRef.current?.click()} className="max-w-full truncate font-semibold text-brand">
                    {ownFile ? fill(t('ja.wz.using'), { file: ownFile.name }) : t('ja.wz.upload')}
                  </button>
                  {ownFile ? (
                    <button type="button" onClick={() => setOwnFile(null)} className="text-muted underline">
                      {t('ja.wz.remove')}
                    </button>
                  ) : null}
                </div>
                {!form.resumeId && ownFile ? <p className="mt-2 text-xs text-amber-600">{t('ja.wz.pickToo')}</p> : null}
              </section>
            ) : null}

            {step === 1 ? (
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Chips
                    label={t('ja.wz.titles')}
                    values={form.targetTitles}
                    onChange={(v) => set('targetTitles', v)}
                    placeholder={t('ja.wz.titlesPh')}
                    ideas={overview.suggestedTitles}
                    ideasLabel={t('ja.wz.fromCv')}
                    max={limits.maxTargets}
                    hint={!premium ? fill(t('ja.wz.titlesHint'), { a: limits.maxTargets, b: JOB_AGENT_PLANS.PREMIUM.maxTargets }) : undefined}
                  />
                </div>
                <Chips label={t('ja.wz.cities')} values={form.locations} onChange={(v) => set('locations', v)} placeholder={t('ja.wz.citiesPh')} ideas={CITY_IDEAS} max={8} />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-foreground">{t('ja.wz.remote')}</span>
                  <div className="mt-1.5 grid grid-cols-1 gap-1 rounded-xl border border-border bg-surface p-1 min-[300px]:grid-cols-3">
                    {(
                      [
                        ['ANY', 'ja.wz.either'],
                        ['REMOTE_ONLY', 'ja.wz.remoteOnly'],
                        ['ONSITE_ONLY', 'ja.wz.onsite'],
                      ] as const
                    ).map(([value, label]) => (
                      <button key={value} type="button" onClick={() => set('remote', value)} className="relative rounded-lg px-2 py-1.5 text-xs font-semibold">
                        {form.remote === value ? <motion.span layoutId="ja-remote" className="absolute inset-0 rounded-lg bg-surface-elevated shadow" transition={{ type: 'spring', stiffness: 400, damping: 32 }} /> : null}
                        <span className={cn('relative', form.remote === value ? 'text-brand' : 'text-muted')}>{t(label)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <span className="text-xs font-semibold text-foreground">{t('ja.wz.types')}</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {JOB_BOARD_TYPES.filter((type) => type !== 'OTHER').map((type) => {
                      const on = form.employmentTypes.includes(type);
                      return (
                        <motion.button
                          key={type}
                          type="button"
                          whileTap={{ scale: 0.94 }}
                          onClick={() => set('employmentTypes', on ? form.employmentTypes.filter((x) => x !== type) : [...form.employmentTypes, type as JobBoardType])}
                          className={cn('rounded-full border px-3 py-1 text-xs font-medium transition', on ? 'border-brand bg-brand text-white dark:text-[#071f14]' : 'border-border text-foreground hover:border-brand')}
                        >
                          {JOB_TYPE_LABEL[type]}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
                <Chips label={t('ja.wz.must')} values={form.mustHave} onChange={(v) => set('mustHave', v)} placeholder={t('ja.wz.mustPh')} max={10} />
                <Chips label={t('ja.wz.exclude')} values={form.exclude} onChange={(v) => set('exclude', v)} placeholder={t('ja.wz.excludePh')} max={20} />
              </section>
            ) : null}

            {step === 3 ? (
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid grid-cols-1 gap-2 sm:col-span-2 sm:grid-cols-2">
                  {(
                    [
                      ['REVIEW', 'ja.wz.reviewT', 'ja.wz.reviewB', ShieldCheck],
                      ['AUTO', 'ja.wz.autoT', 'ja.wz.autoB', Zap],
                    ] as const
                  ).map(([value, title, body, Icon]) => (
                    <motion.button
                      key={value}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => set('mode', value)}
                      className={cn('flex gap-3 rounded-xl border p-3 text-left transition', form.mode === value ? 'border-brand bg-brand-soft/50 ring-1 ring-brand' : 'border-border hover:border-brand/40')}
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">{t(title)}</span>
                        <span className="block text-[11.5px] text-muted">{t(body)}</span>
                      </span>
                    </motion.button>
                  ))}
                </div>
                <label className="block min-w-0">
                  <span className="flex justify-between gap-2 text-xs font-semibold text-foreground">
                    {t('ja.wz.min')} <span className="tabular-nums text-brand">{form.minScore}%</span>
                  </span>
                  <input type="range" min={50} max={90} step={5} value={form.minScore} onChange={(e) => set('minScore', Number(e.target.value))} className="mt-2 w-full accent-[#0f766e]" />
                  <span className="text-[11px] text-muted">{strictness}</span>
                </label>
                <label className="block min-w-0">
                  <span className="flex justify-between gap-2 text-xs font-semibold text-foreground">
                    {t('ja.wz.perDay')} <span className="tabular-nums text-brand">{form.dailyLimit}</span>
                  </span>
                  <input type="range" min={1} max={limits.dailyApplications} value={form.dailyLimit} onChange={(e) => set('dailyLimit', Number(e.target.value))} className="mt-2 w-full accent-[#0f766e]" />
                  <span className="text-[11px] text-muted">{fill(t('ja.wz.allow'), { n: limits.dailyApplications })}</span>
                </label>
                <PremiumToggle locked={!premium} on={form.coverNotes} onChange={(v) => set('coverNotes', v)} icon={Sparkles} title={t('ja.wz.notesT')} body={t('ja.wz.notesB')} />
                <PremiumToggle locked={!premium} on={form.emailApply} onChange={(v) => set('emailApply', v)} icon={Mail} title={t('ja.wz.emailT')} body={t('ja.wz.emailB')} />
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-foreground">{t('ja.wz.phone')}</span>
                  <input value={form.phone} onChange={(e) => set('phone', e.target.value.slice(0, 30))} className="input-field mt-1" placeholder="+234 …" inputMode="tel" />
                </label>
                <div className="rounded-2xl border border-brand/20 bg-brand-soft/30 p-3 text-xs sm:col-span-2">
                  <p className="font-semibold text-foreground">{t('ja.wz.summary')}</p>
                  <p className="mt-1 break-words text-muted">
                    {selected?.title ?? ownFile?.name ?? '—'} · {form.targetTitles.join(', ') || '—'} · {form.locations.join(', ') || t('ja.side.anywhere')} · {t(form.mode === 'AUTO' ? 'ja.mode.auto' : 'ja.mode.review')} · {form.minScore}% · {form.dailyLimit}/day
                  </p>
                </div>
                {!overview.aiAvailable && premium ? <p className="text-[11px] text-muted sm:col-span-2">{t('ja.wz.aiSoon')}</p> : null}
              </section>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </FormModal>
  );
}

function PremiumToggle({ locked, on, onChange, icon: Icon, title, body }: { locked: boolean; on: boolean; onChange: (v: boolean) => void; icon: typeof Mail; title: string; body: string }) {
  const { t } = useLocale();
  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => onChange(!on)}
      className={cn('flex min-w-0 gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed', !locked && on ? 'border-brand bg-brand-soft/40' : 'border-border', locked && 'opacity-70')}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-foreground">
          {title}
          {locked ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 px-1.5 text-[9.5px] font-bold uppercase text-amber-700 dark:text-amber-300">
              <Lock className="h-2.5 w-2.5" /> {t('ja.premium')}
            </span>
          ) : null}
        </span>
        <span className="block text-[11.5px] text-muted">{body}</span>
      </span>
      {!locked ? (
        <span className={cn('mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition', on ? 'border-brand bg-brand' : 'border-border')}>{on ? <Check className="h-3 w-3 text-white" /> : null}</span>
      ) : null}
    </button>
  );
}
