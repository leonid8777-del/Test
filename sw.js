const CACHE_NAME = "restposten-pwa-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/liquidato/logo.svg",
  "./assets/liquidato/cases/badkeramik.jpg",
  "./assets/liquidato/cases/smartphone-zubehoer.jpg",
  "./assets/liquidato/cases/markenschuhe.jpg",
  "./assets/liquidato/cases/elektronik-retouren.jpg",
  "./assets/liquidato/cases/photovoltaik.jpg",
  "./assets/liquidato/cases/elektroscooter.jpg",
  "./assets/liquidato/cases/wellpappkartons.jpg",
  "./assets/liquidato/cases/inverter-generatoren.jpg",
  "./assets/liquidato/cases/papiertragetaschen.jpg",
  "./assets/liquidato/cases/hosen-jeans.jpg",
  "./assets/liquidato/cases/aufblasbare-moebel.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", responseClone));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
