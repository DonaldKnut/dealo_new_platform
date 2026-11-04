import type { Metadata, Viewport } from 'next';
import { Fraunces, Manrope } from 'next/font/google';

import { Providers } from '@/components/providers';
import { OrganizationJsonLd } from '@/components/seo/json-ld';
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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: {
    default: 'Dealo — Hire talent in Nigeria, Africa & globally',
    template: '%s · Dealo',
  },
  description:
    'Hire checked office staff and skilled trades in Nigeria and across Africa. Dealo shortlists talent for Lagos employers and inbound global hiring.',
  metadataBase: new URL(APP_URL),
  keywords: [
    'hire talent Nigeria',
    'skilled trades staffing Africa',
    'recruit office staff Lagos',
    'managed staffing Nigeria',
    'inbound Africa hiring',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: APP_URL,
    siteName: 'Dealo',
    title: 'Dealo — Hire talent in Nigeria, Africa & globally',
    description:
      'Office hiring and skilled trades staffing for Nigerian businesses and global teams recruiting in Africa.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dealo — Hire talent in Nigeria & Africa',
    description:
      'Checked shortlists for office professionals and skilled trades across Nigeria and Africa.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: [{ url: FAVICON_LOGO, type: 'image/png' }],
    shortcut: FAVICON_LOGO,
    apple: [{ url: '/pwa-icon/192', sizes: '192x192', type: 'image/png' }],
  },
  applicationName: 'Dealo',
  appleWebApp: {
    capable: true,
    title: 'Dealo',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#071f14' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <OrganizationJsonLd />
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
