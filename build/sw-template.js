/* eslint-env serviceworker */
/**
 * LiveChart service worker. Placeholders are filled in at build time by
 * `build/serviceWorker.ts` — do not load this file directly.
 *
 * Cache-first for everything, because the whole point is that a cold start on a
 * dark stage with no signal behaves exactly like one at home. The cache name
 * carries a hash of the build, so a deploy invalidates the lot at once.
 */
const CACHE = '__CACHE__';
const ASSETS = __ASSETS__;
const INDEX = '__INDEX__';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  // Deliberately no skipWaiting: a new version must never swap itself in under
  // a song in progress. It waits, and takes over the next time the app starts.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Every navigation resolves to the app shell — the chart is a single page.
  if (request.mode === 'navigate') {
    event.respondWith(caches.match(INDEX).then((hit) => hit ?? fetch(request)));
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).catch(() => {
          // Offline and not precached. Better a failed subresource than an
          // exception that takes the page down mid-set.
          return new Response('', { status: 504, statusText: 'Offline' });
        }),
    ),
  );
});
