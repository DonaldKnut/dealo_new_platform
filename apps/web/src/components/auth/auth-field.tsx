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
  mobileUnderline = false,
}: {
  label: string;
  icon: LucideIcon;
  error?: string;
  trailing?: ReactNode;
  hint?: ReactNode;
  help?: string;
  children: ReactNode;
  suffix?: ReactNode;
  /** Underline-only fields on mobile; boxed desktop (auth page look). */
  mobileUnderline?: boolean;
}) {
  return (
    <div className="block space-y-2 text-sm">
      <div
        className={cn(
          'flex items-center justify-between gap-2',
          mobileUnderline && 'max-lg:justify-start',
        )}
      >
        <span
          className={cn(
            'inline-flex items-center gap-1.5 font-medium text-foreground',
            mobileUnderline && 'max-lg:text-[13px] max-lg:font-normal max-lg:text-muted',
          )}
        >
          {label}
          {help ? <InfoTooltip label={label} content={help} /> : null}
        </span>
        {trailing ? <span className={cn(mobileUnderline && 'max-lg:hidden')}>{trailing}</span> : null}
      </div>
      <span
        className={cn(
          'group flex items-stretch overflow-hidden transition',
          mobileUnderline
            ? cn(
                'max-lg:rounded-none max-lg:border-0 max-lg:border-b max-lg:bg-transparent max-lg:shadow-none',
                error
                  ? 'max-lg:border-danger'
                  : 'max-lg:border-border max-lg:focus-within:border-foreground',
                'lg:rounded-xl lg:border lg:bg-surface-elevated',
                error
                  ? 'lg:border-danger'
                  : 'lg:border-border lg:focus-within:border-brand lg:focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_25%,transparent)]',
              )
            : cn(
                'rounded-xl border bg-surface-elevated',
                error
                  ? 'border-danger'
                  : 'border-border focus-within:border-brand focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_25%,transparent)]',
              ),
        )}
      >
        <span
          className={cn(
            'flex w-11 shrink-0 items-center justify-center border-r border-border bg-surface text-muted transition group-focus-within:text-brand',
            mobileUnderline && 'max-lg:hidden',
          )}
        >
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
  mobileUnderline = false,
  ...inputProps
}: {
  label: string;
  icon: LucideIcon;
  error?: string;
  hint?: ReactNode;
  help?: string;
  trailing?: ReactNode;
  revealable?: boolean;
  mobileUnderline?: boolean;
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
      mobileUnderline={mobileUnderline}
      suffix={
        revealable ? (
          <button
            type="button"
            className={cn(
              'flex w-11 shrink-0 items-center justify-center border-l border-border bg-surface text-muted transition hover:text-foreground',
              mobileUnderline && 'max-lg:w-10 max-lg:border-0 max-lg:bg-transparent',
            )}
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
          'auth-input min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-[0.95rem] text-foreground outline-none placeholder:text-muted/70 min-[400px]:px-3.5 min-[400px]:py-3',
          mobileUnderline && 'max-lg:px-0 max-lg:py-2.5 max-lg:text-[15px]',
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
          'auth-input min-w-0 flex-1 appearance-none border-0 bg-transparent px-3 py-2.5 text-[0.95rem] text-foreground outline-none min-[400px]:px-3.5 min-[400px]:py-3 dark:[color-scheme:dark]',
          className,
        )}
      >
        {children}
      </select>
    </AuthControlShell>
  );
}
