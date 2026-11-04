/// <reference types="vite/client" />
import { matchHash } from '../sim/hash.ts';
import { cancelSubstitution, isSprinting, queueSubstitution, reorderBench, replayMatch, requestTimeout, setAutoRotation, setTactics, simulateMatch, type Body, type MatchState } from '../sim/match.ts';
import { makeRng, type Rng } from '../sim/rng.ts';
import { DIVISIONS } from '../sim/teamgen.ts';
import { CARDS, MAX_CARDS_PER_MATCH, cardFromEvent, type CardId } from '../sim/training.ts';
import type { Tactics } from '../sim/types.ts';
import { cardImage } from './art/cards.ts';
import { CLOSED_GYM } from './art/court.ts';
import { emblemImage, isLight } from './art/kit.ts';
import { lookOf } from './art/sprites.ts';
import { drawTown, townBoxes, townHit, townPlaces, weatherFor, type TownPlace } from './art/town.ts';
import { GameAudio } from './audio.ts';
import { tacticValue, tacticsControls } from './club-screens.ts';
import { PLAYER_CLUB, activeKit, aiTeam, careerOf, clubColor, clubTeam, currentFixture, currentGame, finishMatch, forecast, liveOtherGames, rivalTeam, finishPractice, firstHalfOver, newClub, opponentOf, parseClub, skipWeek, visitorOf, weekSeed, type ClubState, type SeasonRecord } from './club.ts';
import { closeMenus, initMenus, menuFrame, menusOpen, menusResized, openArena, openCreate, openHalf, openMenu, openOffers, openRenewals, rivalKitFor, showTopNote, type GameKind } from './menus.ts';
import { PRESEASON_WEEKS } from '../sim/league.ts';
import { clubIdentity, kitAgainst } from './art/identity.ts';
import { keepAwake } from './awake.ts';
import { AIRPORT_NOTE, TOWER_NOTE, careerTopStats, firedHtml, matchLeagueSummary, officialLabel, seasonReportHtml, seasonTopStats, townOverlay } from './season-screens.ts';
import { MatchView, type Sound } from './match-view.ts';
import { clockText } from './narrate.ts';
import { BALL_SIZE, drawBall } from './art/ball.ts';
import { decisiveTick, escapeHtml, introScreen, panelContent, playerCard, playerCardLive, resultScreen, slotCode, subsPanel, type LiveLeague, type PanelTab, optionsControls, pickOption } from './panel.ts';
import { assistantResult, say, secretaryFarewell } from './staff.ts';
import { portraitImage } from './art/portrait.ts';

const TICKS_PER_SECOND = 20;
const MAX_STEPS_PER_FRAME = 40;
// A ×4 só se calam os sons muito repetidos. Apitos e buzzers continuam, porque dizem o que aconteceu.
const QUIET_AT_SPEED: readonly Sound[] = ['bounce', 'bump'];
const LANDSCAPE_MIN_RATIO = 1.2;
const LANDSCAPE_PANEL_WIDTH = 360;
// Altura máxima da arte no computador: quanto menor, mais gordos os píxeis.
const LANDSCAPE_ART_HEIGHT = 290;
// A cidade tem mais detalhe do que o campo, por isso usa píxeis mais pequenos.
const LANDSCAPE_TOWN_HEIGHT = 360;
// O que fica por baixo do mapa, no telemóvel: a secretária, o próximo jogo e dois botões.
// Os menus têm uma ficha ou uma cena por cima, e essas precisam de mais altura do que o campo.
const MENU_STAGE_WIDTH = 360;
const MENU_STAGE_HEIGHT = 270;
// Quanto o painel do ecrã aberto precisa, na vertical, quando ele pede a parte de cima mais alta (0 é o normal).
let menuPanel = 0;
// O que o painel do título precisa, na vertical: o logótipo, os botões e a frase.
const TITLE_PANEL_HEIGHT = 300;
const MATCH_STAGE_HEIGHT = 216;
const SAVE_KEY = 'pocket-basketball-clube';
const DROP_TICKS = 50;

const element = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const game = element<HTMLDivElement>('game');
const screen_ = element<HTMLDivElement>('screen');
const canvas = element<HTMLCanvasElement>('court');
const panel = element<HTMLDivElement>('panel');
const banner = element<HTMLDivElement>('banner');
const hud = element<HTMLDivElement>('hud');
const context = canvas.getContext('2d')!;

const audio = new GameAudio();
const params = new URLSearchParams(location.search);
const paramInt = (name: string): number | null => {
  const value = Number(params.get(name));
  return params.has(name) && Number.isInteger(value) ? value : null;
};

const testSeed = paramInt('semente');
// Só para a verificação automática poder ver os outros pavilhões. Um clube a sério começa sempre na última divisão.
const testDivision = Math.max(0, Math.min(DIVISIONS.length - 1, paramInt('divisao') ?? 0));
let club: ClubState | null = null;
// A cidade, a cidade sem etiquetas do ecrã de criar clube, os menus e o jogo em si.
let stage: 'town' | 'title' | 'menu' | 'match' = 'title';
// Na horizontal, o resultado do jogo abre numa janela ao centro, com o campo a ocupar o ecrã todo por trás.
let resultOpen = false;
let townClock: number | null = null;
let topSize: readonly [number, number] = [MENU_STAGE_WIDTH, MENU_STAGE_HEIGHT];
let gameKind: GameKind = 'official';
let rivalOf = 0;
let halfShown = false;
let halfSubsOpen = false;
let saveFailed = false;
let saveUnreadable = false;
let view: MatchView | undefined;
let dropRng: Rng = makeRng(0);
let found: CardId[] = [];
let dropUntil = 0;
let speed = 1;
let paused = false;
let pauseRequested = false;
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
let hudText = '';
let pointerDown = false;
let cardBody: Body | null = null;
let subsOpen = false;
// Os outros jogos da jornada, simulados ao começar o nosso, para a aba da liga.
let liveLeague: LiveLeague | null = null;
let subPick: number | null = null;
let tacticsOpen = false;
let timeoutHandled = false;
// A opção de ataque que se está a escolher no painel de táticas do jogo.
let optionPicking: number | null = null;
// Num desconto ou ao intervalo, sem ninguém tocar em nada durante 30 s, o jogo continua sozinho.
const IDLE_RESUME_MS = 30_000;
let idleTimer = 0;
let idleResume: (() => void) | null = null;
function resumeAfterIdle(resume: () => void): void {
  clearTimeout(idleTimer);
  idleResume = resume;
  idleTimer = window.setTimeout(() => {
    idleResume = null;
    resume();
  }, IDLE_RESUME_MS);
}
function clearIdle(): void {
  clearTimeout(idleTimer);
  idleResume = null;
}
// A apresentação antes do jogo, a cena do fim, e a repetição do lance decisivo.
let introTimer = 0;
let endAt = 0;
let resultHtml = '';
let replay: MatchView | undefined;
// O jogo de demonstração do ecrã de título, quando ninguém toca durante uns segundos.
let demo: MatchView | undefined;
let demoTimer = 0;
let demoAccumulator = 0;
const DEMO_AFTER_MS = 8000;
let replayUntil = 0;
let replayAccumulator = 0;
const REPLAY_SPEED = 0.5;
const townExtras = newClub(1);
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
  if (testSeed !== null) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(club));
    saveFailed = false;
  } catch {
    saveFailed = true;
  }
}

function loadClub(): ClubState | null {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    const loaded = parseClub(text);
    saveUnreadable = text !== null && loaded === null;
    return loaded;
  } catch {
    saveFailed = true;
    return null;
  }
}

function setCanvasSize(width: number, height: number, cssWidth: number, cssHeight: number): void {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    view?.resize();
    demo?.resize();
  }
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  context.imageSmoothingEnabled = false;
}

/** Na vertical, os dois ecrãs empilham-se. Na horizontal, o campo fica ao lado do painel. */
// A altura da janela sem o teclado do telemóvel. Enquanto se escreve num campo de texto, o teclado tira metade da altura:
// medir aí encolhia o jogo todo, e ficava encolhido depois de o teclado fechar, porque nem sempre vem um aviso de mudança.
let stableHeight = innerHeight;
let stableWidth = innerWidth;
const typing = (): boolean => document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
function windowHeight(): number {
  // Rodar o telemóvel muda a largura: aí a altura guardada já não vale, mesmo com o teclado aberto.
  if (!typing() || innerWidth !== stableWidth) {
    stableHeight = innerHeight;
    stableWidth = innerWidth;
  }
  return Math.max(innerHeight, stableHeight);
}

function fit(): void {
  const viewHeight = windowHeight();
  const dpr = devicePixelRatio || 1;
  const landscape = innerWidth / viewHeight >= LANDSCAPE_MIN_RATIO;
  game.classList.toggle('landscape', landscape);
  // O resultado do jogo: na horizontal numa janela larga ao centro, na vertical no ecrã todo, sem o campo.
  game.classList.toggle('result-open', resultOpen && stage === 'match');
  const centred = landscape && resultOpen && stage === 'match';
  if (landscape) {
    // O painel cresce com a janela, em quartos: numa janela larga de computador fica maior e legível, sem passar de perto de um terço da largura.
    const ui = viewHeight < 600 ? Math.max(0.7, viewHeight / 600) : Math.max(1, Math.min(Math.floor((innerWidth * 4) / 1000) / 4, Math.floor((viewHeight * 4) / 540) / 4));
    // Na cidade não há painel: o mapa é o menu e ocupa a janela toda.
    const panelWidth = stage === 'town' || centred ? 0 : LANDSCAPE_PANEL_WIDTH * ui;
    const stageWidth = innerWidth - panelWidth;
    // A escala é um múltiplo inteiro de píxeis do ecrã, para a arte ficar sempre nítida.
    // No jogo, o campo tem a altura lógica da vertical e pelo menos a mesma largura: a câmara e os bonecos ficam iguais.
    const scale = stage === 'town' || stage === 'title'
      ? Math.max(1, Math.floor((viewHeight * dpr) / LANDSCAPE_TOWN_HEIGHT)) / dpr
      : stage === 'match'
        ? Math.max(1, Math.floor(Math.min(stageWidth / MENU_STAGE_WIDTH, viewHeight / MATCH_STAGE_HEIGHT) * dpr)) / dpr
        : Math.ceil((viewHeight * dpr) / LANDSCAPE_ART_HEIGHT) / dpr;
    const width = Math.ceil(stageWidth / scale);
    const height = stage === 'match' ? MATCH_STAGE_HEIGHT : Math.ceil(viewHeight / scale);
    setCanvasSize(width, height, width * scale, height * scale);
    // O marcador e as etiquetas ficam sobre o campo, não sobre as barras.
    const bar = Math.max(0, (viewHeight - height * scale) / 2);
    canvas.style.marginTop = `${bar}px`;
    hud.style.top = `${bar}px`;
    hud.style.bottom = `${bar}px`;
    game.style.zoom = '';
    game.style.height = '';
    game.style.width = '';
    screen_.style.width = `${stageWidth}px`;
    screen_.style.height = `${viewHeight}px`;
    panel.style.zoom = String(ui);
    panel.style.width = `${centred ? Math.min((innerWidth * 0.9) / ui, LANDSCAPE_PANEL_WIDTH * 1.8) : LANDSCAPE_PANEL_WIDTH}px`;
    panel.style.height = centred ? '' : `${viewHeight / ui}px`;
    panel.style.maxHeight = centred ? `${(viewHeight * 0.94) / ui}px` : '';
    screen_.style.setProperty('--hud-zoom', String(ui));
    const topZoom = Math.max(1, Math.floor(Math.min(stageWidth / MENU_STAGE_WIDTH, viewHeight / MENU_STAGE_HEIGHT) * dpr) / dpr);
    setTopSize(Math.floor(stageWidth / topZoom), Math.floor(viewHeight / topZoom), topZoom);
  } else {
    const available = Math.min(innerWidth / 360, viewHeight / 640);
    const scale = Math.max(1, Math.floor(available * dpr)) / dpr;
    const finalScale = Math.min(scale, Math.max(available, 0.5));
    const gameHeight = Math.max(640, viewHeight / finalScale);
    // No menu principal, a cidade fica com o ecrã quase todo, como no estudo visual.
    const menuHeight = menuPanel > 0 ? Math.max(MENU_STAGE_HEIGHT, Math.floor(gameHeight - menuPanel)) : MENU_STAGE_HEIGHT;
    // No título, a cidade fica com o que o logótipo e os botões não usam.
    const titleHeight = Math.max(MATCH_STAGE_HEIGHT, Math.floor(gameHeight - TITLE_PANEL_HEIGHT));
    const stageHeight = stage === 'town' ? Math.floor(gameHeight) : stage === 'menu' ? menuHeight : stage === 'title' ? titleHeight : MATCH_STAGE_HEIGHT;
    // A cidade estica até às bordas: a escala fica inteira, mas o mapa ganha a largura que sobrava dos lados.
    const gameWidth = stage === 'town' ? Math.max(360, Math.floor(innerWidth / finalScale)) : 360;
    setCanvasSize(gameWidth, stageHeight, gameWidth, stageHeight);
    canvas.style.marginTop = '';
    hud.style.top = '';
    hud.style.bottom = '';
    game.style.zoom = String(finalScale);
    game.style.height = `${gameHeight}px`;
    game.style.width = gameWidth === 360 ? '' : `${gameWidth}px`;
    screen_.style.width = `${gameWidth}px`;
    screen_.style.height = `${stageHeight}px`;
    panel.style.zoom = '';
    panel.style.width = '';
    panel.style.height = '';
    panel.style.maxHeight = '';
    screen_.style.setProperty('--hud-zoom', '1');
    setTopSize(MENU_STAGE_WIDTH, stageHeight, 1);
  }
  if (stage === 'town' && club) placeTownUi();
}

function setTopSize(width: number, height: number, zoom: number): void {
  topUi.style.width = `${width}px`;
  topUi.style.height = `${height}px`;
  screen_.style.setProperty('--top-zoom', String(zoom));
  if (topSize[0] === width && topSize[1] === height) return;
  topSize = [width, height];
  menusResized();
}

/** Muda de modo e volta a medir: a cidade, os menus e o campo usam tamanhos diferentes. */
function setStage(next: typeof stage): void {
  stage = next;
  // Durante o jogo o ecrã do telemóvel não se apaga; nos menus e na cidade, volta ao normal.
  keepAwake(next === 'match');
  resultOpen = false;
  if (next !== 'match' && next !== 'menu') clearIdle();
  if (next !== 'title') {
    clearTimeout(demoTimer);
    demo = undefined;
  }
  if (next === 'town' || next === 'title') audio.music('town');
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

/** Guarda o clube num ficheiro. No telemóvel abre a folha de partilha, para o ficheiro poder ir para Ficheiros ou para outro aparelho. */
function exportClub(): void {
  const current = club!;
  const name = `pocket-basketball-${current.team.short.replace(/[^\w-]/g, '') || 'clube'}-epoca-${current.season}.json`;
  const file = new File([JSON.stringify(current)], name, { type: 'application/json' });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file] }).catch(() => {});
    return;
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/** Lê um clube de um ficheiro exportado. Passa pelas mesmas verificações e conversões que o clube guardado. */
function importClub(): void {
  // No iPad, o ficheiro escolhido só chega ao jogo se o campo estiver na página. Sem filtro de tipo, porque o iOS
  // às vezes deixa os .json a cinzento; o parseClub recusa o que não for um clube.
  document.getElementById('importFile')?.remove();
  const input = document.createElement('input');
  input.type = 'file';
  input.id = 'importFile';
  input.hidden = true;
  document.body.append(input);
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    const loaded = parseClub(await file.text().catch(() => null));
    if (!loaded) {
      alert('Este ficheiro não tem um clube que o jogo consiga ler.');
      return;
    }
    const question = club
      ? `Substituir ${club.team.name}, época ${club.season}, por ${loaded.team.name}, época ${loaded.season}? O clube atual perde-se, a não ser que o tenhas exportado.`
      : saveUnreadable ? `O clube guardado que não se consegue ler vai ser substituído por ${loaded.team.name}. Continuar?` : null;
    if (question && !confirm(question)) return;
    club = loaded;
    saveUnreadable = false;
    saveClub();
    applyClubColors();
    showClub();
  });
  input.click();
}

function placeTownUi(): void {
  const current = club!;
  townUi.innerHTML = townOverlay(current, townPlaces(canvas.width, canvas.height), saveFailed);
  const note = (text: string): void => {
    const box = document.querySelector('#staffNote .t');
    if (box) box.textContent = text;
  };
  element('arenaChip').addEventListener('click', openArena);
  element('towerChip').addEventListener('click', () => {
    note(saveFailed ? 'Este browser não deixa guardar: o clube perde-se ao fechar a página. Exporta-o para não o perderes.' : TOWER_NOTE);
    if (document.getElementById('exportBtn')) return;
    document.querySelector('.town-note')!.insertAdjacentHTML('beforeend', '<div class="tower-actions"><button type="button" class="quiet" id="exportBtn">Exportar clube</button><button type="button" class="quiet" id="importBtn">Importar clube</button></div>');
    element('exportBtn').addEventListener('click', exportClub);
    element('importBtn').addEventListener('click', importClub);
  });
  element('airportChip').addEventListener('click', () => note(AIRPORT_NOTE));
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
}

/** As cores da interface seguem o equipamento escolhido. */
function applyClubColors(): void {
  const { jersey } = activeKit(club!);
  game.style.setProperty('--home', jersey);
  game.style.setProperty('--home-ink', isLight(jersey) ? '#1b2230' : '#ffffff');
}

function makeView(kind: GameKind, rivalId: number): void {
  const current = club!;
  const seed = weekSeed(current);
  liveLeague = kind === 'official' ? { club: current, others: liveOtherGames(current) } : null;
  dropRng = makeRng(seed ^ 0x3c1a77);
  found = [];
  drop.hidden = true;
  // Um jogo-treino é à porta fechada, por isso joga-se num pavilhão sem público.
  const rival = rivalTeam(current, rivalId);
  view = new MatchView(context, clubTeam(current), rival, seed, kind === 'practice' ? CLOSED_GYM : current.division, {
    announce,
    event: e => {
      // A vista já recebe o início do jogo ao ser criada, antes de o jogo começar a sério.
      const card = started && found.length < MAX_CARDS_PER_MATCH ? cardFromEvent(e, 0, dropRng) : null;
      if (card) showDrop(card);
    },
    sound: name => {
      soundsPlayed.add(name);
      if (started && !(speed > 2 && QUIET_AT_SPEED.includes(name))) audio.play(name);
    },
  }, [true, false], kind === 'official' ? visitorOf(current) : 1, activeKit(current), undefined, venueColor(kind, rivalId), current.confidence / 100, rivalKitFor(current, rival.name, activeKit(current)), kind === 'official' && visitorOf(current) === 0 ? clubIdentity(rival.name).emblem : current.emblem, current.emblem);
  accumulator = 0;
  finished = false;
  cardBody = null;
  subsOpen = false;
  subPick = null;
  tacticsOpen = false;
  timeoutHandled = false;
  audio.setVenue(kind === 'practice' ? 0 : current.division);
  banner.hidden = true;
  hudText = '';
  endAt = 0;
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
    ${saveUnreadable ? '<p class="hint warn">Não foi possível ler o clube guardado. Ele só é substituído se criares um novo.</p>' : ''}
    ${club ? `<button type="button" class="primary" id="continueBtn">Continuar · ${escapeHtml(club.team.short)}</button>` : ''}
    <button type="button" class="${club ? 'quiet' : 'primary'}" id="newClubBtn">Criar clube</button>
    <button type="button" class="quiet" id="importBtn">Importar clube</button>
    <p class="hint">${club ? `Época ${club.season}, semana ${club.week}.` : `Começas na ${DIVISIONS[0]!.name}. Treinas a equipa entre jogos, e os jogos correm sozinhos.`}</p>
  </div>`;
  document.getElementById('continueBtn')?.addEventListener('click', () => {
    audio.unlock();
    showClub();
  });
  clearTimeout(demoTimer);
  demoTimer = window.setTimeout(startDemo, DEMO_AFTER_MS);
  element('importBtn').addEventListener('click', importClub);
  element('newClubBtn').addEventListener('click', () => {
    audio.unlock();
    // Os troféus são do treinador, por isso acompanham-no para o clube novo.
    club = newClub(newSeed(), 0, club ? careerOf(club) : []);
    saveUnreadable = false;
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

/** Sem ninguém a tocar, o título mostra um jogo entre dois clubes da divisão de cima, como uma máquina de arcada. */
function startDemo(): void {
  if (stage !== 'title') return;
  const source = club ?? townExtras;
  const top = source.divisions[DIVISIONS.length - 1]!;
  const seed = Math.floor(Date.now() / 1000) & 0x7fffffff;
  const home = source.clubs[top[seed % top.length]!]!;
  const away = source.clubs[top[(seed + 1) % top.length]!]!;
  const quiet = { announce: () => {}, event: () => {}, sound: () => {} };
  const homeKit = clubIdentity(home.name).kits[0];
  demo = new MatchView(context, aiTeam(home), aiTeam(away), seed, DIVISIONS.length - 1, quiet, [false, false], 1, homeKit, undefined, clubColor(home), 0.7, kitAgainst(away.name, homeKit), clubIdentity(home.name).emblem);
  demo.snapCamera();
  demoAccumulator = 0;
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
  showTopNote(`Fim da época ${current.seasonReport!.season}`, escapeHtml(current.team.short), `${festive ? '<canvas id="confetti" class="confetti" width="115" height="75"></canvas>' : clubBadge(current)}${seasonTopStats(current.seasonReport!)}`);
  audio.music(festive ? 'win' : current.seasonReport!.outcome === 'relegated' ? 'loss' : 'town');
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
  showTopNote('Despedido', `${Math.round(club!.confidence)}%`, `${clubBadge(club!)}${careerTopStats(club!)}<div class="quote">Os troféus ganhos vão contigo para o próximo clube.</div>`);
  panel.innerHTML = firedHtml(club!);
  element('firedNewClub').addEventListener('click', showNewClub);
}

function matchControls(): string {
  return `<div class="tabs" role="tablist">
      <button type="button" role="tab" data-tab="bench" aria-selected="${tab === 'bench'}">Banco</button>
      <button type="button" role="tab" data-tab="stats" aria-selected="${tab === 'stats'}">Stats</button>
      <button type="button" role="tab" data-tab="league" aria-selected="${tab === 'league'}">Liga</button>
      <button type="button" role="tab" data-tab="feed" aria-selected="${tab === 'feed'}">Relato</button>
      <button type="button" role="tab" data-tab="cards" aria-selected="${tab === 'cards'}">Cartas</button>
    </div>
    <div id="tabContent" class="content"></div>
    <div class="controls">
      <button type="button" id="pauseBtn" aria-pressed="${paused || pauseRequested}">${paused ? 'Continuar' : pauseRequested ? 'A parar…' : 'Pausa'}</button>
      <button type="button" id="muteBtn" aria-pressed="${audio.muted}">${audio.muted ? 'Sem som' : 'Som'}</button>
      <div class="coach">
        <button type="button" id="timeoutBtn">Desconto</button>
        <button type="button" id="subsBtn" aria-pressed="${subsOpen}">Trocas</button>
        <button type="button" id="matchTacticsBtn" aria-pressed="${tacticsOpen}">Táticas</button>
      </div>
    </div>`;
}

function bindControls(): void {
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
  element('muteBtn').addEventListener('click', () => {
    audio.setMuted(!audio.muted);
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
    content.innerHTML = subsPanel(view!, subPick, view!.s.phase === 'timeout');
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
  timeoutButton.textContent = s.pendingTimeout[0] ? 'Desconto pedido' : `Desconto (${s.timeoutsLeft[0]})`;
  timeoutButton.disabled = s.pendingTimeout[0] || s.timeoutsLeft[0] <= 0 || s.timeoutTeam === 0;
}

function closeSubs(): void {
  subsOpen = false;
  subPick = null;
  if (halfSubsOpen) {
    halfSubsOpen = false;
    openHalf(gameKind, rivalOf);
    return;
  }
  // Se estava num desconto, o jogo só continua quando o jogador quiser.
  if (paused && view!.s.phase === 'timeout') paused = false;
  clearIdle();
  showMatch();
}

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
    const options = target.dataset.optionSet !== undefined ? pickOption(club!.tactics.options ?? [], optionPicking ?? 0, target.dataset.optionSet) : [];
    optionPicking = null;
    const tactics: Tactics = { ...club!.tactics, options };
    club = { ...club!, tactics };
    saveClub();
    setTactics(view!.s, 0, tactics);
    refreshContent();
    return;
  }
  if (target.dataset.tactic !== undefined) {
    const tactics: Tactics = { ...club!.tactics, [target.dataset.tactic]: tacticValue(target.dataset.tactic, target.dataset.tacticValue!) };
    club = { ...club!, tactics };
    saveClub();
    setTactics(view!.s, 0, tactics);
    refreshContent();
    return;
  }
  const { s } = view!;
  if (target.id === 'timeoutBtn') {
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
    // Tocar em quem já tem troca marcada desmarca-a. Senão, o primeiro toque escolhe e o segundo troca os dois:
    // campo com banco é uma substituição, campo com campo troca de lugar, banco com banco troca a ordem de entrada.
    const pending = s.pendingSubs.find(sub => sub.team === 0 && (sub.incoming === body || s.court[0][sub.slot] === body));
    if (pending) {
      cancelSubstitution(s, 0, pending.slot);
      subPick = null;
    } else if (subPick === null) {
      subPick = index;
    } else if (subPick === index) {
      subPick = null;
    } else {
      const other = s.bodies[subPick]!;
      if (body.slot >= 0) queueSubstitution(s, 0, body.slot, subPick);
      else if (other.slot >= 0) queueSubstitution(s, 0, other.slot, index);
      else reorderBench(s, 0, subPick, index);
      subPick = null;
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
  const label = gameKind === 'official' ? officialLabel(current) : gameKind === 'practice' ? 'Jogo-treino' : 'Particular';
  panel.innerHTML = introScreen(view!, label);
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
  }, s.controlled, s.visitor, activeKit(club!), state, venueColor(gameKind, rivalOf), club!.confidence / 100, rivalKitFor(club!, s.teams[1].name, activeKit(club!)), s.visitor === 0 ? clubIdentity(s.teams[1].name).emblem : club!.emblem, club!.emblem);
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
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
  resumeAfterIdle(secondHalf);
}

function secondHalf(): void {
  const current = view!;
  clearIdle();
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
  const result = gameKind === 'practice' ? finishPractice(club!, view!.s, found) : finishMatch(club!, view!.s, found);
  club = result.club;
  saveClub();
  const { score } = view!.s;
  audio.music(score[0] > score[1] ? 'win' : 'loss');
  resultHtml = resultScreen(view!, result.cards, `${say('assistant', ...assistantResult(score[0] > score[1], score[0] - score[1], gameKind === 'practice'))}${matchLeagueSummary(result, gameKind === 'practice')}`);
  showResultPanel();
}

/** O marcador é HTML: a letra fica nítida a qualquer tamanho e só muda quando algo muda. */
function updateHud(): void {
  const { s } = view!;
  const carrier = view!.carrier();
  const period = s.period <= 4 ? `P${s.period}` : 'PR';
  const shotClock = s.phase === 'live' || s.phase === 'pass' ? Math.max(0, Math.ceil(s.shotClock / TICKS_PER_SECOND)) : null;
  const carrierName = carrier ? carrier.player.name : '';
  const carrierPos = carrier ? slotCode(carrier.slot) : '';
  const next = [s.score[0], s.score[1], period, clockText(s.clock), shotClock, carrierName, carrier?.team, s.teams[0].short, s.teams[1].short].join('|');
  if (next === hudText) return;
  hudText = next;
  const urgent = shotClock !== null && shotClock <= 3;
  hud.innerHTML = `<div class="scorebug">
      <span class="side team-0"><img class="emblem" alt="" style="width:14px;height:14px" src="${emblemImage(club!.emblem)}">${escapeHtml(s.teams[0].short)}</span>
      <b class="points">${s.score[0]}</b>
      <span class="time"><small>${period}</small>${clockText(s.clock)}</span>
      <b class="points">${s.score[1]}</b>
      <span class="side team-1">${escapeHtml(s.teams[1].short)}<img class="emblem" alt="" style="width:14px;height:14px" src="${emblemImage(clubIdentity(s.teams[1].name).emblem)}"></span>
      <span class="shot-clock${urgent ? ' urgent' : ''}">${shotClock ?? '-'}</span>
    </div>
    ${carrier ? `<div class="carrier team-${carrier.team}"><i></i><span>${carrierPos}</span><b>${escapeHtml(carrierName)}</b></div>` : ''}`;
}

function frame(now: number): void {
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
      } else if (now - endAt > 2500) showResult();
    } else if (current.s.phase === 'break') {
      const message = current.s.period >= 4 ? 'Prolongamento!' : `Fim do período ${current.s.period}`;
      if (banner.textContent !== message || banner.hidden) announce(message);
    }
  }
  // Em qualquer desconto, a equipa junta-se ao banco e depois o jogo espera pelo jogador, com as trocas abertas.
  if (current?.s.phase === 'timeout' && current.s.timer <= TICKS_PER_SECOND) {
    if (!timeoutHandled) {
      timeoutHandled = true;
      paused = true;
      subsOpen = true;
      subPick = null;
      cardBody = null;
      showMatch();
      resumeAfterIdle(closeSubs);
    }
  } else {
    timeoutHandled = false;
  }
  if (started && !paused && !finished && stage === 'match') audio.ambience(now);
  if (current && !banner.hidden && current.s.tick >= bannerUntil) banner.hidden = true;
  if (current && !drop.hidden && current.s.tick >= dropUntil) drop.hidden = true;
  const start = performance.now();
  hud.hidden = stage !== 'match' || replay !== undefined;
  if (replay) {
    replayAccumulator += Math.min(0.5, rawElapsed) * REPLAY_SPEED * TICKS_PER_SECOND;
    while (replayAccumulator >= 1 && replay.s.tick < replayUntil && replay.s.phase !== 'end') {
      replay.stepSim();
      replayAccumulator -= 1;
    }
    if (replay.s.tick >= replayUntil || replay.s.phase === 'end') endReplay();
    else replay.render(Math.min(1, replayAccumulator), elapsed * REPLAY_SPEED);
  } else if (demo) {
    demoAccumulator += elapsed * TICKS_PER_SECOND;
    while (demoAccumulator >= 1 && demo.s.phase !== 'end') {
      demo.stepSim();
      demoAccumulator -= 1;
    }
    if (demo.s.phase === 'end') startDemo();
    else demo.render(Math.min(1, demoAccumulator), elapsed);
  } else if (stage === 'town' || stage === 'title') {
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
    menuFrame(now);
  } else if (current) {
    // Em pausa pára tudo, o treinador e o público incluídos; nos descontos e no intervalo, com a simulação parada, continuam a mexer-se.
    current.render(Math.min(1, accumulator), simSeconds, paused ? 0 : elapsed);
    updateHud();
  }
  renderMs += performance.now() - start;
  renderCount++;
  if (started && !finished && now - lastPanelUpdate > 250) {
    lastPanelUpdate = now;
    refreshContent();
  }
  requestAnimationFrame(frame);
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
  topSize: () => topSize,
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
});
addEventListener('resize', fit);
// No telemóvel, a área visível muda sem aviso de 'resize' quando o teclado abre ou fecha; e ao sair de um campo de texto
// volta-se a medir depois de o teclado ter fechado.
window.visualViewport?.addEventListener('resize', fit);
addEventListener('focusout', () => window.setTimeout(fit, 400));
fit();
// O clube de ensaio começa já na primeira jornada, a não ser que a morada diga a semana.
club = testSeed !== null ? { ...newClub(testSeed, testDivision), week: paramInt('semana') ?? PRESEASON_WEEKS + 1 } : loadClub();
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
      for (const name of ['swish', 'rim', 'whistle', 'buzzer', 'shotClockBuzzer', 'horn', 'bounce', 'steal', 'block', 'cheer', 'bigCheer', 'card', 'bump'] as const) audio.play(name);
      for (let i = 0; i < 30; i++) audio.ambience(1e12 + i * 1e6);
    },
    onCourtNames: () => view!.s.court[0].map(b => b.player.name),
    frontBackFlips: () => {
      const { s } = view!;
      const { changes, shortestTicks } = view!.backChangeStats();
      return { perPlayerMinute: changes / 10 / (s.tick / 20 / 60), shortestSeconds: shortestTicks / 20 };
    },
    state: () => ({
      phase: view?.s.phase ?? 'none',
      puffs: view?.puffCount() ?? 0,
      sprinters: view ? [...view.s.court[0], ...view.s.court[1]].filter(b => isSprinting(view!.s, b)).length : 0,
      tick: view?.s.tick ?? 0,
      period: view?.s.period ?? 0,
      score: view?.s.score ?? [0, 0],
      started,
      finished,
      announced: [...announced],
      canvas: { width: canvas.width, height: canvas.height },
      replay: replay ? { tick: replay.s.tick, until: replayUntil, phase: replay.s.phase } : null,
      demo: demo ? demo.s.tick : null,
      ball: view ? { ...view.s.ball } : null,
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

// Num tablet, segurar o dedo numa imagem abria o menu do sistema. Aqui segura-se para ler o que é.
const tip = document.createElement('div');
tip.id = 'tip';
tip.hidden = true;
document.body.append(tip);
let tipTimer = 0;
const hideTip = (): void => {
  clearTimeout(tipTimer);
  tip.hidden = true;
};
// O Safari do iPhone e do iPad ignora o user-scalable: os gestos de zoom têm de ser travados aqui.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, event => event.preventDefault(), { passive: false });
document.addEventListener('touchmove', event => {
  if (event.touches.length > 1) event.preventDefault();
}, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', event => {
  // Dois toques seguidos não fazem zoom; o segundo toque continua a contar como clique.
  const now = Date.now();
  if (now - lastTouchEnd < 300 && (event.target as HTMLElement).closest('button, canvas, a') === null) event.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
document.addEventListener('contextmenu', event => {
  if ((event.target as HTMLElement).closest('img, canvas, button, .face, .stars')) event.preventDefault();
});
document.addEventListener('pointerdown', event => {
  if (idleResume) resumeAfterIdle(idleResume);
  const target = (event.target as HTMLElement).closest<HTMLElement>('[title], img[alt], [aria-label]');
  hideTip();
  if (!target) return;
  const label = target.getAttribute('title') || target.getAttribute('aria-label') || (target as HTMLImageElement).alt;
  if (!label) return;
  tipTimer = window.setTimeout(() => {
    tip.textContent = label;
    tip.hidden = false;
    const box = target.getBoundingClientRect();
    tip.style.left = `${Math.max(4, Math.min(window.innerWidth - tip.offsetWidth - 4, box.left + box.width / 2 - tip.offsetWidth / 2))}px`;
    tip.style.top = `${Math.max(4, box.top - tip.offsetHeight - 6)}px`;
  }, 450);
});
for (const type of ['pointerup', 'pointercancel', 'scroll'] as const) document.addEventListener(type, hideTip, true);

// Modo offline: só no jogo publicado, porque no `npm run dev` a cache atrapalhava.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(async () => {
    // O que a página já carregou antes do service worker existir também tem de ficar guardado.
    const cache = await caches.open('pocket-basketball');
    const urls = [location.href.split('?')[0]!, ...performance.getEntriesByType('resource').map(entry => entry.name)];
    await Promise.all(urls.map(url => fetch(url, { mode: 'no-cors' }).then(response => cache.put(url, response)).catch(() => {})));
  }).catch(() => {});
}

// Ao voltar à app, que o iPad muitas vezes só retoma sem recarregar, vê se o jogo publicado mudou.
// Não recarrega sozinho, para não cortar um jogo a meio: mostra um botão.
if (import.meta.env.PROD) {
  const running = document.querySelector('script[type="module"][src]')?.getAttribute('src');
  const checkForUpdate = async (): Promise<void> => {
    if (!running || !navigator.onLine || document.getElementById('updateBtn')) return;
    const html = await fetch(location.pathname, { cache: 'no-cache' }).then(response => (response.ok ? response.text() : '')).catch(() => '');
    const published = html.match(/<script type="module"[^>]*src="([^"]+)"/)?.[1];
    if (!published || published === running) return;
    document.body.insertAdjacentHTML('beforeend', '<button type="button" class="primary update-ready" id="updateBtn">Há uma versão nova · Atualizar</button>');
    element('updateBtn').addEventListener('click', () => location.reload());
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate();
  });
}
