'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Clock,
  Code2,
  Compass,
  FileCheck,
  HardHat,
  Layers,
  Sparkles,
  Star,
  Users2,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import type { TranslationKey } from '@/components/i18n/dictionaries';
import { useLocale } from '@/components/i18n/locale-context';
import { useModal } from '@/components/modals/modal-context';

type CategoryKey = 'engineering' | 'trades' | 'product' | 'finance';

interface CandidateDef {
  id: string;
  name: string;
  avatarText: string;
  avatarGradient: string;
  avatarSrc?: string;
  rating: number;
  matchScore: number;
  titleKey: TranslationKey;
  expKey: TranslationKey;
  availKey: TranslationKey;
  vetKey: TranslationKey;
  /** Literal tech tags stay language-neutral; keys are translated. */
  tags: Array<string | TranslationKey>;
}

const CANDIDATES_BY_CAT: Record<CategoryKey, CandidateDef[]> = {
  engineering: [
    {
      id: 'c1',
      name: 'Oluwaseun A.',
      avatarText: 'OA',
      avatarGradient: 'from-teal-500 to-emerald-600',
      avatarSrc:
        'https://res.cloudinary.com/dyaetoldv/image/upload/v1793439934/SADE_Birth_Name__Talia_Rose_Campbell_Stage_Name__SADE_Birth_Year__2006_Position__L_tvwkvu.jpg',
      rating: 4.98,
      matchScore: 99,
      titleKey: 'home.console.c1.title',
      expKey: 'home.console.exp.7',
      availKey: 'home.console.avail.48h',
      vetKey: 'home.console.c1.vet',
      tags: ['Next.js', 'Go', 'PostgreSQL', 'AWS'],
    },
    {
      id: 'c2',
      name: 'Ibrahim D.',
      avatarText: 'ID',
      avatarGradient: 'from-cyan-500 to-blue-600',
      avatarSrc:
        'https://res.cloudinary.com/dyaetoldv/image/upload/v1793439934/download_54_xi2xmb.jpg',
      rating: 4.95,
      matchScore: 97,
      titleKey: 'home.console.c2.title',
      expKey: 'home.console.exp.8',
      availKey: 'home.console.avail.immediate',
      vetKey: 'home.console.c2.vet',
      tags: ['Kubernetes', 'Terraform', 'CI/CD', 'Docker'],
    },
  ],
  trades: [
    {
      id: 't1',
      name: 'Chinedu O.',
      avatarText: 'CO',
      avatarGradient: 'from-amber-500 to-orange-700',
      avatarSrc:
        'https://res.cloudinary.com/dyaetoldv/image/upload/v1793440275/Men_s_look_in_Africa_xdaxjn.jpg',
      rating: 4.96,
      matchScore: 98,
      titleKey: 'home.console.t1.title',
      expKey: 'home.console.exp.9',
      availKey: 'home.console.avail.48h',
      vetKey: 'home.console.t1.vet',
      tags: [
        'home.console.t1.tag1',
        'home.console.t1.tag2',
        'home.console.t1.tag3',
        'home.console.t1.tag4',
      ],
    },
    {
      id: 't2',
      name: 'Aisha B.',
      avatarText: 'AB',
      avatarGradient: 'from-rose-500 to-amber-600',
      avatarSrc:
        'https://res.cloudinary.com/dyaetoldv/image/upload/v1793440276/Bold_and_classic_hflaeo.jpg',
      rating: 4.94,
      matchScore: 96,
      titleKey: 'home.console.t2.title',
      expKey: 'home.console.exp.7',
      availKey: 'home.console.avail.now',
      vetKey: 'home.console.t2.vet',
      tags: [
        'home.console.t2.tag1',
        'home.console.t2.tag2',
        'home.console.t2.tag3',
        'home.console.t2.tag4',
      ],
    },
  ],
  product: [
    {
      id: 'c3',
      name: 'Chioma N.',
      avatarText: 'CN',
      avatarGradient: 'from-amber-500 to-teal-600',
      avatarSrc:
        'https://res.cloudinary.com/dyaetoldv/image/upload/v1793440472/download_56_t2rvqc.jpg',
      rating: 4.96,
      matchScore: 98,
      titleKey: 'home.console.c3.title',
      expKey: 'home.console.exp.6',
      availKey: 'home.console.avail.now',
      vetKey: 'home.console.c3.vet',
      tags: ['home.console.c3.tag1', 'Figma', 'home.console.c3.tag2', 'home.console.c3.tag3'],
    },
    {
      id: 'c4',
      name: 'Emeka K.',
      avatarText: 'EK',
      avatarGradient: 'from-purple-500 to-teal-600',
      avatarSrc:
        'https://res.cloudinary.com/dyaetoldv/image/upload/v1793440472/download_55_saja1u.jpg',
      rating: 4.92,
      matchScore: 96,
      titleKey: 'home.console.c4.title',
      expKey: 'home.console.exp.7',
      availKey: 'home.console.avail.5d',
      vetKey: 'home.console.c4.vet',
      tags: ['home.console.c4.tag1', 'home.console.c4.tag2', 'home.console.c4.tag3', 'Agile'],
    },
  ],
  finance: [
    {
      id: 'c5',
      name: 'Folake O.',
      avatarText: 'FO',
      avatarGradient: 'from-emerald-500 to-teal-700',
      avatarSrc:
        'https://res.cloudinary.com/dyaetoldv/image/upload/v1793440665/download_58_nbatfg.jpg',
      rating: 4.99,
      matchScore: 99,
      titleKey: 'home.console.c5.title',
      expKey: 'home.console.exp.8',
      availKey: 'home.console.avail.48h',
      vetKey: 'home.console.c5.vet',
      tags: [
        'home.console.c5.tag1',
        'home.console.c5.tag2',
        'home.console.c5.tag3',
        'home.console.c5.tag4',
      ],
    },
    {
      id: 'c6',
      name: 'Zainab M.',
      avatarText: 'ZM',
      avatarGradient: 'from-violet-500 to-teal-600',
      avatarSrc:
        'https://res.cloudinary.com/dyaetoldv/image/upload/v1793440891/download_59_ivf7ts.jpg',
      rating: 4.99,
      matchScore: 98,
      titleKey: 'home.console.c6.title',
      expKey: 'home.console.exp.8',
      availKey: 'home.console.avail.now',
      vetKey: 'home.console.c6.vet',
      tags: [
        'home.console.c6.tag1',
        'home.console.c6.tag2',
        'home.console.c6.tag3',
        'home.console.c6.tag4',
      ],
    },
  ],
};

const SLIDE_ORDER: CategoryKey[] = ['engineering', 'trades', 'product', 'finance'];

const SLIDE_MS = 4800;

export function TalentOpsConsole() {
  const { open } = useModal();
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const [activeTab, setActiveTab] = useState<CategoryKey>('engineering');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('c1');
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);

  const tabs = [
    {
      key: 'engineering' as const,
      label: t('home.console.tab.eng'),
      short: t('home.console.tab.engShort'),
      icon: Code2,
    },
    {
      key: 'trades' as const,
      label: t('home.console.tab.trades'),
      short: t('home.console.tab.tradesShort'),
      icon: HardHat,
    },
    {
      key: 'product' as const,
      label: t('home.console.tab.product'),
      short: t('home.console.tab.productShort'),
      icon: Compass,
    },
    {
      key: 'finance' as const,
      label: t('home.console.tab.finance'),
      short: t('home.console.tab.financeShort'),
      icon: Briefcase,
    },
  ];

  const candidates = CANDIDATES_BY_CAT[activeTab];
  const activeCandidate = candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

  const resolveTag = (tag: string | TranslationKey) =>
    tag.startsWith('home.console.') ? t(tag as TranslationKey) : tag;

  useEffect(() => {
    if (paused || reduce) return;

    const timer = window.setInterval(() => {
      setSlideDir(1);
      setActiveTab((current) => {
        const index = SLIDE_ORDER.indexOf(current);
        const next = SLIDE_ORDER[(index + 1) % SLIDE_ORDER.length];
        setSelectedCandidateId(CANDIDATES_BY_CAT[next][0].id);
        return next;
      });
    }, SLIDE_MS);

    return () => window.clearInterval(timer);
  }, [paused, reduce]);

  const selectTab = (key: CategoryKey) => {
    const currentIndex = SLIDE_ORDER.indexOf(activeTab);
    const nextIndex = SLIDE_ORDER.indexOf(key);
    setSlideDir(nextIndex >= currentIndex ? 1 : -1);
    setActiveTab(key);
    setSelectedCandidateId(CANDIDATES_BY_CAT[key][0].id);
    setPaused(true);
    window.setTimeout(() => setPaused(false), SLIDE_MS * 2);
  };

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
              {t('home.console.title')}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-full w-full rounded-full bg-emerald-500" />
            </span>
            <span className="hidden text-[10px] font-medium text-emerald-600 min-[280px]:inline dark:text-emerald-400 min-[340px]:text-xs">
              {t('home.console.finding')}
            </span>
          </div>
        </div>

        <div className="-mx-px flex items-center gap-1 overflow-x-auto border-b border-border/60 bg-surface/30 p-1.5 scrollbar-none min-[340px]:gap-1.5 min-[340px]:p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => selectTab(tab.key)}
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
          <div className="relative min-h-[17.5rem] overflow-hidden min-[340px]:min-h-[19.5rem]">
            <AnimatePresence mode="wait" custom={slideDir} initial={false}>
              <motion.div
                key={activeTab}
                custom={slideDir}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: slideDir * 56 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: slideDir * -56 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-2 min-[340px]:space-y-2.5"
              >
                {candidates.map((cand) => {
                  const isSelected = cand.id === activeCandidate.id;
                  return (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => {
                        setSelectedCandidateId(cand.id);
                        setPaused(true);
                        window.setTimeout(() => setPaused(false), SLIDE_MS * 2);
                      }}
                      className={`group relative w-full cursor-pointer rounded-xl border p-2.5 text-left transition-all duration-200 min-[340px]:rounded-2xl min-[340px]:p-3.5 sm:p-4 ${
                        isSelected
                          ? 'border-brand bg-brand/5 shadow-sm dark:bg-brand/10'
                          : 'border-border/70 bg-surface/40 hover:border-brand/40 hover:bg-surface/80'
                      }`}
                    >
                      <div className="flex flex-col gap-2.5 min-[300px]:flex-row min-[300px]:items-start min-[300px]:justify-between">
                        <div className="flex min-w-0 items-center gap-2.5 min-[340px]:gap-3">
                          <div
                            className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br font-bold text-white shadow-sm min-[340px]:h-11 min-[340px]:w-11 ${cand.avatarGradient}`}
                          >
                            {cand.avatarSrc ? (
                              <Image
                                src={cand.avatarSrc}
                                alt={cand.name}
                                fill
                                sizes="44px"
                                className="object-cover object-top"
                              />
                            ) : (
                              cand.avatarText
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-1">
                              <h4 className="truncate text-sm font-semibold text-foreground sm:text-base">
                                {cand.name}
                              </h4>
                              <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-brand/20 text-brand min-[340px]:h-4 min-[340px]:w-4" />
                            </div>
                            <p className="truncate text-[11px] font-medium text-muted min-[340px]:text-xs">
                              {t(cand.titleKey)}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2 min-[300px]:flex-col min-[300px]:items-end">
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 min-[340px]:px-2.5 min-[340px]:text-xs">
                            <Sparkles className="h-3 w-3" />
                            {cand.matchScore}% {t('home.console.match')}
                          </span>
                          <p className="flex items-center gap-1 text-[10px] text-muted min-[340px]:text-[11px]">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {cand.rating} · {t(cand.expKey)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-1 min-[340px]:mt-3 min-[340px]:gap-1.5">
                        {cand.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md border border-border/80 bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-foreground min-[340px]:rounded-lg min-[340px]:px-2 min-[340px]:text-[11px]"
                          >
                            {resolveTag(tag)}
                          </span>
                        ))}
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-brand min-[340px]:ml-auto min-[340px]:text-[11px]">
                          <Clock className="h-3 w-3" />
                          {t(cand.availKey)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-center gap-1.5">
            {SLIDE_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                aria-label={t('home.console.finding')}
                onClick={() => selectTab(key)}
                className={`h-1.5 rounded-full transition-all ${
                  activeTab === key ? 'w-5 bg-brand' : 'w-1.5 bg-border hover:bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="rounded-xl border border-brand/30 bg-surface/90 p-3 min-[340px]:rounded-2xl min-[340px]:p-4">
            <div className="flex flex-col gap-1 text-[11px] min-[300px]:flex-row min-[300px]:items-center min-[300px]:justify-between min-[340px]:text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <FileCheck className="h-3.5 w-3.5 text-brand min-[340px]:h-4 min-[340px]:w-4" />
                {t('home.console.why')}
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-brand uppercase min-[340px]:text-[11px]">
                {t('home.console.bgCheck')}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted min-[340px]:text-xs">
              {t(activeCandidate.vetKey)}
            </p>
            <div className="mt-3 border-t border-border/60 pt-2.5 min-[340px]:mt-3.5 min-[340px]:pt-2">
              <button
                type="button"
                onClick={() => open('hire')}
                className="btn-primary w-full py-2 text-xs shadow-sm"
              >
                {t('home.console.cta')}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border/70 bg-surface/70 px-3 py-2 text-[10px] text-muted min-[300px]:flex-row min-[300px]:items-center min-[300px]:justify-between min-[340px]:px-4 min-[340px]:py-2.5 min-[340px]:text-[11px]">
          <span className="flex min-w-0 items-center gap-1.5">
            <Users2 className="h-3.5 w-3.5 shrink-0 text-brand" />
            <span className="truncate">{t('home.console.footer1')}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>{t('home.console.footer2')}</span>
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
          <p className="text-xs font-semibold text-foreground">{t('home.console.float1.title')}</p>
          <p className="text-[10px] text-muted">{t('home.console.float1.sub')}</p>
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
          <p className="text-xs font-semibold text-foreground">{t('home.console.float2.title')}</p>
          <p className="text-[10px] text-muted">{t('home.console.float2.sub')}</p>
        </div>
      </motion.div>
    </div>
  );
}
