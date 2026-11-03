'use client';

import { motion } from 'framer-motion';

import { PromoFlyer } from '@/components/illustrations/promo-flyer';

export function HireIllustration() {
  return (
    <div className="relative h-full min-h-full w-full overflow-hidden">
      <PromoFlyer sizes="(max-width: 1024px) 0px, 480px" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#071f14]/70 to-transparent" />
    </div>
  );
}

export function AuthIllustration() {
  return (
    <div className="relative h-full min-h-full w-full overflow-hidden">
      <PromoFlyer sizes="(max-width: 1024px) 0px, 480px" intervalMs={4800} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#071f14]/75 to-transparent" />
    </div>
  );
}

export function ContactIllustration() {
  return (
    <svg viewBox="0 0 360 420" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="contactGlow" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--brand-soft)" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="360" height="420" fill="url(#contactGlow)" rx="28" />
      <motion.rect
        x="70"
        y="110"
        width="220"
        height="160"
        rx="24"
        fill="var(--surface-elevated)"
        initial={{ rotate: -4, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.path
        d="M90 140h180M90 170h140M90 200h160"
        stroke="var(--brand)"
        strokeWidth="8"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3, duration: 0.7 }}
      />
      <motion.circle
        cx="260"
        cy="300"
        r="36"
        fill="var(--brand)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 180 }}
      />
    </svg>
  );
}
