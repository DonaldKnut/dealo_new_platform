'use client';

import { useCallback, useEffect, useState } from 'react';

import { fetchAuthMe } from '@/lib/dashboard-api';

export type AuthSessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isEmailVerified?: boolean;
  avatarUrl?: string | null;
  /** New Google/LinkedIn account that has not picked a role yet. */
  needsOnboarding?: boolean;
};

const STAFF_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'RECRUITER',
  'FINANCE',
  'OPERATIONS',
]);

export function isStaffRole(roles: string[]) {
  return roles.some((role) => STAFF_ROLES.has(role));
}

export function getRoleGroup(roles: string[]): 'admin' | 'employer' | 'talent' {
  if (isStaffRole(roles)) return 'admin';
  if (roles.includes('TALENT') && !roles.includes('EMPLOYER')) return 'talent';
  return 'employer';
}

export function getDashboardHome(roles: string[]) {
  const group = getRoleGroup(roles);
  if (group === 'talent') return '/dashboard/talent-home';
  if (group === 'employer') return '/dashboard';
  return '/dashboard';
}

export function getPrimaryCta(roles: string[]) {
  const group = getRoleGroup(roles);
  if (group === 'admin') {
    return { href: '/dashboard', label: 'Admin dashboard' };
  }
  if (group === 'talent') {
    return { href: '/dashboard/talent-home', label: 'My profile' };
  }
  return { href: '/hire', label: 'New hire request' };
}

export function useAuthSession() {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchAuthMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { user, loading, refresh, isAuthenticated: Boolean(user) };
}
