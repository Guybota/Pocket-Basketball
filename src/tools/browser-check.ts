// Abre o jogo num browser verdadeiro e confirma o que os testes em Node não conseguem ver.
// Usa o Edge instalado. Noutra máquina: BROWSER_CHANNEL=chrome npm run browser-check
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { preview, build } from 'vite';
import { matchHash } from '../sim/hash.ts';
import { simulateMatch } from '../sim/match.ts';
import { clubTeam, newClub, opponentOf, weekSeed, type ClubState } from '../ui/club.ts';

interface Pocket {
  hashFor(seed: number, division: number): string;
  state(): { phase: string; tick: number; period: number; score: [number, number]; started: boolean; finished: boolean; announced: string[]; canvas: { width: number; height: number } };
  setSpeedRaw(value: number): void;
  runningDribblePoses(): string[];
  replayMatchesCurrent(): boolean;
  soundsPlayed(): string[];
  playAllSounds(): void;
  onCourtNames(): string[];
  frontBackFlips(): { perPlayerMinute: number; shortestSeconds: number };
  club(): ClubState | null;
  found(): string[];
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
const firstMatch = (seed: number, division: number) => {
  const club = newClub(seed, division);
  return simulateMatch(clubTeam(club), opponentOf(club), weekSeed(club), [true, false]);
};
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
    const inNode = matchHash(firstMatch(seed, division));
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
  const expected = firstMatch(7, 2);
  check('O jogo visto acaba com o resultado da simulação', final.score[0] === expected.score[0] && final.score[1] === expected.score[1], `${final.score[0]}-${final.score[1]}`);
  const heard = await page.evaluate(() => window.__pocket.soundsPlayed());
  for (const name of ['whistle', 'buzzer', 'horn']) check(`Toca o som "${name}" durante o jogo`, heard.includes(name), heard.join(', '));
  await page.evaluate(() => window.__pocket.playAllSounds());
  check('Os avisos de momentos altos aparecem', final.announced.includes('Afundanço!') && final.announced.includes('Intervalo'), final.announced.join(', '));
  await page.click('#againBtn');
  await page.waitForSelector('#startBtn');
  check('Sem erros na página', problems.length === 0, problems.join(' | '));

  // O ciclo de uma semana, como um jogador o faria, com o clube guardado a sério.
  const season = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
  const coach = await season.newPage();
  const coachProblems: string[] = [];
  coach.on('pageerror', error => coachProblems.push(error.message));
  await coach.goto(url);
  await coach.waitForSelector('#newClubBtn');
  await coach.screenshot({ path: `${OUT}/clube-novo.png` });
  await coach.click('[data-division="1"]');
  await coach.click('#newClubBtn');
  await coach.waitForSelector('#startBtn');
  await coach.screenshot({ path: `${OUT}/clube.png` });
  check('O clube novo guarda a divisão escolhida', await coach.evaluate(() => window.__pocket.club()!.division === 1));
  await coach.click('#trainBtn');
  await coach.waitForSelector('.train-row');
  await coach.screenshot({ path: `${OUT}/treino-lista.png` });
  check('Sem cartas escolhidas não se pode treinar', await coach.locator('#trainGo').isDisabled());
  await coach.click('[data-train-player="0"]');
  await coach.click('[data-hand="dribble"]');
  await coach.click('[data-category="physical"]');
  await coach.click('[data-hand="sprints"]');
  await coach.click('[data-category="tactic"]');
  await coach.screenshot({ path: `${OUT}/treino-jogador-a-meio.png` });
  await coach.click('[data-hand="readDefense"]');
  await coach.screenshot({ path: `${OUT}/treino-jogador.png` });
  check('A pré-visualização não revela o combo', (await coach.locator('.combo-known').count()) === 0);
  check('Não se pode pôr mais de 3 cartas', await coach.locator('.hand-card').evaluateAll(cards => cards.every(c => (c as HTMLButtonElement).disabled)));
  const overflowTraining = await coach.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  check('O treino não sai do ecrã do telemóvel', !overflowTraining);
  await coach.click('[data-train-list]');
  await coach.click('[data-train-combos]');
  await coach.screenshot({ path: `${OUT}/treino-combos.png` });
  await coach.click('[data-train-list]');
  const movesBefore = await coach.evaluate(() => window.__pocket.club()!.team.roster[0]!.moves.length);
  await coach.click('#trainGo');
  await coach.waitForSelector('.combo-hero');
  await coach.screenshot({ path: `${OUT}/combo.png` });
  const trainedClub = await coach.evaluate(() => window.__pocket.club()!);
  check('O combo ensina um movimento especial', trainedClub.team.roster[0]!.moves.length === movesBefore + 1 && trainedClub.knownCombos.includes('brokenAnkles'), trainedClub.team.roster[0]!.moves.join(', '));
  await coach.click('[data-train-back]');
  await coach.reload();
  await coach.waitForSelector('#startBtn');
  check('O treino fica guardado ao recarregar a página', await coach.evaluate(() => window.__pocket.club()!.trainedThisWeek && window.__pocket.club()!.knownCombos.includes('brokenAnkles')));
  check('Só se treina uma vez por semana', await coach.locator('#trainBtn').isDisabled());
  await coach.click('#tacticsBtn');
  await coach.click('[data-tactic="spacing"][data-tactic-value="1"]');
  await coach.screenshot({ path: `${OUT}/taticas.png` });
  await coach.click('#tacticsBack');
  await coach.click('#startBtn');
  await coach.click('#matchTacticsBtn');
  await coach.waitForSelector('[data-tactic]');
  await coach.click('[data-tactic="pressure"][data-tactic-value="1"]');
  await coach.waitForTimeout(300);
  await coach.screenshot({ path: `${OUT}/taticas-jogo.png` });
  check('A tática escolhida fica marcada', (await coach.locator('[data-tactic="pressure"][data-tactic-value="1"]').getAttribute('aria-pressed')) === 'true');
  await coach.click('#matchTacticsClose');
  const checkedTactics = await coach.evaluate(() => window.__pocket.club()!.tactics);
  check('As táticas mudam-se durante o jogo', checkedTactics.pressure === 1 && checkedTactics.spacing === 1);
  await coach.click('[data-tab="cards"]');
  await coach.evaluate(() => window.__pocket.setSpeedRaw(8));
  await coach.waitForFunction(() => window.__pocket.found().length > 0, undefined, { timeout: 60_000 });
  await coach.waitForSelector('#drop:not([hidden])');
  await coach.screenshot({ path: `${OUT}/carta-no-jogo.png` });
  await coach.evaluate(() => window.__pocket.setSpeedRaw(40));
  await coach.waitForFunction(() => window.__pocket.state().finished, undefined, { timeout: 90_000 });
  await coach.screenshot({ path: `${OUT}/fim-cartas.png` });
  check('As cartas do jogo vão para o clube', (await coach.locator('.found-card').count()) > 0, `${await coach.locator('.found-card').count()} cartas`);
  check('Com decisões e táticas o jogo reproduz-se igual', await coach.evaluate(() => window.__pocket.replayMatchesCurrent()));
  await coach.click('#againBtn');
  await coach.waitForSelector('#startBtn');
  await coach.reload();
  await coach.waitForSelector('#startBtn');
  check('Passa para a semana 2 e fica guardado', await coach.evaluate(() => window.__pocket.club()!.week === 2 && !window.__pocket.club()!.trainedThisWeek));
  await coach.click('#resetBtn');
  await coach.click('#resetNo');
  check('Cancelar o novo clube não apaga nada', await coach.evaluate(() => window.__pocket.club()!.week === 2));
  await coach.evaluate(() => localStorage.setItem('pocket-basketball-clube', 'estragado'));
  await coach.reload();
  await coach.waitForSelector('#newClubBtn');
  check('Um clube estragado avisa e não parte o jogo', (await coach.locator('.hint.warn').count()) === 1);
  check('Sem erros no ciclo da semana', coachProblems.length === 0, coachProblems.join(' | '));
  await season.close();

  // Os momentos que importam, para ver como ficam.
  const moments = await phone.newPage();
  const momentProblems: string[] = [];
  moments.on('pageerror', error => momentProblems.push(error.message));
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
  await capture('movimento', 'move', 3);

  // Desconto de tempo e substituição, como um jogador faria.
  await moments.goto(`${url}?semente=21&divisao=2`);
  await moments.waitForFunction(() => window.__pocket !== undefined);
  await moments.click('#startBtn');
  await moments.click('#timeoutBtn');
  await moments.waitForSelector('.subs-title', { timeout: 30_000 });
  await moments.screenshot({ path: `${OUT}/desconto.png` });
  const before = await moments.evaluate(() => window.__pocket.onCourtNames());
  await moments.click('[data-sub-out="2"]');
  await moments.click('[data-sub-in]:not([disabled])');
  await moments.waitForTimeout(100);
  const after = await moments.evaluate(() => window.__pocket.onCourtNames());
  check('O desconto abre as trocas e a troca entra logo', before[2] !== after[2], `${before[2]} > ${after[2]}`);
  await moments.click('[data-subs-close]');
  await moments.waitForFunction(() => window.__pocket.state().phase === 'live', undefined, { timeout: 30_000 });
  check('O jogo continua depois do desconto', true);
  await moments.click('#subsBtn');
  await moments.waitForSelector('.subs');
  await moments.click('[data-sub-out="0"]');
  await moments.click('[data-sub-in]:not([disabled])');
  await moments.waitForSelector('.pending');
  await moments.screenshot({ path: `${OUT}/substituir.png` });
  await moments.click('[data-subs-close]');
  await moments.evaluate(() => window.__pocket.setSpeedRaw(40));
  await moments.waitForFunction(() => window.__pocket.state().finished, undefined, { timeout: 90_000 });
  check('O jogo com decisões do treinador reproduz-se igual', await moments.evaluate(() => window.__pocket.replayMatchesCurrent()));

  // O buzzer do tempo de posse só toca quando há violação, por isso procura-se um jogo onde aconteça.
  let violationHeard = false;
  for (let seed = 1; seed <= 12 && !violationHeard; seed++) {
    await moments.goto(`${url}?semente=${seed}&divisao=2`);
    await moments.waitForFunction(() => window.__pocket !== undefined);
    await moments.click('#startBtn');
    const result = await moments.evaluate(() => window.__pocket.pauseAt('shotClockViolation', 2));
    if (result.found) {
      violationHeard = (await moments.evaluate(() => window.__pocket.soundsPlayed())).includes('shotClockBuzzer');
      await moments.waitForTimeout(150);
      await moments.locator('.screen').screenshot({ path: `${OUT}/momento-violacao.png` });
    }
  }
  check('A violação de posse toca o buzzer próprio', violationHeard);

  // A bola a entrar no cesto, imagem a imagem.
  for (const frame of [0, 2, 4, 6]) {
    await moments.goto(`${url}?semente=21&divisao=2`);
    await moments.waitForFunction(() => window.__pocket !== undefined);
    await moments.click('#startBtn');
    await moments.evaluate(extra => window.__pocket.pauseAt('made', extra), frame);
    await moments.waitForTimeout(120);
    await moments.locator('.screen').screenshot({ path: `${OUT}/cesto-${frame}.png` });
  }

  // Os bonecos não podem tremer entre frente e costas.
  await moments.goto(`${url}?semente=21&divisao=2`);
  await moments.waitForFunction(() => window.__pocket !== undefined);
  await moments.click('#startBtn');
  await moments.evaluate(() => window.__pocket.pauseAt('end', 0));
  const flips = await moments.evaluate(() => window.__pocket.frontBackFlips());
  check('Nenhum boneco troca entre frente e costas em menos de meio segundo', flips.shortestSeconds >= 0.5, `mínimo de ${flips.shortestSeconds} s, ${flips.perPlayerMinute.toFixed(1)} trocas por jogador por minuto`);

  // Ao driblar em corrida, as pernas têm de mexer.
  await moments.goto(`${url}?semente=21&divisao=2`);
  await moments.waitForFunction(() => window.__pocket !== undefined);
  await moments.click('#startBtn');
  const dribblePoses = await moments.evaluate(() => window.__pocket.runningDribblePoses());
  check('Driblar em corrida usa as 4 imagens de pernas', dribblePoses.length === 4 && dribblePoses.every(pose => pose.startsWith('dribRun')), dribblePoses.join(', '));

  // Ficha de jogador: abrir, percorrer a equipa e fechar.
  await moments.goto(`${url}?semente=21&divisao=2`);
  await moments.waitForFunction(() => window.__pocket !== undefined);
  await moments.click('#startBtn');
  await moments.click('.row[data-player]');
  await moments.waitForSelector('.card');
  await moments.screenshot({ path: `${OUT}/ficha-1.png` });
  const seenNames: string[] = [];
  const seenPortraits = new Set<string>();
  for (let i = 0; i < 12; i++) {
    seenNames.push((await moments.locator('.card-head b').textContent()) ?? '');
    seenPortraits.add((await moments.locator('.portrait').getAttribute('src')) ?? '');
    if (i < 6) await moments.locator('.portrait').screenshot({ path: `${OUT}/retrato-${i}.png` });
    await moments.click('[data-card="next"]');
    await moments.waitForTimeout(350);
  }
  check('A ficha percorre os 12 jogadores da equipa', new Set(seenNames).size === 12, seenNames.join(', '));
  check('Cada jogador tem o seu retrato', seenPortraits.size === 12, `${seenPortraits.size} retratos diferentes`);
  await moments.click('[data-card="close"]');
  await moments.waitForTimeout(100);
  check('A ficha fecha', (await moments.locator('.card').count()) === 0);
  check('Sem erros nos momentos e na ficha', momentProblems.length === 0, momentProblems.join(' | '));

  // O computador e o telemóvel deitado.
  for (const [name, width, height] of [['1280x720', 1280, 720], ['1920x1080', 1920, 1080], ['telemovel-deitado', 844, 390]] as const) {
    const context = await browser.newContext({ viewport: { width, height } });
    const wide = await context.newPage();
    const wideProblems: string[] = [];
    wide.on('pageerror', error => wideProblems.push(error.message));
    await wide.goto(`${url}?semente=11&divisao=2`);
    await wide.waitForFunction(() => window.__pocket !== undefined);
    await wide.waitForTimeout(300);
    await wide.screenshot({ path: `${OUT}/landscape-${name}-inicio.png` });
    await wide.click('#trainBtn');
    await wide.click('[data-train-player="1"]');
    await wide.click('[data-hand="shooting"]');
    await wide.waitForTimeout(100);
    await wide.screenshot({ path: `${OUT}/landscape-${name}-treino.png` });
    await wide.click('[data-train-list]');
    await wide.click('[data-train-back]');
    await wide.click('#startBtn');
    await wide.waitForTimeout(600);
    await wide.evaluate(() => window.__pocket.pauseAt('made', 2));
    await wide.waitForTimeout(200);
    await wide.screenshot({ path: `${OUT}/landscape-${name}.png` });
    const layout = await wide.evaluate(() => {
      const screen = document.getElementById('screen')!.getBoundingClientRect();
      const panel = document.getElementById('panel')!.getBoundingClientRect();
      const canvas = document.getElementById('court')!.getBoundingClientRect();
      return {
        fills: Math.abs(screen.width + panel.width - innerWidth) < 2 && Math.abs(panel.height - innerHeight) < 2,
        canvasCovers: canvas.width >= screen.width - 1 && canvas.height >= screen.height - 1,
        overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
        art: `${window.__pocket.state().canvas.width}x${window.__pocket.state().canvas.height}`,
      };
    });
    check(`Em ${name}, o campo e o painel ocupam a janela toda`, layout.fills && layout.canvasCovers && !layout.overflow, `arte ${layout.art}`);
    check(`Em ${name}, sem erros`, wideProblems.length === 0, wideProblems.join(' | '));
    await context.close();
  }

  // As outras divisões.
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const big = await desktop.newPage();
  for (const division of [0, 1, 3]) {
    await big.goto(`${url}?semente=11&divisao=${division}`);
    await big.waitForFunction(() => window.__pocket !== undefined);
    await big.click('#startBtn');
    await big.evaluate(() => window.__pocket.pauseAt('shot', 6));
    await big.waitForTimeout(200);
    await big.screenshot({ path: `${OUT}/divisao-${division}.png` });
  }

  // Mudar o tamanho da janela a meio do jogo não pode partir nada.
  const resized = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const resizing = await resized.newPage();
  const resizeProblems: string[] = [];
  resizing.on('pageerror', error => resizeProblems.push(error.message));
  await resizing.goto(`${url}?semente=11&divisao=2`);
  await resizing.waitForFunction(() => window.__pocket !== undefined);
  await resizing.click('#startBtn');
  await resizing.setViewportSize({ width: 420, height: 800 });
  await resizing.waitForTimeout(300);
  await resizing.setViewportSize({ width: 1600, height: 900 });
  await resizing.waitForTimeout(300);
  check('Mudar a janela a meio do jogo não dá erro', resizeProblems.length === 0, resizeProblems.join(' | '));
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
