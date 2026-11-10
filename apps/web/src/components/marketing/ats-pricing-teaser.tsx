'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Rocket,
  Sparkles,
  Users2,
} from 'lucide-react';

import { MarketingPill } from './marketing-pill';
import { MarketingSection } from './marketing-section';
import { Reveal } from './reveal';

const PLANS = [
  {
    icon: Rocket,
    name: 'Early Access',
    price: 'Free',
    priceSub: 'During early access',
    badge: null,
    highlight: false,
    features: [
      'Up to 10 open roles',
      'Up to 10 team seats',
      'AI CV screening (100 CVs/mo)',
      'Careers page',
      'Kanban pipeline board',
      'Email & calendar integrations',
      'Offer letters',
    ],
    cta: 'Start free',
    ctaStyle: 'btn-secondary',
  },
  {
    icon: Crown,
    name: 'Pro',
    price: '₦25k',
    priceSub: 'per month · billed monthly',
    badge: 'Coming soon',
    highlight: true,
    features: [
      'Unlimited open roles',
      'Unlimited team seats',
      'Unlimited AI CV screening',
      'Custom careers page domain',
      'Advanced pipeline reports',
      'API & webhooks',
      'Priority support',
      'Dealo recruiter add-on',
    ],
    cta: 'Join waitlist',
    ctaStyle: 'btn-primary',
  },
  {
    icon: Users2,
    name: 'Enterprise',
    price: 'Custom',
    priceSub: 'Volume & contract pricing',
    badge: null,
    highlight: false,
    features: [
      'Everything in Pro',
      'SSO / SAML',
      'Dedicated account manager',
      'Custom AI screening rules',
      'SLA & compliance package',
      'On-premise option',
    ],
    cta: 'Talk to us',
    ctaStyle: 'btn-secondary',
  },
] as const;

export function AtsPricingTeaser({
  onStart,
  onContact,
}: {
  onStart?: () => void;
  onContact?: () => void;
}) {
  const handleCta = (name: string) => {
    if (name === 'Early Access') onStart?.();
    else onContact?.();
  };

  return (
    <MarketingSection id="pricing" className="bg-gradient-to-b from-surface/60 to-surface-elevated/40">
      <Reveal>
        <div className="text-center">
          <MarketingPill icon={Sparkles}>Pricing</MarketingPill>
          <h2 className="display-title mx-auto mt-3 max-w-2xl text-[1.55rem] leading-tight text-foreground min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl lg:text-5xl">
            Start free. Scale when you need to.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted min-[340px]:text-base">
            Everything you need to hire your first 10 people is free, forever during early access.
            Paid plans come later — with no surprise price jumps.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-4 min-[340px]:mt-14 min-[340px]:gap-5 md:grid-cols-3">
        {PLANS.map((plan, i) => {
          const Icon = plan.icon;
          return (
            <Reveal key={plan.name} delay={i * 0.1} className="h-full">
              <motion.div
                whileHover={{ y: plan.highlight ? -6 : -3 }}
                transition={{ duration: 0.25 }}
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 transition-all min-[340px]:p-6 ${
                  plan.highlight
                    ? 'border-brand/50 bg-brand-soft/40 shadow-xl shadow-brand/10 ring-1 ring-brand/20 dark:bg-brand/10'
                    : 'border-border/80 bg-surface-elevated hover:border-brand/20 hover:shadow-md'
                }`}
              >
                {/* Highlight glow */}
                {plan.highlight && (
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/15 blur-2xl" />
                )}

                {/* Badge */}
                {plan.badge && (
                  <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm shadow-brand/30">
                    <Sparkles className="h-2.5 w-2.5" />
                    {plan.badge}
                  </span>
                )}

                {/* Plan header */}
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
                      plan.highlight ? 'bg-brand text-white shadow-md shadow-brand/40' : 'bg-brand-soft text-brand'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="font-display text-sm font-bold text-foreground">{plan.name}</p>
                </div>

                {/* Price */}
                <div className="mt-5 border-b border-border/60 pb-5">
                  <p className="font-display text-3xl font-black tracking-tight text-foreground min-[340px]:text-4xl">
                    {plan.price}
                  </p>
                  <p className="mt-1 text-[11px] text-muted min-[340px]:text-xs">{plan.priceSub}</p>
                </div>

                {/* Features */}
                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-foreground/80 min-[340px]:text-sm">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  type="button"
                  onClick={() => handleCta(plan.name)}
                  className={`mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${plan.ctaStyle}`}
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            </Reveal>
          );
        })}
      </div>

      {/* Fine print */}
      <Reveal delay={0.3}>
        <p className="mt-8 text-center text-xs text-muted min-[340px]:mt-10">
          No credit card required for early access. Cancel anytime. Free plan limits stay generous — no dark patterns.
        </p>
      </Reveal>
    </MarketingSection>
  );
}

