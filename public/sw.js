self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.body || "New notification from Edyfra",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [200, 100, 200],
      data: {
        url: data.url || "/",
        id: data.id,
        type: data.type || "general",
      },
    };
    event.waitUntil(
      self.registration.showNotification(
        data.title || "Edyfra",
        options
      )
    );
  } catch {
    event.waitUntil(
      self.registration.showNotification("Edyfra", {
        body: event.data.text(),
        icon: "/icons/icon-192.png",
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard/notifications";
  const clientsToMatch = { type: "window", includeUncontrolled: true };
  event.waitUntil(
    clients.matchAll(clientsToMatch).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url || client.url.startsWith(url.split("?")[0])) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
