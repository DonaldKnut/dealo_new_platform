'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Flame,
  HardHat,
  Star,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

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
    avatarSrc:
      'https://res.cloudinary.com/dyaetoldv/image/upload/v1793441975/download_60_yzzufy.jpg',
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
    avatarSrc:
      'https://res.cloudinary.com/dyaetoldv/image/upload/v1793440891/download_59_ivf7ts.jpg',
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
    avatarSrc:
      'https://res.cloudinary.com/dyaetoldv/image/upload/v1793442088/Erasty_Nangolo_o06a6x.jpg',
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
    avatarSrc:
      'https://res.cloudinary.com/dyaetoldv/image/upload/v1793442128/Espoir_bash_nloy7p.jpg',
    highlight: 'Delivers strong welds for gates, frames, and structural pieces.',
    availability: 'part',
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function TalentShowcaseGrid() {
  const { open } = useModal();
  const { t } = useLocale();
  const [filter, setFilter] = useState('all');
  const reduce = useReducedMotion();

  const categories = [
    { id: 'all', label: t('home.talent.allRoles'), short: t('home.talent.all'), icon: Users },
    {
      id: 'office',
      label: t('home.talent.officeLong'),
      short: t('home.talent.office'),
      icon: BriefcaseBusiness,
    },
    {
      id: 'trades',
      label: t('home.talent.tradesLong'),
      short: t('home.talent.trades'),
      icon: HardHat,
    },
  ];

  const availabilityLabel = (key: TalentProfile['availability']) => {
    if (key === 'week') return t('home.talent.availableWeek');
    if (key === 'part') return t('home.talent.availablePart');
    return t('home.talent.availableNow');
  };

  const filteredTalent =
    filter === 'all'
      ? TALENT_PROFILES
      : TALENT_PROFILES.filter((talent) => talent.category === filter);

  return (
    <section className="relative overflow-hidden border-t border-border/80 bg-surface/40 py-12 min-[340px]:py-20 sm:py-24 lg:py-28">
      <div className="container-page">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <motion.div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-surface-elevated px-2.5 py-1 text-[10px] font-semibold tracking-wider text-brand uppercase shadow-sm min-[340px]:px-3.5 min-[340px]:text-xs">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              {t('home.talent.pill')}
            </motion.div>

            <h2 className="display-title mt-3 text-[1.55rem] leading-tight text-foreground min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl lg:text-5xl">
              {t('home.talent.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted min-[340px]:mt-4 min-[340px]:text-base sm:text-lg">
              {t('home.talent.body')}
            </p>
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
                    isSelected
                      ? 'text-white dark:text-[#071f14]'
                      : 'border border-border/80 bg-surface-elevated text-muted hover:border-brand/40 hover:text-foreground'
                  }`}
                >
                  {isSelected ? (
                    <motion.span
                      layoutId="talent-filter-pill"
                      className="absolute inset-0 rounded-full bg-brand shadow-md shadow-brand/20"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
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

        <motion.div
          layout
          className="card-grid mt-7 grid gap-3 min-[340px]:mt-10 min-[340px]:gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredTalent.map((talent, index) => (
              <motion.article
                key={talent.id}
                layout
                initial={reduce ? false : { opacity: 0, y: 28, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, y: -12, scale: 0.96 }}
                transition={{
                  duration: 0.42,
                  delay: reduce ? 0 : index * 0.05,
                  ease,
                  layout: { type: 'spring', stiffness: 320, damping: 28 },
                }}
                className="ui-card group relative min-h-[17.5rem] justify-between overflow-hidden p-3.5 shadow-sm min-[340px]:min-h-[19rem] min-[340px]:p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 min-[340px]:gap-3">
                    <div className="flex min-w-0 items-center gap-2.5 min-[340px]:gap-3">
                      <div
                        className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-sm min-[340px]:h-12 min-[340px]:w-12 min-[340px]:rounded-2xl ${talent.avatarGradient}`}
                      >
                        {talent.avatarSrc ? (
                          <Image
                            src={talent.avatarSrc}
                            alt={talent.name}
                            fill
                            sizes="48px"
                            className="object-cover object-top"
                          />
                        ) : (
                          talent.initials
                        )}
                        <span className="absolute -right-0.5 -bottom-0.5 z-10 h-2.5 w-2.5 rounded-full border-2 border-surface-elevated bg-emerald-400 min-[340px]:h-3 min-[340px]:w-3" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate text-sm font-semibold text-foreground min-[340px]:text-base">
                            {talent.name}
                          </h3>
                          <BadgeCheck className="h-3.5 w-3.5 fill-brand/20 text-brand min-[340px]:h-4 min-[340px]:w-4" />
                        </div>
                        <p className="line-clamp-2 text-[11px] font-medium text-muted min-[340px]:text-xs">
                          {talent.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-surface px-2 py-0.5 text-[11px] font-semibold text-foreground min-[340px]:px-2.5 min-[340px]:py-1 min-[340px]:text-xs">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{talent.rating}</span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-border/60 bg-surface/70 p-2.5 min-[340px]:mt-4 min-[340px]:p-3">
                    <p className="text-[10px] font-semibold text-brand min-[340px]:text-[11px]">
                      {talent.experience}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-foreground/85 min-[340px]:text-xs">
                      &ldquo;{talent.highlight}&rdquo;
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 min-[340px]:mt-3.5">
                    {talent.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg border border-border/70 bg-surface px-1.5 py-0.5 text-[10px] font-medium text-foreground/90 min-[340px]:px-2 min-[340px]:text-[11px]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 border-t border-border/70 pt-3 min-[300px]:flex-row min-[300px]:items-center min-[300px]:justify-between min-[340px]:mt-6">
                  <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 min-[340px]:text-[11px] dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {availabilityLabel(talent.availability)}
                  </span>
                  <button
                    type="button"
                    onClick={() => open('hire')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline min-[340px]:text-xs"
                  >
                    {t('home.talent.request')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>

        <Reveal delay={0.12}>
          <div className="mt-8 text-center min-[340px]:mt-12">
            <p className="text-xs leading-relaxed text-muted min-[340px]:text-sm">
              {t('home.talent.footer')}{' '}
              <button
                type="button"
                onClick={() => open('hire')}
                className="font-semibold text-brand underline underline-offset-4 hover:text-brand-strong"
              >
                {t('home.talent.footerCta')}
              </button>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
