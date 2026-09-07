import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Vercel reads the Next.js build directly. Other Node.js hosts can deploy the
  // self-contained output without copying the full dependency tree.
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
