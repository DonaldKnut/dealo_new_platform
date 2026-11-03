'use client';

import { LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { isStaffRole } from '@/hooks/use-auth-session';
import { ApiError } from '@/lib/api';
import {
  fetchAuthMe,
  fetchDashboardRequests,
  updateHireInquiryStatus,
  type DashboardRequest,
} from '@/lib/dashboard-api';

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'CLOSED'] as const;

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    const [data, me] = await Promise.all([fetchDashboardRequests(), fetchAuthMe()]);
    setRows(data);
    setIsAdmin(isStaffRole(me.roles));
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await load();
        if (active) setError(null);
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

  const onStatusChange = async (id: string, status: string) => {
    setUpdatingId(id);
    setError(null);
    try {
      await updateHireInquiryStatus(id, status);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

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
          <p className="eyebrow">Requests</p>
          <h1 className="display-title mt-2 text-[1.65rem] min-[340px]:text-3xl">
            {isAdmin ? 'Hiring requests' : 'My requests'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {isAdmin
              ? 'Review and advance hire inquiries through the pipeline.'
              : 'Track the status of your open hiring requests.'}
          </p>
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
                <th className="hidden px-4 py-3 font-medium sm:table-cell">People</th>
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
                    <td className="px-3 py-3.5 text-foreground min-[340px]:px-4">
                      {row.companyName}
                      {row.isTest ? (
                        <span className="ml-2 rounded-full border border-amber-500/50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-600">
                          Sandbox
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3.5 text-foreground min-[340px]:px-4">
                      {row.roleTitle}
                    </td>
                    <td className="hidden px-4 py-3.5 text-muted min-[480px]:table-cell">
                      {row.serviceType.replaceAll('_', ' ')}
                    </td>
                    <td className="hidden px-4 py-3.5 text-muted sm:table-cell">
                      {row.numberOfProfessionals}
                    </td>
                    <td className="px-3 py-3.5 min-[340px]:px-4">
                      {isAdmin ? (
                        <select
                          className="rounded-lg border border-border bg-surface-elevated px-2 py-1.5 text-xs font-semibold text-brand"
                          value={row.status}
                          disabled={updatingId === row.id}
                          onChange={(event) => void onStatusChange(row.id, event.target.value)}
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {formatStatus(status)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-brand">
                          {formatStatus(row.status)}
                        </span>
                      )}
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
