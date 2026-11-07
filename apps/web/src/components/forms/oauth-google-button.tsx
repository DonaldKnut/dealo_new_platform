'use client';

import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';
import { getGoogleAuthUrl, getOAuthUrl } from '@/lib/api-base';

let providersCache: Promise<{ google: boolean; linkedin: boolean }> | null = null;

/** Google and LinkedIn buttons, each shown only when the API has it switched on. */
export function SocialSignIn({ role, verb = 'Continue' }: { role?: 'EMPLOYER' | 'TALENT'; verb?: string }) {
  const [providers, setProviders] = useState<{ google: boolean; linkedin: boolean } | null>(null);
  useEffect(() => {
    providersCache ??= apiFetch<{ google: boolean; linkedin: boolean }>('/auth/providers').catch(() => ({ google: true, linkedin: false }));
    let active = true;
    void providersCache.then((p) => active && setProviders(p));
    return () => {
      active = false;
    };
  }, []);

  if (!providers) return <div className="h-11 animate-pulse rounded-full bg-surface" aria-hidden />;
  if (!providers.google && !providers.linkedin) return null;
  return (
    <div className={`grid gap-2 ${providers.google && providers.linkedin ? 'min-[400px]:grid-cols-2' : ''}`}>
      {providers.google ? <OAuthGoogleButton label={`${verb} with Google`} role={role} /> : null}
      {providers.linkedin ? (
        <a href={getOAuthUrl('linkedin', role)} className="btn-secondary w-full gap-3 no-underline">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="#0A66C2">
            <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.21 0 22.23 0Z" />
          </svg>
          {verb} with LinkedIn
        </a>
      ) : null}
    </div>
  );
}

export function OAuthGoogleButton({
  label = 'Continue with Google',
  role,
}: {
  label?: string;
  role?: 'EMPLOYER' | 'TALENT';
}) {
  return (
    <a href={getGoogleAuthUrl(role)} className="btn-secondary w-full gap-3 no-underline">
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none">
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
      {label}
    </a>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium uppercase tracking-wider text-muted">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
