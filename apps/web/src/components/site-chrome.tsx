'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isBareShell =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/employer') ||
    pathname.startsWith('/talent') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/resume-builder/');

  if (isBareShell) {
    return <>{children}</>;
  }

  return (
    <div className="site-shell flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 pt-0">{children}</main>
      <SiteFooter />
    </div>
  );
}
