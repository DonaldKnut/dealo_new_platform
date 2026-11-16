'use client';

import { Building2, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DashHero, DashPanel, StatusChip } from '@/components/dashboard/dashboard-ui';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  listDashboardOrganizations,
  updateDashboardOrganization,
  type DashboardOrganization,
} from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';

const FILTERS = [
  { id: 'PENDING' as const, label: 'Pending' },
  { id: 'VERIFIED' as const, label: 'Verified' },
  { id: 'REJECTED' as const, label: 'Declined' },
  { id: 'UNVERIFIED' as const, label: 'Unverified' },
  { id: 'ALL' as const, label: 'All' },
];

export function DashboardOrganizationsPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<DashboardOrganization[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('PENDING');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      setRows(await listDashboardOrganizations());
    } catch (err) {
      toast.error('Could not load organizations', err instanceof ApiError ? err.message : '');
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => (rows ?? []).filter((row) => filter === 'ALL' || row.verificationStatus === filter),
    [rows, filter],
  );

  const act = async (
    id: string,
    body: Parameters<typeof updateDashboardOrganization>[1],
    label: string,
  ) => {
    setBusy(id);
    try {
      await updateDashboardOrganization(id, body);
      toast.success(label);
      setNote('');
      await load();
    } catch (err) {
      toast.error('Could not update', err instanceof ApiError ? err.message : '');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Admin"
        title="Organizations"
        subtitle="Approve company verification, hide careers pages, or deactivate a workspace."
      />

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
        {FILTERS.map((f) => {
          const count = f.id === 'ALL' ? rows?.length ?? 0 : (rows ?? []).filter((r) => r.verificationStatus === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                filter === f.id ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted hover:text-foreground',
              )}
            >
              {f.label} <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {!rows ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : visible.length === 0 ? (
        <DashPanel>
          <p className="text-sm text-muted">No organizations in this filter.</p>
        </DashPanel>
      ) : (
        <div className="grid gap-3">
          {visible.map((org) => (
            <DashPanel key={org.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="h-4 w-4 text-brand" />
                    <p className="font-display text-lg text-foreground">{org.name}</p>
                    <StatusChip status={org.verificationStatus} />
                    {!org.isActive ? <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">Inactive</span> : null}
                    {!org.careersEnabled ? <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">Careers off</span> : null}
                  </div>
                  <p className="text-xs text-muted">
                    /careers/{org.slug}
                    {org.website ? ` · ${org.website}` : ''}
                    {org.workEmail ? ` · ${org.workEmail}${org.workEmailVerifiedAt ? ' (confirmed)' : ' (unconfirmed)'}` : ''}
                  </p>
                  <p className="text-xs text-muted">
                    {org.members} members · {org.jobs} jobs
                    {org.cacNumber ? ` · CAC ${org.cacNumber}` : ''}
                  </p>
                  {org.verificationNote ? <p className="text-xs text-muted">Note: {org.verificationNote}</p> : null}
                </div>
                <div className="flex flex-col gap-2 sm:min-w-[16rem]">
                  {(org.verificationStatus === 'PENDING' || org.verificationStatus === 'REJECTED' || org.verificationStatus === 'UNVERIFIED') &&
                  org.workEmailVerifiedAt ? (
                    <button
                      type="button"
                      className="btn-primary text-xs"
                      disabled={busy === org.id}
                      onClick={() => void act(org.id, { verificationStatus: 'VERIFIED', verificationNote: note || null }, 'Company verified')}
                    >
                      Approve verification
                    </button>
                  ) : null}
                  {org.verificationStatus === 'PENDING' || org.verificationStatus === 'VERIFIED' ? (
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      disabled={busy === org.id}
                      onClick={() =>
                        void act(
                          org.id,
                          { verificationStatus: 'REJECTED', verificationNote: note || 'Needs clearer company details' },
                          'Verification declined',
                        )
                      }
                    >
                      Decline
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    disabled={busy === org.id}
                    onClick={() =>
                      void act(org.id, { careersEnabled: !org.careersEnabled }, org.careersEnabled ? 'Careers page hidden' : 'Careers page public')
                    }
                  >
                    {org.careersEnabled ? 'Hide careers page' : 'Show careers page'}
                  </button>
                  <button
                    type="button"
                    className={cn('text-xs', org.isActive ? 'btn-secondary' : 'btn-primary')}
                    disabled={busy === org.id}
                    onClick={() => void act(org.id, { isActive: !org.isActive }, org.isActive ? 'Organization deactivated' : 'Organization reactivated')}
                  >
                    {org.isActive ? 'Deactivate workspace' : 'Reactivate workspace'}
                  </button>
                  <input
                    className="input-field text-xs"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional note for decline / approve"
                  />
                </div>
              </div>
            </DashPanel>
          ))}
        </div>
      )}
    </div>
  );
}
