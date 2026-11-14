'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { PROMO_FLYER_IMAGES, type PromoImage } from '@/lib/promo-images';
import { cn } from '@/lib/utils';

export function PromoFlyer({
  className,
  intervalMs = 4200,
  showDots = true,
  objectPosition = 'center 22%',
  sizes = '(max-width: 1024px) 100vw, 48vw',
  images = PROMO_FLYER_IMAGES,
  index: controlledIndex,
  onIndexChange,
}: {
  className?: string;
  intervalMs?: number;
  showDots?: boolean;
  objectPosition?: string;
  sizes?: string;
  images?: readonly PromoImage[];
  index?: number;
  onIndexChange?: (index: number) => void;
}) {
  const [internalIndex, setInternalIndex] = useState(0);
  const isControlled = controlledIndex !== undefined;
  const safeIndex = images.length ? (isControlled ? controlledIndex : internalIndex) % images.length : 0;
  const index = safeIndex;

  useEffect(() => {
    if (isControlled || images.length < 2) return;
    const timer = window.setInterval(() => {
      setInternalIndex((current) => (current + 1) % images.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, isControlled, images.length]);

  const setIndex = (next: number) => {
    if (isControlled) onIndexChange?.(next);
    else setInternalIndex(next);
  };

  if (!images.length) return null;

  return (
    <div className={cn('relative h-full min-h-full w-full overflow-hidden', className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={images[index].src}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.05, x: 36 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 1.02, x: -28 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src={images[index].src}
            alt={images[index].alt}
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
          {images.map((image, dotIndex) => (
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
