'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Bot, CalendarClock, Check, Globe, Kanban, Lightbulb, Sparkles, Users, X, type LucideIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

const TOUR_KEY = 'dealo.ats.tour.v1';
const TIPS_OFF_KEY = 'dealo.ats.tips.off';
const TIPS_SEEN_KEY = 'dealo.ats.tips.seen';

/** One-line help for each hiring section, used by the tab tooltips and the tour. */
export const ATS_TAB_HELP: Record<string, string> = {
  '/dashboard/ats': 'Your job posts. Open one to see its applicants on a board.',
  '/dashboard/ats/agents': 'AI helpers that screen, follow up and schedule. Nothing is sent until you approve it.',
  '/dashboard/ats/interviews': 'Upcoming interviews and the invites you have sent.',
  '/dashboard/ats/reports': 'Where applicants come from and how quickly you hire.',
  '/dashboard/ats/team': 'Invite colleagues and choose what each person can do.',
  '/dashboard/ats/settings': 'Set up your public careers page: logo, intro and who can see it.',
};

export const JOB_STATUS_HELP: Record<string, string> = {
  OPEN: 'Open: live on your careers page and taking applications.',
  DRAFT: 'Draft: only your team can see it. Publish it from the ••• menu.',
  PAUSED: 'Paused: hidden from applicants for now. Re-open it any time.',
  CLOSED: 'Closed: no new applications. Everyone who applied is kept.',
};

type Step = { href: string; icon: LucideIcon; title: string; body: string };

const STEPS: Step[] = [
  { href: '/dashboard/ats', icon: Kanban, title: 'Post a job', body: 'Start in Jobs. Write the job once and you get a link to share on WhatsApp, LinkedIn or your website. Applicants land here.' },
  { href: '/dashboard/ats', icon: Users, title: 'Move people along', body: 'Open a job to see a board of applicants. Drag a card to the next stage, or open it to rate, add notes and send emails.' },
  { href: '/dashboard/ats/agents', icon: Bot, title: 'Let agents help', body: 'Turn on AI agents to screen new applicants, chase replies and suggest interview times. You approve every step.' },
  { href: '/dashboard/ats/interviews', icon: CalendarClock, title: 'Book interviews', body: 'Schedule from an applicant and they get an email invite. All upcoming interviews are listed here.' },
  { href: '/dashboard/ats/team', icon: Users, title: 'Bring your team', body: 'Invite colleagues as Admin, Recruiter or Hiring manager so everyone sees the same applicants.' },
  { href: '/dashboard/ats/settings', icon: Globe, title: 'Polish your careers page', body: 'Add your logo and a short intro. A good careers page gets more, and better, applicants.' },
];

const TIPS: Array<{ match: (path: string) => boolean; tips: string[] }> = [
  {
    match: (p) => p.startsWith('/dashboard/ats/jobs/'),
    tips: [
      'Drag an applicant card to the next stage. Open the card to rate, add notes or send an email.',
      'Not sure who to call first? Ask the Screening agent to review this job’s applicants.',
    ],
  },
  { match: (p) => p.startsWith('/dashboard/ats/agents'), tips: ['Check the inbox here: agent suggestions wait for your OK before anything is sent.', 'Start with the Screening agent; it reviews new applicants against the job for you.'] },
  { match: (p) => p.startsWith('/dashboard/ats/interviews'), tips: ['Schedule interviews from an applicant’s card. They get the invite by email.'] },
  { match: (p) => p.startsWith('/dashboard/ats/reports'), tips: ['See which source brings applicants who get hired, then share your jobs there more.'] },
  { match: (p) => p.startsWith('/dashboard/ats/team'), tips: ['Hiring managers can review applicants without changing workspace settings.'] },
  { match: (p) => p.startsWith('/dashboard/ats/settings'), tips: ['Add your logo and a two-line intro; applicants trust a careers page that looks like you.'] },
  {
    match: (p) => p === '/dashboard/ats',
    tips: [
      'Copy a job’s link from its ••• menu and share it on WhatsApp or LinkedIn.',
      'Drafts are only visible to your team. Publish when you are ready for applicants.',
      'Pausing a job hides it from your careers page but keeps every applicant.',
    ],
  },
];

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode: the guide just shows again next time */
  }
}

/** First-visit walkthrough plus a small tip that fades in now and then. */
export function AtsGuide({ open, onOpenChange, onHighlight }: { open: boolean; onOpenChange: (open: boolean) => void; onHighlight: (href: string | null) => void }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [tip, setTip] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (read(TOUR_KEY) !== 'done') {
      const t = window.setTimeout(() => onOpenChange(true), 1200);
      return () => window.clearTimeout(t);
    }
  }, [onOpenChange]);

  useEffect(() => {
    onHighlight(open ? STEPS[step].href : null);
  }, [open, step, onHighlight]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, STEPS.length - 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A page tip appears once per page per visit, a little after the page settles, then fades away.
  useEffect(() => {
    setTip(null);
    if (open || read(TIPS_OFF_KEY) === '1' || read(TOUR_KEY) !== 'done') return;
    const group = TIPS.find((g) => g.match(pathname));
    if (!group) return;
    const seenKey = `${TIPS_SEEN_KEY}:${pathname.replace(/\/jobs\/[^/]+/, '/jobs/:id')}`;
    if (window.sessionStorage.getItem(seenKey)) return;
    const count = Number(read(`${seenKey}:n`) ?? '0');
    const show = window.setTimeout(() => {
      window.sessionStorage.setItem(seenKey, '1');
      write(`${seenKey}:n`, String(count + 1));
      setTip(group.tips[count % group.tips.length]);
    }, 9000);
    return () => window.clearTimeout(show);
  }, [pathname, open]);

  useEffect(() => {
    if (!tip) return;
    const hide = window.setTimeout(() => setTip(null), 11000);
    return () => window.clearTimeout(hide);
  }, [tip]);

  const finish = () => {
    write(TOUR_KEY, 'done');
    onOpenChange(false);
    setStep(0);
  };

  if (!mounted) return null;
  const current = STEPS[step];
  const Icon = current.icon;
  const last = step === STEPS.length - 1;

  return createPortal(
    <>
      <AnimatePresence>
        {open ? (
          <motion.div className="fixed inset-0 z-[160] flex items-end justify-center p-3 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Close the guide" onClick={finish} className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ats-guide-title"
              initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 18, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface-elevated shadow-[0_30px_80px_rgba(4,47,46,0.35)]"
            >
              <div className="relative h-36 overflow-hidden bg-[linear-gradient(135deg,#0f766e,#064e3b)] dark:bg-[linear-gradient(135deg,#0f3d22,#071f14)]">
                <motion.div aria-hidden className="absolute inset-0" animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}>
                  <svg viewBox="0 0 400 160" className="h-full w-full text-white/25">
                    <circle cx="200" cy="80" r="52" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="200" cy="80" r="84" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" />
                    <circle cx="200" cy="80" r="120" fill="none" stroke="currentColor" strokeWidth="0.8" />
                    <circle cx="116" cy="80" r="4" fill="currentColor" />
                    <circle cx="284" cy="52" r="3" fill="currentColor" />
                    <circle cx="232" cy="160" r="3.5" fill="currentColor" />
                  </svg>
                </motion.div>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={step}
                    initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                    className="absolute left-1/2 top-1/2 inline-flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-white text-[#0f766e] shadow-xl dark:bg-[#eaffdf] dark:text-[#0f3d22]"
                  >
                    <Icon className="h-7 w-7" />
                  </motion.span>
                </AnimatePresence>
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white">
                  <Sparkles className="h-3 w-3" /> Quick guide · {step + 1} of {STEPS.length}
                </span>
                <button type="button" onClick={finish} aria-label="Close" className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 pb-5 pt-4">
                <AnimatePresence mode="wait">
                  <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                    <h2 id="ats-guide-title" className="font-display text-2xl text-foreground">
                      {current.title}
                    </h2>
                    <p className="mt-2 min-h-[4.5rem] text-sm leading-relaxed text-muted">{current.body}</p>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5" aria-hidden>
                    {STEPS.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        tabIndex={-1}
                        onClick={() => setStep(i)}
                        className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-6 bg-brand' : 'w-1.5 bg-border hover:bg-brand/50')}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {step > 0 ? (
                      <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-secondary px-3 py-2 text-xs">
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                      </button>
                    ) : (
                      <button type="button" onClick={finish} className="px-2 text-xs font-medium text-muted hover:text-foreground">
                        Skip
                      </button>
                    )}
                    <button type="button" onClick={() => (last ? finish() : setStep((s) => s + 1))} className="btn-primary px-3 py-2 text-xs">
                      {last ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Got it
                        </>
                      ) : (
                        <>
                          Next <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {tip && !open ? (
          <motion.aside
            role="status"
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, transition: { duration: 0.4 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="fixed bottom-[calc(4.75rem+var(--safe-bottom))] left-2 z-[85] w-[min(20rem,calc(100vw-5.5rem))] overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-[0_18px_40px_rgba(4,47,46,0.22)] min-[340px]:left-4 lg:bottom-24 lg:left-auto lg:right-6"
          >
            <motion.div className="h-0.5 bg-brand" initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 11, ease: 'linear' }} />
            <div className="flex gap-3 p-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Lightbulb className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">Tip</p>
                <p className="mt-0.5 text-xs leading-relaxed text-foreground">{tip}</p>
                <div className="mt-2 flex items-center gap-3 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setTip(null);
                      setStep(0);
                      onOpenChange(true);
                    }}
                    className="font-semibold text-brand hover:underline"
                  >
                    Show me around
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      write(TIPS_OFF_KEY, '1');
                      setTip(null);
                    }}
                    className="text-muted hover:text-foreground"
                  >
                    Don’t show tips
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => setTip(null)} aria-label="Close tip" className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>,
    document.body,
  );
}
