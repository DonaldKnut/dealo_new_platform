'use client';

import { SUBSCRIBABLE_WEBHOOK_EVENTS } from '@dealo/shared';
import { useCallback, useEffect, useState } from 'react';

import { DashPanel } from '@/components/dashboard/dashboard-ui';
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
      return;
    }
    setSaving(true);
    try {
      const created = await createWebhook({ url: url.trim(), events, isGlobal });
      setSecret(created.secret);
      setUrl('');
      await load();
      toast.success('Webhook added — copy the signing secret now');
    } catch (error) {
      fail('Could not add webhook', error);
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
    <DashPanel title="Webhooks">
      <p className="text-sm text-muted">
        Dealo POSTs signed JSON to your URL when hiring requests are created or change status. Failed
        deliveries retry with backoff for about an hour.
      </p>

      {secret ? (
        <div className="mt-4 rounded-xl border border-brand/40 bg-brand-soft/30 p-3">
          <p className="text-sm font-semibold text-foreground">Signing secret (shown once)</p>
          <code className="mt-2 block break-all text-xs text-foreground">{secret}</code>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(secret);
                toast.success('Copied');
              }}
            >
              Copy
            </button>
            <button type="button" className="btn-secondary" onClick={() => setSecret(null)}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        <input
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/dealo/webhooks"
        />
        <div className="flex flex-wrap items-center gap-2">
          {SUBSCRIBABLE_WEBHOOK_EVENTS.map((event) => (
            <button
              key={event}
              type="button"
              onClick={() =>
                setEvents((current) =>
                  current.includes(event) ? current.filter((e) => e !== event) : [...current, event],
                )
              }
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                events.includes(event) ? 'border-brand bg-brand text-white dark:text-[#071f14]' : 'border-border text-muted'
              }`}
            >
              {event}
            </button>
          ))}
          {canCreateGlobal ? (
            <label className="ml-2 flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} />
              Global (all inquiries)
            </label>
          ) : null}
        </div>
        <button type="button" className="btn-primary w-fit" disabled={saving} onClick={onCreate}>
          {saving ? 'Adding…' : 'Add endpoint'}
        </button>
      </div>

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
