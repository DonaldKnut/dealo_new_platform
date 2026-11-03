'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function DashHero({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
    >
      <div className="min-w-0 max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display-title mt-2 text-[1.85rem] text-foreground min-[340px]:text-4xl sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          {subtitle}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </motion.div>
  );
}

export function DashKpi({
  label,
  value,
  hint,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  delay?: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className="dash-kpi"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
          <p className="mt-2 font-display text-3xl text-foreground tabular-nums">{value}</p>
        </div>
        <motion.span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"
          whileHover={{ scale: 1.12, rotate: -8 }}
          transition={{ type: 'spring', stiffness: 420, damping: 16 }}
        >
          <Icon className="h-4 w-4" />
        </motion.span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">{hint}</p>
    </motion.article>
  );
}

export function DashPanel({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`dash-panel p-4 min-[340px]:p-5 sm:p-6 ${className}`}>
      {title || action ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="font-display text-xl text-foreground">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatusChip({ status }: { status: string }) {
  return (
    <span className="w-fit shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-brand">
      {formatStatus(status)}
    </span>
  );
}

export function QuickLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-border bg-surface/50 px-4 py-3 transition hover:border-brand/40 hover:bg-surface"
    >
      <p className="text-sm font-semibold text-foreground group-hover:text-brand">{label}</p>
      <p className="mt-1 text-xs text-muted">{description}</p>
    </Link>
  );
}
