'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

type TipStep =
  | 'details'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'more'
  | 'design'
  | 'tailor'
  | 'letter';

const TIPS: Record<TipStep, string[]> = {
  details: [
    'Recruiters often open CVs on phones — put your name, city, phone and email in the top third so nothing gets cut off.',
    'Use one professional email (yourname@…) and a Nigerian number with country code if you apply abroad (+234…).',
    'Skip full home address on a first CV; city + state (e.g. Lagos, Lagos State) is enough for most office and trade roles.',
  ],
  summary: [
    'A strong profile is 2–4 lines: role you want + years + strongest proof (metric, licence, or stack) — not a life story.',
    'Mirror words from the job advert (e.g. “accounts payable”, “site supervisor”) so human and ATS screens both catch you.',
    'Lead with impact: “Bookkeeper who closed month-end in 5 days for a 40-person firm” beats “Hardworking and detail-oriented”.',
  ],
  experience: [
    'Start every bullet with a strong verb (Led, Built, Reduced, Trained) and add a number whenever you can.',
    'Nigerian employers scan for tools and outcomes: Excel, QuickBooks, AutoCAD, POS, HSE — name them next to results.',
    'Most recent job first. 3–6 bullets per role is ideal; cut duties that every applicant would list.',
  ],
  education: [
    'List the highest relevant qualification first. Short courses and trade certificates belong here if they match the job.',
    'If you are a recent graduate, education can sit above experience — otherwise keep jobs first.',
    'Add the year and school; leave grades off unless they are clearly strong or the advert asks.',
  ],
  skills: [
    'Group skills the way hiring managers think: software, trade skills, languages, soft strengths — not one endless comma list.',
    'Put the 6–10 skills that match the advert first; bury generic ones like “Microsoft Word” unless the job stresses them.',
    'Licences and certifications (COREN, ICAN student, driving for site roles, HSE) often decide shortlists — spell them clearly.',
  ],
  more: [
    'Projects beat empty space: one line on a real delivery (client, tool, result) can replace a thin job history.',
    'Languages help for customer and remote roles — note spoken level (fluent / working / basic).',
    'Only add references if asked, or write “Available on request” to save space for proof of work.',
  ],
  design: [
    'Clean templates win: one column, clear section titles, and enough white space beat heavy graphics in most ATS systems.',
    'Stick to one accent colour and a readable font size (10.5–12pt body). Fancy fonts can break when exported to PDF.',
    'Keep to 1 page early career, 2 pages max for senior or multi-trade histories — recruiters rarely read page 3.',
  ],
  tailor: [
    'Paste the job advert and reuse its exact role title and must-have skills in your summary and top bullets.',
    'Reorder experience bullets so the strongest match for this job sits first — same CV, different emphasis.',
    'If you lack one requirement, show a close substitute (related tool, course, or project) instead of leaving a gap silent.',
  ],
  letter: [
    'Open with the role and one proof point; close with availability and a clear ask for a call or interview.',
    'Name the company and mirror 1–2 phrases from their advert so it does not feel copy-pasted.',
    'Keep cover letters under half a page — busy hiring managers skim in under a minute.',
  ],
};

export function CvDidYouKnow({ step, className }: { step: TipStep; className?: string }) {
  const pool = TIPS[step] ?? TIPS.details;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(Math.floor(Math.random() * pool.length));
  }, [step, pool.length]);

  useEffect(() => {
    if (pool.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % pool.length);
    }, 12_000);
    return () => window.clearInterval(id);
  }, [pool.length, step]);

  const tip = pool[index] ?? pool[0]!;

  return (
    <aside
      className={cn(
        'mb-4 overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/10 via-surface-elevated to-emerald-400/5 p-3.5 shadow-sm',
        className,
      )}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand shadow-sm">
          <Lightbulb className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">Did you know</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={`${step}-${index}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
              className="mt-1 text-xs leading-relaxed text-foreground"
            >
              {tip}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
