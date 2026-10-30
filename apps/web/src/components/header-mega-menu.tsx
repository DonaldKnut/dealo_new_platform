'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  ChevronDown,
  Handshake,
  Route,
  UserRound,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const serviceItems = [
  {
    href: '/services/direct-recruitment',
    title: 'Direct recruitment',
    description: 'Brief → source → screen → shortlist → interview → place.',
    icon: Building2,
  },
  {
    href: '/services/managed-staffing',
    title: 'Managed staffing',
    description: 'Dealo runs hiring operations under clear commercial terms.',
    icon: Handshake,
  },
  {
    href: '/how-it-works',
    title: 'How it works',
    description: 'See the full operating path from request to placement.',
    icon: Route,
  },
  {
    href: '/for-employers',
    title: 'For employers',
    description: 'Hire into your structure with screened shortlists.',
    icon: Users,
  },
  {
    href: '/for-professionals',
    title: 'For professionals',
    description: 'Build a trusted profile and get matched to roles.',
    icon: UserRound,
  },
  {
    href: '/services',
    title: 'All services',
    description: 'Compare recruitment and staffing options.',
    icon: Route,
  },
];

export function HeaderMegaMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 transition hover:text-foreground"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
      >
        Solutions
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 top-[calc(100%+0.85rem)] z-50 w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface-elevated/95 p-3 shadow-[0_24px_60px_rgba(4,47,46,0.16)] backdrop-blur-md"
          >
            <div className="grid gap-1 sm:grid-cols-2">
              {serviceItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href + item.title}
                    href={item.href}
                    className="group flex gap-3 rounded-xl p-3 transition hover:bg-surface"
                    onClick={() => setOpen(false)}
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition group-hover:scale-105">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
