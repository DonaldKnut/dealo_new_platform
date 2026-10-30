import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const pads = {
  default: 'py-12 min-[340px]:py-20 sm:py-24 lg:py-28',
  tight: 'py-10 min-[340px]:py-14 sm:py-16',
  cta: 'py-12 min-[340px]:py-20 sm:py-24',
} as const;

export function MarketingSection({
  children,
  bordered = true,
  pad = 'default',
  className,
  containerClassName,
  withContainer = true,
}: {
  children: ReactNode;
  bordered?: boolean;
  pad?: keyof typeof pads;
  className?: string;
  containerClassName?: string;
  withContainer?: boolean;
}) {
  const content = withContainer ? (
    <div className={cn('container-page', containerClassName)}>{children}</div>
  ) : (
    children
  );

  return (
    <section
      className={cn(
        'relative overflow-hidden',
        bordered && 'border-t border-border/80',
        pads[pad],
        className,
      )}
    >
      {content}
    </section>
  );
}
