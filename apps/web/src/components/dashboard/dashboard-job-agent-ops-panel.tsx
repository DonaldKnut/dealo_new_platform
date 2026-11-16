'use client';

import { useCallback, useEffect, useState } from 'react';

import { DashHero, DashPanel } from '@/components/dashboard/dashboard-ui';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  fetchJobAgentAssistAbuse,
  fetchJobAgentHostFrequency,
  type JobAgentAssistAbuse,
  type JobAgentHostFrequencyRow,
} from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';

export function DashboardJobAgentOpsPanel() {
  const toast = useToast();
  const [days, setDays] = useState(7);
  const [abuse, setAbuse] = useState<JobAgentAssistAbuse | null>(null);
  const [hosts, setHosts] = useState<JobAgentHostFrequencyRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, h] = await Promise.all([fetchJobAgentAssistAbuse(days), fetchJobAgentHostFrequency(40)]);
      setAbuse(a);
      setHosts(h);
    } catch (error) {
      toast.error('Unable to load Job Agent ops', error instanceof ApiError ? error.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [days, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Ops"
        title="Job Agent safety"
        subtitle="Assist abuse signals and ExternalJob host frequency — triage before listing moderation, and pick the next offline ATS adapter."
      />

      <div className="flex flex-wrap items-center gap-2">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
              days === d ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted hover:border-brand/40',
            )}
          >
            Last {d}d
          </button>
        ))}
        <button type="button" className="btn-secondary text-xs" disabled={loading} onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <DashPanel>
        <h2 className="font-display text-xl">Assist reports</h2>
        <p className="mt-1 text-sm text-muted">
          Outcomes, pauses, and average fill coverage from extension reports. High pause rates or fee/CAPTCHA spikes are listing-safety signals.
        </p>
        {loading && !abuse ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : abuse ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <Stat label="Reports" value={String(abuse.reports)} />
              <Stat label="Avg coverage" value={abuse.avgCoveragePct == null ? '—' : `${abuse.avgCoveragePct}%`} />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <MiniTable
                title="Outcomes"
                rows={abuse.outcomes.map((r) => ({ key: r.outcome, value: r.count }))}
              />
              <MiniTable title="Pauses" rows={abuse.pauses.map((r) => ({ key: r.pause, value: r.count }))} />
              <MiniTable title="Top Assist hosts" rows={abuse.topHosts.map((r) => ({ key: r.host, value: r.count }))} />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">No Assist reports in this window.</p>
        )}
      </DashPanel>

      <DashPanel>
        <h2 className="font-display text-xl">Host frequency (30d ExternalJob)</h2>
        <p className="mt-1 text-sm text-muted">
          Ranked apply hosts. Prefer adapters for high-count rows without coverage; Workday / Teamtailor stay Assist (no public apply).
        </p>
        {loading && !hosts ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : hosts?.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Host</th>
                  <th className="px-3 py-2">Count</th>
                  <th className="px-3 py-2">Adapter</th>
                </tr>
              </thead>
              <tbody>
                {hosts.map((row) => (
                  <tr key={row.host} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-foreground">{row.host}</td>
                    <td className="px-3 py-2 tabular-nums text-muted">{row.count}</td>
                    <td className="px-3 py-2">
                      {row.hasAdapter ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          Covered
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
                          Assist / next
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">No external job URLs in the window.</p>
        )}
      </DashPanel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function MiniTable({ title, rows }: { title: string; rows: { key: string; value: number }[] }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      {rows.length ? (
        <ul className="mt-2 space-y-1.5">
          {rows.slice(0, 12).map((r) => (
            <li key={r.key} className="flex justify-between gap-2 text-xs">
              <span className="min-w-0 truncate text-foreground">{r.key}</span>
              <span className="tabular-nums text-muted">{r.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted">None yet</p>
      )}
    </div>
  );
}
