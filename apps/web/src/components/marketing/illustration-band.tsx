'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { Reveal } from '@/components/marketing/reveal';

export function IllustrationBand({
  eyebrow,
  title,
  description,
  illustration,
  reverse = false,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  illustration: ReactNode;
  reverse?: boolean;
  actions?: ReactNode;
}) {
  return (
    <section className="container-page py-10 min-[340px]:py-14 sm:py-16">
      <div
        className={`grid items-center gap-6 min-[340px]:gap-8 lg:grid-cols-2 lg:gap-14 ${
          reverse ? 'lg:[&>*:first-child]:order-2' : ''
        }`}
      >
        <Reveal>
          <p className="eyebrow text-[10px] min-[340px]:text-xs">{eyebrow}</p>
          <h2 className="display-title mt-2 text-[1.55rem] leading-tight text-foreground min-[340px]:mt-3 min-[340px]:text-3xl sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted min-[340px]:mt-4 min-[340px]:text-base">
            {description}
          </p>
          {actions ? (
            <div className="mt-5 flex flex-col gap-2.5 min-[340px]:mt-7 min-[340px]:gap-3 min-[400px]:flex-row">
              {actions}
            </div>
          ) : null}
        </Reveal>
        <Reveal delay={0.08}>
          <motion.div
            className="relative min-h-[180px] overflow-hidden rounded-[1.15rem] border border-border bg-[linear-gradient(145deg,var(--brand-soft),transparent_55%)] p-4 min-[340px]:min-h-[260px] min-[340px]:rounded-[1.5rem] min-[340px]:p-6 sm:min-h-[300px] sm:p-8"
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_1px_1px,color-mix(in_srgb,var(--brand)_16%,transparent)_1px,transparent_0)] [background-size:20px_20px]" />
            <div className="relative flex h-full min-h-[140px] items-center justify-center min-[340px]:min-h-[180px] sm:min-h-[220px]">
              {illustration}
            </div>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
