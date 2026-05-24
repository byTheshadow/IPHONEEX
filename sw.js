const CACHE_NAME = 'iphoneex-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './css/root.css',
  './css/phone.css',
  './css/desktop.css',
  './css/apps.css',
  './js/main.js',
  './js/core/db.js',
  './js/core/eventBus.js',
  './js/core/engine.js',
  './libs/localforage.min.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // 不缓存 API 请求
  if (event.request.url.includes('/v1/chat/completions')) return;
  if (event.request.url.includes('api.openai.com')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => {
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
