'use client';

import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Flame,
  HardHat,
  Quote,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useLocale } from '@/components/i18n/locale-context';
import { useModal } from '@/components/modals/modal-context';

import { Reveal } from './reveal';

interface TalentProfile {
  id: string;
  name: string;
  role: string;
  category: 'office' | 'trades';
  rating: number;
  skills: string[];
  experience: string;
  avatarGradient: string;
  initials: string;
  avatarSrc?: string;
  highlight: string;
  availability: 'now' | 'week' | 'part';
}

const TALENT_PROFILES: TalentProfile[] = [
  {
    id: 't1',
    name: 'Tunde B.',
    role: 'Senior Backend Engineer',
    category: 'office',
    rating: 4.98,
    skills: ['Go', 'PostgreSQL', 'AWS', 'APIs'],
    experience: '8 yrs • Fintech systems',
    avatarGradient: 'from-teal-500 to-cyan-600',
    initials: 'TB',
    avatarSrc: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1793441975/download_60_yzzufy.jpg',
    highlight: 'Built reliable payment systems used by large Nigerian teams.',
    availability: 'now',
  },
  {
    id: 't2',
    name: 'Zainab M.',
    role: 'Finance & Compliance Manager',
    category: 'office',
    rating: 4.99,
    skills: ['Accounting', 'Audit', 'ERP', 'Tax'],
    experience: '8 yrs • Corporate finance',
    avatarGradient: 'from-violet-500 to-teal-600',
    initials: 'ZM',
    avatarSrc: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1793440891/download_59_ivf7ts.jpg',
    highlight: 'Kept books clean across multi-entity operations.',
    availability: 'now',
  },
  {
    id: 't3',
    name: 'Adaeze K.',
    role: 'Executive Assistant',
    category: 'office',
    rating: 4.96,
    skills: ['Scheduling', 'Ops support', 'Docs', 'Stakeholder care'],
    experience: '6 yrs • Founder support',
    avatarGradient: 'from-amber-500 to-teal-600',
    initials: 'AK',
    avatarSrc: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1793440891/Oof_reqk1f.jpg',
    highlight: 'Runs calendars, travel, and follow-ups for busy leadership teams.',
    availability: 'week',
  },
  {
    id: 't4',
    name: 'Ibrahim S.',
    role: 'Bricklayer / Mason',
    category: 'trades',
    rating: 4.94,
    skills: ['Blockwork', 'Plastering', 'Site finishing', 'Team lead'],
    experience: '9 yrs • Residential & commercial sites',
    avatarGradient: 'from-orange-500 to-amber-700',
    initials: 'IS',
    avatarSrc:
      'https://res.cloudinary.com/dyaetoldv/image/upload/v1793442022/Se_taire_n_est_pas_une_faiblesse_c_est_une_preuve_de_maturit%C3%A9_et_de_sagesse__jetestelalgorithme_jx7wyl.jpg',
    highlight: 'Led blockwork crews on multi-storey builds in Lagos.',
    availability: 'now',
  },
  {
    id: 't5',
    name: 'Chukwudi E.',
    role: 'Electrician',
    category: 'trades',
    rating: 4.95,
    skills: ['Wiring', 'Panels', 'Fault finding', 'Safety'],
    experience: '7 yrs • Industrial & estate installs',
    avatarGradient: 'from-yellow-500 to-teal-700',
    initials: 'CE',
    avatarSrc: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1793442088/Erasty_Nangolo_o06a6x.jpg',
    highlight: 'Handles clean installs and safe fault repairs on live sites.',
    availability: 'now',
  },
  {
    id: 't6',
    name: 'Musa A.',
    role: 'Welder / Fabricator',
    category: 'trades',
    rating: 4.93,
    skills: ['Arc welding', 'Fabrication', 'Site fitting', 'QA'],
    experience: '8 yrs • Structural & workshop work',
    avatarGradient: 'from-slate-500 to-teal-700',
    initials: 'MA',
    avatarSrc: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1793442128/Espoir_bash_nloy7p.jpg',
    highlight: 'Delivers strong welds for gates, frames, and structural pieces.',
    availability: 'part',
  },
];

const VISIBLE = 3;
const CYCLE_MS = 4200;

function TalentCard({
  talent,
  availabilityLabel,
  requestLabel,
  onAsk,
}: {
  talent: TalentProfile;
  availabilityLabel: string;
  requestLabel: string;
  onAsk: () => void;
}) {
  return (
    <article className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[1.4rem] border border-border/80 bg-surface/80 p-4 shadow-sm backdrop-blur-sm min-[340px]:p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/35 to-transparent" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2 min-[340px]:gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br text-sm font-bold text-white shadow-sm ring-2 ring-border/50 min-[340px]:h-12 min-[340px]:w-12 ${talent.avatarGradient}`}
            >
              {talent.avatarSrc ? (
                <Image src={talent.avatarSrc} alt={talent.name} fill sizes="48px" className="object-cover object-top" />
              ) : (
                talent.initials
              )}
              <span className="absolute -bottom-0.5 -right-0.5 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-surface-elevated bg-surface-elevated">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-sm font-bold text-foreground min-[340px]:text-base">{talent.name}</h3>
                <BadgeCheck className="h-4 w-4 shrink-0 fill-brand/20 text-brand" />
              </div>
              <p className="line-clamp-1 text-xs font-medium text-muted">{talent.role}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{talent.rating}</span>
          </div>
        </div>

        <div className="mt-3.5 rounded-xl border border-border/70 bg-surface/90 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand">
              <Sparkles className="h-3 w-3" />
              {talent.experience}
            </span>
            <Quote className="h-3.5 w-3.5 text-muted/40" />
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground/85">&ldquo;{talent.highlight}&rdquo;</p>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {talent.skills.map((skill) => (
            <span key={skill} className="rounded-lg border border-border/80 bg-surface px-2 py-0.5 text-[10px] font-semibold text-foreground/85">
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-5 flex items-center justify-between border-t border-border/70 pt-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {availabilityLabel}
        </span>
        <button type="button" onClick={onAsk} className="inline-flex items-center gap-1 text-xs font-bold text-brand transition-colors hover:text-brand-strong">
          <span>{requestLabel}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

export function TalentShowcaseGrid() {
  const { open } = useModal();
  const { t } = useLocale();
  const [filter, setFilter] = useState('all');
  const [cursor, setCursor] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { margin: '-80px 0px' });

  const categories = [
    { id: 'all', label: t('home.talent.allRoles'), short: t('home.talent.all'), icon: Users },
    { id: 'office', label: t('home.talent.officeLong'), short: t('home.talent.office'), icon: BriefcaseBusiness },
    { id: 'trades', label: t('home.talent.tradesLong'), short: t('home.talent.trades'), icon: HardHat },
  ];

  const availabilityLabel = (key: TalentProfile['availability']) => {
    if (key === 'week') return t('home.talent.availableWeek');
    if (key === 'part') return t('home.talent.availablePart');
    return t('home.talent.availableNow');
  };

  const pool = useMemo(
    () => (filter === 'all' ? TALENT_PROFILES : TALENT_PROFILES.filter((talent) => talent.category === filter)),
    [filter],
  );

  useEffect(() => {
    setCursor(0);
  }, [filter]);

  useEffect(() => {
    if (!inView || paused || reduce || pool.length <= VISIBLE) return;
    const id = window.setInterval(() => setCursor((c) => (c + 1) % pool.length), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [inView, paused, reduce, pool.length]);

  const visible = useMemo(() => {
    if (pool.length === 0) return [];
    if (reduce || pool.length <= VISIBLE) return pool.slice(0, VISIBLE);
    return Array.from({ length: Math.min(VISIBLE, pool.length) }, (_, i) => pool[(cursor + i) % pool.length]);
  }, [pool, cursor, reduce]);

  return (
    <section className="relative overflow-hidden border-t border-border/80 bg-surface/40 py-12 min-[340px]:py-20 sm:py-24 lg:py-28">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,var(--hero-glow),transparent_70%)] opacity-60" />

      <div className="container-page relative z-10">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <motion.div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-surface-elevated px-2.5 py-1 text-[10px] font-semibold tracking-wider text-brand uppercase shadow-sm min-[340px]:px-3.5 min-[340px]:text-xs">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              {t('home.talent.pill')}
            </motion.div>
            <h2 className="display-title mt-3 text-[1.55rem] leading-tight text-foreground min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl lg:text-5xl">
              {t('home.talent.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted min-[340px]:mt-4 min-[340px]:text-base sm:text-lg">{t('home.talent.body')}</p>
          </div>
        </Reveal>

        <div className="-mx-1 mt-7 overflow-x-auto px-1 scrollbar-none min-[340px]:mt-10">
          <div className="flex w-max min-w-full items-center justify-start gap-2 min-[480px]:w-auto min-[480px]:flex-wrap min-[480px]:justify-center">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = filter === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  type="button"
                  layout
                  whileTap={reduce ? undefined : { scale: 0.96 }}
                  onClick={() => setFilter(cat.id)}
                  className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors min-[340px]:gap-2 min-[340px]:px-4 min-[340px]:py-2 min-[340px]:text-xs sm:text-sm ${
                    isSelected ? 'text-white dark:text-[#071f14]' : 'border border-border/80 bg-surface-elevated text-muted hover:border-brand/40 hover:text-foreground'
                  }`}
                >
                  {isSelected ? (
                    <motion.span layoutId="talent-filter-pill" className="absolute inset-0 rounded-full bg-brand shadow-md shadow-brand/20" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
                  ) : null}
                  <span className="relative z-10 inline-flex items-center gap-1.5 min-[340px]:gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="min-[480px]:hidden">{cat.short}</span>
                    <span className="hidden min-[480px]:inline">{cat.label}</span>
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* WhatsApp-style chat stream: cards rise in and float out */}
        <div
          ref={sectionRef}
          className="relative mx-auto mt-8 max-w-5xl min-[340px]:mt-12"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
          }}
        >
          <div className="pointer-events-none absolute inset-x-8 top-0 z-20 h-10 bg-gradient-to-b from-surface/40 to-transparent" />
          <div className="pointer-events-none absolute inset-x-8 bottom-0 z-20 h-10 bg-gradient-to-t from-surface/40 to-transparent" />

          <div className="grid min-h-[22rem] gap-4 min-[340px]:min-h-[24rem] min-[340px]:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((talent, slot) => (
                <motion.div
                  key={`${filter}-${talent.id}`}
                  layout
                  initial={reduce ? false : { opacity: 0, y: 64, scale: 0.94, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                  exit={reduce ? undefined : { opacity: 0, y: -56, scale: 0.96, filter: 'blur(6px)' }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28, delay: reduce ? 0 : slot * 0.04 }}
                  className="h-full"
                >
                  <TalentCard
                    talent={talent}
                    availabilityLabel={availabilityLabel(talent.availability)}
                    requestLabel={t('home.talent.request')}
                    onAsk={() => open('hire')}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {!reduce && pool.length > VISIBLE ? (
            <div className="mt-5 flex items-center justify-center gap-1.5">
              {pool.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  aria-label={`Show ${p.name}`}
                  onClick={() => setCursor(i)}
                  className={`h-1.5 rounded-full transition-all ${i === cursor ? 'w-6 bg-brand' : 'w-1.5 bg-border hover:bg-muted'}`}
                />
              ))}
            </div>
          ) : null}
        </div>

        <Reveal delay={0.12}>
          <div className="mt-8 text-center min-[340px]:mt-12">
            <p className="text-xs leading-relaxed text-muted min-[340px]:text-sm">
              {t('home.talent.footer')}{' '}
              <button type="button" onClick={() => open('hire')} className="font-semibold text-brand underline underline-offset-4 hover:text-brand-strong">
                {t('home.talent.footerCta')}
              </button>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
