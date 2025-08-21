/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://enrich-backend-new.onrender.com/:path*',
      },
    ];
  },
};
module.exports = nextConfig;