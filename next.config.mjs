/** @type {import('next').NextConfig} */
import { execSync } from "child_process";

const nextConfig = {
  reactStrictMode: false,

  generateBuildId: async () => {
    try {
      return execSync("git rev-parse --short HEAD").toString().trim();
    } catch {
      return "dev";
    }
  },

  trailingSlash: false,
  compress: true,
  productionBrowserSourceMaps: false,

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.imagekit.io" }],
    domains: [
      "images.unsplash.com",
      "ik.imagekit.io",
      "lh3.googleusercontent.com",
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1200],
    imageSizes: [32, 64, 128],
    minimumCacheTTL: 86400,
  },

  onDemandEntries: {
    maxInactiveAge: 5 * 60 * 1000,
    pagesBufferLength: 10,
  },

  experimental: {
    optimizeCss: false,
    optimizePackageImports: ["lucide-react", "react-hot-toast", "lodash"],
  },

  async headers() {
    return [
      ...(process.env.NODE_ENV === "production"
        ? [
            {
              source: "/_next/static/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
          ]
        : []),

      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },

  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
