'use client';

import {
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api';
import { fetchDashboardOverview, type DashboardOverview } from '@/lib/dashboard-api';

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function DashboardOverviewPanel() {
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
          setError(err instanceof ApiError ? err.message : 'Unable to load dashboard.');
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
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading workspace…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-border bg-surface-elevated/70 p-6">
        <p className="text-sm text-danger">{error ?? 'No dashboard data.'}</p>
        <Link href="/auth/login" className="btn-secondary mt-4 inline-flex">
          Sign in again
        </Link>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total requests',
      value: String(data.stats.totalRequests),
      hint: 'All hiring inquiries in scope',
      icon: Briefcase,
    },
    {
      label: 'Open',
      value: String(data.stats.openRequests),
      hint: 'New requests awaiting action',
      icon: Clock3,
    },
    {
      label: 'In progress',
      value: String(data.stats.inProgress),
      hint: 'Contacted or qualified',
      icon: Users,
    },
    {
      label: 'Converted',
      value: String(data.stats.converted),
      hint: 'Moved to placement path',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 min-[400px]:flex-row min-[400px]:items-end min-[400px]:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Overview</p>
          <h1 className="display-title mt-2 text-[1.65rem] text-foreground min-[340px]:text-3xl sm:text-4xl">
            Welcome back, {data.user.firstName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
            Live hiring requests and pipeline signals from your Dealo workspace.
          </p>
        </div>
        <Link href="/hire" className="btn-primary w-full min-[400px]:w-auto">
          New hiring request
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.label}
              className="rounded-2xl border border-border bg-surface-elevated/80 p-4 min-[340px]:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted">{stat.label}</p>
                  <p className="mt-2 font-display text-2xl text-foreground min-[340px]:text-3xl">
                    {stat.value}
                  </p>
                </div>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-xs text-muted">{stat.hint}</p>
            </article>
          );
        })}
      </div>

      <section className="rounded-2xl border border-border bg-surface-elevated/70 p-4 min-[340px]:p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-foreground">Recent requests</h2>
          <Link href="/dashboard/requests" className="text-sm font-semibold text-brand">
            View all
          </Link>
        </div>
        {data.recentRequests.length === 0 ? (
          <p className="mt-5 text-sm text-muted">
            No hiring requests yet.{' '}
            <Link href="/hire" className="font-semibold text-brand">
              Submit your first brief
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-border">
            {data.recentRequests.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 min-[480px]:flex-row min-[480px]:items-start min-[480px]:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{item.roleTitle}</p>
                  <p className="mt-1 text-xs text-muted">
                    {item.companyName} · {item.serviceType.replaceAll('_', ' ').toLowerCase()} ·{' '}
                    {item.numberOfProfessionals} headcount
                  </p>
                </div>
                <span className="w-fit shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-brand">
                  {formatStatus(item.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
