/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          (process.env.NEXT_PUBLIC_API_BASE_URL || "https://enrich-backend-new.onrender.com") + "/:path*",
      },
    ];
  },
};
module.exports = nextConfig;
