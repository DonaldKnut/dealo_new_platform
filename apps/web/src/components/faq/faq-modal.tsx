'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { HelpCircle, MessageCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useModal } from '@/components/modals/modal-context';
import { FAQ_COUNT } from '@/lib/faq-content';

import { FaqBrowser } from './faq-browser';

export function FaqModal() {
  const { openModal, close, switchTo } = useModal();
  const open = openModal === 'faq';
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close FAQ"
            className="absolute inset-0 bg-[#071f14]/70 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="faq-title"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="relative flex h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[1.25rem] border border-border bg-background shadow-[0_40px_120px_rgba(4,47,46,0.35)] sm:h-[88dvh] sm:rounded-[1.75rem]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-3 py-3 min-[340px]:px-5 min-[340px]:py-4 sm:px-7">
              <div className="flex min-w-0 items-center gap-3">
                <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand min-[300px]:inline-flex">
                  <HelpCircle className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 id="faq-title" className="font-display text-lg font-semibold text-foreground min-[340px]:text-2xl">
                    Questions & answers
                  </h2>
                  <p className="text-xs text-muted min-[340px]:text-sm">
                    {FAQ_COUNT} simple answers about Dealo, AI, the API and your privacy.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={close}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border transition hover:border-brand hover:text-brand"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 min-[340px]:px-5 sm:px-7 sm:py-6">
              <FaqBrowser onNavigate={close} />
            </div>

            <div className="safe-bottom flex flex-col gap-2 border-t border-border bg-surface/60 px-3 py-3 min-[340px]:px-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <p className="text-xs text-muted min-[340px]:text-sm">Still have a question? A real person will answer.</p>
              <button type="button" className="btn-primary" onClick={() => switchTo('contact')}>
                <MessageCircle className="h-4 w-4" />
                Ask us
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
