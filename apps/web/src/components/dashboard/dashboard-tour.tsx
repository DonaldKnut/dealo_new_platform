'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Compass, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { TranslationKey } from '@/components/i18n/dictionaries';
import { useLocale } from '@/components/i18n/locale-context';
import { logClientAudit } from '@/lib/client-audit';
import { cn } from '@/lib/utils';

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type TourStep = {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  accentKey: TranslationKey;
  /** One or more CSS selectors to spotlight together */
  targets: string[];
  pad?: number;
  placement?: 'auto' | 'bottom' | 'top' | 'right' | 'left';
};

const DESKTOP_STEPS: TourStep[] = [
  {
    titleKey: 'tour.1.title',
    bodyKey: 'tour.1.body',
    accentKey: 'tour.1.accent',
    targets: ['[data-tour="sidebar"]'],
    pad: 10,
    placement: 'right',
  },
  {
    titleKey: 'tour.2.title',
    bodyKey: 'tour.2.body',
    accentKey: 'tour.2.accent',
    targets: ['[data-tour="sidebar-controls"]'],
    pad: 12,
    placement: 'right',
  },
  {
    titleKey: 'tour.3.title',
    bodyKey: 'tour.3.body',
    accentKey: 'tour.3.accent',
    targets: ['[data-tour="main-content"]'],
    pad: 8,
    placement: 'bottom',
  },
  {
    titleKey: 'tour.4.title',
    bodyKey: 'tour.4.body',
    accentKey: 'tour.4.accent',
    targets: ['[data-tour="nav-hiring"]'],
    pad: 10,
    placement: 'right',
  },
  {
    titleKey: 'tour.5.title',
    bodyKey: 'tour.5.body',
    accentKey: 'tour.5.accent',
    targets: ['[data-tour="header-helpers"]', '[data-tour="support-help"]'],
    pad: 10,
    placement: 'bottom',
  },
  {
    titleKey: 'tour.6.title',
    bodyKey: 'tour.6.body',
    accentKey: 'tour.6.accent',
    targets: ['[data-tour="nav-admin"]'],
    pad: 10,
    placement: 'right',
  },
];

/** Sidebar is hidden below lg — spotlight bottom tabs + header instead. */
const MOBILE_STEPS: TourStep[] = [
  {
    titleKey: 'tour.1.title',
    bodyKey: 'tour.1.body',
    accentKey: 'tour.1.accent',
    targets: ['[data-tour="mobile-nav"]'],
    pad: 6,
    placement: 'top',
  },
  {
    titleKey: 'tour.2.title',
    bodyKey: 'tour.2.body',
    accentKey: 'tour.2.accent',
    targets: ['[data-tour="mobile-more"]'],
    pad: 8,
    placement: 'top',
  },
  {
    titleKey: 'tour.3.title',
    bodyKey: 'tour.3.body',
    accentKey: 'tour.3.accent',
    targets: ['[data-tour="main-content"]'],
    pad: 6,
    placement: 'top',
  },
  {
    titleKey: 'tour.5.title',
    bodyKey: 'tour.5.body',
    accentKey: 'tour.5.accent',
    targets: ['[data-tour="header-helpers"]', '[data-tour="support-help"]'],
    pad: 8,
    placement: 'bottom',
  },
];

const STORAGE_KEY = 'dealo.dashboard.tour.seen';
const CARD_WIDTH = 360;
const CARD_GAP = 14;
const LG = 1024;

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < LG;
}

function measureTarget(selector: string, pad = 8): SpotlightRect | null {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return null;
  // Off-screen / collapsed sidebar leftovers
  if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
    return null;
  }
  return {
    top: Math.max(8, rect.top - pad),
    left: Math.max(8, rect.left - pad),
    width: Math.min(window.innerWidth - 16, rect.width + pad * 2),
    height: Math.min(window.innerHeight - 16, rect.height + pad * 2),
  };
}

function placeCard(
  spots: SpotlightRect[],
  placement: TourStep['placement'] = 'auto',
  mobile: boolean,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardH = mobile ? 200 : 220;
  const width = Math.min(CARD_WIDTH, vw - 24);

  // On phones, keep the card docked so it never fights a moving spotlight.
  if (mobile) {
    return {
      top: Math.max(12, vh - cardH - 88),
      left: Math.max(12, (vw - width) / 2),
    };
  }

  const spot = spots[0];
  if (!spot) {
    return { top: Math.max(24, vh / 2 - 110), left: Math.max(12, (vw - width) / 2) };
  }

  const tryBottom = {
    top: spot.top + spot.height + CARD_GAP,
    left: Math.min(Math.max(12, spot.left), vw - width - 12),
  };
  const tryTop = {
    top: spot.top - cardH - CARD_GAP,
    left: Math.min(Math.max(12, spot.left), vw - width - 12),
  };
  const tryRight = {
    top: Math.min(Math.max(12, spot.top), vh - cardH - 12),
    left: spot.left + spot.width + CARD_GAP,
  };
  const tryLeft = {
    top: Math.min(Math.max(12, spot.top), vh - cardH - 12),
    left: spot.left - width - CARD_GAP,
  };

  const fits = (pos: { top: number; left: number }) =>
    pos.top >= 8 &&
    pos.left >= 8 &&
    pos.top + cardH <= vh - 8 &&
    pos.left + width <= vw - 8;

  if (placement === 'bottom' && fits(tryBottom)) return tryBottom;
  if (placement === 'top' && fits(tryTop)) return tryTop;
  if (placement === 'right' && fits(tryRight)) return tryRight;
  if (placement === 'left' && fits(tryLeft)) return tryLeft;

  for (const pos of [tryRight, tryBottom, tryTop, tryLeft]) {
    if (fits(pos)) return pos;
  }

  return {
    top: Math.min(vh - cardH - 12, Math.max(12, spot.top + spot.height + CARD_GAP)),
    left: Math.min(vw - width - 12, Math.max(12, spot.left)),
  };
}

export function DashboardTour({ autoStart = true }: { autoStart?: boolean }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [spots, setSpots] = useState<SpotlightRect[]>([]);
  const [cardPos, setCardPos] = useState({ top: 80, left: 24 });

  const steps = mobile ? MOBILE_STEPS : DESKTOP_STEPS;

  useEffect(() => {
    setMounted(true);
    const sync = () => setMobile(isMobileViewport());
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  useEffect(() => {
    if (!autoStart) return;
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (!seen) setOpen(true);
  }, [autoStart]);

  // When switching between mobile/desktop mid-tour, clamp the step index.
  useEffect(() => {
    setStep((s) => Math.min(s, Math.max(0, steps.length - 1)));
  }, [steps.length]);

  const syncSpotlight = useCallback(() => {
    const current = steps[step];
    if (!current) return;
    const narrow = isMobileViewport();

    let measured = current.targets
      .map((selector) => measureTarget(selector, current.pad))
      .filter((rect): rect is SpotlightRect => Boolean(rect));

    if (!narrow) {
      if (measured.length === 0 && current.targets.some((t) => t.includes('nav-admin'))) {
        const fallback = measureTarget('[data-tour="sidebar"]', 10);
        if (fallback) measured = [fallback];
      }
      if (measured.length === 0 && current.targets.some((t) => t.includes('nav-hiring'))) {
        const fallback = measureTarget('[data-tour="sidebar"]', 10);
        if (fallback) measured = [fallback];
      }
    }

    // Prefer a real target; never invent a floating box on mobile — use header helpers as last resort.
    if (measured.length === 0) {
      const rescue = narrow
        ? measureTarget('[data-tour="mobile-nav"]', 6) ||
          measureTarget('[data-tour="header-helpers"]', 8) ||
          measureTarget('[data-tour="main-content"]', 6)
        : measureTarget('[data-tour="sidebar"]', 10) || measureTarget('[data-tour="main-content"]', 8);
      if (rescue) measured = [rescue];
    }

    if (measured.length === 0) {
      measured = [
        {
          top: Math.max(72, window.innerHeight * 0.12),
          left: 16,
          width: window.innerWidth - 32,
          height: Math.min(160, window.innerHeight * 0.22),
        },
      ];
    }

    setSpots(measured);
    setCardPos(placeCard(measured, current.placement, narrow));

    const el = document.querySelector(current.targets[0]) as HTMLElement | null;
    if (el && !narrow) {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }, [step, steps]);

  useLayoutEffect(() => {
    if (!open) return;
    syncSpotlight();
    // Remeasure after layout settles (fonts, safe-area, bottom nav).
    const t1 = window.setTimeout(syncSpotlight, 80);
    const t2 = window.setTimeout(syncSpotlight, 220);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open, step, mobile, syncSpotlight]);

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
    logClientAudit({ action: 'DASHBOARD_TOUR_CLOSED', entityType: 'Dashboard' });
  };

  const current = steps[step];
  const cardWidth =
    Math.min(CARD_WIDTH, typeof window !== 'undefined' ? window.innerWidth - 24 : CARD_WIDTH);

  const overlay =
    mounted && open && current && spots.length > 0
      ? createPortal(
          <AnimatePresence>
            <motion.div
              className="fixed inset-0 z-[200]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <svg className="absolute inset-0 h-full w-full" aria-hidden>
                <defs>
                  <mask id="dealo-tour-mask">
                    <rect width="100%" height="100%" fill="white" />
                    {spots.map((spot, index) => (
                      <rect
                        key={index}
                        x={spot.left}
                        y={spot.top}
                        width={spot.width}
                        height={spot.height}
                        rx="16"
                        ry="16"
                        fill="black"
                      />
                    ))}
                  </mask>
                </defs>
                <rect
                  width="100%"
                  height="100%"
                  fill="rgba(0,0,0,0.64)"
                  mask="url(#dealo-tour-mask)"
                  className="cursor-pointer"
                  onClick={() => close()}
                />
              </svg>

              {spots.map((spot, index) => (
                <motion.div
                  key={`ring-${index}`}
                  className="pointer-events-none absolute rounded-2xl ring-2 ring-[#14b8a6] ring-offset-2 ring-offset-transparent dark:ring-[#7cff4d]"
                  initial={false}
                  animate={{
                    top: spot.top,
                    left: spot.left,
                    width: spot.width,
                    height: spot.height,
                  }}
                  transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
                />
              ))}

              <motion.div
                key={step}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dashboard-tour-title"
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.22 }}
                className="absolute z-10 overflow-hidden rounded-2xl border border-[#d7e8e6] bg-white shadow-[0_24px_60px_rgba(4,47,46,0.35)] dark:border-[#1e4a30] dark:bg-[#123825]"
                style={{
                  top: cardPos.top,
                  left: cardPos.left,
                  width: cardWidth,
                  maxHeight: 'min(70dvh, 22rem)',
                }}
              >
                <div className="border-b border-[#d7e8e6] bg-[linear-gradient(135deg,#ecfdf8,#f0fdfa)] px-4 py-3 dark:border-[#1e4a30] dark:bg-[linear-gradient(135deg,#0c2c1a,#071f14)]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0f766e] dark:text-[#7cff4d]">
                        {t(current.accentKey)} · {step + 1}/{steps.length}
                      </p>
                      <h2
                        id="dashboard-tour-title"
                        className="mt-1 font-display text-xl text-[#0b1f1e] dark:text-[#eaffdf]"
                      >
                        {t(current.titleKey)}
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#d7e8e6] text-[#5b6f6e] dark:border-[#1e4a30] dark:text-[#9cbc9a]"
                      onClick={() => close()}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-[10rem] overflow-y-auto px-4 py-3">
                  <p className="text-sm leading-relaxed text-[#3d5554] dark:text-[#b8d4b6]">
                    {t(current.bodyKey)}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-[#d7e8e6] bg-[#f8fffe] px-4 py-3 dark:border-[#1e4a30] dark:bg-[#071f14]/70">
                  <button
                    type="button"
                    className="cursor-pointer text-xs font-medium text-[#5b6f6e] dark:text-[#9cbc9a]"
                    onClick={() => close()}
                  >
                    {t('dash.skip')}
                  </button>
                  <div className="flex gap-2">
                    {step > 0 ? (
                      <button
                        type="button"
                        className="cursor-pointer rounded-full border border-[#d7e8e6] px-3 py-1.5 text-xs font-semibold text-[#0b1f1e] dark:border-[#1e4a30] dark:text-[#eaffdf]"
                        onClick={() => setStep((s) => s - 1)}
                      >
                        {t('dash.back')}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn-primary cursor-pointer px-4 py-1.5 text-xs"
                      onClick={() => {
                        if (step >= steps.length - 1) close();
                        else setStep((s) => s + 1);
                      }}
                    >
                      {step >= steps.length - 1 ? t('dash.finish') : t('dash.next')}
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
          'inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-brand hover:text-brand',
        )}
        onClick={() => {
          setStep(0);
          setOpen(true);
          logClientAudit({ action: 'DASHBOARD_TOUR_STARTED', entityType: 'Dashboard' });
        }}
      >
        <Compass className="h-3.5 w-3.5" />
        {t('dash.tour')}
      </button>
      {overlay}
    </>
  );
}
