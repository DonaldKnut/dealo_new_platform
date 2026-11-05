'use client';

import { SUBSCRIBABLE_WEBHOOK_EVENTS } from '@dealo/shared';
import { Copy, KeyRound, Plus, Webhook } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { DashPanel } from '@/components/dashboard/dashboard-ui';
import { FormField } from '@/components/forms/form-field';
import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  createWebhook,
  deleteWebhook,
  fetchWebhookDeliveries,
  fetchWebhooks,
  redeliverWebhook,
  rotateWebhookSecret,
  testWebhook,
  updateWebhook,
  type WebhookDeliveryRow,
  type WebhookEndpointRow,
} from '@/lib/dashboard-api';

const VERIFY_SNIPPET = `// Node.js: verify X-Dealo-Signature
const [t, v1] = header.split(',').map((p) => p.split('=')[1]);
const expected = crypto.createHmac('sha256', secret).update(\`\${t}.\${rawBody}\`).digest('hex');
const valid = crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected))
  && Math.abs(Date.now() / 1000 - Number(t)) < 300;`;

export function DashboardWebhooksPanel({ canCreateGlobal = false }: { canCreateGlobal?: boolean }) {
  const toast = useToast();
  const [rows, setRows] = useState<WebhookEndpointRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([...SUBSCRIBABLE_WEBHOOK_EVENTS]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryRow[]>([]);

  const fail = useCallback(
    (title: string, error: unknown) => toast.error(title, error instanceof ApiError ? error.message : undefined),
    [toast],
  );

  const load = useCallback(async () => {
    try {
      setRows(await fetchWebhooks());
    } catch (error) {
      fail('Unable to load webhooks', error);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadDeliveries = async (id: string) => {
    try {
      setDeliveries(await fetchWebhookDeliveries(id));
    } catch (error) {
      fail('Unable to load deliveries', error);
    }
  };

  const onCreate = async () => {
    if (!url.trim() || events.length === 0) {
      toast.error('A URL and at least one event are required');
      return false;
    }
    setSaving(true);
    try {
      const created = await createWebhook({ url: url.trim(), events, isGlobal });
      setSecret(created.secret);
      setUrl('');
      await load();
      toast.success('Webhook added — copy the signing secret now');
      return true;
    } catch (error) {
      fail('Could not add webhook', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const onTest = async (id: string) => {
    try {
      const result = await testWebhook(id);
      if (result.status === 'SUCCEEDED') {
        toast.success(`Ping delivered (HTTP ${result.responseCode})`);
      } else {
        toast.error('Ping failed', result.error ?? undefined);
      }
      if (openId === id) await loadDeliveries(id);
      await load();
    } catch (error) {
      fail('Test failed', error);
    }
  };

  const onRotate = async (id: string) => {
    try {
      setSecret((await rotateWebhookSecret(id)).secret);
      toast.success('Secret rotated — update your receiver');
    } catch (error) {
      fail('Rotate failed', error);
    }
  };

  const onToggle = async (row: WebhookEndpointRow) => {
    try {
      await updateWebhook(row.id, { isActive: !row.isActive });
      await load();
    } catch (error) {
      fail('Update failed', error);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteWebhook(id);
      if (openId === id) setOpenId(null);
      await load();
      toast.success('Webhook deleted');
    } catch (error) {
      fail('Delete failed', error);
    }
  };

  const onRedeliver = async (deliveryId: string) => {
    try {
      const result = await redeliverWebhook(deliveryId);
      toast[result.status === 'SUCCEEDED' ? 'success' : 'error'](`Redelivery ${result.status.toLowerCase()}`);
      if (openId) await loadDeliveries(openId);
    } catch (error) {
      fail('Redelivery failed', error);
    }
  };

  return (
    <DashPanel
      title="Webhooks"
      action={
        <button
          type="button"
          className="btn-primary px-3 py-2 text-xs"
          onClick={() => {
            setUrl('');
            setAddOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Add endpoint
        </button>
      }
    >
      <p className="text-sm text-muted">
        Dealo POSTs signed JSON to your URL when hiring requests are created or change status. Failed
        deliveries retry with backoff for about an hour.
      </p>

      <FormModal
        open={Boolean(secret)}
        onClose={() => setSecret(null)}
        icon={KeyRound}
        title="Signing secret"
        description="Shown only once. Use it to check the signature header on each delivery."
        size="sm"
        footer={
          <button type="button" className="btn-primary" onClick={() => setSecret(null)}>
            I saved it
          </button>
        }
      >
        <div className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <code className="block break-all rounded-xl border border-border bg-surface px-3 py-2.5 text-xs text-foreground">{secret}</code>
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={async () => {
              if (secret) await navigator.clipboard.writeText(secret);
              toast.success('Copied');
            }}
          >
            <Copy className="h-4 w-4" /> Copy secret
          </button>
        </div>
      </FormModal>

      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        icon={Webhook}
        title="Add a webhook endpoint"
        description="Dealo sends a signed POST to this link for each event you pick."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={async () => {
                const ok = await onCreate();
                if (ok) setAddOpen(false);
              }}
            >
              {saving ? 'Adding…' : 'Add endpoint'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <FormField label="Your link (https)">
            <input className="input-field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/dealo/webhooks" />
          </FormField>
          <FormField label="Events">
            <div className="flex flex-wrap gap-2">
              {SUBSCRIBABLE_WEBHOOK_EVENTS.map((event) => (
                <button
                  key={event}
                  type="button"
                  onClick={() => setEvents((current) => (current.includes(event) ? current.filter((e) => e !== event) : [...current, event]))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    events.includes(event) ? 'border-brand bg-brand text-white dark:text-[#071f14]' : 'border-border text-muted hover:border-brand/40'
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
          </FormField>
          {canCreateGlobal ? (
            <label className="flex items-start gap-3 rounded-2xl border border-border p-3 text-sm">
              <input type="checkbox" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} className="mt-1 accent-[var(--brand)]" />
              <span>
                <span className="font-semibold text-foreground">Global</span>
                <span className="block text-xs text-muted">Receive events for every hiring request on the platform (admins only).</span>
              </span>
            </label>
          ) : null}
        </div>
      </FormModal>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">No webhook endpoints yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-xs text-foreground">{row.url}</p>
                    <p className="text-xs text-muted">
                      {row.events.join(', ')}
                      {row.isGlobal ? ' · global' : ''} · {row.isActive ? 'active' : 'disabled'}
                      {row.failureCount ? ` · ${row.failureCount} failed` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs font-semibold">
                    <button type="button" className="text-brand underline" onClick={() => onTest(row.id)}>
                      Send test
                    </button>
                    <button
                      type="button"
                      className="text-brand underline"
                      onClick={async () => {
                        const next = openId === row.id ? null : row.id;
                        setOpenId(next);
                        if (next) await loadDeliveries(next);
                      }}
                    >
                      {openId === row.id ? 'Hide log' : 'Deliveries'}
                    </button>
                    <button type="button" className="text-brand underline" onClick={() => onRotate(row.id)}>
                      Rotate secret
                    </button>
                    <button type="button" className="text-brand underline" onClick={() => onToggle(row)}>
                      {row.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button type="button" className="text-red-600 underline" onClick={() => onDelete(row.id)}>
                      Delete
                    </button>
                  </div>
                </div>
                {openId === row.id ? (
                  <ul className="mt-3 space-y-1 rounded-xl border border-border bg-surface p-3 text-xs">
                    {deliveries.length === 0 ? (
                      <li className="text-muted">No deliveries yet.</li>
                    ) : (
                      deliveries.map((delivery) => (
                        <li key={delivery.id} className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono">
                            {delivery.event} · {new Date(delivery.createdAt).toLocaleString()}
                          </span>
                          <span
                            className={
                              delivery.status === 'SUCCEEDED'
                                ? 'text-brand'
                                : delivery.status === 'FAILED'
                                  ? 'text-red-600'
                                  : 'text-amber-600'
                            }
                          >
                            {delivery.status} · {delivery.responseCode ?? '—'} · {delivery.attempts} attempt(s)
                            {delivery.error ? ` · ${delivery.error}` : ''}
                          </span>
                          {delivery.status !== 'SUCCEEDED' ? (
                            <button
                              type="button"
                              className="font-semibold text-brand underline"
                              onClick={() => onRedeliver(delivery.id)}
                            >
                              Redeliver
                            </button>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">Verifying signatures</summary>
        <pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-surface p-3 text-xs text-foreground">
          {VERIFY_SNIPPET}
        </pre>
      </details>
    </DashPanel>
  );
}
