const STORAGE_KEY = 'dealo.auth.remember';

export type RememberedAuth = {
  email: string;
  rememberMe: boolean;
};

export function loadRememberedAuth(): RememberedAuth | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberedAuth;
    if (!parsed?.email || typeof parsed.rememberMe !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveRememberedAuth(email: string, rememberMe: boolean): void {
  if (typeof window === 'undefined') return;
  if (!rememberMe) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ email: email.trim().toLowerCase(), rememberMe: true } satisfies RememberedAuth),
  );
}

export function clearRememberedAuth(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
