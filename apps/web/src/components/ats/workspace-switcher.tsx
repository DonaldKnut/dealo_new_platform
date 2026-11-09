'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { ROLE_LABEL, type WorkspaceSummary } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

function Avatar({ name, logoUrl, size = 'md' }: { name: string; logoUrl: string | null; size?: 'sm' | 'md' }) {
  const box = size === 'md' ? 'h-11 w-11 rounded-xl text-sm' : 'h-9 w-9 rounded-lg text-xs';
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="" className={cn(box, 'shrink-0 border border-border bg-white object-contain p-1')} />;
  }
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return <span className={cn(box, 'inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-[#14b8a6] to-[#0f766e] font-bold text-white')}>{letters || 'W'}</span>;
}

/** Current workspace with a menu to switch between workspaces or start a new one. */
export function WorkspaceSwitcher({
  workspaces,
  currentId,
  meta,
  onSelect,
  onCreate,
}: {
  workspaces: WorkspaceSummary[];
  currentId: string | null;
  meta: ReactNode;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = workspaces.find((w) => w.id === currentId) ?? workspaces[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!current) return null;

  return (
    <div ref={root} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="group flex w-full min-w-0 items-center gap-3 rounded-2xl p-1 pr-2 text-left transition hover:bg-surface"
      >
        <Avatar name={current.name} logoUrl={current.logoUrl} />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-display text-xl text-foreground min-[340px]:text-2xl">{current.name}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted transition group-hover:text-brand" />
          </span>
          <span className="block truncate text-xs text-muted">{meta}</span>
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] origin-top-left overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-[0_22px_50px_rgba(4,47,46,0.22)]"
          >
            <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Your workspaces</p>
            <div className="max-h-72 overflow-y-auto p-1.5">
              {workspaces.map((w) => {
                const active = w.id === current.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      setOpen(false);
                      if (!active) onSelect(w.id);
                    }}
                    className={cn('flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition', active ? 'bg-brand-soft' : 'hover:bg-surface')}
                  >
                    <Avatar name={w.name} logoUrl={w.logoUrl} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm font-semibold', active ? 'text-brand' : 'text-foreground')}>{w.name}</span>
                      <span className="block truncate text-[11px] text-muted">
                        {ROLE_LABEL[w.role]} · dealonetwork.com/careers/{w.slug}
                      </span>
                    </span>
                    {active ? <Check className="h-4 w-4 shrink-0 text-brand" /> : null}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-border p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onCreate();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-surface"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-brand/50 text-brand">
                  <Plus className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">New workspace</span>
                  <span className="block text-[11px] text-muted">For another company, brand or branch</span>
                </span>
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
