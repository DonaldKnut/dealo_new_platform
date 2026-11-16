import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';

const TTL_MS = 30 * 60_000;

type Entry = { userId: string; expiresAt: number };

/**
 * Short-lived opaque tokens (`dja_…`) for the Supervised Apply browser extension.
 * In-memory on purpose for Phase 2 — restart invalidates sessions (acceptable for assist).
 */
@Injectable()
export class DeviceTokenService {
  private readonly tokens = new Map<string, Entry>();

  constructor(private readonly users: UsersService) {}

  create(userId: string) {
    this.prune();
    const token = `dja_${randomBytes(24).toString('base64url')}`;
    const expiresAt = Date.now() + TTL_MS;
    this.tokens.set(this.hash(token), { userId, expiresAt });
    return { token, expiresAt: new Date(expiresAt).toISOString(), expiresInSeconds: Math.floor(TTL_MS / 1000) };
  }

  /** Resolve a live device token to a user id, or null. */
  resolveUserId(token: string): string | null {
    if (!token?.startsWith('dja_')) return null;
    const key = this.hash(token);
    const entry = this.tokens.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) this.tokens.delete(key);
      return null;
    }
    return entry.userId;
  }

  /** Authenticate a Bearer `dja_…` token into an AuthUser (for ApiKeyOrJwtGuard). */
  async authenticateBearer(token: string): Promise<AuthUser> {
    const userId = this.resolveUserId(token);
    if (!userId) throw new UnauthorizedException('Device token expired or invalid');
    const user = await this.users.findById(userId);
    if (!user || !user.isActive) throw new UnauthorizedException('Device token expired or invalid');
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      permissions: user.permissions,
      authType: 'jwt',
    };
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private prune() {
    const now = Date.now();
    for (const [key, value] of this.tokens) if (value.expiresAt <= now) this.tokens.delete(key);
  }
}
