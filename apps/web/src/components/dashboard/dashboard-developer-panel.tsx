'use client';

import { SANDBOX_KEY_POLICY } from '@dealo/shared';
import { Copy, ExternalLink, KeyRound, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { DashboardApiBillingPanel } from '@/components/dashboard/dashboard-api-billing-panel';
import { DashHero, DashPanel } from '@/components/dashboard/dashboard-ui';
import { DashboardWebhooksPanel } from '@/components/dashboard/dashboard-webhooks-panel';
import { FormField } from '@/components/forms/form-field';
import { FormModal } from '@/components/ui/form-modal';
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
  const [keyOpen, setKeyOpen] = useState(false);
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

      <FormModal
        open={keyOpen}
        onClose={() => {
          setKeyOpen(false);
          setRevealed(null);
        }}
        icon={KeyRound}
        title={revealed ? 'Copy this key now' : 'Get a sandbox key'}
        description={revealed ? 'It is shown only once. Store it in your secrets manager.' : `Test keys start with dk_test_ and allow ${SANDBOX_KEY_POLICY.rateLimitPerMin} requests a minute.`}
        size="sm"
        footer={
          revealed ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setKeyOpen(false);
                setRevealed(null);
              }}
            >
              I saved it
            </button>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={() => setKeyOpen(false)}>
                Cancel
              </button>
              <button type="submit" form="sandbox-key-form" className="btn-primary" disabled={creating}>
                {creating ? 'Creating…' : 'Create key'}
              </button>
            </>
          )
        }
      >
        {revealed ? (
          <div className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
            <code className="block break-all rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground">{revealed.apiKey}</code>
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={async () => {
                await navigator.clipboard.writeText(revealed.apiKey);
                toast.success('Copied to clipboard');
              }}
            >
              <Copy className="h-4 w-4" /> Copy key
            </button>
          </div>
        ) : (
          <form
            id="sandbox-key-form"
            onSubmit={(e) => {
              e.preventDefault();
              void onCreate();
            }}
          >
            <FormField label="Name" hint="So you remember what uses it.">
              <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="My ATS integration" />
            </FormField>
          </form>
        )}
      </FormModal>

      <DashPanel
        title="Sandbox keys"
        action={
          <button
            type="button"
            className="btn-primary px-3 py-2 text-xs"
            disabled={atLimit}
            onClick={() => {
              setRevealed(null);
              setKeyOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> {atLimit ? 'Limit reached' : 'Get a key'}
          </button>
        }
      >
        <p className="text-sm text-muted">
          Sandbox keys use the <code>dk_test_</code> prefix, allow {SANDBOX_KEY_POLICY.rateLimitPerMin} requests per
          minute, and include: {SANDBOX_KEY_POLICY.scopes.join(', ')}. You can hold up to{' '}
          {SANDBOX_KEY_POLICY.maxActiveKeys} active sandbox keys. Contact Dealo for live (production) access.
        </p>
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
