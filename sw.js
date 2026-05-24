// sw.js
const CACHE_NAME = 'iphoneex-v1';
const ASSETS = [
    './', './index.html', './manifest.json',
    './core/glass.css', './core/phone.css',
    './core/store.js', './core/logger.js', './core/api.js',
    './core/scheduler.js', './core/router.js', './core/widget.js', './core/phone.js',
    './apps/settings/settings.css', './apps/settings/settings.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    if (e.request.url.includes('/chat/completions') || e.request.url.includes('/models')) return;
    e.respondWith(
        caches.match(e.request).then(cached =>
            cached || fetch(e.request).then(res => {
                if (e.request.method === 'GET' && res.status === 200) {
                    caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
                }
                return res;
            })
        ).catch(() => e.request.destination === 'document' ? caches.match('./index.html') : undefined)
    );
});

