'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  FileText,
  GraduationCap,
  KeyRound,
  Moon,
  Plug,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';

import { useLocale } from '@/components/i18n/locale-context';
import type { TranslationKey } from '@/components/i18n/dictionaries';
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
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl"
        >
          <p className="eyebrow">{t('ja.page.who.eyebrow')}</p>
          <h2 className="mt-2 font-display text-2xl text-foreground min-[360px]:text-3xl sm:text-4xl">
            {t('ja.page.who.title')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{t('ja.page.who.body')}</p>
        </motion.div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {(
            [
              [UserRound, 'ja.page.who.1t', 'ja.page.who.1b'],
              [GraduationCap, 'ja.page.who.2t', 'ja.page.who.2b'],
              [Briefcase, 'ja.page.who.3t', 'ja.page.who.3b'],
            ] as const
          ).map(([Icon, titleKey, bodyKey], i) => (
            <motion.div
              key={titleKey}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-border bg-surface-elevated p-5"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">{t(titleKey)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(bodyKey)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="container-page pb-14 sm:pb-20">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-2xl text-foreground min-[360px]:text-3xl sm:text-4xl"
        >
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

      <section className="border-y border-border bg-surface/60 py-14 sm:py-20">
        <div className="container-page">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <p className="eyebrow">{t('ja.page.proof.eyebrow')}</p>
            <h2 className="mt-2 font-display text-2xl text-foreground min-[360px]:text-3xl sm:text-4xl">
              {t('ja.page.proof.title')}
            </h2>
          </motion.div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {(
              [
                [Moon, 'ja.page.proof.1t', 'ja.page.proof.1b'],
                [SlidersHorizontal, 'ja.page.proof.2t', 'ja.page.proof.2b'],
                [ShieldCheck, 'ja.page.proof.3t', 'ja.page.proof.3b'],
              ] as const
            ).map(([Icon, titleKey, bodyKey], i) => (
              <motion.div
                key={titleKey}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-border bg-surface-elevated p-5 sm:p-6"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand/25 bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{t(titleKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(bodyKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-14 sm:py-20">
        <div className="grid items-center gap-8 rounded-[1.5rem] border border-border bg-surface-elevated p-5 min-[360px]:p-7 sm:rounded-[2rem] sm:p-10 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="eyebrow">{t('ja.page.tools.eyebrow')}</p>
            <h2 className="mt-2 font-display text-2xl text-foreground min-[360px]:text-3xl">
              {t('ja.page.tools.title')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t('ja.page.tools.body')}</p>
            <div className="mt-6 flex flex-col gap-2.5 min-[360px]:flex-row">
              <Link href="/resume-builder" className="btn-primary justify-center">
                <FileText className="h-4 w-4" /> {t('ja.page.tools.cv')}
              </Link>
              <Link href="/jobs" className="btn-secondary justify-center">
                <Briefcase className="h-4 w-4" /> {t('ja.page.tools.jobs')}
              </Link>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="grid gap-3"
          >
            {(
              [
                ['01', 'ja.page.tools.cv', '/resume-builder'],
                ['02', 'ja.page.tools.jobs', '/jobs'],
                ['03', 'ja.page.cta.button', '/dashboard/job-agent'],
              ] as const
            ).map(([step, labelKey, href]) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition hover:border-brand/40 hover:bg-brand-soft/30"
              >
                <span className="font-mono text-xs font-semibold text-brand">{step}</span>
                <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{t(labelKey as TranslationKey)}</span>
                <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="container-page pb-16 sm:pb-24" id="partners">
        <div className="grid items-center gap-8 rounded-[1.5rem] border border-border bg-surface-elevated p-4 min-[360px]:p-6 sm:rounded-[2rem] sm:p-10 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="min-w-0"
          >
            <p className="eyebrow inline-flex items-center gap-1.5">
              <Plug className="h-3.5 w-3.5" /> {t('ja.partner.eyebrow')}
            </p>
            <h2 className="mt-2 break-words font-display text-2xl text-foreground min-[360px]:text-3xl">
              {t('ja.partner.title')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t('ja.partner.body')}</p>
            <ul className="mt-4 space-y-2">
              {(['ja.partner.b1', 'ja.partner.b2', 'ja.partner.b3'] as const).map((key) => (
                <li key={key} className="flex gap-2 text-[13px] text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{' '}
                  <span className="min-w-0 break-words">{t(key)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-2 min-[360px]:flex-row min-[360px]:flex-wrap">
              <Link href="/developers/job-agent" className="btn-primary justify-center">
                <KeyRound className="h-4 w-4" /> {t('ja.partner.cta')} <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={`${API_ORIGIN}/api/docs`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary justify-center"
              >
                <BookOpen className="h-4 w-4" /> {t('ja.partner.docs')}
              </a>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="min-w-0"
          >
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#06140d] shadow-xl">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-2 truncate font-mono text-[10.5px] text-white/50">
                  PUT /ats-api/jobs/sync
                </span>
              </div>
              <pre className="max-h-80 overflow-auto p-4 text-[11px] leading-relaxed text-[#d8f5e4] min-[360px]:text-[12px]">
                <code>{SAMPLE}</code>
              </pre>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container-page pb-16 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[1.5rem] border border-brand/30 bg-[#05170e] px-5 py-10 text-white sm:rounded-[2rem] sm:px-10 sm:py-14"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#7cff4d]/20 blur-3xl"
          />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-2xl leading-tight min-[360px]:text-3xl sm:text-4xl">
              {t('ja.page.cta.title')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">{t('ja.page.cta.body')}</p>
            <Link
              href="/dashboard/job-agent"
              className="btn-primary mt-7 inline-flex justify-center shadow-lg shadow-black/30"
            >
              {t('ja.page.cta.button')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
