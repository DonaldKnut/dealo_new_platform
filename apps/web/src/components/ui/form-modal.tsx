'use client';

import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

import { useCompactViewport } from './use-compact-viewport';

const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
} as const;

/**
 * Premium dialog for dashboard forms: centred with a soft scale-in on larger screens,
 * a sheet that slides up from the bottom on phones (drag the handle down to close).
 */
export function FormModal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  size = 'md',
  footer,
  mobile = 'full',
  children,
  className,
  bodyClassName,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  size?: keyof typeof SIZES;
  /** Sticky action row, e.g. Cancel / Save. */
  footer?: ReactNode;
  /** Phones: full-height sheet for forms, or fit-to-content for short menus. */
  mobile?: 'full' | 'auto';
  children: ReactNode;
  className?: string;
  /** Replaces the padded, scrolling body, e.g. when the content scrolls itself. */
  bodyClassName?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const compact = useCompactViewport();
  const drag = useDragControls();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const focusTimer = window.setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>('input:not([type=hidden]):not([disabled]), textarea, select');
      if (first && !compact) first.focus({ preventScroll: true });
    }, 220);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose, compact]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className={cn('fixed inset-0 z-[220] flex justify-center', compact ? 'items-end' : 'items-center p-4 sm:p-6')}>
          <motion.button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            className="absolute inset-0 bg-[#071f14]/55 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className={cn(
              'relative flex w-full flex-col overflow-hidden border border-border bg-surface-elevated shadow-[0_40px_120px_-30px_rgba(4,47,46,0.55)]',
              compact
                ? cn('rounded-t-[1.5rem] border-b-0 pb-[var(--safe-bottom)]', mobile === 'full' ? 'h-[calc(100dvh-max(0.75rem,var(--safe-top)))]' : 'max-h-[88dvh]')
                : cn('max-h-[min(88dvh,58rem)] rounded-[1.75rem]', SIZES[size]),
              className,
            )}
            initial={compact ? { y: '100%' } : { opacity: 0, scale: 0.94, y: 18 }}
            animate={compact ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={compact ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={compact ? { type: 'spring', stiffness: 360, damping: 36 } : { type: 'spring', stiffness: 420, damping: 32 }}
            drag={compact ? 'y' : false}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
          >
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
            <span aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />

            {compact ? (
              <div className="flex cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing" onPointerDown={(e) => drag.start(e)}>
                <span className="h-1.5 w-11 rounded-full bg-border" aria-hidden />
              </div>
            ) : null}

            {title || description ? (
              <header
                className="relative flex items-start gap-3 border-b border-border/70 px-4 pb-4 pt-2 min-[340px]:px-5 sm:px-7 sm:pt-6"
                onPointerDown={compact ? (e) => drag.start(e) : undefined}
              >
                {Icon ? (
                  <motion.span
                    initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.06 }}
                    className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-emerald-500 text-white shadow-lg shadow-brand/25 min-[300px]:inline-flex dark:text-[#071f14]"
                  >
                    <Icon className="h-5 w-5" />
                  </motion.span>
                ) : null}
                <div className="min-w-0 flex-1">
                  {title ? (
                    <h2 id={titleId} className="font-display text-xl leading-tight text-foreground sm:text-2xl">
                      {title}
                    </h2>
                  ) : null}
                  {description ? <p className="mt-1 text-xs leading-relaxed text-muted sm:text-sm">{description}</p> : null}
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition hover:rotate-90 hover:border-brand hover:text-brand"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>
            ) : null}

            <motion.div
              className={bodyClassName ?? 'relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 min-[340px]:px-5 sm:px-7 sm:py-6'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.25 }}
            >
              {children}
            </motion.div>

            {footer ? (
              <footer className="relative flex flex-col-reverse gap-2 border-t border-border/70 bg-surface/60 px-4 py-3 backdrop-blur min-[340px]:flex-row min-[340px]:justify-end min-[340px]:px-5 sm:px-7">
                {footer}
              </footer>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
