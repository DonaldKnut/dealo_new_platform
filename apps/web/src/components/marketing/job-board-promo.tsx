'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Briefcase, MapPin, Radar, Search, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useLocale } from '@/components/i18n/locale-context';

const LISTINGS = [
  { title: 'Finance Officer', company: 'Lagos Logistics', place: 'Ikeja · Hybrid', tag: 'Easy Apply', pay: '₦350k–450k' },
  { title: 'Site Electrician', company: 'Brightline Estates', place: 'Lekki · On-site', tag: 'Urgent', pay: 'Daily rate' },
  { title: 'Customer Success', company: 'PayStack Partner', place: 'Remote · NG', tag: 'New', pay: '₦280k–320k' },
  { title: 'HR Coordinator', company: 'Hoop Telecoms', place: 'Abuja · Office', tag: 'Easy Apply', pay: '₦220k–280k' },
] as const;

/** Homepage promo for the public job board — pairs with Job Agent. */
export function JobBoardPromo() {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => setActive((v) => (v + 1) % LISTINGS.length), 2600);
    return () => window.clearInterval(timer);
  }, [reduce]);

  return (
    <section className="relative overflow-hidden py-14 sm:py-20" id="job-board">
      <div className="container-page">
        <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="min-w-0"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-brand min-[300px]:text-[11px]">
              <Briefcase className="h-3.5 w-3.5" /> {t('jb.promo.eyebrow')}
            </span>
            <h2 className="mt-4 break-words font-display text-[1.6rem] leading-[1.08] text-foreground min-[360px]:text-3xl sm:text-5xl">
              {t('jb.promo.title')}
            </h2>
            <p className="mt-4 max-w-xl text-[13.5px] leading-relaxed text-muted sm:text-base">{t('jb.promo.body')}</p>
            <ul className="mt-5 space-y-2.5">
              {(
                [
                  [Search, 'jb.promo.b1'],
                  [Zap, 'jb.promo.b2'],
                  [Radar, 'jb.promo.b3'],
                ] as const
              ).map(([Icon, key], i) => (
                <motion.li
                  key={key}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.12 + i * 0.07 }}
                  className="flex items-start gap-2.5 text-[13.5px] text-foreground/90 sm:text-sm"
                >
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">{t(key)}</span>
                </motion.li>
              ))}
            </ul>
            <div className="mt-7 flex flex-col gap-2.5 min-[360px]:flex-row min-[360px]:flex-wrap">
              <Link href="/jobs" className="btn-primary group">
                {t('jb.promo.cta')}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link href="/dashboard/job-agent" className="btn-secondary">
                {t('jb.promo.agent')}
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="relative min-w-0"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_srgb,var(--brand)_18%,transparent),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(14,165,233,0.12),transparent_50%)]"
            />
            <div className="relative overflow-hidden rounded-[1.5rem] border border-border bg-surface-elevated p-3 shadow-[0_30px_80px_-40px_rgba(4,47,46,0.45)] min-[360px]:rounded-[2rem] min-[360px]:p-4 sm:p-5">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate text-sm text-muted">{t('jb.promo.search')}</span>
                <span className="hidden shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand min-[340px]:inline">
                  {LISTINGS.length}+ {t('jb.promo.today')}
                </span>
              </div>

              <ul className="mt-3 space-y-2">
                {LISTINGS.map((job, index) => {
                  const on = reduce || index === active;
                  return (
                    <motion.li
                      key={job.title}
                      layout
                      animate={{
                        opacity: on ? 1 : 0.55,
                        scale: on ? 1 : 0.985,
                        borderColor: on ? 'color-mix(in srgb, var(--brand) 35%, transparent)' : 'var(--border)',
                      }}
                      transition={{ duration: 0.35 }}
                      className="rounded-xl border bg-surface px-3 py-2.5 min-[360px]:px-3.5 min-[360px]:py-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.06] text-[11px] font-bold text-foreground">
                          {job.company.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-[13px] font-semibold text-foreground">{job.title}</p>
                            <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">{job.tag}</span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-muted">
                            {job.company} · {job.pay}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted">
                            <MapPin className="h-3 w-3" /> {job.place}
                          </p>
                        </div>
                        <AnimatePresence mode="wait">
                          {on ? (
                            <motion.span
                              key="go"
                              initial={{ opacity: 0, x: 4 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0 }}
                              className="hidden shrink-0 self-center rounded-full bg-brand px-2.5 py-1 text-[10.5px] font-semibold text-white min-[380px]:inline"
                            >
                              {t('jb.promo.apply')}
                            </motion.span>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
