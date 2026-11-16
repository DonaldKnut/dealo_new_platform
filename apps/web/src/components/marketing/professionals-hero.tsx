'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Briefcase, FileText, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

import { useLocale } from '@/components/i18n/locale-context';
import { cn } from '@/lib/utils';

const HERO_SLIDES = [
  {
    src: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1794675588/Professionals_standing_together___ea17387a_2K_mhujvl.jpg',
    alt: 'Office professionals standing together',
  },
  {
    src: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1794675588/Workers_standing_together_in_attire_afab3476_2K_y5sfrc.jpg',
    alt: 'Skilled trades workers on a worksite',
  },
  {
    src: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1794675588/Trade_and_office_workers_standing_2447b7b9_2K_a5nud0.jpg',
    alt: 'Trade and office professionals together',
  },
] as const;

export function ProfessionalsHero({
  actions,
}: {
  actions?: ReactNode;
}) {
  const { t } = useLocale();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_SLIDES.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative isolate min-h-[min(92svh,52rem)] overflow-hidden pt-[var(--safe-top)]">
      <div className="absolute inset-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={HERO_SLIDES[index].src}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src={HERO_SLIDES[index].src}
              alt={HERO_SLIDES[index].alt}
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover object-[center_28%]"
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-[#04140d]/72" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#04140d]/92 via-[#04140d]/55 to-[#04140d]/25" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#04140d] to-transparent" />
      </div>

      <div className="container-page relative z-10 flex min-h-[min(92svh,52rem)] flex-col justify-end pb-12 pt-28 min-[340px]:pb-16 sm:pb-20 sm:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="max-w-2xl"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b8ff9a] min-[340px]:text-[11px]">
            {t('pro.eyebrow')}
          </p>
          <h1 className="mt-3 font-display text-[1.85rem] leading-[1.05] tracking-tight text-white min-[340px]:text-4xl sm:text-5xl lg:text-[3.35rem]">
            {t('pro.title')}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75 min-[340px]:text-base sm:text-lg">
            {t('pro.body')}
          </p>

          <div className="mt-7 flex flex-col gap-2.5 min-[360px]:flex-row min-[360px]:flex-wrap">
            {actions ?? (
              <>
                <Link href="/auth/register" className="btn-primary justify-center shadow-lg shadow-black/30">
                  {t('pro.register')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  {t('pro.signIn')}
                </Link>
              </>
            )}
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2.5 text-[12px] text-white/70 sm:text-[13px]">
            {(
              [
                [ShieldCheck, 'pro.hero.trust'],
                [FileText, 'pro.hero.papers'],
                [Briefcase, 'pro.hero.jobs'],
              ] as const
            ).map(([Icon, key]) => (
              <li key={key} className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-[#b8ff9a]" aria-hidden />
                {t(key)}
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="mt-10 flex items-center gap-1.5">
          {HERO_SLIDES.map((slide, dotIndex) => (
            <button
              key={slide.src}
              type="button"
              aria-label={`Show slide ${dotIndex + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all',
                dotIndex === index ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70',
              )}
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
