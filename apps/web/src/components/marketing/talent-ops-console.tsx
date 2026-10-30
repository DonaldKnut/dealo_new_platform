'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Clock,
  Code2,
  Compass,
  FileCheck,
  Layers,
  Sparkles,
  Star,
  Users2,
} from 'lucide-react';
import { useState } from 'react';

import { useModal } from '@/components/modals/modal-context';

type CategoryKey = 'engineering' | 'product' | 'finance';

interface Candidate {
  id: string;
  name: string;
  title: string;
  avatarText: string;
  avatarGradient: string;
  experience: string;
  rating: number;
  matchScore: number;
  tags: string[];
  availability: string;
  vettingHighlight: string;
}

const CANDIDATES_BY_CAT: Record<CategoryKey, Candidate[]> = {
  engineering: [
    {
      id: 'c1',
      name: 'Oluwaseun A.',
      title: 'Senior Full-Stack Engineer',
      avatarText: 'OA',
      avatarGradient: 'from-teal-500 to-emerald-600',
      experience: '7+ yrs exp',
      rating: 4.98,
      matchScore: 99,
      tags: ['Next.js', 'Go', 'PostgreSQL', 'AWS'],
      availability: 'Ready in 48 hrs',
      vettingHighlight: 'Top 1% technical assessment & code architecture review passed',
    },
    {
      id: 'c2',
      name: 'Ibrahim D.',
      title: 'Staff DevOps & Cloud Architect',
      avatarText: 'ID',
      avatarGradient: 'from-cyan-500 to-blue-600',
      experience: '8+ yrs exp',
      rating: 4.95,
      matchScore: 97,
      tags: ['Kubernetes', 'Terraform', 'CI/CD', 'Docker'],
      availability: 'Immediate',
      vettingHighlight: 'Production reliability & security audit verified',
    },
  ],
  product: [
    {
      id: 'c3',
      name: 'Chioma N.',
      title: 'Lead Product Designer',
      avatarText: 'CN',
      avatarGradient: 'from-amber-500 to-teal-600',
      experience: '6+ yrs exp',
      rating: 4.96,
      matchScore: 98,
      tags: ['Design Systems', 'Figma', 'User Research', 'Fintech UX'],
      availability: 'Available now',
      vettingHighlight: 'Portfolio reviewed by senior African design leaders',
    },
    {
      id: 'c4',
      name: 'Emeka K.',
      title: 'Principal Product Manager',
      avatarText: 'EK',
      avatarGradient: 'from-purple-500 to-teal-600',
      experience: '7+ yrs exp',
      rating: 4.92,
      matchScore: 96,
      tags: ['Product Strategy', 'Growth', 'Roadmapping', 'Agile'],
      availability: 'Ready in 5 days',
      vettingHighlight: 'Proven track record scaling B2B SaaS to 500k+ users',
    },
  ],
  finance: [
    {
      id: 'c5',
      name: 'Folake O.',
      title: 'Financial Controller & Analyst',
      avatarText: 'FO',
      avatarGradient: 'from-emerald-500 to-teal-700',
      experience: '8+ yrs exp',
      rating: 4.99,
      matchScore: 99,
      tags: ['ACCA Certified', 'Financial Modeling', 'Audit', 'ERP'],
      availability: 'Ready in 48 hrs',
      vettingHighlight: 'IFRS compliance & audit verification cleared',
    },
  ],
};

const TABS: Array<{ key: CategoryKey; label: string; short: string; icon: typeof Code2 }> = [
  { key: 'engineering', label: 'Engineering', short: 'Eng', icon: Code2 },
  { key: 'product', label: 'Product & Design', short: 'Product', icon: Compass },
  { key: 'finance', label: 'Finance & Ops', short: 'Finance', icon: Briefcase },
];

export function TalentOpsConsole() {
  const { open } = useModal();
  const [activeTab, setActiveTab] = useState<CategoryKey>('engineering');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('c1');

  const candidates = CANDIDATES_BY_CAT[activeTab];
  const activeCandidate = candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

  return (
    <div className="relative mx-auto w-full max-w-xl min-w-0 lg:max-w-none">
      <div className="pointer-events-none absolute -inset-1 rounded-[1.75rem] bg-gradient-to-tr from-brand/25 via-accent/20 to-emerald-400/10 opacity-60 blur-2xl min-[340px]:-inset-2 min-[340px]:rounded-[2.5rem]" />

      <div className="relative overflow-hidden rounded-[1.25rem] border border-border/80 bg-surface-elevated/95 shadow-2xl backdrop-blur-xl min-[340px]:rounded-[2rem]">
        <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-surface/50 px-3 py-2.5 min-[340px]:px-5 min-[340px]:py-3.5">
          <div className="flex min-w-0 items-center gap-1.5 min-[340px]:gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400/80 min-[340px]:h-3 min-[340px]:w-3" />
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400/80 min-[340px]:h-3 min-[340px]:w-3" />
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400/80 min-[340px]:h-3 min-[340px]:w-3" />
            <span className="ml-1 truncate font-mono text-[10px] font-semibold tracking-wider text-muted uppercase min-[340px]:ml-2 min-[340px]:text-xs">
              Dealo Talent Engine
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-full w-full rounded-full bg-emerald-500" />
            </span>
            <span className="hidden text-[10px] font-medium text-emerald-600 min-[280px]:inline dark:text-emerald-400 min-[340px]:text-xs">
              Matching Active
            </span>
          </div>
        </div>

        <div className="-mx-px flex items-center gap-1 overflow-x-auto border-b border-border/60 bg-surface/30 p-1.5 scrollbar-none min-[340px]:gap-1.5 min-[340px]:p-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setSelectedCandidateId(CANDIDATES_BY_CAT[tab.key][0].id);
                }}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold transition min-[340px]:gap-1.5 min-[340px]:rounded-xl min-[340px]:px-3 min-[340px]:text-xs sm:text-sm ${
                  selected
                    ? 'bg-brand text-white shadow-sm dark:text-[#071f14]'
                    : 'text-muted hover:bg-surface hover:text-foreground'
                }`}
              >
                <Icon className="h-3 w-3 min-[340px]:h-3.5 min-[340px]:w-3.5" />
                <span className="min-[360px]:hidden">{tab.short}</span>
                <span className="hidden min-[360px]:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3 p-3 min-[340px]:space-y-4 min-[340px]:p-4 sm:p-6">
          <div className="grid gap-2 min-[340px]:gap-2.5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-2 min-[340px]:space-y-2.5"
              >
                {candidates.map((cand) => {
                  const isSelected = cand.id === activeCandidate.id;
                  return (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => setSelectedCandidateId(cand.id)}
                      className={`group relative w-full cursor-pointer rounded-xl border p-2.5 text-left transition-all duration-200 min-[340px]:rounded-2xl min-[340px]:p-3.5 sm:p-4 ${
                        isSelected
                          ? 'border-brand bg-brand/5 shadow-sm dark:bg-brand/10'
                          : 'border-border/70 bg-surface/40 hover:border-brand/40 hover:bg-surface/80'
                      }`}
                    >
                      <div className="flex flex-col gap-2.5 min-[300px]:flex-row min-[300px]:items-start min-[300px]:justify-between">
                        <div className="flex min-w-0 items-center gap-2.5 min-[340px]:gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-bold text-white shadow-sm min-[340px]:h-11 min-[340px]:w-11 ${cand.avatarGradient}`}
                          >
                            {cand.avatarText}
                          </div>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-1">
                              <h4 className="truncate text-sm font-semibold text-foreground sm:text-base">
                                {cand.name}
                              </h4>
                              <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-brand/20 text-brand min-[340px]:h-4 min-[340px]:w-4" />
                            </div>
                            <p className="truncate text-[11px] font-medium text-muted min-[340px]:text-xs">
                              {cand.title}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2 min-[300px]:flex-col min-[300px]:items-end">
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 min-[340px]:px-2.5 min-[340px]:text-xs">
                            <Sparkles className="h-3 w-3" />
                            {cand.matchScore}% Match
                          </span>
                          <p className="flex items-center gap-1 text-[10px] text-muted min-[340px]:text-[11px]">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {cand.rating} · {cand.experience}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-1 min-[340px]:mt-3 min-[340px]:gap-1.5">
                        {cand.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md border border-border/80 bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-foreground min-[340px]:rounded-lg min-[340px]:px-2 min-[340px]:text-[11px]"
                          >
                            {tag}
                          </span>
                        ))}
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-brand min-[340px]:ml-auto min-[340px]:text-[11px]">
                          <Clock className="h-3 w-3" />
                          {cand.availability}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="rounded-xl border border-brand/30 bg-surface/90 p-3 min-[340px]:rounded-2xl min-[340px]:p-4">
            <div className="flex flex-col gap-1 text-[11px] min-[300px]:flex-row min-[300px]:items-center min-[300px]:justify-between min-[340px]:text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <FileCheck className="h-3.5 w-3.5 text-brand min-[340px]:h-4 min-[340px]:w-4" />
                Vetting Summary
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-brand uppercase min-[340px]:text-[11px]">
                100% Background Cleared
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted min-[340px]:text-xs">
              {activeCandidate.vettingHighlight}
            </p>
            <div className="mt-3 border-t border-border/60 pt-2.5 min-[340px]:mt-3.5 min-[340px]:pt-2">
              <button
                type="button"
                onClick={() => open('hire')}
                className="btn-primary w-full py-2 text-xs shadow-sm"
              >
                Request candidate shortlist
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border/70 bg-surface/70 px-3 py-2 text-[10px] text-muted min-[300px]:flex-row min-[300px]:items-center min-[300px]:justify-between min-[340px]:px-4 min-[340px]:py-2.5 min-[340px]:text-[11px]">
          <span className="flex min-w-0 items-center gap-1.5">
            <Users2 className="h-3.5 w-3.5 shrink-0 text-brand" />
            <span className="truncate">1,420+ Screened Nigerian Specialists</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>48h SLA</span>
          </span>
        </div>
      </div>

      <motion.div
        className="animate-float pointer-events-none absolute -top-6 -right-4 hidden items-center gap-2.5 rounded-2xl border border-border/90 bg-surface-elevated/95 p-3 shadow-xl backdrop-blur-md sm:flex"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs font-semibold text-foreground">98.4% Retention</p>
          <p className="text-[10px] text-muted">Post-placement guarantee</p>
        </div>
      </motion.div>

      <motion.div
        className="animate-float-delayed pointer-events-none absolute -bottom-5 -left-4 hidden items-center gap-2.5 rounded-2xl border border-border/90 bg-surface-elevated/95 p-3 shadow-xl backdrop-blur-md sm:flex"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, duration: 0.6 }}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Layers className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs font-semibold text-foreground">Fast Turnaround</p>
          <p className="text-[10px] text-muted">Average shortlist in 36 hrs</p>
        </div>
      </motion.div>
    </div>
  );
}
