'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export function TypewriterTip({
  text,
  className,
  speedMs = 16,
}: {
  text: string;
  className?: string;
  speedMs?: number;
}) {
  const [shown, setShown] = useState('');

  useEffect(() => {
    setShown('');
    let index = 0;
    let cancelled = false;
    let timer: number | undefined;

    const tick = () => {
      if (cancelled) return;
      index += 1;
      setShown(text.slice(0, index));
      if (index < text.length) {
        timer = window.setTimeout(tick, speedMs);
      }
    };

    timer = window.setTimeout(tick, 80);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [speedMs, text]);

  return (
    <p
      className={cn(
        'rounded-xl border border-border/70 bg-surface/70 px-2.5 py-2 text-[10px] leading-relaxed text-muted min-[230px]:px-3 min-[230px]:py-2.5 min-[230px]:text-[11px] min-[340px]:text-xs',
        className,
      )}
      aria-live="polite"
    >
      {shown}
      <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-brand align-middle" />
    </p>
  );
}
