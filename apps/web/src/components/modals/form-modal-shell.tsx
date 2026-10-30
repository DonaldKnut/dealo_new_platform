'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface FormModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  illustration: ReactNode;
  children: ReactNode;
}

export function FormModalShell({
  open,
  onClose,
  title,
  subtitle,
  illustration,
  children,
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
            className="relative z-[81] grid max-h-[96vh] w-full max-w-5xl overflow-hidden rounded-t-[1.25rem] border border-border bg-surface-elevated shadow-[0_40px_120px_rgba(4,47,46,0.35)] min-[340px]:rounded-t-[1.5rem] sm:max-h-[94vh] sm:rounded-[1.75rem] lg:grid-cols-[0.9fr_1.1fr]"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          >
            <div className="relative hidden overflow-hidden border-r border-border bg-surface p-8 lg:block">
              <p className="font-display text-3xl text-foreground">Dealo</p>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{subtitle}</p>
              <div className="absolute inset-x-6 bottom-6 top-32">{illustration}</div>
            </div>

            <div className="flex max-h-[96vh] flex-col sm:max-h-[94vh]">
              <div className="flex items-start justify-between gap-3 border-b border-border px-3.5 py-3.5 min-[340px]:px-4 min-[340px]:py-4 sm:gap-4 sm:px-7">
                <div className="min-w-0 pr-2">
                  <p className="eyebrow">Dealo</p>
                  <h2
                    id="dealo-modal-title"
                    className="mt-1 font-display text-[1.35rem] leading-tight text-foreground min-[340px]:text-2xl sm:text-3xl"
                  >
                    {title}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted lg:hidden">{subtitle}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border transition hover:border-brand hover:text-brand sm:h-10 sm:w-10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-y-auto px-3.5 py-4 min-[340px]:px-4 min-[340px]:py-5 sm:px-7 sm:py-6">
                {children}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
