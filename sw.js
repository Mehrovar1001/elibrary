/* eLibrary Service Worker — offline app shell + always-fresh updates */
const VERSION = 'v21';
const SHELL_CACHE = `elibrary-shell-${VERSION}`;
const RUNTIME_CACHE = `elibrary-runtime-${VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './vendor/supabase-2.45.4.js',
  './vendor/qrcode-1.4.4.js',
  './vendor/pdf-3.11.174.min.js',
  './vendor/pdf.worker-3.11.174.min.js',
  './js/media.js',
  './js/focus.js',
  './js/drive-import.js',
  './js/config.js',
  './js/i18n.js',
  './js/api.js',
  './js/render3d.js',
  './js/category-editor.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function networkWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(request, { cache: 'no-cache' }).then(res => {
      clearTimeout(timer);
      resolve(res);
    }, err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Never cache Supabase API/auth calls (always live data) or the Google Drive viewer.
     Public cover images from Supabase Storage are fine to cache. */
  if (url.hostname.endsWith('supabase.co') && !url.pathname.startsWith('/storage/v1/object/public/')) return;
  if (url.hostname.endsWith('google.com')) return;

  const sameOrigin = url.origin === self.location.origin;

  /* Same-origin: Network-first (always fresh), fall back to cache when offline */
  if (sameOrigin) {
    event.respondWith(
      networkWithTimeout(req, req.mode === 'navigate' ? 4000 : 6000)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req, { ignoreSearch: true });
          if (cached) return cached;
          if (req.mode === 'navigate') {
            return (await caches.match('./index.html')) || (await caches.match('./'));
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        })
    );
    return;
  }

  /* Cross-origin (Google Fonts, cover images): stale-while-revalidate */
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async cache => {
      const cached = await cache.match(req);
      const network = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
