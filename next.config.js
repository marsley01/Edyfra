const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
  compress: true,
  productionBrowserSourceMaps: true,
  images: {
    minimumCacheTTL: 2592000,
    formats: ["image/avif", "image/webp"],
    // News articles embed thumbnails from arbitrary publisher CDNs, so allow
    // any HTTPS source instead of whitelisting hosts one by one.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {},
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
          process.env.NODE_ENV === "development"
            ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.vercel-scripts.com https://www.youtube.com https://s.ytimg.com http://www.youtube.com http://s.ytimg.com"
            : "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' *.vercel-scripts.com https://www.youtube.com https://s.ytimg.com http://www.youtube.com http://s.ytimg.com",
          "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
          "font-src 'self' fonts.gstatic.com",
          "img-src 'self' data: blob: https: http:",
          // stream-io-api.com covers both chat and video REST + WS endpoints.
          // stream-io-cdn.com is used by the Video SDK for TURN relay signalling.
          // hint.stream-io-video.com is used by the Video SDK for SFU edge discovery.
          // stream-io-video.com is for SFU WebSocket media connections.
          "connect-src 'self' *.supabase.co *.vercel-insights.com wss://*.supabase.co *.stream-io-api.com wss://*.stream-io-api.com wss://chat.stream-io-api.com wss://video.stream-io-api.com *.stream-io-cdn.com wss://*.stream-io-cdn.com *.stream-io-video.com wss://*.stream-io-video.com identitytoolkit.googleapis.com securetoken.googleapis.com firebasestorage.googleapis.com *.firebaseio.com huggingface.co *.huggingface.co raw.githubusercontent.com cdn.jsdelivr.net https://www.youtube.com",
          // YouTube embeds (study video player on the landing page + resources).
          // frame-src allows the player iframe; script-src allows react-youtube's
          // IFrame Player API (youtube.com/iframe_api + s.ytimg.com/widget.js).
          "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
          "media-src 'self' https://www.youtube.com",
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
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=31536000" },
        ],
      },
      // Optimized images from the Next.js image optimizer — long cache
      {
        source: "/_next/image",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=31536000" },
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
          { key: "Cache-Control", value: "private, max-age=0, stale-while-revalidate=60" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
