// Fotografa cada cenário de uma maqueta em todas as vistas: npm run build-mock -- mockups/<nome>.html && node src/tools/venue-shots.ts <nome>
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const PAGE = process.argv[2] ?? 'cenarios';
const OUT = `dist-check/${PAGE}`;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL ?? (process.env.BROWSER_PATH || process.platform !== 'win32' ? undefined : 'msedge'),
  executablePath: process.env.BROWSER_PATH || undefined,
});
const page = await browser.newPage();
const errors: string[] = [];
page.on('pageerror', e => errors.push(e.stack ?? String(e)));
await page.goto(pathToFileURL(resolve(`dist-mock/${PAGE}.html`)).href);
await page.waitForTimeout(500);
const views = await page.evaluate(() => (window as unknown as { viewIds: string[] }).viewIds);
if (!views) {
  console.error('A maqueta não arrancou:', errors);
  process.exit(1);
}
const overlaps = await page.evaluate(() => (window as unknown as { overlaps?: Record<string, string[]> }).overlaps);
if (overlaps) {
  for (const [name, list] of Object.entries(overlaps)) console.log(`${name}: ${list.length ? `${list.length} sobreposições\n  ${list.join('\n  ')}` : 'sem sobreposições'}`);
}
let count = 0;
for (const view of views) {
  mkdirSync(`${OUT}/${view}`, { recursive: true });
  await page.evaluate(v => (window as unknown as { setAllViews: (id: string) => void }).setAllViews(v), view);
  const shots = await page.evaluate(() => [...document.querySelectorAll('canvas')].map(c => [c.dataset.name!, c.toDataURL()] as const));
  shots.forEach(([name, url], i) => writeFileSync(`${OUT}/${view}/${String(i + 1).padStart(2, '0')}-${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}.png`, Buffer.from(url.split(',')[1]!, 'base64')));
  count = shots.length;
}
console.log(`${count} cenários × ${views.length} vistas em ${OUT}`, errors.length ? errors : '');
await browser.close();
