'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { getDashboardHome, isStaffRole, useAuthSession } from '@/hooks/use-auth-session';

/** Partner API keys stay with Dealo staff for now. */
export default function DeveloperLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthSession();
  const router = useRouter();
  const allowed = Boolean(user && isStaffRole(user.roles));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login?next=/dashboard/developer');
      return;
    }
    if (!isStaffRole(user.roles)) {
      router.replace(getDashboardHome(user.roles));
    }
  }, [loading, user, router]);

  if (loading || !allowed) {
    return <div className="min-h-[40vh]" aria-busy="true" />;
  }

  return children;
}
