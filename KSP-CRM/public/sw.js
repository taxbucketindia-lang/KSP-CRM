/* TaxBucket CRM service worker: sirf phone / browser PUSH NOTIFICATION ke liye.
   Yeh koi page ya file cache nahi karta, isliye naya build aate hi hamesha taaza app hi khulta hai. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Server se push aaya: phone ke notification bar me dikhao
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'TaxBucket CRM', {
      body: data.body || '',
      icon: '/taxbucket-logo.webp',
      tag: data.tag || undefined,   // ek hi notification do baar na dikhe
      data: { url: data.url || '/' }
    })
  );
});

// Notification par tap: CRM khula ho toh usi me sahi page par jao, warna naya khol do
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.location.origin));
      if (open && 'navigate' in open) {
        return open.navigate(target).then((client) => (client || open).focus()).catch(() => self.clients.openWindow(target));
      }
      return self.clients.openWindow(target);
    })
  );
});
