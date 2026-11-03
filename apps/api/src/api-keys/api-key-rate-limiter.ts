import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 60_000;

/**
 * In-process sliding window per API key. Limits are per API instance; with
 * multiple replicas the effective limit is multiplied by the replica count.
 */
@Injectable()
export class ApiKeyRateLimiter {
  private readonly hits = new Map<string, number[]>();

  consume(apiKeyId: string, limitPerMin: number): { remaining: number; resetMs: number } {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    const recent = (this.hits.get(apiKeyId) ?? []).filter((ts) => ts > windowStart);

    if (recent.length >= limitPerMin) {
      this.hits.set(apiKeyId, recent);
      const resetMs = Math.max(0, recent[0] + WINDOW_MS - now);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `API key rate limit exceeded (${limitPerMin}/min). Retry in ${Math.ceil(resetMs / 1000)}s.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    this.hits.set(apiKeyId, recent);

    if (this.hits.size > 10_000) {
      this.prune(windowStart);
    }

    return { remaining: limitPerMin - recent.length, resetMs: recent[0] + WINDOW_MS - now };
  }

  private prune(windowStart: number) {
    for (const [key, stamps] of this.hits) {
      if (stamps.every((ts) => ts <= windowStart)) {
        this.hits.delete(key);
      }
    }
  }
}
