'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseIsoDate(value?: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplay(value?: string) {
  const date = parseIsoDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DatePickerField({
  value,
  onChange,
  placeholder = 'Pick a date',
  minDate,
  className,
}: {
  value?: string;
  onChange: (next: string) => void;
  placeholder?: string;
  minDate?: Date;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = parseIsoDate(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => startOfMonth(selected ?? new Date()));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (selected) setView(startOfMonth(selected));
  }, [selected]);

  const days = useMemo(() => {
    const first = startOfMonth(view);
    const startOffset = first.getDay();
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      return day;
    });
  }, [view]);

  const today = new Date();
  const floor = minDate
    ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    : null;

  const monthLabel = view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={cn(
            'input-field flex flex-1 items-center justify-between gap-2 text-left',
            open &&
              'border-brand shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_25%,transparent)]',
          )}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className={cn('truncate', value ? 'text-foreground' : 'text-muted/70')}>
            {value ? formatDisplay(value) : placeholder}
          </span>
          <CalendarDays className="h-4 w-4 shrink-0 text-brand" />
        </button>
        {value ? (
          <button
            type="button"
            aria-label="Clear date"
            className="inline-flex h-[2.85rem] w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted transition hover:border-brand/40 hover:text-foreground min-[400px]:h-[3.05rem]"
            onClick={() => onChange('')}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label="Choose a date"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-40 mt-2 w-[min(100%,19rem)] overflow-hidden rounded-2xl border border-border bg-surface-elevated p-3 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="Previous month"
                className="rounded-lg border border-border p-1.5 text-muted transition hover:border-brand/40 hover:text-foreground"
                onClick={() =>
                  setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="font-display text-sm font-semibold text-foreground">{monthLabel}</p>
              <button
                type="button"
                aria-label="Next month"
                className="rounded-lg border border-border p-1.5 text-muted transition hover:border-brand/40 hover:text-foreground"
                onClick={() =>
                  setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
                }
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <span
                  key={day}
                  className="py-1 text-center text-[10px] font-semibold tracking-wide text-muted uppercase"
                >
                  {day}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const inMonth = day.getMonth() === view.getMonth();
                const isSelected = selected ? sameDay(day, selected) : false;
                const isToday = sameDay(day, today);
                const disabled = floor ? day < floor : false;

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onChange(toIsoDate(day));
                      setOpen(false);
                    }}
                    className={cn(
                      'flex h-9 items-center justify-center rounded-lg text-xs font-medium transition',
                      !inMonth && 'text-muted/45',
                      inMonth && !isSelected && 'text-foreground hover:bg-surface',
                      isToday && !isSelected && 'ring-1 ring-brand/35',
                      isSelected && 'bg-brand text-white shadow-sm dark:text-[#071f14]',
                      disabled && 'cursor-not-allowed opacity-35 hover:bg-transparent',
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-2.5">
              <button
                type="button"
                className="text-xs font-semibold text-brand hover:underline"
                onClick={() => {
                  onChange(toIsoDate(today));
                  setOpen(false);
                }}
              >
                Today
              </button>
              <button
                type="button"
                className="text-xs font-medium text-muted hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
