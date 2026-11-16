/**
 * Runs on Dealo web app origins. Marks the page so the dashboard can detect the extension
 * and forwards handshake messages when externally_connectable is unavailable (fallback).
 */
const FLAG = '__DEALO_APPLY_EXT__';

declare global {
  interface Window {
    [FLAG]?: { installed: boolean; id: string; version: string };
  }
}

window[FLAG] = {
  installed: true,
  id: chrome.runtime.id,
  version: chrome.runtime.getManifest().version,
};

window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || typeof event.data !== 'object') return;
  const data = event.data as { source?: string; type?: string; payload?: unknown; requestId?: string };
  if (data.source !== 'dealo-web' || !data.type?.startsWith('dealo.assist.')) return;

  chrome.runtime.sendMessage({ ...(data.payload as object), type: data.type }, (response) => {
    window.postMessage(
      {
        source: 'dealo-ext',
        type: `${data.type}.result`,
        requestId: data.requestId,
        response: response ?? { ok: false, error: chrome.runtime.lastError?.message },
      },
      '*',
    );
  });
});

window.postMessage({ source: 'dealo-ext', type: 'dealo.assist.ready', extensionId: chrome.runtime.id }, '*');
