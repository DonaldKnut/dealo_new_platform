'use client';

import { useCallback, useEffect, useState } from 'react';

import { DashPanel } from '@/components/dashboard/dashboard-ui';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  createOAuthClient,
  fetchOAuthClients,
  revokeOAuthClient,
  type OAuthClientRow,
} from '@/lib/dashboard-api';

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
}

export function DashboardOAuthClients({
  apiKeyId,
  keyName,
  onClose,
}: {
  apiKeyId: string;
  keyName: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [rows, setRows] = useState<OAuthClientRow[]>([]);
  const [name, setName] = useState('');
  const [issued, setIssued] = useState<{ clientId: string; clientSecret: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await fetchOAuthClients(apiKeyId));
    } catch (error) {
      toast.error('Unable to load OAuth clients', error instanceof ApiError ? error.message : undefined);
    }
  }, [apiKeyId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = async () => {
    if (name.trim().length < 2) {
      toast.error('Name the client (at least 2 characters)');
      return;
    }
    try {
      const created = await createOAuthClient(apiKeyId, name.trim());
      setIssued({ clientId: created.clientId, clientSecret: created.clientSecret });
      setName('');
      await load();
    } catch (error) {
      toast.error('Create failed', error instanceof ApiError ? error.message : undefined);
    }
  };

  const onRevoke = async (id: string) => {
    try {
      await revokeOAuthClient(id);
      await load();
      toast.success('OAuth client revoked');
    } catch (error) {
      toast.error('Revoke failed', error instanceof ApiError ? error.message : undefined);
    }
  };

  return (
    <DashPanel
      title={`OAuth clients · ${keyName}`}
      action={
        <button type="button" className="btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <p className="text-sm text-muted">
        Client-credentials clients exchange an ID and secret for 1-hour tokens that carry this key&apos;s
        scopes, plan and rate limit.
      </p>

      {issued ? (
        <div className="mt-4 rounded-xl border border-brand/40 bg-brand-soft/30 p-3 text-xs">
          <p className="text-sm font-semibold text-foreground">Copy these now (secret shown once)</p>
          <p className="mt-2 break-all font-mono">client_id: {issued.clientId}</p>
          <p className="break-all font-mono">client_secret: {issued.clientSecret}</p>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-surface p-2">
            {`curl -s -X POST ${apiBase()}/oauth/token \\
  -u "${issued.clientId}:${issued.clientSecret}" \\
  -d grant_type=client_credentials`}
          </pre>
          <button type="button" className="btn-secondary mt-2" onClick={() => setIssued(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm sm:max-w-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme backend service"
        />
        <button type="button" className="btn-primary" onClick={onCreate}>
          Create client
        </button>
      </div>

      <ul className="mt-4 divide-y divide-border text-sm">
        {rows.length === 0 ? (
          <li className="py-2 text-muted">No OAuth clients for this key.</li>
        ) : (
          rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <div>
                <p className="font-medium text-foreground">{row.name}</p>
                <p className="font-mono text-xs text-muted">
                  {row.clientId} ·{' '}
                  {row.lastUsedAt ? `last token ${new Date(row.lastUsedAt).toLocaleString()}` : 'never used'}
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
          ))
        )}
      </ul>
    </DashPanel>
  );
}
