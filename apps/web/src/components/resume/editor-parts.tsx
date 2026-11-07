'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Bold,
  Italic,
  List,
  RemoveFormatting,
  BookOpen,
  Briefcase,
  Building2,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  Contact,
  Crown,
  Globe,
  GraduationCap,
  Hash,
  Landmark,
  Languages,
  Linkedin,
  Mail,
  MapPin,
  PenLine,
  Phone,
  Plus,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Every field gets a matching icon from its label, so new fields pick one up without extra wiring. */
const FIELD_ICONS: Array<[RegExp, LucideIcon]> = [
  [/^full name$|^name$/i, UserRound],
  [/headline/i, Sparkles],
  [/^email$/i, Mail],
  [/phone or email/i, Contact],
  [/phone/i, Phone],
  [/where you live|location/i, MapPin],
  [/linkedin/i, Linkedin],
  [/website|portfolio|link/i, Globe],
  [/job title/i, Briefcase],
  [/company/i, Building2],
  [/^start$/i, CalendarDays],
  [/^end$/i, CalendarCheck2],
  [/school|college/i, GraduationCap],
  [/qualification/i, Award],
  [/course/i, BookOpen],
  [/grade/i, Star],
  [/given by/i, Landmark],
  [/year/i, CalendarDays],
  [/number/i, Hash],
  [/language/i, Languages],
  [/what you did|profile|description/i, PenLine],
];

export function fieldIcon(label: string): LucideIcon {
  return FIELD_ICONS.find(([pattern]) => pattern.test(label))?.[1] ?? PenLine;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength = 140,
  hint,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  hint?: string;
  icon?: LucideIcon;
}) {
  const Icon = icon ?? fieldIcon(label);
  return (
    <label className="group block min-w-0 space-y-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <span className="relative block">
        <span
          aria-hidden
          className="pointer-events-none absolute left-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-brand-soft text-brand transition group-focus-within:bg-brand group-focus-within:text-white dark:group-focus-within:text-[#071f14]"
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <input className="input-field pl-11" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} />
      </span>
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
  rich = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  action?: ReactNode;
  /** Shows a formatting toolbar: **bold**, *italic* and "- " bullet lines, which every CV template renders. */
  rich?: boolean;
}) {
  if (rich) return <RichTextField label={label} value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength} rows={rows} action={action} />;
  const Icon = fieldIcon(label);
  return (
    <label className="block min-w-0 space-y-1.5 text-sm">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <span aria-hidden className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-soft text-brand">
            <Icon className="h-3.5 w-3.5" />
          </span>
          {label}
        </span>
        {action}
      </span>
      <textarea className="input-field resize-y leading-relaxed" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} />
      <span className="block text-right text-[10px] text-muted">
        {value.length}/{maxLength}
      </span>
    </label>
  );
}

function RichTextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  rows,
  action,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength: number;
  rows: number;
  action?: ReactNode;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const Icon = fieldIcon(label);

  /** Wraps the selection in a marker (or inserts an empty pair), then restores the cursor. */
  const wrap = (marker: string) => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end);
    const already = selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= marker.length * 2;
    const replacement = already ? selected.slice(marker.length, -marker.length) : `${marker}${selected || 'text'}${marker}`;
    const next = `${value.slice(0, start)}${replacement}${value.slice(end)}`.slice(0, maxLength);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const inner = already ? 0 : marker.length;
      el.setSelectionRange(start + inner, start + replacement.length - inner);
    });
  };

  /** Turns the selected lines into "- " bullets, or back into plain lines. */
  const toggleList = () => {
    const el = area.current;
    if (!el) return;
    const lineStart = value.lastIndexOf('\n', el.selectionStart - 1) + 1;
    const lineEnd = value.indexOf('\n', el.selectionEnd);
    const end = lineEnd === -1 ? value.length : lineEnd;
    const lines = value.slice(lineStart, end).split('\n');
    const allBullets = lines.every((l) => /^\s*[-•]\s+/.test(l));
    const changed = lines.map((l) => (allBullets ? l.replace(/^\s*[-•]\s+/, '') : `- ${l.replace(/^\s*[-•]\s+/, '')}`)).join('\n');
    onChange(`${value.slice(0, lineStart)}${changed}${value.slice(end)}`.slice(0, maxLength));
    requestAnimationFrame(() => el.focus());
  };

  const clear = () => onChange(value.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1$2').replace(/^\s*[-•]\s+/gm, ''));

  const tools: Array<{ label: string; icon: LucideIcon; run: () => void; keys?: string }> = [
    { label: 'Bold', icon: Bold, run: () => wrap('**'), keys: 'Ctrl+B' },
    { label: 'Italic', icon: Italic, run: () => wrap('*'), keys: 'Ctrl+I' },
    { label: 'Bullet list', icon: List, run: toggleList },
    { label: 'Clear formatting', icon: RemoveFormatting, run: clear },
  ];

  return (
    <div className="block min-w-0 space-y-1.5 text-sm">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <span aria-hidden className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-soft text-brand">
            <Icon className="h-3.5 w-3.5" />
          </span>
          {label}
        </span>
        {action}
      </span>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        <div role="toolbar" aria-label={`${label} formatting`} className="flex items-center gap-0.5 border-b border-border bg-surface/70 px-1.5 py-1">
          {tools.map((tool) => {
            const ToolIcon = tool.icon;
            return (
              <button
                key={tool.label}
                type="button"
                title={tool.keys ? `${tool.label} (${tool.keys})` : tool.label}
                aria-label={tool.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={tool.run}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-background hover:text-brand"
              >
                <ToolIcon className="h-4 w-4" />
              </button>
            );
          })}
          <span className="ml-auto pr-1 text-[10px] tabular-nums text-muted">
            {value.length}/{maxLength}
          </span>
        </div>
        <textarea
          ref={area}
          aria-label={label}
          className="block w-full resize-y bg-transparent px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted"
          rows={rows}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            if (e.key.toLowerCase() === 'b') {
              e.preventDefault();
              wrap('**');
            } else if (e.key.toLowerCase() === 'i') {
              e.preventDefault();
              wrap('*');
            }
          }}
        />
      </div>
      <span className="block text-[11px] text-muted">Select words and tap B for bold or I for italic. Use the list button for bullet points.</span>
    </div>
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
