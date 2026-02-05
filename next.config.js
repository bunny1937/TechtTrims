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

  swcMinify: true,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  images: {
    domains: ["images.unsplash.com", "ik.imagekit.io"],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1200], // Reduce breakpoints
    imageSizes: [32, 64, 128], // Reduce sizes
    minimumCacheTTL: 86400, // 24 hours instead of 60s
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  compress: true,
  compressSize: 1024,
  productionBrowserSourceMaps: false,

  experimental: {
    optimizePackageImports: [
      "react-hot-toast",
      "leaflet",
      "lucide-react", // ✅ ADD these
      "lodash",
      "react-dom",
    ],
    optimizeCss: true, // ✅ Enable CSS optimization
  },

  // ✅ STOP FAST REFRESH WARNINGS
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },

  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, stale-while-revalidate=600",
          },
        ],
      },
    ];
  },

  webpack: (config, { dev, isServer }) => {
    if (!isServer) {
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        {
          message: /Pseudo-elements are not supported by css-select/,
        },
      ];
    }

    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            default: false,
            vendors: false,
            framework: {
              name: "framework",
              chunks: "all",
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // ✅ Separate heavy libraries
            leaflet: {
              name: "leaflet",
              test: /[\\/]node_modules[\\/](leaflet|react-leaflet)[\\/]/,
              priority: 35,
              enforce: true,
            },
            animations: {
              name: "animations",
              test: /[\\/]node_modules[\\/](gsap|animejs|three|@react-three)[\\/]/,
              priority: 33,
              enforce: true,
            },
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                // ✅ FIX: Handle null match result
                if (!module.context) return "vendor";

                const match = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/,
                );

                if (!match || !match[1]) return "vendor";

                const packageName = match[1];
                return `npm.${packageName.replace("@", "")}`;
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
              maxSize: 200000,
            },
          },
        },
        minimize: true,
        usedExports: true, // ✅ Tree shaking
      };
    }

    return config;
  },
};

export default nextConfig;
