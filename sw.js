/* =========================================================================
   Sistema JK — Service Worker
   Repo: https://whitecarappcelphone-sys.github.io/SISTEMAJK-COMERCIOS/
   =========================================================================
   - Navegación HTML: network-first.
   - Otros GET same-origin: cache-first con fallback de red.
   - Web Push: muestra avisos y abre el módulo al pulsarlos.
   ========================================================================= */

const CACHE_NAME = 'sistema-jk-v4';
const SHELL = [
  './index.html',
  './dashboard.html',
  './taller.html',
  './inventario.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Web Push: el payload incluye { title, body, url, tag }
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    try { payload = { body: event.data ? event.data.text() : '' }; } catch (_) {}
  }

  const title = payload.title || 'Sistema JK';
  const options = {
    body: payload.body || 'Tienes una actualización de inventario.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: payload.tag || 'jk-stock-' + Date.now(),
    renotify: true,
    data: { url: payload.url || './inventario.html' },
    vibrate: [180, 80, 180],
    requireInteraction: true
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Al tocar el aviso, enfoca una pestaña existente o abre el módulo Inventario.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data && event.notification.data.url || './inventario.html', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          return client.navigate(target).then(() => client.focus());
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
          }
          return response;
        });
      }).catch(() => caches.match('./index.html'))
    );
  }
});
