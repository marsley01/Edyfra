importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the config
// We pull these from URL params or we just inject them. 
// A robust setup is to have the service worker receive config via postMessage,
// but for simplicity, you can configure it here (replace with your actual Firebase config params later if needed).

const firebaseConfig = {
  // This will be replaced by your actual config
  // Note: VAPID key is used on the client, not here.
  // The service worker just needs standard Firebase config if you hardcode it,
  // but it's better to dynamically load or use Next.js env vars during build.
};

// If firebaseConfig is empty, firebase.initializeApp might throw, so we only init if we have a projectId
if (firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'New Notification';
    const notificationOptions = {
      body: payload.notification?.body,
      icon: payload.notification?.image || '/icon.png',
      data: payload.data,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Focus or open the window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      if (windowClients.length > 0) {
        return windowClients[0].focus();
      } else {
        return clients.openWindow('/');
      }
    })
  );
});
