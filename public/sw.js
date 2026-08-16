/**
 * Edyfra Service Worker — client-side performance layer.
 *
 * Caching strategies per resource type:
 *   /_next/static/**    → Cache-First  (hashed names, safe forever)
 *   *.png/jpg/svg/…     → Cache-First  (public static assets)
 *   supabase.co images  → Stale-While-Revalidate (always fast, stays fresh)
 *   /api/**             → Network-First, 10 s timeout, cache as cold fallback
 *   HTML navigation     → Network-First, 5 s timeout, offline shell fallback
 *
 * Push notifications and notificationclick are unchanged from the original.
 */

const CACHE_VERSION = "v2";
const STATIC_CACHE  = `edyfra-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `edyfra-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE   = `edyfra-images-${CACHE_VERSION}`;

/** App-shell pages to precache on install */
const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install ────────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) =>
            console.warn(`[SW] Precache miss for ${url}:`, err.message)
          )
        )
      )
    )
  );
  self.skipWaiting();
});

// ── Activate: purge old caches ─────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  const keep = [STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => !keep.includes(n))
            .map((n) => {
              console.log(`[SW] Deleting stale cache: ${n}`);
              return caches.delete(n);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept GET; skip the SW file itself and HMR websockets
  if (request.method !== "GET") return;
  if (url.pathname === "/sw.js") return;

  // ── Next.js hashed static assets → Cache-First (safe to cache indefinitely)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // ── Public static files (icons, fonts, images, JS in /public)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // ── Supabase storage (tutor profile images) → Stale-While-Revalidate
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("supabase.in")
  ) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // ── API routes → Network-First with timeout, cached fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE, 10_000));
    return;
  }

  // ── Auth / realtime → always network, never cache
  if (
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/_next/")
  ) {
    return;
  }

  // ── HTML navigation → Network-First, offline shell fallback
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      networkFirst(request, RUNTIME_CACHE, 5_000).catch(async () => {
        const offline = await caches.match("/");
        return offline ?? fetch(request);
      })
    );
    return;
  }
});

// ── Caching strategies ────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request).then((res) => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  });
  return cached ?? networkFetch;
}

async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("[SW] Network timeout")), timeoutMs)
      ),
    ]);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

function isStaticAsset(pathname) {
  return /\.(png|jpg|jpeg|webp|avif|svg|ico|woff2?|ttf|eot|css|js)$/i.test(pathname);
}

// ── Push Notifications (unchanged) ────────────────────────────────────────────

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};
      let title = "Edyfra";

      if (event.data) {
        try {
          data  = event.data.json();
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
        data: { url: data.url || "/", id },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const matching = windowClients.find((c) => {
          try {
            return new URL(c.url).pathname === new URL(targetUrl, c.url).pathname;
          } catch {
            return false;
          }
        });
        if (matching) return matching.focus();
        return clients.openWindow(targetUrl);
      })
  );
});
