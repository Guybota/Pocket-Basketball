// Fotografa a mesma jogada com várias posições de câmara, em vertical e horizontal: BASE=http://localhost:5173 node docs/mockups/capture-camera.mjs
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
const base = process.env.BASE ?? 'http://localhost:5173';
const dir = new URL('./capturas-camara/', import.meta.url);
mkdirSync(dir, { recursive: true });
const OPTIONS = [
  ['E1-como-estava', { cy: 9, cz: 9.5, lookY: -1.6, focal: 330 }],
  ['E2-um-passo-atras', { cy: 10.2, cz: 10.2, lookY: -1.4, focal: 330 }],
  ['E3-dois-passos-atras', { cy: 11.4, cz: 11, lookY: -1.2, focal: 330 }],
  ['E4-atras-lente-aberta', { cy: 10.2, cz: 10.2, lookY: -1.4, focal: 300 }],
  ['E5-atras-e-mais-alta', { cy: 11, cz: 12.2, lookY: -1.3, focal: 330 }],
  ['E6-longe-lente-aberta', { cy: 11.8, cz: 11, lookY: -1.1, focal: 290 }],
];
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });
try {
  for (const [name, viewport] of [['vertical', { width: 390, height: 760 }], ['horizontal', { width: 900, height: 500 }]]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
    await page.goto(`${base}/?semente=21&divisao=2`);
    await page.waitForFunction(() => window.__pocket !== undefined);
    await page.click('#arenaChip');
    await page.click('#kickoffBtn');
    await page.waitForSelector('#introSkip');
    await page.click('#introSkip');
    await page.evaluate(() => window.__pocket.pauseAt('made', 6));
    for (const [label, tuning] of OPTIONS) {
      await page.evaluate(t => window.__pocket.tuneCamera(t), tuning);
      // A etiqueta por cima do campo, para se saber qual é qual.
      await page.evaluate(text => {
        let tag = document.getElementById('cameraTag');
        if (!tag) {
          tag = document.createElement('div');
          tag.id = 'cameraTag';
          tag.style.cssText = 'position:fixed;z-index:99;left:8px;top:8px;padding:6px 12px;background:#1b2230;color:#f2c230;border:3px solid #f2c230;font:700 28px/1 sans-serif;pointer-events:none';
          document.body.append(tag);
        }
        tag.textContent = text;
      }, label.replace(/-/g, ' '));
      await page.waitForTimeout(250);
      const box = await page.locator('#court').boundingBox();
      await page.screenshot({ path: fileURLToPath(new URL(`${name}-${label}.png`, dir)), clip: box });
    }
    await page.close();
  }
  console.log('OK: capturas em docs/mockups/capturas-camara/');
} finally {
  await browser.close();
}
