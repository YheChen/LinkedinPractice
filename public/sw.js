/*
 * Gridwright service worker — enables offline play. Because every puzzle is
 * generated deterministically in the browser, caching the app shell + JS chunks
 * is enough to play endless/daily/archive fully offline (SPEC §12).
 *
 * Strategy:
 *   - navigations: network-first, fall back to cached page, then the app shell;
 *   - other same-origin GETs (JS/CSS/assets): stale-while-revalidate;
 *   - cross-origin: passthrough (the CSP forbids external hosts anyway).
 */
const CACHE = "gridwright-v1";
const APP_SHELL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([APP_SHELL, "/manifest.webmanifest"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match(APP_SHELL))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
