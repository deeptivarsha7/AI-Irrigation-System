/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

// Next.js App Router client-side navigation (clicking a <Link>) doesn't do a
// full document reload — it fetches an RSC payload in the background
// (recognizable by the `RSC: 1` header or a `_rsc=` query param). The
// default `fallbacks` config only intercepts full document navigations, so
// without this rule, a failed RSC fetch while offline surfaces a raw
// browser network error instead of our custom offline page.
const rscNavigationFallback: RuntimeCaching = {
  matcher: ({ request, sameOrigin }) =>
    sameOrigin &&
    (request.headers.get("RSC") === "1" || request.url.includes("_rsc=")),
  handler: new NetworkOnly({
    plugins: [
      {
        handlerDidError: async () => {
          const offlinePage = await self.caches.match("/~offline");
          return offlinePage || Response.error();
        },
      },
    ],
  }),
};

const runtimeCaching: RuntimeCaching[] = [rscNavigationFallback, ...defaultCache];

const serwist = new Serwist({
  precacheEntries: [
    ...(self.__SW_MANIFEST || []),
    { url: "/~offline", revision: "1" },
  ],
  precacheOptions: {
    cleanupOutdatedCaches: true,
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();