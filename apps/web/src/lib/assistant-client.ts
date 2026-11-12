import type { AssistantMessage, AssistantReply, AssistantStreamEvent } from '@dealo/shared';

import { ApiError, apiFetch } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/api-base';

export const OPEN_ASSISTANT_EVENT = 'dealo:assistant';

/** Opens Dealo AI Assistant from anywhere, optionally asking a question straight away. */
export function openAssistant(prompt?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT, { detail: { prompt } }));
}

type Body = { messages: AssistantMessage[]; page?: string };

/**
 * Streams an answer over server-sent events. If the stream cannot be opened (an old proxy, a network
 * that strips streaming), it falls back to one JSON answer and replays it as events.
 */
export async function streamAssistant(body: Body, onEvent: (event: AssistantStreamEvent) => void, signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/assistant/stream`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    return replay(await apiFetch<AssistantReply>('/assistant/chat', { method: 'POST', json: body, signal }), onEvent);
  }

  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => null)) as { message?: unknown } | null;
    const message = typeof payload?.message === 'string' ? payload.message : 'Dealo AI could not answer just now.';
    throw new ApiError(message, response.status, payload);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let split = buffer.indexOf('\n\n');
    while (split !== -1) {
      const frame = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      split = buffer.indexOf('\n\n');
      const data = frame
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (!data) continue;
      try {
        const event = JSON.parse(data) as AssistantStreamEvent;
        if (event.type === 'done' || event.type === 'error') finished = true;
        onEvent(event);
      } catch {
        // Ignore a malformed frame; the next one carries on.
      }
    }
  }
  if (!finished && !signal.aborted) onEvent({ type: 'error', message: 'The answer was cut off. Please try again.' });
}

function replay(reply: AssistantReply, onEvent: (event: AssistantStreamEvent) => void) {
  onEvent({ type: 'start', id: reply.id, source: reply.source });
  onEvent({ type: 'delta', text: reply.reply });
  onEvent({ type: 'done', reply });
}
