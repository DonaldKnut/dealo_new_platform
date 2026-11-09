import {
  Banknote,
  Bot,
  Briefcase,
  HardHat,
  Newspaper,
  Scale,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useId } from 'react';

import { cn } from '@/lib/utils';

const PALETTES = [
  'from-[#0f766e] via-[#115e59] to-[#042f2e]',
  'from-[#4338ca] via-[#3730a3] to-[#0f766e]',
  'from-[#b45309] via-[#92400e] to-[#451a03]',
  'from-[#be185d] via-[#831843] to-[#3b0764]',
  'from-[#0369a1] via-[#075985] to-[#083344]',
  'from-[#4d7c0f] via-[#3f6212] to-[#052e16]',
];

const TOPICS: Array<{ match: RegExp; icon: LucideIcon }> = [
  { match: /trade|site|construct|artisan/i, icon: HardHat },
  { match: /\bai\b|agent|automat|tech/i, icon: Bot },
  { match: /pay|salary|wage|cost|money/i, icon: Banknote },
  { match: /law|legal|compliance|policy/i, icon: Scale },
  { match: /career|job seeker|cv|interview/i, icon: Briefcase },
  { match: /hir|recruit|team|people|staff/i, icon: Users },
];

function seedOf(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

function Pattern({ kind }: { kind: number }) {
  const id = `dealo-cover-${useId().replace(/:/g, '')}`;
  if (kind === 0) {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-[0.18]" aria-hidden>
        <defs>
          <pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.6" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    );
  }
  if (kind === 1) {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-[0.14]" aria-hidden>
        <defs>
          <pattern id={id} width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    );
  }
  return (
    <svg
      className="absolute -right-16 -top-16 h-[140%] w-auto opacity-[0.16]"
      viewBox="0 0 200 200"
      aria-hidden
    >
      {[30, 55, 80, 105, 130].map((r) => (
        <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="white" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

/** Cover for posts without their own picture. Colours and pattern follow the slug, so no two look alike. */
export function BlogCoverArt({
  slug,
  category,
  className,
  compact = false,
}: {
  slug: string;
  category: string | null;
  className?: string;
  compact?: boolean;
}) {
  const seed = seedOf(slug);
  const palette = PALETTES[seed % PALETTES.length];
  const pattern = Math.floor(seed / PALETTES.length) % 3;
  const label = category ?? 'Dealo guide';
  const Icon = TOPICS.find((topic) => topic.match.test(`${label} ${slug}`))?.icon ?? Newspaper;

  return (
    <div
      className={cn('absolute inset-0 overflow-hidden bg-gradient-to-br', palette, className)}
      aria-hidden
    >
      <Pattern kind={pattern} />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div
        className={cn(
          'absolute flex items-center gap-3',
          compact ? 'left-4 top-4' : 'left-5 top-5',
        )}
      >
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur',
            compact ? 'h-10 w-10' : 'h-12 w-12',
          )}
        >
          <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
          {label}
        </span>
      </div>
      <Icon className="absolute -bottom-6 -right-6 h-40 w-40 text-white/10" strokeWidth={1.2} />
    </div>
  );
}
