/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Avoid failing the Vercel build if local eslint plugins aren't installed there
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
