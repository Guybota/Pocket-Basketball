import { matchHash } from '../sim/hash.ts';
import { BALANCE as B } from '../sim/balance.ts';
import { clockIcon, speedIcon, controlIcon, subsIcon } from './art/icons.ts';
import { cancelSubstitution, holdMatch, isSprinting, queueSubstitution, resumeMatch, reorderBench, replayMatch, requestTimeout, setAutoRotation, setTactics, simulateMatch, type Body, type MatchEvent, type MatchState } from '../sim/match.ts';
import { makeRng, type Rng } from '../sim/rng.ts';
import { DIVISIONS } from '../sim/teamgen.ts';
import { CARDS, MAX_CARDS_PER_MATCH, cardFromEvent, type CardId } from '../sim/training.ts';
import { cardImage } from './art/cards.ts';
import { CLOSED_GYM } from './art/court.ts';
import { emblemImage, isLight } from './art/kit.ts';
import { lookOf } from './art/sprites.ts';
import { drawTown, townBoxes, townHit, townPlaces, weatherFor, type TownPlace } from './art/town.ts';
import { GameAudio, MUSIC_THEMES } from './audio.ts';
import { applySettings, openSettings, reducedMotion, updateSettings, watchSystemMotion } from './settings.ts';
import { tacticValue, tacticsControls } from './club-screens.ts';
import { activeKit, careerOf, clubColor, clubTeam, currentFixture, currentGame, finishMatch, forecast, liveOtherGames, rivalTeam, finishPractice, firstHalfOver, newClub, opponentOf, skipWeek, visitorOf, weekSeed, type ClubState, type MatchResult, type SeasonRecord } from './club.ts';
import { titleTrophy, titleWon, type Title } from './trophies.ts';
import { closeMenus, initMenus, menuFrame, menusOpen, menusResized, openArena, openCreate, openHalf, openMenu, openRenewals, rivalKitFor, showTopNote, showTopScene, type GameKind } from './menus.ts';
import { PRESEASON_WEEKS } from '../sim/league.ts';
import { GUEST_RIVAL } from './airport.ts';
import { clubIdentity } from './art/identity.ts';
import { keepAwake } from './awake.ts';
import { TOWER_NOTE, firedHtml, matchLeagueSummary, officialLabel, seasonReportHtml, seasonTopStats, townOverlay } from './season-screens.ts';
import { MatchView, type Sound } from './match-view.ts';
import { BALL_SIZE, drawBall } from './art/ball.ts';
import { decisiveTick, escapeHtml, introScreen, panelContent, playerCard, playerCardLive, resultScreen, subsPanel, type LiveLeague, type PanelTab, optionsControls, pickOption } from './panel.ts';
import { assistantResult, say, secretaryFarewell } from './staff.ts';
import { portraitImage } from './art/portrait.ts';
import { TICKS_PER_SECOND } from '../sim/court.ts';
import { createDemo } from './demo.ts';
import { createHud } from './hud.ts';
import { clockText } from './narrate.ts';
import { createIdleResume } from './idle.ts';
import { createLayout, type Stage } from './layout.ts';
import { initPwa } from './pwa.ts';
import { exportClub, importClub, lastExportNote, loadClub as readClub, saveClub as writeClub, type SaveStatus } from './save.ts';
import { initTouch } from './touch.ts';
import { initKeys } from './keys.ts';

const DROP_TICKS = 50;
const MAX_STEPS_PER_FRAME = 40;
/** O primeiro toque no relógio só o arma; desarma sozinho ao fim deste tempo, sem parar o jogo. Igual ao `3s` do style.css. */
const TIMEOUT_CONFIRM_MS = 3000;
let timeoutArmed = 0;
// A ×4 só se calam os sons muito repetidos. Apitos e buzzers continuam, porque dizem o que aconteceu.
const QUIET_AT_SPEED: readonly Sound[] = ['bounce', 'bump', 'catch'];
// Quanto o painel do ecrã aberto precisa, na vertical, quando ele pede a parte de cima mais alta (0 é o normal).
let menuPanel = 0;

const element = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const game = element<HTMLDivElement>('game');
const screen_ = element<HTMLDivElement>('screen');
const canvas = element<HTMLCanvasElement>('court');
const panel = element<HTMLDivElement>('panel');
const banner = element<HTMLDivElement>('banner');
const hudElement = element<HTMLDivElement>('hud');
const hud = createHud(hudElement);
const context = canvas.getContext('2d')!;

const audio = new GameAudio();
applySettings(audio);
watchSystemMotion(audio);
const params = new URLSearchParams(location.search);
const paramInt = (name: string): number | null => {
  const value = Number(params.get(name));
  return params.has(name) && Number.isInteger(value) ? value : null;
};

const testSeed = paramInt('semente');
// Só para a verificação automática poder ver os outros pavilhões. Um clube a sério começa sempre na última divisão.
const testDivision = Math.max(0, Math.min(DIVISIONS.length - 1, paramInt('divisao') ?? 0));
let club: ClubState | null = null;
let stage: Stage = 'title';
// Na horizontal, o resultado do jogo abre numa janela ao centro, com o campo a ocupar o ecrã todo por trás.
let resultOpen = false;
let townClock: number | null = null;
let gameKind: GameKind = 'official';
let rivalOf = 0;
let halfShown = false;
let halfSubsOpen = false;
const saveStatus: SaveStatus = { failed: false, unreadable: false };
let view: MatchView | undefined;
let dropRng: Rng = makeRng(0);
let found: CardId[] = [];
let dropUntil = 0;
let speed = 1;
const STILL_FRAME_MS = 1000 / 30 - 2;
let lastStillDraw = 0;
let paused = false;
let pauseRequested = false;
/** Uma paragem em que o jogo espera pelo treinador: desconto, ou fim de período sem ser o intervalo. */
const holdOpen = (s: MatchState): boolean => s.phase === 'timeout' || (s.phase === 'break' && s.period !== 2);
const ballSettled = (s: MatchState): boolean => s.holder !== null || s.phase === 'dead' || s.phase === 'timeout' || s.phase === 'break' || s.phase === 'end' || s.ball.z <= 0.2;
let started = false;
let tab: PanelTab = 'bench';
let accumulator = 0;
let lastFrame = 0;
let lastPanelUpdate = 0;
let bannerUntil = 0;
let renderMs = 0;
let renderCount = 0;
let finished = false;
let pointerDown = false;
let cardBody: Body | null = null;
let subsOpen = false;
// Os outros jogos da jornada, simulados ao começar o nosso, para a aba da liga.
let liveLeague: LiveLeague | null = null;
let subPick: number | null = null;
let tacticsOpen = false;
let timeoutHandled = false;
/** O período cujo fim já foi anunciado: a paragem dura 30 s e o aviso só deve entrar uma vez. */
let breakAnnounced = 0;
/** O treinador já tocou no ecrã durante esta paragem: ela espera por ele, sem contagem. */
let holdTouched = false;
// A opção de ataque que se está a escolher no painel de táticas do jogo.
let optionPicking: number | null = null;
const idle = createIdleResume();
// A apresentação antes do jogo, a cena do fim, e a repetição do lance decisivo.
let introTimer = 0;
let endAt = 0;
// O fecho do jogo faz-se logo no apito final, para se saber se deu um título; e então há cerimónia antes do relatório.
let endResult: MatchResult | null = null;
let endTitle: Title | null = null;
let ceremonyOn = false;
/** Para a verificação: o título que o próximo jogo dá, ganhe-se ou não. */
let forcedTitle: Title | null = null;
const CEREMONY_DELAY_MS = 1500;
let resultHtml = '';
let replay: MatchView | undefined;
let replayUntil = 0;
let replayAccumulator = 0;
const REPLAY_SPEED = 0.5;
const townExtras = newClub(1);
const demo = createDemo(context, () => club ?? townExtras, () => stage === 'title');
const soundsPlayed = new Set<Sound>();
const announced = new Set<string>();

const townUi = document.createElement('div');
townUi.id = 'townUi';
townUi.hidden = true;
screen_.append(townUi);

const topUi = document.createElement('div');
topUi.id = 'topUi';
topUi.hidden = true;
screen_.append(topUi);

const drop = document.createElement('div');
drop.id = 'drop';
drop.hidden = true;
screen_.append(drop);

// Com ?semente= é um clube de ensaio, para a verificação automática nunca mexer no clube a sério.
function saveClub(): void {
  if (testSeed === null) writeClub(club, saveStatus);
}

const layout = createLayout({ game, screen: screen_, canvas, context, panel, hud: hudElement, topUi }, {
  canvasResized: () => {
    view?.resize();
    demo.resize();
  },
  topResized: menusResized,
});

function fit(): void {
  layout.fit({ stage, resultOpen, menuPanel });
  if (stage === 'town' && club) placeTownUi();
}

/** Muda de modo e volta a medir: a cidade, os menus e o campo usam tamanhos diferentes. */
function setStage(next: Stage): void {
  // Ao voltar à cidade, o foco regressa ao botão que a deixou (o leitor de ecrã não fica perdido no início da página).
  if (stage === 'town' && next !== 'town') townFocus = document.activeElement?.id ?? '';
  stage = next;
  // Durante o jogo o ecrã do telemóvel não se apaga; nos menus e na cidade, volta ao normal.
  keepAwake(next === 'match');
  resultOpen = false;
  if (next !== 'match' && next !== 'menu') idle.clear();
  if (next !== 'title') demo.stop();
  if (next === 'town') audio.music('town');
  else if (next === 'title') audio.music('anthem');
  // Durante o jogo não há música: ouve-se o pavilhão.
  else if (next === 'match') audio.music('none');
  // Uma cortina curta entre ecrãs, em vez de uma troca seca.
  game.classList.remove('stage-in');
  void game.offsetWidth;
  game.classList.add('stage-in');
  game.classList.toggle('city-home', next === 'town');
  townUi.hidden = next !== 'town';
  topUi.hidden = next !== 'menu';
  fit();
}

/** Tocar num edifício é o mesmo que tocar na etiqueta dele. */
canvas.addEventListener('click', event => {
  const rect = canvas.getBoundingClientRect();
  // Durante o jogo, tocar num jogador mostra-lhe o nome por cima.
  if (stage === 'match' && view && !replay) {
    view.tapAt(((event.clientX - rect.left) / rect.width) * canvas.width, ((event.clientY - rect.top) / rect.height) * canvas.height);
    return;
  }
  if (stage !== 'town' || !club) return;
  const place = townHit(canvas.width, canvas.height, club.division, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
  const chips: Record<TownPlace, string> = { arena: 'arenaChip', office: 'officeBtn', training: 'trainBtn', federation: 'federationBtn', tower: 'towerChip', airport: 'airportChip' };
  if (place) document.getElementById(chips[place])?.click();
});

function importFile(): void {
  importClub(() => club, saveStatus, loaded => {
    club = loaded;
    saveStatus.unreadable = false;
    saveClub();
    applyClubColors();
    showClub();
  });
}

let townFocus = '';
function placeTownUi(): void {
  const current = club!;
  const back = townUi.contains(document.activeElement) ? document.activeElement!.id : townFocus;
  townFocus = '';
  townUi.innerHTML = townOverlay(current, townPlaces(canvas.width, canvas.height), saveStatus.failed);
  if (back) document.getElementById(back)?.focus({ preventScroll: true });
  const note = (text: string): void => {
    const box = document.querySelector('#staffNote .t');
    if (box) box.textContent = text;
  };
  element('arenaChip').addEventListener('click', openArena);
  element('towerChip').addEventListener('click', () => {
    note(saveStatus.failed ? 'Este browser não deixa guardar: o clube perde-se ao fechar a página. Exporta-o para não o perderes.' : TOWER_NOTE);
    const showCopy = (): void => {
      const { text, stale } = lastExportNote(club!);
      const line = element('towerCopy');
      line.textContent = text;
      line.classList.toggle('stale', stale);
    };
    if (document.getElementById('exportBtn')) return showCopy();
    document.querySelector('.town-note')!.insertAdjacentHTML('beforeend', '<p class="tower-copy" id="towerCopy"></p><div class="tower-actions"><button type="button" class="quiet" id="exportBtn">Exportar clube</button><button type="button" class="quiet" id="importBtn">Importar clube</button><button type="button" class="quiet" id="settingsBtn">Definições</button></div>');
    showCopy();
    element('exportBtn').addEventListener('click', () => exportClub(club!, showCopy));
    element('settingsBtn').addEventListener('click', () => openSettings(audio));
    element('importBtn').addEventListener('click', importFile);
  });
  element('airportChip').addEventListener('click', () => openMenu('airport'));
  element('federationBtn').addEventListener('click', () => openMenu('federation'));
  element('officeBtn').addEventListener('click', () => openMenu('office'));
  element('trainBtn').addEventListener('click', () => {
    audio.unlock();
    openMenu('train');
  });
  document.getElementById('skipWeekBtn')?.addEventListener('click', () => {
    club = skipWeek(club!);
    saveClub();
    showClub();
  });
}

function announce(message: string): void {
  announced.add(message);
  banner.textContent = message;
  banner.hidden = false;
  // Recomeçar a animação de entrada, mesmo que já houvesse um aviso no ecrã.
  banner.classList.remove('show');
  void banner.offsetWidth;
  banner.classList.add('show');
  bannerUntil = view!.s.tick + 36;
  speak(message, 1);
}

// Leitor de ecrã: um anúncio de cada vez, no máximo um a cada LIVE_GAP_MS; o mais importante que chegar entretanto ganha.
const LIVE_GAP_MS = 3000;
const live = element<HTMLDivElement>('live');
let livePending = { text: '', rank: 0 };
let liveAt = -LIVE_GAP_MS;
function speak(text: string, rank: number): void {
  if (rank >= livePending.rank) livePending = { text, rank };
}
function flushLive(now: number): void {
  if (!livePending.text || now - liveAt < LIVE_GAP_MS) return;
  live.textContent = livePending.text;
  livePending = { text: '', rank: 0 };
  liveAt = now;
}
const scoreLine = (s: MatchState): string => `${s.teams[0].short} ${s.score[0]}, ${s.teams[1].short} ${s.score[1]}`;
const periodName = (period: number): string => (period > 4 ? 'prolongamento' : `${period}.º período`);
/** O que o leitor de ecrã diz de um evento do jogo, e com que prioridade: 3 para os fins de período, 2 para os cestos. */
function liveLine(e: MatchEvent, s: MatchState): [string, number] | null {
  switch (e.type) {
    case 'made': return [`Cesto de ${e.points} de ${e.player}. ${scoreLine(s)}`, 2];
    case 'freeThrowMade': return [`Lance livre de ${e.player}. ${scoreLine(s)}`, 2];
    case 'timeout': return [`Desconto de tempo: ${s.teams[e.team].name}`, 2];
    case 'periodEnd':
      if (e.period === 2) return [`${gameKind === 'practice' ? 'Fim do jogo-treino' : 'Intervalo'}. ${scoreLine(s)}`, 3];
      return e.period >= 4 && s.score[0] === s.score[1] ? [`Fim do ${periodName(e.period)}, empate: há prolongamento. ${scoreLine(s)}`, 3] : e.period >= 4 ? null : [`Fim do ${periodName(e.period)}. ${scoreLine(s)}`, 3];
    case 'end': return [`Fim do jogo. ${s.score[0] > s.score[1] ? 'Vitória' : 'Derrota'}. ${scoreLine(s)}`, 3];
    default: return null;
  }
}

/** As cores da interface seguem o equipamento escolhido. */
function applyClubColors(): void {
  const { jersey } = activeKit(club!);
  game.style.setProperty('--home', jersey);
  game.style.setProperty('--home-ink', isLight(jersey) ? '#1b2230' : '#ffffff');
}

/** A equipa de fora do Aeroporto, quando é ela o adversário. */
const guestOf = (rivalId: number): ClubState['guest'] => (rivalId === GUEST_RIVAL ? club!.guest : null);

function makeView(kind: GameKind, rivalId: number): void {
  const current = club!;
  // Os amigáveis jogam-se quantas vezes se quiser na mesma semana: cada um conta os anteriores, para não ser sempre o mesmo jogo.
  const seed = rivalId === GUEST_RIVAL ? (weekSeed(current) + (current.guestGames.length + 1) * 7919) & 0x7fffffff : weekSeed(current);
  liveLeague = kind === 'official' ? { club: current, others: liveOtherGames(current) } : null;
  dropRng = makeRng(seed ^ 0x3c1a77);
  found = [];
  drop.hidden = true;
  // Um jogo-treino é à porta fechada, por isso joga-se num pavilhão sem público.
  const rival = rivalTeam(current, rivalId);
  view = new MatchView(context, clubTeam(current), rival, seed, kind === 'practice' ? CLOSED_GYM : current.division, {
    announce,
    event: e => {
      const said = started ? liveLine(e, view!.s) : null;
      if (said) speak(...said);
      // A vista já recebe o início do jogo ao ser criada, antes de o jogo começar a sério.
      // O amigável do Aeroporto não dá cartas.
      const card = started && rivalId !== GUEST_RIVAL && found.length < MAX_CARDS_PER_MATCH ? cardFromEvent(e, 0, dropRng) : null;
      if (card) showDrop(card);
    },
    sound: name => {
      soundsPlayed.add(name);
      audio.setSpeed(speed);
      if (started && !(speed > 2 && QUIET_AT_SPEED.includes(name))) audio.play(name);
    },
  }, [true, false], kind === 'official' ? visitorOf(current) : 1, activeKit(current), undefined, venueColor(kind, rivalId), current.confidence / 100, rivalKitFor(current, rival.name, activeKit(current), guestOf(rivalId)), kind === 'official' && visitorOf(current) === 0 ? clubIdentity(rival.name).emblem : current.emblem, current.emblem, guestOf(rivalId)?.emblem, weatherFor(current.week));
  accumulator = 0;
  finished = false;
  cardBody = null;
  subsOpen = false;
  subPick = null;
  tacticsOpen = false;
  timeoutHandled = false;
  breakAnnounced = 0;
  audio.setVenue(kind === 'practice' ? CLOSED_GYM : current.division);
  banner.hidden = true;
  hud.reset();
  endAt = 0;
  endResult = null;
  endTitle = null;
  ceremonyOn = false;
  replay = undefined;
}

/** A carta aparece por cima do jogo, sem o parar. */
function showDrop(card: CardId): void {
  found.push(card);
  drop.innerHTML = `<img src="${cardImage(card, CARDS[card].category)}" alt=""><span>${CARDS[card].name}</span>`;
  drop.hidden = false;
  dropUntil = view!.s.tick + DROP_TICKS;
  soundsPlayed.add('card');
  if (started && speed <= 2) audio.play('card');
  if (tab === 'cards') refreshContent();
}

function newSeed(): number {
  return (Date.now() ^ (performance.now() * 1000)) & 0x7fffffff;
}

const ballLogo = (): string => {
  const c = document.createElement('canvas');
  c.width = BALL_SIZE;
  c.height = BALL_SIZE;
  drawBall(c.getContext('2d')!);
  return c.toDataURL();
};

/** O ecrã de título: continuar o clube guardado ou criar um novo, que começa sempre pela última divisão. */
function showNewClub(): void {
  closeMenus();
  setStage('title');
  panel.innerHTML = `<div class="start">
    <h1><img src="${ballLogo()}" alt=""><span>Pocket<br>Basketball</span></h1>
    ${saveStatus.unreadable ? '<p class="hint warn">Não foi possível ler o clube guardado. Ele só é substituído se criares um novo.</p>' : ''}
    ${club ? `<button type="button" class="primary" id="continueBtn">Continuar · ${escapeHtml(club.team.short)}</button>` : ''}
    ${club ? '' : '<button type="button" class="primary" id="newClubBtn">Criar clube</button>'}
    <div class="start-row">
      ${club ? '<button type="button" class="quiet" id="newClubBtn">Criar clube</button>' : ''}
      <button type="button" class="quiet" id="importBtn">Importar clube</button>
      <button type="button" class="quiet" id="settingsBtn">Definições</button>
    </div>
    <p class="hint">${club ? `Época ${club.season}, semana ${club.week}.` : `Começas na ${DIVISIONS[0]!.name}. Treinas a equipa entre jogos, e os jogos correm sozinhos.`}</p>
  </div>`;
  document.getElementById('continueBtn')?.addEventListener('click', () => {
    audio.unlock();
    showClub();
  });
  demo.schedule();
  element('importBtn').addEventListener('click', importFile);
  element('settingsBtn').addEventListener('click', () => openSettings(audio));
  element('newClubBtn').addEventListener('click', () => {
    audio.unlock();
    // Depois de um despedimento o clube já está perdido: não há nada a confirmar.
    const question = club && !club.fired
      ? `Criar um clube novo apaga ${club.team.name}, época ${club.season}. Exporta-o primeiro na Torre se o quiseres guardar. Continuar?`
      : saveStatus.unreadable ? 'O clube guardado que não se consegue ler vai ser apagado. Continuar?' : null;
    if (question && !confirm(question)) return;
    // Os troféus são do treinador, por isso acompanham-no para o clube novo.
    club = newClub(newSeed(), 0, club ? careerOf(club) : []);
    saveStatus.unreadable = false;
    saveClub();
    applyClubColors();
    openCreate();
  });
}

/** A cidade é o menu principal. Se houver um balanço por ver ou um despedimento, vem primeiro. */
function showClub(): void {
  const current = club!;
  if (current.fired && !current.seasonReport) {
    showFired();
    return;
  }
  if (current.seasonReport) {
    showSeasonReport();
    return;
  }
  if (current.pendingRenewals) {
    openRenewals();
    return;
  }
  started = false;
  paused = false;
  view = undefined;
  closeMenus();
  applyClubColors();
  banner.hidden = true;
  drop.hidden = true;
  panel.innerHTML = '';
  setStage('town');
}

/** A cor do pavilhão: quem joga em casa pinta o campo e enche a bancada. */
function venueColor(kind: GameKind, rivalId: number): string {
  const current = club!;
  if (kind === 'official' && visitorOf(current) === 0) return clubColor(current.clubs[rivalId]!);
  const kit = activeKit(current);
  return [kit.jersey, kit.second, kit.trim].find(color => !isLight(color)) ?? '#2b5fd9';
}

/** O clube em grande, por cima dos ecrãs que têm o texto todo em baixo. */
const clubBadge = (current: ClubState): string => `<div class="clubbadge"><img class="emblem" alt="" src="${emblemImage(current.emblem)}"><b>${escapeHtml(current.team.name)}</b></div>`;

function showSeasonReport(): void {
  const current = club!;
  closeMenus();
  setStage('menu');
  const festive = current.seasonReport!.outcome === 'champion' || current.seasonReport!.cups.length > 0;
  if (current.seasonReport!.outcome === 'relegated') showTopScene('relegated', `Fim da época ${current.seasonReport!.season}`, `${escapeHtml(current.team.short)} · Desceram de divisão`);
  else showTopNote(`Fim da época ${current.seasonReport!.season}`, escapeHtml(current.team.short), `${festive ? '<canvas id="confetti" class="confetti" width="115" height="75"></canvas>' : clubBadge(current)}${seasonTopStats(current.seasonReport!)}`);
  audio.music(festive ? 'anthem' : current.seasonReport!.outcome === 'relegated' ? 'loss' : 'town');
  panel.innerHTML = seasonReportHtml(current, current.seasonReport!);
  const report = current.seasonReport!;
  element('seasonContinue').addEventListener('click', () => {
    club = { ...club!, seasonReport: null };
    saveClub();
    if (report.farewells?.length && !club.fired) showFarewell(report);
    else if (club.pendingRenewals && !club.fired) openRenewals();
    else showClub();
  });
}

/** Quem chegou ao fim do Potencial despede-se, com o retrato e os números de uma carreira. */
function showFarewell(report: SeasonRecord): void {
  const farewells = report.farewells ?? [];
  setStage('menu');
  showTopNote('Despedida', `Época ${report.season}`, say('secretary', ...secretaryFarewell(farewells.map(f => f.player.name))));
  audio.music('farewell');
  panel.innerHTML = `<div class="result"><div class="winner">Até sempre</div>
    ${farewells.map(f => `<div class="mvp farewell"><img class="face" alt="" src="${portraitImage({ ...lookOf(f.player, 'blue'), custom: activeKit(club!) }, 'sad')}"><span><b>${escapeHtml(f.player.name)}</b><br>${f.seasons} ${f.seasons === 1 ? 'época' : 'épocas'} no clube · ${f.games} jogos · ${f.points} pontos</span></div>`).join('')}
    <p class="hint">O Potencial chegou ao fim. O que aprendeu, levou; o lugar no balneário fica para quem vier.</p></div>
    <div class="end-actions"><button type="button" class="primary" id="farewellContinue">Adeus</button></div>`;
  element('farewellContinue').addEventListener('click', () => {
    if (club!.pendingRenewals) openRenewals();
    else showClub();
  });
}

function showFired(): void {
  closeMenus();
  setStage('menu');
  showTopScene('fired', `Despedido · ${Math.round(club!.confidence)}%`, `${club!.season} ${club!.season === 1 ? 'época' : 'épocas'} · ${club!.wins} V · ${club!.losses} D · Os troféus vão contigo`);
  panel.innerHTML = firedHtml(club!);
  element('firedNewClub').addEventListener('click', showNewClub);
}

function matchControls(): string {
  // Com as trocas ou as táticas abertas, nenhum separador fica escolhido: o que se vê não é nenhum deles.
  const overlay = subsOpen || tacticsOpen;
  // Só o separador escolhido entra na ordem do Tab; as setas passam aos outros.
  const tabButton = (id: PanelTab, label: string): string => `<button type="button" role="tab" id="tab-${id}" data-tab="${id}" aria-controls="tabContent" aria-selected="${!overlay && tab === id}" tabindex="${tab === id ? 0 : -1}">${label}</button>`;
  return `<div class="tabs" role="tablist" aria-label="Painel do jogo">
      ${tabButton('bench', 'Banco')}${tabButton('stats', 'Stats')}${tabButton('league', 'Liga')}${tabButton('feed', 'Relato')}${tabButton('cards', 'Cartas')}
    </div>
    <div id="tabContent" class="content" role="tabpanel" aria-labelledby="tab-${tab}"></div>
    <div class="coachbar">
      <button type="button" id="pauseBtn" class="icon" aria-pressed="${paused || pauseRequested}" aria-label="${paused ? 'Continuar' : pauseRequested ? 'A parar…' : 'Pausa'}" title="${paused ? 'Continuar' : 'Pausa'}"><img class="ink" alt="" src="${controlIcon(paused ? 'play' : 'pause')}"></button>
      <button type="button" id="speedBtn" class="icon" aria-label="Velocidade ${speed}×, tocar para mudar" title="Velocidade ${speed}×"><img class="ink" alt="" src="${speedIcon(speed)}"></button>
      <button type="button" id="muteBtn" class="icon" aria-pressed="${audio.muted}" aria-label="${audio.muted ? 'Ligar o som' : 'Desligar o som'}" title="Som"><img class="ink" alt="" src="${controlIcon(audio.muted ? 'muted' : 'sound')}"></button>
      <button type="button" id="timeoutBtn" class="icon" aria-label="Desconto de tempo" title="Desconto de tempo"><img class="ink" id="timeoutIcon" alt="" src="${clockIcon(view?.s.timeoutsLeft[0] ?? 0)}"></button>
      <button type="button" id="subsBtn" class="icon" aria-pressed="${subsOpen}" aria-label="Trocas" title="Trocas"><img alt="" src="${subsIcon()}"></button>
      <button type="button" id="matchTacticsBtn" class="icon" aria-pressed="${tacticsOpen}" aria-label="Táticas" title="Táticas"><img class="ink" alt="" src="${controlIcon('board')}"></button>
    </div>`;
}

function bindControls(): void {
  panel.querySelector('[role="tablist"]')!.addEventListener('keydown', event => {
    const { key } = event as KeyboardEvent;
    const tabs = [...panel.querySelectorAll<HTMLButtonElement>('[data-tab]')];
    const at = tabs.indexOf(document.activeElement as HTMLButtonElement);
    const next = key === 'ArrowRight' ? at + 1 : key === 'ArrowLeft' ? at - 1 : key === 'Home' ? 0 : key === 'End' ? tabs.length - 1 : null;
    if (next === null || at < 0) return;
    event.preventDefault();
    event.stopPropagation();
    const id = tabs[(next + tabs.length) % tabs.length]!.dataset.tab!;
    tabs.find(t => t.dataset.tab === id)!.click();
    panel.querySelector<HTMLElement>(`[data-tab="${id}"]`)?.focus();
  });
  panel.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button => {
    button.addEventListener('click', () => {
      tab = button.dataset.tab as PanelTab;
      cardBody = null;
      tacticsOpen = false;
      showMatch();
    });
  });
  element('pauseBtn').addEventListener('click', () => {
    // A pausa espera que a bola esteja nas mãos de alguém, ou no chão: nunca fica suspensa no ar.
    if (paused || pauseRequested) {
      paused = false;
      pauseRequested = false;
    } else if (ballSettled(view!.s)) {
      paused = true;
    } else {
      pauseRequested = true;
    }
    showMatch();
  });
  // A velocidade do jogo: 1×, 2× e 4×, e fica escolhida para os jogos seguintes.
  element('speedBtn').addEventListener('click', () => {
    speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
    showMatch();
  });
  element('muteBtn').addEventListener('click', () => {
    updateSettings({ muted: !audio.muted }, audio);
    showMatch();
  });
}

function refreshContent(): void {
  const content = document.getElementById('tabContent');
  // Não mexer no painel durante um toque, senão o botão desaparece antes de o clique acabar.
  if (!content || pointerDown) return;
  updateCoachButtons();
  if (tacticsOpen) {
    content.dataset.shown = '';
    // Só se redesenha quando muda, para a lista das opções não voltar ao início a meio de a percorrer.
    const html = `${tacticsControls(view!.s.tactics[0])}${optionsControls(view!.s.teams[0].roster, view!.s.tactics[0], optionPicking, p => portraitImage({ ...lookOf(p, 'blue'), custom: activeKit(club!) }))}<button type="button" class="primary" id="matchTacticsClose">Fechar</button>`;
    if (content.dataset.shown === html) return;
    content.dataset.shown = html;
    content.innerHTML = html;
    return;
  }
  if (subsOpen) {
    content.dataset.shown = '';
    content.innerHTML = subsPanel(view!, subPick, holdOpen(view!.s));
    return;
  }
  if (cardBody) {
    content.dataset.shown = '';
    const card = content.querySelector<HTMLElement>('.card');
    const live = document.getElementById('cardLive');
    if (card && live && card.dataset.cardBody === String(view!.s.bodies.indexOf(cardBody))) {
      live.innerHTML = playerCardLive(cardBody);
    } else {
      content.innerHTML = playerCard(view!, cardBody, club!.shirts);
    }
    return;
  }
  const focusedPlayer = document.activeElement instanceof HTMLElement && content.contains(document.activeElement) ? document.activeElement.dataset.player : undefined;
  const html = panelContent(view!, tab, found, liveLeague);
  // Só se redesenha quando muda: a cada 250 ms as caras recarregavam e o painel piscava.
  if (content.dataset.shown === html) return;
  content.dataset.shown = html;
  content.innerHTML = html;
  if (focusedPlayer) content.querySelector<HTMLElement>(`[data-player="${focusedPlayer}"]`)?.focus();
}

/** A ficha percorre os jogadores da equipa, incluindo quem está no banco. */
function moveCard(step: number): void {
  if (!cardBody) return;
  const team = view!.s.bodies.filter(b => b.team === cardBody!.team);
  cardBody = team[(team.indexOf(cardBody) + step + team.length) % team.length]!;
  refreshContent();
}

panel.addEventListener('pointerdown', () => {
  pointerDown = true;
});
addEventListener('pointerup', () => {
  pointerDown = false;
});
addEventListener('pointercancel', () => {
  pointerDown = false;
});
/** O botão muda de texto sem ser substituído, para nunca perder um toque. */
function updateCoachButtons(): void {
  const timeoutButton = document.getElementById('timeoutBtn') as HTMLButtonElement | null;
  if (!timeoutButton) return;
  const { s } = view!;
  // O relógio mostra os descontos que restam ao centro; sem nenhum fica apagado e sem número; pedido, fica carregado.
  const icon = document.getElementById('timeoutIcon') as HTMLImageElement | null;
  const src = clockIcon(s.timeoutsLeft[0]);
  if (icon && icon.getAttribute('src') !== src) icon.src = src;
  timeoutButton.setAttribute('aria-pressed', String(s.pendingTimeout[0] || s.timeoutTeam === 0));
  timeoutButton.setAttribute('aria-label', s.pendingTimeout[0] ? 'Desconto pedido' : `Desconto de tempo (${s.timeoutsLeft[0]})`);
  timeoutButton.disabled = s.pendingTimeout[0] || s.timeoutsLeft[0] <= 0 || s.timeoutTeam === 0;
  if (timeoutButton.disabled) disarmTimeout();
  // O balão vem do atributo, por isso o botão continua só com o ícone.
  if (timeoutArmed) timeoutButton.dataset.armed = 'Pedir desconto? Toca outra vez';
  else delete timeoutButton.dataset.armed;
  if (timeoutArmed) timeoutButton.setAttribute('aria-label', 'Pedir desconto? Toca outra vez');
}

function disarmTimeout(): void {
  clearTimeout(timeoutArmed);
  timeoutArmed = 0;
}

function closeSubs(): void {
  subsOpen = false;
  subPick = null;
  if (halfSubsOpen) {
    halfSubsOpen = false;
    openHalf(gameKind, rivalOf);
    return;
  }
  // Numa paragem, Continuar é um comando do treinador: a paragem acaba no passo seguinte.
  if (holdOpen(view!.s)) resumeMatch(view!.s, 0);
  idle.clear();
  showMatch();
}

// A contagem da paragem serve para o jogo não ficar preso quando ninguém está a olhar: ao primeiro toque, deixa de contar.
document.addEventListener('pointerdown', () => {
  const s = view?.s;
  if (!s || paused || holdTouched || !holdOpen(s) || !timeoutHandled) return;
  if (holdMatch(s, 0)) holdTouched = true;
}, { capture: true });

panel.addEventListener('click', event => {
  if (menusOpen()) return;
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-player], [data-card], [data-pick], [data-rotation], [data-subs-close], [data-tactic], [data-option-slot], [data-option-set], [data-option-cancel], [data-option-clear], #timeoutBtn, #subsBtn, #matchTacticsBtn, #matchTacticsClose');
  if (!target || (target as HTMLButtonElement).disabled) return;
  pointerDown = false;
  // As opções de ataque também se mudam a meio do jogo, e ficam registadas como as outras táticas.
  if (target.dataset.optionSlot !== undefined || target.dataset.optionCancel !== undefined) {
    optionPicking = target.dataset.optionSlot !== undefined ? Number(target.dataset.optionSlot) : null;
    refreshContent();
    return;
  }
  if (target.dataset.optionSet !== undefined || target.dataset.optionClear !== undefined) {
    // As mudanças a meio do jogo valem só para este jogo: as táticas do clube mudam-se antes do jogo.
    const current = view!.s.tactics[0];
    const options = target.dataset.optionSet !== undefined ? pickOption(current.options ?? [], optionPicking ?? 0, target.dataset.optionSet) : [];
    optionPicking = null;
    setTactics(view!.s, 0, { ...current, options });
    refreshContent();
    return;
  }
  if (target.dataset.tactic !== undefined) {
    setTactics(view!.s, 0, { ...view!.s.tactics[0], [target.dataset.tactic]: tacticValue(target.dataset.tactic, target.dataset.tacticValue!) });
    refreshContent();
    return;
  }
  const { s } = view!;
  if (target.id === 'timeoutBtn') {
    if (!timeoutArmed) {
      timeoutArmed = setTimeout(() => {
        timeoutArmed = 0;
        updateCoachButtons();
      }, TIMEOUT_CONFIRM_MS) as unknown as number;
      updateCoachButtons();
      return;
    }
    disarmTimeout();
    requestTimeout(s, 0);
    refreshContent();
    return;
  }
  if (target.id === 'matchTacticsBtn' || target.id === 'matchTacticsClose') {
    tacticsOpen = !tacticsOpen;
    cardBody = null;
    showMatch();
    return;
  }
  if (target.id === 'subsBtn') {
    tacticsOpen = false;
    subsOpen = !subsOpen;
    subPick = null;
    cardBody = null;
    refreshContent();
    if (!subsOpen) showMatch();
    return;
  }
  if (target.dataset.pick !== undefined) {
    const index = Number(target.dataset.pick);
    const body = s.bodies[index]!;
    // O primeiro toque escolhe e o segundo troca os dois, contando com as trocas já marcadas (a lista mostra a equipa como
    // vai ficar): campo com banco é uma substituição, campo com campo troca de lugar, banco com banco troca a ordem de
    // entrada. Quem já foi trocado volta a poder ser escolhido para outra posição; tocar nos dois de uma troca marcada desfá-la.
    const shownSlot = (b: Body): number => {
      for (const sub of s.pendingSubs) {
        if (sub.team !== 0) continue;
        if (sub.incoming === b) return sub.slot;
        if (s.court[0][sub.slot] === b) return sub.incoming.slot;
      }
      return b.slot;
    };
    if (subPick === null) {
      subPick = index;
    } else if (subPick === index) {
      subPick = null;
    } else {
      const other = s.bodies[subPick]!;
      const wasAuto = s.autoRotation[0];
      const marked = s.pendingSubs.find(sub => sub.team === 0 && ((sub.incoming === body && s.court[0][sub.slot] === other) || (sub.incoming === other && s.court[0][sub.slot] === body)));
      if (marked) cancelSubstitution(s, 0, marked.slot);
      else if (shownSlot(body) >= 0) queueSubstitution(s, 0, shownSlot(body), subPick);
      else if (shownSlot(other) >= 0) queueSubstitution(s, 0, shownSlot(other), index);
      else reorderBench(s, 0, subPick, index);
      subPick = null;
      if (wasAuto && !s.autoRotation[0]) announce('Rotação automática desligada');
    }
    refreshContent();
    return;
  }
  if (target.dataset.rotation !== undefined) {
    setAutoRotation(s, 0, !s.autoRotation[0]);
    refreshContent();
    return;
  }
  if (target.dataset.subsClose !== undefined) {
    closeSubs();
    return;
  }
  if (target.dataset.player) {
    cardBody = view!.s.bodies[Number(target.dataset.player)] ?? null;
    pointerDown = false;
    refreshContent();
  } else if (target.dataset.card === 'close') {
    cardBody = null;
    pointerDown = false;
    refreshContent();
  } else {
    pointerDown = false;
    moveCard(target.dataset.card === 'next' ? 1 : -1);
  }
});

function showMatch(): void {
  panel.innerHTML = matchControls();
  bindControls();
  refreshContent();
}

function startGame(kind: GameKind, rivalId: number): void {
  audio.unlock();
  gameKind = kind;
  rivalOf = rivalId;
  halfShown = false;
  closeMenus();
  applyClubColors();
  setStage('match');
  makeView(kind, rivalId);
  // O prognóstico aparece na entrada das equipas, e não antes: com a confiança alta, a bancada já vem a festejar.
  if (kind === 'official') view!.showForecast(forecast(club!, rivalTeam(club!, rivalId), visitorOf(club!) === 1), club!.confidence >= 60);
  showIntro();
}

/** Os cinco de cada lado entram em campo. Toca-se para saltar, ou espera-se uns segundos. */
function showIntro(): void {
  const current = club!;
  const label = gameKind === 'official' ? officialLabel(current) : gameKind === 'practice' ? 'Jogo-treino' : rivalOf === GUEST_RIVAL ? 'Amigável' : 'Particular';
  panel.innerHTML = introScreen(view!, label);
  audio.music('entrance');
  element('introSkip').addEventListener('click', beginPlay);
  clearTimeout(introTimer);
  introTimer = window.setTimeout(beginPlay, 3500);
}

function beginPlay(): void {
  if (started) return;
  clearTimeout(introTimer);
  started = true;
  showMatch();
}

/** A repetição: o jogo volta a correr só com as decisões do treinador, até três segundos antes do lance, e mostra-se em câmara lenta. */
function startReplay(): void {
  const { s } = view!;
  const tick = decisiveTick(s);
  const from = Math.max(0, tick - 60);
  const state = replayMatch(s.teams[0], s.teams[1], s.seed, s.controlled, s.commands, s.visitor, from);
  let live = false;
  replay = new MatchView(context, s.teams[0], s.teams[1], s.seed, gameKind === 'practice' ? CLOSED_GYM : club!.division, {
    announce: () => {},
    event: () => {},
    sound: name => {
      if (live) audio.play(name);
    },
  }, s.controlled, s.visitor, activeKit(club!), state, venueColor(gameKind, rivalOf), club!.confidence / 100, rivalKitFor(club!, s.teams[1].name, activeKit(club!), guestOf(rivalOf)), s.visitor === 0 ? clubIdentity(s.teams[1].name).emblem : club!.emblem, club!.emblem, guestOf(rivalOf)?.emblem, weatherFor(club!.week));
  live = true;
  replay.snapCamera();
  replayUntil = tick + 30;
  replayAccumulator = 0;
  announce('Repetição');
  bannerUntil = Infinity;
  resultOpen = false;
  fit();
  panel.innerHTML = `<div class="result"><div class="winner">O lance decisivo</div><p class="hint">Em câmara lenta, três segundos antes do cesto que decidiu o jogo.</p></div>
    <div class="end-actions"><button type="button" id="replayBack">Voltar ao resultado</button></div>`;
  element('replayBack').addEventListener('click', endReplay);
}

function endReplay(): void {
  replay = undefined;
  banner.hidden = true;
  showResultPanel();
}

function showResultPanel(): void {
  resultOpen = true;
  fit();
  panel.innerHTML = `${resultHtml}
    <div class="end-actions two"><button type="button" id="replayBtn">Rever o lance</button><button type="button" class="primary" id="againBtn">Continuar</button></div>`;
  element('againBtn').addEventListener('click', showClub);
  element('replayBtn').addEventListener('click', startReplay);
  countUp(panel.querySelectorAll<HTMLElement>('.final-score b'));
}

/** Os números sobem até ao valor, em menos de um segundo. */
function countUp(elements: NodeListOf<HTMLElement>): void {
  if (reducedMotion()) return;
  const targets = [...elements].map(el => ({ el, value: Number(el.textContent) }));
  const start = performance.now();
  const tick = (now: number): void => {
    const t = Math.min(1, (now - start) / 700);
    for (const { el, value } of targets) el.textContent = String(Math.round(value * (1 - (1 - t) * (1 - t))));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** O jogo fica à espera no balneário, até o treinador o mandar voltar. */
function showHalfTime(): void {
  halfShown = true;
  announced.add('Intervalo');
  accumulator = 0;
  banner.hidden = true;
  drop.hidden = true;
  openHalf(gameKind, rivalOf);
  idle.start(secondHalf);
}

function secondHalf(): void {
  const current = view!;
  idle.clear();
  halfSubsOpen = false;
  subsOpen = false;
  closeMenus();
  while (current.s.phase === 'break') current.stepSim();
  current.snapCamera();
  setStage('match');
  showMatch();
}

function showHalfSubs(): void {
  closeMenus();
  halfSubsOpen = true;
  subsOpen = true;
  subPick = null;
  cardBody = null;
  tacticsOpen = false;
  panel.innerHTML = '<div id="tabContent" class="content"></div>';
  refreshContent();
}

function showResult(): void {
  finished = true;
  banner.hidden = true;
  drop.hidden = true;
  const result = endResult ?? (gameKind === 'practice' ? finishPractice(club!, view!.s, found) : finishMatch(club!, view!.s, found, liveLeague?.others ?? [], rivalOf === GUEST_RIVAL));
  const wasHurt = new Set(club!.team.roster.filter(p => p.injuryWeeks).map(p => p.name));
  club = result.club;
  saveClub();
  const hurt = club.team.roster.filter(p => p.injuryWeeks && !wasHurt.has(p.name))
    .map(p => `Lesão: ${p.name} fica ${p.injuryWeeks} ${p.injuryWeeks === 1 ? 'semana' : 'semanas'} de fora.`);
  const injuries = hurt.map(line => `<p class="hint warn">${escapeHtml(line)}</p>`).join('');
  if (hurt.length) speak(hurt.join(' '), 3);
  const { score } = view!.s;
  audio.music(score[0] > score[1] ? 'win' : 'loss');
  resultHtml = resultScreen(view!, result.cards, `${say('assistant', ...assistantResult(score[0] > score[1], score[0] - score[1], gameKind === 'practice'))}${injuries}${matchLeagueSummary(result, gameKind === 'practice', rivalOf === GUEST_RIVAL)}`);
  showResultPanel();
}

/** O capitão levanta o troféu no meio campo, com o hino; um toque, um clique ou uma tecla saltam para o relatório. */
function startCeremony(current: MatchView, title: Title): void {
  const trophy = titleTrophy(title);
  ceremonyOn = true;
  banner.hidden = true;
  current.startCeremony(trophy.kind, trophy.banner);
  audio.music('anthem');
  speak(`Campeões: ${trophy.name}! Toca no ecrã para continuar.`, 3);
}

// Esse toque não chega a mais nada: senão carregava no botão que o relatório põe no mesmo sítio.
const skipCeremony = (event: Event): void => {
  if (!ceremonyOn || finished) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  showResult();
};
addEventListener('click', skipCeremony, true);
addEventListener('keydown', skipCeremony, true);

function frame(now: number): void {
  // Pedida antes de tudo: um erro a meio de uma imagem não pode parar o jogo de vez.
  requestAnimationFrame(frame);
  const rawElapsed = (now - lastFrame) / 1000;
  const elapsed = Math.min(0.1, rawElapsed);
  lastFrame = now;
  let simSeconds = 0;
  const current = view;
  if (current && started && !paused && !finished && !halfSubsOpen && !menusOpen()) {
    simSeconds = elapsed * speed;
    accumulator += simSeconds * TICKS_PER_SECOND;
    let steps = 0;
    while (accumulator >= 1 && steps < MAX_STEPS_PER_FRAME && (halfShown || !firstHalfOver(current.s))) {
      current.stepSim();
      accumulator -= 1;
      steps++;
      if (pauseRequested && ballSettled(current.s)) {
        pauseRequested = false;
        paused = true;
        showMatch();
        break;
      }
    }
    if (!halfShown && firstHalfOver(current.s)) {
      if (gameKind === 'practice') showResult();
      else showHalfTime();
    } else if (current.s.phase === 'end') {
      // Uns segundos de festa, ou de cabeças baixas, antes do relatório.
      if (endAt === 0) {
        endAt = now;
        announce(current.s.score[0] > current.s.score[1] ? 'Vitória!' : 'Derrota...');
        bannerUntil = Infinity;
        if (gameKind !== 'practice') {
          endResult = finishMatch(club!, current.s, found, liveLeague?.others ?? [], rivalOf === GUEST_RIVAL);
          endTitle = forcedTitle ?? (rivalOf === GUEST_RIVAL ? null : titleWon(club!, endResult));
          forcedTitle = null;
        }
      } else if (endTitle && !ceremonyOn) {
        if (now - endAt > CEREMONY_DELAY_MS) startCeremony(current, endTitle);
      } else if (ceremonyOn ? current.ceremonyDone() : now - endAt > 2500) showResult();
    } else if (current.s.phase === 'break' && breakAnnounced !== current.s.period) {
      breakAnnounced = current.s.period;
      announce(current.s.period >= 4 ? 'Prolongamento!' : `Fim do período ${current.s.period}`);
    }
  }
  // Numa paragem (desconto, ou fim de período sem ser o intervalo) o jogo continua em tempo real: quando a equipa chega ao
  // banco abrem-se as trocas, o botão Continuar mostra o tempo que falta e, se o treinador não mexer, o jogo recomeça sozinho.
  if (current && holdOpen(current.s) && !halfSubsOpen) {
    const arrived = current.s.court[0].every(b => Math.hypot(b.x - b.targetX, b.y - b.targetY) < 1.2);
    if (!timeoutHandled && (arrived || current.s.timer <= (B.coachPauseSeconds - 5) * TICKS_PER_SECOND)) {
      timeoutHandled = true;
      subsOpen = true;
      subPick = null;
      cardBody = null;
      showMatch();
    }
    const resume = document.querySelector('[data-subs-close]');
    const label = holdTouched ? 'Continuar jogo' : `Continuar jogo (${Math.ceil(current.s.timer / TICKS_PER_SECOND)} s)`;
    // Só quando o número muda: reescrever o botão a cada imagem impedia-o de ficar estável para ser tocado.
    if (resume && resume.textContent !== label) resume.textContent = label;
  } else if (timeoutHandled) {
    timeoutHandled = false;
    holdTouched = false;
    if (subsOpen) {
      subsOpen = false;
      subPick = null;
      showMatch();
    }
  }
  if (started && !paused && !finished && stage === 'match') audio.ambience(now);
  flushLive(now);
  const courtLabel = stage === 'match' && current ? `Jogo: ${current.s.teams[0].short} ${current.s.score[0]} – ${current.s.score[1]} ${current.s.teams[1].short}, ${periodName(current.s.period)}, ${clockText(current.s.clock)}` : stage === 'town' ? 'Mapa da cidade' : 'Pocket Basketball';
  if (canvas.getAttribute('aria-label') !== courtLabel) canvas.setAttribute('aria-label', courtLabel);
  if (current && !banner.hidden && current.s.tick >= bannerUntil) banner.hidden = true;
  if (current && !drop.hidden && current.s.tick >= dropUntil) drop.hidden = true;
  const start = performance.now();
  hudElement.hidden = stage !== 'match' || replay !== undefined;
  if (replay) {
    replayAccumulator += Math.min(0.5, rawElapsed) * REPLAY_SPEED * TICKS_PER_SECOND;
    while (replayAccumulator >= 1 && replay.s.tick < replayUntil && replay.s.phase !== 'end') {
      replay.stepSim();
      replayAccumulator -= 1;
    }
    if (replay.s.tick >= replayUntil || replay.s.phase === 'end') endReplay();
    else replay.render(Math.min(1, replayAccumulator), elapsed * REPLAY_SPEED);
  } else if (demo.frame(elapsed)) {
    // A demonstração do título já se desenhou.
  } else if ((stage === 'town' || stage === 'title' || stage === 'menu') && now - lastStillDraw < STILL_FRAME_MS) {
    // A cidade e as cenas dos menus mexem-se devagar: 30 imagens por segundo chegam, e poupam a bateria.
  } else if (stage === 'town' || stage === 'title') {
    lastStillDraw = now;
    // A cidade passeia sempre uma equipa, mesmo antes de haver clube.
    const walkers = club ?? townExtras;
    const kit = activeKit(walkers);
    const game = club ? currentGame(club) : null;
    const looks = [...walkers.team.roster.slice(0, 4).map(p => ({ ...lookOf(p, 'blue'), custom: kit })), lookOf({ ...walkers.team.roster[5]!, name: 'Vizinha' }, 'cream'), lookOf({ ...walkers.team.roster[6]!, name: 'Vizinho' }, 'coach')];
    drawTown(context, canvas.width, canvas.height, walkers.division, looks, townClock ?? now, {
      jersey: kit.jersey,
      trim: kit.trim,
      // O aviso do jogo está no cimo do mapa, com os emblemas; o cartaz do pavilhão fica só com a arte.
      poster: '',
      festive: club !== null && club.week <= 2 && (club.history.at(-1)?.outcome === 'champion' || (club.history.at(-1)?.cups.length ?? 0) > 0),
    }, weatherFor(club?.week ?? 1));
  } else if (stage === 'menu') {
    lastStillDraw = now;
    menuFrame(now);
  } else if (current) {
    // Em pausa pára tudo, o treinador e o público incluídos; nos descontos e no intervalo, com a simulação parada, continuam a mexer-se.
    current.render(Math.min(1, accumulator), simSeconds, paused ? 0 : elapsed);
    hud.update(current, club!.emblem);
  }
  renderMs += performance.now() - start;
  renderCount++;
  if (started && !finished && now - lastPanelUpdate > 250) {
    lastPanelUpdate = now;
    refreshContent();
  }
}

initMenus({
  top: topUi,
  panel,
  club: () => club!,
  setClub: updated => {
    club = updated;
    applyClubColors();
    saveClub();
  },
  topSize: layout.topSize,
  tallTop: panelNeed => {
    if (menuPanel === panelNeed) return;
    menuPanel = panelNeed;
    fit();
  },
  match: () => view,
  showMenus: () => setStage('menu'),
  toTown: showClub,
  kickOff: startGame,
  secondHalf,
  halfSubs: showHalfSubs,
  newClub: showNewClub,
  sound: name => audio.play(name),
  music: theme => audio.music(theme),
});
addEventListener('resize', fit);
// No telemóvel, a área visível muda sem aviso de 'resize' quando o teclado abre ou fecha; e ao sair de um campo de texto
// volta-se a medir depois de o teclado ter fechado.
// Com zoom de dois dedos a área visível também muda, mas aí não se volta a medir: o jogo encolhia para caber no bocado ampliado.
window.visualViewport?.addEventListener('resize', () => { if (window.visualViewport!.scale < 1.01) fit(); });
addEventListener('focusout', () => window.setTimeout(fit, 400));
fit();
// O clube de ensaio começa já na primeira jornada, a não ser que a morada diga a semana.
club = testSeed !== null ? { ...newClub(testSeed, testDivision), week: paramInt('semana') ?? PRESEASON_WEEKS + 1 } : readClub(saveStatus);
// Com semente na morada, a verificação automática entra logo na cidade; o título vê-se no fluxo sem clube.
if (club && testSeed !== null) showClub();
else showNewClub();
requestAnimationFrame(now => {
  lastFrame = now;
  frame(now);
});

// Usado pela verificação automática no browser (npm run browser-check).
Object.assign(window, {
  __pocket: {
    /** A vista do jogo, para as verificações desenharem casos difíceis (nomes com acentos, balões, palavras). */
    matchView: () => view,
    hashFor: (s: number, d: number) => {
      const c = { ...newClub(s, d), week: PRESEASON_WEEKS + 1 };
      return matchHash(simulateMatch(clubTeam(c), opponentOf(c), weekSeed(c), [true, false], visitorOf(c)));
    },
    club: () => club,
    found: () => [...found],
    /** Onde está cada edifício, para a verificação lhe poder tocar. */
    townBox: (place: TownPlace) => townBoxes(canvas.width, canvas.height, club!.division)[place],
    /** Para a cidade num instante, para a verificação a poder fotografar. */
    setTownClock: (value: number | null) => {
      townClock = value;
    },
    /** Joga semanas sem as mostrar, para a verificação chegar depressa ao fim da época. */
    fastForward: (weeks: number) => {
      for (let i = 0; i < weeks && club && !club.seasonReport && !club.fired; i++) {
        if (currentFixture(club)) {
          const c = club;
          club = finishMatch(c, simulateMatch(clubTeam(c), opponentOf(c), weekSeed(c), [true, false], visitorOf(c)), []).club;
        } else {
          club = skipWeek(club);
        }
      }
      saveClub();
      saveClub();
      showClub();
    },
    /** Para a verificação não depender da sorte da época. */
    setConfidence: (value: number) => {
      club = { ...club!, confidence: value };
      saveClub();
    },
    fire: () => {
      club = { ...club!, fired: true };
      saveClub();
      showClub();
    },
    /** Quanto demora a simular os outros 4 jogos de uma jornada. */
    timeOtherGames: () => {
      const c = club!;
      const start = performance.now();
      for (let i = 0; i < 4; i++) simulateMatch(opponentOf(c), opponentOf({ ...c, week: c.week + 1 }), i + 1);
      return performance.now() - start;
    },
    /** O jogo que está a decorrer, reproduzido só com a semente, as equipas e as decisões do treinador. */
    replayMatchesCurrent: () => {
      const { s } = view!;
      return matchHash(replayMatch(s.teams[0], s.teams[1], s.seed, s.controlled, s.commands, s.visitor)) === matchHash(s);
    },
    soundsPlayed: () => [...soundsPlayed],
    /** Toca todos os sons, para confirmar que nenhum dá erro. */
    playAllSounds: () => {
      audio.unlock();
      for (const name of ['swish', 'rim', 'whistle', 'buzzer', 'shotClockBuzzer', 'horn', 'bounce', 'catch', 'steal', 'block', 'cheer', 'bigCheer', 'card', 'bump'] as const) audio.play(name);
      for (let v = 0; v <= CLOSED_GYM; v++) {
        audio.setVenue(v);
        for (let i = 0; i < 30; i++) audio.ambience(1e12 + (v * 30 + i) * 1e6);
      }
      for (const theme of MUSIC_THEMES) audio.music(theme);
      audio.music('none');
    },
    onCourtNames: () => view!.s.court[0].map(b => b.player.name),
    frontBackFlips: () => {
      const { s } = view!;
      const { changes, shortestTicks } = view!.backChangeStats();
      return { perPlayerMinute: changes / 10 / (s.tick / 20 / 60), shortestSeconds: shortestTicks / 20 };
    },
    /** O título que o próximo jogo dá, para ver a cerimónia sem jogar uma época inteira. */
    forceTitle: (title: Title | null) => {
      forcedTitle = title;
    },
    state: () => ({
      ceremony: ceremonyOn && !finished,
      phase: view?.s.phase ?? 'none',
      puffs: view?.puffCount() ?? 0,
      commands: view?.s.commands.map(c => `${c.kind}@${c.tick}`) ?? [],
      sprinters: view ? [...view.s.court[0], ...view.s.court[1]].filter(b => isSprinting(view!.s, b)).length : 0,
      tick: view?.s.tick ?? 0,
      period: view?.s.period ?? 0,
      score: view?.s.score ?? [0, 0],
      started,
      finished,
      announced: [...announced],
      canvas: { width: canvas.width, height: canvas.height },
      replay: replay ? { tick: replay.s.tick, until: replayUntil, phase: replay.s.phase } : null,
      demo: demo.tick(),
      ball: view ? { ...view.s.ball } : null,
      tactics: view ? { ...view.s.tactics[0] } : null,
    }),
    setSpeedRaw: (value: number) => {
      speed = value;
    },
    /** Pausa o jogo no momento pedido, para a verificação poder fotografá-lo. */
    tuneCamera: (t: { cy?: number; cz?: number; lookY?: number; focal?: number }) => view?.tuneCamera(t),
    pauseAt: (eventType: string, extraTicks: number, maxDistance = Infinity, move?: string) => {
      paused = true;
      const current = view!;
      const { s } = current;
      let seen = s.events.length;
      while (s.phase !== 'end') {
        current.stepSim();
        const found = eventType === `fase:${s.phase}` || s.events.slice(seen).some(e => e.type === eventType && (e.distance ?? 0) <= maxDistance && (move === undefined || e.move === move));
        seen = s.events.length;
        if (found) break;
      }
      for (let i = 0; i < extraTicks && s.phase !== 'end'; i++) current.stepSim();
      current.snapCamera();
      return { phase: s.phase, found: s.phase !== 'end' };
    },
    resetRenderStats: () => {
      renderMs = 0;
      renderCount = 0;
    },
    /** Avança até o portador driblar em corrida e devolve as poses que usou. */
    runningDribblePoses: () => {
      paused = true;
      const current = view!;
      const poses = new Set<string>();
      for (let i = 0; i < 2000 && poses.size < 4 && current.s.phase !== 'end'; i++) {
        current.stepSim();
        const carrier = current.carrierPose();
        if (carrier?.moving) poses.add(carrier.pose);
      }
      return [...poses];
    },
    renderStats: () => ({ meanMs: renderCount ? renderMs / renderCount : 0, frames: renderCount }),
  },
});

initTouch();
initKeys(game);

document.addEventListener('visibilitychange', () => audio.setHidden(document.visibilityState === 'hidden'));

initPwa();
