const CACHE = "edyfra-v1";
const ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// NEVER cache the service worker file itself or Next.js HMR / API requests
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Bypass: service worker, Next internals, API routes, auth, realtime
  if (
    url.pathname === "/sw.js" ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    event.request.cache === "no-store"
  ) {
    return;
  }

  // Cache only static assets (images, fonts, css, js chunks)
  const isStatic = /\.(png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|css|js)$/i.test(url.pathname);

  if (!isStatic) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let data = {};
    let title = "Edyfra";

    if (event.data) {
      try {
        data = event.data.json();
        title = data.title || "Edyfra";
      } catch {
        data = { body: event.data.text() };
      }
    }

    const id = data.id || Date.now().toString();

    await self.registration.showNotification(title, {
      body: data.body || "You have a new update!",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [200, 100, 200],
      tag: "edyfra-" + id,
      renotify: true,
      requireInteraction: false,
      data: {
        url: data.url || "/",
        id: id,
      },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Try to focus a tab whose URL matches the notification target
      const matching = windowClients.find((c) => {
        try {
          return new URL(c.url).pathname === new URL(targetUrl, c.url).pathname;
        } catch {
          return false;
        }
      });
      if (matching) {
        return matching.focus();
      }
      // Otherwise open a new tab/window
      return clients.openWindow(targetUrl);
    })
  );
});
