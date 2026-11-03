'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

import { BrandLogo } from '@/components/brand-logo';
import { cn } from '@/lib/utils';

interface FormModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  illustration: ReactNode;
  children: ReactNode;
  /** Full-bleed promo panel (photo carousel). Default keeps classic padded art. */
  promoFill?: boolean;
}

export function FormModalShell({
  open,
  onClose,
  title,
  subtitle,
  illustration,
  children,
  promoFill = false,
}: FormModalShellProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Close dialog backdrop"
            className="absolute inset-0 bg-[#071f14]/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dealo-modal-title"
            className="relative z-[81] grid max-h-[96dvh] w-full max-w-5xl overflow-hidden rounded-t-[1.25rem] border border-border bg-surface-elevated shadow-[0_40px_120px_rgba(4,47,46,0.35)] min-[340px]:rounded-t-[1.5rem] sm:max-h-[94dvh] sm:rounded-[1.75rem] lg:grid-cols-[0.9fr_1.1fr]"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          >
            <div
              className={cn(
                'relative hidden overflow-hidden border-r border-border lg:block',
                promoFill ? 'bg-[#071f14]' : 'bg-surface p-8',
              )}
            >
              {promoFill ? (
                <>
                  <div className="absolute inset-0">{illustration}</div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#071f14]/78 via-[#071f14]/28 to-transparent" />
                  <div className="relative z-10 flex flex-col gap-4 p-8">
                    <BrandLogo force="dark" href="/" className="pointer-events-auto" />
                    <p className="max-w-xs text-sm leading-relaxed text-white/85">{subtitle}</p>
                  </div>
                </>
              ) : (
                <>
                  <BrandLogo href="/" />
                  <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{subtitle}</p>
                  <div className="absolute inset-x-6 bottom-6 top-32">{illustration}</div>
                </>
              )}
            </div>

            <div className="flex max-h-[96dvh] min-w-0 flex-col sm:max-h-[94dvh]">
              <div className="flex items-start justify-between gap-2 border-b border-border px-2.5 py-2.5 min-[340px]:gap-3 min-[340px]:px-4 min-[340px]:py-4 sm:gap-4 sm:px-7">
                <div className="min-w-0 pr-1 min-[340px]:pr-2">
                  <p className="eyebrow hidden min-[340px]:block">Dealo</p>
                  <h2
                    id="dealo-modal-title"
                    className="font-display text-[1.05rem] leading-tight text-foreground min-[340px]:mt-1 min-[340px]:text-2xl sm:text-3xl"
                  >
                    {title}
                  </h2>
                  <p className="mt-1.5 hidden text-[11px] leading-relaxed text-muted min-[340px]:mt-2 min-[340px]:block min-[340px]:text-xs lg:hidden">
                    {subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border transition hover:border-brand hover:text-brand min-[340px]:h-9 min-[340px]:w-9 sm:h-10 sm:w-10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="safe-bottom min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-2.5 py-3 min-[340px]:px-4 min-[340px]:py-5 sm:px-7 sm:py-6">
                {children}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
