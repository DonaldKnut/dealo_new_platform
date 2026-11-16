import type { AssistReport, AssistSession, StoredAuth } from './types';

const STORAGE_KEY = 'dealoAssistAuth';

export async function getAuth(): Promise<StoredAuth | null> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const auth = data[STORAGE_KEY] as StoredAuth | undefined;
  if (!auth?.deviceToken || !auth.apiBase) return null;
  if (auth.expiresAt && Date.parse(auth.expiresAt) <= Date.now()) {
    await chrome.storage.local.remove(STORAGE_KEY);
    return null;
  }
  return auth;
}

export async function setAuth(auth: StoredAuth) {
  await chrome.storage.local.set({ [STORAGE_KEY]: auth });
}

export async function clearAuth() {
  await chrome.storage.local.remove(STORAGE_KEY);
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = await getAuth();
  if (!auth) throw new Error('Not connected. Open Dealo Job Agent and click Continue apply.');
  const res = await fetch(`${auth.apiBase.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.deviceToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchAssistSession(matchId: string) {
  return apiFetch<AssistSession>(`/job-agent/assist/${matchId}/session`);
}

export function mapFields(
  matchId: string,
  fields: { id: string; name: string; label: string; autocomplete: string; type: string; ariaLabel: string; placeholder: string }[],
) {
  return apiFetch<{ mappings: { fieldId: string; vaultKey: string; value: string; confidence: number }[] }>(
    `/job-agent/assist/${matchId}/map-fields`,
    { method: 'POST', body: JSON.stringify({ fields }) },
  );
}

export function reportAssist(matchId: string, report: AssistReport) {
  return apiFetch(`/job-agent/matches/${matchId}/assist-report`, {
    method: 'POST',
    body: JSON.stringify(report),
  });
}
