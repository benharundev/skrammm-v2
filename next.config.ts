import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Only compile the service worker in production
  disable: process.env.NODE_ENV === "development",
});

const config: NextConfig = {
  // Host-based routing is handled by src/middleware.ts (auth guard).
  // Route groups (app) and (marketing) expose pages at their natural paths;
  // no beforeFiles rewrites needed since parentheses are opaque to the URL.

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.skrammm.com",
      },
    ],
  },

  // Standalone output for Docker
  output: "standalone",

  // Native .node binaries (resvg-js) and satori must not be bundled by webpack
  serverExternalPackages: ["@resvg/resvg-js", "satori", "ioredis"],

  experimental: {
    // Enforce module boundaries at compile time via typed imports
    typedRoutes: true,
  },
};

export default withSerwist(config);
