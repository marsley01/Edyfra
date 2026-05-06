import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: {
    // Allow production builds to succeed even if there are ESLint warnings
    ignoreDuringBuilds: true,
  },
  turbopack: {
    root: path.resolve(import.meta.url, ".."),
  },
};

export default nextConfig;
