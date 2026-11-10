'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Award,
  BarChart3,
  Bot,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Globe2,
  Kanban,
  Lock,
  MapPin,
  MessagesSquare,
  Pause,
  Play,
  PlugZap,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AtsHowItWorks } from '@/components/marketing/ats-how-it-works';
import { AtsIntegrations } from '@/components/marketing/ats-integrations';
import { AtsPricingTeaser } from '@/components/marketing/ats-pricing-teaser';
import { AtsSocialProof } from '@/components/marketing/ats-social-proof';
import { AtsStatsStrip } from '@/components/marketing/ats-stats-strip';
import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { PageHero } from '@/components/marketing/page-hero';
import { useModal } from '@/components/modals/modal-context';
import { fetchAuthMe } from '@/lib/dashboard-api';

const STAGES = [
  {
    id: 'Applied',
    label: 'Applied',
    badge: '4',
    dotColor: 'bg-sky-500',
    lightBg: 'bg-sky-50 dark:bg-sky-950/40',
    textColor: 'text-sky-700 dark:text-sky-300',
    borderColor: 'border-sky-500/20',
  },
  {
    id: 'AI screened',
    label: 'AI Screened',
    badge: '3',
    dotColor: 'bg-emerald-500',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-500/20',
  },
  {
    id: 'Interview',
    label: 'Interview',
    badge: '2',
    dotColor: 'bg-violet-500',
    lightBg: 'bg-violet-50 dark:bg-violet-950/40',
    textColor: 'text-violet-700 dark:text-violet-300',
    borderColor: 'border-violet-500/20',
  },
  {
    id: 'Offer',
    label: 'Offer',
    badge: '1',
    dotColor: 'bg-amber-500',
    lightBg: 'bg-amber-50 dark:bg-amber-950/40',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-500/20',
  },
] as const;

type StageId = (typeof STAGES)[number]['id'];

interface Candidate {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  role: string;
  experience: string;
  score: number;
  location: string;
  tags: string[];
  stageMeta: Record<
    StageId,
    {
      action: string;
      sub: string;
    }
  >;
}

const CANDIDATES: Candidate[] = [
  {
    id: 'c1',
    name: 'Amaka O.',
    initials: 'AO',
    avatarBg: 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white',
    role: 'Senior Accountant',
    experience: '6 yrs exp',
    score: 92,
    location: 'Ikeja, Lagos',
    tags: ['ICAN Certified', 'QuickBooks', 'Audit'],
    stageMeta: {
      Applied: { action: 'Applied 1h ago', sub: 'Resume attached' },
      'AI screened': { action: '92% Match · Must-haves met', sub: 'Automated CV analysis' },
      Interview: { action: 'Partner Round · Tomorrow 11am', sub: 'Calendar booked' },
      Offer: { action: 'Offer Sent · ₦550k/mo', sub: 'Awaiting signature' },
    },
  },
  {
    id: 'c2',
    name: 'Tunde B.',
    initials: 'TB',
    avatarBg: 'bg-gradient-to-br from-blue-600 to-indigo-800 text-white',
    role: 'Financial Analyst',
    experience: '4 yrs exp',
    score: 88,
    location: 'Lekki, Lagos',
    tags: ['Financial Modeling', 'Excel Expert'],
    stageMeta: {
      Applied: { action: 'Applied 3h ago', sub: 'Direct submission' },
      'AI screened': { action: '88% Match · Strong skills', sub: 'Verified credentials' },
      Interview: { action: 'Technical Assessment', sub: 'Passed 94%' },
      Offer: { action: 'Background check cleared', sub: 'Ref verified' },
    },
  },
  {
    id: 'c3',
    name: 'Zainab M.',
    initials: 'ZM',
    avatarBg: 'bg-gradient-to-br from-purple-600 to-violet-800 text-white',
    role: 'Finance & HR Officer',
    experience: '5 yrs exp',
    score: 85,
    location: 'Yaba, Lagos',
    tags: ['Payroll Mgmt', 'Tax Compliance'],
    stageMeta: {
      Applied: { action: 'Applied 5h ago', sub: 'Via careers page' },
      'AI screened': { action: '85% Match · Verified CV', sub: 'Screening passed' },
      Interview: { action: 'HR & Cultural Screen', sub: 'Completed' },
      Offer: { action: 'Compensation approved', sub: 'Preparing package' },
    },
  },
  {
    id: 'c4',
    name: 'Musa A.',
    initials: 'MA',
    avatarBg: 'bg-gradient-to-br from-amber-600 to-orange-800 text-white',
    role: 'Billing Specialist',
    experience: '3 yrs exp',
    score: 81,
    location: 'Surulere, Lagos',
    tags: ['Invoicing', 'Reconciliation'],
    stageMeta: {
      Applied: { action: 'Applied yesterday', sub: 'Referral candidate' },
      'AI screened': { action: '81% Match · Core fit', sub: 'Relevant track' },
      Interview: { action: 'Screening Scheduled', sub: 'Next Monday' },
      Offer: { action: 'Offer letter drafted', sub: 'HR review' },
    },
  },
];

/** World-class animated interactive ATS pipeline demo */
function PipelineDemo() {
  const reduceMotion = useReducedMotion();
  const [tick, setTick] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (reduceMotion || isPaused) return;
    const timer = window.setInterval(() => setTick((v) => v + 1), 5000);
    return () => window.clearInterval(timer);
  }, [reduceMotion, isPaused]);

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-gradient-to-b from-surface-elevated via-surface-elevated/95 to-surface p-3 min-[360px]:p-5 sm:p-6 shadow-xl shadow-black/5 dark:shadow-black/25">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/10 blur-3xl dark:bg-brand/5" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-400/5" />

      {/* Top Workspace Header Bar */}
      <div className="relative mb-5 flex flex-col gap-3 border-b border-border/70 pb-4 min-[560px]:flex-row min-[560px]:items-center min-[560px]:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20 dark:bg-brand-soft/20">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-bold text-foreground sm:text-lg">
                Finance Officer
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Live Role
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <MapPin className="h-3 w-3 text-slate-400" />
              Lagos, Nigeria · Full-time · ₦450k – ₦600k/mo
            </p>
          </div>
        </div>

        {/* Right Header Status / Playback Pill */}
        <div className="flex items-center gap-2 self-start min-[560px]:self-center">
          <span className="hidden items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-border sm:inline-flex">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            AI Auto-Screen Active
          </span>

          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-2.5 py-1 text-xs font-semibold text-foreground shadow-xs transition hover:bg-surface"
            title={isPaused ? 'Resume live animation' : 'Pause animation to inspect cards'}
          >
            {isPaused ? (
              <>
                <Play className="h-3 w-3 text-brand" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="h-3 w-3 text-muted" />
                <span>Pause</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Kanban Stages Grid */}
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {STAGES.map((stage, columnIndex) => {
          const currentCandidate = CANDIDATES[(columnIndex + tick) % CANDIDATES.length];
          const meta = currentCandidate.stageMeta[stage.id];

          return (
            <div
              key={stage.id}
              className="flex min-h-[17.5rem] flex-col rounded-2xl border border-border/80 bg-surface/40 p-2.5 sm:p-3 transition-colors dark:bg-surface/20"
            >
              {/* Column Header */}
              <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${stage.dotColor}`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {stage.label}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${stage.lightBg} ${stage.textColor} ring-1 ${stage.borderColor}`}
                >
                  {stage.badge}
                </span>
              </div>

              {/* Column Content: Active Animated Candidate Card */}
              <div className="flex-1 space-y-2.5">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={currentCandidate.id}
                    layoutId={`ats-card-${currentCandidate.id}`}
                    initial={{ opacity: 0, y: 14, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -14, scale: 0.96 }}
                    transition={{
                      type: 'spring',
                      stiffness: 180,
                      damping: 30,
                    }}
                    className="group relative rounded-xl border border-border/90 bg-surface-elevated p-3 shadow-xs transition hover:border-brand/40 hover:shadow-md dark:bg-surface-elevated"
                  >
                    {/* Card Top: Avatar, Name & Location */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-xs ${currentCandidate.avatarBg}`}
                        >
                          {currentCandidate.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-foreground sm:text-sm">
                            {currentCandidate.name}
                          </p>
                          <p className="truncate text-[11px] font-medium text-muted">
                            {currentCandidate.role}
                          </p>
                        </div>
                      </div>

                      {/* Verified Badge */}
                      <span className="shrink-0 text-emerald-500" title="Identity & CV Verified">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    {/* AI Screening / Match Score Badge */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                            currentCandidate.score >= 90
                              ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300'
                              : 'bg-brand/10 text-brand ring-1 ring-brand/20'
                          }`}
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          {currentCandidate.score}% fit
                        </span>
                        <span className="text-[10px] text-muted">
                          {currentCandidate.experience}
                        </span>
                      </div>

                      <span className="truncate text-[9.5px] font-medium text-slate-400">
                        {currentCandidate.location}
                      </span>
                    </div>

                    {/* Stage Status Callout */}
                    <div className="mt-2 rounded-lg bg-surface/90 p-2 text-[10.5px] font-medium text-foreground ring-1 ring-border/60">
                      <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                        {meta.action}
                      </p>
                      <p className="truncate text-[9.5px] text-muted">{meta.sub}</p>
                    </div>

                    {/* Candidate Tags */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {currentCandidate.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-surface px-1.5 py-0.5 text-[8.5px] font-medium text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Subtle Ghost Applicant to show realistic depth in the column */}
                <div className="rounded-xl border border-dashed border-border/60 bg-surface/30 p-2 text-center text-[10px] font-medium text-muted/70 transition hover:bg-surface/50">
                  + {parseInt(stage.badge, 10) - 1} more in {stage.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AtsPage() {
  const { open } = useModal();
  const router = useRouter();
  const startFree = async () => {
    try {
      await fetchAuthMe();
      router.push('/dashboard/ats');
    } catch {
      router.push('/auth/register?next=/dashboard/ats');
    }
  };

  return (
    <div>
      <PageHero
        eyebrow="Dealo ATS · Free early access"
        title="Hiring software with AI built in"
        description="Post a job, see every candidate on one board, and let AI do the first screen. A person on your team always makes the final call. We built it for our own recruiters first."
        actions={
          <>
            <button type="button" className="btn-primary" onClick={() => void startFree()}>
              Start free
            </button>
            <a href="#how" className="btn-secondary">
              See how it works
            </a>
          </>
        }
      />

      <section className="container-page pb-6">
        <PipelineDemo />
      </section>

      {/* Stats KPI strip */}
      <AtsStatsStrip />

      <div id="how" className="scroll-mt-24">
        <FeatureAdGrid
          eyebrow="What you get"
          title="Everything you need to hire, in one place"
          description="Simple tools that save your team hours every week."
          items={[
            { icon: Globe2, title: 'Job posts and careers page', body: 'Post a job once. Share one link. Collect every application in one place.' },
            { icon: Kanban, title: 'One board for every candidate', body: 'Drag people from Applied to Hired. Everyone on your team sees the same view.' },
            { icon: Bot, title: 'AI first screen', body: 'AI reads every CV and scores it against your must-haves. You see why it gave each score.' },
            { icon: CalendarClock, title: 'Easy interview booking', body: 'Candidates pick a free slot. Reminders go out on their own.' },
            { icon: UsersRound, title: 'Team notes and scorecards', body: 'Everyone rates the same way, so decisions are fair and quick.' },
            { icon: FileText, title: 'Offers and documents', body: 'Send offers and collect signed papers without email ping-pong.' },
            { icon: BarChart3, title: 'Simple reports', body: 'See time to hire, where good people come from, and where things get stuck.' },
            { icon: PlugZap, title: 'Connects to your tools', body: 'Use our API and webhooks to link payroll, HR and chat tools.' },
            { icon: MessagesSquare, title: 'Ask Dealo for help', body: 'Stuck on a hard role? Our recruiters can step in from the same board.' },
          ]}
        />
      </div>

      {/* How it works — 5-step interactive flow */}
      <AtsHowItWorks onStart={() => void startFree()} />

      {/* Social proof testimonials */}
      <AtsSocialProof onStart={() => void startFree()} />

      <section id="trust" className="container-page scroll-mt-24 py-10 min-[340px]:py-14">
        <div className="rounded-[1.5rem] border border-border bg-surface-elevated/80 p-4 min-[340px]:p-8">
          <p className="eyebrow">How we use AI</p>
          <h2 className="display-title mt-2 text-[1.45rem] text-foreground min-[340px]:text-3xl">
            AI helps. People decide.
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              {
                icon: UserCheck,
                title: 'A person signs off',
                body: 'AI never rejects or hires anyone on its own. A person on your team approves each step.',
              },
              {
                icon: ShieldCheck,
                title: 'Clear reasons',
                body: 'Every AI score comes with plain reasons, so you can check it and disagree.',
              },
              {
                icon: Lock,
                title: 'Your data stays yours',
                body: 'Candidate data is private to your company and is never used to train public AI models.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-border bg-surface p-4">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-col gap-2 min-[400px]:flex-row">
            <button type="button" className="btn-primary" onClick={() => void startFree()}>
              Start free
            </button>
            <button type="button" className="btn-secondary" onClick={() => open('contact')}>
              Talk to us
            </button>
            <p className="self-center text-xs text-muted">
              Free during early access: up to 10 open jobs and 10 team members. Paid plans come later.
            </p>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <AtsIntegrations onStart={() => void startFree()} />

      {/* Pricing teaser */}
      <AtsPricingTeaser onStart={() => void startFree()} onContact={() => open('contact')} />

      <CtaBanner />
    </div>
  );
}
