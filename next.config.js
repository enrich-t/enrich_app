/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Prevent Vercel builds from failing on ESLint while we iterate.
  // (Does not affect runtime; you can remove later.)
  eslint: {
    ignoreDuringBuilds: true,
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
