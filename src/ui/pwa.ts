/// <reference types="vite/client" />
// O jogo publicado como app: funciona sem rede e avisa quando há uma versão nova.

export function initPwa(): void {
  if (!import.meta.env.PROD) return;
  // Modo offline: só no jogo publicado, porque no `npm run dev` a cache atrapalhava.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(async () => {
      // O que a página já carregou antes do service worker existir também tem de ficar guardado.
      const cache = await caches.open('pocket-basketball');
      const urls = [location.href.split('?')[0]!, ...performance.getEntriesByType('resource').map(entry => entry.name)];
      await Promise.all(urls.map(url => fetch(url, { mode: 'no-cors' }).then(response => cache.put(url, response)).catch(() => {})));
    }).catch(() => {});
  }
  // Ao voltar à app, que o iPad muitas vezes só retoma sem recarregar, vê se o jogo publicado mudou.
  // Não recarrega sozinho, para não cortar um jogo a meio: mostra um botão.
  const running = document.querySelector('script[type="module"][src]')?.getAttribute('src');
  const checkForUpdate = async (): Promise<void> => {
    if (!running || !navigator.onLine || document.getElementById('updateBtn')) return;
    const html = await fetch(location.pathname, { cache: 'no-cache' }).then(response => (response.ok ? response.text() : '')).catch(() => '');
    const published = html.match(/<script type="module"[^>]*src="([^"]+)"/)?.[1];
    if (!published || published === running) return;
    document.body.insertAdjacentHTML('beforeend', '<button type="button" class="primary update-ready" id="updateBtn">Há uma versão nova · Atualizar</button>');
    document.getElementById('updateBtn')!.addEventListener('click', () => location.reload());
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate();
  });
}
