// Modo offline: vai sempre primeiro à rede, para as atualizações chegarem logo, e guarda uma cópia de tudo.
// Sem rede, serve a última cópia guardada.
// shortcut: as versões antigas dos ficheiros ficam na cache (cerca de 350 KB cada), limpar se a cache crescer demais.
const CACHE = 'pocket-basketball';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok || response.type === 'opaque') await cache.put(request, response.clone());
      return response;
    } catch {
      // A página abre com ou sem ?semente=, por isso a cópia da página serve para qualquer endereço.
      const saved = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
      return saved ?? Response.error();
    }
  })());
});
