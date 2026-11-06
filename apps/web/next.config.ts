import type { NextConfig } from 'next';
import path from 'path';

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
};

export default nextConfig;
