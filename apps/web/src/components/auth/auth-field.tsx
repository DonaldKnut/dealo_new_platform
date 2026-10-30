'use client';

import type { LucideIcon } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

function AuthControlShell({
  label,
  icon: Icon,
  error,
  trailing,
  hint,
  children,
}: {
  label: string;
  icon: LucideIcon;
  error?: string;
  trailing?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">{label}</span>
        {trailing}
      </div>
      <span
        className={cn(
          'group flex items-stretch overflow-hidden rounded-xl border bg-surface-elevated transition',
          error
            ? 'border-danger'
            : 'border-border focus-within:border-brand focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_25%,transparent)]',
        )}
      >
        <span className="flex w-11 shrink-0 items-center justify-center border-r border-border bg-surface text-muted transition group-focus-within:text-brand">
          <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
        {children}
      </span>
      {hint}
      {error ? <span className="block text-danger">{error}</span> : null}
    </label>
  );
}

export function AuthField({
  label,
  icon,
  error,
  hint,
  trailing,
  className,
  ...inputProps
}: {
  label: string;
  icon: LucideIcon;
  error?: string;
  hint?: ReactNode;
  trailing?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <AuthControlShell label={label} icon={icon} error={error} trailing={trailing} hint={hint}>
      <input
        {...inputProps}
        className={cn(
          'min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-[0.95rem] text-foreground outline-none placeholder:text-muted/70 min-[400px]:px-3.5 min-[400px]:py-3',
          className,
        )}
      />
    </AuthControlShell>
  );
}

export function AuthSelectField({
  label,
  icon,
  error,
  children,
  className,
  ...selectProps
}: {
  label: string;
  icon: LucideIcon;
  error?: string;
  children: ReactNode;
  className?: string;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <AuthControlShell label={label} icon={icon} error={error}>
      <select
        {...selectProps}
        className={cn(
          'min-w-0 flex-1 appearance-none border-0 bg-transparent px-3 py-2.5 text-[0.95rem] text-foreground outline-none min-[400px]:px-3.5 min-[400px]:py-3',
          className,
        )}
      >
        {children}
      </select>
    </AuthControlShell>
  );
}
