'use client';

import { HelpCircle } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  label: string;
  content: string;
  className?: string;
  align?: 'left' | 'right';
}

export function InfoTooltip({ label, content, className, align = 'left' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const panelWidth = Math.min(280, window.innerWidth - 24);
      let left =
        align === 'right' ? rect.right - panelWidth : rect.left;
      left = Math.max(12, Math.min(left, window.innerWidth - panelWidth - 12));

      const estimatedHeight = panelRef.current?.offsetHeight ?? 140;
      const spaceAbove = rect.top;
      const placeBelow = spaceAbove < estimatedHeight + 16;
      const top = placeBelow ? rect.bottom + 10 : rect.top - 10;

      setCoords({
        top,
        left,
        width: panelWidth,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, align, content]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const placeBelow =
    coords && triggerRef.current
      ? coords.top >= triggerRef.current.getBoundingClientRect().bottom
      : false;

  return (
    <span className={cn('relative inline-flex items-center', className)}>
      <button
        ref={triggerRef}
        type="button"
        className="info-tooltip-trigger inline-flex h-5 w-5 items-center justify-center rounded-full text-brand transition hover:bg-brand-soft hover:text-brand-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        aria-label={`More about ${label}`}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {mounted && open && coords
        ? createPortal(
            <span
              ref={panelRef}
              id={tooltipId}
              role="tooltip"
              className="info-tooltip-panel fixed z-[200] rounded-xl border border-border bg-surface-elevated p-3 text-left text-xs leading-relaxed text-muted shadow-[0_18px_40px_rgba(4,47,46,0.22)]"
              style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
                transform: placeBelow ? 'none' : 'translateY(-100%)',
              }}
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
            >
              <span className="mb-1 block font-semibold text-foreground">{label}</span>
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
