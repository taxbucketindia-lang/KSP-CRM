/* TaxBucket CRM service worker: phone / browser PUSH NOTIFICATION + phone ke "Share" menu se file lena.
   Yeh koi page ya file cache nahi karta, isliye naya build aate hi hamesha taaza app hi khulta hai. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// 🔴 SHARE: phone ki gallery / file manager me "Share" > TaxBucket. Files thodi der yahan rakhte hain,
// phir Team Chat khulta hai jahan user chat chun kar bhej deta hai. Baaki har request seedhe internet se.
const SHARE_CACHE = 'ksp-share';
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'POST' || url.origin !== self.location.origin || url.pathname !== '/share-target') return;

  event.respondWith((async () => {
    try {
      const form = await event.request.formData();
      const files = form.getAll('files').filter((f) => f && typeof f === 'object' && f.size > 0).slice(0, 10);
      await caches.delete(SHARE_CACHE);
      const cache = await caches.open(SHARE_CACHE);
      const meta = [];
      for (let i = 0; i < files.length; i += 1) {
        const key = `/shared-file/${i}`;
        meta.push({ key, name: files[i].name, type: files[i].type, size: files[i].size });
        await cache.put(key, new Response(files[i], { headers: { 'content-type': files[i].type || 'application/octet-stream' } }));
      }
      const text = [form.get('title'), form.get('text'), form.get('url')].filter(Boolean).join('\n').trim();
      await cache.put('/shared-meta', new Response(JSON.stringify({ files: meta, text, at: Date.now() }), { headers: { 'content-type': 'application/json' } }));
    } catch (error) {
      // file padh nahi paaye: chat phir bhi khul jayega
    }
    return Response.redirect('/chat?shared=1', 303);
  })());
});

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
      renotify: !!data.tag,         // usi chat ka naya message: purana hata kar naya, aur phone phir se bajega (WhatsApp jaisa)
      badge: '/favicon.svg',
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
