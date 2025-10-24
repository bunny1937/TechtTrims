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
    domains: [
      "localhost",
      "your-domain.com",
      "tile.openstreetmap.org",
      "images.unsplash.com",
    ],
    unoptimized: true,
  },
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
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
