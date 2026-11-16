'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Compass, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { TranslationKey } from '@/components/i18n/dictionaries';
import { useLocale } from '@/components/i18n/locale-context';
import { logClientAudit } from '@/lib/client-audit';
import { cn } from '@/lib/utils';

type SpotlightRect = { top: number; left: number; width: number; height: number };

type TourStep = {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  accentKey: TranslationKey;
  targets: string[];
  pad?: number;
};

const STEPS: TourStep[] = [
  {
    titleKey: 'ja.tour.1.title',
    bodyKey: 'ja.tour.1.body',
    accentKey: 'ja.tour.1.accent',
    targets: ['[data-ja-tour="hero"]'],
    pad: 10,
  },
  {
    titleKey: 'ja.tour.cv.title',
    bodyKey: 'ja.tour.cv.body',
    accentKey: 'ja.tour.cv.accent',
    targets: ['[data-ja-tour="cv"]'],
    pad: 8,
  },
  {
    titleKey: 'ja.tour.2.title',
    bodyKey: 'ja.tour.2.body',
    accentKey: 'ja.tour.2.accent',
    targets: ['[data-ja-tour="stats"]', '[data-ja-tour="credits"]'],
    pad: 8,
  },
  {
    titleKey: 'ja.tour.3.title',
    bodyKey: 'ja.tour.3.body',
    accentKey: 'ja.tour.3.accent',
    targets: ['[data-ja-tour="inbox"]'],
    pad: 8,
  },
  {
    titleKey: 'ja.tour.4.title',
    bodyKey: 'ja.tour.4.body',
    accentKey: 'ja.tour.4.accent',
    targets: ['[data-ja-tour="vault"]'],
    pad: 8,
  },
  {
    titleKey: 'ja.tour.5.title',
    bodyKey: 'ja.tour.5.body',
    accentKey: 'ja.tour.5.accent',
    targets: ['[data-ja-tour="policy"]'],
    pad: 8,
  },
  {
    titleKey: 'ja.tour.channels.title',
    bodyKey: 'ja.tour.channels.body',
    accentKey: 'ja.tour.channels.accent',
    targets: ['[data-ja-tour="inbox"]'],
    pad: 8,
  },
  {
    titleKey: 'ja.tour.6.title',
    bodyKey: 'ja.tour.6.body',
    accentKey: 'ja.tour.6.accent',
    targets: ['[data-ja-tour="inbox"]'],
    pad: 8,
  },
];

const STORAGE_KEY = 'dealo.job-agent.tour.seen';
const CARD_WIDTH = 360;

function measureTarget(selector: string, pad = 8): SpotlightRect | null {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return null;
  return {
    top: Math.max(0, r.top - pad),
    left: Math.max(0, r.left - pad),
    width: Math.min(window.innerWidth, r.width + pad * 2),
    height: Math.min(window.innerHeight, r.height + pad * 2),
  };
}

function placeCard(spots: SpotlightRect[]) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(CARD_WIDTH, vw - 24);
  const spot = spots[0]!;
  const preferBelow = spot.top + spot.height + 200 < vh;
  return {
    top: preferBelow
      ? Math.min(vh - 220, Math.max(12, spot.top + spot.height + 14))
      : Math.max(12, spot.top - 210),
    left: Math.min(vw - width - 12, Math.max(12, spot.left)),
    width,
  };
}

export function JobAgentTour({ autoStart = true }: { autoStart?: boolean }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [spots, setSpots] = useState<SpotlightRect[]>([]);
  const [cardPos, setCardPos] = useState({ top: 80, left: 24, width: CARD_WIDTH });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!autoStart) return;
    if (!window.localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, [autoStart]);

  const syncSpotlight = useCallback(() => {
    const current = STEPS[step];
    if (!current) return;
    let measured = current.targets
      .map((selector) => measureTarget(selector, current.pad))
      .filter((rect): rect is SpotlightRect => Boolean(rect));
    if (!measured.length) {
      const rescue = measureTarget('[data-ja-tour="hero"]', 8) || measureTarget('[data-ja-tour="inbox"]', 8);
      if (rescue) measured = [rescue];
    }
    if (!measured.length) {
      measured = [{ top: 80, left: 16, width: window.innerWidth - 32, height: 140 }];
    }
    setSpots(measured);
    setCardPos(placeCard(measured));
    const el = document.querySelector(current.targets[0]!) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [step]);

  useLayoutEffect(() => {
    if (!open) return;
    syncSpotlight();
    const t1 = window.setTimeout(syncSpotlight, 80);
    const t2 = window.setTimeout(syncSpotlight, 220);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open, step, syncSpotlight]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => syncSpotlight();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      document.body.style.overflow = previous;
    };
  }, [open, syncSpotlight]);

  const close = (markSeen = true) => {
    setOpen(false);
    if (markSeen) window.localStorage.setItem(STORAGE_KEY, '1');
    logClientAudit({ action: 'JOB_AGENT_TOUR_CLOSED', entityType: 'JobAgent' });
  };

  const current = STEPS[step];

  const overlay =
    mounted && open && current && spots.length
      ? createPortal(
          <AnimatePresence>
            <motion.div className="fixed inset-0 z-[200]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <svg className="absolute inset-0 h-full w-full" aria-hidden>
                <defs>
                  <mask id="ja-tour-mask">
                    <rect width="100%" height="100%" fill="white" />
                    {spots.map((spot, index) => (
                      <rect key={index} x={spot.left} y={spot.top} width={spot.width} height={spot.height} rx="16" ry="16" fill="black" />
                    ))}
                  </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.64)" mask="url(#ja-tour-mask)" className="cursor-pointer" onClick={() => close()} />
              </svg>
              {spots.map((spot, index) => (
                <div
                  key={`ring-${index}`}
                  className="pointer-events-none absolute rounded-2xl ring-2 ring-[#14b8a6] ring-offset-2 dark:ring-[#7cff4d]"
                  style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
                />
              ))}
              <motion.div
                key={step}
                role="dialog"
                aria-modal="true"
                aria-labelledby="ja-tour-title"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute z-10 overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-2xl"
                style={{ top: cardPos.top, left: cardPos.left, width: cardPos.width, maxHeight: 'min(70dvh, 22rem)' }}
              >
                <div className="border-b border-border bg-brand-soft/40 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">
                        {t(current.accentKey)} · {step + 1}/{STEPS.length}
                      </p>
                      <h2 id="ja-tour-title" className="mt-1 font-display text-xl text-foreground">
                        {t(current.titleKey)}
                      </h2>
                    </div>
                    <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted" onClick={() => close()}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="max-h-[10rem] overflow-y-auto px-4 py-3">
                  <p className="text-sm leading-relaxed text-muted">{t(current.bodyKey)}</p>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
                  <button type="button" className="text-xs font-medium text-muted" onClick={() => close()}>
                    {t('ja.tour.skip')}
                  </button>
                  <div className="flex gap-2">
                    {step > 0 ? (
                      <button type="button" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold" onClick={() => setStep((s) => s - 1)}>
                        {t('ja.tour.back')}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn-primary px-4 py-1.5 text-xs"
                      onClick={() => {
                        if (step >= STEPS.length - 1) close();
                        else setStep((s) => s + 1);
                      }}
                    >
                      {step >= STEPS.length - 1 ? t('ja.tour.finish') : t('ja.tour.next')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20',
        )}
        onClick={() => {
          setStep(0);
          setOpen(true);
          logClientAudit({ action: 'JOB_AGENT_TOUR_STARTED', entityType: 'JobAgent' });
        }}
      >
        <Compass className="h-3.5 w-3.5" />
        {t('ja.tour')}
      </button>
      {overlay}
    </>
  );
}
