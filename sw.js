const CACHE_NAME = "safepride-shell-v2";

const APP_SHELL_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./js/config.js",
  "./js/seed-data.js",
  "./js/data-service.js",
  "./js/map-module.js",
  "./js/sos-tools.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => caches.delete(oldKey))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // 外部圖磚、OSRM 路線與 Supabase API 不由 SW 快取，直接走網路
  if (url.origin !== self.location.origin) return;
  // admin.html 保持網路優先避免快取過期審核頁
  if (url.pathname.endsWith("/admin.html")) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const networkPromise = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === "basic") {
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(networkPromise);
        return cached;
      }

      const networkRes = await networkPromise;
      if (networkRes) return networkRes;

      if (req.mode === "navigate") {
        const fallback = await cache.match("./index.html");
        if (fallback) return fallback;
      }

      return new Response("Offline", {
        status: 503,
        statusText: "Service Unavailable"
      });
    })
  );
});
