'use client';

import { useEffect, useState } from 'react';

import { DashHero, DashPanel } from '@/components/dashboard/dashboard-ui';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { fetchAuditLogs, type AuditLogRow } from '@/lib/dashboard-api';

export function DashboardAuditPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchAuditLogs();
        if (active) setRows(data);
      } catch (error) {
        toast.error(
          'Unable to load audit logs',
          error instanceof ApiError ? error.message : undefined,
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Admin"
        title="Audit logs"
        subtitle="Backend actions and frontend client events. Super admins and admins can review who did what, when."
      />

      <DashPanel>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-display text-xl">Recent events</h2>
          <InfoTooltip
            label="Audit logs"
            content="Every important change (login-related client events, ticket creates, mail sends, candidate updates) is recorded here for accountability."
          />
        </div>
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">No audit events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Entity</th>
                  <th className="px-3 py-2">Actor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap text-muted">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground">{row.action}</td>
                    <td className="px-3 py-2 text-muted">
                      {row.entityType}
                      {row.entityId ? ` · ${row.entityId.slice(0, 8)}…` : ''}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {row.actor
                        ? `${row.actor.firstName} ${row.actor.lastName}`.trim() ||
                          row.actor.email
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashPanel>
    </div>
  );
}
