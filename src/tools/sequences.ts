// Grava em vídeo os momentos do jogo que as imagens paradas não mostram (transições, câmara, animações), para comparar com
// as sequências de referência em docs/referencias/calciobit/sequencias/. Grava em tempo real, como um jogador veria.
//   npm run sequences [-- pasta]
// Deixa em dist-check/sequencias/ um vídeo por percurso (.mp4, 1280×720, com o ffmpeg do sistema) e marcas.json com o segundo de cada momento no
// vídeo. Os frames tiram-se depois com o ffmpeg, a partir dessas marcas.
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { chromium, type Page } from 'playwright-core';
import { build, preview } from 'vite';

const OUT = process.argv[2] ?? 'dist-check/sequencias';
mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(OUT)) rmSync(`${OUT}/${file}`, { recursive: true, force: true });
await build({ logLevel: 'warn' });
const server = await preview({ preview: { port: 4174, strictPort: false }, logLevel: 'warn' });
const url = server.resolvedUrls!.local[0]!;
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL ?? (process.env.BROWSER_PATH || process.platform !== 'win32' ? undefined : 'msedge'),
  executablePath: process.env.BROWSER_PATH || undefined,
  headless: true,
});
const size = { width: 1280, height: 720 };
const marks: Record<string, Record<string, number>> = {};

/** Um percurso num contexto novo, com o seu vídeo; `mark` guarda o segundo do vídeo em que um momento começa. */
async function route(name: string, run: (p: Page, mark: (label: string) => void) => Promise<void>): Promise<void> {
  const context = await browser.newContext({ viewport: size });
  const page = await context.newPage();
  // O browser manda uma imagem a cada mudança no ecrã; o ffmpeg do sistema junta-as pela hora de chegada.
  const ffmpeg = spawn('ffmpeg', ['-v', 'error', '-y', '-use_wallclock_as_timestamps', '1', '-f', 'image2pipe', '-c:v', 'mjpeg', '-i', '-',
    '-fps_mode', 'vfr', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', `${OUT}/${name}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
  const cdp = await context.newCDPSession(page);
  let first = 0;
  cdp.on('Page.screencastFrame', frame => {
    first ||= Date.now();
    ffmpeg.stdin.write(Buffer.from(frame.data, 'base64'));
    cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: size.width, maxHeight: size.height });
  const t0 = Date.now();
  const own: Record<string, number> = {};
  marks[name] = own;
  const mark = (label: string): void => {
    // O vídeo começa na primeira imagem que chega.
    own[label] = Math.round((Date.now() - (first || t0)) / 100) / 10;
    console.log(`${name} ${own[label]!.toFixed(1)} s  ${label}`);
  };
  page.on('pageerror', error => console.log('ERRO NA PÁGINA', error.message));
  try {
    await run(page, mark);
  } catch (error) {
    console.log(`FALHOU ${name}:`, (error as Error).message);
  }
  await cdp.send('Page.stopScreencast').catch(() => {});
  await context.close();
  ffmpeg.stdin.end();
  await new Promise(done => ffmpeg.on('close', done));
}

const ready = (p: Page) => p.waitForFunction(() => window.__pocket !== undefined);
const phase = (p: Page) => p.evaluate(() => window.__pocket.state().phase);
const speed = (p: Page, v: number) => p.evaluate(x => window.__pocket.setSpeedRaw(x), v);
/** Fecha as trocas que os descontos do adversário abrem, até a condição se cumprir. */
const until = async (p: Page, done: () => Promise<boolean>, timeout = 120_000): Promise<void> => {
  const deadline = Date.now() + timeout;
  while (!(await done())) {
    if (Date.now() > deadline) throw new Error('tempo esgotado');
    if (await p.locator('.subs-title').count()) await p.click('[data-subs-close]');
    else await p.waitForTimeout(150);
  }
};
/** Volta à cidade com o Esc, que fecha o ecrã aberto, como faria o teclado. */
const toTown = async (p: Page): Promise<void> => {
  for (let i = 0; i < 5 && !(await p.locator('#arenaChip').isVisible()); i++) {
    await p.keyboard.press('Escape');
    await p.waitForTimeout(900);
  }
};
/** Salta para o momento pedido e deixa o jogo correr à velocidade normal durante `seconds`. */
const moment = async (p: Page, mark: (l: string) => void, label: string, event: string, extra: number, seconds: number, move?: string): Promise<boolean> => {
  const { found } = await p.evaluate(([e, x, m]) => window.__pocket.pauseAt(e as string, x as number, Infinity, (m as string) || undefined), [event, extra, move ?? ''] as const);
  if (!found) return false;
  await speed(p, 1);
  await p.waitForTimeout(300);
  mark(label);
  await p.click('#pauseBtn');
  await p.waitForTimeout(seconds * 1000);
  return true;
};

try {
  // Menus: título, criar clube, cidade, treino com o combo, escritório, mercado, ficha e a passagem ao pavilhão.
  await route('menus', async (p, mark) => {
    await p.goto(url);
    await p.waitForSelector('#newClubBtn');
    mark('titulo');
    await p.waitForTimeout(4000);
    mark('titulo-para-criar');
    await p.click('#newClubBtn');
    await p.waitForSelector('#startClubBtn');
    await p.waitForTimeout(1500);
    mark('criar-para-cidade');
    await p.click('#startClubBtn');
    await p.waitForSelector('#arenaChip');
    await p.waitForTimeout(3000);
    mark('cidade-para-treino');
    await p.click('#trainBtn');
    await p.waitForSelector('.prow');
    await p.waitForTimeout(1200);
    mark('treino-abrir-jogador');
    await p.click('[data-player="0"]');
    await p.waitForTimeout(1000);
    await p.click('[data-act="openCards"]');
    await p.waitForTimeout(1000);
    mark('treino-escolher-cartas');
    for (const card of ['dribble', 'sprints', 'readDefense']) {
      await p.click(`[data-card="${card}"]`);
      await p.waitForTimeout(600);
    }
    mark('treino-combo');
    await p.click('[data-act="trainNow"]');
    await p.waitForTimeout(4000);
    mark('treino-para-cidade');
    await p.click('[data-go="train"]');
    await p.waitForTimeout(1000);
    await toTown(p);
    await p.waitForTimeout(1500);
    mark('cidade-para-escritorio');
    await p.click('#officeBtn');
    await p.waitForTimeout(1800);
    mark('escritorio-para-mercado');
    await p.click('[data-go="market"]');
    await p.waitForTimeout(1500);
    mark('mercado-abrir-jogador');
    await p.click('[data-market="0"]');
    await p.waitForTimeout(1500);
    mark('mercado-contratar');
    await p.click('[data-act="offer"]');
    await p.waitForTimeout(2000);
    mark('mercado-para-cidade');
    await toTown(p);
    await p.waitForTimeout(1500);
    mark('cidade-para-federacao');
    await p.click('#federationBtn');
    await p.waitForTimeout(1800);
    await toTown(p);
    await p.evaluate(n => window.__pocket.fastForward(n), 3);
    await p.waitForTimeout(1500);
    mark('cidade-para-pavilhao');
    await p.click('#arenaChip');
    await p.waitForTimeout(2500);
  });

  // O jogo: do pavilhão à bola ao alto, câmara a seguir o jogo, cestos, movimentos especiais, faltas, desconto,
  // fim de período, intervalo, regresso, fim do jogo, relatório e volta à cidade.
  await route('jogo', async (p, mark) => {
    await p.goto(`${url}?semente=10&divisao=2`);
    await ready(p);
    await p.waitForSelector('#arenaChip');
    await p.waitForTimeout(1000);
    mark('cidade-para-pavilhao');
    await p.click('#arenaChip');
    await p.waitForSelector('#kickoffBtn');
    await p.waitForTimeout(2000);
    mark('pavilhao-para-apresentacao');
    await p.click('#kickoffBtn');
    await p.waitForSelector('#introSkip');
    // A apresentação dos cinco passa sozinha à bola ao alto.
    await p.waitForTimeout(12_000);
    mark('jogo-corrido');
    await p.waitForTimeout(25_000);
    await moment(p, mark, 'lancamento', 'shot', 0, 5);
    // A semente 10 na divisão 2 tem estes movimentos e contactos (vê-se na simulação); um que não houvesse levava o jogo até ao fim.
    for (const move of ['crossover', 'powerDunk']) await moment(p, mark, `movimento-${move}`, 'move', 0, 5, move);
    await moment(p, mark, 'roubo', 'steal', 0, 4);
    await moment(p, mark, 'desarme', 'block', 0, 4);
  });

  // As paragens, num jogo começado de novo: a primeira falta com lances livres, um choque e um desconto do treinador.
  await route('paragens', async (p, mark) => {
    await p.goto(`${url}?semente=10&divisao=2`);
    await ready(p);
    await p.click('#arenaChip');
    await p.click('#kickoffBtn');
    await p.waitForTimeout(12_000);
    await moment(p, mark, 'falta-e-lances-livres', 'foul', 0, 12);
    await moment(p, mark, 'choque', 'knockdown', 0, 6);
    if ((await phase(p)) !== 'end' && !(await p.locator('#timeoutBtn').isDisabled())) {
      mark('desconto');
      await p.click('#timeoutBtn');
      await p.click('#timeoutBtn');
      await p.waitForTimeout(14_000);
    }
  });

  // Do fim do 1.º período ao regresso à cidade, num jogo começado de novo.
  await route('jogo-fim', async (p, mark) => {
    await p.goto(`${url}?semente=10&divisao=2`);
    await ready(p);
    await p.click('#arenaChip');
    await p.click('#kickoffBtn');
    await p.waitForTimeout(12_000);
    await moment(p, mark, 'fim-de-periodo', 'periodEnd', 0, 12);
    await speed(p, 40);
    await until(p, async () => (await phase(p)) !== 'break');
    await moment(p, mark, 'intervalo', 'periodEnd', 0, 9);
    await until(p, async () => (await p.locator('#secondHalfBtn').count()) > 0);
    await p.waitForTimeout(1500);
    mark('regresso-segunda-parte');
    await p.click('#secondHalfBtn');
    await p.waitForTimeout(8000);
    await p.evaluate(() => window.__pocket.pauseAt('fase:end', 0));
    await speed(p, 1);
    mark('fim-do-jogo');
    await p.click('#pauseBtn');
    await until(p, () => p.evaluate(() => window.__pocket.state().finished), 30_000);
    await p.waitForTimeout(3000);
    if (await p.locator('#replayBtn').count()) {
      mark('repeticao');
      await p.click('#replayBtn');
      await p.waitForTimeout(6000);
      await p.click('#replayBack').catch(() => {});
      await p.waitForTimeout(1500);
    }
    mark('relatorio-para-cidade');
    await p.click('#againBtn');
    await p.waitForTimeout(4000);
  });

  // A cerimónia do troféu, numa final ganha (tenta-se com clubes fortes até um ganhar).
  await route('cerimonia', async (p, mark) => {
    for (const [seed, division] of [[12, 1], [11, 1], [10, 0], [9, 0]] as const) {
      await p.goto(`${url}?semente=${seed}&divisao=${division}`);
      await ready(p);
      await p.evaluate(() => window.__pocket.forceTitle({ kind: 'league', division: 1 }));
      await p.click('#arenaChip');
      await p.click('#kickoffBtn');
      await speed(p, 40);
      await until(p, async () => (await p.locator('#secondHalfBtn').count()) > 0);
      await p.click('#secondHalfBtn');
      await p.evaluate(() => window.__pocket.pauseAt('fase:end', 0));
      const { score } = await p.evaluate(() => window.__pocket.state());
      if (score[0] <= score[1]) continue;
      await speed(p, 1);
      mark('fim-com-titulo');
      await p.click('#pauseBtn');
      await p.waitForTimeout(16_000);
      mark('cerimonia-para-relatorio');
      await p.waitForTimeout(4000);
      return;
    }
    console.log('AVISO  nenhum clube ganhou a final: sem cerimónia');
  });
} finally {
  writeFileSync(`${OUT}/marcas.json`, JSON.stringify(marks, null, 2));
  await browser.close();
  server.httpServer.close();
}
