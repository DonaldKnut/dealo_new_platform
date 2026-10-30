'use client';

import type { ReactNode } from 'react';

import { ModalHost } from '@/components/modals/modal-host';
import { ModalProvider } from '@/components/modals/modal-context';
import { ThemeProvider } from '@/components/theme-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ModalProvider>
        {children}
        <ModalHost />
      </ModalProvider>
    </ThemeProvider>
  );
}
