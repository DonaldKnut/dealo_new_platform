'use client';

import { LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { TalentOverview } from '@/components/dashboard/talent-overview';
import { ApiError } from '@/lib/api';
import { fetchDashboardOverview, type DashboardOverview } from '@/lib/dashboard-api';

export function TalentHomePanel() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const overview = await fetchDashboardOverview();
        if (active) {
          setData(overview);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Unable to load talent home.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center gap-2 text-sm text-muted">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading your workspace…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-border p-6">
        <p className="text-sm text-danger">{error ?? 'Unable to load.'}</p>
        <Link href="/auth/login" className="btn-secondary mt-4 inline-flex">
          Sign in again
        </Link>
      </div>
    );
  }

  if (data.workspace.kind !== 'talent') {
    return <Link href="/dashboard" className="btn-primary inline-flex">Go to dashboard</Link>;
  }

  return <TalentOverview user={data.user} workspace={data.workspace} />;
}
