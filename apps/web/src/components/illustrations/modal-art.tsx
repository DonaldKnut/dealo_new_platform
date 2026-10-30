'use client';

import { motion } from 'framer-motion';

export function HireIllustration() {
  return (
    <svg viewBox="0 0 360 420" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="hireGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <rect width="360" height="420" fill="url(#hireGlow)" rx="28" />
      <motion.circle
        cx="180"
        cy="150"
        r="58"
        fill="var(--surface-elevated)"
        stroke="var(--brand)"
        strokeWidth="2"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7 }}
      />
      <motion.rect
        x="88"
        y="230"
        width="184"
        height="22"
        rx="11"
        fill="var(--brand)"
        initial={{ width: 0 }}
        animate={{ width: 184 }}
        transition={{ delay: 0.25, duration: 0.6 }}
      />
      <motion.rect
        x="108"
        y="268"
        width="144"
        height="14"
        rx="7"
        fill="var(--surface-elevated)"
        opacity="0.7"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 0.45 }}
      />
      <motion.g
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.55 }}
      >
        <rect x="70" y="310" width="70" height="54" rx="14" fill="var(--surface-elevated)" />
        <rect x="145" y="310" width="70" height="54" rx="14" fill="var(--surface-elevated)" />
        <rect x="220" y="310" width="70" height="54" rx="14" fill="var(--surface-elevated)" />
      </motion.g>
    </svg>
  );
}

export function AuthIllustration() {
  return (
    <svg viewBox="0 0 360 420" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="authGlow" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect width="360" height="420" fill="url(#authGlow)" rx="28" />
      <motion.path
        d="M180 90c-42 0-76 34-76 76v34h152v-34c0-42-34-76-76-76z"
        fill="var(--surface-elevated)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
      />
      <motion.rect
        x="112"
        y="200"
        width="136"
        height="150"
        rx="22"
        fill="var(--surface-elevated)"
        stroke="var(--brand)"
        strokeWidth="2"
        initial={{ y: 230, opacity: 0 }}
        animate={{ y: 200, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.55 }}
      />
      <motion.circle
        cx="180"
        cy="270"
        r="16"
        fill="var(--brand)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.45, type: 'spring' }}
      />
    </svg>
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
