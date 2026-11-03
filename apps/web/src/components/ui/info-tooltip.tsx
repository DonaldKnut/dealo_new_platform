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
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    placeBelow: boolean;
  } | null>(null);
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const canHoverRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    canHoverRef.current = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const gutter = window.innerWidth < 340 ? 8 : 12;
      const panelWidth = Math.min(280, Math.max(160, window.innerWidth - gutter * 2));
      let left =
        align === 'right' ? rect.right - panelWidth : rect.left;

      // On very narrow screens, center the panel so it never clips.
      if (window.innerWidth <= 360) {
        left = (window.innerWidth - panelWidth) / 2;
      } else {
        left = Math.max(gutter, Math.min(left, window.innerWidth - panelWidth - gutter));
      }

      const estimatedHeight = panelRef.current?.offsetHeight ?? 120;
      const spaceAbove = rect.top - gutter;
      const spaceBelow = window.innerHeight - rect.bottom - gutter;
      const placeBelow = spaceAbove < estimatedHeight + 8 || spaceBelow >= spaceAbove;
      const top = placeBelow ? rect.bottom + 8 : rect.top - 8;
      const maxHeight = Math.max(
        96,
        Math.min(placeBelow ? spaceBelow - 8 : spaceAbove - 8, Math.floor(window.innerHeight * 0.55)),
      );

      setCoords({
        top,
        left,
        width: panelWidth,
        maxHeight,
        placeBelow,
      });
    };

    updatePosition();
    // Re-measure after paint so height-based placement is accurate.
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.cancelAnimationFrame(frame);
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

  return (
    <span className={cn('relative inline-flex shrink-0 items-center', className)}>
      <button
        ref={triggerRef}
        type="button"
        className="info-tooltip-trigger inline-flex h-5 w-5 items-center justify-center rounded-full text-brand transition hover:bg-brand-soft hover:text-brand-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand min-[340px]:h-5 min-[340px]:w-5"
        aria-label={`More about ${label}`}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onMouseEnter={() => {
          if (canHoverRef.current) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onMouseLeave={() => {
          if (canHoverRef.current) setOpen(false);
        }}
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
              className="info-tooltip-panel fixed z-[200] overflow-y-auto rounded-lg border border-border bg-surface-elevated p-2.5 text-left text-[11px] leading-relaxed text-muted shadow-[0_18px_40px_rgba(4,47,46,0.22)] min-[340px]:rounded-xl min-[340px]:p-3 min-[340px]:text-xs"
              style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
                maxHeight: coords.maxHeight,
                transform: coords.placeBelow ? 'none' : 'translateY(-100%)',
              }}
              onMouseEnter={() => {
                if (canHoverRef.current) setOpen(true);
              }}
              onMouseLeave={() => {
                if (canHoverRef.current) setOpen(false);
              }}
            >
              <span className="mb-1 block text-[11px] font-semibold text-foreground min-[340px]:text-xs">
                {label}
              </span>
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
