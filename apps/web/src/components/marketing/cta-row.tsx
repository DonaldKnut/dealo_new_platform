import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function CtaRow({
  children,
  className,
  align = 'start',
}: {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'center';
}) {
  return (
    <div
      className={cn(
        'mt-6 flex flex-col gap-2.5 min-[340px]:mt-8 min-[340px]:gap-3 min-[400px]:flex-row min-[400px]:flex-wrap',
        align === 'center' && 'min-[400px]:items-center',
        className,
      )}
    >
      {children}
    </div>
  );
}
