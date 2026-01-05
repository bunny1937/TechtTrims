const CACHE_NAME = "techtrims-v1";
const STATIC_CACHE = "static-v1";
const DYNAMIC_CACHE = "dynamic-v1";

const STATIC_ASSETS = [
  "/",
  "/offline",
  "/styles/globals.css",
  "/images/logo.png",
];

// Install - cache static assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
});

// Fetch - serve from cache, fallback to network
self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // ✅ Cache salon data for offline browsing
  if (url.pathname.startsWith("/api/salons")) {
    e.respondWith(
      caches
        .match(request)
        .then((cached) => {
          const networkFetch = fetch(request).then((response) => {
            if (response.ok) {
              const cloned = response.clone();
              caches
                .open(DYNAMIC_CACHE)
                .then((cache) => cache.put(request, cloned));
            }
            return response;
          });
          return cached || networkFetch;
        })
        .catch(() => {
          return new Response(JSON.stringify({ error: "Offline" }), {
            headers: { "Content-Type": "application/json" },
          });
        })
    );
  } else {
    // Default strategy
    e.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
