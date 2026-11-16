'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { AgentsHub } from '@/components/agents/agents-hub';
import { isStaffRole, useAuthSession } from '@/hooks/use-auth-session';

/** Hiring Agents stay internal for now — Dealo staff only. */
export default function AtsAgentsPage() {
  const { user, loading } = useAuthSession();
  const router = useRouter();
  const allowed = Boolean(user && isStaffRole(user.roles));

  useEffect(() => {
    if (loading) return;
    if (!allowed) router.replace('/dashboard/ats');
  }, [allowed, loading, router]);

  if (loading || !allowed) {
    return <div className="min-h-[40vh]" aria-busy="true" />;
  }

  return <AgentsHub />;
}
