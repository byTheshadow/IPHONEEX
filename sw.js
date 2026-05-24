/**
 * sw.js — Service Worker（离线缓存）
 *仓库名：IPHONEEX
 */

const CACHE_NAME = 'iphoneex-v1';

const PRECACHE_URLS = [
  '/IPHONEEX/',
  '/IPHONEEX/index.html',
  '/IPHONEEX/css/root.css',
  '/IPHONEEX/css/phone.css',
  '/IPHONEEX/css/desktop.css',
  '/IPHONEEX/css/apps.css',
  '/IPHONEEX/js/main.js',
  '/IPHONEEX/js/core/db.js',
  '/IPHONEEX/js/core/eventBus.js',
  '/IPHONEEX/js/core/engine.js',
  '/IPHONEEX/js/core/llm.js',
  '/IPHONEEX/js/apps/desktopApp.js',
  '/IPHONEEX/js/apps/chatApp.js',
  '/IPHONEEX/js/apps/calendarApp.js',
  '/IPHONEEX/js/apps/momentsApp.js',
  '/IPHONEEX/manifest.json',
];

// ── Install：预缓存核心资源 ──
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate：清理旧缓存 ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch：缓存优先，网络回退 ──
self.addEventListener('fetch', (event) => {
  //跳过 API 请求（大模型调用不缓存）
  if (event.request.url.includes('/v1/chat/completions')) return;
  if (event.request.url.includes('api.openai.com')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // 只缓存成功的同源请求
        if (!response || response.status !== 200|| response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => {
      // 离线兜底：返回主页
      if (event.request.mode === 'navigate') {
        return caches.match('/IPHONEEX/index.html');
      }
    })
  );
});
