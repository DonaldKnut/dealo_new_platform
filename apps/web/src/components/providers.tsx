'use client';

import type { ReactNode } from 'react';

import { CookieConsent } from '@/components/cookie-consent';
import { FaqModal } from '@/components/faq/faq-modal';
import { LocaleProvider } from '@/components/i18n/locale-context';
import { ModalHost } from '@/components/modals/modal-host';
import { ModalProvider } from '@/components/modals/modal-context';
import { PwaInstall } from '@/components/pwa-install';
import { SupportTicketWidget } from '@/components/support/support-ticket-widget';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { WhatsAppWidget } from '@/components/whatsapp-widget';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <ToastProvider>
          <ModalProvider>
            {children}
            <ModalHost />
            <FaqModal />
            <CookieConsent />
            <WhatsAppWidget />
            <SupportTicketWidget />
            <PwaInstall />
          </ModalProvider>
        </ToastProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
