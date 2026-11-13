'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { AtsFrame } from '@/components/ats/ats-frame';
import { getDashboardHome, isStaffRole, useAuthSession } from '@/hooks/use-auth-session';

/** ATS is an internal Dealo tool — employers and talent are redirected away. */
export default function AtsLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthSession();
  const router = useRouter();
  const allowed = Boolean(user && isStaffRole(user.roles));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login?next=/dashboard/ats');
      return;
    }
    if (!isStaffRole(user.roles)) {
      router.replace(getDashboardHome(user.roles));
    }
  }, [loading, user, router]);

  if (loading || !allowed) {
    return <div className="min-h-[40vh]" aria-busy="true" />;
  }

  return <AtsFrame>{children}</AtsFrame>;
}
