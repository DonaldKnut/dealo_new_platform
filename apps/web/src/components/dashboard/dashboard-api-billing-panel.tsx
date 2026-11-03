'use client';

import { useCallback, useEffect, useState } from 'react';

import { DashPanel } from '@/components/dashboard/dashboard-ui';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  createLiveApiKey,
  fetchApiPlans,
  fetchMyApiBilling,
  formatMinor,
  startApiCheckout,
  verifyApiPayment,
  type ApiPlanInfo,
  type ApiPlanName,
  type CreatedApiKey,
  type MyApiBilling,
} from '@/lib/dashboard-api';

export function DashboardApiBillingPanel({
  onKeyCreated,
}: {
  onKeyCreated: (key: CreatedApiKey) => void;
}) {
  const toast = useToast();
  const [billing, setBilling] = useState<MyApiBilling | null>(null);
  const [plans, setPlans] = useState<ApiPlanInfo[]>([]);
  const [busyPlan, setBusyPlan] = useState<ApiPlanName | null>(null);
  const [liveName, setLiveName] = useState('');

  const load = useCallback(async () => {
    try {
      const [mine, catalogue] = await Promise.all([fetchMyApiBilling(), fetchApiPlans()]);
      setBilling(mine);
      setPlans(catalogue.plans);
    } catch (error) {
      toast.error('Unable to load your API plan', error instanceof ApiError ? error.message : undefined);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') ?? params.get('trxref');
    if (params.get('billing') !== 'return' || !reference) return;
    window.history.replaceState(null, '', window.location.pathname);
    verifyApiPayment(reference)
      .then((result) => {
        if (result.status === 'PAID') toast.success(`Payment confirmed — ${result.plan} plan active`);
        else if (result.status === 'PENDING') toast.success('Payment is processing; refresh in a minute');
        else toast.error('Payment was not completed', result.failureReason ?? undefined);
        return load();
      })
      .catch((error) =>
        toast.error('Could not confirm payment', error instanceof ApiError ? error.message : undefined),
      );
  }, [load, toast]);

  const onUpgrade = async (plan: ApiPlanName) => {
    setBusyPlan(plan);
    try {
      const { authorizationUrl } = await startApiCheckout(plan);
      window.location.assign(authorizationUrl);
    } catch (error) {
      toast.error('Checkout unavailable', error instanceof ApiError ? error.message : undefined);
      setBusyPlan(null);
    }
  };

  const onCreateLive = async () => {
    if (liveName.trim().length < 2) {
      toast.error('Name the live key (at least 2 characters)');
      return;
    }
    try {
      const created = await createLiveApiKey(liveName.trim());
      setLiveName('');
      onKeyCreated(created);
      toast.success('Live key created — copy it now');
    } catch (error) {
      toast.error('Could not create live key', error instanceof ApiError ? error.message : undefined);
    }
  };

  if (!billing) {
    return (
      <DashPanel title="Plan & billing">
        <p className="text-sm text-muted">Loading…</p>
      </DashPanel>
    );
  }

  const quota = billing.planConfig?.monthlyQuota ?? 0;
  const usedPct = quota ? Math.min(100, Math.round((billing.requestsThisMonth / quota) * 100)) : 0;
  const hasPaidPlan = billing.activePlan !== 'SANDBOX';

  return (
    <DashPanel title="Plan & billing">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Current plan</p>
          <p className="mt-1 font-display text-2xl text-foreground">{billing.planConfig?.name ?? billing.activePlan}</p>
          {billing.subscription && hasPaidPlan ? (
            <p className="text-sm text-muted">
              Renews manually · paid through {new Date(billing.subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          ) : (
            <p className="text-sm text-muted">Free sandbox access</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Requests this month</p>
          <p className="mt-1 text-sm text-foreground">
            {billing.requestsThisMonth.toLocaleString()} / {quota.toLocaleString()} per key
          </p>
          <div className="mt-2 h-2 rounded-full bg-border">
            <div className="h-2 rounded-full bg-brand" style={{ width: `${usedPct}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.plan === billing.activePlan;
          return (
            <div
              key={plan.plan}
              className={`rounded-xl border p-4 ${isCurrent ? 'border-brand' : 'border-border'}`}
            >
              <p className="font-display text-lg text-foreground">{plan.name}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {plan.priceMinor === 0 ? 'Free' : formatMinor(plan.priceMinor, plan.currency)}
                {plan.priceMinor > 0 ? (
                  <span className="text-xs font-normal text-muted"> / {plan.periodDays} days</span>
                ) : null}
              </p>
              {plan.description ? <p className="mt-1 text-xs text-muted">{plan.description}</p> : null}
              <ul className="mt-3 space-y-1 text-xs text-muted">
                <li>{plan.rateLimitPerMin.toLocaleString()} requests / minute</li>
                <li>{plan.monthlyQuota.toLocaleString()} requests / month per key</li>
                <li>{plan.maxLiveKeys ? `${plan.maxLiveKeys} live key(s)` : 'Test keys only'}</li>
              </ul>
              {plan.isPurchasable && plan.priceMinor > 0 ? (
                <button
                  type="button"
                  className={`mt-4 w-full ${isCurrent ? 'btn-secondary' : 'btn-primary'}`}
                  disabled={!billing.paymentsEnabled || busyPlan !== null}
                  onClick={() => onUpgrade(plan.plan)}
                >
                  {busyPlan === plan.plan
                    ? 'Redirecting…'
                    : isCurrent
                      ? 'Extend 1 period'
                      : billing.paymentsEnabled
                        ? 'Upgrade with Paystack'
                        : 'Contact sales'}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {hasPaidPlan ? (
        <div className="mt-6">
          <p className="text-sm font-semibold text-foreground">Create a live key</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm sm:max-w-sm"
              value={liveName}
              onChange={(e) => setLiveName(e.target.value)}
              placeholder="Production integration"
            />
            <button type="button" className="btn-primary" onClick={onCreateLive}>
              Create live key
            </button>
          </div>
        </div>
      ) : null}

      {billing.invoices.length ? (
        <div className="mt-6">
          <p className="text-sm font-semibold text-foreground">Invoices</p>
          <ul className="mt-2 divide-y divide-border text-sm">
            {billing.invoices.map((invoice) => (
              <li key={invoice.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="font-mono text-xs text-muted">{invoice.reference}</span>
                <span>
                  {invoice.plan} · {formatMinor(invoice.amountMinor, invoice.currency)} ·{' '}
                  <span className={invoice.status === 'PAID' ? 'text-brand' : 'text-muted'}>{invoice.status}</span>{' '}
                  · {new Date(invoice.paidAt ?? invoice.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </DashPanel>
  );
}
