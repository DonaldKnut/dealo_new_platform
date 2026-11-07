import { getApiBaseUrl } from '@/lib/api-base';

/** Free hosting can take up to a minute to wake the API, so wait that long before giving up. */
const TIMEOUT_MS = 60_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function messageFrom(payload: unknown, fallback: string) {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const message = (payload as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return fallback;
}

const NO_REFRESH = /^\/auth\/(login|register|logout|refresh)\b/;
let refreshing: Promise<boolean> | null = null;

/** Access cookies last 15 minutes; one shared refresh renews them for every request that was waiting. */
function refreshSession() {
  refreshing ??= fetch(`${getApiBaseUrl()}/auth/refresh`, { method: 'POST', credentials: 'include', signal: AbortSignal.timeout(TIMEOUT_MS) })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function send(path: string, init: RequestInit, fallback: string, retried = false): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      credentials: 'include',
      signal: init.signal ?? AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    // Status 0 means the request never got an answer (offline, timed out, or the server is down).
    const timedOut = error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError');
    throw new ApiError(timedOut ? 'Dealo is taking too long to answer. Please try again.' : 'Could not reach Dealo. Check your connection.', 0);
  }
  if (response.status === 401 && !retried && typeof window !== 'undefined' && !NO_REFRESH.test(path) && (await refreshSession())) {
    return send(path, init, fallback, true);
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(messageFrom(payload, fallback), response.status, payload);
  return payload;
}

export async function apiFetch<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.json !== undefined) headers.set('Content-Type', 'application/json');
  return (await send(path, { ...init, headers, body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body }, 'Request failed')) as T;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  return (await send(path, { method: 'POST', body: formData }, 'Upload failed')) as T;
}
