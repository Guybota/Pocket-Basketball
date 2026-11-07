// Modo offline: vai primeiro à rede, para as atualizações chegarem logo, e guarda uma cópia de tudo.
// Se a rede não responder em poucos segundos, ou não houver rede, serve a última cópia guardada.
const CACHE = 'pocket-basketball';
// Cada versão publicada traz ficheiros com nomes novos; guardam-se só as entradas mais recentes, para a cache não crescer sem fim.
const MAX_ENTRIES = 40;
const NETWORK_WAIT_MS = 4000;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

async function trim(cache) {
  const keys = await cache.keys();
  // As chaves vêm pela ordem em que foram guardadas: saem as mais antigas.
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).map(key => cache.delete(key)));
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // A página abre com ou sem ?semente=, por isso a cópia da página serve para qualquer endereço.
    // ignoreVary: a cópia pode ter sido guardada pela página, sem os cabeçalhos do pedido de um módulo (Origin).
    const saved = () => cache.match(request, { ignoreSearch: request.mode === 'navigate', ignoreVary: true });
    // A página pergunta sempre ao servidor se mudou; sem isto, o browser podia usar uma cópia com até 10 minutos.
    const network = (request.mode === 'navigate' ? fetch(request.url, { cache: 'no-cache' }) : fetch(request)).then(async response => {
      if (response.ok || response.type === 'opaque') {
        await cache.delete(request);
        await cache.put(request, response.clone());
        event.waitUntil(trim(cache));
      }
      return response;
    });
    network.catch(() => {}); // se servirmos a cópia, uma falha da rede mais tarde não é um erro
    const slow = new Promise(resolve => setTimeout(resolve, NETWORK_WAIT_MS, null));
    try {
      const first = await Promise.race([network, slow]);
      if (first) return first;
      // A rede está lenta: com cópia, serve-a já; sem cópia, espera pela rede.
      return (await saved()) ?? await network;
    } catch {
      return (await saved()) ?? Response.error();
    }
  })());
});
