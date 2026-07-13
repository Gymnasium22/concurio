/* Minimal offline shell for Concurio PWA */
/* Bump CACHE when shell changes so clients drop stale index/html */
const CACHE = 'concurio-shell-v2';
const SHELL = ['./', './index.html', './favicon.svg', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Hashed bundles always network-first, never stick forever offline shell
  const isHashedAsset = /\/assets\/.+\.[a-f0-9]{6,}\.(js|css)$/i.test(url.pathname);

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (
          res.ok &&
          !isHashedAsset &&
          (url.pathname.endsWith('.html') ||
            url.pathname.endsWith('/') ||
            url.pathname.endsWith('manifest.webmanifest') ||
            url.pathname.endsWith('sw.js'))
        ) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});
