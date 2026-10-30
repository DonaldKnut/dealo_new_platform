'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

import { Reveal } from '@/components/marketing/reveal';

export function FeatureAdGrid({
  eyebrow,
  title,
  description,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: Array<{ icon: LucideIcon; title: string; body: string }>;
}) {
  return (
    <section className="container-page py-12 min-[340px]:py-16 sm:py-20 lg:py-24">
      <Reveal>
        <div className="max-w-2xl">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="display-title mt-3 text-[1.55rem] text-foreground min-[340px]:text-3xl sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted min-[340px]:mt-4 min-[340px]:text-base sm:text-lg">
            {description}
          </p>
        </div>
      </Reveal>

      <div className="mt-8 grid gap-3 min-[340px]:mt-12 min-[340px]:gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <Reveal key={item.title} delay={index * 0.05}>
              <motion.article
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25 }}
                className="group relative overflow-hidden rounded-[1.15rem] border border-border/80 bg-surface-elevated/85 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-brand/50 hover:shadow-xl min-[340px]:rounded-[1.5rem] min-[340px]:p-6"
              >
                {/* Hover shine effect */}
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <div className="spotlight-sheen absolute inset-0" />
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand shadow-sm transition-transform duration-300 group-hover:scale-110 min-[340px]:h-12 min-[340px]:w-12 min-[340px]:rounded-2xl">
                  <Icon className="h-5 w-5 min-[340px]:h-6 min-[340px]:w-6" />
                </div>

                <h3 className="mt-4 font-display text-lg font-semibold text-foreground min-[340px]:mt-5 min-[340px]:text-xl">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted min-[340px]:mt-2 min-[340px]:text-sm">
                  {item.body}
                </p>

                <div className="mt-4 h-0.5 w-8 rounded-full bg-border transition-all duration-300 group-hover:w-16 group-hover:bg-brand min-[340px]:mt-5" />
              </motion.article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
