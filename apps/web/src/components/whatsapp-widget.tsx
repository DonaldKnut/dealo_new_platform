'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { useLocale } from '@/components/i18n/locale-context';

function normalizeWhatsAppNumber(raw: string) {
  return raw.replace(/[^\d]/g, '');
}

export function WhatsAppWidget() {
  const { t } = useLocale();
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '';
  const number = normalizeWhatsAppNumber(raw);
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (!number || pathname.startsWith('/dashboard') || pathname.startsWith('/resume-builder/')) return null;

  const href = `https://wa.me/${number}?text=${encodeURIComponent(t('wa.prefill'))}`;

  return (
    <div className="pointer-events-none fixed bottom-[max(0.75rem,var(--safe-bottom))] right-2 z-50 flex flex-col items-end gap-3 min-[340px]:right-4 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.96 }}
            className="pointer-events-auto w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface-elevated p-4 shadow-[0_18px_40px_rgba(4,47,46,0.18)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{t('wa.title')}</p>
                <p className="mt-1 text-xs text-muted">{t('wa.body')}</p>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border"
                aria-label={t('wa.title')}
                onClick={() => setOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-4 inline-flex w-full justify-center"
            >
              {t('wa.cta')}
            </a>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={t('wa.title')}
        className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_28px_rgba(37,211,102,0.35)] min-[340px]:h-14 min-[340px]:w-14"
        onClick={() => setOpen((value) => !value)}
        animate={
          reduceMotion || open
            ? undefined
            : {
                scale: [1, 1.06, 1],
              }
        }
        transition={
          reduceMotion
            ? undefined
            : {
                duration: 2.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
      >
        <MessageCircle className="h-6 w-6" />
      </motion.button>
    </div>
  );
}
