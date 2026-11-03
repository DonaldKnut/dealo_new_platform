'use client';

import { SANDBOX_KEY_POLICY } from '@dealo/shared';
import { ExternalLink } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { DashboardApiBillingPanel } from '@/components/dashboard/dashboard-api-billing-panel';
import { DashHero, DashPanel } from '@/components/dashboard/dashboard-ui';
import { DashboardWebhooksPanel } from '@/components/dashboard/dashboard-webhooks-panel';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  createSandboxApiKey,
  fetchAuthMe,
  fetchMyApiKeys,
  revokeMyApiKey,
  type ApiKeyRow,
  type CreatedApiKey,
} from '@/lib/dashboard-api';

function apiOrigin() {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
  return base.replace(/\/api\/v1\/?$/, '');
}

export function DashboardDeveloperPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<CreatedApiKey | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const origin = apiOrigin();

  useEffect(() => {
    fetchAuthMe()
      .then((me) => setIsAdmin(me.roles.some((role) => role === 'SUPER_ADMIN' || role === 'ADMIN')))
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    try {
      setRows(await fetchMyApiKeys());
    } catch (error) {
      toast.error('Unable to load your keys', error instanceof ApiError ? error.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeSandbox = rows.filter((row) => row.isActive && row.plan === 'SANDBOX').length;
  const atLimit = activeSandbox >= SANDBOX_KEY_POLICY.maxActiveKeys;

  const onCreate = async () => {
    if (name.trim().length < 2) {
      toast.error('Give your key a name (at least 2 characters)');
      return;
    }
    setCreating(true);
    try {
      setRevealed(await createSandboxApiKey(name.trim()));
      setName('');
      await load();
      toast.success('Sandbox key created — copy it now');
    } catch (error) {
      toast.error('Could not create key', error instanceof ApiError ? error.message : undefined);
    } finally {
      setCreating(false);
    }
  };

  const onRevoke = async (id: string) => {
    try {
      await revokeMyApiKey(id);
      await load();
      toast.success('Key revoked');
    } catch (error) {
      toast.error('Revoke failed', error instanceof ApiError ? error.message : undefined);
    }
  };

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Developers"
        title="Dealo API sandbox"
        subtitle="Create a test key to integrate Dealo hiring intake into your own tools. Sandbox requests are flagged as test data and never email anyone."
        actions={
          <a href={`${origin}/api/docs`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            API docs
            <ExternalLink className="h-4 w-4" />
          </a>
        }
      />

      {revealed ? (
        <DashPanel className="border-brand/40 bg-brand-soft/30">
          <h2 className="font-display text-lg text-foreground">Copy this key now</h2>
          <p className="mt-1 text-sm text-muted">It is shown only once. Store it in your secrets manager.</p>
          <code className="mt-3 block break-all rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground">
            {revealed.apiKey}
          </code>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(revealed.apiKey);
                toast.success('Copied to clipboard');
              }}
            >
              Copy
            </button>
            <button type="button" className="btn-secondary" onClick={() => setRevealed(null)}>
              Dismiss
            </button>
          </div>
        </DashPanel>
      ) : null}

      <DashPanel title="Create a sandbox key">
        <p className="text-sm text-muted">
          Sandbox keys use the <code>dk_test_</code> prefix, allow {SANDBOX_KEY_POLICY.rateLimitPerMin} requests per
          minute, and include: {SANDBOX_KEY_POLICY.scopes.join(', ')}. You can hold up to{' '}
          {SANDBOX_KEY_POLICY.maxActiveKeys} active sandbox keys. Contact Dealo for live (production) access.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm sm:max-w-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My ATS integration"
            disabled={atLimit}
          />
          <button type="button" className="btn-primary" disabled={creating || atLimit} onClick={onCreate}>
            {creating ? 'Creating…' : atLimit ? 'Key limit reached' : 'Get sandbox key'}
          </button>
        </div>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface p-4 text-xs text-foreground">
          {`curl -s ${origin}/api/v1/hire-inquiries \\
  -H "Authorization: Bearer dk_test_YOUR_KEY"`}
        </pre>
      </DashPanel>

      <DashPanel title="Your keys">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">No keys yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{row.name}</p>
                  <p className="font-mono text-xs text-muted">
                    {row.keyPrefix}… · {row.environment} / {row.plan} ·{' '}
                    {row.lastUsedAt ? `last used ${new Date(row.lastUsedAt).toLocaleString()}` : 'never used'}
                  </p>
                </div>
                {row.isActive ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600 underline"
                    onClick={() => onRevoke(row.id)}
                  >
                    Revoke
                  </button>
                ) : (
                  <span className="text-xs text-muted">Revoked</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </DashPanel>

      <DashboardApiBillingPanel
        onKeyCreated={(key) => {
          setRevealed(key);
          void load();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <DashboardWebhooksPanel canCreateGlobal={isAdmin} />
    </div>
  );
}
