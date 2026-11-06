'use client';

import { useState } from 'react';

import { companyColor } from '@/lib/jobs-api';
import { cn } from '@/lib/utils';

export function CompanyLogo({ name, src, className }: { name: string; src: string | null; className?: string }) {
  const [broken, setBroken] = useState(false);
  const initials = name
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

  if (src && !broken) {
    return (
      <span className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white', className)}>
        {/* Logos come from many job sites, so a plain img avoids listing every host for next/image. */}
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="h-full w-full object-contain p-1" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white', className)}
      style={{ background: `linear-gradient(140deg, ${companyColor(name)}, color-mix(in srgb, ${companyColor(name)} 55%, #000))` }}
    >
      {initials || '•'}
    </span>
  );
}
