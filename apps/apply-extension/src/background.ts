import { clearAuth, fetchAssistSession, getAuth, mapFields, reportAssist, setAuth } from './shared/api';
import type { AssistReport, FieldDescriptor, StoredAuth } from './shared/types';

type AssistMsg =
  | { type: 'dealo.assist.ping' }
  | { type: 'dealo.assist.connect'; apiBase: string; deviceToken: string; expiresAt: string; matchId: string; jobUrl?: string }
  | { type: 'dealo.assist.status' }
  | { type: 'dealo.getAuth' }
  | { type: 'dealo.clearAuth' }
  | { type: 'dealo.getSession'; matchId: string }
  | { type: 'dealo.mapFields'; matchId: string; fields: Omit<FieldDescriptor, 'el'>[] }
  | { type: 'dealo.report'; matchId: string; report: AssistReport };

chrome.runtime.onInstalled.addListener(() => {
  console.info('[Dealo Apply] Supervised Apply Copilot ready');
});

chrome.runtime.onMessageExternal.addListener((message: AssistMsg, _sender, sendResponse) => {
  void route(message).then(sendResponse).catch((err: unknown) => {
    sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
  });
  return true;
});

chrome.runtime.onMessage.addListener((message: AssistMsg, _sender, sendResponse) => {
  void route(message).then(sendResponse).catch((err: unknown) => {
    sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
  });
  return true;
});

async function route(message: AssistMsg) {
  if (!message || typeof message !== 'object' || !('type' in message)) {
    return { ok: false, error: 'Unknown message' };
  }

  if (message.type === 'dealo.assist.ping') {
    return { ok: true, installed: true, version: chrome.runtime.getManifest().version };
  }
  if (message.type === 'dealo.assist.status') {
    const auth = await getAuth();
    return { ok: true, connected: Boolean(auth), matchId: auth?.matchId ?? null, expiresAt: auth?.expiresAt ?? null };
  }
  if (message.type === 'dealo.assist.connect') {
    const auth: StoredAuth = {
      apiBase: message.apiBase,
      deviceToken: message.deviceToken,
      expiresAt: message.expiresAt,
      matchId: message.matchId,
    };
    await setAuth(auth);
    if (message.jobUrl) {
      await chrome.tabs.create({ url: message.jobUrl, active: true });
    }
    return { ok: true, connected: true };
  }
  if (message.type === 'dealo.getAuth') {
    return { ok: true, auth: await getAuth() };
  }
  if (message.type === 'dealo.clearAuth') {
    await clearAuth();
    return { ok: true };
  }
  if (message.type === 'dealo.getSession') {
    const session = await fetchAssistSession(message.matchId);
    return { ok: true, session };
  }
  if (message.type === 'dealo.mapFields') {
    const result = await mapFields(message.matchId, message.fields);
    return { ok: true, ...result };
  }
  if (message.type === 'dealo.report') {
    const result = await reportAssist(message.matchId, message.report);
    return { ok: true, result };
  }
  return { ok: false, error: 'Unknown message' };
}
