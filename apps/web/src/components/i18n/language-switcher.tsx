'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useLocale } from '@/components/i18n/locale-context';
import { LOCALES, LOCALE_META, type Locale } from '@/components/i18n/dictionaries';
import { BottomSheet, useCompactViewport } from '@/components/ui/bottom-sheet';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({
  className,
  variant = 'pill',
}: {
  className?: string;
  /** `row` renders a full-width menu row (mobile drawer). */
  variant?: 'pill' | 'row';
}) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const compact = useCompactViewport();
  const useSheet = compact || variant === 'row';

  useEffect(() => {
    if (!open || useSheet) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, useSheet]);

  const pick = (code: Locale) => {
    setLocale(code);
    setOpen(false);
  };

  const options = (
    <ul role="listbox" aria-label={t('nav.language')} className="grid gap-1">
      {LOCALES.map((code, index) => {
        const active = locale === code;
        return (
          <motion.li
            key={code}
            role="option"
            aria-selected={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.18 }}
          >
            <button
              type="button"
              className={cn(
                'flex w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
                active ? 'bg-brand-soft text-foreground' : 'text-muted hover:bg-surface hover:text-foreground',
              )}
              onClick={() => pick(code)}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface px-1 text-[10px] font-bold uppercase text-foreground">
                  {LOCALE_META[code].short}
                </span>
                <span className="truncate font-medium">{LOCALE_META[code].label}</span>
              </span>
              {active ? <Check className="h-4 w-4 shrink-0 text-brand" /> : null}
            </button>
          </motion.li>
        );
      })}
    </ul>
  );

  return (
    <div ref={rootRef} className={cn('relative', variant === 'row' ? 'flex w-full' : 'inline-flex', className)}>
      {variant === 'row' ? (
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2.5 text-left text-sm font-medium text-foreground transition hover:bg-surface min-[340px]:px-3 min-[340px]:py-3"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Languages className="h-4 w-4" />
            </span>
            <span className="truncate">{t('nav.language')}</span>
          </span>
          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold uppercase text-muted">
            {LOCALE_META[locale].short}
          </span>
        </button>
      ) : (
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface-elevated/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground transition hover:border-brand/40"
          aria-label={t('nav.language')}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((value) => !value)}
        >
          <Languages className="h-3.5 w-3.5 text-muted" aria-hidden />
          <span>{LOCALE_META[locale].short}</span>
          <ChevronDown className={cn('h-3 w-3 text-muted transition', open && 'rotate-180')} />
        </button>
      )}

      {useSheet ? (
        <BottomSheet open={open} onClose={() => setOpen(false)} title={t('nav.language')}>
          {options}
        </BottomSheet>
      ) : (
        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="absolute right-0 top-[calc(100%+0.4rem)] z-[80] w-[12.5rem] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-border bg-surface-elevated p-1 shadow-[0_16px_40px_rgba(4,47,46,0.18)]"
            >
              {options}
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}
    </div>
  );
}
