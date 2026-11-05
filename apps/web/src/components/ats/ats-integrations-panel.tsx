'use client';

import { ATS_WEBHOOK_EVENTS } from '@dealo/shared';
import { Check, Copy, KeyRound, Plus, Send, Trash2, Webhook } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { FormField } from '@/components/forms/form-field';
import { FormModal } from '@/components/ui/form-modal';
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

function Secret({ label, value }: { label: string; value: string }) {
  const toast = useToast();
  return (
    <div className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{label} Copy it now. It will not be shown again.</p>
      <code className="block break-all rounded-xl bg-surface px-3 py-2.5 text-xs text-foreground">{value}</code>
      <button
        type="button"
        className="btn-secondary w-full text-sm"
        onClick={async () => {
          await navigator.clipboard.writeText(value).catch(() => undefined);
          toast.success('Copied');
        }}
      >
        <Copy className="h-4 w-4" /> Copy
      </button>
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
  const [modal, setModal] = useState<'key' | 'hook' | null>(null);

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
        <button
          type="button"
          className="btn-secondary w-full text-sm"
          disabled={activeKeys.length >= 3}
          onClick={() => {
            setNewKey(null);
            setKeyName('');
            setModal('key');
          }}
        >
          <Plus className="h-4 w-4" /> {activeKeys.length >= 3 ? '3 keys is the limit' : 'Create key'}
        </button>
      </section>

      <section className="space-y-3 border-t border-border pt-5">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Webhook className="h-4 w-4 text-brand" /> Webhooks
        </h3>
        <p className="text-xs leading-relaxed text-muted">We send a signed message to your link the moment something happens, so payroll or chat tools can react.</p>
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
        <button
          type="button"
          className="btn-secondary w-full text-sm"
          onClick={() => {
            setNewSecret(null);
            setUrl('');
            setEvents([...ATS_WEBHOOK_EVENTS]);
            setModal('hook');
          }}
        >
          <Plus className="h-4 w-4" /> Add webhook
        </button>
      </section>

      <FormModal
        open={modal === 'key'}
        onClose={() => setModal(null)}
        icon={KeyRound}
        title={newKey ? 'Key created' : 'Create an API key'}
        description={newKey ? undefined : 'Gives your tools access to this workspace only: read jobs and applicants, add people, move steps.'}
        size="sm"
        footer={
          newKey ? (
            <button type="button" className="btn-primary" onClick={() => setModal(null)}>
              I saved it
            </button>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="submit" form="ats-key-form" className="btn-primary" disabled={keyName.trim().length < 2}>
                <KeyRound className="h-4 w-4" /> Create key
              </button>
            </>
          )
        }
      >
        {newKey ? (
          <Secret label="Your new key." value={newKey} />
        ) : (
          <form
            id="ats-key-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await run('Key created', () => atsApi.createKey(orgId, keyName.trim()));
              if (result) setNewKey(result.apiKey);
            }}
          >
            <FormField label="Name" hint="So you remember what uses it, e.g. “HR system” or “Payroll”.">
              <input className="input-field" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="HR system" maxLength={80} />
            </FormField>
          </form>
        )}
      </FormModal>

      <FormModal
        open={modal === 'hook'}
        onClose={() => setModal(null)}
        icon={Webhook}
        title={newSecret ? 'Webhook added' : 'Add a webhook'}
        description={newSecret ? undefined : 'We POST a signed JSON message to your link when something happens.'}
        size="md"
        footer={
          newSecret ? (
            <button type="button" className="btn-primary" onClick={() => setModal(null)}>
              I saved it
            </button>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="submit" form="ats-hook-form" className="btn-primary" disabled={!url.trim() || !events.length}>
                <Webhook className="h-4 w-4" /> Add webhook
              </button>
            </>
          )
        }
      >
        {newSecret ? (
          <Secret label="Signing secret for your webhook." value={newSecret} />
        ) : (
          <form
            id="ats-hook-form"
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await run('Webhook added', () => atsApi.createWebhook(orgId, { url: url.trim(), events }));
              if (result) setNewSecret(result.secret);
            }}
          >
            <FormField label="Your link (https)">
              <input className="input-field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hr.example.com/dealo-webhook" />
            </FormField>
            <FormField label="Tell me when">
              <div className="grid gap-2">
                {ATS_WEBHOOK_EVENTS.map((ev) => {
                  const on = events.includes(ev);
                  return (
                    <button
                      key={ev}
                      type="button"
                      onClick={() => setEvents((list) => (on ? list.filter((x) => x !== ev) : [...list, ev]))}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition',
                        on ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted hover:border-brand/40',
                      )}
                    >
                      <span>
                        <span className="block font-semibold">{EVENT_LABEL[ev]}</span>
                        <code className="text-[10px] opacity-70">{ev}</code>
                      </span>
                      <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded-md border', on ? 'border-brand bg-brand text-white dark:text-[#071f14]' : 'border-border')}>
                        {on ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </FormField>
          </form>
        )}
      </FormModal>
    </div>
  );
}
