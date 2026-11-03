'use client';

import { Activity, AlertTriangle, Gauge, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';

import { DashKpi, DashPanel } from '@/components/dashboard/dashboard-ui';
import { ApiError } from '@/lib/api';
import { fetchApiKeyUsage, type ApiKeyUsage } from '@/lib/dashboard-api';

const WINDOWS = [1, 7, 30, 90] as const;

export function DashboardApiKeyUsage({ keyId, onClose }: { keyId: string; onClose: () => void }) {
  const [days, setDays] = useState<number>(7);
  const [usage, setUsage] = useState<ApiKeyUsage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    fetchApiKeyUsage(keyId, days)
      .then((data) => {
        if (active) setUsage(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : 'Unable to load usage');
      });
    return () => {
      active = false;
    };
  }, [keyId, days]);

  const peak = Math.max(1, ...(usage?.daily.map((d) => d.requests) ?? [1]));

  return (
    <DashPanel
      title={usage ? `Usage · ${usage.key.name}` : 'Usage'}
      action={
        <div className="flex items-center gap-2">
          {WINDOWS.map((window) => (
            <button
              key={window}
              type="button"
              onClick={() => setDays(window)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                days === window ? 'border-brand bg-brand text-white dark:text-[#071f14]' : 'border-border text-muted'
              }`}
            >
              {window}d
            </button>
          ))}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !usage ? (
        <p className="text-sm text-muted">Loading usage…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DashKpi
              label="Requests"
              value={usage.totals.requests.toLocaleString()}
              hint={`Last ${usage.days} day(s)${usage.truncated ? ' · sampled' : ''}`}
              icon={Activity}
            />
            <DashKpi
              label="Errors"
              value={usage.totals.errors.toLocaleString()}
              hint="Responses with status 400 or higher"
              icon={AlertTriangle}
            />
            <DashKpi
              label="Rate limited"
              value={usage.totals.rateLimited.toLocaleString()}
              hint={`Limit ${usage.key.rateLimitPerMin}/min on ${usage.key.plan}`}
              icon={Gauge}
            />
            <DashKpi
              label="Avg latency"
              value={`${usage.totals.avgLatencyMs} ms`}
              hint="Server-side handling time"
              icon={Timer}
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Daily requests</p>
            <div className="mt-3 flex h-32 items-end gap-1">
              {usage.daily.map((day) => (
                <div
                  key={day.date}
                  className="group relative flex-1 rounded-t bg-brand/70"
                  style={{ height: `${Math.max(2, (day.requests / peak) * 100)}%` }}
                  title={`${day.date}: ${day.requests} requests, ${day.errors} errors`}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-muted">
              <span>{usage.daily[0]?.date}</span>
              <span>{usage.daily[usage.daily.length - 1]?.date}</span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Top endpoints</p>
              {usage.topEndpoints.length === 0 ? (
                <p className="mt-2 text-sm text-muted">No calls in this window.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {usage.topEndpoints.map((row) => (
                    <li key={row.endpoint} className="flex justify-between gap-3">
                      <span className="truncate font-mono text-xs">{row.endpoint}</span>
                      <span className="tabular-nums text-muted">{row.requests}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recent calls</p>
              {usage.recent.length === 0 ? (
                <p className="mt-2 text-sm text-muted">No calls yet.</p>
              ) : (
                <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-xs">
                  {usage.recent.map((row, index) => (
                    <li key={`${row.createdAt}-${index}`} className="flex justify-between gap-3">
                      <span className="truncate font-mono">
                        {row.method} {row.path}
                      </span>
                      <span className={row.statusCode >= 400 ? 'text-red-600' : 'text-muted'}>
                        {row.statusCode} · {row.latencyMs}ms ·{' '}
                        {new Date(row.createdAt).toLocaleTimeString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </DashPanel>
  );
}
