import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Almost every page in Briefly is per-user and dynamic, so we use the
  // classic request-time rendering model instead of Cache Components.
  // See docs/architecture.md.
  cacheComponents: false,
  poweredByHeader: false,
  experimental: {
    // Workspace logo uploads go through a server action.
    serverActions: { bodySizeLimit: "5mb" },
  },
  serverExternalPackages: ["sharp", "archiver"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Never leak the private brief token through the Referer header.
      { source: "/b/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
