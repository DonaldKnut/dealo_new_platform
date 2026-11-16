import type { Metadata, Viewport } from 'next';
import { Fraunces, Manrope } from 'next/font/google';

import { Providers } from '@/components/providers';
import { OrganizationJsonLd } from '@/components/seo/json-ld';
import { SiteChrome } from '@/components/site-chrome';
import { APP_URL } from '@/lib/seo';
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
    default: 'Dealo — Jobs in Nigeria, AI Job Agent & checked hiring',
    template: '%s · Dealo',
  },
  description:
    'Find jobs in Lagos and across Nigeria, apply with one CV or Job Agent, and hire checked office staff and skilled trades. AI plus real recruiters.',
  metadataBase: new URL(APP_URL),
  alternates: {
    types: { 'application/rss+xml': [{ url: '/rss.xml', title: 'Dealo Journal' }] },
  },
  keywords: [
    'jobs in Nigeria',
    'jobs in Lagos',
    'remote jobs Nigeria',
    'AI job agent Nigeria',
    'hire talent Nigeria',
    'recruitment agency Lagos',
    'staffing agency Nigeria',
    'free CV builder Nigeria',
    'managed staffing Nigeria',
    'ATS Nigeria',
  ],
  category: 'business',
  creator: 'Dealo',
  publisher: 'Dealo',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
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
    icon: [
      { url: '/icons/icon-64.png', sizes: '64x64', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/icons/icon-64.png',
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
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
