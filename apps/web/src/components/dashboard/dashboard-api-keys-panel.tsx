'use client';

import { ApiScope } from '@dealo/shared';
import { useEffect, useState } from 'react';

import { DashboardApiKeyUsage } from '@/components/dashboard/dashboard-api-key-usage';
import { DashboardApiPlansAdmin } from '@/components/dashboard/dashboard-api-plans-admin';
import { DashboardOAuthClients } from '@/components/dashboard/dashboard-oauth-clients';
import { DashHero, DashPanel } from '@/components/dashboard/dashboard-ui';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  createApiKey,
  fetchApiKeys,
  revokeApiKey,
  updateApiKey,
  type ApiKeyRow,
  type CreatedApiKey,
} from '@/lib/dashboard-api';

const ALL_SCOPES = Object.values(ApiScope);

export function DashboardApiKeysPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<'TEST' | 'LIVE'>('TEST');
  const [plan, setPlan] = useState<'SANDBOX' | 'PARTNER' | 'ENTERPRISE'>('SANDBOX');
  const [scopes, setScopes] = useState<string[]>([
    ApiScope.HIRE_INQUIRIES_READ,
    ApiScope.HIRE_INQUIRIES_WRITE,
  ]);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<CreatedApiKey | null>(null);
  const [usageKeyId, setUsageKeyId] = useState<string | null>(null);
  const [oauthKey, setOauthKey] = useState<ApiKeyRow | null>(null);

  const load = async () => {
    const data = await fetchApiKeys();
    setRows(data);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await load();
      } catch (error) {
        toast.error(
          'Unable to load API keys',
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

  const toggleScope = (scope: string) => {
    setScopes((current) =>
      current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope],
    );
  };

  const onCreate = async () => {
    if (!name.trim() || scopes.length === 0) {
      toast.error('Name and at least one scope are required');
      return;
    }
    setCreating(true);
    try {
      const created = await createApiKey({
        name: name.trim(),
        environment,
        plan,
        scopes,
        rateLimitPerMin: 60,
      });
      setRevealed(created);
      setName('');
      await load();
      toast.success('API key created — copy it now');
    } catch (error) {
      toast.error('Create failed', error instanceof ApiError ? error.message : undefined);
    } finally {
      setCreating(false);
    }
  };

  const onToggleActive = async (row: ApiKeyRow) => {
    try {
      await updateApiKey(row.id, { isActive: !row.isActive });
      await load();
      toast.success(row.isActive ? 'Key deactivated' : 'Key activated');
    } catch (error) {
      toast.error('Update failed', error instanceof ApiError ? error.message : undefined);
    }
  };

  const onRevoke = async (id: string) => {
    try {
      await revokeApiKey(id);
      await load();
      toast.success('API key revoked');
    } catch (error) {
      toast.error('Revoke failed', error instanceof ApiError ? error.message : undefined);
    }
  };

  return (
    <div className="space-y-6">
      <DashHero
        eyebrow="Admin"
        title="API keys"
        subtitle="Issue partner keys for commercial API access. Plaintext secrets are shown once at creation."
      />

      {revealed ? (
        <DashPanel className="border-brand/40 bg-brand-soft/30">
          <h2 className="font-display text-lg text-foreground">Copy this key now</h2>
          <p className="mt-1 text-sm text-muted">
            {revealed.name} · {revealed.environment} · shown only once
          </p>
          <code className="mt-3 block break-all rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground">
            {revealed.apiKey}
          </code>
          <button
            type="button"
            className="btn-secondary mt-3"
            onClick={async () => {
              await navigator.clipboard.writeText(revealed.apiKey);
              toast.success('Copied to clipboard');
            }}
          >
            Copy
          </button>
          <button type="button" className="btn-secondary mt-3 ml-2" onClick={() => setRevealed(null)}>
            Dismiss
          </button>
        </DashPanel>
      ) : null}

      <DashPanel>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-display text-xl">Create key</h2>
          <InfoTooltip
            label="API keys"
            content="Partners send Authorization: Bearer dk_test_… or dk_live_…. Scopes limit what each key can call."
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="text-muted">Name</span>
            <input
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme ATS integration"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted">Environment</span>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as 'TEST' | 'LIVE')}
            >
              <option value="TEST">TEST (dk_test_)</option>
              <option value="LIVE">LIVE (dk_live_)</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted">Plan</span>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
              value={plan}
              onChange={(e) => setPlan(e.target.value as typeof plan)}
            >
              <option value="SANDBOX">Sandbox</option>
              <option value="PARTNER">Partner</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </label>
        </div>
        <div className="mt-4">
          <p className="text-sm text-muted">Scopes</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALL_SCOPES.map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => toggleScope(scope)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  scopes.includes(scope)
                    ? 'border-brand bg-brand text-white dark:text-[#071f14]'
                    : 'border-border text-muted'
                }`}
              >
                {scope}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="btn-primary mt-4" disabled={creating} onClick={onCreate}>
          {creating ? 'Creating…' : 'Create API key'}
        </button>
      </DashPanel>

      <DashPanel>
        <h2 className="mb-4 font-display text-xl">Issued keys</h2>
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">No API keys yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Prefix</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Scopes</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">24h calls</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted">{row.keyPrefix}…</td>
                    <td className="px-3 py-2 text-muted">
                      {row.environment} / {row.plan}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">{row.scopes.join(', ')}</td>
                    <td className="px-3 py-2">{row.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="px-3 py-2 tabular-nums text-muted">
                      {(row.requests24h ?? 0).toLocaleString()}
                      <span className="block text-[11px]">limit {row.rateLimitPerMin}/min</span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="mr-3 text-xs font-semibold text-brand underline"
                        onClick={() => setUsageKeyId(row.id)}
                      >
                        Usage
                      </button>
                      <button
                        type="button"
                        className="mr-3 text-xs font-semibold text-brand underline"
                        onClick={() => setOauthKey(row)}
                      >
                        OAuth
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-brand underline"
                        onClick={() => onToggleActive(row)}
                      >
                        {row.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="ml-3 text-xs font-semibold text-red-600 underline"
                        onClick={() => onRevoke(row.id)}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashPanel>

      {usageKeyId ? (
        <DashboardApiKeyUsage keyId={usageKeyId} onClose={() => setUsageKeyId(null)} />
      ) : null}

      <DashboardApiPlansAdmin />

      {oauthKey ? (
        <DashboardOAuthClients
          apiKeyId={oauthKey.id}
          keyName={oauthKey.name}
          onClose={() => setOauthKey(null)}
        />
      ) : null}
    </div>
  );
}
