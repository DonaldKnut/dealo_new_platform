'use client';

import { LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api';
import { fetchDashboardRequests, type DashboardRequest } from '@/lib/dashboard-api';

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function DashboardRequestsPanel() {
  const [rows, setRows] = useState<DashboardRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchDashboardRequests();
        if (active) {
          setRows(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Unable to load requests.');
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
        Loading requests…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 min-[400px]:flex-row min-[400px]:items-end min-[400px]:justify-between">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h1 className="display-title mt-2 text-[1.65rem] min-[340px]:text-3xl">Hiring requests</h1>
          <p className="mt-2 text-sm text-muted">Live briefs from `/dashboard/requests`.</p>
        </div>
        <Link href="/hire" className="btn-primary w-full min-[400px]:w-auto">
          New request
        </Link>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-3 py-3 font-medium min-[340px]:px-4">Company</th>
                <th className="px-3 py-3 font-medium min-[340px]:px-4">Role</th>
                <th className="hidden px-4 py-3 font-medium min-[480px]:table-cell">Service</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Headcount</th>
                <th className="px-3 py-3 font-medium min-[340px]:px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No requests yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-3.5 text-foreground min-[340px]:px-4">{row.companyName}</td>
                    <td className="px-3 py-3.5 text-foreground min-[340px]:px-4">{row.roleTitle}</td>
                    <td className="hidden px-4 py-3.5 text-muted min-[480px]:table-cell">
                      {row.serviceType.replaceAll('_', ' ')}
                    </td>
                    <td className="hidden px-4 py-3.5 text-muted sm:table-cell">
                      {row.numberOfProfessionals}
                    </td>
                    <td className="px-3 py-3.5 min-[340px]:px-4">
                      <span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-brand">
                        {formatStatus(row.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
