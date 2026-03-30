import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  // pdf-parse uses require('fs') and dynamic requires internally;
  // keep it external so Turbopack doesn't try to bundle it
  serverExternalPackages: ["pdf-parse"],
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/api/public/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/cards/:cardId/edit",
        destination: "/dashboard/cards/:cardId",
        permanent: false,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
