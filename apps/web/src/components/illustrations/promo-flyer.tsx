'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { PROMO_FLYER_IMAGES } from '@/lib/promo-images';
import { cn } from '@/lib/utils';

export function PromoFlyer({
  className,
  intervalMs = 4200,
  showDots = true,
  objectPosition = 'center 22%',
  sizes = '(max-width: 1024px) 100vw, 48vw',
  index: controlledIndex,
  onIndexChange,
}: {
  className?: string;
  intervalMs?: number;
  showDots?: boolean;
  objectPosition?: string;
  sizes?: string;
  index?: number;
  onIndexChange?: (index: number) => void;
}) {
  const [internalIndex, setInternalIndex] = useState(0);
  const isControlled = controlledIndex !== undefined;
  const index = isControlled ? controlledIndex : internalIndex;

  useEffect(() => {
    if (isControlled) return;
    const timer = window.setInterval(() => {
      setInternalIndex((current) => (current + 1) % PROMO_FLYER_IMAGES.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, isControlled]);

  const setIndex = (next: number) => {
    if (isControlled) onIndexChange?.(next);
    else setInternalIndex(next);
  };

  return (
    <div className={cn('relative h-full min-h-full w-full overflow-hidden', className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={PROMO_FLYER_IMAGES[index].src}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.05, x: 36 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 1.02, x: -28 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src={PROMO_FLYER_IMAGES[index].src}
            alt={PROMO_FLYER_IMAGES[index].alt}
            fill
            sizes={sizes}
            className="object-cover"
            style={{ objectPosition }}
            priority={index === 0}
          />
        </motion.div>
      </AnimatePresence>

      {showDots ? (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
          {PROMO_FLYER_IMAGES.map((image, dotIndex) => (
            <button
              key={image.src}
              type="button"
              aria-label={`Show promo image ${dotIndex + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                dotIndex === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
              }`}
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
