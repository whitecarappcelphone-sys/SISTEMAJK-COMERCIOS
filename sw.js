/* =========================================================================
   Sistema JK — Servicio Trabajador (Service Worker)
   Repo: https://whitecarappcelphone-sys.github.io/SISTEMAJK-COMERCIOS/
   =========================================================================
   - Estáticas del shell: cache-first con fallback a red.
   - HTML navegación: network-first (siempre trae la última versión).
   - Otras peticiones (Supabase, CDNs): pasan a la red sin interferir.
   ========================================================================= */

const CACHE_NAME = 'sistema-jk-v1';

const SHELL = [
  './index.html',
  './dashboard.html',
  './taller.html',
  './inventario.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

/* ------------------------------------------------------------------
   INSTALACIÓN
   ------------------------------------------------------------------ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ------------------------------------------------------------------
   ACTIVACIÓN — limpiar caches antiguos
   ------------------------------------------------------------------ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ------------------------------------------------------------------
   FETCH — manejo de estrategias
   ------------------------------------------------------------------ */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo manejamos peticiones del mismo origen
  if (url.origin !== self.location.origin) return;

  // Navegación: network-first (siempre intenta red; si falla, sirve cache)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Otros recursos GET: cache-first con fallback a red
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy)).catch(() => {});
          }
          return response;
        });
      }).catch(() => {
        // último recurso: devolver índice para navegación
        return caches.match('./index.html');
      })
    );
  }
});
