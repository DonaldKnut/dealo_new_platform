'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { DARK_LOGO, LIGHT_LOGO } from '@/lib/brand';
import { cn } from '@/lib/utils';

export function BrandLogo({
  href = '/',
  className = '',
  priority = false,
  force = 'auto',
}: {
  href?: string;
  className?: string;
  priority?: boolean;
  force?: 'auto' | 'light' | 'dark';
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark =
    force === 'dark' || (force === 'auto' && mounted && resolvedTheme === 'dark');
  const src = isDark ? DARK_LOGO : LIGHT_LOGO;

  return (
    <Link
      href={href}
      className={cn('inline-flex shrink-0 items-center', className)}
      aria-label="Dealo home"
    >
      <Image
        src={src}
        alt="Dealo Talent Network"
        width={isDark ? 160 : 200}
        height={isDark ? 48 : 56}
        priority={priority}
        className={cn(
          'w-auto object-contain object-left',
          isDark
            ? 'h-8 min-[230px]:h-9 min-[340px]:h-11 sm:h-12'
            : 'h-8 min-[230px]:h-9 min-[340px]:h-11 sm:h-12 lg:h-[3.25rem]',
        )}
      />
    </Link>
  );
}
