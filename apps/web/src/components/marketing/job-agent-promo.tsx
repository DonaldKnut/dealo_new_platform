'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Bell, Bot, CheckCircle2, Radar, ShieldCheck, Sparkles, Target, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useLocale } from '@/components/i18n/locale-context';
import { cn } from '@/lib/utils';

const FEED = [
  { title: 'Sales Executive', company: 'Leadway Assurance', place: 'Lagos', score: 92 },
  { title: 'Customer Success Lead', company: 'Fintech NG', place: 'Remote', score: 88 },
  { title: 'Accountant', company: 'Dangote Industries', place: 'Ikeja', score: 84 },
  { title: 'HR Officer', company: 'Hoop Telecoms', place: 'Abuja', score: 81 },
] as const;

type Phase = 'scan' | 'match' | 'done';

/** Homepage and /job-agent hero: what the Job Agent does, shown as a live feed. */
export function JobAgentPromo({ as = 'section' }: { as?: 'section' | 'hero' }) {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => setTick((v) => v + 1), 2200);
    return () => window.clearInterval(timer);
  }, [reduce]);

  // Each row moves scan → match → applied/ready, one row at a time.
  const phaseOf = (index: number): Phase => {
    const step = tick % (FEED.length * 2 + 2);
    if (step >= index * 2 + 2) return 'done';
    if (step >= index * 2 + 1) return 'match';
    return 'scan';
  };
  const showAlert = tick % (FEED.length * 2 + 2) >= FEED.length * 2;
  const Heading = as === 'hero' ? 'h1' : 'h2';

  return (
    <section className={cn('relative overflow-hidden', as === 'hero' ? 'pb-14 pt-24 min-[340px]:pt-28 sm:pb-20 sm:pt-32' : 'py-14 sm:py-20')} id="job-agent">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#05170e] p-4 text-white shadow-[0_40px_120px_-40px_rgba(4,47,46,0.8)] min-[360px]:rounded-[2rem] min-[360px]:p-6 sm:p-10 lg:p-14">
          <span aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#14b8a6]/30 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-[#7cff4d]/15 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }} className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7cff4d]/30 bg-[#7cff4d]/10 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#b8ff9a] min-[300px]:text-[11px]">
                <Sparkles className="h-3.5 w-3.5" /> {t('ja.promo.eyebrow')}
              </span>
              <Heading className="mt-4 break-words font-display text-[1.6rem] leading-[1.08] min-[360px]:text-3xl sm:text-5xl">{t('ja.promo.title')}</Heading>
              <p className="mt-4 max-w-xl text-[13.5px] leading-relaxed text-white/70 sm:text-base">{t('ja.promo.body')}</p>
              <ul className="mt-5 space-y-2.5">
                {(
                  [
                    [Target, 'ja.promo.b1'],
                    [Zap, 'ja.promo.b2'],
                    [ShieldCheck, 'ja.promo.b3'],
                  ] as const
                ).map(([Icon, key], i) => (
                  <motion.li
                    key={key}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + i * 0.08 }}
                    className="flex items-start gap-2.5 text-[13.5px] text-white/85 sm:text-sm"
                  >
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#7cff4d]/15 text-[#b8ff9a]">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">{t(key)}</span>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-7 flex flex-col gap-2.5 min-[360px]:flex-row min-[360px]:flex-wrap">
                <Link
                  href="/dashboard/job-agent"
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#7cff4d] px-5 py-3 text-sm font-semibold text-[#062417] shadow-[0_12px_40px_-10px_rgba(124,255,77,0.6)] transition hover:brightness-95"
                >
                  <Radar className="h-4 w-4" /> {t('ja.promo.cta')}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                {as === 'section' ? (
                  <Link href="/job-agent" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                    {t('ja.promo.more')}
                  </Link>
                ) : null}
              </div>
            </motion.div>

            {/* Live feed */}
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, delay: 0.1 }} className="relative min-w-0">
              <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur min-[360px]:p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#1f6b4a,#062417_70%)] ring-2 ring-[#7cff4d]/40">
                    {!reduce ? (
                      <motion.span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(124,255,77,0.5),rgba(124,255,77,0)_30%)]" animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
                    ) : null}
                    <Bot className="relative h-5 w-5 text-[#c9ffb0]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t('ja.eyebrow')}</p>
                    <p className="flex items-center gap-1.5 text-[11px] text-white/60">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7cff4d]" />
                      <span className="truncate">{t('ja.promo.scanning')}…</span>
                    </p>
                  </div>
                </div>

                <ul className="mt-4 space-y-2">
                  {FEED.map((job, index) => {
                    const phase = reduce ? 'done' : phaseOf(index);
                    const applied = index % 2 === 0;
                    return (
                      <motion.li
                        key={job.title}
                        layout
                        className={cn(
                          'flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors min-[360px]:gap-3 min-[360px]:p-3',
                          phase === 'scan' ? 'border-white/5 bg-white/[0.02]' : 'border-[#7cff4d]/20 bg-[#7cff4d]/[0.05]',
                        )}
                      >
                        <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[11px] font-bold">
                          {phase === 'scan' ? (
                            <motion.span className="absolute inset-0 rounded-lg border border-[#7cff4d]/40" animate={reduce ? undefined : { opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity }} />
                          ) : null}
                          {job.company.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold">{job.title}</p>
                          <p className="truncate text-[11px] text-white/55">
                            {job.company} · {job.place}
                          </p>
                        </div>
                        <AnimatePresence mode="wait" initial={false}>
                          {phase === 'scan' ? (
                            <motion.span key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-white/10 min-[300px]:block">
                              <motion.span className="block h-full w-1/2 rounded-full bg-[#7cff4d]/70" animate={reduce ? undefined : { x: ['-100%', '200%'] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }} />
                            </motion.span>
                          ) : phase === 'match' ? (
                            <motion.span key="match" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="shrink-0 rounded-full bg-[#7cff4d]/15 px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#b8ff9a]">
                              {job.score}% <span className="hidden min-[360px]:inline">{t('ja.promo.match')}</span>
                            </motion.span>
                          ) : (
                            <motion.span
                              key="done"
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold', applied ? 'bg-emerald-400/15 text-emerald-200' : 'bg-sky-400/15 text-sky-200')}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span className="hidden min-[300px]:inline">{t(applied ? 'ja.promo.applied' : 'ja.promo.ready')}</span>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.li>
                    );
                  })}
                </ul>
              </div>

              <AnimatePresence>
                {showAlert || reduce ? (
                  <motion.div
                    initial={{ opacity: 0, y: 14, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="relative mt-3 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/95 px-3 py-2.5 text-[#062417] shadow-2xl sm:absolute sm:-bottom-5 sm:-left-6 sm:mt-0 sm:max-w-[18rem]"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#062417] text-[#7cff4d]">
                      <Bell className="h-4 w-4" />
                    </span>
                    <p className="min-w-0 text-[12px] font-semibold leading-snug">{t('ja.promo.alert')}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
