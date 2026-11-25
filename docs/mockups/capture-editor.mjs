// Fotografa as seis alternativas dos editores: node docs/mockups/capture-editor.mjs (com o npm run dev a correr em 5173).
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
const base = process.env.BASE ?? 'http://127.0.0.1:5173';
const dir = new URL('./capturas-editor/', import.meta.url);
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  for (const screen of ['e1', 'e2', 'e3', 'k1', 'k2', 'k3']) {
    await page.goto(`${base}/docs/mockups/editor-v2.html?screen=${screen}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await page.locator('#game').screenshot({ path: fileURLToPath(new URL(`${screen}.png`, dir)) });
  }
  // Um toque em cada tipo de controlo, para a maqueta não estar partida.
  await page.goto(`${base}/docs/mockups/editor-v2.html?screen=k1`);
  await page.locator('[data-part="shorts"]').first().click();
  await page.locator('[data-kit-color="#cf3a2c"]').click();
  await page.locator('[data-pattern="sash"]').click();
  await page.goto(`${base}/docs/mockups/editor-v2.html?screen=e3`);
  await page.locator('[data-stamp="star"]').click();
  await page.locator('[data-px="40"]').click();
  await page.setViewportSize({ width: 740, height: 400 });
  await page.evaluate(() => window.__emblemGallery());
  await page.waitForTimeout(200);
  await page.screenshot({ path: fileURLToPath(new URL('galeria.png', dir)), fullPage: true });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('OK: seis capturas em docs/mockups/capturas-editor/');
} finally {
  await browser.close();
}
