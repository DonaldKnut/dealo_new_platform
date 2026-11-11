const DIRECT_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/**
 * In the browser, API calls go to `/api/v1` on this site and are forwarded to the API (see next.config.ts).
 * That keeps the sign-in cookie first-party, which browsers require when the API lives on another domain.
 * Server-side code calls the API directly.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_PROXY !== 'false') return '/api/v1';
  return DIRECT_API_URL;
}

/** Stored file links point at the API host; open them through this site so the sign-in cookie goes with them. */
export function apiFileHref(url: string): string {
  const base = getApiBaseUrl();
  if (base === DIRECT_API_URL) return url;
  const direct = DIRECT_API_URL.replace(/\/$/, '');
  if (url.startsWith(direct)) return `${base}${url.slice(direct.length)}`;
  const origin = direct.replace(/\/api\/v1$/, '');
  return url.startsWith(`${origin}/api/v1/`) ? url.slice(origin.length) : url;
}

export type OAuthProvider = 'google' | 'linkedin';
export type OAuthIntent = 'signin' | 'signup';

export function getOAuthUrl(
  provider: OAuthProvider,
  opts?: { role?: 'EMPLOYER' | 'TALENT'; intent?: OAuthIntent },
): string {
  const params = new URLSearchParams();
  if (opts?.role) params.set('role', opts.role);
  params.set('intent', opts?.intent ?? 'signin');
  const query = params.toString();
  return `${getApiBaseUrl()}/auth/${provider}?${query}`;
}

export function getGoogleAuthUrl(role?: 'EMPLOYER' | 'TALENT', intent: OAuthIntent = 'signin'): string {
  return getOAuthUrl('google', { role, intent });
}
