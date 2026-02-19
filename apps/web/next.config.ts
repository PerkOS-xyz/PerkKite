import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@perkkite/shared'],
  // images: { unoptimized: true }, // Not needed without static export
};

export default nextConfig;
