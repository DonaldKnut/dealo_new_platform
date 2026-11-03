'use client';

import { useCallback, useEffect, useState } from 'react';

import { DashPanel } from '@/components/dashboard/dashboard-ui';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  fetchApiBillingAdmin,
  fetchApiPlans,
  formatMinor,
  updateApiPlan,
  type ApiBillingAdmin,
  type ApiPlanInfo,
} from '@/lib/dashboard-api';

type Draft = {
  price: string;
  rateLimitPerMin: string;
  monthlyQuota: string;
  maxLiveKeys: string;
  isPurchasable: boolean;
};

function toDraft(plan: ApiPlanInfo): Draft {
  return {
    price: String(plan.priceMinor / 100),
    rateLimitPerMin: String(plan.rateLimitPerMin),
    monthlyQuota: String(plan.monthlyQuota),
    maxLiveKeys: String(plan.maxLiveKeys),
    isPurchasable: plan.isPurchasable,
  };
}

const inputClass = 'mt-1 w-full rounded-lg border border-border bg-surface px-2 py-1 text-sm';

export function DashboardApiPlansAdmin() {
  const toast = useToast();
  const [plans, setPlans] = useState<ApiPlanInfo[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [overview, setOverview] = useState<ApiBillingAdmin | null>(null);

  const load = useCallback(async () => {
    try {
      const [catalogue, admin] = await Promise.all([fetchApiPlans(), fetchApiBillingAdmin()]);
      setPlans(catalogue.plans);
      setPaymentsEnabled(catalogue.paymentsEnabled);
      setDrafts(Object.fromEntries(catalogue.plans.map((plan) => [plan.plan, toDraft(plan)])));
      setOverview(admin);
    } catch (error) {
      toast.error('Unable to load API billing', error instanceof ApiError ? error.message : undefined);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = (plan: string, field: keyof Draft, value: string | boolean) =>
    setDrafts((current) => ({ ...current, [plan]: { ...current[plan], [field]: value } }));

  const onSave = async (plan: ApiPlanInfo) => {
    const draft = drafts[plan.plan];
    try {
      await updateApiPlan(plan.plan, {
        priceMinor: Math.round(Number(draft.price) * 100),
        rateLimitPerMin: Number(draft.rateLimitPerMin),
        monthlyQuota: Number(draft.monthlyQuota),
        maxLiveKeys: Number(draft.maxLiveKeys),
        isPurchasable: draft.isPurchasable,
      });
      toast.success(`${plan.name} plan saved`);
      await load();
    } catch (error) {
      toast.error('Save failed', error instanceof ApiError ? error.message : undefined);
    }
  };

  return (
    <DashPanel title="API plans & revenue">
      <p className="text-sm text-muted">
        Prices are in major units ({plans[0]?.currency ?? 'NGN'}). Online checkout is{' '}
        <strong>{paymentsEnabled ? 'enabled' : 'disabled — set PAYSTACK_SECRET_KEY on the API'}</strong>.
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {plans.map((plan) => {
          const draft = drafts[plan.plan];
          if (!draft) return null;
          return (
            <div key={plan.plan} className="rounded-xl border border-border p-4 text-sm">
              <p className="font-display text-lg text-foreground">{plan.name}</p>
              <label className="mt-2 block text-xs text-muted">
                Price per {plan.periodDays} days
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={draft.price}
                  onChange={(e) => setField(plan.plan, 'price', e.target.value)}
                />
              </label>
              <label className="mt-2 block text-xs text-muted">
                Requests / minute
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  value={draft.rateLimitPerMin}
                  onChange={(e) => setField(plan.plan, 'rateLimitPerMin', e.target.value)}
                />
              </label>
              <label className="mt-2 block text-xs text-muted">
                Requests / month per key
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  value={draft.monthlyQuota}
                  onChange={(e) => setField(plan.plan, 'monthlyQuota', e.target.value)}
                />
              </label>
              <label className="mt-2 block text-xs text-muted">
                Max live keys
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={draft.maxLiveKeys}
                  onChange={(e) => setField(plan.plan, 'maxLiveKeys', e.target.value)}
                />
              </label>
              <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={draft.isPurchasable}
                  onChange={(e) => setField(plan.plan, 'isPurchasable', e.target.checked)}
                />
                Purchasable online
              </label>
              <button type="button" className="btn-secondary mt-3 w-full" onClick={() => onSave(plan)}>
                Save
              </button>
            </div>
          );
        })}
      </div>

      {overview ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Revenue (last 100 invoices)</p>
            <p className="mt-1 text-sm text-muted">
              {Object.entries(overview.revenueByCurrency)
                .map(([currency, minor]) => formatMinor(minor, currency))
                .join(' · ') || 'No paid invoices yet'}
            </p>
            <p className="mt-4 text-sm font-semibold text-foreground">Active subscriptions</p>
            <ul className="mt-1 space-y-1 text-xs text-muted">
              {overview.activeSubscriptions.length === 0 ? (
                <li>None yet.</li>
              ) : (
                overview.activeSubscriptions.map((sub) => (
                  <li key={sub.id}>
                    {sub.email} · {sub.plan} · until {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Invoices</p>
            <ul className="mt-1 max-h-72 space-y-1 overflow-y-auto text-xs">
              {overview.invoices.length === 0 ? (
                <li className="text-muted">No invoices yet.</li>
              ) : (
                overview.invoices.map((invoice) => (
                  <li key={invoice.id} className="flex flex-wrap justify-between gap-2">
                    <span className="text-muted">
                      {invoice.email} · {invoice.plan}
                    </span>
                    <span className={invoice.status === 'PAID' ? 'text-brand' : 'text-muted'}>
                      {formatMinor(invoice.amountMinor, invoice.currency)} · {invoice.status}
                      {invoice.failureReason ? ` (${invoice.failureReason})` : ''}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </DashPanel>
  );
}
