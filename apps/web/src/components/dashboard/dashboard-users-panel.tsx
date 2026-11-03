'use client';

import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api';
import { fetchDashboardUsers, type DashboardUser } from '@/lib/dashboard-api';

export function DashboardUsersPanel() {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchDashboardUsers();
        if (active) {
          setUsers(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Unable to load users.');
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
        Loading users…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Directory</p>
        <h1 className="display-title mt-2 text-[1.65rem] min-[340px]:text-3xl">Users</h1>
        <p className="mt-2 text-sm text-muted">Platform accounts and role assignments.</p>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Roles</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-border">
                  <td className="px-4 py-3 text-foreground">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted">{user.email}</td>
                  <td className="px-4 py-3 text-xs text-muted">{user.roles.join(', ')}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-brand">
                      {user.isActive ? 'Active' : 'Inactive'}
                      {user.isEmailVerified ? '' : ' · Unverified'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
