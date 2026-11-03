'use client';

import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ApiError, apiFetch } from '@/lib/api';

type Org = {
  id: string;
  name: string;
  slug: string;
  isOwner: boolean;
  title: string | null;
  members: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    title: string | null;
    isOwner: boolean;
  }>;
};

export function DashboardOrganizationPanel() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<Org[]>('/dashboard/organization');
        if (active) {
          setOrgs(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Unable to load organization.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center gap-2 text-sm text-muted">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading organization…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Organization</p>
        <h1 className="display-title mt-2 text-3xl">Company account</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Memberships linked to your Dealo account. Invite flows expand in a later phase.
        </p>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {orgs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-elevated/70 p-6">
          <h2 className="font-display text-xl">No organization yet</h2>
          <p className="mt-2 text-sm text-muted">
            Submit a hire request or ask Dealo to attach your company account. Member invites ship
            next.
          </p>
          <button type="button" className="btn-secondary mt-5" disabled>
            Invite member
          </button>
        </div>
      ) : (
        orgs.map((org) => (
          <section key={org.id} className="rounded-2xl border border-border p-6">
            <h2 className="font-display text-xl">{org.name}</h2>
            <p className="mt-1 text-xs text-muted">
              {org.slug}
              {org.isOwner ? ' · Owner' : ''}
            </p>
            <ul className="mt-4 divide-y divide-border">
              {org.members.map((member) => (
                <li
                  key={member.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-xs text-muted">{member.email}</p>
                  </div>
                  <span className="text-xs text-muted">
                    {member.title || (member.isOwner ? 'Owner' : 'Member')}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
