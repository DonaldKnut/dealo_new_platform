'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, CircleDashed, Loader2, ScanSearch, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  aiScreen,
  aiVerify,
  fetchDashboardRequests,
  type AiScreen,
  type AiVerify,
  type DashboardRequest,
} from '@/lib/dashboard-api';
import { cn } from '@/lib/utils';

import { AiReviewBar } from './ai-review-bar';

const FIT_STYLE = {
  STRONG: 'text-emerald-600 dark:text-emerald-300',
  POSSIBLE: 'text-amber-600 dark:text-amber-300',
  WEAK: 'text-red-600 dark:text-red-300',
} as const;

export function CandidateAiPanel({ candidateId }: { candidateId: string }) {
  const toast = useToast();
  const [tab, setTab] = useState<'screen' | 'verify'>('screen');
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [hireInquiryId, setHireInquiryId] = useState('');
  const [requirements, setRequirements] = useState('');
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<AiScreen | null>(null);
  const [verify, setVerify] = useState<AiVerify | null>(null);

  useEffect(() => {
    fetchDashboardRequests()
      .then((rows) => setRequests(rows.filter((row) => row.status !== 'CLOSED').slice(0, 50)))
      .catch(() => undefined);
  }, []);

  const run = async () => {
    setBusy(true);
    try {
      if (tab === 'screen') {
        if (!hireInquiryId && requirements.trim().length < 8) {
          toast.error('Pick a hiring request or describe the job');
          return;
        }
        setScreen(
          await aiScreen({
            candidateId,
            hireInquiryId: hireInquiryId || undefined,
            requirements: requirements.trim() || undefined,
          }),
        );
      } else {
        setVerify(await aiVerify(candidateId));
      }
    } catch (error) {
      toast.error('AI agent failed', error instanceof ApiError ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-brand/30 bg-brand-soft/20 p-3 min-[340px]:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-brand" /> AI agents
        </p>
        <div className="flex gap-1 rounded-full border border-border bg-surface-elevated p-0.5">
          {(['screen', 'verify'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                'relative rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                tab === value ? 'text-white dark:text-[#071f14]' : 'text-muted',
              )}
            >
              {tab === value ? (
                <motion.span layoutId="cand-ai-tab" className="absolute inset-0 rounded-full bg-brand" />
              ) : null}
              <span className="relative z-10 inline-flex items-center gap-1">
                {value === 'screen' ? <ScanSearch className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                {value === 'screen' ? 'Screen' : 'Verify'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {tab === 'screen' ? (
        <div className="mt-3 grid gap-2">
          <select className="input-field py-2 text-sm" value={hireInquiryId} onChange={(e) => setHireInquiryId(e.target.value)}>
            <option value="">Compare with a hiring request…</option>
            {requests.map((request) => (
              <option key={request.id} value={request.id}>
                {request.roleTitle} · {request.companyName} · {request.location}
              </option>
            ))}
          </select>
          <textarea
            rows={2}
            className="input-field resize-y py-2 text-sm"
            placeholder="Or describe the job: must-have skills, location, experience"
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
          />
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">Checks documents and details, and lists what a person still needs to confirm.</p>
      )}

      <button type="button" className="btn-primary mt-3 w-full py-2 text-sm" disabled={busy} onClick={() => void run()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? 'Working…' : tab === 'screen' ? 'Run screening agent' : 'Run verification agent'}
      </button>

      <AnimatePresence mode="wait">
        {tab === 'screen' && screen ? (
          <motion.div
            key={screen.runId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 space-y-3 rounded-xl border border-border bg-surface-elevated p-3"
          >
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0">
                <svg viewBox="0 0 40 40" className="h-14 w-14 -rotate-90">
                  <circle cx="20" cy="20" r="16" className="fill-none stroke-border" strokeWidth="4" />
                  <motion.circle
                    cx="20"
                    cy="20"
                    r="16"
                    className="fill-none stroke-brand"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={100.5}
                    initial={{ strokeDashoffset: 100.5 }}
                    animate={{ strokeDashoffset: 100.5 * (1 - screen.score / 100) }}
                    transition={{ duration: 0.8 }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                  {screen.score}
                </span>
              </div>
              <div className="min-w-0">
                <p className={cn('text-sm font-bold', FIT_STYLE[screen.fit])}>
                  {screen.fit === 'STRONG' ? 'Strong match' : screen.fit === 'POSSIBLE' ? 'Possible match' : 'Weak match'}
                </p>
                <p className="text-xs text-muted">{screen.summary}</p>
              </div>
            </div>
            {screen.strengths.length ? (
              <ul className="space-y-1 text-xs">
                {screen.strengths.map((item) => (
                  <li key={item} className="flex gap-1.5 text-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {item}
                  </li>
                ))}
              </ul>
            ) : null}
            {screen.gaps.length ? (
              <ul className="space-y-1 text-xs">
                {screen.gaps.map((item) => (
                  <li key={item} className="flex gap-1.5 text-foreground">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" /> {item}
                  </li>
                ))}
              </ul>
            ) : null}
            {screen.interviewQuestions.length ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Ask in the interview</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-foreground">
                  {screen.interviewQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ol>
              </div>
            ) : null}
            <AiReviewBar runId={screen.runId} provider={screen.provider} />
          </motion.div>
        ) : null}

        {tab === 'verify' && verify ? (
          <motion.div
            key={verify.runId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 space-y-2 rounded-xl border border-border bg-surface-elevated p-3"
          >
            <p className={cn('text-sm font-semibold', verify.readyForShortlist ? 'text-brand' : 'text-amber-600')}>
              {verify.summary}
            </p>
            <ul className="space-y-1.5">
              {verify.checks.map((check) => (
                <li key={check.label} className="flex items-start gap-2 text-xs">
                  {check.status === 'ok' ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  ) : check.status === 'warn' ? (
                    <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                  )}
                  <span className="min-w-0">
                    <span className="font-semibold text-foreground">{check.label}</span>
                    <span className="text-muted"> · {check.note}</span>
                  </span>
                </li>
              ))}
            </ul>
            <AiReviewBar runId={verify.runId} provider={verify.provider} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
