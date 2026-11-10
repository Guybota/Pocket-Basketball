// Abre o jogo num browser verdadeiro e confirma o que os testes em Node não conseguem ver.
// Usa o Edge no Windows. Noutra máquina usa o Chromium do Playwright, ou BROWSER_PATH=/caminho/do/chrome, ou BROWSER_CHANNEL=chrome.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium, type Page } from 'playwright-core';
import { preview, build } from 'vite';
import { PRESEASON_WEEKS, SEASON_WEEKS } from '../sim/league.ts';
import { matchHash } from '../sim/hash.ts';
import { simulateMatch } from '../sim/match.ts';
import { parseTeamFile, teamFile } from '../ui/airport.ts';
import { clubTeam, newClub, opponentOf, visitorOf, weekSeed, type ClubState } from '../ui/club.ts';

interface Pocket {
  hashFor(seed: number, division: number): string;
  state(): { ceremony: boolean; phase: string; tick: number; period: number; score: [number, number]; started: boolean; finished: boolean; announced: string[]; canvas: { width: number; height: number }; demo: number | null; ball: { x: number; y: number; z: number } | null; commands: string[]; tactics: { pressure: number; spacing: number; pace: number } | null };
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
  forceTitle(title: { kind: 'league'; division: number } | { kind: 'cup'; cup: 'federation' | 'continental' | 'world' } | null): void;
  timeOtherGames(): number;
  pauseAt(eventType: string, extraTicks: number, maxDistance?: number, move?: string): { phase: string; found: boolean };
  /** A vista do jogo, para desenhar casos difíceis. */
  matchView(): any;
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
  await shot(p, `${OUT}/apresentacao.png`);
  await skipIntro(p);
};
/** Só o campo: o botão do canto esconde o painel, o campo não encolhe e fica um desconto sobre ele; outro toque repõe tudo. */
const checkCourtOnly = async (p: Page, file: string, where: string): Promise<void> => {
  const measure = (): Promise<{ court: number; panel: boolean; timeout: boolean }> => p.evaluate(() => ({
    court: document.getElementById('court')!.getBoundingClientRect().width,
    panel: document.getElementById('panel')!.getClientRects().length > 0,
    timeout: document.getElementById('courtTimeoutBtn')!.getClientRects().length > 0,
  }));
  const before = await measure();
  await p.click('#courtOnlyBtn');
  await p.waitForTimeout(150);
  await shot(p, `${OUT}/${file}-so-campo.png`);
  const hidden = await measure();
  // O desconto sobre o campo pede-o como o do painel: o primeiro toque arma, o segundo pede.
  if (await p.evaluate(() => !(document.getElementById('courtTimeoutBtn') as HTMLButtonElement).disabled)) {
    await p.click('#courtTimeoutBtn');
    await p.click('#courtTimeoutBtn');
    check(`${where}, o desconto sobre o campo pede um desconto`, (await p.getAttribute('#courtTimeoutBtn', 'aria-pressed')) === 'true');
  }
  await p.click('#courtOnlyBtn');
  await p.waitForTimeout(150);
  const back = await measure();
  check(`${where}, «Só o campo» esconde o painel e mostra o desconto sobre o campo`, before.panel && !before.timeout && !hidden.panel && hidden.timeout && hidden.court >= before.court && back.panel && !back.timeout && back.court === before.court, JSON.stringify({ before, hidden, back }));
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
/** Fotografa já com as transições acabadas e, no fim do jogo, com o marcador parado: senão as capturas saem esbatidas ou com números a meio. */
const shot = async (p: Page, path: string): Promise<void> => {
  if (await p.locator('.final-score').count()) await p.waitForTimeout(800);
  await p.screenshot({ path, animations: 'disabled' });
  for (const problem of await a11yProblems(p)) a11y.add(`${path.replace(`${OUT}/`, '')}: ${problem}`);
};
/** Em cada ecrã fotografado: botões sem nome para o leitor de ecrã, e imagens sem alt. */
const a11y = new Set<string>();
const a11yProblems = (p: Page): Promise<string[]> => p.evaluate(() => {
  const text = (el: Element | null): string => el?.textContent?.trim() ?? '';
  const named = (el: Element): boolean => Boolean(text(el) || el.getAttribute('aria-label')?.trim() || el.getAttribute('title')?.trim()
    || [...el.querySelectorAll('img')].some(img => img.alt.trim()) || (el.getAttribute('aria-labelledby') ?? '').split(' ').some(id => text(document.getElementById(id))));
  return [
    ...[...document.querySelectorAll('button, [role="tab"], a[href]')].filter(el => !named(el)).map(el => `sem nome: ${el.outerHTML.slice(0, 90)}`),
    ...[...document.querySelectorAll('img:not([alt])')].map(img => `imagem sem alt: ${img.outerHTML.slice(0, 90)}`),
  ];
});
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${name}${detail ? `: ${detail}` : ''}`);
  if (!ok) failures.push(name);
};

await build({ logLevel: 'warn' });
const server = await preview({ preview: { port: 4173, strictPort: false }, logLevel: 'warn' });
const url = server.resolvedUrls!.local[0]!;
// No Windows usa o Edge instalado; noutra máquina o Chromium do Playwright, ou o browser em BROWSER_PATH, ou o canal em BROWSER_CHANNEL.
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL ?? (process.env.BROWSER_PATH || process.platform !== 'win32' ? undefined : 'msedge'),
  executablePath: process.env.BROWSER_PATH || undefined,
  headless: true,
});

try {
  const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true });
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

  await shot(page, `${OUT}/inicio.png`);
  // Tudo o que a região do leitor de ecrã recebe durante o jogo.
  await page.evaluate(() => {
    const live = document.getElementById('live')!;
    const log: string[] = [];
    (window as unknown as { liveLog: string[] }).liveLog = log;
    new MutationObserver(() => log.push(live.textContent ?? '')).observe(live, { childList: true, characterData: true, subtree: true });
  });
  await kick(page);
  await page.waitForFunction(() => window.__pocket.state().tick > 5);
  check('O jogo começa ao carregar no botão', (await page.evaluate(() => window.__pocket.state().started)));

  // Sequência de frames para ver o movimento.
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(450);
    await page.locator('.screen').screenshot({ path: `${OUT}/frame-${i}.png` });
  }
  await shot(page, `${OUT}/jogo.png`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  check('Sem deslocamento horizontal no telemóvel', !overflow);
  // Só na horizontal: ao alto, o aviso para rodar tapa tudo e o jogo não anda.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const uprightTick = await page.evaluate(() => window.__pocket.state().tick);
  await page.waitForTimeout(500);
  check('Ao alto aparece o aviso para rodar o ecrã e o jogo não anda', await page.evaluate(t => document.getElementById('rotateHint')!.getClientRects().length > 0 && window.__pocket.state().tick === t, uprightTick));
  await shot(page, `${OUT}/rodar-ecra.png`);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(200);

  // Desempenho com o processador 4× mais lento, como aproximação a um telemóvel médio.
  const cdp = await phone.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => window.__pocket.resetRenderStats());
  await page.waitForTimeout(3000);
  const stats = await page.evaluate(() => window.__pocket.renderStats());
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  check('Desenhar um frame demora menos de 16 ms com CPU 4× mais lento', stats.meanMs < 16, `${stats.meanMs.toFixed(1)} ms em ${stats.frames} frames`);

  check('O campo diz o resultado e o tempo ao leitor de ecrã', /^Jogo: \S+ \d+ – \d+ \S+, (\d\.º período|prolongamento), \d+:\d\d$/.test(await page.locator('#court').getAttribute('aria-label') ?? ''), await page.locator('#court').getAttribute('aria-label') ?? '');
  // Separadores: as setas passam de um ao outro, e o conteúdo é o painel do separador escolhido.
  await page.focus('[data-tab="bench"]');
  await page.keyboard.press('ArrowRight');
  check('As setas mudam de separador e levam o foco', await page.evaluate(() => {
    const at = document.activeElement as HTMLElement;
    const panelOf = document.getElementById(at.getAttribute('aria-controls')!);
    return at.dataset.tab === 'stats' && at.getAttribute('aria-selected') === 'true' && panelOf?.getAttribute('role') === 'tabpanel' && panelOf.getAttribute('aria-labelledby') === at.id;
  }));
  await page.keyboard.press('ArrowLeft');
  // Separadores e fim do jogo.
  await page.click('[data-tab="stats"]');
  await shot(page, `${OUT}/stats.png`);
  await page.click('[data-tab="feed"]');
  await page.waitForTimeout(300);
  await shot(page, `${OUT}/relato.png`);
  await page.click('[data-tab="bench"]');
  await playToEnd(page);
  await shot(page, `${OUT}/fim.png`);
  const final = await page.evaluate(() => window.__pocket.state());
  const expected = firstMatch(7, 2);
  // Sem decisões do treinador, o jogo visto é o da simulação. Com decisões (aqui, o Continuar nos descontos, que agora
  // encurta a paragem e muda o jogo), o que tem de bater certo é a repetição com essas mesmas decisões.
  if (final.commands.length === 0) check('O jogo visto acaba com o resultado da simulação', final.score[0] === expected.score[0] && final.score[1] === expected.score[1], `${final.score[0]}-${final.score[1]}`);
  else check('O jogo visto reproduz-se com as decisões tomadas', await page.evaluate(() => window.__pocket.replayMatchesCurrent()), `${final.commands.length} decisões: ${final.commands.slice(0, 6).join(', ')}`);
  const heard = await page.evaluate(() => window.__pocket.soundsPlayed());
  for (const name of ['whistle', 'buzzer', 'horn', 'catch']) check(`Toca o som "${name}" durante o jogo`, heard.includes(name), heard.join(', '));
  await page.evaluate(() => window.__pocket.playAllSounds());
  check('Os avisos de momentos altos aparecem', final.announced.includes('Afundanço!') && final.announced.includes('Intervalo'), final.announced.join(', '));
  const liveLog = await page.evaluate(() => (window as unknown as { liveLog: string[] }).liveLog);
  check('O leitor de ecrã ouve os cestos, o intervalo e o fim do jogo', liveLog.some(line => /^Cesto de [23] de .+\. \S+ \d+, \S+ \d+$/.test(line)) && liveLog.some(line => line.startsWith('Intervalo.')) && liveLog.some(line => line.startsWith('Fim do jogo.')), liveLog.slice(-6).join(' | '));
  await page.click('#againBtn');
  await page.waitForSelector('#arenaChip');
  check('Sem erros na página', problems.length === 0, problems.join(' | '));

  // O ciclo de uma semana, como um jogador o faria, com o clube guardado a sério.
  const season = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true });
  // O Edge sem janela diz que partilha ficheiros, mas a folha de partilha nunca acaba: o exportar faz uma transferência.
  const noShare = (): void => void Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined });
  await season.addInitScript(noShare);
  const coach = await season.newPage();
  const coachProblems: string[] = [];
  coach.on('pageerror', error => {
    coachProblems.push(error.message);
    console.log('ERRO NA PÁGINA', error.message, error.stack);
  });
  await coach.goto(url);
  await coach.waitForSelector('#newClubBtn');
  await shot(coach, `${OUT}/titulo.png`);
  // Sem ninguém a tocar, o título mostra um jogo de demonstração.
  await coach.waitForFunction(() => (window.__pocket.state().demo ?? 0) > 20, undefined, { timeout: 20_000 });
  await shot(coach, `${OUT}/demonstracao.png`);
  await coach.click('#newClubBtn');
  check('O jogo de demonstração pára ao sair do título', await coach.evaluate(() => window.__pocket.state().demo === null));
  await coach.waitForSelector('#startClubBtn');
  await coach.locator('#clubName').fill('Dragões do Minho');
  check('A abreviatura acompanha o nome do clube', (await coach.locator('#clubShort').inputValue()) === 'MIN');
  await coach.click('[data-go="emblem"]');
  await coach.click('[data-em-design="pennant:plain"]');
  await coach.click('.back');
  await shot(coach, `${OUT}/criar-clube.png`);
  await coach.click('#startClubBtn');
  await coach.waitForSelector('#arenaChip');
  await shot(coach, `${OUT}/clube.png`);
  check('O clube novo começa na última divisão', await coach.evaluate(() => window.__pocket.club()!.division === 0));
  check('O clube novo começa na pré-época, sem jogo', await coach.evaluate(() => window.__pocket.club()!.week === 1) && ((await coach.locator('.citydetail').first().textContent()) ?? '').includes('Pré-época'));
  await coach.evaluate(n => window.__pocket.fastForward(n), PRESEASON_WEEKS);
  check('O clube tem o nome escolhido, o nome curto e o emblema', await coach.evaluate(() => {
    const c = window.__pocket.club()!;
    return c.team.name === 'Dragões do Minho' && c.team.short === 'MIN' && c.emblem.shape === 'pennant' && c.emblem.letters === 'MIN';
  }));
  await coach.locator('.screen').screenshot({ path: `${OUT}/cidade.png` });
  await shot(coach, `${OUT}/cidade-inteira.png`);
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
  const towerCopy = async (): Promise<string> => (await coach.locator('#towerCopy').textContent()) ?? '';
  check('A Torre diz que ainda não há cópia', (await towerCopy()).includes('Ainda não fizeste'), await towerCopy());
  const towerDownload = coach.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await coach.click('#exportBtn');
  await towerDownload;
  await coach.waitForFunction(() => document.getElementById('towerCopy')?.textContent?.startsWith('Última cópia'), undefined, { timeout: 5000 }).catch(() => {});
  check('Exportar põe a data da cópia na Torre', /^Última cópia: \d+ \S+, \d\d:\d\d$/.test(await towerCopy()), await towerCopy());
  await shot(coach, `${OUT}/torre-copia.png`);
  await coach.evaluate(() => {
    const last = JSON.parse(localStorage.getItem('pocket-basketball-ultima-copia')!);
    localStorage.setItem('pocket-basketball-ultima-copia', JSON.stringify({ ...last, at: last.at - 8 * 24 * 3600 * 1000 }));
  });
  await coach.click('#towerChip');
  check('Uma cópia com mais de 7 dias dá aviso na Torre', (await towerCopy()).includes('mais de uma semana') && (await coach.locator('#towerCopy.stale').count()) === 1, await towerCopy());
  await shot(coach, `${OUT}/torre-copia-velha.png`);
  await coach.click('#trainBtn');
  await coach.waitForSelector('.prow');
  await shot(coach, `${OUT}/treino-lista.png`);
  check('A lista do treino mostra as notas de cada jogador', (await coach.locator('.prow').first().locator('.gr').count()) === 7);
  await coach.click('[data-player="0"]');
  await coach.click('[data-act="openCards"]');
  check('Sem cartas escolhidas não se pode treinar', await coach.locator('[data-act="trainNow"]').isDisabled());
  await coach.click('[data-card="dribble"]');
  await coach.click('[data-card="sprints"]');
  await shot(coach, `${OUT}/treino-jogador-a-meio.png`);
  await coach.click('[data-card="readDefense"]');
  await shot(coach, `${OUT}/treino-jogador.png`);
  check('A pré-visualização não revela o combo', !((await coach.locator('.info').textContent()) ?? '').toLowerCase().includes('tornozelo'));
  check('Não se pode pôr mais de 3 cartas', await coach.locator('.gcard[aria-pressed="false"]').evaluateAll(cards => cards.every(c => (c as HTMLButtonElement).disabled)));
  check('O treino não sai do ecrã do telemóvel', await coach.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const movesBefore = await coach.evaluate(() => window.__pocket.club()!.team.roster[0]!.moves.length);
  await coach.click('[data-act="trainNow"]');
  await coach.waitForSelector('.combofx');
  await coach.waitForTimeout(400);
  await coach.screenshot({ path: `${OUT}/combo-animacao.png` }); // a meio da animação, de propósito
  await coach.waitForTimeout(1500);
  await shot(coach, `${OUT}/combo.png`);
  const trainedClub = await coach.evaluate(() => window.__pocket.club()!);
  check('O combo ensina um movimento especial', trainedClub.team.roster[0]!.moves.length === movesBefore + 1 && trainedClub.knownCombos.includes('brokenAnkles'), trainedClub.team.roster[0]!.moves.join(', '));
  check('Só o jogador escolhido é que treinou', trainedClub.trainedThisWeek.length === 1);
  await coach.click('[data-go="train"]');
  await coach.click('[data-go="combos"]');
  await shot(coach, `${OUT}/treino-combos.png`);
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
  await shot(coach, `${OUT}/escritorio.png`);
  check('A direção mostra o objetivo da época', (await coach.locator('.objective').count()) === 1);
  await coach.click('[data-office="facilities"]');
  await shot(coach, `${OUT}/instalacoes.png`);
  const works = await coach.evaluate(() => ({ surplus: window.__pocket.club()!.money - Object.values(window.__pocket.club()!.salaries).reduce((a, b) => a + b, 0), gym: window.__pocket.club()!.facilities.gym }));
  const gymBtn = coach.locator('[data-facility="gym"]');
  check('As obras só se fazem com dinheiro que sobre', (await gymBtn.isDisabled()) === works.surplus < 200, `sobra ${works.surplus}`);
  if (!(await gymBtn.isDisabled())) {
    await gymBtn.click();
    check('Uma obra sobe a instalação de nível', await coach.evaluate((g: number) => window.__pocket.club()!.facilities.gym === g + 1, works.gym));
  }
  await coach.click('[data-office="records"]');
  await shot(coach, `${OUT}/recordes.png`);
  await coach.click('[data-office="board"]');
  await coach.click('[data-go="emblem"]');
  await coach.click('[data-em-design="circle:plain"]');
  await coach.click('[data-em-symbol="star"]');
  check('O editor do emblema já não tem letras: são a abreviatura do clube', (await coach.locator('#emblemLetters').count()) === 0);
  await shot(coach, `${OUT}/emblema.png`);
  await coach.click('.back');
  await coach.click('[data-act="editKit"]');
  await coach.click('[data-kit-pattern="stripes"]');
  await coach.click('[data-kit-part="second"]');
  await coach.locator('[data-kit-color="#f2c230"]').click();
  await shot(coach, `${OUT}/equipamento-editor.png`);
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
  await shot(coach, `${OUT}/mercado.png`);
  const marketBefore = await coach.evaluate(() => ({ roster: window.__pocket.club()!.team.roster.length, money: window.__pocket.club()!.money }));
  await coach.click('[data-market="0"]');
  await coach.click('[data-act="offer"]');
  check('Um jogador livre entra logo', await coach.evaluate((b: { roster: number }) => window.__pocket.club()!.team.roster.length === b.roster + 1, marketBefore));
  await coach.click('.back');
  await coach.click('[data-office="trophies"]');
  await shot(coach, `${OUT}/trofeus.png`);
  await coach.click('.back');
  await coach.click('.back');
  await reloadClub(coach);
  await coach.waitForSelector('#arenaChip');
  check('O emblema e o equipamento ficam guardados', await coach.evaluate(() => {
    const c = window.__pocket.club()!;
    return c.emblem.letters === 'MIN' && c.emblem.shape === 'circle' && c.kits[0]!.pattern === 'stripes' && c.kits[0]!.second === '#f2c230';
  }));
  await coach.click('#trainBtn');
  await coach.click('[data-go="tactics"]');
  await coach.click('[data-tactic="spacing"][data-tactic-value="1"]');
  await shot(coach, `${OUT}/taticas.png`);
  await coach.click('.back');
  await coach.click('.back');
  await coach.click('#arenaChip');
  await shot(coach, `${OUT}/balneario.png`);
  await coach.click('[data-go="rival"]');
  await coach.click('[data-target="0"]');
  await coach.click('[data-target="3"]');
  await shot(coach, `${OUT}/adversario.png`);
  check('Marcam-se até dois alvos, e o terceiro fica desligado', await coach.evaluate(() => window.__pocket.club()!.tactics.focus?.length === 2) && await coach.locator('.prow[data-target="1"]').isDisabled());
  await coach.click('.back');
  await coach.click('[data-go="kit"]');
  await shot(coach, `${OUT}/equipamento.png`);
  await coach.click('[data-kit="gold"]');
  await coach.click('.back');
  await coach.click('#kickoffBtn');
  await skipIntro(coach);
  await coach.click('#matchTacticsBtn');
  await coach.waitForSelector('[data-tactic]');
  await coach.click('[data-tactic="pressure"][data-tactic-value="1"]');
  await coach.waitForTimeout(300);
  await shot(coach, `${OUT}/taticas-jogo.png`);
  check('A tática escolhida fica marcada', (await coach.locator('[data-tactic="pressure"][data-tactic-value="1"]').getAttribute('aria-pressed')) === 'true');
  await coach.click('#matchTacticsClose');
  const checkedTactics = await coach.evaluate(() => window.__pocket.state().tactics!);
  check('As táticas mudam-se durante o jogo', checkedTactics.pressure === 1 && checkedTactics.spacing === 1);
  check('As táticas mudadas a meio do jogo não ficam no clube', await coach.evaluate(() => window.__pocket.club()!.tactics.pressure !== 1));
  await coach.click('[data-tab="cards"]');
  await coach.evaluate(() => window.__pocket.setSpeedRaw(8));
  await coach.waitForFunction(() => window.__pocket.found().length > 0, undefined, { timeout: 60_000 });
  await coach.waitForSelector('#drop:not([hidden])');
  await shot(coach, `${OUT}/carta-no-jogo.png`);
  await coach.evaluate(() => window.__pocket.setSpeedRaw(40));
  await waitThrough(coach, atHalf(coach));
  await coach.waitForTimeout(300);
  await shot(coach, `${OUT}/intervalo.png`);
  await coach.click('[data-go="halfStats"]');
  await shot(coach, `${OUT}/intervalo-stats.png`);
  await coach.click('.back');
  await coach.click('[data-act="halfSubs"]');
  await coach.waitForSelector('.subs');
  await coach.click('.srow[data-pick="1"]');
  await coach.click('.srow.bench[data-pick]:not([disabled])');
  await shot(coach, `${OUT}/intervalo-trocas.png`);
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
  await shot(coach, `${OUT}/fim-cartas.png`);
  check('As cartas do jogo vão para o clube', (await coach.locator('.found-card').count()) > 0, `${await coach.locator('.found-card').count()} cartas`);
  check('Com decisões e táticas o jogo reproduz-se igual', await coach.evaluate(() => window.__pocket.replayMatchesCurrent()));
  await coach.click('#againBtn');
  await coach.waitForSelector('#arenaChip');
  await reloadClub(coach);
  await coach.waitForSelector('#arenaChip');
  check('A semana 4 é a pré-eliminatória da taça', ((await coach.locator('.citydetail').first().textContent()) ?? '').includes('Pré-eliminatória'));
  await shot(coach, `${OUT}/semana-taca.png`);
  check('Passa para a semana 4 e fica guardado', await coach.evaluate(() => window.__pocket.club()!.week === 4 && window.__pocket.club()!.trainedThisWeek.length === 0));
  check('Os alvos esquecem-se no fim da semana', await coach.evaluate(() => (window.__pocket.club()!.tactics.focus ?? []).length === 0));
  await coach.click('#officeBtn');
  await shot(coach, `${OUT}/gabinete.png`);
  await coach.click('[data-office="reset"]');
  await coach.click('#resetNo');
  check('Cancelar o novo clube não apaga nada', await coach.evaluate(() => window.__pocket.club()!.week === 4));
  await coach.click('.back');

  // Plantel: trocar dois jogadores muda os titulares e fica guardado.
  await coach.click('#officeBtn');
  await coach.click('[data-squad="office"]');
  await shot(coach, `${OUT}/plantel.png`);
  const rosterBefore = await coach.evaluate(() => window.__pocket.club()!.team.roster.map(p => p.name));
  await coach.click('[data-player="0"]');
  await coach.click('[data-act="swap"]');
  await coach.click('[data-player="6"]');
  await shot(coach, `${OUT}/plantel-trocado.png`);
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
  await shot(coach, `${OUT}/federacao-tabela.png`);
  await coach.click('[data-fed-tab="calendar"]');
  await shot(coach, `${OUT}/federacao-calendario.png`);
  await coach.click('[data-fed-tab="round"]');
  await coach.click('[data-fed-round="-1"]');
  await coach.click('[data-fed-round="1"]');
  await coach.click('[data-fed-round="1"]');
  await shot(coach, `${OUT}/federacao-jornada.png`);
  await coach.click('[data-fed-tab="cup"]');
  await shot(coach, `${OUT}/federacao-taca.png`);
  await coach.click('[data-cup-view="continental"]');
  await shot(coach, `${OUT}/federacao-continental.png`);
  await coach.click('[data-cup-view="world"]');
  await coach.click('[data-cup-view="federation"]');
  await coach.click('.back');
  await coach.evaluate(() => window.__pocket.fastForward(3));
  check('A semana 14 é livre', await coach.evaluate(() => window.__pocket.club()!.week === 14 && !document.getElementById('practiceBtn')));
  await shot(coach, `${OUT}/semana-livre.png`);
  await coach.click('#arenaChip');
  await coach.waitForSelector('[data-offer]');
  await shot(coach, `${OUT}/propostas.png`);
  await coach.click('[data-offer-kind="friendly"]');
  await coach.click('.back');
  await coach.click('#skipWeekBtn');
  check('Na semana livre pode-se passar à frente', await coach.evaluate(() => window.__pocket.club()!.week === 15));
  await shot(coach, `${OUT}/cidade-painel.png`);
  // Sem treino, um clube pode ser despedido antes do fim da época; aqui interessa ver o balanço.
  await coach.evaluate(() => window.__pocket.setConfidence(90));
  await coach.evaluate(() => window.__pocket.fastForward(17));
  await coach.waitForSelector('#seasonContinue');
  await shot(coach, `${OUT}/fim-epoca.png`);
  const reportText = await coach.locator('#seasonContinue').evaluate(el => el.closest('.panel, body')!.textContent ?? '');
  check('O fim da época avalia o objetivo e dá os prémios', reportText.includes('Objetivo:') && reportText.includes('MVP da época'));
  await reloadClub(coach);
  await coach.waitForSelector('#seasonContinue');
  check('O balanço da época continua lá depois de recarregar', true);
  await coach.click('#seasonContinue');
  // Quando alguém chega ao fim do Potencial, há primeiro a despedida.
  await coach.waitForSelector('#farewellContinue, #renewalsConfirm');
  if (await coach.$('#farewellContinue')) {
    await shot(coach, `${OUT}/despedida.png`);
    await coach.click('#farewellContinue');
  }
  await coach.waitForSelector('#renewalsConfirm');
  await shot(coach, `${OUT}/renovacoes.png`);
  const squadBefore = await coach.evaluate(() => window.__pocket.club()!.team.roster.length);
  check('As renovações ficam guardadas a meio', await coach.evaluate(() => window.__pocket.club()!.pendingRenewals !== null));
  await coach.click('[data-renew]:nth-child(2)');
  await coach.click('#renewalsConfirm');
  await coach.waitForSelector('#arenaChip');
  check('Começa a época 2', await coach.evaluate(() => window.__pocket.club()!.season === 2 && window.__pocket.club()!.week === 1));
  check('Quem não renova sai, e o plantel fica com os que ficaram', await coach.evaluate((b: number) => window.__pocket.club()!.team.roster.length === Math.max(10, b - 1) && window.__pocket.club()!.pendingRenewals === null, squadBefore));
  await coach.click('#officeBtn');
  await coach.click('[data-office="records"]');
  await shot(coach, `${OUT}/recordes-epoca2.png`);
  await coach.click('.back');
  await coach.waitForSelector('#arenaChip');
  check('O orçamento cobre os salários', await coach.evaluate(() => window.__pocket.club()!.money >= Object.values(window.__pocket.club()!.salaries).reduce((a, b) => a + b, 0)));

  // Despedimento. A regra em si é testada em Node; aqui confirma-se o ecrã e que fica guardado.
  await coach.evaluate(() => window.__pocket.fire());
  await coach.waitForSelector('#firedNewClub');
  await shot(coach, `${OUT}/despedido.png`);
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
    await shot(playoffs, `${OUT}/playoffs-cidade.png`);
    await playoffs.click('#federationBtn');
    await playoffs.click('[data-fed-tab="playoffs"]');
    await shot(playoffs, `${OUT}/playoffs-quadro.png`);
    await playoffs.click('.back');
    await kick(playoffs);
    await playToEnd(playoffs);
    await shot(playoffs, `${OUT}/playoffs-jogo.png`);
    const after = await playoffs.evaluate(() => ({ week: window.__pocket.club()!.week, games: window.__pocket.club()!.playoffs?.rounds[0]?.find(s => s.top === 0 || s.bottom === 0)?.games.length ?? 0, report: window.__pocket.club()!.seasonReport !== null }));
    check('O primeiro jogo da série fica registado e a semana só fecha com a série decidida', after.games === 1 || after.report || after.week === SEASON_WEEKS + 2, JSON.stringify(after));
  } else {
    console.log('AVISO  o clube de ensaio não chegou aos playoffs; o quadro não foi visto');
  }
  check('Sem erros nos playoffs', playoffProblems.length === 0, playoffProblems.join(' | '));

  // A cerimónia do troféu depois de uma final: só num jogo ganho, aparece com o apito final e salta-se com um toque. O
  // resultado no browser depende das paragens que a verificação fecha, por isso tenta-se até 3 clubes fortes: numa
  // derrota confirma-se que não há cerimónia, e no primeiro jogo ganho vê-se a cerimónia.
  const ceremonyPage = await phone.newPage();
  const ceremonyProblems: string[] = [];
  ceremonyPage.on('pageerror', error => ceremonyProblems.push(error.message));
  let ceremonySeen = false;
  for (const [seed, division] of [[12, 1], [11, 1], [10, 0]] as const) {
    await ceremonyPage.goto(`${url}?semente=${seed}&divisao=${division}`);
    await ceremonyPage.waitForFunction(() => window.__pocket !== undefined);
    await ceremonyPage.evaluate(() => window.__pocket.forceTitle({ kind: 'cup', cup: 'federation' }));
    await kick(ceremonyPage);
    await ceremonyPage.evaluate(() => window.__pocket.setSpeedRaw(40));
    await waitThrough(ceremonyPage, atHalf(ceremonyPage));
    await ceremonyPage.click('#secondHalfBtn');
    await waitThrough(ceremonyPage, () => ceremonyPage.evaluate(() => window.__pocket.state().phase === 'end'));
    // O apito final, e o tempo de a cerimónia começar (1,5 s) ou de o relatório aparecer (2,5 s).
    await ceremonyPage.waitForTimeout(1800);
    const { score, ceremony } = await ceremonyPage.evaluate(() => window.__pocket.state());
    if (score[0] <= score[1]) {
      check(`Numa derrota (${score.join('-')}) não há cerimónia, mesmo com o título forçado`, !ceremony);
      // Sem cerimónia, todos vão para o balneário; um toque salta para o relatório.
      await ceremonyPage.click('#court');
      await ceremonyPage.waitForTimeout(300);
      check('Um toque salta a saída para o balneário', await ceremonyPage.evaluate(() => window.__pocket.state().finished));
      continue;
    }
    check('A final ganha acaba com a cerimónia do troféu', ceremony, score.join('-'));
    // Depois de os vencedores se juntarem: o capitão já levanta o troféu e há confetes.
    await ceremonyPage.waitForTimeout(3500);
    await shot(ceremonyPage, `${OUT}/cerimonia-trofeu.png`);
    check('A cerimónia continua sem relatório até ao toque', !(await ceremonyPage.evaluate(() => window.__pocket.state().finished)));
    await ceremonyPage.click('#court');
    await ceremonyPage.waitForTimeout(300);
    check('Um toque salta a cerimónia para o relatório', await ceremonyPage.evaluate(() => window.__pocket.state().finished && !window.__pocket.state().ceremony));
    await shot(ceremonyPage, `${OUT}/cerimonia-depois.png`);
    ceremonySeen = true;
    break;
  }
  check('Pelo menos um dos clubes ganha e mostra a cerimónia', ceremonySeen);
  check('Sem erros na cerimónia', ceremonyProblems.length === 0, ceremonyProblems.join(' | '));

  // As definições: abrem no título e na Torre, guardam-se à parte do clube e ficam depois de recarregar.
  const prefsContext = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true });
  const prefs = await prefsContext.newPage();
  const prefsProblems: string[] = [];
  prefs.on('pageerror', error => prefsProblems.push(error.message));
  await prefs.goto(url);
  await prefs.waitForSelector('#settingsBtn');
  const hintSize = (): Promise<string> => prefs.evaluate(() => getComputedStyle(document.querySelector('.start .hint')!).fontSize);
  const plainHint = await hintSize();
  const plainCanvas = await prefs.evaluate(() => [document.querySelector('canvas')!.width, document.querySelector('canvas')!.height].join('x'));
  await prefs.click('#settingsBtn');
  await prefs.waitForSelector('#settings[open]');
  await shot(prefs, `${OUT}/definicoes.png`);
  await prefs.locator('#set-master').fill('40');
  await prefs.locator('#set-effects').fill('60');
  await prefs.locator('#set-music').fill('20');
  await prefs.click('#set-sound');
  await prefs.click('#set-big');
  await prefs.click('#set-contrast');
  await prefs.click('#set-motion');
  await shot(prefs, `${OUT}/definicoes-contraste-letra.png`);
  await prefs.click('#settingsClose');
  await prefs.waitForSelector('#settings', { state: 'detached', timeout: 2000 }).catch(() => undefined);
  check('As definições fecham', (await prefs.locator('#settings').count()) === 0);
  await shot(prefs, `${OUT}/titulo-contraste-letra.png`);
  check('A letra maior aumenta o texto da interface', parseFloat(await hintSize()) > parseFloat(plainHint), `${plainHint} → ${await hintSize()}`);
  check('A letra maior não mexe no tamanho do campo',
    plainCanvas === await prefs.evaluate(() => [document.querySelector('canvas')!.width, document.querySelector('canvas')!.height].join('x')));
  await prefs.reload();
  await prefs.waitForSelector('#settingsBtn');
  const kept = await prefs.evaluate(() => ({
    saved: JSON.parse(localStorage.getItem('pocket-basketball-settings') ?? '{}'),
    classes: document.documentElement.className,
  }));
  check('As definições ficam guardadas depois de recarregar',
    kept.saved.master === 0.4 && kept.saved.effects === 0.6 && kept.saved.music === 0.2 && kept.saved.muted === true && kept.saved.bigText === true && kept.saved.highContrast === true && kept.saved.motion === 'reduce',
    JSON.stringify(kept.saved));
  check('As definições aplicam-se ao arrancar', ['high-contrast', 'big-text', 'reduce-motion'].every(name => kept.classes.includes(name)) && parseFloat(await hintSize()) > parseFloat(plainHint), kept.classes);
  await prefs.click('#settingsBtn');
  check('O ecrã mostra o que ficou guardado', await prefs.evaluate(() =>
    (document.getElementById('set-master') as HTMLInputElement).value === '40' && document.getElementById('set-sound')!.textContent === 'Desligado' && document.getElementById('set-motion')!.textContent === 'Sim'));
  // Repor tudo, e ver a cidade sem contraste nem letra maior, para comparar.
  await prefs.click('#set-sound');
  await prefs.click('#set-big');
  await prefs.click('#set-contrast');
  await prefs.click('#set-motion');
  await prefs.click('#set-motion');
  await prefs.click('#settingsClose');
  check('Desligar a letra maior repõe o tamanho de origem', (await hintSize()) === plainHint, await hintSize());
  await prefs.goto(`${url}?semente=31&divisao=1&semana=1`);
  await prefs.waitForSelector('#towerChip');
  await prefs.click('#towerChip');
  await prefs.click('#settingsBtn');
  await prefs.waitForSelector('#settings[open]');
  check('As definições abrem na Torre', true);
  await prefs.click('#set-big');
  await prefs.click('#set-contrast');
  await prefs.click('#settingsClose');
  await shot(prefs, `${OUT}/cidade-contraste-letra.png`);
  await prefs.click('#trainBtn');
  await prefs.waitForSelector('.prow');
  await shot(prefs, `${OUT}/treino-contraste-letra.png`);
  check('Sem erros nas definições', prefsProblems.length === 0, prefsProblems.join(' | '));
  await prefsContext.close();

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
  await shot(practice, `${OUT}/jogo-treino-proposta.png`);
  await practice.click('[data-pre="practice"]');
  await practice.waitForTimeout(200);
  await shot(practice, `${OUT}/jogo-treino-pavilhao.png`);
  await practice.click('#kickoffBtn');
  await skipIntro(practice);
  await practice.waitForTimeout(800);
  await practice.locator('.screen').screenshot({ path: `${OUT}/jogo-treino-campo.png` });
  await practice.evaluate(() => window.__pocket.setSpeedRaw(40));
  await waitThrough(practice, isFinished(practice));
  await shot(practice, `${OUT}/jogo-treino-fim.png`);
  const afterPractice = await practice.evaluate(() => ({ club: window.__pocket.club()!, state: window.__pocket.state() }));
  await practice.click('#againBtn');
  await practice.waitForSelector('#arenaChip');
  await shot(practice, `${OUT}/jogo-treino-depois.png`);
  check('O jogo-treino acaba ao fim de dois períodos', afterPractice.state.period === 2, `período ${afterPractice.state.period}`);
  check('O jogo-treino não mexe na confiança nem no recorde', afterPractice.club.confidence === beforePractice.confidence && afterPractice.club.wins + afterPractice.club.losses === beforePractice.wins + beforePractice.losses);
  check('O jogo-treino gasta a semana livre', afterPractice.club.week === beforePractice.week + 1);
  check('Os jogadores saem do jogo-treino mais cansados', afterPractice.club.team.roster.reduce((sum, p) => sum + p.fatigue, 0) > beforePractice.team.roster.reduce((sum, p) => sum + p.fatigue, 0));
  check('Sem erros no jogo-treino', practiceProblems.length === 0, practiceProblems.join(' | '));

  // O Aeroporto: exportar a nossa equipa, importar a de outra pessoa e jogar o amigável até ao fim.
  // Num clube a sério, para se ver que tudo fica guardado; acabado de criar, está na pré-época, numa semana livre.
  const airportContext = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true });
  await airportContext.addInitScript(noShare);
  const airport = await airportContext.newPage();
  const airportProblems: string[] = [];
  airport.on('pageerror', error => airportProblems.push(error.message));
  await airport.goto(url);
  await airport.waitForFunction(() => window.__pocket !== undefined);
  await createClub(airport);
  await airport.click('#airportChip');
  await airport.waitForSelector('#teamExportBtn');
  await shot(airport, `${OUT}/aeroporto-vazio.png`);
  check('Sem equipa de fora não se joga o amigável', await airport.locator('#guestPlayBtn').isDisabled());
  const [download] = await Promise.all([airport.waitForEvent('download'), airport.click('#teamExportBtn')]);
  const exported = readFileSync((await download.path())!, 'utf8');
  const ownClub = await airport.evaluate(() => window.__pocket.club()!);
  let exportedOk = false;
  try {
    exportedOk = parseTeamFile(exported).name === ownClub.team.name && !exported.includes('"money"');
  } catch {}
  check('A equipa exportada é só a equipa, e lê-se de volta', exportedOk, `${exported.length} bytes`);
  const importPath = async (path: string): Promise<void> => {
    const [chooser] = await Promise.all([airport.waitForEvent('filechooser'), airport.click('#teamImportBtn')]);
    await chooser.setFiles(path);
    await airport.waitForSelector('#airportNote');
    await airport.waitForTimeout(100);
  };
  writeFileSync(`${OUT}/equipa-estragada.json`, JSON.stringify({ format: 'pocket-basketball-equipa', version: 1, name: '<b>', roster: [] }));
  await importPath(`${OUT}/equipa-estragada.json`);
  check('Um ficheiro estragado é recusado sem partir nada', (await airport.evaluate(() => window.__pocket.club()!.guest)) === null && (await airport.locator('#airportNote').textContent())!.includes('inválido'));
  const guestFile = teamFile(newClub(77));
  writeFileSync(`${OUT}/equipa-de-fora.json`, guestFile);
  await importPath(`${OUT}/equipa-de-fora.json`);
  await shot(airport, `${OUT}/aeroporto-equipa.png`);
  check('A equipa importada aparece no Aeroporto', await airport.evaluate(() => window.__pocket.club()!.guest !== null) && (await airport.locator('.prow').count()) === parseTeamFile(guestFile).roster.length);
  const beforeGuest = await airport.evaluate(() => window.__pocket.club()!);
  await airport.click('#guestPlayBtn');
  await airport.waitForSelector('#kickoffBtn');
  await shot(airport, `${OUT}/aeroporto-balneario.png`);
  await airport.click('#kickoffBtn');
  await airport.waitForSelector('#introSkip');
  await shot(airport, `${OUT}/aeroporto-apresentacao.png`);
  await skipIntro(airport);
  await airport.waitForTimeout(800);
  await airport.locator('.screen').screenshot({ path: `${OUT}/aeroporto-campo.png` });
  await playToEnd(airport);
  await shot(airport, `${OUT}/aeroporto-fim.png`);
  const afterGuest = await airport.evaluate(() => ({ club: window.__pocket.club()!, state: window.__pocket.state() }));
  check('O amigável joga-se até ao fim, contra a equipa de fora', afterGuest.state.period >= 4 && afterGuest.club.guestGames[0]?.name === parseTeamFile(guestFile).name);
  check('O amigável não mexe na confiança, não gasta a semana nem dá cartas', afterGuest.club.confidence === beforeGuest.confidence && afterGuest.club.week === beforeGuest.week && JSON.stringify(afterGuest.club.cards) === JSON.stringify(beforeGuest.cards));
  check('O amigável não conta para a liga', JSON.stringify(afterGuest.club.rounds) === JSON.stringify(beforeGuest.rounds));
  await airport.click('#againBtn');
  await airport.waitForSelector('#airportChip');
  await reloadClub(airport);
  await airport.click('#airportChip');
  await airport.waitForSelector('#teamExportBtn');
  await shot(airport, `${OUT}/aeroporto-historico.png`);
  check('A equipa de fora e o amigável ficam guardados', (await airport.locator('.round-row').count()) === 1 && (await airport.locator('.prow').count()) > 0);
  check('Sem erros no Aeroporto', airportProblems.length === 0, airportProblems.join(' | '));
  await airportContext.close();

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
  const timeoutsAsked = async (): Promise<number> => (await moments.evaluate(() => window.__pocket.state().commands)).filter(c => c.startsWith('timeout@')).length;
  await moments.click('#timeoutBtn');
  await moments.waitForTimeout(150);
  await moments.screenshot({ path: `${OUT}/desconto-armado.png` });
  check('Um toque no relógio só arma o desconto', (await moments.locator('#timeoutBtn[data-armed]').count()) === 1 && (await timeoutsAsked()) === 0);
  await moments.waitForTimeout(3300);
  check('O desconto armado desarma sozinho', (await moments.locator('#timeoutBtn[data-armed]').count()) === 0 && (await timeoutsAsked()) === 0);
  await moments.click('#timeoutBtn');
  await moments.click('#timeoutBtn');
  check('Dois toques pedem o desconto', (await timeoutsAsked()) === 1);
  await moments.waitForSelector('.subs-title', { timeout: 30_000 });
  await shot(moments, `${OUT}/desconto.png`);
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
  await shot(moments, `${OUT}/substituir.png`);
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
  await shot(moments, `${OUT}/ficha-1.png`);
  const seenNames: string[] = [];
  const seenPortraits = new Set<string>();
  for (let i = 0; i < 12; i++) {
    seenNames.push((await moments.locator('.card-head b').textContent()) ?? '');
    seenPortraits.add((await moments.locator('.portrait').getAttribute('src')) ?? '');
    if (i < 6) await moments.locator('.portrait').screenshot({ animations: 'disabled', path: `${OUT}/retrato-${i}.png` });
    await moments.click('[data-card="next"]');
    await moments.waitForTimeout(350);
  }
  check('A ficha percorre os 12 jogadores da equipa', new Set(seenNames).size === 12, seenNames.join(', '));
  check('Cada jogador tem o seu retrato', seenPortraits.size === 12, `${seenPortraits.size} retratos diferentes`);
  await moments.click('[data-card="close"]');
  await moments.waitForTimeout(100);
  check('A ficha fecha', (await moments.locator('.card').count()) === 0);
  check('Sem erros nos momentos e na ficha', momentProblems.length === 0, momentProblems.join(' | '));

  // A altura que o dedo pode tocar em cada botão: sobe e desce a partir do centro enquanto o toque ainda lhe cai em cima, por isso conta a área alargada (::before) e desconta o que outro alvo tapa.
  const shortTargets = (page: Page): Promise<string[]> => page.evaluate(() => {
    const short: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('button, [role="tab"], a[href], input, select')) {
      if ((el as HTMLButtonElement).disabled || el.getClientRects().length === 0) continue;
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      const box = el.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = Math.round(box.top + box.height / 2);
      const hitsAt = (px: number, py: number): boolean => { const hit = document.elementFromPoint(px, py); return hit !== null && el.contains(hit); };
      const hits = (py: number): boolean => hitsAt(x, py);
      if (!hits(y)) continue;
      let top = y;
      let bottom = y;
      while (top > 0 && hits(top - 1)) top--;
      while (bottom < innerHeight - 1 && hits(bottom + 1)) bottom++;
      const height = bottom - top + 1;
      // A largura mede-se da mesma maneira, na linha do centro: os botões de ícone da barra do treinador também têm de ter 44 px.
      const cx = Math.round(x);
      let left = cx;
      let right = cx;
      while (left > 0 && hitsAt(left - 1, y)) left--;
      while (right < innerWidth - 1 && hitsAt(right + 1, y)) right++;
      const wide = right - left + 1;
      // As linhas de lista ficam com 34 px, por decisão: mais jogadores à vista. Os outros alvos, 44 px.
      const minimum = el.matches('.prow, .crow, .trow, .srow, .row, .optpick') ? 34 : 44;
      if (height < minimum || wide < 44) short.push(`${el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${el.className.split(' ')[0]}`} "${(el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 14) || el.getAttribute('aria-label') || ''}" ${wide}×${height}px`);
    }
    return [...new Set(short)];
  });
  // O botão principal tem de estar todo à vista e por cima de tudo, sem deslizar até ele.
  const fullyVisible = (page: Page, selector: string): Promise<boolean> => page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth) return false;
    return [[r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2]].every(([x, y]) => el.contains(document.elementFromPoint(x!, y!)));
  }, selector);

  // O computador e o telemóvel deitado.
  for (const [name, width, height] of [['1280x720', 1280, 720], ['1920x1080', 1920, 1080], ['telemovel-deitado', 844, 390]] as const) {
    const phoneLandscape = name === 'telemovel-deitado';
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: phoneLandscape });
    const wide = await context.newPage();
    const wideProblems: string[] = [];
    // No telemóvel deitado, os alvos de toque têm os mesmos mínimos do que ao alto.
    const wideTaps: string[] = [];
    const measureTaps = async (screen: string): Promise<void> => {
      if (!phoneLandscape) return;
      const short = await shortTargets(wide);
      if (short.length) wideTaps.push(`${screen}: ${short.join(', ')}`);
    };
    wide.on('pageerror', error => wideProblems.push(error.message));
    await wide.goto(`${url}?semente=11&divisao=2`);
    await wide.waitForFunction(() => window.__pocket !== undefined);
    await wide.waitForTimeout(300);
    await shot(wide, `${OUT}/landscape-${name}-inicio.png`);
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
    await shot(wide, `${OUT}/landscape-${name}-treino-lista.png`);
    await measureTaps('treino-lista');
    await wide.click('[data-player="1"]');
    await wide.click('[data-act="openCards"]');
    await wide.click('[data-card="shooting"]');
    await wide.waitForTimeout(100);
    await shot(wide, `${OUT}/landscape-${name}-treino.png`);
    await measureTaps('treino');
    check(`Em ${name}, os menus cabem na janela`, await wide.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight));
    await wide.click('.back');
    await wide.click('.back');
    await wide.click('#arenaChip');
    await wide.waitForTimeout(150);
    await shot(wide, `${OUT}/landscape-${name}-balneario.png`);
    check(`Em ${name}, «Bola ao alto» está todo à vista no balneário`, await fullyVisible(wide, '#kickoffBtn'));
    await measureTaps('balneario');
    await wide.click('#kickoffBtn');
    await skipIntro(wide);
    await wide.waitForTimeout(600);
    await wide.evaluate(() => window.__pocket.pauseAt('made', 2));
    await wide.waitForTimeout(200);
    await shot(wide, `${OUT}/landscape-${name}.png`);
    await measureTaps('jogo');
    await checkCourtOnly(wide, `landscape-${name}`, `Em ${name}`);
    const layout = await wide.evaluate(() => {
      const screen = document.getElementById('screen')!.getBoundingClientRect();
      const panel = document.getElementById('panel')!.getBoundingClientRect();
      const canvas = document.getElementById('court')!.getBoundingClientRect();
      return {
        fills: Math.abs(screen.width + panel.width - innerWidth) < 2 && Math.abs(panel.height - innerHeight) < 2,
        // O enquadramento é sempre o mesmo: a tela tem 360×216 de arte e cabe no espaço do campo, com barras no que sobra.
        canvasCovers: canvas.width <= screen.width + 1 && canvas.height <= screen.height + 1 && window.__pocket.state().canvas.width === 360 && window.__pocket.state().canvas.height === 216,
        overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
        art: `${window.__pocket.state().canvas.width}x${window.__pocket.state().canvas.height}`,
      };
    });
    check(`Em ${name}, o painel ocupa a janela e o campo tem o enquadramento de sempre`, layout.fills && layout.canvasCovers && !layout.overflow, `arte ${layout.art}`);
    if (name !== 'telemovel-deitado') {
      const benchFits = await wide.evaluate(() => {
        const content = document.getElementById('tabContent')!.getBoundingClientRect();
        const rows = [...document.querySelectorAll('#tabContent .row')];
        return rows.length === 10 && rows.every(row => row.getBoundingClientRect().bottom <= content.bottom + 1);
      });
      check(`Em ${name}, os dez jogadores em campo cabem no painel sem rolar`, benchFits);
    }
    if (phoneLandscape) check(`Em ${name}, os alvos de toque têm pelo menos 44×44 px (34 px de altura nas linhas de lista)`, wideTaps.length === 0, wideTaps.join(' | '));
    check(`Em ${name}, sem erros`, wideProblems.length === 0, wideProblems.join(' | '));
    await context.close();
  }

  // Os atalhos de teclado no computador.
  const keysContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const keys = await keysContext.newPage();
  const keyProblems: string[] = [];
  keys.on('pageerror', error => keyProblems.push(error.message));
  await keys.goto(url);
  await keys.click('#newClubBtn');
  await keys.locator('#clubName').click();
  await keys.keyboard.type('Pateas');
  await keys.keyboard.press('Escape');
  check('A escrever no nome do clube, as letras não são atalhos', (await keys.locator('#clubName').inputValue()).includes('Pateas') && (await keys.locator('#startClubBtn').count()) === 1);
  await keys.goto(`${url}?semente=11&divisao=2`);
  await keys.waitForSelector('#arenaChip');
  const visible = (selector: string): Promise<boolean> => keys.locator(selector).first().isVisible();
  check('Os edifícios mostram a tecla na dica', (await keys.getAttribute('#arenaChip', 'title'))?.endsWith('(P)') === true);
  await keys.keyboard.press('e');
  await keys.waitForTimeout(100);
  const office = !(await visible('#arenaChip')) && (await visible('.back'));
  await keys.keyboard.press('Escape');
  await keys.waitForTimeout(100);
  check('E abre o escritório e Esc volta à cidade', office && (await visible('#arenaChip')));
  await keys.keyboard.press('t');
  await keys.locator('.prow').first().focus();
  await keys.keyboard.press('ArrowDown');
  check('Na lista do treino, a seta passa para a linha seguinte', (await keys.evaluate(() => (document.activeElement as HTMLElement).dataset.player)) === '1');
  await keys.keyboard.press('Escape');
  await keys.waitForSelector('#arenaChip');
  await keys.keyboard.press('p');
  await keys.waitForSelector('#kickoffBtn');
  await keys.keyboard.press('Enter');
  await keys.waitForSelector('#introSkip');
  await keys.keyboard.press('Enter');
  await keys.waitForSelector('#pauseBtn');
  check('A dica da pausa mostra a tecla', (await keys.getAttribute('#pauseBtn', 'title'))?.endsWith('(Espaço)') === true);
  await keys.keyboard.press(' ');
  await keys.waitForFunction(() => document.getElementById('pauseBtn')?.getAttribute('aria-label') === 'Continuar', undefined, { timeout: 15_000 });
  await keys.keyboard.press('2');
  check('2 escolhe o segundo separador', (await keys.getAttribute('[data-tab="stats"]', 'aria-selected')) === 'true');
  const muted = await keys.getAttribute('#muteBtn', 'aria-pressed');
  await keys.keyboard.press('s');
  check('S liga e desliga o som', (await keys.getAttribute('#muteBtn', 'aria-pressed')) !== muted);
  await keys.keyboard.press('v');
  const fast = await keys.getAttribute('#speedBtn', 'aria-label');
  await keys.keyboard.press('v');
  const faster = await keys.getAttribute('#speedBtn', 'aria-label');
  await keys.keyboard.press('v');
  check('V muda a velocidade 1× → 2× → 4× → 1×', (fast ?? '').includes('2×') && (faster ?? '').includes('4×') && ((await keys.getAttribute('#speedBtn', 'aria-label')) ?? '').includes('1×'), `${fast} | ${faster}`);
  await keys.keyboard.press('?');
  const help = await keys.locator('#keysHelp[open]').count();
  await shot(keys, `${OUT}/atalhos.png`);
  await keys.keyboard.press('Escape');
  check('? abre a lista dos atalhos e Esc fecha-a', help === 1 && (await keys.locator('#keysHelp').count()) === 0);
  await keys.keyboard.press(' ');
  check('Espaço continua o jogo', (await keys.getAttribute('#pauseBtn', 'aria-label')) !== 'Continuar');
  // O desconto, as trocas e as táticas no fim: o desconto pedido muda o estado do jogo e baralhava as teclas seguintes.
  const timeouts = (): Promise<number> => keys.evaluate(() => window.__pocket.state().commands.filter(c => c.startsWith('timeout@')).length);
  const timeoutsBefore = await timeouts();
  await keys.keyboard.press('d');
  const armed = (await keys.getAttribute('#timeoutBtn', 'data-armed')) !== null && (await timeouts()) === timeoutsBefore;
  await keys.keyboard.press('d');
  check('D arma o desconto e o segundo D pede-o', armed && (await timeouts()) === timeoutsBefore + 1);
  await keys.keyboard.press('t');
  const subs = await keys.locator('[data-subs-close]').count();
  await keys.keyboard.press('Escape');
  check('T abre as trocas e Esc fecha', subs === 1 && (await keys.locator('[data-subs-close]').count()) === 0);
  await keys.keyboard.press('a');
  const tactics = await keys.locator('#matchTacticsClose').count();
  await keys.keyboard.press('Escape');
  check('A abre as táticas e Esc fecha', tactics === 1 && (await keys.locator('#matchTacticsClose').count()) === 0);
  check('Sem erros com os atalhos', keyProblems.length === 0, keyProblems.join(' | '));
  await keysContext.close();

  // O tamanho de referência, 640×360: os ecrãs principais cabem na largura e não dão erros.
  const reference = await browser.newContext({ viewport: { width: 640, height: 360 }, hasTouch: true });
  const small = await reference.newPage();
  const smallProblems: string[] = [];
  small.on('pageerror', error => smallProblems.push(error.message));
  const fitsWidth = (): Promise<boolean> => small.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  const smallFits: string[] = [];
  const smallTaps: string[] = [];
  const visit = async (name: string): Promise<void> => {
    await small.waitForTimeout(150);
    await shot(small, `${OUT}/ref-360-${name}.png`);
    if (!(await fitsWidth())) smallFits.push(name);
    const short = await shortTargets(small);
    if (short.length) smallTaps.push(`${name}: ${short.join(', ')}`);
  };
  await small.goto(`${url}?semente=11&divisao=2`);
  await small.waitForFunction(() => window.__pocket !== undefined);
  await visit('cidade');
  await small.click('#trainBtn');
  await visit('treino');
  await small.click('.back');
  await small.click('#officeBtn');
  await visit('escritorio');
  await small.click('.back');
  await small.click('#arenaChip');
  await small.waitForTimeout(150);
  check('Em 640x360, «Bola ao alto» está todo à vista no balneário, sem deslizar', await fullyVisible(small, '#kickoffBtn'));
  await visit('balneario');
  await small.click('[data-squad="pre"]');
  await visit('plantel');
  await small.click('.back');
  await small.click('[data-go="rival"]');
  await visit('adversario');
  await small.click('.back');
  await small.click('#kickoffBtn');
  await skipIntro(small);
  await small.waitForTimeout(600);
  await visit('jogo');
  check('Em 640x360, os ecrãs principais cabem na largura', smallFits.length === 0, smallFits.join(', '));
  check('Em 640x360, os alvos de toque têm pelo menos 44×44 px (34 px de altura nas linhas de lista)', smallTaps.length === 0, smallTaps.join(' | '));
  check('Em 640x360, sem erros', smallProblems.length === 0, smallProblems.join(' | '));
  await reference.close();

  // Textos com acentos no campo: o nome por cima de um jogador, um balão da bancada e uma palavra a flutuar.
  // Os acentos sobem 3 linhas acima da letra; as caixas têm de os conter. As capturas são para ver a olho.
  for (const [name, width, height] of [['640', 640, 360], ['deitado', 1280, 720]] as const) {
    const context = await browser.newContext({ viewport: { width, height } });
    const accents = await context.newPage();
    await accents.goto(`${url}?semente=11&divisao=2`);
    await accents.waitForFunction(() => window.__pocket !== undefined);
    await accents.click('#arenaChip');
    await accents.click('#kickoffBtn');
    await skipIntro(accents);
    await accents.evaluate(() => window.__pocket.pauseAt('pass', 2));
    await accents.waitForTimeout(300);
    await accents.evaluate(() => {
      const v = window.__pocket.matchView();
      const body = v.s.court[0][2];
      body.player = { ...body.player, name: 'Simão Gonçalves' };
      v.view(body).nameTag = v.s.tick + 100000;
      v.crowdSay('OH NÃO... ÁRBITRO!');
      v.floaters.push({ label: 'MÃO RÁPIDA', x: v.s.court[1][0].x, y: v.s.court[1][0].y, z: 2.6, born: v.s.tick });
    });
    await accents.waitForTimeout(200);
    await accents.locator('.screen').screenshot({ path: `${OUT}/acentos-${name}.png` });
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
    await shot(big, `${OUT}/divisao-${division}.png`);
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

check('Os botões têm nome para o leitor de ecrã e as imagens têm alt', a11y.size === 0, [...a11y].slice(0, 12).join(' | '));

if (failures.length > 0) {
  console.error(`\n${failures.length} verificação(ões) falhou/falharam.`);
  process.exit(1);
}
console.log(`\nTudo certo. Imagens em ${OUT}/`);
process.exit(0);
