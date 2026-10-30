'use client';

import { motion } from 'framer-motion';

export function AnimatedHamburger({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border min-[340px]:h-10 min-[340px]:w-10 lg:hidden"
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      onClick={onToggle}
    >
      <span className="relative block h-3.5 w-4">
        <motion.span
          className="absolute left-0 top-0 block h-0.5 w-4 rounded-full bg-foreground"
          animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        />
        <motion.span
          className="absolute left-0 top-[6px] block h-0.5 w-4 rounded-full bg-foreground"
          animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.18 }}
        />
        <motion.span
          className="absolute left-0 top-[12px] block h-0.5 w-4 rounded-full bg-foreground"
          animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        />
      </span>
    </button>
  );
}
