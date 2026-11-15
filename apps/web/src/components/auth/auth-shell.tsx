'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

import { BrandLogo } from '@/components/brand-logo';
import { PromoFlyer } from '@/components/illustrations/promo-flyer';
import { ThemeToggle } from '@/components/theme-toggle';
import { PROMO_FLYER_IMAGES } from '@/lib/promo-images';

const slides = [
  {
    eyebrow: 'Direct recruitment',
    title: 'Hire people onto your team, step by step.',
    body: 'Tell us the role. We find, check, shortlist, interview, and place.',
  },
  {
    eyebrow: 'For job seekers',
    title: 'Get seen by employers who are hiring now.',
    body: 'Build your profile once. Dealo matches you to real roles in office work and skilled trades.',
  },
  {
    eyebrow: 'Managed staffing',
    title: 'Let Dealo run staffing for your team.',
    body: 'Clear terms. Dealo handles hiring and stays with you after placement.',
  },
  {
    eyebrow: 'Free CV builder',
    title: 'A CV that gets you shortlisted.',
    body: 'Make a clean CV in minutes, apply to jobs and track every application in one place.',
  },
] as const;

export function AuthShell({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  const slide = slides[index];

  return (
    <div className="flex h-svh max-h-svh overflow-hidden bg-background text-foreground">
      <aside className="relative hidden h-svh w-[46%] shrink-0 overflow-hidden lg:block xl:w-[48%]">
        <PromoFlyer
          className="absolute inset-0"
          index={index % PROMO_FLYER_IMAGES.length}
          showDots={false}
          objectPosition="center 18%"
          sizes="(max-width: 1024px) 0px, 50vw"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071f14]/92 via-[#071f14]/55 to-[#071f14]/35" />
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:22px_22px]" />

        <div className="relative z-10 flex h-full flex-col justify-between p-8 xl:p-10">
          <BrandLogo force="dark" href="/" priority />

          <div className="max-w-md text-white">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.eyebrow}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45 }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-100">
                  {slide.eyebrow}
                </p>
                <h2 className="mt-4 font-display text-3xl leading-tight xl:text-4xl">
                  {slide.title}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-lime-50/90 xl:text-base">
                  {slide.body}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex gap-2">
              {slides.map((item, i) => (
                <button
                  key={item.eyebrow}
                  type="button"
                  aria-label={`Show slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? 'w-8 bg-white' : 'w-3 bg-white/35'
                  }`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          </div>

          <p className="text-xs text-white/70">Dealo Talent Network · Nigeria</p>
        </div>
      </aside>

      <section className="relative flex h-svh min-w-0 flex-1 flex-col overflow-hidden">
        {/* Desktop chrome — unchanged */}
        <div className="hidden shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 min-[340px]:px-5 sm:px-8 lg:flex">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Link>
          <ThemeToggle />
        </div>

        {/* Mobile: minimal top bar — theme only; logo lives in the header block */}
        <div className="flex shrink-0 items-center justify-end px-4 pt-3 lg:hidden">
          <ThemeToggle />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 min-[340px]:px-6 sm:px-8 sm:py-10 lg:py-10">
          <div className="mx-auto w-full max-w-md pb-10 lg:pb-10">{children}</div>
        </div>
      </section>
    </div>
  );
}

export function AuthPageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center lg:text-left">
      <div className="mb-5 flex justify-center lg:hidden">
        <BrandLogo href="/" />
      </div>
      <p className="eyebrow hidden lg:block">{eyebrow}</p>
      <h1 className="font-display text-[1.85rem] leading-tight tracking-tight text-foreground min-[340px]:text-3xl sm:text-4xl lg:display-title lg:mt-2">
        {title}
      </h1>
      <p className="mt-3 hidden text-sm leading-relaxed text-muted sm:text-base lg:block">{subtitle}</p>
    </div>
  );
}
