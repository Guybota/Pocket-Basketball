// Abre a página anim.html num browser sem janela, servida pelo Vite: a base do anim-check e do review.
// No Windows usa o Edge instalado; noutra máquina o Chromium do Playwright, ou o browser em BROWSER_PATH, ou o canal em BROWSER_CHANNEL.
import { chromium, type Page } from 'playwright-core';
import { createServer } from 'vite';

/** Corre `work` com a página pronta (window.__anim existe) e fecha tudo no fim, mesmo com erro. */
export async function withAnimPage<T>(work: (page: Page) => Promise<T>, onPageError: (message: string) => void, reducedMotion = false): Promise<T> {
  const server = await createServer({ server: { port: 4176, strictPort: false }, logLevel: 'warn' });
  await server.listen();
  const url = server.resolvedUrls!.local[0]!;
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL ?? (process.env.BROWSER_PATH || process.platform !== 'win32' ? undefined : 'msedge'),
    executablePath: process.env.BROWSER_PATH || undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
    page.on('console', message => console.log('  ', message.text().slice(0, 300)));
    page.on('pageerror', error => onPageError(error.message));
    await page.goto(`${url}anim.html`);
    await page.waitForFunction(() => (window as unknown as { __anim?: unknown }).__anim !== undefined);
    return await work(page);
  } finally {
    await browser.close();
    await server.close();
  }
}
