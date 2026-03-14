const CACHE_NAME = 'stretch-flow-shell-v6';
const SHELL_ASSETS = [
  './',
  './index.html',
  './styles/main.css',
  './src/main.js',
  './src/config/featureFlags.js',
  './src/lib/domain/models.js',
  './src/lib/domain/analytics.js',
  './src/lib/content/loader.js',
  './src/lib/content/schema.js',
  './src/lib/content/seedPack.v1.js',
  './src/lib/domain/planner.js',
  './src/lib/domain/recovery.js',
  './src/lib/domain/routines.js',
  './src/lib/domain/session.js',
  './src/lib/domain/streaks.js',
  './src/lib/storage/localStore.js',
  './src/lib/integrations/index.js',
  './src/lib/integrations/googleHealthAdapter.js',
  './src/lib/integrations/healthConnectAdapter.js',
  './manifest.webmanifest',
  './assets/icons/icon.svg',
  './assets/icons/icon-maskable.svg',
  './assets/illustration-stretch.svg',
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
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const networkFirst = async () => {
    try {
      const response = await fetch(event.request);
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    } catch {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
      return new Response('Offline asset unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
      });
    }
  };

  event.respondWith(networkFirst());
});
