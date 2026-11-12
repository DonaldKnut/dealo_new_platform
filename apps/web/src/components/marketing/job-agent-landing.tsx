'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Check, KeyRound, Plug } from 'lucide-react';
import Link from 'next/link';

import { useLocale } from '@/components/i18n/locale-context';
import { JobAgentSteps } from '@/components/job-agent/job-agent-panel';
import { JobAgentPromo } from '@/components/marketing/job-agent-promo';

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '');

const SAMPLE = `curl -X PUT ${API_ORIGIN}/api/v1/ats-api/jobs/sync \\
  -H "Authorization: Bearer dk_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jobs": [{
      "externalId": "job-4821",
      "title": "Sales Executive",
      "location": "Lagos",
      "employmentType": "FULL_TIME",
      "description": "Grow retail accounts across Lagos…",
      "mustHaves": ["2+ years in sales"]
    }]
  }'`;

export function JobAgentLanding() {
  const { t } = useLocale();
  return (
    <div>
      <JobAgentPromo as="hero" />

      <section className="container-page pb-14 sm:pb-20">
        <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="font-display text-2xl text-foreground min-[360px]:text-3xl sm:text-4xl">
          {t('ja.page.stepsTitle')}
        </motion.h2>
        <JobAgentSteps className="mt-6" />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(['ja.safe.1', 'ja.safe.2', 'ja.safe.3', 'ja.safe.4'] as const).map((key, i) => (
            <motion.p
              key={key}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex gap-2 rounded-2xl border border-brand/20 bg-brand-soft/40 p-3 text-xs text-foreground"
            >
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" /> {t(key)}
            </motion.p>
          ))}
        </div>
      </section>

      <section className="container-page pb-16 sm:pb-24" id="partners">
        <div className="grid items-center gap-8 rounded-[1.5rem] border border-border bg-surface-elevated p-4 min-[360px]:p-6 sm:rounded-[2rem] sm:p-10 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="min-w-0">
            <p className="eyebrow inline-flex items-center gap-1.5">
              <Plug className="h-3.5 w-3.5" /> {t('ja.partner.eyebrow')}
            </p>
            <h2 className="mt-2 break-words font-display text-2xl text-foreground min-[360px]:text-3xl">{t('ja.partner.title')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t('ja.partner.body')}</p>
            <ul className="mt-4 space-y-2">
              {(['ja.partner.b1', 'ja.partner.b2', 'ja.partner.b3'] as const).map((key) => (
                <li key={key} className="flex gap-2 text-[13px] text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> <span className="min-w-0 break-words">{t(key)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-2 min-[360px]:flex-row min-[360px]:flex-wrap">
              <Link href="/dashboard/ats/settings" className="btn-primary justify-center">
                <KeyRound className="h-4 w-4" /> {t('ja.partner.cta')} <ArrowRight className="h-4 w-4" />
              </Link>
              <a href={`${API_ORIGIN}/api/docs#/ats-api`} target="_blank" rel="noopener noreferrer" className="btn-secondary justify-center">
                <BookOpen className="h-4 w-4" /> {t('ja.partner.docs')}
              </a>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#06140d] shadow-xl">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-2 truncate font-mono text-[10.5px] text-white/50">PUT /ats-api/jobs/sync</span>
              </div>
              <pre className="max-h-80 overflow-auto p-4 text-[11px] leading-relaxed text-[#d8f5e4] min-[360px]:text-[12px]">
                <code>{SAMPLE}</code>
              </pre>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
