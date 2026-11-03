'use client';

import { motion } from 'framer-motion';
import { Award, Clock, ShieldCheck, Users } from 'lucide-react';

import { Reveal } from '@/components/marketing/reveal';

const DEFAULT_ICONS = [Clock, ShieldCheck, Award, Users];

export function StatAdvert({
  items,
}: {
  items: Array<{ value: string; label: string; sub?: string }>;
}) {
  return (
    <section className="relative border-y border-border/80 bg-surface/70 backdrop-blur-sm">
      <div className="container-page py-7 min-[340px]:py-10 sm:py-12">
        <div className="card-grid grid gap-3 min-[340px]:gap-4 min-[480px]:grid-cols-3 sm:gap-6">
          {items.map((item, index) => {
            const Icon = DEFAULT_ICONS[index % DEFAULT_ICONS.length];
            return (
              <Reveal key={item.label} delay={index * 0.07} className="h-full">
                <motion.div
                  whileHover={{ y: -3 }}
                  className="ui-card group relative min-h-[8.5rem] overflow-hidden p-3.5 shadow-sm transition-all duration-300 hover:border-brand/40 hover:shadow-md min-[340px]:min-h-[9.5rem] min-[340px]:p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand transition-transform group-hover:scale-110 min-[340px]:h-10 min-[340px]:w-10">
                      <Icon className="h-4 w-4 min-[340px]:h-5 min-[340px]:w-5" />
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
                  </div>

                  <p className="mt-3 font-display text-xl font-bold tracking-tight text-foreground min-[340px]:mt-4 min-[340px]:text-2xl sm:text-3xl">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs font-medium text-foreground/80 min-[340px]:text-sm">
                    {item.label}
                  </p>
                  {item.sub ? (
                    <p className="mt-1 text-[11px] leading-relaxed text-muted min-[340px]:text-xs">
                      {item.sub}
                    </p>
                  ) : null}
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
