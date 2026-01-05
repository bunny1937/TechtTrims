/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: false,
  experimental: {
    swcTraceProfiling: false, // 🚫 disables trace file
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.imagekit.io",
      },
    ],
    domains: ["tile.openstreetmap.org", "images.unsplash.com"],
    // ✅ REMOVE unoptimized: true
    formats: ["image/webp", "image/avif"], // Add modern formats
    minimumCacheTTL: 60,
  },

  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },

  webpack: (config) => {
    // Handle Leaflet in SSR
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
