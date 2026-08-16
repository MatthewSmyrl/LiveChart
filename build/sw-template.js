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

/**
 * Match on the URL alone.
 *
 * The cache holds exactly one response per URL, so a `Vary` header on what a
 * server happened to send can only ever cause a miss — and a miss offline is a
 * blank screen. `vite preview` sends `Vary: Origin`, which is enough to make a
 * module script unreachable offline while everything looks fine online.
 */
const LOOKUP = { ignoreVary: true };

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

  // A navigation to a page the build actually contains is served as that page;
  // only what the build does not contain falls through to the app shell, since
  // the chart is a single page and any other route belongs to it.
  //
  // The order matters and is not cosmetic. Answering every navigation with the
  // shell served the app's own index.html at `guide/index.html`, where its
  // relative asset URLs resolved a directory too deep, 404'd, and left a white
  // screen — invisible in dev, which has no worker at all.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const url = new URL(request.url);
        // A directory URL means its index, the way a web server resolves it.
        const paths = url.pathname.endsWith('/')
          ? [url.pathname + 'index.html', url.pathname]
          : [url.pathname];
        for (const path of paths) {
          const page = await caches.match(path, LOOKUP);
          if (page) return page;
        }
        return (await caches.match(INDEX, LOOKUP)) ?? fetch(request);
      })(),
    );
    return;
  }

  event.respondWith(
    caches.match(request, LOOKUP).then(
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
