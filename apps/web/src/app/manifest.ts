import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Dealo — Hire checked talent',
    short_name: 'Dealo',
    description: 'Hire checked office staff and skilled trades. Track requests, shortlists and your profile.',
    start_url: '/dashboard?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    orientation: 'portrait',
    background_color: '#071f14',
    theme_color: '#0f766e',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512?maskable=1', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Request a hire', short_name: 'Hire', url: '/hire', icons: [{ src: '/pwa-icon/192', sizes: '192x192' }] },
      { name: 'My dashboard', short_name: 'Dashboard', url: '/dashboard', icons: [{ src: '/pwa-icon/192', sizes: '192x192' }] },
      { name: 'My profile', short_name: 'Profile', url: '/dashboard/profile', icons: [{ src: '/pwa-icon/192', sizes: '192x192' }] },
    ],
  };
}
