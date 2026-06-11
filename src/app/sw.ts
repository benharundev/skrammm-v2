import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkOnly, StaleWhileRevalidate, CacheFirst, NetworkFirst } from "serwist";

// Required: tell TypeScript about the injected manifest
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // SSE stream — must never be cached
    {
      matcher: /\/api\/stream\/.*/,
      handler: new NetworkOnly(),
    },
    // Auth endpoints — network only
    {
      matcher: /\/api\/auth\/.*/,
      handler: new NetworkOnly(),
    },
    // Performance cards — cache first (stats hash in URL ensures freshness)
    {
      matcher: /\/api\/cards\/.*/,
      handler: new CacheFirst({
        cacheName: "cards",
        plugins: [],
      }),
    },
    // Player QR endpoint — stale-while-revalidate, 60s max-age (one rotation)
    {
      matcher: /\/api\/qr\/.*/,
      handler: new StaleWhileRevalidate({
        cacheName: "player-qr",
        plugins: [],
      }),
    },
    // App portal — never cache; RSC navigation requires a live server response
    {
      matcher: ({ url }) =>
        url.hostname === "app.skrammm.com" ||
        url.hostname === "localhost" ||
        url.hostname.endsWith(".localhost"),
      handler: new NetworkOnly(),
    },
    // Spectator pages — network first with 5s timeout
    {
      matcher: ({ url }) => url.hostname === "skrammm.com",
      handler: new NetworkFirst({
        cacheName: "spectator-pages",
        networkTimeoutSeconds: 5,
        plugins: [],
      }),
    },
    // Default: use serwist's defaultCache
    ...defaultCache,
  ],
});

serwist.addEventListeners();
