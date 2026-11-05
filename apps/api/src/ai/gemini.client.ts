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
}
