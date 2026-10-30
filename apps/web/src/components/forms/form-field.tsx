import type { ReactNode } from 'react';

import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';

export function FormField({
  label,
  error,
  help,
  children,
  className,
}: {
  label: string;
  error?: string;
  help?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('block space-y-2 text-sm', className)}>
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-foreground">{label}</span>
        {help ? <InfoTooltip label={label} content={help} /> : null}
      </div>
      {children}
      {error ? <span className="block text-danger">{error}</span> : null}
    </div>
  );
}
