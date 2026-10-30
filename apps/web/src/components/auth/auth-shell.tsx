'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';

const slides = [
  {
    eyebrow: 'Direct recruitment',
    title: 'Hire into your structure with a clear operating path.',
    body: 'Role brief → sourcing → screening → shortlist → interviews → placement.',
    gradient:
      'linear-gradient(145deg, rgba(12,44,26,0.95), rgba(7,31,20,0.92)), radial-gradient(circle at 80% 20%, rgba(124,255,77,0.35), transparent 42%)',
  },
  {
    eyebrow: 'Managed staffing',
    title: 'Let Dealo run staffing operations for your team.',
    body: 'Agreed commercial terms, platform-led hiring, and accountable follow-through.',
    gradient:
      'linear-gradient(160deg, rgba(18,56,37,0.96), rgba(7,31,20,0.94)), radial-gradient(circle at 20% 80%, rgba(157,255,107,0.32), transparent 42%)',
  },
  {
    eyebrow: 'Talent network',
    title: 'Professionals ready for serious administrative roles.',
    body: 'Trusted profiles, screened shortlists, and interview clarity in one workspace.',
    gradient:
      'linear-gradient(135deg, rgba(7,31,20,0.96), rgba(15,61,34,0.9)), radial-gradient(circle at 70% 60%, rgba(124,255,77,0.38), transparent 45%)',
  },
];

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
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.title}
            className="absolute inset-0"
            style={{ background: slide.gradient }}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:22px_22px]" />

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
                <h2 className="mt-4 font-display text-3xl leading-tight xl:text-4xl">{slide.title}</h2>
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
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 min-[340px]:px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition hover:text-foreground lg:hidden"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="lg:hidden">
              <BrandLogo href="/" />
            </div>
            <Link
              href="/"
              className="hidden items-center gap-2 text-sm text-muted transition hover:text-foreground lg:inline-flex"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to site
            </Link>
          </div>
          <ThemeToggle />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-8 min-[340px]:px-5 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-md pb-10">{children}</div>
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
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display-title mt-2 text-3xl text-foreground sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{subtitle}</p>
    </div>
  );
}
