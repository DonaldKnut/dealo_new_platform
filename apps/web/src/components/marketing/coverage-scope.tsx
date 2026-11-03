'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BrickWall,
  BriefcaseBusiness,
  Calculator,
  ClipboardList,
  Code2,
  Droplets,
  Flame,
  Hammer,
  HardHat,
  MessageCircleQuestion,
  ShieldCheck,
  Sparkles,
  Timer,
  UsersRound,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useRef, type PointerEvent, type ReactNode } from 'react';

import type { TranslationKey } from '@/components/i18n/dictionaries';
import { useLocale } from '@/components/i18n/locale-context';
import { useModal } from '@/components/modals/modal-context';
import { cn } from '@/lib/utils';

import { MarketingPill } from './marketing-pill';
import { MarketingSection } from './marketing-section';
import { Reveal } from './reveal';

const OFFICE_IMAGE =
  'https://res.cloudinary.com/dyaetoldv/image/upload/v1793439563/Professionals_standing_in_modern__f14ac16f_2K_qq0tqz.jpg';

const OFFICE_ROLES: { key: TranslationKey; icon: LucideIcon }[] = [
  { key: 'home.scope.office.1', icon: ClipboardList },
  { key: 'home.scope.office.2', icon: Calculator },
  { key: 'home.scope.office.3', icon: Code2 },
  { key: 'home.scope.office.4', icon: UsersRound },
];

const TRADE_ROLES: { key: TranslationKey; icon: LucideIcon }[] = [
  { key: 'home.scope.trades.1', icon: BrickWall },
  { key: 'home.scope.trades.2', icon: Zap },
  { key: 'home.scope.trades.3', icon: Droplets },
  { key: 'home.scope.trades.4', icon: Flame },
  { key: 'home.scope.trades.5', icon: Hammer },
  { key: 'home.scope.trades.6', icon: HardHat },
];

/** Card with a soft light that follows the pointer. */
function SpotlightCard({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    node.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
  }, []);

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={cn(
        'group/spot relative isolate h-full overflow-hidden rounded-[1.5rem] border border-border/80 min-[340px]:rounded-[2rem]',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{
          background:
            'radial-gradient(420px circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in srgb, var(--brand) 18%, transparent), transparent 60%)',
        }}
      />
      {children}
    </div>
  );
}

function RoleChip({
  label,
  icon: Icon,
  index,
  tone,
}: {
  label: string;
  icon: LucideIcon;
  index: number;
  tone: 'dark' | 'light';
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: 0.15 + index * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className={cn(
        'group/chip flex min-w-0 items-center gap-2 rounded-2xl border px-2.5 py-2 text-[13px] font-medium backdrop-blur-md transition-colors duration-300 min-[340px]:gap-2.5 min-[340px]:px-3 min-[340px]:py-2.5 min-[340px]:text-sm',
        tone === 'dark'
          ? 'border-white/15 bg-white/10 text-white hover:border-white/35 hover:bg-white/20'
          : 'border-border bg-surface-elevated/85 text-foreground hover:border-brand/40 hover:bg-brand-soft/60',
      )}
    >
      <span
        className={cn(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover/chip:-rotate-6 group-hover/chip:scale-110 min-[340px]:h-8 min-[340px]:w-8',
          tone === 'dark' ? 'bg-white/15 text-[#a8ff70]' : 'bg-brand-soft text-brand',
        )}
      >
        <Icon className="h-3.5 w-3.5 min-[340px]:h-4 min-[340px]:w-4" />
      </span>
      <span className="min-w-0 break-words leading-snug">{label}</span>
    </motion.li>
  );
}

function TradeOrbit() {
  const reduceMotion = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 opacity-70 min-[340px]:h-40 min-[340px]:w-40 sm:-right-4 sm:-top-4 sm:h-44 sm:w-44">
      <motion.div
        className="absolute inset-0 rounded-full border border-dashed border-brand/30"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        {TRADE_ROLES.map(({ icon: Icon, key }, index) => {
          const angle = (index / TRADE_ROLES.length) * Math.PI * 2;
          return (
            <span
              key={key}
              className="absolute inline-flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface-elevated text-brand shadow-sm"
              style={{ left: `${50 + Math.cos(angle) * 50}%`, top: `${50 + Math.sin(angle) * 50}%` }}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
          );
        })}
      </motion.div>
      <div className="absolute inset-[28%] rounded-full bg-[radial-gradient(circle,var(--hero-glow),transparent_70%)]" />
    </div>
  );
}

export function CoverageScope() {
  const { open } = useModal();
  const { t } = useLocale();

  const stats = [
    { icon: BriefcaseBusiness, value: '10', label: t('home.scope.stat.roles') },
    { icon: ShieldCheck, value: '100%', label: t('home.scope.stat.checked') },
    { icon: Timer, value: '48h', label: t('home.scope.stat.fast') },
  ];

  return (
    <MarketingSection className="bg-surface/40">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[min(60rem,140%)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,var(--hero-glow),transparent_65%)]"
      />

      <div className="relative z-10">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <MarketingPill icon={Sparkles}>{t('home.scope.pill')}</MarketingPill>
            <h2 className="display-title mt-3 text-[1.5rem] leading-tight text-foreground min-[340px]:mt-4 min-[340px]:text-3xl sm:text-5xl">
              {t('home.scope.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted min-[340px]:mt-4 min-[340px]:text-base">
              {t('home.scope.body')}
            </p>
          </div>
        </Reveal>

        <div className="mt-8 grid grid-cols-1 gap-3 min-[340px]:mt-12 min-[340px]:gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <Reveal className="h-full">
            <SpotlightCard className="min-h-[22rem] bg-[#071f14] text-white">
              <Image
                src={OFFICE_IMAGE}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover opacity-55 transition-transform duration-[1.6s] ease-out group-hover/spot:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071f14] via-[#071f14]/75 to-[#071f14]/20" />
              <div className="relative z-10 flex h-full flex-col justify-end p-4 min-[340px]:p-7">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-[#a8ff70] backdrop-blur-md">
                  <BriefcaseBusiness className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-2xl font-semibold min-[340px]:text-3xl">
                  {t('home.scope.office')}
                </h3>
                <p className="mt-1 text-sm text-white/75">{t('home.scope.office.desc')}</p>
                <ul className="mt-5 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                  {OFFICE_ROLES.map((role, index) => (
                    <RoleChip key={role.key} label={t(role.key)} icon={role.icon} index={index} tone="dark" />
                  ))}
                </ul>
              </div>
            </SpotlightCard>
          </Reveal>

          <Reveal delay={0.08} className="h-full">
            <SpotlightCard className="min-h-[22rem] bg-surface-elevated">
              <TradeOrbit />
              <div className="relative z-10 flex h-full flex-col justify-end p-4 min-[340px]:p-7">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/25 dark:text-[#071f14]">
                  <HardHat className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-2xl font-semibold text-foreground min-[340px]:text-3xl">
                  {t('home.scope.trades')}
                </h3>
                <p className="mt-1 text-sm text-muted">{t('home.scope.trades.desc')}</p>
                <ul className="mt-5 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                  {TRADE_ROLES.map((role, index) => (
                    <RoleChip key={role.key} label={t(role.key)} icon={role.icon} index={index} tone="light" />
                  ))}
                </ul>
              </div>
            </SpotlightCard>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-3 grid grid-cols-1 gap-3 min-[340px]:mt-4 min-[340px]:gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="grid grid-cols-3 divide-x divide-border rounded-[1.5rem] border border-border bg-surface-elevated/90 py-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + index * 0.08, duration: 0.4 }}
                    className="flex min-w-0 flex-col items-center px-1.5 text-center min-[340px]:px-3"
                  >
                    <Icon className="h-4 w-4 text-brand" />
                    <p className="mt-1.5 font-display text-lg font-semibold text-foreground min-[340px]:text-2xl">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-muted min-[340px]:text-xs">{stat.label}</p>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex flex-col gap-4 rounded-[1.5rem] border border-dashed border-brand/35 bg-brand-soft/30 p-4 min-[340px]:p-5 sm:flex-row sm:items-center">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-elevated text-brand">
                <MessageCircleQuestion className="h-5 w-5" />
              </span>
              <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">{t('home.scope.outside')}</p>
              <button
                type="button"
                className="btn-secondary shrink-0 bg-surface-elevated"
                onClick={() => open('contact')}
              >
                {t('home.scope.ask')}
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-2.5 min-[400px]:flex-row min-[400px]:items-center min-[340px]:mt-10">
            <button type="button" className="btn-primary group" onClick={() => open('hire')}>
              {t('home.scope.cta')}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <Link href="/how-it-works" className="btn-secondary">
              {t('home.scope.link')}
            </Link>
          </div>
        </Reveal>
      </div>
    </MarketingSection>
  );
}
