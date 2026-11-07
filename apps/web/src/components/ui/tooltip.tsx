'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

type Pos = { left: number; top: number; side: 'top' | 'bottom' };

/**
 * Short help bubble on hover or keyboard focus. Touch screens don't hover, so it also
 * opens on a long press (half a second) and closes on the next tap anywhere.
 */
export function Tooltip({
  content,
  children,
  side = 'bottom',
  className,
  delay = 350,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
  delay?: number;
}) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const place = useCallback(() => {
    const el = anchor.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const above = r.top > 90;
    const below = window.innerHeight - r.bottom > 90;
    const actual: Pos['side'] = side === 'top' ? (above ? 'top' : 'bottom') : below ? 'bottom' : 'top';
    const left = Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130);
    setPos({ left, top: actual === 'bottom' ? r.bottom + 8 : r.top - 8, side: actual });
  }, [side]);

  const show = (wait = delay) => {
    clear();
    timer.current = window.setTimeout(place, wait);
  };
  const hide = () => {
    clear();
    setPos(null);
  };

  useEffect(() => {
    if (!pos) return;
    const close = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
      setPos(null);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('pointerdown', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('pointerdown', close);
    };
  }, [pos]);

  useEffect(() => clear, []);

  return (
    <>
      <span
        ref={anchor}
        aria-describedby={pos ? id : undefined}
        className={cn('inline-flex', className)}
        onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
        onPointerLeave={hide}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') show(500);
        }}
        onPointerUp={(e) => {
          if (e.pointerType !== 'mouse' && !pos) clear();
        }}
        onFocus={() => show(0)}
        onBlur={hide}
      >
        {children}
      </span>
      {mounted
        ? createPortal(
            <AnimatePresence>
              {pos ? (
                <motion.span
                  id={id}
                  role="tooltip"
                  initial={{ opacity: 0, y: pos.side === 'bottom' ? -4 : 4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="pointer-events-none fixed z-[300] w-max max-w-[15rem] rounded-xl bg-slate-900 px-3 py-2 text-xs leading-snug text-white shadow-xl dark:bg-[#eaffdf] dark:text-[#071f14]"
                  style={{ left: pos.left, top: pos.top, translateX: '-50%', translateY: pos.side === 'top' ? '-100%' : '0%' }}
                >
                  {content}
                </motion.span>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
