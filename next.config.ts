import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Vercel packages Next.js itself. Standalone output is only needed by
  // traditional Node.js hosts such as cPanel/DirectAdmin.
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
