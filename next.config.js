/** @type {import('next').NextConfig} */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

const nextConfig = {
  // Don’t fail the Vercel build if ESLint deps aren’t present there
  eslint: { ignoreDuringBuilds: true },

  // Proxy all client calls like /api/xyz → your backend
  async rewrites() {
    if (!API_BASE) {
      console.warn('[next.config] Missing NEXT_PUBLIC_API_BASE_URL; no /api rewrites applied.');
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: `${API_BASE}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
