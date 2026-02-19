import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  transpilePackages: ['@perkkite/shared'],
  images: { unoptimized: true },
};

export default nextConfig;
