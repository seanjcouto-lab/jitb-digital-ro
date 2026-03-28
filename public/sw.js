const CACHE_VERSION = 'jaxtr-v1';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const CDN_CACHE = `${CACHE_VERSION}-cdn`;

const APP_SHELL_URLS = [
  '/',
  '/manifest.json',
  '/index.css',
];

const CDN_ORIGINS = [
  'https://esm.sh',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

// ── Install: pre-cache app shell ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: remove stale caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('jaxtr-') && key !== APP_SHELL_CACHE && key !== CDN_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Non-GET requests: always go to network
  if (request.method !== 'GET') return;

  // CDN assets: StaleWhileRevalidate
  if (CDN_ORIGINS.some(origin => request.url.startsWith(origin))) {
    event.respondWith(staleWhileRevalidate(request, CDN_CACHE));
    return;
  }

  // Local assets and navigation: NetworkFirst with cache fallback
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, APP_SHELL_CACHE));
    return;
  }
});

// ── Strategies ────────────────────────────────────────────────────────────────

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(response => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || fetchPromise;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    // For navigation requests offline, fall back to cached index.html
    if (request.mode === 'navigate') {
      const shell = await cache.match('/');
      if (shell) return shell;
    }

    return new Response('Offline — no cached response available.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
