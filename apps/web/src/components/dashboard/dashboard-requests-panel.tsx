'use client';

import { Kanban, LoaderCircle, Plus, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { SourcingPanel } from '@/components/ai/sourcing-panel';
import { useOpenHireRequest } from '@/components/dashboard/dashboard-session';
import { HIRE_REQUEST_CREATED_EVENT } from '@/components/hire-inquiry-form';
import { useToast } from '@/components/ui/toast';
import { isStaffRole } from '@/hooks/use-auth-session';
import { ApiError } from '@/lib/api';
import { atsApi, rememberWorkspace } from '@/lib/ats-api';
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
  const [sourcing, setSourcing] = useState<{ id: string; title: string } | null>(null);
  const closeSourcing = useCallback(() => setSourcing(null), []);
  const [dealoWorkspaceId, setDealoWorkspaceId] = useState<string | null>(null);
  const [jobFor, setJobFor] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();
  const openHireRequest = useOpenHireRequest();

  useEffect(() => {
    const refresh = () => void fetchDashboardRequests().then(setRows).catch(() => undefined);
    window.addEventListener(HIRE_REQUEST_CREATED_EVENT, refresh);
    return () => window.removeEventListener(HIRE_REQUEST_CREATED_EVENT, refresh);
  }, []);

  const load = async () => {
    const [data, me] = await Promise.all([fetchDashboardRequests(), fetchAuthMe()]);
    setRows(data);
    const staff = isStaffRole(me.roles);
    setIsAdmin(staff);
    if (staff) {
      const workspaces = await atsApi.workspaces().catch(() => []);
      setDealoWorkspaceId(workspaces.find((w) => w.slug === 'dealo')?.id ?? null);
    }
  };

  /** Turns the request into a draft job on Dealo's own hiring board. */
  const createJob = async (inquiryId: string) => {
    if (!dealoWorkspaceId) return;
    setJobFor(inquiryId);
    try {
      const job = await atsApi.jobFromInquiry(dealoWorkspaceId, inquiryId);
      rememberWorkspace(dealoWorkspaceId);
      toast.success('Draft job ready', 'Check the details, then publish it.');
      router.push(`/dashboard/ats/jobs/${job.id}/edit`);
    } catch (err) {
      toast.error('Could not create the job', err instanceof ApiError ? err.message : '');
      setJobFor(null);
    }
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
            {isAdmin ? 'Talent requests' : 'My requests'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {isAdmin
              ? 'Open each request, update its status, and send a shortlist when ready.'
              : 'See where each request stands. Dealo updates this as we work.'}
          </p>
        </div>
        <button type="button" onClick={openHireRequest} className="btn-primary w-full min-[400px]:w-auto">
          <Plus className="h-4 w-4" /> Request talent
        </button>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {sourcing ? (
        <SourcingPanel hireInquiryId={sourcing.id} title={sourcing.title} onClose={closeSourcing} />
      ) : null}

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
                    {isAdmin
                      ? 'No talent requests yet.'
                      : 'No requests yet. Tap Request talent — Dealo will send a shortlist.'}
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
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => setSourcing({ id: row.id, title: `${row.roleTitle} · ${row.companyName}` })}
                          className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                        >
                          <Sparkles className="h-3 w-3" /> Find people with AI
                        </button>
                      ) : null}
                      {isAdmin && dealoWorkspaceId ? (
                        <button
                          type="button"
                          disabled={jobFor === row.id}
                          onClick={() => void createJob(row.id)}
                          className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline disabled:opacity-60"
                        >
                          <Kanban className="h-3 w-3" /> {jobFor === row.id ? 'Creating job…' : 'Create Dealo job'}
                        </button>
                      ) : null}
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
