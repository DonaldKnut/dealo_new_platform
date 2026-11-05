'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, ChevronDown, Crown, Plus, Trash2, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength = 140,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  hint?: string;
}) {
  return (
    <label className="block min-w-0 space-y-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input className="input-field" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} />
      {hint ? <span className="block text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function AreaField({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 2000,
  rows = 5,
  action,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  action?: ReactNode;
}) {
  return (
    <label className="block min-w-0 space-y-1.5 text-sm">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-foreground">{label}</span>
        {action}
      </span>
      <textarea className="input-field resize-y leading-relaxed" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} />
      <span className="block text-right text-[10px] text-muted">
        {value.length}/{maxLength}
      </span>
    </label>
  );
}

/** Collapsible card for one job, school, licence… with move and delete. */
export function ItemCard({
  title,
  subtitle,
  index,
  count,
  onMove,
  onRemove,
  defaultOpen,
  children,
}: {
  title: string;
  subtitle?: string;
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <motion.div layout className="overflow-hidden rounded-2xl border border-border bg-surface-elevated">
      <div className="flex items-center gap-1 p-2 pl-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left">
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
            {subtitle ? <span className="block truncate text-[11px] text-muted">{subtitle}</span> : null}
          </span>
        </button>
        <div className="flex shrink-0 items-center">
          <IconButton label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Move down" disabled={index === count - 1} onClick={() => onMove(1)}>
            <ArrowDown className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Delete" danger onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
            <div className="space-y-3 border-t border-border p-3">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

export function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-full text-muted transition disabled:opacity-30',
        danger ? 'hover:bg-danger/10 hover:text-danger' : 'hover:bg-surface hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

export function AddButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border px-3 py-3 text-sm font-semibold text-muted transition hover:border-brand hover:text-brand disabled:opacity-40"
    >
      <Plus className="h-4 w-4" /> {label}
    </button>
  );
}

export function BulletsEditor({ bullets, onChange }: { bullets: string[]; onChange: (b: string[]) => void }) {
  const list = bullets.length ? bullets : [''];
  const set = (i: number, v: string) => onChange(list.map((b, j) => (j === i ? v : b)));
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-foreground">What you did</span>
      {list.map((b, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          <textarea
            className="input-field min-h-[2.75rem] flex-1 resize-y py-2 text-sm leading-snug"
            rows={2}
            value={b}
            maxLength={400}
            onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && list.length < 12) {
                e.preventDefault();
                onChange([...list.slice(0, i + 1), '', ...list.slice(i + 1)]);
              }
            }}
            placeholder={i === 0 ? 'Installed and tested wiring for 12 new homes' : 'Another result or duty'}
          />
          <IconButton label="Remove point" onClick={() => onChange(list.filter((_, j) => j !== i))}>
            <X className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      ))}
      {list.length < 12 ? (
        <button type="button" onClick={() => onChange([...list, ''])} className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
          <Plus className="h-3.5 w-3.5" /> Add a point
        </button>
      ) : null}
    </div>
  );
}

export function ChipsInput({
  values,
  onChange,
  suggestions = [],
  max = 40,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  max?: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s.length <= 60 && !values.some((v) => v.toLowerCase() === s.toLowerCase()));
    if (parts.length) onChange([...values, ...parts].slice(0, max));
    setDraft('');
  };
  const left = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 12);
  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <input
          className="input-field"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder={placeholder}
          maxLength={60}
        />
        <button type="button" aria-label="Add" onClick={() => add(draft)} className="btn-secondary shrink-0 px-3">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {values.length ? (
        <div className="flex flex-wrap gap-1.5">
          <AnimatePresence>
            {values.map((v) => (
              <motion.span
                key={v}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand"
              >
                <span className="min-w-0 break-words">{v}</span>
                <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      ) : null}
      {left.length ? (
        <div>
          <p className="mb-1.5 text-[11px] text-muted">Tap to add</p>
          <div className="flex flex-wrap gap-1.5">
            {left.map((s) => (
              <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted transition hover:border-brand hover:text-brand">
                + {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PremiumBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300', className)}>
      <Crown className="h-2.5 w-2.5" /> Premium
    </span>
  );
}

export function moveItem<T>(list: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
