'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Building2,
  ChevronDown,
  Code2,
  CreditCard,
  Info,
  Kanban,
  LifeBuoy,
  Search,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { FAQ_CATEGORIES, type FaqItem } from '@/lib/faq-content';
import { cn } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = {
  about: Info,
  hiring: Building2,
  professionals: UserRound,
  ai: Bot,
  api: Code2,
  software: Kanban,
  pricing: CreditCard,
  privacy: ShieldCheck,
  account: LifeBuoy,
};

function Answer({ item, onNavigate }: { item: FaqItem; onNavigate?: () => void }) {
  return (
    <div className="space-y-1.5 pb-4 pl-1 pr-2 text-sm leading-relaxed text-muted">
      {item.a.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {item.link ? (
        <Link
          href={item.link.href}
          onClick={onNavigate}
          className="group mt-2 inline-flex items-center gap-1 font-semibold text-brand"
        >
          {item.link.label}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      ) : null}
    </div>
  );
}

export function FaqBrowser({
  onNavigate,
  initialCategory = 'about',
  compact = false,
}: {
  /** Called when a link inside an answer is followed (e.g. to close a modal). */
  onNavigate?: () => void;
  initialCategory?: string;
  compact?: boolean;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const term = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!term) return null;
    return FAQ_CATEGORIES.flatMap((cat) =>
      cat.items
        .filter((item) => `${item.q} ${item.a.join(' ')}`.toLowerCase().includes(term))
        .map((item) => ({ item, category: cat })),
    );
  }, [term]);

  const active = FAQ_CATEGORIES.find((cat) => cat.id === category) ?? FAQ_CATEGORIES[0];
  const visible = results ?? active.items.map((item) => ({ item, category: active }));

  return (
    <div className={cn('grid grid-cols-1 gap-4', !compact && 'lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6')}>
      <div className="min-w-0 space-y-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input-field pl-9"
            placeholder="Search questions"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenKey(null);
            }}
          />
        </label>
        <nav
          aria-label="FAQ topics"
          className={cn(
            'scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1',
            !compact && 'lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0',
          )}
        >
          {FAQ_CATEGORIES.map((cat) => {
            const Icon = ICONS[cat.id] ?? Info;
            const selected = !results && cat.id === active.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategory(cat.id);
                  setQuery('');
                  setOpenKey(null);
                }}
                className={cn(
                  'relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors',
                  selected ? 'text-white dark:text-[#071f14]' : 'text-muted hover:bg-surface hover:text-foreground',
                )}
              >
                {selected ? (
                  <motion.span
                    layoutId={compact ? 'faq-cat-compact' : 'faq-cat'}
                    className="absolute inset-0 rounded-xl bg-brand"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <Icon className="relative z-10 h-4 w-4 shrink-0" />
                <span className="relative z-10 whitespace-nowrap">{cat.title}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="min-w-0">
        <div className="mb-2">
          <p className="font-display text-lg font-semibold text-foreground min-[340px]:text-xl">
            {results ? `${results.length} answer${results.length === 1 ? '' : 's'} for “${query.trim()}”` : active.title}
          </p>
          {!results ? <p className="text-sm text-muted">{active.blurb}</p> : null}
        </div>

        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
            No answer found. Try another word, or contact us and we will help.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface-elevated/70">
            {visible.map(({ item, category: cat }, index) => {
              const key = `${cat.id}-${item.q}`;
              const open = openKey === key;
              return (
                <motion.li
                  key={key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index, 8) * 0.03 }}
                  className="px-3 min-[340px]:px-4"
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenKey(open ? null : key)}
                    className="group flex w-full items-start justify-between gap-3 py-3.5 text-left"
                  >
                    <span className="min-w-0">
                      {results ? (
                        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-brand">
                          {cat.title}
                        </span>
                      ) : null}
                      <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-brand min-[340px]:text-[0.95rem]">
                        {item.q}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform duration-300',
                        open && 'rotate-180 text-brand',
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <Answer item={item} onNavigate={onNavigate} />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
