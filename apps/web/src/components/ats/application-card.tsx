'use client';

import { motion } from 'framer-motion';
import { ArrowRightLeft, Check, Clock, FileText, Sparkles, Star } from 'lucide-react';

import { daysSince, type ApplicationCard as Card } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

export function AiBadge({ score, fit, className }: { score: number | null; fit: string | null; className?: string }) {
  if (score === null) {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted', className)}>
        <Sparkles className="h-3 w-3 animate-pulse" /> Screening
      </span>
    );
  }
  return (
    <span
      title={`AI suggestion: ${fit?.toLowerCase()} fit`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums',
        fit === 'STRONG' && 'bg-brand text-white dark:text-[#071f14]',
        fit === 'POSSIBLE' && 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
        fit === 'WEAK' && 'bg-border/70 text-muted',
        className,
      )}
    >
      <Sparkles className="h-3 w-3" /> {score}
    </span>
  );
}

export function ApplicationCardView({
  card,
  selected,
  selectMode,
  draggable,
  onOpen,
  onToggle,
  onMove,
  onDragStart,
}: {
  card: Card;
  selected: boolean;
  selectMode: boolean;
  draggable: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onMove?: () => void;
  onDragStart?: (event: React.DragEvent) => void;
}) {
  const days = daysSince(card.stageChangedAt);
  return (
    <motion.div
      layout
      layoutId={`app-${card.id}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className={cn(
        'group relative rounded-xl border bg-surface-elevated p-3 shadow-sm transition-colors',
        selected ? 'border-brand ring-2 ring-brand/30' : 'border-border hover:border-brand/40',
      )}
    >
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        role="button"
        tabIndex={0}
        onClick={selectMode ? onToggle : onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (selectMode) onToggle();
            else onOpen();
          }
        }}
        className={cn('block min-w-0 outline-none', draggable && 'cursor-grab active:cursor-grabbing')}
      >
        <div className="flex items-start gap-2">
          {selectMode ? (
            <span
              className={cn(
                'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                selected ? 'border-brand bg-brand text-white dark:text-[#071f14]' : 'border-border',
              )}
            >
              {selected ? <Check className="h-3 w-3" /> : null}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{card.name}</p>
            <p className="truncate text-[11px] text-muted">{card.location || card.email}</p>
          </div>
          <AiBadge score={card.aiScore} fit={card.aiFit} className="shrink-0" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-muted">
          {card.rating ? (
            <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-300">
              <Star className="h-3 w-3 fill-current" /> {card.rating}
            </span>
          ) : null}
          <span className={cn('inline-flex items-center gap-0.5', days >= 7 && card.status === 'ACTIVE' && 'font-semibold text-amber-600 dark:text-amber-300')}>
            <Clock className="h-3 w-3" /> {days === 0 ? 'today' : `${days}d`}
          </span>
          {card.cvFileId ? (
            <span className="inline-flex items-center gap-0.5">
              <FileText className="h-3 w-3" /> CV
            </span>
          ) : null}
          {card.source !== 'careers' ? <span className="capitalize">{card.source}</span> : null}
          {card.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-surface px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      </div>
      {onMove && !selectMode ? (
        <button
          type="button"
          onClick={onMove}
          aria-label={`Move ${card.name}`}
          className="absolute bottom-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:border-brand hover:text-brand sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </motion.div>
  );
}
