'use client';

import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';
import { getGoogleAuthUrl, getOAuthUrl } from '@/lib/api-base';

let providersCache: Promise<{ google: boolean; linkedin: boolean }> | null = null;

/** Google and LinkedIn buttons, each shown only when the API has it switched on. */
export function SocialSignIn({
  role,
  verb = 'Continue',
}: {
  role?: 'EMPLOYER' | 'TALENT';
  verb?: string;
}) {
  const [providers, setProviders] = useState<{ google: boolean; linkedin: boolean } | null>(null);

  useEffect(() => {
    providersCache ??= apiFetch<{ google: boolean; linkedin: boolean }>('/auth/providers').catch(() => {
      providersCache = null;
      return { google: true, linkedin: true };
    });
    let active = true;
    void providersCache.then((p) => active && setProviders(p));
    return () => {
      active = false;
    };
  }, []);

  if (!providers) {
    return (
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" aria-hidden>
        <div className="h-11 sm:h-12 animate-pulse rounded-xl bg-surface/70 ring-1 ring-border/50" />
        <div className="h-11 sm:h-12 animate-pulse rounded-xl bg-surface/70 ring-1 ring-border/50" />
      </div>
    );
  }

  if (!providers.google && !providers.linkedin) return null;

  const hasBoth = Boolean(providers.google && providers.linkedin);

  return (
    <div className={`grid gap-2.5 ${hasBoth ? 'grid-cols-1 min-[420px]:grid-cols-2' : 'grid-cols-1'}`}>
      {providers.google ? (
        <OAuthGoogleButton
          verb={verb}
          role={role}
          adaptive={hasBoth}
        />
      ) : null}

      {providers.linkedin ? (
        <a
          href={getOAuthUrl('linkedin', role)}
          className="group relative flex h-11 sm:h-12 w-full items-center justify-center gap-2.5 sm:gap-3 rounded-xl border border-border/80 bg-surface-elevated px-4 text-xs sm:text-sm font-semibold text-foreground shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0A66C2]/40 hover:bg-[#0A66C2]/[0.03] hover:shadow-md hover:shadow-[#0a66c2]/5 active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2]/40 focus-visible:ring-offset-2 no-underline dark:bg-surface-elevated/90 dark:hover:border-[#0A66C2]/50 dark:hover:bg-[#0A66C2]/10"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105" fill="#0A66C2">
            <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.21 0 22.23 0Z" />
          </svg>
          <span className="truncate">
            {hasBoth ? (
              <>
                <span className="hidden min-[480px]:inline">{verb} with </span>
                <span>LinkedIn</span>
              </>
            ) : (
              `${verb} with LinkedIn`
            )}
          </span>
        </a>
      ) : null}
    </div>
  );
}

export function OAuthGoogleButton({
  label,
  verb = 'Continue',
  role,
  adaptive = false,
}: {
  label?: string;
  verb?: string;
  role?: 'EMPLOYER' | 'TALENT';
  adaptive?: boolean;
}) {
  return (
    <a
      href={getGoogleAuthUrl(role)}
      className="group relative flex h-11 sm:h-12 w-full items-center justify-center gap-2.5 sm:gap-3 rounded-xl border border-border/80 bg-surface-elevated px-4 text-xs sm:text-sm font-semibold text-foreground shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-surface/60 hover:shadow-md hover:shadow-slate-200/50 active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 no-underline dark:bg-surface-elevated/90 dark:hover:border-slate-600 dark:hover:bg-surface/50 dark:hover:shadow-black/40"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105" fill="none">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84Z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
          fill="#EA4335"
        />
      </svg>
      <span className="truncate">
        {label ? (
          label
        ) : adaptive ? (
          <>
            <span className="hidden min-[480px]:inline">{verb} with </span>
            <span>Google</span>
          </>
        ) : (
          `${verb} with Google`
        )}
      </span>
    </a>
  );
}

export function AuthDivider({ text = 'or' }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 py-1 my-1">
      <div className="h-px flex-1 bg-border/70" />
      <span className="text-[11px] font-medium uppercase tracking-widest text-muted/90">{text}</span>
      <div className="h-px flex-1 bg-border/70" />
    </div>
  );
}
