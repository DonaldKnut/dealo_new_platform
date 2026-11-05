'use client';

import { ATS_WEBHOOK_EVENTS } from '@dealo/shared';
import { Copy, KeyRound, Plus, Send, Trash2, Webhook } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { FormField } from '@/components/forms/form-field';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { atsApi, type WorkspaceApiKey, type WorkspaceWebhook } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '');

const EVENT_LABEL: Record<string, string> = {
  'application.created': 'Someone applies',
  'application.stage_changed': 'Someone moves step',
  'offer.accepted': 'An offer is accepted',
};

function Secret({ label, value, onDone }: { label: string; value: string; onDone: () => void }) {
  const toast = useToast();
  return (
    <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
      <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">{label} Copy it now. It will not be shown again.</p>
      <code className="block break-all rounded-lg bg-surface px-2 py-1.5 text-xs text-foreground">{value}</code>
      <div className="flex gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
          onClick={async () => {
            await navigator.clipboard.writeText(value).catch(() => undefined);
            toast.success('Copied');
          }}
        >
          <Copy className="h-3.5 w-3.5" /> Copy
        </button>
        <button type="button" className="text-xs font-semibold text-muted" onClick={onDone}>
          I saved it
        </button>
      </div>
    </div>
  );
}

export function AtsIntegrationsPanel({ orgId }: { orgId: string }) {
  const toast = useToast();
  const [keys, setKeys] = useState<WorkspaceApiKey[] | null>(null);
  const [hooks, setHooks] = useState<WorkspaceWebhook[]>([]);
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([...ATS_WEBHOOK_EVENTS]);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await atsApi.integrations(orgId);
      setKeys(data.keys);
      setHooks(data.webhooks);
    } catch {
      setKeys([]);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async <T,>(label: string, action: () => Promise<T>) => {
    try {
      const result = await action();
      if (label) toast.success(label);
      await load();
      return result;
    } catch (err) {
      toast.error('That did not work', err instanceof ApiError ? err.message : '');
      return null;
    }
  };

  const activeKeys = (keys ?? []).filter((k) => k.isActive);

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <KeyRound className="h-4 w-4 text-brand" /> API keys
        </h3>
        <p className="text-xs leading-relaxed text-muted">
          Let your own tools read jobs and applicants, add people, and move them between steps. Keys only see this workspace.{' '}
          <a href={`${API_ORIGIN}/api/docs#/ats-api`} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand">
            See the API
          </a>
          .
        </p>
        {newKey ? <Secret label="Your new key." value={newKey} onDone={() => setNewKey(null)} /> : null}
        <ul className="space-y-2">
          {activeKeys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{k.name}</span>
              <code className="text-xs text-muted">{k.keyPrefix}…</code>
              <span className="text-[11px] text-muted">{k.lastUsedAt ? `used ${new Date(k.lastUsedAt).toLocaleDateString()}` : 'never used'}</span>
              <button
                type="button"
                aria-label={`Revoke ${k.name}`}
                onClick={() => window.confirm(`Revoke “${k.name}”? Anything using it will stop working.`) && void run('Key revoked', () => atsApi.revokeKey(orgId, k.id))}
                className="p-1 text-muted hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="flex flex-col gap-2 min-[400px]:flex-row"
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await run('Key created', () => atsApi.createKey(orgId, keyName.trim()));
            if (result) {
              setNewKey(result.apiKey);
              setKeyName('');
            }
          }}
        >
          <input className="input-field" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Key name, e.g. HR system" maxLength={80} />
          <button type="submit" className="btn-secondary shrink-0 text-sm" disabled={keyName.trim().length < 2 || activeKeys.length >= 3}>
            <Plus className="h-4 w-4" /> Create key
          </button>
        </form>
      </section>

      <section className="space-y-3 border-t border-border pt-5">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Webhook className="h-4 w-4 text-brand" /> Webhooks
        </h3>
        <p className="text-xs leading-relaxed text-muted">We send a signed message to your link the moment something happens, so payroll or chat tools can react.</p>
        {newSecret ? <Secret label="Signing secret for your webhook." value={newSecret} onDone={() => setNewSecret(null)} /> : null}
        <ul className="space-y-2">
          {hooks.map((h) => (
            <li key={h.id} className="rounded-xl border border-border px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{h.url}</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
                  onClick={async () => {
                    const result = await run('', () => atsApi.testWebhook(orgId, h.id));
                    if (!result) return;
                    if (result.status === 'SUCCEEDED') toast.success('Test delivered', `Your link answered ${result.responseCode ?? ''}`.trim());
                    else toast.error('Test failed', result.error ?? `Status ${result.responseCode ?? '—'}`);
                  }}
                >
                  <Send className="h-3.5 w-3.5" /> Test
                </button>
                <button
                  type="button"
                  aria-label="Delete webhook"
                  onClick={() => window.confirm('Delete this webhook?') && void run('Webhook deleted', () => atsApi.removeWebhook(orgId, h.id))}
                  className="p-1 text-muted hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted">{h.events.map((e) => EVENT_LABEL[e] ?? e).join(' · ')}</p>
            </li>
          ))}
        </ul>
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await run('Webhook added', () => atsApi.createWebhook(orgId, { url: url.trim(), events }));
            if (result) {
              setNewSecret(result.secret);
              setUrl('');
            }
          }}
        >
          <FormField label="Your link (https)">
            <input className="input-field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hr.example.com/dealo-webhook" />
          </FormField>
          <div className="flex flex-wrap gap-1.5">
            {ATS_WEBHOOK_EVENTS.map((ev) => {
              const on = events.includes(ev);
              return (
                <button
                  key={ev}
                  type="button"
                  onClick={() => setEvents((list) => (on ? list.filter((x) => x !== ev) : [...list, ev]))}
                  className={cn('rounded-full border px-2.5 py-1 text-xs', on ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted')}
                >
                  {EVENT_LABEL[ev]}
                </button>
              );
            })}
          </div>
          <button type="submit" className="btn-secondary w-full text-sm" disabled={!url.trim() || !events.length}>
            <Plus className="h-4 w-4" /> Add webhook
          </button>
        </form>
      </section>
    </div>
  );
}
