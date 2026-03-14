const CACHE_NAME = 'stretch-flow-shell-v4';
const SHELL_ASSETS = [
  './',
  './index.html',
  './styles/main.css',
  './src/main.js',
  './src/config/featureFlags.js',
  './manifest.webmanifest',
  './assets/icons/icon.svg',
  './assets/icons/icon-maskable.svg',
  './assets/illustration-stretch.svg',
  '../../packages/domain/src/models.js',
  '../../packages/domain/src/analytics.js',
  '../../packages/domain/src/planner.js',
  '../../packages/domain/src/recovery.js',
  '../../packages/domain/src/routines.js',
  '../../packages/domain/src/session.js',
  '../../packages/domain/src/streaks.js',
  '../../packages/storage/src/localStore.js',
  '../../packages/integrations/health-sync/src/index.js',
  '../../packages/integrations/health-sync/src/googleHealthAdapter.js',
  '../../packages/integrations/health-sync/src/healthConnectAdapter.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') return response;

          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }

          return new Response('Offline asset unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
    })
  );
});
