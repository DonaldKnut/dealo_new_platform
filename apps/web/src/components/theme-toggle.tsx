'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="h-9 w-9 shrink-0 rounded-full border border-border min-[340px]:h-10 min-[340px]:w-10"
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated text-foreground transition hover:border-brand min-[340px]:h-10 min-[340px]:w-10"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="h-3.5 w-3.5 min-[340px]:h-4 min-[340px]:w-4" /> : <Moon className="h-3.5 w-3.5 min-[340px]:h-4 min-[340px]:w-4" />}
    </button>
  );
}
