// Fotografa o campo do jogo verdadeiro em cada divisão pedida: a câmara de sempre e o grande plano automático da bola ao alto;
// com --demo, também o jogo de demonstração do ecrã inicial, na mesma janela.
// node src/tools/court-shots.ts 2 3 [--demo]   (imagens em dist-check/campos/)
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { build, preview } from 'vite';

const OUT = 'dist-check/campos';
mkdirSync(OUT, { recursive: true });
const withDemo = process.argv.includes('--demo');
const divisions = process.argv.slice(2).filter(a => !a.startsWith('--')).map(Number);
if (divisions.length === 0) divisions.push(0, 1, 2, 3);

await build({ logLevel: 'warn' });
const server = await preview({ preview: { port: 4174, strictPort: false }, logLevel: 'warn' });
const url = server.resolvedUrls!.local[0]!;
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL ?? (process.env.BROWSER_PATH || process.platform !== 'win32' ? undefined : 'msedge'),
  executablePath: process.env.BROWSER_PATH || undefined,
  headless: true,
});

type Pocket = { pauseAt: (event: string, n: number) => void; state: () => { demo: number | null } };
let count = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(String(e)));
  for (const division of divisions) {
    // Cada imagem numa página nova: o jogo em pausa não acaba o zoom de um grande plano, que ficava nas imagens seguintes.
    const open = async (): Promise<void> => {
      await page.goto(`${url}?semente=11&divisao=${division}`);
      await page.waitForFunction(() => (window as unknown as { __pocket?: unknown }).__pocket !== undefined);
      await page.click('#arenaChip');
      await page.click('#kickoffBtn');
      await page.locator('#introSkip').click({ timeout: 4000 }).catch(() => {});
      await page.waitForSelector('#pauseBtn');
    };
    const shot = async (event: string, extra: number, name: string): Promise<void> => {
      await page.evaluate(([e, n]) => (window as unknown as { __pocket: Pocket }).__pocket.pauseAt(e as string, n as number), [event, extra]);
      await page.waitForTimeout(400);
      await page.locator('.screen').screenshot({ path: `${OUT}/divisao-${division}-${name}.png` });
      count++;
    };
    await open();
    await shot('shot', 6, 'jogo');
    // O grande plano automático da bola ao alto (a imagem ao dobro).
    await open();
    await shot('fase:jump', 0, 'aproximado');
  }
  if (withDemo) {
    // O jogo de demonstração começa sozinho no ecrã inicial, ao fim de uns segundos sem toques.
    // Numa sessão limpa e sem ?semente=, que abre um clube de ensaio em vez do ecrã inicial.
    const fresh = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await fresh.goto(url);
    await fresh.waitForSelector('#newClubBtn');
    await fresh.waitForFunction(() => ((window as unknown as { __pocket?: Pocket }).__pocket?.state().demo ?? 0) > 60, undefined, { timeout: 30_000 });
    await fresh.screenshot({ path: `${OUT}/demonstracao.png` });
    count++;
  }
  console.log(`${count} imagens em ${OUT}`, errors.length ? errors : '');
} finally {
  await browser.close();
  await server.close();
}
