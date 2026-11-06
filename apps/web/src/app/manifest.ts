import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Dealo — Hire checked talent',
    short_name: 'Dealo',
    description: 'Hire checked office staff and skilled trades, find jobs, and build a CV that gets interviews.',
    start_url: '/dashboard?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0f766e',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Find jobs', short_name: 'Jobs', url: '/jobs', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Build my CV', short_name: 'CV', url: '/resume-builder/new', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Request a hire', short_name: 'Hire', url: '/hire', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'My dashboard', short_name: 'Dashboard', url: '/dashboard', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
