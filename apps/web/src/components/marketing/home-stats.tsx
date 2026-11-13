'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Award, Clock, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useLocale } from '@/components/i18n/locale-context';
import { cn } from '@/lib/utils';

const ICONS = [Clock, ShieldCheck, Award] as const;

function StatValue({ value, active }: { value: string; active: boolean }) {
  const reduce = useReducedMotion();
  const numeric = value.match(/([\d.]+)/);
  const prefix = value.slice(0, value.indexOf(numeric?.[1] ?? ''));
  const suffix = numeric ? value.slice(value.indexOf(numeric[1]) + numeric[1].length) : '';
  const target = numeric ? Number(numeric[1]) : null;
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!active || target === null || reduce) {
      setN(target ?? 0);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 1100 + Math.random() * 500;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, reduce]);

  if (target === null) {
    return (
      <motion.span animate={reduce || !active ? undefined : { y: [0, -3, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}>
        {value}
      </motion.span>
    );
  }

  const decimals = numeric![1].includes('.') ? numeric![1].split('.')[1].length : 0;
  const shown = decimals ? n.toFixed(decimals) : String(Math.round(n));

  return (
    <motion.span animate={reduce || !active ? undefined : { y: [0, -4, 0] }} transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut' }}>
      {prefix}
      {shown}
      {suffix}
    </motion.span>
  );
}

export function HomeStats() {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  const items = [
    { value: t('home.stat.1.value'), label: t('home.stat.1.label'), sub: t('home.stat.1.sub') },
    { value: t('home.stat.2.value'), label: t('home.stat.2.label'), sub: t('home.stat.2.sub') },
    { value: t('home.stat.3.value'), label: t('home.stat.3.label'), sub: t('home.stat.3.sub') },
  ];

  return (
    <section ref={ref} className="relative border-y border-border/80 bg-surface/70 backdrop-blur-sm">
      <div className="container-page py-7 min-[340px]:py-10 sm:py-12">
        <div className="card-grid grid gap-3 min-[340px]:gap-4 min-[480px]:grid-cols-3 sm:gap-6">
          {items.map((item, index) => {
            const Icon = ICONS[index % ICONS.length];
            return (
              <motion.div
                key={item.label}
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={inView ? { opacity: 1, y: 0 } : undefined}
                transition={{ delay: index * 0.14, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'ui-card group relative min-h-[8.5rem] overflow-hidden p-3.5 shadow-sm min-[340px]:min-h-[9.5rem] min-[340px]:p-5',
                )}
              >
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand/10 blur-2xl"
                  animate={reduce || !inView ? undefined : { opacity: [0.35, 0.7, 0.35], scale: [1, 1.12, 1] }}
                  transition={{ duration: 3.4 + index * 0.4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.35 }}
                />
                <div className="relative flex items-center justify-between gap-3">
                  <motion.span
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand min-[340px]:h-10 min-[340px]:w-10"
                    animate={reduce || !inView ? undefined : { rotate: [0, -6, 6, 0] }}
                    transition={{ duration: 5 + index, repeat: Infinity, ease: 'easeInOut', delay: index * 0.5 }}
                  >
                    <Icon className="h-4 w-4 min-[340px]:h-5 min-[340px]:w-5" />
                  </motion.span>
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                    animate={reduce || !inView ? undefined : { scale: [1, 1.35, 1], opacity: [0.55, 1, 0.55] }}
                    transition={{ duration: 1.8 + index * 0.25, repeat: Infinity }}
                  />
                </div>

                <p className="relative mt-3 font-display text-xl font-bold tracking-tight text-foreground min-[340px]:mt-4 min-[340px]:text-2xl sm:text-3xl">
                  <StatValue value={item.value} active={inView} />
                </p>
                <p className="relative mt-1 text-xs font-medium text-foreground/80 min-[340px]:text-sm">{item.label}</p>
                {item.sub ? (
                  <p className="relative mt-1 text-[11px] leading-relaxed text-muted min-[340px]:text-xs">{item.sub}</p>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
