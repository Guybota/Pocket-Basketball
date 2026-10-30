import { matchHash } from '../sim/hash.ts';
import { simulateMatch } from '../sim/match.ts';
import { DIVISIONS } from '../sim/teamgen.ts';
import { THEMES } from './art/court.ts';
import { GameAudio } from './audio.ts';
import { MatchView, type Sound } from './match-view.ts';
import { escapeHtml, panelContent, resultScreen, type PanelTab } from './panel.ts';
import { matchTeams } from './setup.ts';

const TICKS_PER_SECOND = 20;
const MAX_STEPS_PER_FRAME = 40;
const SPEEDS = [1, 2, 4];
const QUIET_AT_SPEED: readonly Sound[] = ['bounce', 'whistle'];

const element = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const game = element<HTMLDivElement>('game');
const canvas = element<HTMLCanvasElement>('court');
const panel = element<HTMLDivElement>('panel');
const banner = element<HTMLDivElement>('banner');
const context = canvas.getContext('2d')!;
context.imageSmoothingEnabled = false;

const audio = new GameAudio();
const params = new URLSearchParams(location.search);
const paramInt = (name: string): number | null => {
  const value = Number(params.get(name));
  return params.has(name) && Number.isInteger(value) ? value : null;
};

let division = Math.max(0, Math.min(DIVISIONS.length - 1, paramInt('divisao') ?? 2));
let view: MatchView;
let seed = 0;
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
const announced = new Set<string>();

/** Escala por múltiplos inteiros de píxeis do ecrã, para a pixel art ficar sempre nítida. */
function fit(): void {
  const dpr = devicePixelRatio || 1;
  const available = Math.min(innerWidth / 360, innerHeight / 640);
  const scale = Math.max(1, Math.floor(available * dpr)) / dpr;
  const finalScale = Math.min(scale, Math.max(available, 0.5));
  game.style.zoom = String(finalScale);
  game.style.height = `${Math.max(640, innerHeight / finalScale)}px`;
}

function announce(message: string): void {
  announced.add(message);
  banner.textContent = message;
  banner.hidden = false;
  bannerUntil = view.s.tick + 36;
}

function makeView(): void {
  const [home, away] = matchTeams(seed, division);
  view = new MatchView(context, home, away, seed, division, {
    announce,
    event: () => {},
    sound: name => {
      if (started && !(speed > 2 && QUIET_AT_SPEED.includes(name))) audio.play(name);
    },
  });
  accumulator = 0;
  finished = false;
  banner.hidden = true;
}

function newSeed(): number {
  return (Date.now() ^ (performance.now() * 1000)) & 0x7fffffff;
}

function showStart(): void {
  started = false;
  paused = false;
  makeView();
  const [home, away] = [view.s.teams[0], view.s.teams[1]];
  panel.innerHTML = `<div class="start">
    <h1>Pocket Basketball</h1>
    <p class="vs">${escapeHtml(home.name)} <span>contra</span> ${escapeHtml(away.name)}</p>
    <div class="choice" role="group" aria-label="Divisão">
      ${DIVISIONS.map((d, i) => `<button type="button" data-division="${i}" aria-pressed="${i === division}"><b>${d.name}</b><span>${THEMES[i]!.note}</span></button>`).join('')}
    </div>
    <button type="button" class="primary" id="startBtn">Começar jogo</button>
    <p class="hint">O jogo tem 4 períodos de 2 minutos e corre sozinho.</p>
  </div>`;
  panel.querySelectorAll<HTMLButtonElement>('[data-division]').forEach(button => {
    button.addEventListener('click', () => {
      division = Number(button.dataset.division);
      showStart();
    });
  });
  element('startBtn').addEventListener('click', startMatch);
}

function matchControls(): string {
  const speedButtons = SPEEDS.map(value => `<button type="button" data-speed="${value}" aria-pressed="${value === speed}">×${value}</button>`).join('');
  return `<div class="tabs" role="tablist">
      <button type="button" role="tab" data-tab="bench" aria-selected="${tab === 'bench'}">Banco</button>
      <button type="button" role="tab" data-tab="stats" aria-selected="${tab === 'stats'}">Stats</button>
      <button type="button" role="tab" data-tab="feed" aria-selected="${tab === 'feed'}">Relato</button>
    </div>
    <div id="tabContent" class="content"></div>
    <div class="controls">
      <div class="speeds" role="group" aria-label="Velocidade">${speedButtons}</div>
      <button type="button" id="pauseBtn" aria-pressed="${paused}">${paused ? 'Continuar' : 'Pausa'}</button>
      <button type="button" id="muteBtn" aria-pressed="${audio.muted}">${audio.muted ? 'Sem som' : 'Som'}</button>
    </div>`;
}

function bindControls(): void {
  panel.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button => {
    button.addEventListener('click', () => {
      tab = button.dataset.tab as PanelTab;
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
    audio.setCrowd(!paused);
    showMatch();
  });
  element('muteBtn').addEventListener('click', () => {
    audio.muted = !audio.muted;
    audio.setCrowd(!audio.muted && !paused);
    showMatch();
  });
}

function refreshContent(): void {
  const content = document.getElementById('tabContent');
  if (content) content.innerHTML = panelContent(view, tab);
}

function showMatch(): void {
  panel.innerHTML = matchControls();
  bindControls();
  refreshContent();
}

function startMatch(): void {
  audio.unlock();
  audio.setCrowd(true);
  started = true;
  showMatch();
}

function showResult(): void {
  finished = true;
  audio.setCrowd(false);
  panel.innerHTML = `${resultScreen(view)}
    <div class="end-actions">
      <button type="button" class="primary" id="againBtn">Novo jogo</button>
    </div>`;
  element('againBtn').addEventListener('click', () => {
    seed = newSeed();
    showStart();
  });
}

function frame(now: number): void {
  const elapsed = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  let simSeconds = 0;
  if (started && !paused && !finished) {
    simSeconds = elapsed * speed;
    accumulator += simSeconds * TICKS_PER_SECOND;
    let steps = 0;
    while (accumulator >= 1 && steps < MAX_STEPS_PER_FRAME) {
      view.stepSim();
      accumulator -= 1;
      steps++;
    }
    if (view.s.phase === 'end') {
      showResult();
    } else if (view.s.phase === 'break') {
      const message = view.s.period === 2 ? 'Intervalo' : view.s.period >= 4 ? 'Prolongamento!' : `Fim do período ${view.s.period}`;
      if (banner.textContent !== message || banner.hidden) announce(message);
    }
  }
  if (!banner.hidden && view.s.tick >= bannerUntil) banner.hidden = true;
  const start = performance.now();
  view.render(Math.min(1, accumulator), simSeconds);
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
seed = paramInt('semente') ?? newSeed();
showStart();
requestAnimationFrame(now => {
  lastFrame = now;
  frame(now);
});

// Usado pela verificação automática no browser (npm run browser-check).
Object.assign(window, {
  __pocket: {
    hashFor: (s: number, d: number) => matchHash(simulateMatch(...matchTeams(s, d), s)),
    state: () => ({
      phase: view.s.phase,
      tick: view.s.tick,
      period: view.s.period,
      score: view.s.score,
      lookTheme: THEMES[division]!.name,
      started,
      finished,
      announced: [...announced],
    }),
    setSpeedRaw: (value: number) => {
      speed = value;
    },
    /** Pausa o jogo no momento pedido, para a verificação poder fotografá-lo. */
    pauseAt: (eventType: string, extraTicks: number, maxDistance = Infinity) => {
      paused = true;
      const { s } = view;
      let seen = s.events.length;
      while (s.phase !== 'end') {
        view.stepSim();
        const found = eventType === `fase:${s.phase}` || s.events.slice(seen).some(e => e.type === eventType && (e.distance ?? 0) <= maxDistance);
        seen = s.events.length;
        if (found) break;
      }
      for (let i = 0; i < extraTicks && s.phase !== 'end'; i++) view.stepSim();
      view.snapCamera();
      return { phase: s.phase, found: s.phase !== 'end' };
    },
    resetRenderStats: () => {
      renderMs = 0;
      renderCount = 0;
    },
    renderStats: () => ({ meanMs: renderCount ? renderMs / renderCount : 0, frames: renderCount }),
  },
});
