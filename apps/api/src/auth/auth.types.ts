import type { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  permissions: string[];
}

export interface JwtPayload {
  sub: string;
  email: string;
  roles: UserRole[];
  permissions: string[];
  type: 'access' | 'refresh';
}
