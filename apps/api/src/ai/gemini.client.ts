import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ZodType } from 'zod';

import type { AppEnv } from '../config/env.validation';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Thin Gemini wrapper that only ever returns schema-valid JSON. */
@Injectable()
export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);
  private readonly apiKey?: string;
  readonly model: string;

  constructor(config: ConfigService<AppEnv, true>) {
    this.apiKey = config.get('GEMINI_API_KEY', { infer: true });
    this.model = config.get('GEMINI_MODEL', { infer: true });
  }

  get isConfigured() {
    return Boolean(this.apiKey);
  }

  async json<T>(
    system: string,
    prompt: string,
    schema: ZodType<T>,
    files: { mimeType: string; data: Buffer }[] = [],
  ): Promise<T> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('AI is not configured. Set GEMINI_API_KEY on the API.');
    }

    const response = await fetch(`${ENDPOINT}/${encodeURIComponent(this.model)}:generateContent`, {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [
          {
            role: 'user',
            parts: [
              ...files.map((file) => ({ inlineData: { mimeType: file.mimeType, data: file.data.toString('base64') } })),
              { text: prompt },
            ],
          },
        ],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });

    const body = (await response.json().catch(() => null)) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      error?: { message?: string };
    } | null;
    if (!response.ok) {
      this.logger.warn(`Gemini error ${response.status}: ${body?.error?.message ?? 'unknown'}`);
      throw new ServiceUnavailableException('The AI service did not respond. Please try again.');
    }

    const text = body?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
    } catch {
      throw new ServiceUnavailableException('The AI gave an unreadable answer. Please try again.');
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
      this.logger.warn(`Gemini output failed validation: ${result.error.issues[0]?.message}`);
      throw new ServiceUnavailableException('The AI answer was incomplete. Please try again.');
    }
    return result.data;
  }

  /**
   * Streams plain text for a multi-turn chat. Yields text pieces as Gemini produces them.
   * `signal` stops the upstream request when the visitor closes the chat.
   */
  async *streamText(
    system: string,
    turns: GeminiTurn[],
    options: { signal?: AbortSignal; temperature?: number; maxOutputTokens?: number } = {},
  ): AsyncGenerator<string> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('AI is not configured. Set GEMINI_API_KEY on the API.');
    }
    const timeout = AbortSignal.timeout(60_000);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
    const response = await fetch(`${ENDPOINT}/${encodeURIComponent(this.model)}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: turns.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
        generationConfig: { temperature: options.temperature ?? 0.5, maxOutputTokens: options.maxOutputTokens ?? 1400 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    });
    if (!response.ok || !response.body) {
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      this.logger.warn(`Gemini stream error ${response.status}: ${body?.error?.message ?? 'unknown'}`);
      throw new ServiceUnavailableException('The AI service did not respond. Please try again.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf('\n');
      while (boundary !== -1) {
        const line = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 1);
        boundary = buffer.indexOf('\n');
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const chunk = JSON.parse(payload) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
          const text = chunk.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
          if (text) yield text;
        } catch {
          // A partial or keep-alive line; the next one carries on.
        }
      }
    }
  }
}

export type GeminiTurn = { role: 'user' | 'model'; text: string };
