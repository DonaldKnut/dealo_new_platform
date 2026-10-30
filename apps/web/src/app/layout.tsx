import type { Metadata } from 'next';
import { Fraunces, Manrope } from 'next/font/google';

import { Providers } from '@/components/providers';
import { SiteChrome } from '@/components/site-chrome';
import { FAVICON_LOGO } from '@/lib/brand';

import './globals.css';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const body = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Dealo — Professional Recruitment & Managed Staffing',
    template: '%s · Dealo',
  },
  description:
    'Dealo helps businesses find, recruit, place, and manage qualified professionals across Nigeria.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  icons: {
    icon: [{ url: FAVICON_LOGO, type: 'image/png' }],
    shortcut: FAVICON_LOGO,
    apple: FAVICON_LOGO,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
