'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  BarChart3,
  Bot,
  CalendarClock,
  FileText,
  Globe2,
  Kanban,
  Lock,
  MessagesSquare,
  PlugZap,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { PageHero } from '@/components/marketing/page-hero';
import { useModal } from '@/components/modals/modal-context';
import { fetchAuthMe } from '@/lib/dashboard-api';

const COLUMNS = ['Applied', 'AI screened', 'Interview', 'Offer'] as const;

const CANDIDATES = [
  { name: 'Amaka O.', role: 'Accountant', score: 92 },
  { name: 'Tunde B.', role: 'Electrician', score: 88 },
  { name: 'Zainab M.', role: 'HR Officer', score: 85 },
  { name: 'Musa A.', role: 'Welder', score: 81 },
];

/** Small animated board: cards move one column to the right on a loop. */
function PipelineDemo() {
  const reduceMotion = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 1800);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <div className="glass-card overflow-hidden rounded-[1.5rem] p-2.5 min-[340px]:p-4">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Kanban className="h-4 w-4 text-brand" />
          Finance Officer · Lagos
        </p>
        <span className="hidden rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand min-[300px]:inline">
          Live
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {COLUMNS.map((column, columnIndex) => (
          <div key={column} className="min-h-[7.5rem] rounded-xl border border-border bg-surface/70 p-1.5 min-[340px]:p-2">
            <p className="mb-1.5 truncate px-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{column}</p>
            <div className="space-y-1.5">
              {CANDIDATES.filter((_, index) => (index + tick) % COLUMNS.length === columnIndex).map((candidate) => (
                <motion.div
                  key={candidate.name}
                  layoutId={`ats-${candidate.name}`}
                  transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                  className="rounded-lg border border-border bg-surface-elevated p-1.5 shadow-sm min-[340px]:p-2"
                >
                  <p className="truncate text-[11px] font-semibold text-foreground min-[340px]:text-xs">{candidate.name}</p>
                  <p className="truncate text-[10px] text-muted">{candidate.role}</p>
                  {columnIndex >= 1 ? (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-soft px-1.5 text-[9px] font-semibold text-brand">
                      <Sparkles className="h-2.5 w-2.5" />
                      {candidate.score}% fit
                    </p>
                  ) : null}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
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

      <CtaBanner />
    </div>
  );
}
