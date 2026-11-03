'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { fetchApiPlans, formatMinor, type ApiPlanInfo } from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';

export function ApiPlansSection() {
  const [plans, setPlans] = useState<ApiPlanInfo[] | null>(null);

  useEffect(() => {
    fetchApiPlans()
      .then((data) => setPlans(data.plans))
      .catch(() => setPlans([]));
  }, []);

  return (
    <section id="plans" className="container-page scroll-mt-24 py-10 min-[340px]:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">API plans</p>
        <h2 className="display-title mt-2 text-[1.45rem] text-foreground min-[340px]:text-3xl">
          Start free. Pay when you go live.
        </h2>
        <p className="mt-3 text-sm text-muted">Monthly plans, paid safely with Paystack. Cancel any time.</p>
      </div>

      {plans === null ? (
        <p className="mt-8 text-center text-sm text-muted">Loading plans…</p>
      ) : plans.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted">Plans are coming soon. Talk to us for early pricing.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          {plans.map((plan) => {
            const featured = plan.plan === 'PARTNER';
            return (
              <div
                key={plan.plan}
                className={cn(
                  'relative flex flex-col rounded-[1.5rem] border p-5 transition-transform duration-300 hover:-translate-y-1',
                  featured
                    ? 'border-brand bg-brand-soft/40 shadow-[0_20px_50px_-24px_color-mix(in_srgb,var(--brand)_80%,transparent)]'
                    : 'border-border bg-surface-elevated/80',
                )}
              >
                {featured ? (
                  <span className="absolute -top-3 left-5 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:text-[#071f14]">
                    Most popular
                  </span>
                ) : null}
                <p className="font-display text-xl font-semibold text-foreground">{plan.name}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {plan.priceMinor === 0 ? 'Free' : formatMinor(plan.priceMinor, plan.currency)}
                  {plan.priceMinor > 0 ? <span className="text-sm font-normal text-muted"> / month</span> : null}
                </p>
                {plan.description ? <p className="mt-1 text-sm text-muted">{plan.description}</p> : null}
                <ul className="mt-4 flex-1 space-y-2 text-sm text-foreground">
                  {[
                    `${plan.rateLimitPerMin.toLocaleString()} calls a minute`,
                    `${plan.monthlyQuota.toLocaleString()} calls a month per key`,
                    plan.maxLiveKeys ? `${plan.maxLiveKeys} live key${plan.maxLiveKeys > 1 ? 's' : ''}` : 'Test keys only',
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      {line}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/dashboard/developer"
                  className={cn('mt-5 w-full', featured ? 'btn-primary' : 'btn-secondary')}
                >
                  {plan.priceMinor === 0 ? 'Get a free key' : 'Choose plan'}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
