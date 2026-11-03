'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

/** True below the `sm` breakpoint or on touch-only devices. */
export function useCompactViewport(query = '(max-width: 639px)') {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return compact;
}

/** App-style sheet anchored to the bottom of the screen; portals to <body>. */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
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

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[210] flex items-end justify-center">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-[#071f14]/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'safe-bottom relative w-full max-w-lg overflow-hidden rounded-t-[1.25rem] border border-b-0 border-border bg-surface-elevated shadow-[0_-24px_60px_rgba(4,47,46,0.28)]',
              className,
            )}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) onClose();
            }}
          >
            <div className="flex justify-center pt-2">
              <span className="h-1 w-10 rounded-full bg-border" aria-hidden />
            </div>
            {title ? (
              <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-2 min-[340px]:px-4">
                <div className="min-w-0 text-sm font-semibold text-foreground">{title}</div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted transition hover:border-brand hover:text-brand"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <div className="max-h-[70dvh] overflow-y-auto overscroll-contain px-3 pb-2 pt-1 min-[340px]:px-4">
              {children}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
