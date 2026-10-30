'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { CtaRow } from './cta-row';
import { HeroOrbs } from './hero-orbs';

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden pt-[4.25rem] min-[340px]:pt-[4.75rem] sm:pt-20">
      <HeroOrbs size="compact" />
      <div className="container-page relative py-8 min-[340px]:py-14 sm:py-16 lg:py-20">
        <motion.p
          className="eyebrow text-[10px] min-[340px]:text-xs"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          {eyebrow}
        </motion.p>
        <motion.h1
          className="display-title mt-2 max-w-3xl text-[1.55rem] leading-tight text-foreground min-[340px]:mt-3 min-[340px]:text-4xl sm:text-5xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
        >
          {title}
        </motion.h1>
        <motion.p
          className="mt-3 max-w-2xl text-xs leading-relaxed text-muted min-[340px]:mt-5 min-[340px]:text-base sm:text-lg"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
        >
          {description}
        </motion.p>
        {actions ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
          >
            <CtaRow className="mt-5 min-[340px]:mt-7">{actions}</CtaRow>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
