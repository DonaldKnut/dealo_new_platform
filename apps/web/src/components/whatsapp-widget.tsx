'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { useLocale } from '@/components/i18n/locale-context';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { whatsappHref, whatsappMessageFor } from '@/lib/whatsapp';

export function WhatsAppWidget() {
  const { t } = useLocale();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const href = whatsappHref(whatsappMessageFor(pathname, t('wa.prefill')));
  // The dashboard has its own WhatsApp button in the header, clear of the mobile tab bar.
  if (!href || pathname.startsWith('/dashboard')) return null;

  return (
    <div className="pointer-events-none fixed bottom-[max(0.75rem,var(--safe-bottom))] right-2 z-50 flex flex-col items-end gap-3 min-[340px]:right-4 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.96 }}
            className="pointer-events-auto w-[min(18rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-[0_18px_40px_rgba(4,47,46,0.18)]"
          >
            <div className="flex items-start justify-between gap-2 bg-[#075E54] p-4 text-white">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <WhatsAppIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t('wa.title')}</p>
                  <p className="flex items-center gap-1.5 text-[11px] text-white/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" /> Usually replies within the hour
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-4">
              <p className="rounded-2xl rounded-tl-sm bg-surface px-3 py-2 text-xs leading-relaxed text-foreground">{t('wa.body')}</p>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-[#073b1f] transition hover:brightness-95"
              >
                <WhatsAppIcon className="h-4 w-4" />
                {t('wa.cta')}
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={t('wa.title')}
        aria-expanded={open}
        className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_28px_rgba(37,211,102,0.35)] min-[340px]:h-14 min-[340px]:w-14"
        onClick={() => setOpen((value) => !value)}
        animate={reduceMotion || open ? undefined : { scale: [1, 1.06, 1] }}
        transition={reduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {open ? <X className="h-5 w-5" /> : <WhatsAppIcon className="h-6 w-6 min-[340px]:h-7 min-[340px]:w-7" />}
      </motion.button>
    </div>
  );
}
