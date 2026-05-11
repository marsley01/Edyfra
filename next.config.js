/** @type {import("next").NextConfig} */
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  compress: true,
  images: {
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "iosgbkiyuyjjvamqqzks.supabase.co",
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dropdown-menu",
    ],
  },
};

module.exports = withBundleAnalyzer(nextConfig);
