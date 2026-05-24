// sw.js
//============================================
// Service Worker — Offline Cache
// ============================================

const CACHE_NAME = 'iphoneex-v1';
const ASSETS = [
    './',
    './index.html',
    './core/glass.css',
    './core/phone.css',
    './core/store.js',
    './core/logger.js',
    './core/api.js',
    './core/scheduler.js',
    './core/router.js',
    './core/phone.js',
    './core/widget.js',
    './apps/settings/settings.css',
    './apps/settings/settings.js',
    './manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // Skip API calls
    if (e.request.url.includes('/chat/completions') || e.request.url.includes('/models')) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then(cached => {
            return cached || fetch(e.request).then(response => {
                // Cache successful GET requests
                if (e.request.method === 'GET' && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return response;
            });
        }).catch(() => {
            // Offline fallback
            if (e.request.destination === 'document') {
                return caches.match('./index.html');
            }
        })
    );
});
