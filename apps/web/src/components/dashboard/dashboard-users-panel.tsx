'use client';

import { Crown, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { FormField } from '@/components/forms/form-field';
import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { fetchDashboardUsers, grantResumePremium, type DashboardUser } from '@/lib/dashboard-api';

export function DashboardUsersPanel() {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();

  const [premiumFor, setPremiumFor] = useState<DashboardUser | null>(null);
  const [days, setDays] = useState(30);

  const premium = (user: DashboardUser) => {
    setDays(30);
    setPremiumFor(user);
  };

  /** Days are added to any premium the person already has; 0 removes it. */
  const applyPremium = async (user: DashboardUser, days: number) => {
    if (!Number.isInteger(days) || days < 0 || days > 3650) {
      toast.error('Enter a whole number of days');
      return;
    }
    setPremiumFor(null);
    setBusyId(user.id);
    try {
      const result = await grantResumePremium(user.id, days);
      setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, premiumUntil: result.premiumUntil } : u)));
      toast.success(days ? 'Premium given' : 'Premium removed');
    } catch (err) {
      toast.error('Could not change premium', err instanceof ApiError ? err.message : '');
    } finally {
      setBusyId(null);
    }
  };

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
                <th className="px-4 py-3 font-medium">CV Premium</th>
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
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {user.premiumUntil ? (
                      <span className="mr-2 inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-300">
                        <Crown className="h-3.5 w-3.5" /> until {new Date(user.premiumUntil).toLocaleDateString()}
                      </span>
                    ) : null}
                    <button type="button" className="font-semibold text-brand" disabled={busyId === user.id} onClick={() => premium(user)}>
                      {user.premiumUntil ? 'Change' : 'Give'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FormModal
        open={Boolean(premiumFor)}
        onClose={() => setPremiumFor(null)}
        icon={Crown}
        title="CV builder premium"
        description={premiumFor ? `${premiumFor.email}${premiumFor.premiumUntil ? ` · premium until ${new Date(premiumFor.premiumUntil).toLocaleDateString()}` : ''}` : undefined}
        size="sm"
        footer={
          <>
            {premiumFor?.premiumUntil ? (
              <button type="button" className="btn-secondary text-danger" onClick={() => premiumFor && void applyPremium(premiumFor, 0)}>
                Remove premium
              </button>
            ) : (
              <button type="button" className="btn-secondary" onClick={() => setPremiumFor(null)}>
                Cancel
              </button>
            )}
            <button type="button" className="btn-primary" onClick={() => premiumFor && void applyPremium(premiumFor, days)}>
              Add {days} days
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">Days are added on top of any premium they already have.</p>
          <div className="grid grid-cols-2 gap-2 min-[340px]:grid-cols-4">
            {[7, 30, 90, 365].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  'rounded-xl border px-2 py-3 text-sm font-semibold transition',
                  days === d ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted hover:border-brand/40',
                )}
              >
                {d === 365 ? '1 year' : `${d} days`}
              </button>
            ))}
          </div>
          <FormField label="Or any number of days">
            <input className="input-field" type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </FormField>
        </div>
      </FormModal>
    </div>
  );
}
