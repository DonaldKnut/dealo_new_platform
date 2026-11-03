'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BriefcaseBusiness, Check, ChevronDown, HardHat, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';

type RoleOption = {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const DEFAULT_OPTIONS: RoleOption[] = [
  {
    value: 'EMPLOYER',
    label: 'Employer',
    description: 'Hiring office talent or skilled trades for your company',
    icon: BriefcaseBusiness,
  },
  {
    value: 'TALENT',
    label: 'Professional',
    description: 'Looking for checked roles in office work or trades',
    icon: HardHat,
  },
];

export function AuthRoleDropdown<T extends FieldValues>({
  control,
  name,
  label = 'I am joining as',
  help,
  error,
  options = DEFAULT_OPTIONS,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  help?: string;
  error?: string;
  options?: RoleOption[];
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

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

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const selected = options.find((option) => option.value === field.value) ?? options[0];
        const SelectedIcon = selected.icon;

        return (
          <div ref={rootRef} className="relative block space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                {label}
                {help ? <InfoTooltip label={label} content={help} /> : null}
              </span>
            </div>

            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={listId}
              onClick={() => setOpen((current) => !current)}
              className={cn(
                'group flex w-full items-stretch overflow-hidden rounded-xl border bg-surface-elevated text-left transition',
                error
                  ? 'border-danger'
                  : open
                    ? 'border-brand shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_25%,transparent)]'
                    : 'border-border hover:border-brand/40',
              )}
            >
              <span className="flex w-11 shrink-0 items-center justify-center border-r border-border bg-surface text-brand">
                <SelectedIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1 px-3 py-2.5 min-[400px]:px-3.5 min-[400px]:py-3">
                <span className="block truncate font-semibold text-foreground">{selected.label}</span>
                <span className="mt-0.5 block truncate text-[11px] text-muted">
                  {selected.description}
                </span>
              </span>
              <span className="flex w-11 shrink-0 items-center justify-center border-l border-border bg-surface text-muted">
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
                  className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface-elevated p-1.5 shadow-xl"
                >
                  {options.map((option) => {
                    const Icon = option.icon;
                    const isActive = option.value === field.value;
                    return (
                      <li key={option.value} role="option" aria-selected={isActive}>
                        <button
                          type="button"
                          className={cn(
                            'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition',
                            isActive
                              ? 'bg-brand-soft text-foreground'
                              : 'text-foreground hover:bg-surface',
                          )}
                          onClick={() => {
                            field.onChange(option.value);
                            setOpen(false);
                          }}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                              isActive
                                ? 'border-brand/30 bg-surface-elevated text-brand'
                                : 'border-border bg-surface text-muted',
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{option.label}</span>
                              {isActive ? <Check className="h-4 w-4 shrink-0 text-brand" /> : null}
                            </span>
                            <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
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

            {error ? <span className="block text-danger">{error}</span> : null}
          </div>
        );
      }}
    />
  );
}
