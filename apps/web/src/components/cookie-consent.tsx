'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useLocale } from '@/components/i18n/locale-context';

const STORAGE_KEY = 'dealo-cookie-consent';

type ConsentValue = 'accepted' | 'essential';

function readConsent(): ConsentValue | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === 'accepted' || value === 'essential') return value;
  } catch {
    /* ignore */
  }
  return null;
}

function writeConsent(value: ConsentValue) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

export function CookieConsent() {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readConsent()) return;
    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = (value: ConsentValue) => {
    writeConsent(value);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-copy"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-3 z-[90] mx-auto w-[min(42rem,calc(100%-1.5rem))] min-[340px]:inset-x-4 min-[340px]:bottom-5 sm:inset-x-auto sm:right-6 sm:left-auto sm:w-[min(26rem,calc(100%-3rem))]"
        >
          <div className="relative overflow-hidden rounded-[1.35rem] border border-border/80 bg-surface-elevated/95 shadow-[0_24px_80px_-24px_rgba(4,47,46,0.45)] backdrop-blur-xl min-[340px]:rounded-[1.6rem] dark:border-border/60 dark:shadow-[0_24px_80px_-20px_rgba(0,0,0,0.65)]">
            <div className="pointer-events-none absolute -top-16 -right-10 h-36 w-36 rounded-full bg-brand/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-accent/15 blur-3xl" />

            <div className="relative p-4 min-[340px]:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand shadow-sm">
                    <Cookie className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p
                      id="cookie-consent-title"
                      className="font-display text-base font-semibold text-foreground min-[340px]:text-lg"
                    >
                      {t('cookie.title')}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium tracking-wide text-brand uppercase">
                      <ShieldCheck className="h-3 w-3" />
                      {t('cookie.privacy')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={t('cookie.essential')}
                  onClick={() => dismiss('essential')}
                  className="rounded-full border border-border/70 p-1.5 text-muted transition hover:border-brand/40 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <p
                id="cookie-consent-copy"
                className="mt-3 text-xs leading-relaxed text-muted min-[340px]:text-[13px]"
              >
                {t('cookie.body')}
              </p>

              <div className="mt-4 flex flex-col gap-2 min-[400px]:flex-row">
                <button
                  type="button"
                  className="btn-primary flex-1 py-2.5 text-sm"
                  onClick={() => dismiss('accepted')}
                >
                  {t('cookie.accept')}
                </button>
                <button
                  type="button"
                  className="btn-secondary flex-1 py-2.5 text-sm"
                  onClick={() => dismiss('essential')}
                >
                  {t('cookie.essential')}
                </button>
              </div>

              <p className="mt-3 text-center text-[11px] text-muted">
                <Link
                  href="/privacy"
                  className="font-semibold text-brand underline-offset-2 hover:underline"
                >
                  {t('cookie.privacy')}
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
