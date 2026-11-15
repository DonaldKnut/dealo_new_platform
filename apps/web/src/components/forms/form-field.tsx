import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';

export function FormField({
  label,
  error,
  help,
  optional = false,
  hint,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  error?: string;
  help?: string;
  optional?: boolean;
  hint?: ReactNode;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('block space-y-2 text-sm', className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {Icon ? (
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-brand-soft text-brand">
            <Icon className="h-3 w-3" aria-hidden />
          </span>
        ) : null}
        <span className="font-medium text-foreground">{label}</span>
        {optional ? (
          <span className="rounded-full border border-border/80 bg-surface px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase">
            Optional
          </span>
        ) : null}
        {help ? <InfoTooltip label={label} content={help} /> : null}
      </div>
      {Icon ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-3.5 z-[1] text-muted">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="[&_input]:pl-10 [&_textarea]:pl-10 [&_select]:pl-10">{children}</div>
        </div>
      ) : (
        children
      )}
      {hint ? <p className="text-[11px] leading-relaxed text-muted">{hint}</p> : null}
      {error ? <span className="block text-danger">{error}</span> : null}
    </div>
  );
}
