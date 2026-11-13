'use client';

import { AGENT_CATALOG, AGENT_PLANS, HIRING_AGENTS, type HiringAgentId } from '@dealo/shared';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Check,
  ChevronDown,
  Clock3,
  Eye,
  Fingerprint,
  History,
  Lock,
  MessagesSquare,
  Scale,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { useModal } from '@/components/modals/modal-context';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { isStaffRole, useAuthSession } from '@/hooks/use-auth-session';
import { TRIGGER_LABEL } from '@/lib/agents-api';
import { cn } from '@/lib/utils';
import { whatsappHref } from '@/lib/whatsapp';

import { AGENT_LOOK, formatNaira } from './agent-meta';

const STAFF_START = '/dashboard/ats/agents';

function PrimaryCta({ className, children }: { className?: string; children: ReactNode }) {
  const { open } = useModal();
  const { user } = useAuthSession();
  if (user && isStaffRole(user.roles)) {
    return (
      <Link href={STAFF_START} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={() => open('hire')}>
      {children}
    </button>
  );
}

export function HiringAgentsLanding() {
  return (
    <div className="overflow-x-clip">
      <Hero />
      <ProofStrip />
      <AgentsGrid />
      <HowItWorks />
      <LiveDemo />
      <Trust />
      <Pricing />
      <Faq />
      <FinalCta />
    </div>
  );
}

// -------------------------------------------------------------------- hero

function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative isolate overflow-hidden bg-[#04140f] pb-16 pt-28 text-white min-[340px]:pt-32 sm:pb-24 sm:pt-36">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.28),transparent_60%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div aria-hidden className="absolute -left-32 top-40 -z-10 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="container-page grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <motion.p initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            <Sparkles className="h-3.5 w-3.5" /> New · Dealo Hiring Agents
          </motion.p>
          <h1 className="mt-5 font-display text-[2.1rem] leading-[1.02] min-[340px]:text-5xl sm:text-6xl lg:text-[4.2rem]">
            Meet your
            <span className="block bg-gradient-to-r from-emerald-300 via-teal-200 to-lime-200 bg-clip-text text-transparent">AI hiring team.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            Seven specialist agents that screen CVs, write job posts, find candidates, follow up, book interviews and brief your team every morning. Built for hiring in Nigeria. A person approves every step.
          </p>
          <div className="mt-8 flex flex-col gap-3 min-[400px]:flex-row">
            <PrimaryCta className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-6 py-3 text-sm font-semibold text-[#042016] shadow-[0_18px_40px_-12px_rgba(16,185,129,0.7)] transition hover:brightness-110">
              Request talent <ArrowRight className="h-4 w-4" />
            </PrimaryCta>
            <a href="#demo" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              <Eye className="h-4 w-4" /> See it work
            </a>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/60">
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-300" /> No card needed</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-300" /> Works inside Dealo ATS</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-300" /> Set up in 2 minutes</span>
          </div>
        </div>
        <AgentOrbit />
      </div>
    </section>
  );
}

function AgentOrbit() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[30rem]">
      <div aria-hidden className="absolute inset-[12%] rounded-full border border-white/10" />
      <div aria-hidden className="absolute inset-[26%] rounded-full border border-dashed border-emerald-300/20" />
      <motion.div
        className="absolute inset-0"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        {HIRING_AGENTS.map((id, i) => {
          const angle = (i / HIRING_AGENTS.length) * Math.PI * 2 - Math.PI / 2;
          const look = AGENT_LOOK[id];
          const Icon = look.icon;
          return (
            <motion.span
              key={id}
              className="absolute"
              style={{ left: `${50 + Math.cos(angle) * 38}%`, top: `${50 + Math.sin(angle) * 38}%` }}
              animate={reduce ? undefined : { rotate: -360 }}
              transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            >
              <span className={cn('-ml-6 -mt-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-[0_12px_30px_-8px_rgba(0,0,0,0.6)] ring-1 ring-white/20 sm:h-14 sm:w-14', look.gradient)} title={AGENT_CATALOG[id].name}>
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
            </motion.span>
          );
        })}
      </motion.div>
      <div className="absolute inset-[34%] flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-500/10 text-center ring-1 ring-emerald-300/30 backdrop-blur">
        <motion.span animate={reduce ? undefined : { scale: [1, 1.08, 1] }} transition={{ duration: 3, repeat: Infinity }} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-300 text-[#042016] sm:h-12 sm:w-12">
          <UserCheck className="h-5 w-5 sm:h-6 sm:w-6" />
        </motion.span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100 sm:text-xs">You decide</span>
      </div>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute -bottom-4 left-1/2 w-[min(19rem,92%)] -translate-x-1/2 rounded-2xl border border-white/10 bg-white/95 p-3 text-[#0b1f1e] shadow-2xl sm:-right-6 sm:left-auto sm:translate-x-0"
      >
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
          <Bot className="h-3.5 w-3.5" /> Screening agent · just now
        </p>
        <p className="mt-1 text-sm font-semibold">Shortlist 5 for Customer Service Lead</p>
        <p className="text-xs text-[#5b6f6e]">5 of 38 applicants score 70+ against your must-haves.</p>
        <div className="mt-2 flex gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#0f766e] px-3 py-1 text-xs font-semibold text-white">
            <Check className="h-3.5 w-3.5" /> Approve
          </span>
          <span className="rounded-full border border-[#d7e8e6] px-3 py-1 text-xs text-[#5b6f6e]">Review</span>
        </div>
      </motion.div>
    </div>
  );
}

// ------------------------------------------------------------------- proof

function ProofStrip() {
  const items = [
    { value: '7', label: 'specialist agents' },
    { value: '~45 min', label: 'of reading saved per shortlist' },
    { value: '1', label: 'inbox for all agent work' },
    { value: '24/7', label: 'on shift, even on Sundays' },
  ];
  return (
    <section className="border-b border-border bg-surface/60">
      <div className="container-page grid grid-cols-2 gap-6 py-8 sm:grid-cols-4">
        {items.map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="text-center">
            <p className="font-display text-3xl text-brand sm:text-4xl">{item.value}</p>
            <p className="mt-1 text-xs text-muted sm:text-sm">{item.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ agents

function AgentsGrid() {
  return (
    <section className="container-page py-16 sm:py-24">
      <p className="eyebrow">The team</p>
      <h2 className="display-title mt-2 max-w-2xl text-3xl text-foreground sm:text-4xl">Seven agents. One job: make hiring feel easy.</h2>
      <p className="mt-3 max-w-2xl text-muted">Each agent is an expert at one part of hiring. Turn on the ones you want; they work together inside your Dealo ATS.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HIRING_AGENTS.map((id, i) => {
          const meta = AGENT_CATALOG[id];
          const look = AGENT_LOOK[id];
          const Icon = look.icon;
          return (
            <motion.article
              key={id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: (i % 3) * 0.06 }}
              className={cn('group relative overflow-hidden rounded-[1.5rem] border border-border bg-surface-elevated p-5 transition hover:-translate-y-1 hover:shadow-2xl', i === 0 && 'lg:col-span-2')}
            >
              <div aria-hidden className={cn('pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-gradient-to-br opacity-15 blur-2xl transition-opacity group-hover:opacity-35', look.gradient)} />
              <span className={cn('relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg', look.gradient)}>
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="relative mt-4 font-display text-xl text-foreground">{meta.name}</h3>
              <p className={cn('relative text-sm font-semibold', look.text)}>{meta.tagline}</p>
              <p className="relative mt-2 text-sm leading-relaxed text-muted">{meta.description}</p>
              <div className="relative mt-4 flex flex-wrap items-center gap-1.5">
                {meta.triggers.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                    <Zap className="h-3 w-3" /> {TRIGGER_LABEL[t]}
                  </span>
                ))}
              </div>
              <p className="relative mt-3 text-xs text-foreground">
                <span className="font-semibold">You get:</span> {meta.output}
              </p>
            </motion.article>
          );
        })}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="flex flex-col justify-center rounded-[1.5rem] border border-dashed border-brand/40 bg-brand-soft/40 p-5">
          <p className="font-display text-xl text-foreground">Need an agent we don’t have?</p>
          <p className="mt-2 text-sm text-muted">Background checks, onboarding packs, payroll hand-off. Tell us what eats your week and we will build it with you.</p>
          <Link href="/contact" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
            Talk to us <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------ how it works

function HowItWorks() {
  const steps = [
    { icon: Zap, title: 'Something happens', body: 'Someone applies, a candidate reaches the interview stage, or it is 8am. Or you press “Run now”.' },
    { icon: Bot, title: 'An agent does the work', body: 'It reads CVs, writes, searches or checks the pipeline in seconds, using your job’s must-haves.' },
    { icon: UserCheck, title: 'You approve', body: 'The result lands in your inbox with its reasons. Tick, tweak or dismiss. Nothing reaches a candidate without you.' },
    { icon: History, title: 'It is done and logged', body: 'Stages move, emails send, invites go out. Every action is recorded, so your team can see who decided what.' },
  ];
  return (
    <section className="relative overflow-hidden border-y border-border bg-surface/50 py-16 sm:py-24">
      <div className="container-page">
        <p className="eyebrow">How it works</p>
        <h2 className="display-title mt-2 text-3xl text-foreground sm:text-4xl">Agents do the busywork. People make the calls.</h2>
        <ol className="relative mt-10 grid gap-6 md:grid-cols-4">
          <div aria-hidden className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-gradient-to-r from-emerald-400/0 via-emerald-400/60 to-emerald-400/0 md:block" />
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.li key={step.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="relative">
                <span className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-brand shadow-sm">
                  <Icon className="h-6 w-6" />
                  <span className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white dark:text-[#071f14]">{i + 1}</span>
                </span>
                <h3 className="mt-4 font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- live demo

const DEMO: Partial<Record<HiringAgentId, { title: string; summary: string; body: React.ReactNode; cta: string }>> = {
  screening: {
    title: 'Shortlist 5 for Customer Service Lead',
    summary: '5 of 38 waiting applicants score 70+ against the must-haves.',
    cta: 'Move 5 to “Screen”',
    body: (
      <ul className="space-y-2">
        {[
          ['Chiamaka O.', 91, '4 yrs fintech support · Zendesk · Lagos'],
          ['Tunde A.', 86, 'Team lead, 6 agents · CSAT 94%'],
          ['Halima B.', 81, 'Call centre, 60+ calls a day · Abuja'],
          ['Emeka N.', 74, 'Telecom support · bilingual'],
        ].map(([name, score, note]) => (
          <li key={String(name)} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-brand text-white dark:text-[#071f14]"><Check className="h-3.5 w-3.5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">{name}</span>
              <span className="block truncate text-xs text-muted">{note}</span>
            </span>
            <span className="font-display text-lg tabular-nums text-emerald-600">{score}</span>
          </li>
        ))}
      </ul>
    ),
  },
  job_post: {
    title: 'New job post: Site Electrician',
    summary: '5 must-haves · ₦150,000–₦280,000 a month · 2 wording issues flagged.',
    cta: 'Save as draft job',
    body: (
      <div className="space-y-2 text-sm">
        <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-2.5 text-xs">
          <span className="font-semibold">“Young and energetic”</span> suggests an age preference. Try “comfortable on busy sites”.
        </p>
        <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-2.5 text-xs">
          <span className="font-semibold">“Men only”</span> is discriminatory. Describe the duties instead.
        </p>
        <p className="text-muted"><span className="font-semibold text-foreground">What you need:</span> COREN or trade test certificate · 3+ years on construction sites · safe isolation and testing…</p>
      </div>
    ),
  },
  follow_up: {
    title: '12 people have waited 5+ days',
    summary: 'Personal update emails are ready. Approve to send.',
    cta: 'Send 12 updates',
    body: (
      <div className="rounded-xl border border-border p-3 text-sm">
        <p className="text-xs text-muted">Subject: An update on your application – Account Officer</p>
        <p className="mt-2 text-foreground">Hi Ngozi,<br /><br />Thank you for applying for the Account Officer role at Paylite. Your application is still being reviewed and you have not been forgotten…</p>
      </div>
    ),
  },
  pipeline_digest: {
    title: 'Hiring briefing · Monday 10 Nov',
    summary: '9 new applicants since Friday. Start with the 4 waiting 3+ days for Sales Executive.',
    cta: 'Open the board',
    body: (
      <ul className="space-y-1.5 text-sm">
        {[
          ['bg-rose-500', '2 interviews need scorecards'],
          ['bg-rose-500', 'Review 4 applicants waiting 3+ days for Sales Executive'],
          ['bg-amber-500', 'Move or reject 3 stuck in Accountant'],
          ['bg-amber-500', 'Driver has no applicants after a week – run Sourcing'],
        ].map(([dot, text]) => (
          <li key={text} className="flex items-start gap-2 rounded-xl border border-border p-2.5">
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', dot)} /> <span className="text-foreground">{text}</span>
          </li>
        ))}
      </ul>
    ),
  },
};

function LiveDemo() {
  const ids = Object.keys(DEMO) as HiringAgentId[];
  const [active, setActive] = useState<HiringAgentId>('screening');
  const demo = DEMO[active]!;
  const look = AGENT_LOOK[active];
  const Icon = look.icon;
  return (
    <section id="demo" className="container-page scroll-mt-24 py-16 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="eyebrow">See it work</p>
          <h2 className="display-title mt-2 text-3xl text-foreground sm:text-4xl">One inbox for everything your agents prepare.</h2>
          <p className="mt-3 text-muted">Pick an agent to see the kind of work it hands you. Each card shows its reasons, so you can trust it or overrule it.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {ids.map((id) => {
              const L = AGENT_LOOK[id];
              const I = L.icon;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActive(id)}
                  className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition', active === id ? 'border-brand bg-brand text-white dark:text-[#071f14]' : 'border-border text-muted hover:text-foreground')}
                >
                  <I className="h-4 w-4" /> {AGENT_CATALOG[id].name.replace(' agent', '')}
                </button>
              );
            })}
          </div>
        </div>
        <div className="relative">
          <div aria-hidden className={cn('absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br opacity-20 blur-3xl transition-all duration-500', look.gradient)} />
          <div className="rounded-[1.75rem] border border-border bg-surface-elevated p-3 shadow-2xl min-[340px]:p-5">
            <div className="mb-3 flex items-center justify-between text-xs text-muted">
              <span className="inline-flex items-center gap-1.5 font-semibold text-foreground"><Bot className="h-4 w-4 text-brand" /> Agent inbox</span>
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-300">3 waiting</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }} className="rounded-[1.25rem] border border-border p-3 min-[340px]:p-4">
                <div className="flex items-start gap-3">
                  <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white', look.gradient)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className={cn('text-[11px] font-semibold', look.text)}>{AGENT_CATALOG[active].name}</p>
                    <p className="font-semibold text-foreground">{demo.title}</p>
                    <p className="text-sm text-muted">{demo.summary}</p>
                  </div>
                </div>
                <div className="mt-4">{demo.body}</div>
                <div className="mt-4 flex justify-end gap-2">
                  <span className="rounded-full border border-border px-3 py-1.5 text-xs text-muted">Dismiss</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white dark:text-[#071f14]"><Check className="h-3.5 w-3.5" /> {demo.cta}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

// -------------------------------------------------------------------- trust

function Trust() {
  const items = [
    { icon: UserCheck, title: 'A person decides', body: 'Agents prepare. Your team approves. Agents never reject anyone, and nobody is moved or emailed without a person, except interview invites if you switch that on.' },
    { icon: Scale, title: 'Fair by design', body: 'Agents are told to ignore age, gender, religion, tribe, state of origin and photos, and to judge skills only. The job post agent flags biased wording.' },
    { icon: Lock, title: 'Private', body: 'The AI is told to ignore names, photos and personal details on CVs. Talent-pool matches stay anonymous until the person agrees to be introduced.' },
    { icon: Fingerprint, title: 'Fully logged', body: 'Every suggestion, approval and email is recorded with who decided and when, ready for audits.' },
  ];
  return (
    <section className="bg-[#04140f] py-16 text-white sm:py-24">
      <div className="container-page">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Trust</p>
        <h2 className="mt-2 max-w-2xl font-display text-3xl sm:text-4xl">AI that helps people hire. Never AI that replaces judgement.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <Icon className="h-6 w-6 text-emerald-300" />
                <h3 className="mt-3 font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/65">{item.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ pricing

function Pricing() {
  const whatsapp = whatsappHref('Hi Dealo, I want to talk about Hiring Agents for a large team.');
  const plans = [
    {
      name: 'Free',
      price: '₦0',
      period: 'forever',
      blurb: 'For small teams trying AI hiring.',
      features: [`${AGENT_PLANS.FREE.monthlyRuns} agent runs a month`, 'All 7 agents', 'Automatic screening, follow-up and scheduling', 'Daily briefing email', 'Dealo ATS and careers page included'],
      cta: { label: 'Request talent', href: '/hire' },
      highlight: false,
    },
    {
      name: 'Pro',
      price: formatNaira(AGENT_PLANS.PRO.priceMinor),
      period: 'per workspace / month',
      blurb: 'For teams hiring every week.',
      features: [`${AGENT_PLANS.PRO.monthlyRuns.toLocaleString()} agent runs a month`, 'Everything in Free', 'Priority help from Dealo recruiters', 'Early access to new agents', 'Pay by card, transfer or USSD with Paystack'],
      cta: { label: 'Talk to Dealo', href: '/hire' },
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'for large and multi-site teams',
      blurb: 'Custom agents, volume and support.',
      features: ['Custom run limits for your volume', 'Custom agents for your process', 'API and webhooks to your HR tools', 'Dedicated success manager', 'Invoices in naira'],
      cta: { label: 'Talk to sales', href: whatsapp ?? '/contact' },
      highlight: false,
    },
  ];
  return (
    <section id="pricing" className="container-page scroll-mt-24 py-16 sm:py-24">
      <p className="eyebrow text-center">Pricing</p>
      <h2 className="display-title mx-auto mt-2 max-w-2xl text-center text-3xl text-foreground sm:text-4xl">Less than one day of a recruiter’s pay.</h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted">One agent run is one piece of finished work: a shortlist, a job post, a briefing or a batch of follow-ups.</p>
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              'relative flex flex-col rounded-[1.75rem] border p-6',
              plan.highlight ? 'border-transparent bg-[#04140f] text-white shadow-[0_30px_80px_-30px_rgba(16,185,129,0.6)] ring-2 ring-emerald-400/60' : 'border-border bg-surface-elevated',
            )}
          >
            {plan.highlight ? (
              <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#3b2600]">
                <BadgeCheck className="h-3.5 w-3.5" /> Most popular
              </span>
            ) : null}
            <p className={cn('font-semibold', plan.highlight ? 'text-emerald-300' : 'text-brand')}>{plan.name}</p>
            <p className="mt-3 font-display text-4xl">{plan.price}</p>
            <p className={cn('text-sm', plan.highlight ? 'text-white/60' : 'text-muted')}>{plan.period}</p>
            <p className={cn('mt-3 text-sm', plan.highlight ? 'text-white/80' : 'text-foreground')}>{plan.blurb}</p>
            <ul className="mt-5 flex-1 space-y-2.5 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className={cn('mt-0.5 h-4 w-4 shrink-0', plan.highlight ? 'text-emerald-300' : 'text-brand')} /> <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href={plan.cta.href}
              className={cn(
                'mt-6 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition',
                plan.highlight ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-[#042016] hover:brightness-110' : 'border border-border text-foreground hover:border-brand hover:text-brand',
              )}
            >
              {plan.name === 'Enterprise' && whatsapp ? <WhatsAppIcon className="h-4 w-4" /> : null} {plan.cta.label}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------- faq

const FAQ = [
  { q: 'Do I need Dealo ATS to use the agents?', a: 'Yes. The agents work on your jobs and applicants in Dealo ATS, which is free. Setting up a workspace takes about a minute.' },
  { q: 'Will the AI reject candidates by itself?', a: 'No. Agents only suggest. A person approves every move, email and invite. The one exception is the scheduling agent, which can send interview invites automatically if you switch that on.' },
  { q: 'What counts as an agent run?', a: 'One finished piece of work: a shortlist, a job post, a sourcing plan, an interview kit, a daily briefing or a batch of follow-ups. Refreshing an open shortlist when new people apply is free.' },
  { q: 'Which AI do you use?', a: 'Google’s Gemini for writing and reasoning, checked by Dealo’s own rules for fairness. If the AI is unavailable, the rules engine keeps every agent working.' },
  { q: 'Is candidate data safe?', a: 'Candidate data stays in your workspace; other companies never see it. When a CV is scored, the AI is told to ignore names, photos and personal details and to judge only skills and experience. Every action is logged.' },
  { q: 'Can I cancel Pro?', a: 'Yes. Pro is paid month by month. If you stop paying, the workspace goes back to the Free plan and nothing is deleted.' },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="border-t border-border bg-surface/50 py-16 sm:py-24">
      <div className="container-page max-w-3xl">
        <p className="eyebrow text-center">Questions</p>
        <h2 className="display-title mt-2 text-center text-3xl text-foreground">Good to know</h2>
        <div className="mt-8 space-y-2">
          {FAQ.map((item, i) => (
            <div key={item.q} className="overflow-hidden rounded-2xl border border-border bg-surface-elevated">
              <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-3 p-4 text-left font-semibold text-foreground">
                {item.q}
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open === i && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {open === i ? (
                  <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-4 text-sm leading-relaxed text-muted">
                    {item.a}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="container-page py-16 sm:py-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0f766e] to-[#04140f] p-8 text-center text-white sm:p-14">
        <div aria-hidden className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl" />
        <Clock3 className="relative mx-auto h-8 w-8 text-emerald-200" />
        <h2 className="relative mx-auto mt-4 max-w-2xl font-display text-3xl sm:text-4xl">Let Dealo’s team put the agents to work for you.</h2>
        <p className="relative mx-auto mt-3 max-w-xl text-white/75">Request talent and our recruiters use these agents behind the scenes. You get a checked shortlist.</p>
        <div className="relative mt-8 flex flex-col justify-center gap-3 min-[400px]:flex-row">
          <PrimaryCta className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#04140f] transition hover:bg-emerald-50">
            <Bot className="h-4 w-4" /> Request talent
          </PrimaryCta>
          <button type="button" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            <MessagesSquare className="h-4 w-4" /> See how agents work
          </button>
        </div>
        <p className="relative mt-6 inline-flex items-center gap-1.5 text-xs text-white/60">
          <ShieldCheck className="h-3.5 w-3.5" /> A person at Dealo approves every step
        </p>
      </div>
    </section>
  );
}
