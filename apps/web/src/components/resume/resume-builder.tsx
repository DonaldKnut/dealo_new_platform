'use client';

import {
  RESUME_COLORS,
  RESUME_FONTS,
  RESUME_TEMPLATES,
  coverLetterDataSchema,
  isPremiumColor,
  isPremiumFont,
  isPremiumTemplate,
  resumeDataSchema,
  resumeStyleSchema,
  type CoverLetterData,
  type ResumeData,
  type ResumeStyle,
} from '@dealo/shared';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  CloudOff,
  Download,
  Eye,
  GraduationCap,
  Layers,
  Loader2,
  Mail,
  Maximize2,
  Minus,
  Palette,
  Plus,
  Share2,
  Target,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { BrandLogo } from '@/components/brand-logo';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useToast } from '@/components/ui/toast';
import type { AuthSessionUser } from '@/hooks/use-auth-session';
import { ApiError } from '@/lib/api';
import { fetchAuthMe } from '@/lib/dashboard-api';
import { jobsApi } from '@/lib/jobs-api';
import { DRAFT_KEY, LETTER_DRAFT_KEY, rememberReturnTo, resumeApi, type ResumeKind, type ResumePlan, type SaveBody } from '@/lib/resume-api';
import { cn } from '@/lib/utils';

import { CoverLetterEditor } from './cover-letter-editor';
import { DesignPanel } from './design-panel';
import { DEFAULT_STYLE, completeness, emptyResume } from './resume-content';
import { CSS_FAMILY } from './resume-fonts';
import { buildPdf, pdfFileName, saveBlob } from './resume-pdf';
import { ResumePreview, type PreviewDoc } from './resume-preview';
import { AuthGateSheet, PremiumSheet } from './resume-sheets';
import { DetailsEditor, EducationEditor, ExperienceEditor, MoreEditor, SkillsEditor, SummaryEditor, type AiHooks, type Update } from './section-editors';
import { TailorPanel } from './tailor-panel';

type Step = 'details' | 'summary' | 'experience' | 'education' | 'skills' | 'more' | 'design' | 'tailor' | 'letter';

const RESUME_STEPS: Array<{ id: Step; label: string; icon: typeof UserRound; hint: string }> = [
  { id: 'details', label: 'Details', icon: UserRound, hint: 'Your name and how to reach you.' },
  { id: 'summary', label: 'Profile', icon: BookOpen, hint: 'A short paragraph that sells you.' },
  { id: 'experience', label: 'Jobs', icon: Briefcase, hint: 'Most recent job first. Use short points.' },
  { id: 'education', label: 'Education', icon: GraduationCap, hint: 'Schools, colleges and training.' },
  { id: 'skills', label: 'Skills', icon: Wrench, hint: 'Tools, trades and strengths.' },
  { id: 'more', label: 'More', icon: Layers, hint: 'Licences, languages, projects, references.' },
  { id: 'design', label: 'Design', icon: Palette, hint: 'Template, colour, font and order.' },
  { id: 'tailor', label: 'Fit to a job', icon: Target, hint: 'Match your CV to a job advert.' },
];

const LETTER_STEPS: typeof RESUME_STEPS = [
  { id: 'letter', label: 'Letter', icon: Mail, hint: 'Who it is for and what you say.' },
  { id: 'design', label: 'Design', icon: Palette, hint: 'Colour and font.' },
];

const emptyLetter = (): CoverLetterData => coverLetterDataSchema.parse({});

function StepArt({ icon: Icon }: { icon: typeof UserRound }) {
  return (
    <span aria-hidden className="relative hidden h-14 w-14 shrink-0 min-[300px]:block">
      <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full text-brand">
        <circle cx="46" cy="10" r="8" fill="currentColor" opacity="0.14" />
        <circle cx="8" cy="46" r="5" fill="currentColor" opacity="0.18" />
        <path d="M4 20 C 14 6, 30 2, 44 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
        <circle cx="50" cy="40" r="2" fill="currentColor" opacity="0.4" />
      </svg>
      <motion.span
        initial={{ scale: 0.8, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        className="absolute inset-2 inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-emerald-400 text-white shadow-lg shadow-brand/25 dark:text-[#071f14]"
      >
        <Icon className="h-5 w-5" />
      </motion.span>
    </span>
  );
}

type SaveState = 'idle' | 'saving' | 'saved' | 'device' | 'error';

export function ResumeBuilder({ id, kind: initialKind = 'RESUME' }: { id?: string; kind?: ResumeKind }) {
  const router = useRouter();
  const toast = useToast();
  const [kind, setKind] = useState<ResumeKind>(initialKind);
  const [title, setTitle] = useState(initialKind === 'RESUME' ? 'My CV' : 'Cover letter');
  const [style, setStyle] = useState<ResumeStyle>(DEFAULT_STYLE);
  const [data, setData] = useState<ResumeData>(emptyResume);
  const [letter, setLetter] = useState<CoverLetterData>(emptyLetter);
  const [savedId, setSavedId] = useState<string | null>(id ?? null);
  const [loaded, setLoaded] = useState(false);
  const [me, setMe] = useState<AuthSessionUser | null | undefined>(undefined);
  const [plan, setPlan] = useState<ResumePlan | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [step, setStep] = useState<Step>(initialKind === 'RESUME' ? 'details' : 'letter');
  const [previewOpen, setPreviewOpen] = useState(false);
  const closePreview = useCallback(() => setPreviewOpen(false), []);
  const [premiumSheet, setPremiumSheet] = useState<{ reason?: string; useFree?: boolean } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState<Blob | null>(null);
  const [sharing, setSharing] = useState(false);
  const [jobAdvert, setJobAdvert] = useState('');
  const version = useRef(0);
  const savingRef = useRef(false);
  const pendingDownload = useRef(false);
  const limitHit = useRef(false);
  const activeTab = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeTab.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const premium = Boolean(plan?.premium);
  const steps = kind === 'RESUME' ? RESUME_STEPS : LETTER_STEPS;
  const draftKey = kind === 'RESUME' ? DRAFT_KEY : LETTER_DRAFT_KEY;
  const doc: PreviewDoc = useMemo(
    () => (kind === 'RESUME' ? { kind: 'RESUME', data, style } : { kind: 'COVER_LETTER', letter, style }),
    [kind, data, letter, style],
  );

  // ---------------------------------------------------------------- loading

  useEffect(() => {
    let active = true;
    (async () => {
      const user = await fetchAuthMe().catch(() => null);
      if (!active) return;
      setMe(user);
      if (user) resumeApi.plan().then((p) => active && setPlan(p)).catch(() => undefined);

      if (id) {
        try {
          const saved = await resumeApi.get(id);
          if (!active) return;
          setKind(saved.kind);
          setTitle(saved.title);
          setStyle(resumeStyleSchema.parse({ template: saved.template, accentColor: saved.accentColor, font: saved.font }));
          if (saved.kind === 'RESUME') setData(resumeDataSchema.parse(saved.data));
          else {
            setLetter(coverLetterDataSchema.parse(saved.data));
            setStep('letter');
          }
          setSaveState('saved');
        } catch {
          toast.error('Could not open this CV');
          router.replace('/resume-builder/new');
          return;
        }
      } else {
        try {
          const raw = window.localStorage.getItem(initialKind === 'RESUME' ? DRAFT_KEY : LETTER_DRAFT_KEY);
          if (raw) {
            const draft = JSON.parse(raw) as { title?: string; style?: unknown; data?: unknown };
            if (draft.title) setTitle(draft.title);
            setStyle(resumeStyleSchema.parse(draft.style ?? {}));
            if (initialKind === 'RESUME') setData(resumeDataSchema.parse(draft.data ?? {}));
            else setLetter(coverLetterDataSchema.parse(draft.data ?? {}));
            setSaveState('device');
          } else if (user) {
            const fullName = `${user.firstName} ${user.lastName}`.trim();
            if (initialKind === 'RESUME') setData((d) => ({ ...d, personal: { ...d.personal, fullName, email: user.email } }));
            else setLetter((l) => ({ ...l, fullName, email: user.email }));
          }
        } catch {
          // A broken draft is simply ignored.
        }
        const params = new URLSearchParams(window.location.search);
        pendingDownload.current = params.get('download') === '1';
        const picked = RESUME_TEMPLATES.find((t) => t.id === params.get('template'));
        if (picked) setStyle((s) => ({ ...s, template: picked.id }));
      }
      const listingId = new URLSearchParams(window.location.search).get('job');
      if (listingId && initialKind === 'RESUME') {
        jobsApi
          .detail(listingId)
          .then((job) => {
            if (!active) return;
            const text = job.description.replace(/<\/(p|li|h\d)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
            setJobAdvert(`${job.title} at ${job.company}\n\n${[...job.mustHaves.map((m) => `- ${m}`), text].join('\n')}`.slice(0, 8000));
            setStep('tailor');
          })
          .catch(() => undefined);
      }
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------------------------------------------------------------- saving

  const body = useCallback((): SaveBody => ({ kind, title: title.trim() || 'My CV', style, data: kind === 'RESUME' ? data : letter }), [kind, title, style, data, letter]);

  const hasContent = kind === 'RESUME' ? Boolean(data.personal.fullName || data.summary || data.experience.length) : Boolean(letter.body || letter.company);

  /** Saves to the account when signed in; returns the saved id (or null if only on this device). */
  const saveToAccount = useCallback(async (): Promise<string | null> => {
    if (!me || savingRef.current) return savedId;
    savingRef.current = true;
    setSaveState('saving');
    try {
      if (savedId) {
        await resumeApi.update(savedId, body());
        setSaveState('saved');
        return savedId;
      }
      const created = await resumeApi.create(body());
      setSavedId(created.id);
      window.localStorage.removeItem(draftKey);
      window.history.replaceState(null, '', `/resume-builder/${created.id}`);
      setSaveState('saved');
      setPlan((p) => (p ? { ...p, used: { ...p.used, [kind === 'RESUME' ? 'resumes' : 'coverLetters']: p.used[kind === 'RESUME' ? 'resumes' : 'coverLetters'] + 1 } } : p));
      return created.id;
    } catch (err) {
      const limit = err instanceof ApiError && err.status === 403;
      limitHit.current = limit;
      setLimitMessage(limit ? err.message : null);
      setSaveState(limit ? 'device' : 'error');
      return null;
    } finally {
      savingRef.current = false;
    }
  }, [me, savedId, body, draftKey, kind]);

  useEffect(() => {
    if (!loaded) return;
    version.current += 1;
    if (version.current === 1) return;
    const local = window.setTimeout(() => {
      if (!savedId) {
        window.localStorage.setItem(draftKey, JSON.stringify({ title, style, data: kind === 'RESUME' ? data : letter, at: Date.now() }));
        if (!me) setSaveState('device');
      }
    }, 400);
    const remote = me && hasContent && !limitHit.current ? window.setTimeout(() => void saveToAccount(), 1400) : null;
    return () => {
      window.clearTimeout(local);
      if (remote) window.clearTimeout(remote);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, letter, style, title, loaded]);

  // ---------------------------------------------------------------- download

  const usesPremium =
    isPremiumTemplate(style.template) ||
    isPremiumFont(style.font) ||
    isPremiumColor(style.accentColor) ||
    (kind === 'RESUME' && data.design.art !== 'none') ||
    kind === 'COVER_LETTER';

  const download = useCallback(async () => {
    if (!me) {
      setAuthOpen(true);
      return;
    }
    if (usesPremium && !premium) {
      setPremiumSheet({
        reason: kind === 'COVER_LETTER' ? 'Cover letters are part of Premium.' : 'This design uses premium features. Switch to a free design to download now, or go premium.',
        useFree: kind === 'RESUME',
      });
      return;
    }
    setDownloading(true);
    try {
      const idNow = (await saveToAccount()) ?? savedId;
      const blob = await buildPdf(doc, !premium, title);
      saveBlob(blob, pdfFileName(doc));
      if (idNow) void resumeApi.downloaded(idNow).catch(() => undefined);
      setDone(blob);
    } catch (err) {
      toast.error('Could not make the PDF', err instanceof Error ? err.message : '');
    } finally {
      setDownloading(false);
    }
  }, [me, usesPremium, premium, kind, saveToAccount, savedId, doc, title, toast]);

  useEffect(() => {
    if (loaded && me && plan && pendingDownload.current) {
      pendingDownload.current = false;
      window.history.replaceState(null, '', window.location.pathname);
      void download();
    }
  }, [loaded, me, plan, download]);

  const goAuth = (to: 'register' | 'login') => {
    window.localStorage.setItem(draftKey, JSON.stringify({ title, style, data: kind === 'RESUME' ? data : letter, at: Date.now() }));
    const back = `${kind === 'RESUME' ? '/resume-builder/new' : '/resume-builder/cover-letter/new'}?download=1`;
    rememberReturnTo(back);
    router.push(`/auth/${to}?next=${encodeURIComponent(back)}`);
  };

  const useFreeDesign = () => {
    setStyle((s) => ({
      template: isPremiumTemplate(s.template) ? 'classic' : s.template,
      font: isPremiumFont(s.font) ? 'helvetica' : s.font,
      accentColor: RESUME_COLORS[0],
    }));
    setData((d) => ({ ...d, design: { ...d.design, art: 'none' } }));
    setPremiumSheet(null);
    toast.success('Switched to a free design', 'Tap Download again.');
  };

  const shareToDealo = async () => {
    if (!savedId || !done) return;
    setSharing(true);
    try {
      await resumeApi.uploadCvToProfile(done, pdfFileName(doc));
      await resumeApi.shareProfile(savedId);
      toast.success('Shared with Dealo recruiters', 'Your profile and CV are up to date.');
      setDone(null);
    } catch (err) {
      toast.error('Could not share', err instanceof ApiError ? err.message : '');
    } finally {
      setSharing(false);
    }
  };

  // ---------------------------------------------------------------- AI

  const locked = useCallback(() => setPremiumSheet({ reason: 'AI writing help is part of Premium.' }), []);
  const ai: AiHooks = useMemo(
    () => ({
      premium,
      onLocked: () => (me ? locked() : setAuthOpen(true)),
      summary: async () => {
        try {
          return (await resumeApi.aiSummary(data)).summary;
        } catch (err) {
          toast.error('AI is busy', err instanceof ApiError ? err.message : '');
          return null;
        }
      },
      bullets: async (role, company, text) => {
        try {
          return (await resumeApi.aiBullets(role, company, text)).bullets;
        } catch (err) {
          toast.error('AI is busy', err instanceof ApiError ? err.message : '');
          return null;
        }
      },
    }),
    [premium, me, locked, data, toast],
  );

  const update: Update = useCallback((fn) => setData((d) => fn(d)), []);
  const index = steps.findIndex((s) => s.id === step);
  const current = steps[index] ?? steps[0];
  const score = kind === 'RESUME' ? completeness(data) : null;

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const statusLabel = {
    idle: '',
    saving: 'Saving…',
    saved: 'Saved',
    device: me ? 'Saved on this device' : 'Saved on this device',
    error: 'Not saved',
  }[saveState];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 pt-[var(--safe-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-1.5 px-2 min-[340px]:gap-2 min-[340px]:px-4">
          <Link
            href={me ? '/dashboard/resumes' : '/resume-builder'}
            aria-label="Back"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="hidden shrink-0 sm:block">
            <BrandLogo href="/" />
          </div>
          <div className="min-w-0 flex-1">
            <input
              aria-label="Name of this document"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              className="w-full truncate rounded-lg bg-transparent px-1.5 py-1 text-sm font-semibold outline-none hover:bg-surface focus:bg-surface"
            />
            <p className="flex items-center gap-1 px-1.5 text-[10px] text-muted">
              {saveState === 'saving' ? <Loader2 className="h-3 w-3 animate-spin" /> : saveState === 'saved' ? <Check className="h-3 w-3 text-brand" /> : saveState === 'device' || saveState === 'error' ? <CloudOff className="h-3 w-3" /> : null}
              <span className="truncate">{statusLabel}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            aria-label="Preview"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 text-sm font-semibold transition hover:border-brand hover:text-brand"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden min-[400px]:inline">Preview</span>
          </button>
          <button type="button" onClick={() => void download()} disabled={downloading} className="btn-primary h-9 shrink-0 px-3 py-0 text-sm">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="hidden min-[340px]:inline">{downloading ? 'Making PDF…' : 'Download'}</span>
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-2 pb-28 pt-3 min-[340px]:px-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:pb-10">
        <div className="min-w-0">
          <nav aria-label="CV sections" className="sticky top-[calc(3.5rem+var(--safe-top))] z-30 -mx-2 mb-3 bg-background/95 px-2 py-2 backdrop-blur min-[340px]:-mx-4 min-[340px]:px-4">
            <div className="scrollbar-none flex gap-1 overflow-x-auto pb-0.5">
              {steps.map((s) => {
                const Icon = s.icon;
                const active = s.id === step;
                return (
                  <button
                    key={s.id}
                    ref={active ? activeTab : undefined}
                    type="button"
                    onClick={() => setStep(s.id)}
                    className={cn('relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors', active ? 'text-white dark:text-[#071f14]' : 'text-muted hover:text-foreground')}
                  >
                    {active ? <motion.span layoutId="rb-step" className="absolute inset-0 rounded-full bg-brand" transition={{ type: 'spring', stiffness: 420, damping: 34 }} /> : null}
                    <Icon className="relative z-10 h-3.5 w-3.5" />
                    <span className="relative z-10">{s.label}</span>
                  </button>
                );
              })}
            </div>
            {score ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/60">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-brand to-emerald-400" animate={{ width: `${score.score}%` }} transition={{ duration: 0.5 }} />
                </div>
                <span className="shrink-0 text-[10px] font-semibold tabular-nums text-muted">{score.score}%</span>
              </div>
            ) : null}
            {score?.nextTip ? <p className="mt-1 truncate text-[11px] text-muted">Next: {score.nextTip}</p> : null}
          </nav>

          {limitMessage ? (
            <div className="mb-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-900 dark:text-amber-100">
              {limitMessage} This one is kept on this device and you can still download it.{' '}
              <Link href="/dashboard/resumes" className="font-semibold underline">
                See my saved CVs
              </Link>
            </div>
          ) : null}
          <section className="rounded-[1.5rem] border border-border bg-surface-elevated/70 p-3 shadow-sm min-[340px]:p-5">
            <div className="mb-4 flex items-center gap-3">
              <StepArt key={current.id} icon={current.icon} />
              <div className="min-w-0">
                <h1 className="font-display text-xl text-foreground min-[340px]:text-2xl">{current.label}</h1>
                <p className="text-xs text-muted">{current.hint}</p>
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                {step === 'details' ? <DetailsEditor data={data} update={update} /> : null}
                {step === 'summary' ? <SummaryEditor data={data} update={update} ai={ai} /> : null}
                {step === 'experience' ? <ExperienceEditor data={data} update={update} ai={ai} /> : null}
                {step === 'education' ? <EducationEditor data={data} update={update} /> : null}
                {step === 'skills' ? <SkillsEditor data={data} update={update} /> : null}
                {step === 'more' ? <MoreEditor data={data} update={update} /> : null}
                {step === 'tailor' ? (
                  <TailorPanel key={jobAdvert ? 'job' : 'blank'} data={data} update={update} premium={premium} onLocked={ai.onLocked} initialAdvert={jobAdvert} />
                ) : null}
                {step === 'letter' ? (
                  <CoverLetterEditor letter={letter} onChange={setLetter} premium={premium} signedIn={Boolean(me)} onLocked={ai.onLocked} />
                ) : null}
                {step === 'design' ? (
                  <DesignPanel
                    data={data}
                    style={style}
                    premium={premium}
                    showTemplates={kind === 'RESUME'}
                    onStyle={setStyle}
                    onOrder={(sectionOrder) => setData((d) => ({ ...d, sectionOrder }))}
                    onDesign={kind === 'RESUME' ? (design) => setData((d) => ({ ...d, design })) : undefined}
                  />
                ) : null}
              </motion.div>
            </AnimatePresence>
            <div className="mt-6 flex items-center justify-between gap-2 border-t border-border pt-4">
              <button type="button" disabled={index <= 0} onClick={() => setStep(steps[index - 1].id)} className="btn-secondary px-3 text-sm disabled:opacity-40">
                <ArrowLeft className="h-4 w-4" /> <span className="hidden min-[300px]:inline">Back</span>
              </button>
              {index < steps.length - 1 ? (
                <button type="button" onClick={() => setStep(steps[index + 1].id)} className="btn-primary px-3 text-sm">
                  <span>{steps[index + 1].label}</span> <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" onClick={() => void download()} className="btn-primary px-3 text-sm">
                  <Download className="h-4 w-4" /> Download
                </button>
              )}
            </div>
          </section>

          {me && plan && !premium ? (
            <button
              type="button"
              onClick={() => setPremiumSheet({})}
              className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-300/15 via-surface-elevated to-brand/10 p-3.5 text-left shadow-sm"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-[#3b2400] shadow-md shadow-amber-500/25">
                <Palette className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Unlock Dealo Premium</span>
                <span className="block text-xs text-muted">Editorial fonts, every template, AI writing, Job Agent boosts, clean PDF.</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
            </button>
          ) : null}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-[calc(4.5rem+var(--safe-top))] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-[1.75rem] border border-border/80 bg-gradient-to-b from-slate-100/90 via-slate-50/70 to-slate-100/90 p-4 xl:p-5 shadow-inner dark:from-[#0a2018] dark:via-[#081a13] dark:to-[#05140e]">
            {/* Studio Header Bar */}
            <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-elevated px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm ring-1 ring-border/80">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Live A4 Studio
                </span>
                <span className="hidden xl:inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: style.accentColor }} />
                  <span className="capitalize">{style.template}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!premium ? (
                  <span className="hidden items-center gap-1 rounded-md bg-surface-elevated/80 px-2 py-0.5 text-[10px] font-medium text-muted ring-1 ring-border/50 xl:inline-flex">
                    Free Tier · Standard PDF
                  </span>
                ) : (
                  <span className="hidden items-center gap-1 rounded-md bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 xl:inline-flex">
                    Premium clean PDF
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm ring-1 ring-border/80 transition hover:text-brand hover:ring-brand/50"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> Expand
                </button>
              </div>
            </div>

            {/* Document Paper Canvas Frame */}
            <div className="overflow-hidden rounded-xl bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/10">
              <ResumePreview doc={doc} branding={!premium} />
            </div>

            {/* Document Metadata Micro-Footer */}
            <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-muted">
              <span>Standard A4 · 210 × 297 mm</span>
              <span>100% Vector Quality</span>
            </div>
          </div>
        </aside>
      </div>

      <PreviewModal
        open={previewOpen}
        onClose={closePreview}
        doc={doc}
        branding={!premium}
        onDownload={() => void download()}
        downloading={downloading}
        style={style}
        onStyle={setStyle}
        premium={premium}
      />

      <PremiumSheet
        open={Boolean(premiumSheet)}
        onClose={() => setPremiumSheet(null)}
        reason={premiumSheet?.reason}
        onUseFree={premiumSheet?.useFree ? useFreeDesign : undefined}
        offer={plan?.offer}
      />
      <AuthGateSheet open={authOpen} onClose={() => setAuthOpen(false)} onGo={goAuth} />

      <BottomSheet open={Boolean(done)} onClose={() => setDone(null)} title="Your PDF is ready">
        <div className="space-y-4 py-2">
          <p className="text-sm text-foreground">Check your downloads folder. You can edit and download again any time.</p>
          {plan?.canShareToProfile && kind === 'RESUME' && savedId ? (
            <div className="rounded-2xl border border-brand/30 bg-brand-soft/60 p-3">
              <p className="text-sm font-semibold text-foreground">Let Dealo find you jobs?</p>
              <p className="mt-1 text-xs text-muted">We add this CV to your Dealo profile so our recruiters and partner companies can match you to roles.</p>
              <button type="button" className="btn-primary mt-3 w-full text-sm" disabled={sharing} onClick={shareToDealo}>
                {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} Share with Dealo recruiters
              </button>
            </div>
          ) : null}
          {kind === 'RESUME' ? (
            <Link href="/jobs" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition hover:border-brand">
              <Briefcase className="h-5 w-5 shrink-0 text-brand" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Find jobs to apply with this CV</span>
                <span className="block text-xs text-muted">Fresh jobs every day. Dealo jobs take your CV in one tap.</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
            </Link>
          ) : null}
          <button type="button" className="btn-secondary w-full text-sm" onClick={() => setDone(null)}>
            Done
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

/** A4 at 100% is 794px wide on screen; "Fit" uses the window width instead. */
const A4_PX = 794;
const ZOOMS = [0.6, 0.75, 1, 1.25] as const;

function PreviewModal({
  open,
  onClose,
  doc,
  branding,
  onDownload,
  downloading,
  style,
  onStyle,
  premium,
}: {
  open: boolean;
  onClose: () => void;
  doc: PreviewDoc;
  branding: boolean;
  onDownload: () => void;
  downloading: boolean;
  style: ResumeStyle;
  onStyle: (s: ResumeStyle) => void;
  premium: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState<'fit' | (typeof ZOOMS)[number]>('fit');
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!mounted) return null;

  const step = (dir: 1 | -1) =>
    setZoom((z) => {
      const index = z === 'fit' ? ZOOMS.indexOf(0.75) : ZOOMS.indexOf(z);
      return ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, index + dir))]!;
    });
  const pageWidth = zoom === 'fit' ? `min(100%, ${A4_PX}px)` : `${Math.round(A4_PX * zoom)}px`;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="CV preview"
          className="fixed inset-0 z-[150] flex flex-col bg-slate-900/80 backdrop-blur-sm dark:bg-[#020c08]/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-background/95 px-2 py-2 pt-[max(0.5rem,var(--safe-top))] shadow-lg min-[340px]:px-4"
          >
            <button type="button" onClick={onClose} aria-label="Close preview" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border hover:bg-surface">
              <X className="h-4 w-4" />
            </button>
            <span className="hidden text-sm font-semibold sm:inline">Preview</span>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {doc.kind === 'RESUME' ? (
                <label className="hidden items-center gap-1 sm:flex">
                  <span className="sr-only">Template</span>
                  <select
                    value={style.template}
                    onChange={(e) => onStyle({ ...style, template: e.target.value as ResumeStyle['template'] })}
                    className="h-9 rounded-full border border-border bg-surface-elevated px-3 text-xs font-semibold"
                  >
                    {RESUME_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.premium && !premium ? ' (Premium)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="flex items-center">
                <span className="sr-only">Font</span>
                <select
                  value={style.font}
                  onChange={(e) => onStyle({ ...style, font: e.target.value as ResumeStyle['font'] })}
                  className="h-9 max-w-[9.5rem] rounded-full border border-border bg-surface-elevated px-3 text-xs font-semibold"
                  style={{ fontFamily: CSS_FAMILY[style.font] }}
                >
                  {RESUME_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                      {f.premium && !premium ? ' (Premium)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center rounded-full border border-border bg-surface-elevated">
                <button type="button" aria-label="Zoom out" onClick={() => step(-1)} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:text-brand">
                  <Minus className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setZoom('fit')} className={cn('min-w-[3.25rem] text-xs font-semibold tabular-nums', zoom === 'fit' && 'text-brand')}>
                  {zoom === 'fit' ? 'Fit' : `${Math.round(zoom * 100)}%`}
                </button>
                <button type="button" aria-label="Zoom in" onClick={() => step(1)} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:text-brand">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button type="button" onClick={onDownload} disabled={downloading} className="btn-primary h-9 px-3 py-0 text-sm">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                <span className="hidden min-[340px]:inline">Download PDF</span>
              </button>
            </div>
          </motion.div>
          <div className="flex-1 overflow-auto px-2 py-4 pb-[calc(1.5rem+var(--safe-bottom))] min-[340px]:px-4 sm:py-8" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="mx-auto overflow-hidden rounded-md bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] ring-1 ring-black/10"
              style={{ width: pageWidth }}
            >
              <ResumePreview doc={doc} branding={branding} />
            </motion.div>
            <p className="mt-4 text-center text-xs text-white/70">A4 page · what you see is what downloads{branding ? ' · free PDFs include a small Dealo footer' : ''}</p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
