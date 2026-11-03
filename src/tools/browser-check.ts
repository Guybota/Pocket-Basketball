// Abre o jogo num browser verdadeiro e confirma o que os testes em Node não conseguem ver.
// Usa o Edge instalado. Noutra máquina: BROWSER_CHANNEL=chrome npm run browser-check
import { mkdirSync } from 'node:fs';
import { chromium, type Page } from 'playwright-core';
import { preview, build } from 'vite';
import { PRESEASON_WEEKS, SEASON_WEEKS } from '../sim/league.ts';
import { matchHash } from '../sim/hash.ts';
import { simulateMatch } from '../sim/match.ts';
import { clubTeam, newClub, opponentOf, visitorOf, weekSeed, type ClubState } from '../ui/club.ts';

interface Pocket {
  hashFor(seed: number, division: number): string;
  state(): { phase: string; tick: number; period: number; score: [number, number]; started: boolean; finished: boolean; announced: string[]; canvas: { width: number; height: number }; demo: number | null; ball: { x: number; y: number; z: number } | null };
  setSpeedRaw(value: number): void;
  townBox(place: string): { x0: number; y0: number; x1: number; y1: number };
  runningDribblePoses(): string[];
  replayMatchesCurrent(): boolean;
  soundsPlayed(): string[];
  playAllSounds(): void;
  onCourtNames(): string[];
  frontBackFlips(): { perPlayerMinute: number; shortestSeconds: number };
  club(): ClubState | null;
  setTownClock(value: number | null): void;
  found(): string[];
  fastForward(weeks: number): void;
  fire(): void;
  setConfidence(value: number): void;
  timeOtherGames(): number;
  pauseAt(eventType: string, extraTicks: number, maxDistance?: number, move?: string): { phase: string; found: boolean };
  tuneCamera(t: { cy?: number; cz?: number; lookY?: number; focal?: number }): void;
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
  const club = { ...newClub(seed, division), week: PRESEASON_WEEKS + 1 };
  return simulateMatch(clubTeam(club), opponentOf(club), weekSeed(club), [true, false], visitorOf(club));
};
/** Depois da bola ao alto há a apresentação dos cinco; a verificação fotografa-a e salta-a. */
const skipIntro = async (p: Page): Promise<void> => {
  await p.waitForSelector('#introSkip');
  await p.click('#introSkip');
};
const kick = async (p: Page): Promise<void> => {
  await p.click('#arenaChip');
  await p.click('#kickoffBtn');
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/apresentacao.png` });
  await skipIntro(p);
};
/** Espera por algo, continuando o jogo nos descontos do adversário, que também o param à espera do treinador. */
const waitThrough = async (p: Page, done: () => Promise<boolean>, timeout = 90_000): Promise<void> => {
  const deadline = Date.now() + timeout;
  while (!(await done())) {
    if (Date.now() > deadline) throw new Error('waitThrough: tempo esgotado');
    if (await p.locator('.subs-title').count()) await p.click('[data-subs-close]');
    else await p.waitForTimeout(200);
  }
};
const atHalf = (p: Page) => async (): Promise<boolean> => (await p.locator('#secondHalfBtn').count()) > 0;
const isFinished = (p: Page) => (): Promise<boolean> => p.evaluate(() => window.__pocket.state().finished);
/** Joga o resto do jogo depressa, passando pelo balneário ao intervalo. */
const playToEnd = async (p: Page): Promise<void> => {
  await p.evaluate(() => window.__pocket.setSpeedRaw(40));
  await waitThrough(p, atHalf(p));
  await p.click('#secondHalfBtn');
  await waitThrough(p, isFinished(p));
};
/** Recarregar a página volta ao título; o clube guardado continua a partir dele. */
const reloadClub = async (p: Page): Promise<void> => {
  await p.reload();
  await p.click('#continueBtn');
};
/** Cria o clube e passa pelo ecrã de criação, com nome à escolha. */
const createClub = async (p: Page, name = ''): Promise<void> => {
  await p.click('#newClubBtn');
  await p.waitForSelector('#startClubBtn');
  if (name) await p.locator('#clubName').fill(name);
  await p.click('#startClubBtn');
  await p.waitForSelector('#arenaChip');
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
  await kick(page);
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
  await playToEnd(page);
  await page.screenshot({ path: `${OUT}/fim.png` });
  const final = await page.evaluate(() => window.__pocket.state());
  const expected = firstMatch(7, 2);
  check('O jogo visto acaba com o resultado da simulação', final.score[0] === expected.score[0] && final.score[1] === expected.score[1], `${final.score[0]}-${final.score[1]}`);
  const heard = await page.evaluate(() => window.__pocket.soundsPlayed());
  for (const name of ['whistle', 'buzzer', 'horn']) check(`Toca o som "${name}" durante o jogo`, heard.includes(name), heard.join(', '));
  await page.evaluate(() => window.__pocket.playAllSounds());
  check('Os avisos de momentos altos aparecem', final.announced.includes('Afundanço!') && final.announced.includes('Intervalo'), final.announced.join(', '));
  await page.click('#againBtn');
  await page.waitForSelector('#arenaChip');
  check('Sem erros na página', problems.length === 0, problems.join(' | '));

  // O ciclo de uma semana, como um jogador o faria, com o clube guardado a sério.
  const season = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
  const coach = await season.newPage();
  const coachProblems: string[] = [];
  coach.on('pageerror', error => {
    coachProblems.push(error.message);
    console.log('ERRO NA PÁGINA', error.message, error.stack);
  });
  await coach.goto(url);
  await coach.waitForSelector('#newClubBtn');
  await coach.screenshot({ path: `${OUT}/titulo.png` });
  // Sem ninguém a tocar, o título mostra um jogo de demonstração.
  await coach.waitForFunction(() => (window.__pocket.state().demo ?? 0) > 20, undefined, { timeout: 20_000 });
  await coach.screenshot({ path: `${OUT}/demonstracao.png` });
  await coach.click('#newClubBtn');
  check('O jogo de demonstração pára ao sair do título', await coach.evaluate(() => window.__pocket.state().demo === null));
  await coach.waitForSelector('#startClubBtn');
  await coach.locator('#clubName').fill('Dragões do Minho');
  await coach.click('[data-go="emblem"]');
  await coach.click('[data-em-design="pennant:plain"]');
  await coach.click('.back');
  await coach.screenshot({ path: `${OUT}/criar-clube.png` });
  await coach.click('#startClubBtn');
  await coach.waitForSelector('#arenaChip');
  await coach.screenshot({ path: `${OUT}/clube.png` });
  check('O clube novo começa na última divisão', await coach.evaluate(() => window.__pocket.club()!.division === 0));
  check('O clube novo começa na pré-época, sem jogo', await coach.evaluate(() => window.__pocket.club()!.week === 1) && ((await coach.locator('.citydetail').first().textContent()) ?? '').includes('Pré-época'));
  await coach.evaluate(n => window.__pocket.fastForward(n), PRESEASON_WEEKS);
  check('O clube tem o nome escolhido, o nome curto e o emblema', await coach.evaluate(() => {
    const c = window.__pocket.club()!;
    return c.team.name === 'Dragões do Minho' && c.team.short === 'MIN' && c.emblem.shape === 'pennant' && c.emblem.letters === 'MIN';
  }));
  await coach.locator('.screen').screenshot({ path: `${OUT}/cidade.png` });
  await coach.screenshot({ path: `${OUT}/cidade-inteira.png` });
  const chipsFit = await coach.evaluate(() => {
    const box = document.getElementById('screen')!.getBoundingClientRect();
    return [...document.querySelectorAll('.town-chip')].every(chip => {
      const r = chip.getBoundingClientRect();
      return r.left >= box.left && r.right <= box.right && r.top >= box.top && r.bottom <= box.bottom;
    });
  });
  check('As etiquetas dos edifícios cabem no telemóvel', chipsFit);
  // A cidade é o menu: a nota da secretária fica dentro do mapa, sem painel nenhum.
  const noteFits = await coach.evaluate(() => {
    const note = document.querySelector('.town-note')!.getBoundingClientRect();
    const map = document.querySelector('#court')!.getBoundingClientRect();
    return getComputedStyle(document.querySelector('#panel')!).display === 'none' && note.bottom <= map.bottom + 1 && note.right <= map.right + 1;
  });
  check('A cidade não tem painel, e a nota da secretária cabe no mapa', noteFits);
  // Os jogadores têm de passar por trás do que está à frente deles. O 3.º anda na estrada ao lado do escritório.
  for (const [name, seconds] of [['atras-escritorio', 19.1], ['atras-escritorio-2', 20.5], ['frente', 29]] as const) {
    await coach.evaluate(ms => window.__pocket.setTownClock(ms), seconds * 1000);
    await coach.waitForTimeout(80);
    await coach.locator('.screen').screenshot({ path: `${OUT}/cidade-${name}.png` });
  }
  await coach.evaluate(() => window.__pocket.setTownClock(null));
  const townCdp = await season.newCDPSession(coach);
  await townCdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await coach.evaluate(() => window.__pocket.resetRenderStats());
  await coach.waitForTimeout(2000);
  const townStats = await coach.evaluate(() => window.__pocket.renderStats());
  await townCdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  check('Desenhar a cidade demora menos de 16 ms com CPU 4× mais lento', townStats.meanMs < 16, `${townStats.meanMs.toFixed(1)} ms em ${townStats.frames} frames`);
  await coach.click('#towerChip');
  check('A torre responde pela secretária', ((await coach.locator('#staffNote').textContent()) ?? '').includes('torre'));
  await coach.click('#trainBtn');
  await coach.waitForSelector('.prow');
  await coach.screenshot({ path: `${OUT}/treino-lista.png` });
  check('A lista do treino mostra as notas de cada jogador', (await coach.locator('.prow').first().locator('.gr').count()) === 7);
  await coach.click('[data-player="0"]');
  await coach.click('[data-act="openCards"]');
  check('Sem cartas escolhidas não se pode treinar', await coach.locator('[data-act="trainNow"]').isDisabled());
  await coach.click('[data-card="dribble"]');
  await coach.click('[data-card="sprints"]');
  await coach.screenshot({ path: `${OUT}/treino-jogador-a-meio.png` });
  await coach.click('[data-card="readDefense"]');
  await coach.screenshot({ path: `${OUT}/treino-jogador.png` });
  check('A pré-visualização não revela o combo', !((await coach.locator('.info').textContent()) ?? '').toLowerCase().includes('tornozelo'));
  check('Não se pode pôr mais de 3 cartas', await coach.locator('.gcard[aria-pressed="false"]').evaluateAll(cards => cards.every(c => (c as HTMLButtonElement).disabled)));
  check('O treino não sai do ecrã do telemóvel', await coach.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const movesBefore = await coach.evaluate(() => window.__pocket.club()!.team.roster[0]!.moves.length);
  await coach.click('[data-act="trainNow"]');
  await coach.waitForSelector('.combofx');
  await coach.waitForTimeout(400);
  await coach.screenshot({ path: `${OUT}/combo-animacao.png` });
  await coach.waitForTimeout(1500);
  await coach.screenshot({ path: `${OUT}/combo.png` });
  const trainedClub = await coach.evaluate(() => window.__pocket.club()!);
  check('O combo ensina um movimento especial', trainedClub.team.roster[0]!.moves.length === movesBefore + 1 && trainedClub.knownCombos.includes('brokenAnkles'), trainedClub.team.roster[0]!.moves.join(', '));
  check('Só o jogador escolhido é que treinou', trainedClub.trainedThisWeek.length === 1);
  await coach.click('[data-go="train"]');
  await coach.click('[data-go="combos"]');
  await coach.screenshot({ path: `${OUT}/treino-combos.png` });
  await coach.click('.back');
  await coach.click('.back');
  await reloadClub(coach);
  await coach.waitForSelector('#arenaChip');
  check('O treino fica guardado ao recarregar a página', await coach.evaluate(() => window.__pocket.club()!.trainedThisWeek.length === 1 && window.__pocket.club()!.knownCombos.includes('brokenAnkles')));
  await coach.click('#trainBtn');
  await coach.click('[data-player="0"]');
  check('Cada jogador só treina uma vez por semana', await coach.locator('[data-act="openCards"]').isDisabled());
  await coach.click('.back');

  // O emblema e os equipamentos ficam guardados, e o equipamento chega ao campo.
  await coach.click('#officeBtn');
  await coach.screenshot({ path: `${OUT}/escritorio.png` });
  await coach.click('[data-go="emblem"]');
  await coach.click('[data-em-design="circle:plain"]');
  await coach.click('[data-em-symbol="star"]');
  await coach.locator('#emblemLetters').fill('xy7');
  check('As letras do emblema ficam em maiúsculas', (await coach.locator('#emblemLetters').inputValue()) === 'XY7');
  await coach.screenshot({ path: `${OUT}/emblema.png` });
  await coach.click('.back');
  await coach.click('[data-act="editKit"]');
  await coach.click('[data-kit-pattern="stripes"]');
  await coach.click('[data-kit-part="second"]');
  await coach.locator('[data-kit-color="#f2c230"]').click();
  await coach.screenshot({ path: `${OUT}/equipamento-editor.png` });
  await coach.click('.back');
  // Tocar no edifício abre o mesmo que a etiqueta.
  await coach.click('.back');
  await coach.waitForSelector('#arenaChip');
  const arenaBox = await coach.evaluate(() => window.__pocket.townBox('arena'));
  const courtBox = (await coach.locator('#court').boundingBox())!;
  await coach.mouse.click(courtBox.x + courtBox.width * (arenaBox.x0 + arenaBox.x1) / 2, courtBox.y + courtBox.height * (arenaBox.y0 + arenaBox.y1) / 2);
  await coach.waitForSelector('#kickoffBtn, [data-offer]');
  check('Tocar no pavilhão abre o pavilhão', true);
  await coach.click('.back');
  await coach.waitForSelector('#arenaChip');
  await coach.click('#officeBtn');
  await coach.click('[data-go="market"]');
  await coach.screenshot({ path: `${OUT}/mercado.png` });
  const marketBefore = await coach.evaluate(() => ({ roster: window.__pocket.club()!.team.roster.length, money: window.__pocket.club()!.money }));
  await coach.click('[data-market="0"]');
  await coach.click('[data-act="offer"]');
  check('Um jogador livre entra logo', await coach.evaluate((b: { roster: number }) => window.__pocket.club()!.team.roster.length === b.roster + 1, marketBefore));
  await coach.click('.back');
  await coach.click('[data-office="trophies"]');
  await coach.screenshot({ path: `${OUT}/trofeus.png` });
  await coach.click('.back');
  await coach.click('.back');
  await reloadClub(coach);
  await coach.waitForSelector('#arenaChip');
  check('O emblema e o equipamento ficam guardados', await coach.evaluate(() => {
    const c = window.__pocket.club()!;
    return c.emblem.letters === 'XY7' && c.emblem.shape === 'circle' && c.kits[0]!.pattern === 'stripes' && c.kits[0]!.second === '#f2c230';
  }));
  await coach.click('#trainBtn');
  await coach.click('[data-go="tactics"]');
  await coach.click('[data-tactic="spacing"][data-tactic-value="1"]');
  await coach.screenshot({ path: `${OUT}/taticas.png` });
  await coach.click('.back');
  await coach.click('.back');
  await coach.click('#arenaChip');
  await coach.screenshot({ path: `${OUT}/balneario.png` });
  await coach.click('[data-go="rival"]');
  await coach.click('[data-target="0"]');
  await coach.click('[data-target="3"]');
  await coach.screenshot({ path: `${OUT}/adversario.png` });
  check('Marcam-se até dois alvos, e o terceiro fica desligado', await coach.evaluate(() => window.__pocket.club()!.tactics.focus?.length === 2) && await coach.locator('.prow[data-target="1"]').isDisabled());
  await coach.click('.back');
  await coach.click('[data-go="kit"]');
  await coach.screenshot({ path: `${OUT}/equipamento.png` });
  await coach.click('[data-kit="gold"]');
  await coach.click('.back');
  await coach.click('#kickoffBtn');
  await skipIntro(coach);
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
  await waitThrough(coach, atHalf(coach));
  await coach.waitForTimeout(300);
  await coach.screenshot({ path: `${OUT}/intervalo.png` });
  await coach.click('[data-go="halfStats"]');
  await coach.screenshot({ path: `${OUT}/intervalo-stats.png` });
  await coach.click('.back');
  await coach.click('[data-act="halfSubs"]');
  await coach.waitForSelector('.subs');
  await coach.click('.srow[data-pick="1"]');
  await coach.click('.srow.bench[data-pick]:not([disabled])');
  await coach.screenshot({ path: `${OUT}/intervalo-trocas.png` });
  await coach.click('[data-subs-close]');
  await coach.click('[data-go="tactics"]');
  await coach.click('[data-tactic="pace"][data-tactic-value="1"]');
  await coach.click('.back');
  await coach.click('#secondHalfBtn');
  await coach.waitForFunction(() => window.__pocket.state().period >= 3);
  await coach.waitForTimeout(100);
  await coach.locator('.screen').screenshot({ path: `${OUT}/segunda-parte-equipamento.png` });
  check('Os alvos ficam no jogo', await coach.evaluate(() => window.__pocket.club()!.tactics.focus?.length === 2));
  await waitThrough(coach, isFinished(coach));
  await coach.screenshot({ path: `${OUT}/fim-cartas.png` });
  check('As cartas do jogo vão para o clube', (await coach.locator('.found-card').count()) > 0, `${await coach.locator('.found-card').count()} cartas`);
  check('Com decisões e táticas o jogo reproduz-se igual', await coach.evaluate(() => window.__pocket.replayMatchesCurrent()));
  await coach.click('#againBtn');
  await coach.waitForSelector('#arenaChip');
  await reloadClub(coach);
  await coach.waitForSelector('#arenaChip');
  check('A semana 4 é a pré-eliminatória da taça', ((await coach.locator('.citydetail').first().textContent()) ?? '').includes('Pré-eliminatória'));
  await coach.screenshot({ path: `${OUT}/semana-taca.png` });
  check('Passa para a semana 4 e fica guardado', await coach.evaluate(() => window.__pocket.club()!.week === 4 && window.__pocket.club()!.trainedThisWeek.length === 0));
  check('Os alvos esquecem-se no fim da semana', await coach.evaluate(() => (window.__pocket.club()!.tactics.focus ?? []).length === 0));
  await coach.click('#officeBtn');
  await coach.screenshot({ path: `${OUT}/gabinete.png` });
  await coach.click('[data-office="reset"]');
  await coach.click('#resetNo');
  check('Cancelar o novo clube não apaga nada', await coach.evaluate(() => window.__pocket.club()!.week === 4));
  await coach.click('.back');

  // Plantel: trocar dois jogadores muda os titulares e fica guardado.
  await coach.click('#officeBtn');
  await coach.click('[data-squad="office"]');
  await coach.screenshot({ path: `${OUT}/plantel.png` });
  const rosterBefore = await coach.evaluate(() => window.__pocket.club()!.team.roster.map(p => p.name));
  await coach.click('[data-player="0"]');
  await coach.click('[data-act="swap"]');
  await coach.click('[data-player="6"]');
  await coach.screenshot({ path: `${OUT}/plantel-trocado.png` });
  await coach.click('.back');
  await reloadClub(coach);
  await coach.waitForSelector('#arenaChip');
  const rosterAfter = await coach.evaluate(() => window.__pocket.club()!.team.roster.map(p => p.name));
  check('A troca no plantel fica guardada', rosterAfter[0] === rosterBefore[6] && rosterAfter[6] === rosterBefore[0], `${rosterBefore[0]} <> ${rosterBefore[6]}`);

  // Os outros jogos da jornada não podem encravar um telemóvel.
  const seasonCdp = await season.newCDPSession(coach);
  await seasonCdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const otherGames = await coach.evaluate(() => window.__pocket.timeOtherGames());
  await seasonCdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  check('Simular os outros 4 jogos demora menos de 1,5 s com CPU 4× mais lento', otherGames < 1500, `${Math.round(otherGames)} ms`);

  // Federação a meio da época, semana livre e fim de época.
  await coach.evaluate(() => window.__pocket.fastForward(7));
  await coach.click('#federationBtn');
  await coach.screenshot({ path: `${OUT}/federacao-tabela.png` });
  await coach.click('[data-fed-tab="calendar"]');
  await coach.screenshot({ path: `${OUT}/federacao-calendario.png` });
  await coach.click('[data-fed-tab="round"]');
  await coach.click('[data-fed-round="-1"]');
  await coach.click('[data-fed-round="1"]');
  await coach.click('[data-fed-round="1"]');
  await coach.screenshot({ path: `${OUT}/federacao-jornada.png` });
  await coach.click('[data-fed-tab="cup"]');
  await coach.screenshot({ path: `${OUT}/federacao-taca.png` });
  await coach.click('[data-cup-view="continental"]');
  await coach.screenshot({ path: `${OUT}/federacao-continental.png` });
  await coach.click('[data-cup-view="world"]');
  await coach.click('[data-cup-view="federation"]');
  await coach.click('.back');
  await coach.evaluate(() => window.__pocket.fastForward(3));
  check('A semana 14 é livre', await coach.evaluate(() => window.__pocket.club()!.week === 14 && !document.getElementById('practiceBtn')));
  await coach.screenshot({ path: `${OUT}/semana-livre.png` });
  await coach.click('#arenaChip');
  await coach.waitForSelector('[data-offer]');
  await coach.screenshot({ path: `${OUT}/propostas.png` });
  await coach.click('[data-offer-kind="friendly"]');
  await coach.click('.back');
  await coach.click('#skipWeekBtn');
  check('Na semana livre pode-se passar à frente', await coach.evaluate(() => window.__pocket.club()!.week === 15));
  await coach.screenshot({ path: `${OUT}/cidade-painel.png` });
  // Sem treino, um clube pode ser despedido antes do fim da época; aqui interessa ver o balanço.
  await coach.evaluate(() => window.__pocket.setConfidence(90));
  await coach.evaluate(() => window.__pocket.fastForward(17));
  await coach.waitForSelector('#seasonContinue');
  await coach.screenshot({ path: `${OUT}/fim-epoca.png` });
  await reloadClub(coach);
  await coach.waitForSelector('#seasonContinue');
  check('O balanço da época continua lá depois de recarregar', true);
  await coach.click('#seasonContinue');
  // Quando alguém chega ao fim do Potencial, há primeiro a despedida.
  await coach.waitForSelector('#farewellContinue, #renewalsConfirm');
  if (await coach.$('#farewellContinue')) {
    await coach.screenshot({ path: `${OUT}/despedida.png` });
    await coach.click('#farewellContinue');
  }
  await coach.waitForSelector('#renewalsConfirm');
  await coach.screenshot({ path: `${OUT}/renovacoes.png` });
  const squadBefore = await coach.evaluate(() => window.__pocket.club()!.team.roster.length);
  check('As renovações ficam guardadas a meio', await coach.evaluate(() => window.__pocket.club()!.pendingRenewals !== null));
  await coach.click('[data-renew]:nth-child(2)');
  await coach.click('#renewalsConfirm');
  await coach.waitForSelector('#arenaChip');
  check('Começa a época 2', await coach.evaluate(() => window.__pocket.club()!.season === 2 && window.__pocket.club()!.week === 1));
  check('Quem não renova sai, e o plantel fica com os que ficaram', await coach.evaluate((b: number) => window.__pocket.club()!.team.roster.length === Math.max(10, b - 1) && window.__pocket.club()!.pendingRenewals === null, squadBefore));
  check('O orçamento cobre os salários', await coach.evaluate(() => window.__pocket.club()!.money >= Object.values(window.__pocket.club()!.salaries).reduce((a, b) => a + b, 0)));

  // Despedimento. A regra em si é testada em Node; aqui confirma-se o ecrã e que fica guardado.
  await coach.evaluate(() => window.__pocket.fire());
  await coach.waitForSelector('#firedNewClub');
  await coach.screenshot({ path: `${OUT}/despedido.png` });
  await reloadClub(coach);
  await coach.waitForSelector('#firedNewClub');
  check('O despedimento fica guardado', true);
  await coach.click('#firedNewClub');
  await createClub(coach);
  check('Depois de despedido, pode-se treinar outro clube', await coach.evaluate(() => !window.__pocket.club()!.fired && window.__pocket.club()!.season === 1));
  // Um jogo depois de recarregar o balanço da época tem de correr normalmente; o clube novo começa na pré-época.
  await coach.evaluate(n => window.__pocket.fastForward(n), PRESEASON_WEEKS);
  await kick(coach);
  await playToEnd(coach);
  await coach.click('#againBtn');
  await coach.waitForSelector('#arenaChip');
  await coach.evaluate(() => localStorage.setItem('pocket-basketball-clube', 'estragado'));
  await coach.reload();
  await coach.waitForSelector('#newClubBtn');
  check('Um clube estragado avisa e não parte o jogo', (await coach.locator('.hint.warn').count()) === 1);
  check('Sem erros no ciclo da semana', coachProblems.length === 0, coachProblems.join(' | '));
  await season.close();

  // Os playoffs da Pro Liga 1: uma série na mesma semana, e a época só acaba depois.
  const playoffs = await phone.newPage();
  const playoffProblems: string[] = [];
  playoffs.on('pageerror', error => playoffProblems.push(error.message));
  await playoffs.goto(`${url}?semente=1&divisao=3`);
  await playoffs.waitForFunction(() => window.__pocket !== undefined);
  await playoffs.evaluate(() => window.__pocket.setConfidence(90));
  await playoffs.evaluate(() => window.__pocket.fastForward(29));
  const inPlayoffs = await playoffs.evaluate((first: number) => window.__pocket.club()?.playoffs !== null && window.__pocket.club()!.week === first, SEASON_WEEKS + 1);
  if (inPlayoffs) {
    check('A Pro Liga 1 entra nos playoffs a seguir à última jornada', ((await playoffs.locator('.citydetail').first().textContent()) ?? '').includes('Playoffs'));
    await playoffs.screenshot({ path: `${OUT}/playoffs-cidade.png` });
    await playoffs.click('#federationBtn');
    await playoffs.click('[data-fed-tab="playoffs"]');
    await playoffs.screenshot({ path: `${OUT}/playoffs-quadro.png` });
    await playoffs.click('.back');
    await kick(playoffs);
    await playToEnd(playoffs);
    await playoffs.screenshot({ path: `${OUT}/playoffs-jogo.png` });
    const after = await playoffs.evaluate(() => ({ week: window.__pocket.club()!.week, games: window.__pocket.club()!.playoffs?.rounds[0]?.find(s => s.top === 0 || s.bottom === 0)?.games.length ?? 0, report: window.__pocket.club()!.seasonReport !== null }));
    check('O primeiro jogo da série fica registado e a semana só fecha com a série decidida', after.games === 1 || after.report || after.week === SEASON_WEEKS + 2, JSON.stringify(after));
  } else {
    console.log('AVISO  o clube de ensaio não chegou aos playoffs; o quadro não foi visto');
  }
  check('Sem erros nos playoffs', playoffProblems.length === 0, playoffProblems.join(' | '));

  // Um jogo-treino antes do jogo oficial: dois períodos, à porta fechada, e só conta para as cartas.
  const practice = await phone.newPage();
  const practiceProblems: string[] = [];
  practice.on('pageerror', error => practiceProblems.push(error.message));
  await practice.goto(`${url}?semente=31&divisao=1&semana=1`);
  await practice.waitForFunction(() => window.__pocket !== undefined);
  const beforePractice = await practice.evaluate(() => window.__pocket.club()!);
  await practice.click('#arenaChip');
  check('Na pré-época o pavilhão abre as propostas, com particulares', await practice.locator('[data-offer-kind="friendly"]').isEnabled());
  await practice.click('[data-offer="2"]');
  await practice.screenshot({ path: `${OUT}/jogo-treino-proposta.png` });
  await practice.click('[data-pre="practice"]');
  await practice.waitForTimeout(200);
  await practice.screenshot({ path: `${OUT}/jogo-treino-pavilhao.png` });
  await practice.click('#kickoffBtn');
  await skipIntro(practice);
  await practice.waitForTimeout(800);
  await practice.locator('.screen').screenshot({ path: `${OUT}/jogo-treino-campo.png` });
  await practice.evaluate(() => window.__pocket.setSpeedRaw(40));
  await waitThrough(practice, isFinished(practice));
  await practice.screenshot({ path: `${OUT}/jogo-treino-fim.png` });
  const afterPractice = await practice.evaluate(() => ({ club: window.__pocket.club()!, state: window.__pocket.state() }));
  await practice.click('#againBtn');
  await practice.waitForSelector('#arenaChip');
  await practice.screenshot({ path: `${OUT}/jogo-treino-depois.png` });
  check('O jogo-treino acaba ao fim de dois períodos', afterPractice.state.period === 2, `período ${afterPractice.state.period}`);
  check('O jogo-treino não mexe na confiança nem no recorde', afterPractice.club.confidence === beforePractice.confidence && afterPractice.club.wins + afterPractice.club.losses === beforePractice.wins + beforePractice.losses);
  check('O jogo-treino gasta a semana livre', afterPractice.club.week === beforePractice.week + 1);
  check('Os jogadores saem do jogo-treino mais cansados', afterPractice.club.team.roster.reduce((sum, p) => sum + p.fatigue, 0) > beforePractice.team.roster.reduce((sum, p) => sum + p.fatigue, 0));
  check('Sem erros no jogo-treino', practiceProblems.length === 0, practiceProblems.join(' | '));

  // Os momentos que importam, para ver como ficam.
  const moments = await phone.newPage();
  const momentProblems: string[] = [];
  moments.on('pageerror', error => momentProblems.push(error.message));
  const capture = async (name: string, type: string, extra: number, maxDistance?: number): Promise<void> => {
    await moments.goto(`${url}?semente=21&divisao=2`);
    await moments.waitForFunction(() => window.__pocket !== undefined);
    await kick(moments);
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
  await kick(moments);
  await moments.click('#timeoutBtn');
  await moments.waitForSelector('.subs-title', { timeout: 30_000 });
  await moments.screenshot({ path: `${OUT}/desconto.png` });
  const before = await moments.evaluate(() => window.__pocket.onCourtNames());
  await moments.click('.srow[data-pick="2"]');
  await moments.click('.srow.bench[data-pick]:not([disabled])');
  await moments.waitForTimeout(100);
  const after = await moments.evaluate(() => window.__pocket.onCourtNames());
  check('O desconto abre as trocas e a troca entra logo', before[2] !== after[2], `${before[2]} > ${after[2]}`);
  await moments.click('[data-subs-close]');
  await moments.waitForFunction(() => window.__pocket.state().phase === 'live', undefined, { timeout: 30_000 });
  check('O jogo continua depois do desconto', true);
  await moments.click('#subsBtn');
  await moments.waitForSelector('.subs');
  await moments.click('.srow[data-pick="0"]');
  await moments.click('.srow.bench[data-pick]:not([disabled])');
  await moments.waitForSelector('.arrow.in');
  await moments.screenshot({ path: `${OUT}/substituir.png` });
  await moments.click('[data-subs-close]');
  await playToEnd(moments);
  check('O jogo com decisões do treinador reproduz-se igual', await moments.evaluate(() => window.__pocket.replayMatchesCurrent()));

  // O buzzer do tempo de posse só toca quando há violação, por isso procura-se um jogo onde aconteça.
  let violationHeard = false;
  for (let seed = 1; seed <= 40 && !violationHeard; seed++) {
    await moments.goto(`${url}?semente=${seed}&divisao=2`);
    await moments.waitForFunction(() => window.__pocket !== undefined);
    await kick(moments);
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
    await kick(moments);
    await moments.evaluate(extra => window.__pocket.pauseAt('made', extra), frame);
    await moments.waitForTimeout(120);
    await moments.locator('.screen').screenshot({ path: `${OUT}/cesto-${frame}.png` });
  }

  // A bola a ressaltar no aro, imagem a imagem.
  for (const frame of [0, 2, 4, 6, 8, 10]) {
    await moments.goto(`${url}?semente=21&divisao=2`);
    await moments.waitForFunction(() => window.__pocket !== undefined);
    await kick(moments);
    await moments.evaluate(extra => window.__pocket.pauseAt('missed', extra), frame);
    await moments.waitForTimeout(120);
    await moments.locator('.screen').screenshot({ path: `${OUT}/ressalto-${frame}.png` });
  }

  // O início do jogo e as reposições, imagem a imagem.
  for (const [name, type, extra] of [['entrada-1', 'fase:intro', 15], ['entrada-2', 'fase:intro', 45], ['bola-0', 'fase:jump', 0], ['bola-ao-alto', 'fase:jump', 10], ['bola-16', 'fase:jump', 16], ['bola-21', 'fase:jump', 21], ['falta', 'foul', 6], ['fora', 'turnover', 6], ['reposicao-1', 'made', 14], ['reposicao-2', 'made', 26], ['reposicao-3', 'made', 34], ['ressalto-papeis', 'missed', 9], ['transicao', 'rebound', 30]] as const) {
    await moments.goto(`${url}?semente=21&divisao=2`);
    await moments.waitForFunction(() => window.__pocket !== undefined);
    await kick(moments);
    await moments.evaluate(([t, e]) => window.__pocket.pauseAt(t as string, e as number), [type, extra] as const);
    await moments.waitForTimeout(120);
    await moments.locator('.screen').screenshot({ path: `${OUT}/inicio-${name}.png` });
  }

  // Muita gente junta debaixo do cesto: tem de se ver quem é quem.
  for (const [name, type, extra] of [['ressalto', 'missed', 12], ['encontrao', 'bump', 1], ['costas', 'bump', 6]] as const) {
    await moments.goto(`${url}?semente=21&divisao=2`);
    await moments.waitForFunction(() => window.__pocket !== undefined);
    await kick(moments);
    await moments.evaluate(([t, e]) => window.__pocket.pauseAt(t as string, e as number), [type, extra] as const);
    await moments.waitForTimeout(120);
    await moments.locator('.screen').screenshot({ path: `${OUT}/contacto-${name}.png` });
  }

  // Os bonecos não podem tremer entre frente e costas.
  await moments.goto(`${url}?semente=21&divisao=2`);
  await moments.waitForFunction(() => window.__pocket !== undefined);
  await kick(moments);
  await moments.evaluate(() => window.__pocket.pauseAt('end', 0));
  const flips = await moments.evaluate(() => window.__pocket.frontBackFlips());
  check('Nenhum boneco troca entre frente e costas em menos de meio segundo', flips.shortestSeconds >= 0.5, `mínimo de ${flips.shortestSeconds} s, ${flips.perPlayerMinute.toFixed(1)} trocas por jogador por minuto`);

  // Ao driblar em corrida, as pernas têm de mexer.
  await moments.goto(`${url}?semente=21&divisao=2`);
  await moments.waitForFunction(() => window.__pocket !== undefined);
  await kick(moments);
  const dribblePoses = await moments.evaluate(() => window.__pocket.runningDribblePoses());
  check('Driblar em corrida usa as 4 imagens de pernas', dribblePoses.length === 4 && dribblePoses.every(pose => pose.startsWith('dribRun')), dribblePoses.join(', '));

  // Ficha de jogador: abrir, percorrer a equipa e fechar.
  await moments.goto(`${url}?semente=21&divisao=2`);
  await moments.waitForFunction(() => window.__pocket !== undefined);
  await kick(moments);
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
    const wideChips = await wide.evaluate(() => {
      const box = document.getElementById('screen')!.getBoundingClientRect();
      return [...document.querySelectorAll('.town-chip')].every(chip => {
        const r = chip.getBoundingClientRect();
        return r.left >= box.left && r.right <= box.right && r.top >= box.top && r.bottom <= box.bottom;
      });
    });
    check(`Em ${name}, as etiquetas dos edifícios cabem na janela`, wideChips);
    await wide.click('#trainBtn');
    await wide.waitForTimeout(100);
    await wide.screenshot({ path: `${OUT}/landscape-${name}-treino-lista.png` });
    await wide.click('[data-player="1"]');
    await wide.click('[data-act="openCards"]');
    await wide.click('[data-card="shooting"]');
    await wide.waitForTimeout(100);
    await wide.screenshot({ path: `${OUT}/landscape-${name}-treino.png` });
    check(`Em ${name}, os menus cabem na janela`, await wide.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight));
    await wide.click('.back');
    await wide.click('.back');
    await wide.click('#arenaChip');
    await wide.waitForTimeout(150);
    await wide.screenshot({ path: `${OUT}/landscape-${name}-balneario.png` });
    await wide.click('#kickoffBtn');
    await skipIntro(wide);
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
    await kick(big);
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
  await kick(resizing);
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
