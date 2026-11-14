'use client';

import { useReducedMotion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Types a headline character-by-character; respects reduced-motion. */
export function TypewriterHeadline({
  text,
  className,
  highlight,
  speedMs = 28,
  as: Tag = 'h1',
}: {
  text: string;
  className?: string;
  /** Substring inside `text` rendered with brand colour once typed. */
  highlight?: string;
  speedMs?: number;
  as?: 'h1' | 'h2' | 'p' | 'span';
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? text.length : 0);

  useEffect(() => {
    if (reduce) {
      setShown(text.length);
      return;
    }
    setShown(0);
    let index = 0;
    let cancelled = false;
    let timer: number | undefined;

    const tick = () => {
      if (cancelled) return;
      index += 1;
      setShown(index);
      if (index < text.length) timer = window.setTimeout(tick, speedMs);
    };

    timer = window.setTimeout(tick, 120);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [reduce, speedMs, text]);

  const visible = text.slice(0, shown);
  const done = shown >= text.length;

  let content: ReactNode = visible;
  if (highlight && visible.includes(highlight)) {
    const start = text.indexOf(highlight);
    const before = visible.slice(0, start);
    const mid = visible.slice(start, Math.min(visible.length, start + highlight.length));
    const after = visible.slice(start + highlight.length);
    content = (
      <>
        {before}
        <span className="text-brand">{mid}</span>
        {after}
      </>
    );
  }

  return (
    <Tag className={cn(className)} aria-label={text}>
      <span aria-hidden>{content}</span>
      {!done ? (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-[0.85em] w-[3px] translate-y-[0.08em] animate-pulse rounded-sm bg-brand align-baseline"
        />
      ) : null}
    </Tag>
  );
}
