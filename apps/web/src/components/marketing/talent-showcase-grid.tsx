'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Code,
  Flame,
  Layout,
  LineChart,
  Shield,
  Star,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import { useModal } from '@/components/modals/modal-context';

import { Reveal } from './reveal';

interface TalentProfile {
  id: string;
  name: string;
  role: string;
  category: 'tech' | 'design' | 'finance' | 'growth';
  rating: number;
  skills: string[];
  experience: string;
  avatarGradient: string;
  initials: string;
  highlight: string;
  availability: 'Available Immediately' | 'Available in 1 Week' | 'Available Part-Time';
}

const TALENT_PROFILES: TalentProfile[] = [
  {
    id: 't1',
    name: 'Tunde B.',
    role: 'Senior Backend & Systems Engineer',
    category: 'tech',
    rating: 4.98,
    skills: ['Go', 'Kubernetes', 'PostgreSQL', 'Microservices', 'Redis'],
    experience: '8 yrs exp • Ex-Fintech Infrastructure',
    avatarGradient: 'from-teal-500 to-cyan-600',
    initials: 'TB',
    highlight: 'Scaled transaction ledger processing to 2.4M daily events.',
    availability: 'Available Immediately',
  },
  {
    id: 't2',
    name: 'Amina Y.',
    role: 'Lead UI/UX & Design Systems Architect',
    category: 'design',
    rating: 4.97,
    skills: ['Figma', 'Design Systems', 'Design Tokens', 'Fintech UX', 'Prototyping'],
    experience: '6 yrs exp • Built scalable multi-brand design system',
    avatarGradient: 'from-amber-500 to-teal-600',
    initials: 'AY',
    highlight: 'Designed unified mobile & web experiences across 4 African markets.',
    availability: 'Available Immediately',
  },
  {
    id: 't3',
    name: 'Chinedu O.',
    role: 'Senior React / Next.js Specialist',
    category: 'tech',
    rating: 4.95,
    skills: ['TypeScript', 'Next.js', 'React', 'Tailwind', 'GraphQL'],
    experience: '7 yrs exp • Frontend Architecture',
    avatarGradient: 'from-emerald-500 to-teal-700',
    initials: 'CO',
    highlight: 'Improved web core vitals by 45% and reduced bundle load by 3x.',
    availability: 'Available in 1 Week',
  },
  {
    id: 't4',
    name: 'Zainab M.',
    role: 'Financial Operations & Compliance Manager',
    category: 'finance',
    rating: 4.99,
    skills: ['Financial Modeling', 'ACCA', 'Tax Compliance', 'Audit', 'ERP'],
    experience: '8 yrs exp • Corporate Governance',
    avatarGradient: 'from-violet-500 to-teal-600',
    initials: 'ZM',
    highlight: 'Managed quarterly multi-currency reconciliation across 3 jurisdictions.',
    availability: 'Available Immediately',
  },
  {
    id: 't5',
    name: 'Damilola E.',
    role: 'Growth & Performance Marketing Lead',
    category: 'growth',
    rating: 4.93,
    skills: ['B2B Acquisition', 'Retention Funnels', 'Google Ads', 'HubSpot', 'SEO'],
    experience: '5 yrs exp • B2B Scale-ups',
    avatarGradient: 'from-rose-500 to-teal-600',
    initials: 'DE',
    highlight: 'Scaled organic customer acquisition by 210% within 6 months.',
    availability: 'Available Part-Time',
  },
  {
    id: 't6',
    name: 'Kelechi U.',
    role: 'Senior Mobile Engineer (Flutter & iOS)',
    category: 'tech',
    rating: 4.96,
    skills: ['Flutter', 'Dart', 'Swift', 'Offline-First', 'REST APIs'],
    experience: '6 yrs exp • Banking & Payments Apps',
    avatarGradient: 'from-cyan-500 to-teal-700',
    initials: 'KU',
    highlight: 'Shipped high-rated consumer finance app with 4.8★ app store rating.',
    availability: 'Available Immediately',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Roles', icon: Users },
  { id: 'tech', label: 'Engineering & DevOps', icon: Code },
  { id: 'design', label: 'Product & Design', icon: Layout },
  { id: 'finance', label: 'Finance & Compliance', icon: Shield },
  { id: 'growth', label: 'Growth & Marketing', icon: LineChart },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function TalentShowcaseGrid() {
  const { open } = useModal();
  const [filter, setFilter] = useState('all');
  const reduce = useReducedMotion();

  const filteredTalent =
    filter === 'all'
      ? TALENT_PROFILES
      : TALENT_PROFILES.filter((talent) => talent.category === filter);

  return (
    <section className="relative overflow-hidden border-t border-border/80 bg-surface/40 py-12 min-[340px]:py-20 sm:py-24 lg:py-28">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-1/3 right-1/4 h-80 w-80 rounded-full bg-accent/10 blur-[100px]"
        animate={reduce ? undefined : { scale: [1, 1.08, 1], opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="container-page">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-surface-elevated px-2.5 py-1 text-[10px] font-semibold tracking-wider text-brand uppercase shadow-sm min-[340px]:px-3.5 min-[340px]:text-xs"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <motion.span
                animate={reduce ? undefined : { rotate: [0, -12, 10, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3 }}
              >
                <Flame className="h-3.5 w-3.5 text-amber-500" />
              </motion.span>
              Pre-Vetted Talent Pool
            </motion.div>

            <h2 className="display-title mt-3 text-[1.55rem] leading-tight text-foreground min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl lg:text-5xl">
              Meet the specialists ready to elevate your team.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted min-[340px]:mt-4 min-[340px]:text-base sm:text-lg">
              Every professional in the Dealo network undergoes strict technical, communication, and
              identity verification before joining shortlists.
            </p>
          </div>
        </Reveal>

        <div className="-mx-1 mt-7 overflow-x-auto px-1 scrollbar-none min-[340px]:mt-10 min-[480px]:mx-0 min-[480px]:overflow-visible min-[480px]:px-0">
          <div className="flex w-max min-w-full items-center justify-start gap-2 min-[480px]:w-auto min-[480px]:flex-wrap min-[480px]:justify-center">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = filter === cat.id;
              const shortLabel =
                cat.id === 'tech'
                  ? 'Eng'
                  : cat.id === 'design'
                    ? 'Design'
                    : cat.id === 'finance'
                      ? 'Finance'
                      : cat.id === 'growth'
                        ? 'Growth'
                        : 'All';
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
                    <span className="min-[480px]:hidden">{shortLabel}</span>
                    <span className="hidden min-[480px]:inline">{cat.label}</span>
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <motion.div layout className="mt-7 grid gap-3 min-[340px]:mt-10 min-[340px]:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredTalent.map((talent, index) => (
              <motion.article
                key={talent.id}
                layout
                initial={
                  reduce
                    ? false
                    : { opacity: 0, y: 28, scale: 0.94, filter: 'blur(6px)' }
                }
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={
                  reduce
                    ? undefined
                    : { opacity: 0, y: -12, scale: 0.96, filter: 'blur(4px)' }
                }
                transition={{
                  duration: 0.42,
                  delay: reduce ? 0 : index * 0.05,
                  ease,
                  layout: { type: 'spring', stiffness: 320, damping: 28 },
                }}
                whileHover={
                  reduce
                    ? undefined
                    : {
                        y: -6,
                        transition: { type: 'spring', stiffness: 360, damping: 24 },
                      }
                }
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-surface-elevated/95 p-3.5 shadow-sm backdrop-blur-sm min-[340px]:rounded-2xl min-[340px]:p-5"
              >
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent opacity-0 transition group-hover:opacity-100"
                />
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-brand/10 opacity-0 blur-2xl transition duration-500 group-hover:opacity-100"
                />

                <div>
                  <div className="flex items-start justify-between gap-2 min-[340px]:gap-3">
                    <div className="flex min-w-0 items-center gap-2.5 min-[340px]:gap-3">
                      <motion.div
                        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-sm min-[340px]:h-12 min-[340px]:w-12 min-[340px]:rounded-2xl min-[340px]:text-base ${talent.avatarGradient}`}
                        whileHover={reduce ? undefined : { scale: 1.06, rotate: -2 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                      >
                        {talent.initials}
                        <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-elevated bg-emerald-400 min-[340px]:h-3 min-[340px]:w-3" />
                      </motion.div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate text-sm font-semibold text-foreground min-[340px]:text-base">
                            {talent.name}
                          </h3>
                          <span title="Verified Professional">
                            <BadgeCheck className="h-3.5 w-3.5 fill-brand/20 text-brand min-[340px]:h-4 min-[340px]:w-4" />
                          </span>
                        </div>
                        <p className="line-clamp-2 text-[11px] font-medium text-muted min-[340px]:text-xs">
                          {talent.role}
                        </p>
                      </div>
                    </div>

                    <motion.div
                      className="flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-surface px-2 py-0.5 text-[11px] font-semibold text-foreground min-[340px]:px-2.5 min-[340px]:py-1 min-[340px]:text-xs"
                      whileHover={reduce ? undefined : { scale: 1.05 }}
                    >
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{talent.rating}</span>
                    </motion.div>
                  </div>

                  <motion.div
                    className="mt-3 rounded-xl border border-border/60 bg-surface/70 p-2.5 min-[340px]:mt-4 min-[340px]:p-3"
                    initial={false}
                    whileHover={reduce ? undefined : { backgroundColor: 'var(--surface)' }}
                  >
                    <p className="text-[10px] font-semibold text-brand min-[340px]:text-[11px]">
                      {talent.experience}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-foreground/85 min-[340px]:text-xs">
                      &ldquo;{talent.highlight}&rdquo;
                    </p>
                  </motion.div>

                  <div className="mt-3 flex flex-wrap gap-1.5 min-[340px]:mt-3.5">
                    {talent.skills.map((skill, skillIndex) => (
                      <motion.span
                        key={skill}
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 + skillIndex * 0.03, duration: 0.25 }}
                        className="rounded-lg border border-border/70 bg-surface px-1.5 py-0.5 text-[10px] font-medium text-foreground/90 min-[340px]:px-2 min-[340px]:text-[11px]"
                      >
                        {skill}
                      </motion.span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 border-t border-border/70 pt-3 min-[300px]:flex-row min-[300px]:items-center min-[300px]:justify-between min-[340px]:mt-6 min-[340px]:pt-3.5">
                  <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 min-[340px]:text-[11px] dark:text-emerald-400">
                    <motion.span
                      animate={
                        reduce || talent.availability !== 'Available Immediately'
                          ? undefined
                          : { scale: [1, 1.15, 1], opacity: [1, 0.7, 1] }
                      }
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                    </motion.span>
                    {talent.availability}
                  </span>

                  <motion.button
                    type="button"
                    onClick={() => open('hire')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline min-[340px]:text-xs"
                    whileHover={reduce ? undefined : { x: 3 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  >
                    Request candidate
                    <ArrowRight className="h-3.5 w-3.5" />
                  </motion.button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>

        <Reveal delay={0.12}>
          <div className="mt-8 text-center min-[340px]:mt-12">
            <p className="text-xs leading-relaxed text-muted min-[340px]:text-sm">
              Looking for a specific role or specialized tech stack?{' '}
              <button
                type="button"
                onClick={() => open('hire')}
                className="font-semibold text-brand underline underline-offset-4 hover:text-brand-strong"
              >
                Submit custom intake brief
              </button>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
