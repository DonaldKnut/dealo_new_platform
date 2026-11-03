'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export type SliderImage = {
  src: string;
  alt: string;
};

export function ImageSlider({
  images,
  className,
  intervalMs = 4500,
  aspectClassName = 'aspect-[16/9] min-[340px]:aspect-[21/9]',
  roundedClassName = 'rounded-[1.25rem] min-[340px]:rounded-[1.75rem]',
  priority = false,
}: {
  images: SliderImage[];
  className?: string;
  intervalMs?: number;
  aspectClassName?: string;
  roundedClassName?: string;
  priority?: boolean;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);

  useEffect(() => {
    if (reduce || images.length < 2) return;
    const timer = window.setInterval(() => {
      setDir(1);
      setIndex((current) => (current + 1) % images.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [images.length, intervalMs, reduce]);

  if (images.length === 0) return null;

  const goTo = (next: number) => {
    setDir(next > index ? 1 : -1);
    setIndex(next);
  };

  return (
    <div className={cn('relative overflow-hidden', roundedClassName, className)}>
      <div className={cn('relative w-full overflow-hidden', aspectClassName)}>
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={images[index].src}
            custom={dir}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={images[index].src}
              alt={images[index].alt}
              fill
              sizes="(max-width: 768px) 100vw, 1120px"
              className="object-cover object-center"
              priority={priority && index === 0}
            />
          </motion.div>
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/35 via-transparent to-background/10" />
      </div>

      {images.length > 1 ? (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 min-[340px]:bottom-4">
          {images.map((image, dotIndex) => (
            <button
              key={image.src}
              type="button"
              aria-label={`Show slide ${dotIndex + 1}`}
              onClick={() => goTo(dotIndex)}
              className={`h-1.5 rounded-full transition-all ${
                dotIndex === index ? 'w-5 bg-white shadow-sm' : 'w-1.5 bg-white/55 hover:bg-white/85'
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
