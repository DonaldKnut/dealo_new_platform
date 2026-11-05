'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BadgeCheck, FileDown, FileText, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { useLocale } from '@/components/i18n/locale-context';
import { SAMPLE_RESUME } from '@/components/resume/resume-content';
import { ResumePreview } from '@/components/resume/resume-preview';

const STACK = [
  { template: 'executive', accentColor: '#1e3a8a', rotate: -8, x: '-14%', y: 26, z: 1 },
  { template: 'artisan', accentColor: '#b45309', rotate: 7, x: '14%', y: 18, z: 2 },
  { template: 'modern', accentColor: '#0f766e', rotate: 0, x: '0%', y: 0, z: 3 },
] as const;

export function ResumeBuilderPromo() {
  const { t } = useLocale();
  const reduce = useReducedMotion();

  return (
    <section className="container-page py-12 min-[340px]:py-16 sm:py-20">
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-brand-soft via-surface-elevated to-amber-100/40 p-4 min-[340px]:p-6 sm:p-10 dark:to-amber-400/5">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}>
            <p className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white dark:text-[#071f14]">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t('cvpromo.eyebrow')}</span>
            </p>
            <h2 className="display-title mt-4 text-[1.6rem] leading-tight text-foreground min-[340px]:text-3xl sm:text-4xl lg:text-5xl">{t('cvpromo.title')}</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">{t('cvpromo.body')}</p>
            <ul className="mt-5 space-y-2.5">
              {[
                { icon: BadgeCheck, text: t('cvpromo.p1') },
                { icon: FileDown, text: t('cvpromo.p2') },
                { icon: Sparkles, text: t('cvpromo.p3') },
              ].map((item, i) => (
                <motion.li
                  key={item.text}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="flex items-center gap-2.5 text-sm text-foreground"
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-brand shadow-sm">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">{item.text}</span>
                </motion.li>
              ))}
            </ul>
            <div className="mt-7 flex flex-col gap-2 min-[400px]:flex-row">
              <Link href="/resume-builder/new" className="btn-primary group">
                {t('cvpromo.cta')} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <Link href="/resume-builder#templates" className="btn-secondary">
                {t('cvpromo.cta2')}
              </Link>
            </div>
          </motion.div>

          <div className="relative mx-auto w-full max-w-[22rem] pb-6 pt-4 sm:max-w-[26rem]">
            <div className="relative aspect-[595/842]">
              {STACK.map((card, i) => (
                <motion.div
                  key={card.template}
                  className={`absolute inset-0 overflow-hidden rounded-lg bg-white shadow-2xl shadow-black/25 ring-1 ring-black/5 ${i < 2 ? 'hidden min-[360px]:block' : ''}`}
                  style={{ zIndex: card.z }}
                  initial={{ opacity: 0, y: 40, rotate: 0 }}
                  whileInView={{ opacity: 1, y: card.y, rotate: card.rotate, x: card.x }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.1 + i * 0.12 }}
                  whileHover={reduce ? undefined : { y: card.y - 10, rotate: card.rotate * 0.6 }}
                >
                  <div className="pointer-events-none">
                    <ResumePreview doc={{ kind: 'RESUME', data: SAMPLE_RESUME, style: { template: card.template, accentColor: card.accentColor, font: 'helvetica' } }} branding={false} />
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.span
              className="absolute -left-2 top-8 z-10 hidden items-center gap-1.5 rounded-full bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg min-[300px]:inline-flex"
              animate={reduce ? undefined : { y: [0, -6, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <FileDown className="h-3.5 w-3.5 text-brand" /> PDF
            </motion.span>
            <motion.span
              className="absolute -right-2 bottom-10 z-10 hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-950 shadow-lg min-[300px]:inline-flex"
              animate={reduce ? undefined : { y: [0, 6, 0] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            >
              <Sparkles className="h-3.5 w-3.5" /> AI
            </motion.span>
          </div>
        </div>
      </div>
    </section>
  );
}
