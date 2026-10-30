// Abre o jogo num browser verdadeiro e confirma o que os testes em Node não conseguem ver.
// Usa o Edge instalado. Noutra máquina: BROWSER_CHANNEL=chrome npm run browser-check
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { preview, build } from 'vite';
import { matchHash } from '../sim/hash.ts';
import { simulateMatch } from '../sim/match.ts';
import { matchTeams } from '../ui/setup.ts';

interface Pocket {
  hashFor(seed: number, division: number): string;
  state(): { phase: string; tick: number; period: number; score: [number, number]; started: boolean; finished: boolean; announced: string[] };
  setSpeedRaw(value: number): void;
  pauseAt(eventType: string, extraTicks: number, maxDistance?: number): { phase: string; found: boolean };
  resetRenderStats(): void;
  renderStats(): { meanMs: number; frames: number };
}
declare global {
  interface Window {
    __pocket: Pocket;
  }
}

const OUT = 'dist-check';
mkdirSync(OUT, { recursive: true });
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${name}${detail ? `: ${detail}` : ''}`);
  if (!ok) failures.push(name);
};

await build({ logLevel: 'warn' });
const server = await preview({ preview: { port: 4173, strictPort: false }, logLevel: 'warn' });
const url = server.resolvedUrls!.local[0]!;
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });

try {
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
  const page = await phone.newPage();
  const problems: string[] = [];
  page.on('pageerror', error => problems.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('fonts.g')) problems.push(message.text());
  });
  await page.goto(`${url}?semente=7&divisao=2`);
  await page.waitForFunction(() => window.__pocket !== undefined);

  // O mesmo jogo tem de dar o mesmo resultado aqui e em Node.
  for (const [seed, division] of [[1, 0], [7, 2], [12345, 3], [99, 1]] as const) {
    const inNode = matchHash(simulateMatch(...matchTeams(seed, division), seed));
    const inBrowser = await page.evaluate(([s, d]) => window.__pocket.hashFor(s!, d!), [seed, division]);
    check(`Repetição igual no browser (semente ${seed})`, inNode === inBrowser, inBrowser);
  }

  await page.screenshot({ path: `${OUT}/inicio.png` });
  await page.click('#startBtn');
  await page.waitForFunction(() => window.__pocket.state().tick > 5);
  check('O jogo começa ao carregar no botão', (await page.evaluate(() => window.__pocket.state().started)));

  // Sequência de frames para ver o movimento.
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(450);
    await page.locator('.screen').screenshot({ path: `${OUT}/frame-${i}.png` });
  }
  await page.screenshot({ path: `${OUT}/jogo.png` });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  check('Sem deslocamento horizontal no telemóvel', !overflow);

  // Desempenho com o processador 4× mais lento, como aproximação a um telemóvel médio.
  const cdp = await phone.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => window.__pocket.resetRenderStats());
  await page.waitForTimeout(3000);
  const stats = await page.evaluate(() => window.__pocket.renderStats());
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  check('Desenhar um frame demora menos de 16 ms com CPU 4× mais lento', stats.meanMs < 16, `${stats.meanMs.toFixed(1)} ms em ${stats.frames} frames`);

  // Separadores e fim do jogo.
  await page.click('[data-tab="stats"]');
  await page.screenshot({ path: `${OUT}/stats.png` });
  await page.click('[data-tab="feed"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/relato.png` });
  await page.click('[data-tab="bench"]');
  await page.click('[data-speed="4"]');
  await page.evaluate(() => window.__pocket.setSpeedRaw(40));
  await page.waitForFunction(() => window.__pocket.state().finished, undefined, { timeout: 90_000 });
  await page.screenshot({ path: `${OUT}/fim.png` });
  const final = await page.evaluate(() => window.__pocket.state());
  const expected = simulateMatch(...matchTeams(7, 2), 7);
  check('O jogo visto acaba com o resultado da simulação', final.score[0] === expected.score[0] && final.score[1] === expected.score[1], `${final.score[0]}-${final.score[1]}`);
  check('Os avisos de momentos altos aparecem', final.announced.includes('Afundanço!') && final.announced.includes('Intervalo'), final.announced.join(', '));
  await page.click('#againBtn');
  await page.waitForSelector('#startBtn');
  check('Sem erros na página', problems.length === 0, problems.join(' | '));

  // Os momentos que importam, para ver como ficam.
  const moments = await phone.newPage();
  const capture = async (name: string, type: string, extra: number, maxDistance?: number): Promise<void> => {
    await moments.goto(`${url}?semente=21&divisao=2`);
    await moments.waitForFunction(() => window.__pocket !== undefined);
    await moments.click('#startBtn');
    const result = await moments.evaluate(([t, e, d]) => window.__pocket.pauseAt(t as string, e as number, d as number | undefined), [type, extra, maxDistance] as const);
    await moments.waitForTimeout(150);
    await moments.locator('.screen').screenshot({ path: `${OUT}/momento-${name}.png` });
    if (!result.found) console.log(`AVISO  momento "${name}" não aconteceu neste jogo`);
  };
  await capture('lancamento', 'shot', 7);
  await capture('cesto', 'made', 3);
  await capture('lance-livre', 'fase:freeThrow', 30);
  await capture('desarme', 'block', 3);
  await capture('afundanco', 'shot', 3, 1.7);
  await capture('fim-periodo', 'period', 0);

  // As outras divisões e o computador.
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const big = await desktop.newPage();
  for (const division of [0, 1, 3]) {
    await big.goto(`${url}?semente=11&divisao=${division}`);
    await big.waitForFunction(() => window.__pocket !== undefined);
    await big.click('#startBtn');
    await big.waitForTimeout(3500);
    await big.screenshot({ path: `${OUT}/divisao-${division}.png` });
  }
} finally {
  await browser.close();
  await server.close();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} verificação(ões) falhou/falharam.`);
  process.exit(1);
}
console.log(`\nTudo certo. Imagens em ${OUT}/`);
process.exit(0);
