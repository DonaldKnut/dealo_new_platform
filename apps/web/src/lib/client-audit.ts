import { apiFetch } from '@/lib/api';

/** Fire-and-forget frontend audit event (auth cookie required). */
export function logClientAudit(input: {
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  if (typeof window === 'undefined') return;

  void apiFetch('/audit/client', {
    method: 'POST',
    json: {
      action: input.action,
      entityType: input.entityType ?? 'Frontend',
      entityId: input.entityId,
      metadata: input.metadata,
      path: window.location.pathname,
    },
  }).catch(() => {
    // never block UX on audit failure
  });
}
