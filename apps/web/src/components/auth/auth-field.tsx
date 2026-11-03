'use client';

import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import {
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';

import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';

function AuthControlShell({
  label,
  icon: Icon,
  error,
  trailing,
  hint,
  help,
  children,
  suffix,
}: {
  label: string;
  icon: LucideIcon;
  error?: string;
  trailing?: ReactNode;
  hint?: ReactNode;
  help?: string;
  children: ReactNode;
  suffix?: ReactNode;
}) {
  return (
    <div className="block space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          {label}
          {help ? <InfoTooltip label={label} content={help} /> : null}
        </span>
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
        {suffix}
      </span>
      {hint}
      {error ? <span className="block text-danger">{error}</span> : null}
    </div>
  );
}

export function AuthField({
  label,
  icon,
  error,
  hint,
  help,
  trailing,
  className,
  type,
  revealable = false,
  ...inputProps
}: {
  label: string;
  icon: LucideIcon;
  error?: string;
  hint?: ReactNode;
  help?: string;
  trailing?: ReactNode;
  revealable?: boolean;
} & InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password' || revealable;
  const inputType = isPassword && revealable ? (visible ? 'text' : 'password') : type;

  return (
    <AuthControlShell
      label={label}
      icon={icon}
      error={error}
      trailing={trailing}
      hint={hint}
      help={help}
      suffix={
        revealable ? (
          <button
            type="button"
            className="flex w-11 shrink-0 items-center justify-center border-l border-border bg-surface text-muted transition hover:text-foreground"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        ) : null
      }
    >
      <input
        {...inputProps}
        type={inputType}
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
  help,
  children,
  className,
  ...selectProps
}: {
  label: string;
  icon: LucideIcon;
  error?: string;
  help?: string;
  children: ReactNode;
  className?: string;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <AuthControlShell label={label} icon={icon} error={error} help={help}>
      <select
        {...selectProps}
        className={cn(
          'min-w-0 flex-1 appearance-none border-0 bg-surface-elevated px-3 py-2.5 text-[0.95rem] text-foreground outline-none min-[400px]:px-3.5 min-[400px]:py-3 dark:bg-surface-elevated dark:[color-scheme:dark]',
          className,
        )}
      >
        {children}
      </select>
    </AuthControlShell>
  );
}
