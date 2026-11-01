// Guarda imagens das poses e dos movimentos especiais, sem correr o jogo: npm run anim-check
// Usa o Edge instalado. Noutra máquina: BROWSER_CHANNEL=chrome npm run anim-check
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const OUT = 'dist-check';
mkdirSync(OUT, { recursive: true });
const server = await createServer({ server: { port: 4176, strictPort: false }, logLevel: 'warn' });
await server.listen();
const url = server.resolvedUrls!.local[0]!;
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });
const save = (name: string, dataUrl: string): void => {
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(dataUrl.split(',')[1]!, 'base64'));
  console.log(`${OUT}/${name}.png`);
};
let failed = false;
try {
  const page = await browser.newPage();
  page.on('console', message => console.log('  ', message.text().slice(0, 300)));
  page.on('pageerror', error => {
    failed = true;
    console.log('ERRO', error.message);
  });
  await page.goto(`${url}anim.html`);
  await page.waitForFunction(() => (window as unknown as { __anim?: unknown }).__anim !== undefined);
  save('poses', await page.evaluate(() => (window as unknown as { __anim: { poseSheet(): string } }).__anim.poseSheet()));
  const moves = await page.evaluate(() => (window as unknown as { __anim: { moves: readonly string[] } }).__anim.moves);
  for (const move of moves) {
    const result = await page.evaluate(m => (window as unknown as { __anim: { moveStrip(move: string, frames: number): { image: string; floaters: number } | null } }).__anim.moveStrip(m, 8), move);
    if (!result) {
      failed = true;
      console.log(`FALHOU ${move}: não aconteceu em nenhum dos jogos`);
      continue;
    }
    if (result.floaters === 0) {
      failed = true;
      console.log(`FALHOU ${move}: sem o nome por cima do jogador`);
    }
    save(`movimento-${move}`, result.image);
  }
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
