'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useLocale } from '@/components/i18n/locale-context';
import { LOCALES, LOCALE_META, type Locale } from '@/components/i18n/dictionaries';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  const pick = (code: Locale) => {
    setLocale(code);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
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

      <AnimatePresence>
        {open ? (
          <motion.ul
            role="listbox"
            aria-label={t('nav.language')}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-[calc(100%+0.4rem)] z-[80] min-w-[10.5rem] overflow-hidden rounded-xl border border-border bg-surface-elevated p-1 shadow-[0_16px_40px_rgba(4,47,46,0.18)]"
          >
            {LOCALES.map((code) => {
              const active = locale === code;
              return (
                <li key={code} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition',
                      active
                        ? 'bg-brand-soft text-foreground'
                        : 'text-muted hover:bg-surface hover:text-foreground',
                    )}
                    onClick={() => pick(code)}
                  >
                    <span className="font-medium">{LOCALE_META[code].label}</span>
                    {active ? <Check className="h-3.5 w-3.5 text-brand" /> : null}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
