import type { UserRole } from '@prisma/client';

export type AuthType = 'jwt' | 'api_key';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  permissions: string[];
  authType?: AuthType;
  /** Present when authenticated via API key */
  scopes?: string[];
  apiKeyId?: string;
  apiKeyPlan?: string;
  apiKeyEnvironment?: 'LIVE' | 'TEST';
  rateLimitPerMin?: number;
  organizationId?: string | null;
}

export interface JwtPayload {
  sub: string;
  email: string;
  roles: UserRole[];
  permissions: string[];
  type: 'access' | 'refresh';
}
