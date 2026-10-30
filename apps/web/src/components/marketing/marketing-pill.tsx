import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const variants = {
  outline:
    'border border-brand/30 bg-surface text-brand',
  soft: 'bg-brand-soft text-brand border border-transparent',
  elevated:
    'border border-brand/30 bg-surface-elevated/80 text-foreground shadow-sm backdrop-blur-md',
} as const;

export function MarketingPill({
  children,
  icon: Icon,
  variant = 'outline',
  className,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase min-[340px]:gap-2 min-[340px]:px-3 min-[340px]:text-xs',
        variants[variant],
        className,
      )}
    >
      {Icon ? <Icon className="h-3 w-3 shrink-0" aria-hidden /> : null}
      {children}
    </span>
  );
}
