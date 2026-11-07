import type { NextConfig } from 'next';
import path from 'path';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/$/, '');

const nextConfig: NextConfig = {
  // Lets a second dev server run beside the main one without sharing (and corrupting) `.next`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: ['@dealo/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  // The browser talks to /api/v1 on this site; it is forwarded to the API so sign-in cookies stay first-party.
  async rewrites() {
    return API_URL.startsWith('http') ? [{ source: '/api/v1/:path*', destination: `${API_URL}/:path*` }] : [];
  },
};

export default nextConfig;
