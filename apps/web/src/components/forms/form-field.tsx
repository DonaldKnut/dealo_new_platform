import type { ReactNode } from 'react';

import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';

export function FormField({
  label,
  error,
  help,
  optional = false,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  help?: string;
  optional?: boolean;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('block space-y-2 text-sm', className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-foreground">{label}</span>
        {optional ? (
          <span className="rounded-full border border-border/80 bg-surface px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase">
            Optional
          </span>
        ) : null}
        {help ? <InfoTooltip label={label} content={help} /> : null}
      </div>
      {children}
      {hint ? <p className="text-[11px] leading-relaxed text-muted">{hint}</p> : null}
      {error ? <span className="block text-danger">{error}</span> : null}
    </div>
  );
}
