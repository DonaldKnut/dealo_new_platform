'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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

type HostFilter = 'all' | 'adapter_candidate' | 'assist_only' | 'covered';

const SUGGESTION_LABEL: Record<NonNullable<JobAgentHostFrequencyRow['suggestion']>, string> = {
  covered: 'Adapter live',
  assist_only: 'Assist only',
  adapter_candidate: 'Next adapter',
};

const SUGGESTION_CLASS: Record<NonNullable<JobAgentHostFrequencyRow['suggestion']>, string> = {
  covered: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  assist_only: 'bg-sky-500/10 text-sky-800 dark:text-sky-200',
  adapter_candidate: 'bg-amber-500/10 text-amber-900 dark:text-amber-200',
};

function resolveSuggestion(row: JobAgentHostFrequencyRow): NonNullable<JobAgentHostFrequencyRow['suggestion']> {
  if (row.suggestion) return row.suggestion;
  return row.hasAdapter ? 'covered' : 'adapter_candidate';
}

export function DashboardJobAgentOpsPanel() {
  const toast = useToast();
  const [days, setDays] = useState(7);
  const [abuse, setAbuse] = useState<JobAgentAssistAbuse | null>(null);
  const [hosts, setHosts] = useState<JobAgentHostFrequencyRow[] | null>(null);
  const [abuseLoading, setAbuseLoading] = useState(true);
  const [hostsLoading, setHostsLoading] = useState(true);
  const [abuseError, setAbuseError] = useState<string | null>(null);
  const [hostsError, setHostsError] = useState<string | null>(null);
  const [hostFilter, setHostFilter] = useState<HostFilter>('all');
  const [hostQuery, setHostQuery] = useState('');

  const loadAbuse = useCallback(async () => {
    setAbuseLoading(true);
    setAbuseError(null);
    try {
      setAbuse(await fetchJobAgentAssistAbuse(days));
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unable to load Assist metrics';
      setAbuseError(message);
      toast.error('Assist abuse metrics failed', message);
    } finally {
      setAbuseLoading(false);
    }
  }, [days, toast]);

  const loadHosts = useCallback(async () => {
    setHostsLoading(true);
    setHostsError(null);
    try {
      setHosts(await fetchJobAgentHostFrequency(60));
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unable to load host frequency';
      setHostsError(message);
      toast.error('Host frequency failed', message);
    } finally {
      setHostsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadAbuse();
  }, [loadAbuse]);

  useEffect(() => {
    void loadHosts();
  }, [loadHosts]);

  const filteredHosts = useMemo(() => {
    const q = hostQuery.trim().toLowerCase();
    return (hosts ?? []).filter((row) => {
      const suggestion = resolveSuggestion(row);
      if (hostFilter !== 'all' && suggestion !== hostFilter) return false;
      if (q && !row.host.includes(q)) return false;
      return true;
    });
  }, [hosts, hostFilter, hostQuery]);

  const hostStats = useMemo(() => {
    const rows = hosts ?? [];
    return {
      total: rows.length,
      covered: rows.filter((r) => resolveSuggestion(r) === 'covered').length,
      assist: rows.filter((r) => resolveSuggestion(r) === 'assist_only').length,
      candidates: rows.filter((r) => resolveSuggestion(r) === 'adapter_candidate').length,
    };
  }, [hosts]);

  const pauseRate =
    abuse && abuse.reports > 0
      ? Math.round((abuse.pauses.reduce((sum, p) => sum + p.count, 0) / abuse.reports) * 100)
      : null;

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Ops"
        title="Job Agent safety"
        subtitle="Live Assist outcomes, pauses, coverage, and ExternalJob host ranks — triage abuse signals and pick the next ATS adapter (SmartRecruiters, BambooHR, Recruitee are live; Workday / Teamtailor stay Assist)."
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
        <button
          type="button"
          className="btn-secondary text-xs"
          disabled={abuseLoading && hostsLoading}
          onClick={() => {
            void loadAbuse();
            void loadHosts();
          }}
        >
          Refresh both
        </button>
      </div>

      <DashPanel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Assist abuse metrics</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Extension reports: outcomes, pause reasons, top hosts, and average field coverage. High pause / fee / CAPTCHA
              rates are listing-safety signals.
            </p>
          </div>
          <button type="button" className="btn-secondary text-xs" disabled={abuseLoading} onClick={() => void loadAbuse()}>
            {abuseLoading ? 'Loading…' : 'Reload Assist'}
          </button>
        </div>

        {abuseError ? <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">{abuseError}</p> : null}

        {abuseLoading && !abuse ? (
          <p className="mt-4 text-sm text-muted">Loading Assist reports…</p>
        ) : abuse ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Reports" value={String(abuse.reports)} hint={`Window ${abuse.days}d`} />
              <Stat
                label="Avg coverage"
                value={abuse.avgCoveragePct == null ? '—' : `${abuse.avgCoveragePct}%`}
                hint="Fields filled / detected"
              />
              <Stat label="Pause events" value={String(abuse.pauses.reduce((s, p) => s + p.count, 0))} hint={pauseRate == null ? '—' : `~${pauseRate} per 100 reports`} />
              <Stat label="Distinct hosts" value={String(abuse.topHosts.length)} hint="Top 20 shown below" />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <MiniTable title="Outcomes" rows={abuse.outcomes.map((r) => ({ key: r.outcome, value: r.count }))} empty="No outcomes yet" />
              <MiniTable title="Pauses" rows={abuse.pauses.map((r) => ({ key: r.pause, value: r.count }))} empty="No pauses yet" />
              <MiniTable title="Top Assist hosts" rows={abuse.topHosts.map((r) => ({ key: r.host, value: r.count }))} empty="No hosts yet" />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">No Assist reports in this window.</p>
        )}
      </DashPanel>

      <DashPanel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Host frequency → next ATS</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Ranked ExternalJob apply hosts (30d). Prefer adapters for high-count <span className="font-semibold text-foreground">Next adapter</span>{' '}
              rows. Greenhouse, Lever, Workable, Ashby, SmartRecruiters, BambooHR, and Recruitee are covered; Workday /
              Teamtailor / LinkedIn / Indeed stay Assist-only.
            </p>
          </div>
          <button type="button" className="btn-secondary text-xs" disabled={hostsLoading} onClick={() => void loadHosts()}>
            {hostsLoading ? 'Loading…' : 'Reload hosts'}
          </button>
        </div>

        {hostsError ? <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">{hostsError}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <ChipStat label="Ranked" value={hostStats.total} />
          <ChipStat label="Covered" value={hostStats.covered} tone="ok" />
          <ChipStat label="Assist only" value={hostStats.assist} tone="info" />
          <ChipStat label="Candidates" value={hostStats.candidates} tone="warn" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(
            [
              ['all', 'All'],
              ['adapter_candidate', 'Next adapter'],
              ['assist_only', 'Assist only'],
              ['covered', 'Covered'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setHostFilter(id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                hostFilter === id ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted hover:border-brand/40',
              )}
            >
              {label}
            </button>
          ))}
          <input
            type="search"
            value={hostQuery}
            onChange={(e) => setHostQuery(e.target.value)}
            placeholder="Filter host…"
            className="min-w-[10rem] flex-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs outline-none focus:border-brand"
          />
        </div>

        {hostsLoading && !hosts ? (
          <p className="mt-4 text-sm text-muted">Loading host ranks…</p>
        ) : filteredHosts.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Host</th>
                  <th className="px-3 py-2">Count</th>
                  <th className="px-3 py-2">Triage</th>
                </tr>
              </thead>
              <tbody>
                {filteredHosts.map((row, index) => {
                  const suggestion = resolveSuggestion(row);
                  return (
                    <tr key={row.host} className="border-t border-border">
                      <td className="px-3 py-2 tabular-nums text-muted">{index + 1}</td>
                      <td className="px-3 py-2 font-medium text-foreground">{row.host}</td>
                      <td className="px-3 py-2 tabular-nums text-muted">{row.count}</td>
                      <td className="px-3 py-2">
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', SUGGESTION_CLASS[suggestion])}>
                          {SUGGESTION_LABEL[suggestion]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            {hosts?.length ? 'No hosts match this filter.' : 'No external job URLs in the window.'}
          </p>
        )}
      </DashPanel>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-muted">{hint}</p> : null}
    </div>
  );
}

function ChipStat({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'info' | 'warn' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs',
        tone === 'ok' && 'border-emerald-500/30 bg-emerald-500/5',
        tone === 'info' && 'border-sky-500/30 bg-sky-500/5',
        tone === 'warn' && 'border-amber-500/30 bg-amber-500/5',
      )}
    >
      <span className="text-muted">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </span>
  );
}

function MiniTable({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { key: string; value: number }[];
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      {rows.length ? (
        <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
          {rows.slice(0, 16).map((r) => (
            <li key={r.key} className="flex justify-between gap-2 text-xs">
              <span className="min-w-0 truncate text-foreground" title={r.key}>
                {r.key}
              </span>
              <span className="tabular-nums text-muted">{r.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted">{empty}</p>
      )}
    </div>
  );
}
