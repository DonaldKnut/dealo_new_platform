'use client';

import { motion } from 'framer-motion';
import { Bot, Clock3, TrendingDown, Users2 } from 'lucide-react';

import { Reveal } from './reveal';

const STATS = [
  {
    icon: Clock3,
    value: '3×',
    label: 'Faster time-to-hire',
    sub: 'vs. spreadsheet workflows',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10',
  },
  {
    icon: Bot,
    value: '94%',
    label: 'CVs auto-screened by AI',
    sub: 'No manual first pass needed',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    icon: TrendingDown,
    value: '60%',
    label: 'Drop in recruiter admin',
    sub: 'Scheduling, chasing & sorting',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Users2,
    value: '10k+',
    label: 'Candidates processed',
    sub: 'Across 400+ Nigerian companies',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
  },
] as const;

export function AtsStatsStrip() {
  return (
    <section className="relative border-y border-border/80 bg-gradient-to-r from-surface-elevated/60 via-surface/40 to-surface-elevated/60 backdrop-blur-sm">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-brand/8 blur-3xl" />
        <div className="absolute -right-32 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-violet-500/8 blur-3xl" />
      </div>

      <div className="container-page relative py-10 min-[340px]:py-14">
        <div className="grid grid-cols-2 gap-3 min-[340px]:gap-4 sm:gap-5 lg:grid-cols-4">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Reveal key={stat.label} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ duration: 0.22 }}
                  className="group relative flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface-elevated/80 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-brand/30 hover:shadow-lg min-[340px]:p-5"
                >
                  {/* Icon */}
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${stat.bg} ${stat.color} ring-1 ring-inset ring-current/10 transition-transform group-hover:scale-110`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  {/* Value */}
                  <div>
                    <p
                      className={`font-display text-2xl font-black tracking-tight ${stat.color} min-[340px]:text-3xl sm:text-4xl`}
                    >
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-foreground min-[340px]:text-sm">
                      {stat.label}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-muted min-[340px]:text-xs">
                      {stat.sub}
                    </p>
                  </div>

                  {/* Decorative line */}
                  <div
                    className={`absolute bottom-0 left-0 h-0.5 w-0 rounded-full transition-all duration-500 group-hover:w-full ${stat.bg.replace('/10', '/40')}`}
                  />
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

