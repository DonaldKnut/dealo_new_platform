'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { AtsFrame } from '@/components/ats/ats-frame';
import { canUseAts, getDashboardHome, useAuthSession } from '@/hooks/use-auth-session';

/** Staff and admin-approved job partners can run hiring workspaces and post jobs. */
export default function AtsLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthSession();
  const router = useRouter();
  const allowed = Boolean(user && canUseAts(user.roles));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login?next=/dashboard/ats');
      return;
    }
    if (!canUseAts(user.roles)) {
      router.replace(getDashboardHome(user.roles));
    }
  }, [loading, user, router]);

  if (loading || !allowed) {
    return <div className="min-h-[40vh]" aria-busy="true" />;
  }

  return <AtsFrame>{children}</AtsFrame>;
}
