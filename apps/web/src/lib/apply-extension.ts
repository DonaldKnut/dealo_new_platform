/**
 * Handshake helpers for the Supervised Apply Copilot MV3 extension.
 * Prefer chrome.runtime.sendMessage when the extension id is known; otherwise use the
 * content-script bridge injected on Dealo origins.
 */

declare global {
  interface Window {
    __DEALO_APPLY_EXT__?: { installed: boolean; id: string; version: string };
    chrome?: {
      runtime?: {
        sendMessage: (
          extensionId: string,
          message: unknown,
          responseCallback?: (response: unknown) => void,
        ) => void;
        lastError?: { message?: string };
      };
    };
  }
}

export type ExtPing = { ok: boolean; installed?: boolean; version?: string; error?: string };
export type ExtConnectResult = { ok: boolean; connected?: boolean; error?: string };

function extensionIdFromPage() {
  return window.__DEALO_APPLY_EXT__?.id ?? null;
}

export function detectApplyExtension(timeoutMs = 800): Promise<{ installed: boolean; id: string | null; version: string | null }> {
  const existing = window.__DEALO_APPLY_EXT__;
  if (existing?.installed) {
    return Promise.resolve({ installed: true, id: existing.id, version: existing.version });
  }

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve({ installed: false, id: null, version: null }), timeoutMs);
    const onMsg = (event: MessageEvent) => {
      if (event.source !== window || !event.data || typeof event.data !== 'object') return;
      const data = event.data as { source?: string; type?: string; extensionId?: string };
      if (data.source !== 'dealo-ext' || data.type !== 'dealo.assist.ready') return;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMsg);
      resolve({
        installed: true,
        id: data.extensionId ?? window.__DEALO_APPLY_EXT__?.id ?? null,
        version: window.__DEALO_APPLY_EXT__?.version ?? null,
      });
    };
    window.addEventListener('message', onMsg);
  });
}

function sendViaBridge<T>(type: string, payload: Record<string, unknown>, timeoutMs = 4000): Promise<T> {
  const requestId = `dealo_${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMsg);
      reject(new Error('Extension did not respond'));
    }, timeoutMs);
    const onMsg = (event: MessageEvent) => {
      if (event.source !== window || !event.data || typeof event.data !== 'object') return;
      const data = event.data as { source?: string; type?: string; requestId?: string; response?: T };
      if (data.source !== 'dealo-ext' || data.type !== `${type}.result` || data.requestId !== requestId) return;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMsg);
      resolve(data.response as T);
    };
    window.addEventListener('message', onMsg);
    window.postMessage({ source: 'dealo-web', type, payload, requestId }, '*');
  });
}

function sendViaChromeRuntime<T>(extensionId: string, message: unknown, timeoutMs = 4000): Promise<T> {
  return new Promise((resolve, reject) => {
    const runtime = window.chrome?.runtime;
    if (!runtime?.sendMessage) {
      reject(new Error('chrome.runtime unavailable'));
      return;
    }
    const timer = window.setTimeout(() => reject(new Error('Extension did not respond')), timeoutMs);
    runtime.sendMessage(extensionId, message, (response) => {
      window.clearTimeout(timer);
      if (runtime.lastError) reject(new Error(runtime.lastError.message ?? 'Extension error'));
      else resolve(response as T);
    });
  });
}

export async function pingApplyExtension(): Promise<ExtPing> {
  const id = extensionIdFromPage();
  try {
    if (id && window.chrome?.runtime?.sendMessage) {
      return await sendViaChromeRuntime<ExtPing>(id, { type: 'dealo.assist.ping' });
    }
    return await sendViaBridge<ExtPing>('dealo.assist.ping', {});
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function connectApplyExtension(input: {
  apiBase: string;
  deviceToken: string;
  expiresAt: string;
  matchId: string;
  jobUrl: string;
}): Promise<ExtConnectResult> {
  const message = { type: 'dealo.assist.connect', ...input };
  const id = extensionIdFromPage();
  try {
    if (id && window.chrome?.runtime?.sendMessage) {
      return await sendViaChromeRuntime<ExtConnectResult>(id, message);
    }
    return await sendViaBridge<ExtConnectResult>('dealo.assist.connect', message);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
