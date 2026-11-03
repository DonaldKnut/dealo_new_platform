'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export type IllustrativeOption = {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent?: string;
};

export function IllustrativeOptionPicker({
  value,
  onChange,
  options,
  placeholder = 'Choose an option',
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  options: IllustrativeOption[];
  placeholder?: string;
  className?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

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

  const SelectedIcon = selected?.icon;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'group flex w-full min-w-0 items-stretch overflow-hidden rounded-xl border bg-surface-elevated text-left transition',
          open
            ? 'border-brand shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_25%,transparent)]'
            : 'border-border hover:border-brand/40',
        )}
      >
        <span className="flex w-10 shrink-0 items-center justify-center border-r border-border bg-surface text-brand min-[340px]:w-11">
          {SelectedIcon ? (
            <SelectedIcon className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-muted" />
          )}
        </span>
        <span className="min-w-0 flex-1 px-2.5 py-2 min-[340px]:px-3.5 min-[340px]:py-2.5">
          <span className="block truncate text-[13px] font-semibold text-foreground min-[340px]:text-[0.95rem]">
            {selected?.label ?? placeholder}
          </span>
          {selected ? (
            <span className="mt-0.5 block truncate text-[10px] leading-snug text-muted min-[340px]:text-[11px]">
              {selected.description}
            </span>
          ) : null}
        </span>
        <span className="flex w-9 shrink-0 items-center justify-center border-l border-border bg-surface text-muted min-[340px]:w-11">
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
            strokeWidth={1.75}
          />
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-40 mt-2 max-h-[min(22rem,70vh)] w-full overflow-y-auto rounded-xl border border-border bg-surface-elevated p-1.5 shadow-xl scrollbar-none"
          >
            {options.map((option) => {
              const Icon = option.icon;
              const isActive = option.value === value;
              return (
                <li key={option.value} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full min-w-0 items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition min-[340px]:gap-3 min-[340px]:px-3',
                      isActive
                        ? 'bg-brand-soft text-foreground'
                        : 'text-foreground hover:bg-surface',
                    )}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border min-[340px]:h-9 min-[340px]:w-9',
                        isActive
                          ? 'border-brand/30 bg-surface-elevated text-brand'
                          : 'border-border bg-surface text-muted',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-semibold leading-snug min-[340px]:text-sm">
                          {option.label}
                        </span>
                        {isActive ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-relaxed text-muted min-[340px]:text-[11px]">
                        {option.description}
                      </span>
                    </span>
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
