/** @type {import("next").NextConfig} */
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Force webpack — Turbopack silently OOM-kills on Vercel with this codebase size
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
      };
    }
    return config;
  },
  compress: true,
  images: {
    minimumCacheTTL: 3600,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-dialog",
      "recharts",
      "date-fns",
      "stream-chat-react",
      "@stream-io/video-react-sdk",
      "sonner"
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        // Stream Video SDK needs camera + mic on this origin to place calls.
        // geolocation stays blocked (we don't use it).
        value: "camera=(self), microphone=(self), geolocation=()",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel-scripts.com assistloop.ai",
          "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
          "font-src 'self' fonts.gstatic.com",
          "img-src 'self' data: blob: https: http:",
          "connect-src 'self' *.supabase.co *.vercel-insights.com wss://*.supabase.co *.stream-io-api.com wss://*.stream-io-api.com wss://chat.stream-io-api.com",
          "frame-ancestors 'none'",
        ].join("; "),
      },
    ];

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Long cache for hashed static assets (1 year, immutable)
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Long cache for the public logo and other static images
      {
        source: "/:path(image\\.png|favicon\\.ico|icon\\.png|apple-touch-icon\\.png|og-image\\.png|.*\\.svg)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      // Public static folder assets
      {
        source: "/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Cache-Control", value: "private, max-age=0, stale-while-revalidate=60" },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
