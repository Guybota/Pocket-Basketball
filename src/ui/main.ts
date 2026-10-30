import { matchHash } from '../sim/hash.ts';
import { cancelSubstitution, queueSubstitution, replayMatch, requestTimeout, setAutoRotation, setTactics, simulateMatch, type Body } from '../sim/match.ts';
import { makeRng, type Rng } from '../sim/rng.ts';
import { DIVISIONS, teamRating } from '../sim/teamgen.ts';
import { CARDS, MAX_CARDS_PER_MATCH, cardFromEvent, type CardId } from '../sim/training.ts';
import { gradeOf, type Tactics } from '../sim/types.ts';
import { cardImage } from './art/cards.ts';
import { THEMES } from './art/court.ts';
import { GameAudio } from './audio.ts';
import { openTraining, tacticsControls } from './club-screens.ts';
import { clubTeam, finishMatch, newClub, opponentOf, parseClub, totalCards, weekSeed, type ClubState } from './club.ts';
import { MatchView, type Sound } from './match-view.ts';
import { clockText } from './narrate.ts';
import { crest, escapeHtml, panelContent, playerCard, playerCardLive, resultScreen, subsPanel, type PanelTab } from './panel.ts';

const TICKS_PER_SECOND = 20;
const MAX_STEPS_PER_FRAME = 40;
const SPEEDS = [1, 2, 4];
// A ×4 só se calam os sons muito repetidos. Apitos e buzzers continuam, porque dizem o que aconteceu.
const QUIET_AT_SPEED: readonly Sound[] = ['bounce'];
const LANDSCAPE_MIN_RATIO = 1.2;
const LANDSCAPE_PANEL_WIDTH = 320;
// Altura máxima da arte no computador: quanto menor, mais gordos os píxeis.
const LANDSCAPE_ART_HEIGHT = 290;
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
// A divisão escolhida para o próximo clube. A do clube atual está no clube.
let division = Math.max(0, Math.min(DIVISIONS.length - 1, paramInt('divisao') ?? 0));
let club: ClubState | null = null;
let saveFailed = false;
let saveUnreadable = false;
let view: MatchView | undefined;
let dropRng: Rng = makeRng(0);
let found: CardId[] = [];
let dropUntil = 0;
let speed = 1;
let paused = false;
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
let subOut: number | null = null;
let tacticsOpen = false;
let timeoutHandled = false;
const soundsPlayed = new Set<Sound>();
const announced = new Set<string>();

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
  }
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  context.imageSmoothingEnabled = false;
}

/** Na vertical, os dois ecrãs empilham-se. Na horizontal, o campo fica ao lado do painel. */
function fit(): void {
  const dpr = devicePixelRatio || 1;
  const landscape = innerWidth / innerHeight >= LANDSCAPE_MIN_RATIO;
  game.classList.toggle('landscape', landscape);
  if (landscape) {
    const ui = innerHeight < 600 ? Math.max(0.7, innerHeight / 600) : Math.max(1, Math.floor((innerHeight * 2) / 720) / 2);
    const panelWidth = LANDSCAPE_PANEL_WIDTH * ui;
    const stageWidth = innerWidth - panelWidth;
    // A escala é um múltiplo inteiro de píxeis do ecrã, para a arte ficar sempre nítida.
    const scale = Math.ceil((innerHeight * dpr) / LANDSCAPE_ART_HEIGHT) / dpr;
    const width = Math.ceil(stageWidth / scale);
    const height = Math.ceil(innerHeight / scale);
    setCanvasSize(width, height, width * scale, height * scale);
    game.style.zoom = '';
    game.style.height = '';
    screen_.style.width = `${stageWidth}px`;
    screen_.style.height = `${innerHeight}px`;
    panel.style.zoom = String(ui);
    panel.style.width = `${LANDSCAPE_PANEL_WIDTH}px`;
    panel.style.height = `${innerHeight / ui}px`;
    screen_.style.setProperty('--hud-zoom', String(ui));
  } else {
    const available = Math.min(innerWidth / 360, innerHeight / 640);
    const scale = Math.max(1, Math.floor(available * dpr)) / dpr;
    const finalScale = Math.min(scale, Math.max(available, 0.5));
    setCanvasSize(360, 216, 360, 216);
    game.style.zoom = String(finalScale);
    game.style.height = `${Math.max(640, innerHeight / finalScale)}px`;
    screen_.style.width = '360px';
    screen_.style.height = '216px';
    panel.style.zoom = '';
    panel.style.width = '';
    panel.style.height = '';
    screen_.style.setProperty('--hud-zoom', '1');
  }
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

function makeView(): void {
  const current = club!;
  const seed = weekSeed(current);
  dropRng = makeRng(seed ^ 0x3c1a77);
  found = [];
  drop.hidden = true;
  view = new MatchView(context, clubTeam(current), opponentOf(current), seed, current.division, {
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
  });
  accumulator = 0;
  finished = false;
  cardBody = null;
  subsOpen = false;
  subOut = null;
  tacticsOpen = false;
  timeoutHandled = false;
  audio.setVenue(current.division);
  banner.hidden = true;
  hudText = '';
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
  c.width = 9;
  c.height = 9;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1b2230';
  g.fillRect(2, 0, 5, 9);
  g.fillRect(0, 2, 9, 5);
  g.fillRect(1, 1, 7, 7);
  g.fillStyle = '#e8622a';
  g.fillRect(2, 1, 5, 7);
  g.fillRect(1, 2, 7, 5);
  g.fillStyle = '#a93f14';
  g.fillRect(4, 1, 1, 7);
  g.fillRect(1, 4, 7, 1);
  g.fillStyle = '#ffb27a';
  g.fillRect(2, 2, 1, 1);
  return c.toDataURL();
};

/** Sem clube guardado, começa-se por escolher onde jogar. */
function showNewClub(): void {
  panel.innerHTML = `<div class="start">
    <h1><img src="${ballLogo()}" alt=""><span>Pocket<br>Basketball</span></h1>
    ${saveUnreadable ? '<p class="hint warn">Não foi possível ler o clube guardado. Ele só é substituído se criares um novo.</p>' : ''}
    <div class="choice" role="group" aria-label="Divisão">
      ${DIVISIONS.map((d, i) => `<button type="button" data-division="${i}" aria-pressed="${i === division}"><i style="background:${THEMES[i]!.swatch}"></i><b>${d.name}</b><span>${THEMES[i]!.note}</span></button>`).join('')}
    </div>
    <button type="button" class="primary" id="newClubBtn">Criar clube</button>
    ${club ? '<button type="button" class="quiet" id="newClubBack">Voltar ao meu clube</button>' : ''}
    <p class="hint">Treinas a equipa entre jogos. Os jogos correm sozinhos.</p>
  </div>`;
  document.getElementById('newClubBack')?.addEventListener('click', showClub);
  panel.querySelectorAll<HTMLButtonElement>('[data-division]').forEach(button => {
    button.addEventListener('click', () => {
      division = Number(button.dataset.division);
      showNewClub();
    });
  });
  element('newClubBtn').addEventListener('click', () => {
    audio.unlock();
    club = newClub(newSeed(), division);
    saveUnreadable = false;
    saveClub();
    showClub();
  });
}

function showClub(): void {
  started = false;
  paused = false;
  makeView();
  const current = club!;
  const { s } = view!;
  const card = (team: 0 | 1): string => `<div class="team-card">
    ${crest(s, team)}
    <b>${escapeHtml(s.teams[team].name)}</b>
    <span>Nível ${gradeOf(teamRating(s.teams[team]))}</span>
  </div>`;
  const cards = totalCards(current);
  panel.innerHTML = `<div class="start">
    <div class="club-week"><b>Semana ${current.week}</b><span>${DIVISIONS[current.division]!.name} · ${current.wins} V · ${current.losses} D</span></div>
    <div class="versus">${card(0)}<span class="vs">contra</span>${card(1)}</div>
    <div class="club-menu">
      <button type="button" id="trainBtn" ${current.trainedThisWeek || cards === 0 ? 'disabled' : ''}>${current.trainedThisWeek ? 'Treino feito' : `Treino (${cards} ${cards === 1 ? 'carta' : 'cartas'})`}</button>
      <button type="button" id="tacticsBtn">Táticas</button>
    </div>
    <button type="button" class="primary" id="startBtn">Jogar</button>
    <p class="hint">${saveFailed ? 'Este browser não deixa guardar: o clube perde-se ao fechar a página.' : 'O jogo tem 4 períodos de 2 minutos e corre sozinho.'}</p>
    <button type="button" class="quiet" id="resetBtn">Novo clube</button>
  </div>`;
  element('startBtn').addEventListener('click', startMatch);
  element('tacticsBtn').addEventListener('click', showTactics);
  element('trainBtn').addEventListener('click', () => {
    audio.unlock();
    openTraining({
      panel,
      club: () => club!,
      setClub: updated => {
        club = updated;
        saveClub();
      },
      back: showClub,
      sound: name => audio.play(name),
    });
  });
  element('resetBtn').addEventListener('click', showResetConfirm);
}

/** Apagar um clube não se desfaz, por isso pergunta-se sempre. */
function showResetConfirm(): void {
  const { team, week } = club!;
  panel.innerHTML = `<div class="start">
    <div class="club-week"><b>Começar de novo?</b><span>Perdes o ${escapeHtml(team.name)}, na semana ${week}, assim que criares o novo clube.</span></div>
    <button type="button" class="primary" id="resetNo">Ficar com este clube</button>
    <button type="button" id="resetYes">Escolher novo clube</button>
  </div>`;
  element('resetNo').addEventListener('click', showClub);
  element('resetYes').addEventListener('click', showNewClub);
}

function showTactics(): void {
  panel.innerHTML = `<div class="train">
    <div class="train-title"><b>Táticas</b><span>${escapeHtml(club!.team.name)}</span></div>
    <div class="content">${tacticsControls(club!.tactics)}</div>
    <div class="train-actions"><button type="button" class="primary" id="tacticsBack">Voltar</button></div>
  </div>`;
  element('tacticsBack').addEventListener('click', showClub);
}

function matchControls(): string {
  const speedButtons = SPEEDS.map(value => `<button type="button" data-speed="${value}" aria-pressed="${value === speed}">×${value}</button>`).join('');
  return `<div class="tabs" role="tablist">
      <button type="button" role="tab" data-tab="bench" aria-selected="${tab === 'bench'}">Banco</button>
      <button type="button" role="tab" data-tab="stats" aria-selected="${tab === 'stats'}">Stats</button>
      <button type="button" role="tab" data-tab="feed" aria-selected="${tab === 'feed'}">Relato</button>
      <button type="button" role="tab" data-tab="cards" aria-selected="${tab === 'cards'}">Cartas</button>
    </div>
    <div id="tabContent" class="content"></div>
    <div class="controls">
      <div class="speeds" role="group" aria-label="Velocidade">${speedButtons}</div>
      <button type="button" id="pauseBtn" aria-pressed="${paused}">${paused ? 'Continuar' : 'Pausa'}</button>
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
  panel.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(button => {
    button.addEventListener('click', () => {
      speed = Number(button.dataset.speed);
      showMatch();
    });
  });
  element('pauseBtn').addEventListener('click', () => {
    paused = !paused;
    showMatch();
  });
  element('muteBtn').addEventListener('click', () => {
    audio.muted = !audio.muted;
    showMatch();
  });
}

function refreshContent(): void {
  const content = document.getElementById('tabContent');
  // Não mexer no painel durante um toque, senão o botão desaparece antes de o clique acabar.
  if (!content || pointerDown) return;
  updateCoachButtons();
  if (tacticsOpen) {
    content.innerHTML = `${tacticsControls(view!.s.tactics[0])}<button type="button" class="primary" id="matchTacticsClose">Fechar</button>`;
    return;
  }
  if (subsOpen) {
    content.innerHTML = subsPanel(view!, subOut, view!.s.timeoutTeam === 0);
    return;
  }
  if (cardBody) {
    const card = content.querySelector<HTMLElement>('.card');
    const live = document.getElementById('cardLive');
    if (card && live && card.dataset.cardBody === String(view!.s.bodies.indexOf(cardBody))) {
      live.innerHTML = playerCardLive(cardBody);
    } else {
      content.innerHTML = playerCard(view!, cardBody);
    }
    return;
  }
  const focusedPlayer = document.activeElement instanceof HTMLElement && content.contains(document.activeElement) ? document.activeElement.dataset.player : undefined;
  content.innerHTML = panelContent(view!, tab, found);
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
  subOut = null;
  // Se estava num desconto nosso, o jogo só continua quando o jogador quiser.
  if (paused && view!.s.timeoutTeam === 0) paused = false;
  showMatch();
}

panel.addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-player], [data-card], [data-sub-out], [data-sub-in], [data-sub-cancel], [data-rotation], [data-subs-close], [data-tactic], #timeoutBtn, #subsBtn, #matchTacticsBtn, #matchTacticsClose');
  if (!target || (target as HTMLButtonElement).disabled) return;
  pointerDown = false;
  if (target.dataset.tactic !== undefined) {
    const tactics: Tactics = { ...club!.tactics, [target.dataset.tactic]: Number(target.dataset.tacticValue) };
    club = { ...club!, tactics };
    saveClub();
    if (started) {
      setTactics(view!.s, 0, tactics);
      refreshContent();
    } else {
      showTactics();
    }
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
    subOut = null;
    cardBody = null;
    refreshContent();
    if (!subsOpen) showMatch();
    return;
  }
  if (target.dataset.subOut !== undefined) {
    subOut = Number(target.dataset.subOut);
    refreshContent();
    return;
  }
  if (target.dataset.subIn !== undefined) {
    if (subOut !== null) queueSubstitution(s, 0, subOut, Number(target.dataset.subIn));
    subOut = null;
    refreshContent();
    return;
  }
  if (target.dataset.subCancel !== undefined) {
    cancelSubstitution(s, 0, Number(target.dataset.subCancel));
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

function startMatch(): void {
  audio.unlock();
  started = true;
  showMatch();
}

function showResult(): void {
  finished = true;
  const result = finishMatch(club!, view!.s, found);
  club = result.club;
  saveClub();
  panel.innerHTML = `${resultScreen(view!, result.cards)}
    <div class="end-actions">
      <button type="button" class="primary" id="againBtn">Continuar</button>
    </div>`;
  element('againBtn').addEventListener('click', showClub);
}

/** O marcador é HTML: a letra fica nítida a qualquer tamanho e só muda quando algo muda. */
function updateHud(): void {
  const { s } = view!;
  const carrier = view!.carrier();
  const period = s.period <= 4 ? `P${s.period}` : 'PR';
  const shotClock = s.phase === 'live' || s.phase === 'pass' ? Math.max(0, Math.ceil(s.shotClock / TICKS_PER_SECOND)) : null;
  const carrierName = carrier ? carrier.player.name : '';
  const carrierPos = carrier ? carrier.player.position : '';
  const next = [s.score[0], s.score[1], period, clockText(s.clock), shotClock, carrierName, carrier?.team, s.teams[0].short, s.teams[1].short].join('|');
  if (next === hudText) return;
  hudText = next;
  const urgent = shotClock !== null && shotClock <= 3;
  hud.innerHTML = `<div class="scorebug">
      <span class="side team-0"><i></i>${escapeHtml(s.teams[0].short)}</span>
      <b class="points">${s.score[0]}</b>
      <span class="time"><small>${period}</small>${clockText(s.clock)}</span>
      <b class="points">${s.score[1]}</b>
      <span class="side team-1">${escapeHtml(s.teams[1].short)}<i></i></span>
      <span class="shot-clock${urgent ? ' urgent' : ''}">${shotClock ?? '-'}</span>
    </div>
    ${carrier ? `<div class="carrier team-${carrier.team}"><i></i><span>${carrierPos}</span><b>${escapeHtml(carrierName)}</b></div>` : ''}`;
}

function frame(now: number): void {
  const elapsed = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  let simSeconds = 0;
  const current = view!;
  if (started && !paused && !finished) {
    simSeconds = elapsed * speed;
    accumulator += simSeconds * TICKS_PER_SECOND;
    let steps = 0;
    while (accumulator >= 1 && steps < MAX_STEPS_PER_FRAME) {
      current.stepSim();
      accumulator -= 1;
      steps++;
    }
    if (current.s.phase === 'end') {
      showResult();
    } else if (current.s.phase === 'break') {
      const message = current.s.period === 2 ? 'Intervalo' : current.s.period >= 4 ? 'Prolongamento!' : `Fim do período ${current.s.period}`;
      if (banner.textContent !== message || banner.hidden) announce(message);
    }
  }
  // No nosso desconto, o jogo espera pelo jogador e abre logo as trocas.
  if (current.s.phase === 'timeout' && current.s.timeoutTeam === 0) {
    if (!timeoutHandled) {
      timeoutHandled = true;
      paused = true;
      subsOpen = true;
      subOut = null;
      cardBody = null;
      showMatch();
    }
  } else {
    timeoutHandled = false;
  }
  if (started && !paused && !finished) audio.ambience(now);
  if (!banner.hidden && current.s.tick >= bannerUntil) banner.hidden = true;
  if (!drop.hidden && current.s.tick >= dropUntil) drop.hidden = true;
  const start = performance.now();
  current.render(Math.min(1, accumulator), simSeconds);
  updateHud();
  renderMs += performance.now() - start;
  renderCount++;
  if (started && !finished && now - lastPanelUpdate > 250) {
    lastPanelUpdate = now;
    refreshContent();
  }
  requestAnimationFrame(frame);
}

addEventListener('resize', fit);
fit();
club = testSeed !== null ? newClub(testSeed, division) : loadClub();
if (club) {
  showClub();
} else {
  // Atrás do ecrã de escolha já se vê um pavilhão.
  club = newClub(newSeed(), division);
  makeView();
  club = null;
  showNewClub();
}
requestAnimationFrame(now => {
  lastFrame = now;
  frame(now);
});

// Usado pela verificação automática no browser (npm run browser-check).
Object.assign(window, {
  __pocket: {
    hashFor: (s: number, d: number) => {
      const c = newClub(s, d);
      return matchHash(simulateMatch(clubTeam(c), opponentOf(c), weekSeed(c), [true, false]));
    },
    club: () => club,
    found: () => [...found],
    /** O jogo que está a decorrer, reproduzido só com a semente, as equipas e as decisões do treinador. */
    replayMatchesCurrent: () => {
      const { s } = view!;
      return matchHash(replayMatch(s.teams[0], s.teams[1], s.seed, s.controlled, s.commands)) === matchHash(s);
    },
    soundsPlayed: () => [...soundsPlayed],
    /** Toca todos os sons, para confirmar que nenhum dá erro. */
    playAllSounds: () => {
      audio.unlock();
      for (const name of ['swish', 'rim', 'whistle', 'buzzer', 'shotClockBuzzer', 'horn', 'bounce', 'steal', 'block', 'cheer', 'bigCheer', 'card'] as const) audio.play(name);
      for (let i = 0; i < 30; i++) audio.ambience(1e12 + i * 1e6);
    },
    onCourtNames: () => view!.s.court[0].map(b => b.player.name),
    frontBackFlips: () => {
      const { s } = view!;
      const { changes, shortestTicks } = view!.backChangeStats();
      return { perPlayerMinute: changes / 10 / (s.tick / 20 / 60), shortestSeconds: shortestTicks / 20 };
    },
    state: () => ({
      phase: view!.s.phase,
      tick: view!.s.tick,
      period: view!.s.period,
      score: view!.s.score,
      started,
      finished,
      announced: [...announced],
      canvas: { width: canvas.width, height: canvas.height },
    }),
    setSpeedRaw: (value: number) => {
      speed = value;
    },
    /** Pausa o jogo no momento pedido, para a verificação poder fotografá-lo. */
    pauseAt: (eventType: string, extraTicks: number, maxDistance = Infinity) => {
      paused = true;
      const current = view!;
      const { s } = current;
      let seen = s.events.length;
      while (s.phase !== 'end') {
        current.stepSim();
        const found = eventType === `fase:${s.phase}` || s.events.slice(seen).some(e => e.type === eventType && (e.distance ?? 0) <= maxDistance);
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
