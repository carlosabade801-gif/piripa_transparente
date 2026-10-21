/* Financial data is always network-only. Never substitute an old API response. */
const CACHE = 'piripa-shell-v4';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/offline.html', '/icons/icon-192x192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE && /piripa|transparente/i.test(key)).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => new Response(JSON.stringify({ status: 'unavailable', error: { code: 'OFFLINE', message: 'Sem conexão. Os dados financeiros precisam de uma consulta à fonte.' } }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })));
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match('/offline.html')));
    return;
  }
  // Only immutable build assets are cached. No old HTML/app shell with old calculations.
  if (url.pathname.startsWith('/assets/')) event.respondWith(caches.open(CACHE).then(async cache => {
    const saved = await cache.match(event.request); if (saved) return saved;
    const response = await fetch(event.request); if (response.ok) await cache.put(event.request, response.clone()); return response;
  }));
});
