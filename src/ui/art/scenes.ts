// O que se vê no ecrã de cima antes do jogo e no intervalo: o balneário, o pavilhão fechado e o quadro de táticas.
import type { Player, Tactics, Team } from '../../sim/types.ts';
import { fillPolygon } from './court.ts';
import { text } from './font.ts';
import { kitKey, shadeOf, type ClubKit } from './kit.ts';
import { INK, drawBall, drawShadow, drawSprite, lookOf, type Look, type PoseName } from './sprites.ts';

function projector(ox: number, oy: number, th: number): (i: number, j: number, k?: number) => [number, number] {
  return (i, j, k = 0) => [ox + (i - j) * th * 2, oy + (i + j) * th - k * th * 2];
}

export type SceneKind = 'lockerPre' | 'lockerHalf' | 'gym';

function iso(g: CanvasRenderingContext2D, H: number, W: number) {
  const P = projector(W / 2 - 6, 18 + Math.max(0, H - 270) / 2, 6);
  const poly = (pts: [number, number][], color: string): void => fillPolygon(g, pts, color);
  return {
    P,
    poly,
    flat: (i: number, j: number, a: number, b: number, color: string, k = 0): void => poly([P(i, j, k), P(i + a, j, k), P(i + a, j + b, k), P(i, j + b, k)], color),
    box: (i: number, j: number, a: number, b: number, h: number, top: string, left: string, right: string): void => {
      poly([P(i, j + b), P(i + a, j + b), P(i + a, j + b, h), P(i, j + b, h)], left);
      poly([P(i + a, j), P(i + a, j + b), P(i + a, j + b, h), P(i + a, j, h)], right);
      poly([P(i, j, h), P(i + a, j, h), P(i + a, j + b, h), P(i, j + b, h)], top);
    },
    // Um retângulo deitado numa das duas faces que se veem: j fixo ou i fixo.
    onJ: (i: number, j: number, w: number, k: number, h: number, color: string): void => poly([P(i, j, k), P(i + w, j, k), P(i + w, j, k + h), P(i, j, k + h)], color),
    onI: (i: number, j: number, w: number, k: number, h: number, color: string): void => poly([P(i, j, k), P(i, j + w, k), P(i, j + w, k + h), P(i, j, k + h)], color),
    disc: (ci: number, cj: number, r: number, color: string, k = 0): void => {
      const pts: [number, number][] = [];
      for (let n = 0; n < 20; n++) pts.push(P(ci + Math.cos((n / 20) * Math.PI * 2) * r, cj + Math.sin((n / 20) * Math.PI * 2) * r, k));
      poly(pts, color);
    },
  };
}

/** A sala em si: paredes, chão, duche e os cacifos encostados à parede. Nada disto tapa ninguém. */
function paintLocker(g: CanvasRenderingContext2D, W: number, H: number, kit: ClubKit): void {
  const { flat, box, onJ, onI, disc } = iso(g, H, W);
  const shade = shadeOf(kit.jersey);
  g.fillStyle = '#1b262c';
  g.fillRect(0, 0, W, H);
  const size = 46;
  onJ(0, 0, size, 0, 7, '#c3cdc9');
  onI(0, 0, size, 0, 7, '#a7b3b1');
  for (let k = 0.5; k < 7; k += 0.75) {
    onJ(0, 0, size, k, 0.05, '#aebab6');
    onI(0, 0, size, k, 0.05, '#93a09e');
  }
  for (let n = 1; n < size; n += 1.5) {
    onJ(n, 0, 0.05, 0, 7, '#aebab6');
    onI(0, n, 0.05, 0, 7, '#93a09e');
  }
  onJ(0, 0, size, 5.9, 0.5, kit.jersey);
  onI(0, 0, size, 5.9, 0.5, shade);
  for (let i = 0; i < size; i += 2) {
    for (let j = 0; j < size; j += 2) flat(i, j, 2, 2, (i + j) % 4 === 0 ? '#5e7f83' : '#56767a');
  }
  // O emblema do clube pintado no chão.
  disc(13, 13, 3.9, kit.jersey);
  disc(13, 13, 3.3, '#f8f0d8');
  disc(13, 13, 2.6, '#e8622a');
  flat(10.4, 12.9, 5.2, 0.2, INK);
  flat(12.9, 10.4, 0.2, 5.2, INK);
  // O duche, a seguir aos cacifos, com o chão molhado.
  onJ(12, 0, 3.8, 0, 5.2, '#8a9694');
  onJ(12.3, 0, 3.2, 0, 4.8, '#dfe9e8');
  for (let k = 0.6; k < 4.8; k += 0.6) onJ(12.3, 0, 3.2, k, 0.05, '#b4c4c4');
  for (let u = 13; u < 15.5; u += 0.7) onJ(u, 0, 0.05, 0, 4.8, '#b4c4c4');
  onJ(13.8, 0, 0.15, 2.6, 1.8, '#6e7b80');
  onJ(13.4, 0, 0.8, 4.3, 0.2, '#6e7b80');
  flat(12, 0, 3.8, 3, '#6f9aa0');
  // Cartazes na parede.
  onI(0, 18.5, 3, 3.2, 2, INK);
  onI(0, 18.7, 2.6, 3.35, 1.7, '#f3f3ee');
  for (let n = 0; n < 4; n++) onI(0, 18.9 + n * 0.55, 0.35, 4, 0.7, n % 2 ? '#cf3a2c' : '#2b5fd9');
  onI(0, 23, 3, 3.1, 2.2, shade);
  onI(0, 23.3, 2.4, 3.4, 1.6, '#f2c230');
  const jersey = (at: number, fixed: number, face: 'j' | 'i', n: number): void => {
    const rect = face === 'j' ? (u: number, w: number, k: number, h: number, c: string) => onJ(at + u, fixed, w, k, h, c) : (u: number, w: number, k: number, h: number, c: string) => onI(fixed, at + u, w, k, h, c);
    rect(0.15, 2.1, 0.5, 3.7, face === 'j' ? '#1e2b34' : '#17222a');
    rect(0.6, 1.2, 2, 1.9, kit.jersey);
    rect(0.3, 0.3, 3.4, 0.5, kit.jersey);
    rect(1.8, 0.3, 3.4, 0.5, kit.jersey);
    if (kit.pattern === 'band') rect(0.6, 1.2, 2.8, 0.4, kit.second);
    if (kit.pattern === 'stripes') for (let u = 0.6; u < 1.7; u += 0.5) rect(u, 0.2, 2, 1.9, kit.second);
    if (kit.pattern === 'half') rect(1.2, 0.6, 2, 1.9, kit.second);
    rect(1.05, 0.3, 3.65, 0.25, kit.trim);
    rect(0.15, 2.1, 4.25, 0.1, '#6e7b80');
    rect(0.3, 0.9 + (n % 2) * 0.6, 4.35, 0.45, n % 3 === 0 ? '#f4f4f4' : n % 3 === 1 ? '#e8622a' : '#3a4252');
  };
  for (let n = 0; n < 4; n++) {
    const x = 1 + n * 2.7;
    box(x, 0.1, 2.45, 1.5, 5.2, '#47606a', '#587380', '#3f5560');
    jersey(x, 1.6, 'j', n);
  }
  for (let n = 0; n < 5; n++) {
    const y = 3.2 + n * 2.7;
    box(0.1, y, 1.5, 2.45, 5.2, '#47606a', '#587380', '#3f5560');
    jersey(y, 1.6, 'i', n + 3);
  }
}

/** Uma coisa em cena: ocupa um retângulo do chão, à altura z, e desenha-se a si própria. */
interface SceneItem {
  i0: number;
  i1: number;
  j0: number;
  j1: number;
  z: number;
  draw: () => void;
}

/** Ordena do fundo para a frente pelo que realmente fica atrás de quê, mesmo com móveis compridos. */
function depthOrder(items: readonly SceneItem[]): SceneItem[] {
  const clear = (a: SceneItem, b: SceneItem): boolean => a.i1 <= b.i0 || a.j1 <= b.j0;
  const behind = (a: SceneItem, b: SceneItem): boolean => {
    if (!clear(a, b) && !clear(b, a)) return a.z < b.z;
    return clear(a, b) && !clear(b, a);
  };
  const out: SceneItem[] = [];
  const seen = new Set<SceneItem>();
  const visit = (item: SceneItem): void => {
    if (seen.has(item)) return;
    seen.add(item);
    for (const other of items) if (other !== item && behind(other, item)) visit(other);
    out.push(item);
  };
  items.forEach(visit);
  return out;
}

const BENCH_HEIGHT = 0.75;
const BENCH_A = { i: 4, j: 4.2, a: 12.4, b: 1.2 };
const BENCH_B = { i: 3.6, j: 7, a: 1.2, b: 10.4 };
const SEATS_A = [5.2, 7.8, 10.4, 13, 15.4];
const SEATS_B = [8, 10.6, 13.2, 15.8];
const MASSAGE = { i: 9, j: 19.6, a: 4.4, b: 2 };

/** Os móveis, onde cada coisa tem o seu sítio: bancos junto aos cacifos, quadro à parte, marquesa à frente. */
function lockerFurniture(g: CanvasRenderingContext2D, W: number, H: number, half: boolean, score: string): SceneItem[] {
  const { P, flat, box, onJ } = iso(g, H, W);
  const item = (i0: number, a: number, j0: number, b: number, z: number, draw: () => void): SceneItem => ({ i0, i1: i0 + a, j0, j1: j0 + b, z, draw });
  const items: SceneItem[] = [
    item(BENCH_A.i, BENCH_A.a, BENCH_A.j, BENCH_A.b, 0, () => box(BENCH_A.i, BENCH_A.j, BENCH_A.a, BENCH_A.b, BENCH_HEIGHT, '#c99a5a', '#a67b42', '#8a6432')),
    item(BENCH_B.i, BENCH_B.a, BENCH_B.j, BENCH_B.b, 0, () => box(BENCH_B.i, BENCH_B.j, BENCH_B.a, BENCH_B.b, BENCH_HEIGHT, '#c99a5a', '#a67b42', '#8a6432')),
    // Toalhas e garrafas, nos lugares vazios entre quem está sentado.
    item(6.3, 0.9, 4.4, 0.8, BENCH_HEIGHT, () => flat(6.3, 4.4, 0.9, 0.8, '#f4f4f4', BENCH_HEIGHT + 0.08)),
    item(11.6, 0.3, 4.6, 0.3, BENCH_HEIGHT, () => {
      const [x, y] = P(11.7, 4.7, BENCH_HEIGHT);
      g.fillStyle = INK;
      g.fillRect(Math.round(x) - 2, Math.round(y) - 7, 4, 7);
      g.fillStyle = '#7ec8e0';
      g.fillRect(Math.round(x) - 1, Math.round(y) - 6, 2, 5);
    }),
    // O quadro de tática, em cavalete, à frente de toda a gente para não esconder ninguém.
    item(21, 4, 12, 0.3, 0, () => {
      onJ(21.3, 12.2, 0.15, 0, 1, INK);
      onJ(24.5, 12.2, 0.15, 0, 1, INK);
      onJ(21, 12.2, 4, 0.9, 2.7, INK);
      onJ(21.15, 12.2, 3.7, 1, 2.5, '#f3f3ee');
      for (const [u, k] of [[21.7, 2.8], [22.6, 2.1], [23.6, 3], [24.2, 1.8]] as const) onJ(u, 12.2, 0.3, k, 0.3, '#2b5fd9');
      for (const [u, k] of [[22, 1.6], [23, 2.8], [24.3, 2.7]] as const) onJ(u, 12.2, 0.3, k, 0.3, '#cf3a2c');
      if (half) {
        const [x, y] = P(21.3, 12.2, 3.5);
        text(g, score.replace(/ /g, ''), Math.round(x), Math.round(y), '#cf3a2c', 1);
      }
    }),
    // A mesa das bebidas, no fim do banco.
    item(17.6, 2, 5, 1.4, 0, () => {
      box(17.6, 5, 2, 1.4, 1.2, '#e4dcc6', '#c9c0a4', '#a79e82');
      const [x, y] = P(18.6, 5.7, 1.2);
      g.fillStyle = INK;
      g.fillRect(Math.round(x) - 6, Math.round(y) - 13, 12, 14);
      g.fillStyle = '#e8622a';
      g.fillRect(Math.round(x) - 5, Math.round(y) - 12, 10, 12);
      g.fillStyle = '#f2c230';
      g.fillRect(Math.round(x) - 5, Math.round(y) - 12, 10, 3);
    }),
    // A marquesa, à frente de tudo, com o cesto das bolas e um saco ao lado.
    item(MASSAGE.i, MASSAGE.a, MASSAGE.j, MASSAGE.b, 0, () => {
      box(MASSAGE.i, MASSAGE.j, MASSAGE.a, MASSAGE.b, 0.9, '#f8f0d8', '#c4b890', '#a79e82');
      flat(MASSAGE.i + 0.2, MASSAGE.j + 0.2, 1, MASSAGE.b - 0.4, '#e8e0c6', 0.9);
    }),
    // O cesto das bolas, de rede, e um saco de desporto com a alça em cima.
    item(16.6, 2.2, 19.6, 2.2, 0, () => {
      box(16.6, 19.6, 2.2, 2.2, 1, '#8fa2aa', '#71858e', '#5c6f78');
      for (const [i, j, k] of [[17.2, 20.2, 1], [18.2, 20.2, 1], [17.2, 21.2, 1], [18.2, 21.2, 1], [17.7, 20.7, 1.6]] as const) {
        const [x, y] = P(i, j, k);
        const left = Math.round(x) - 4;
        const top = Math.round(y) - 7;
        g.fillStyle = INK;
        g.fillRect(left + 1, top, 6, 8);
        g.fillRect(left, top + 1, 8, 6);
        g.fillStyle = '#e8622a';
        g.fillRect(left + 1, top + 1, 6, 6);
        g.fillStyle = INK;
        g.fillRect(left + 1, top + 3, 6, 1);
        g.fillRect(left + 3, top + 1, 1, 6);
      }
    }),
    item(14.2, 1.8, 20.6, 1, 0, () => {
      box(14.2, 20.6, 1.8, 1, 0.7, '#2b5fd9', '#1d43a3', '#16357f');
      flat(14.9, 20.6, 0.35, 1, '#f8f0d8', 0.7);
      const [x, y] = P(15.1, 21.1, 0.7);
      g.fillStyle = INK;
      g.fillRect(Math.round(x) - 4, Math.round(y) - 3, 8, 1);
      g.fillRect(Math.round(x) - 4, Math.round(y) - 3, 1, 3);
      g.fillRect(Math.round(x) + 3, Math.round(y) - 3, 1, 3);
    }),
  ];
  return items;
}

function paintGym(g: CanvasRenderingContext2D, W: number, H: number): void {
  const { P, flat, box, onJ, onI } = iso(g, H, W);
  g.fillStyle = '#3a4a55';
  g.fillRect(0, 0, W, H);
  const size = 46;
  onJ(0, 0, size, 0, 6.5, '#cfc4a6');
  onI(0, 0, size, 0, 6.5, '#b8ad90');
  for (let n = 1; n < size; n += 4) {
    onJ(n, 0, 2, 3.8, 2, '#8fd0e6');
    onI(0, n, 2, 3.8, 2, '#6fb2c9');
  }
  flat(0, 0, size, size, '#d9b070');
  for (let n = 0; n < size; n += 3) flat(n, 0, 0.12, size, '#c79d5e');
  flat(3, 3, 22, 20, '#e3c083');
  const line = '#f8f0d8';
  for (const [a, b, c, d] of [[3, 3, 22, 0.15], [3, 23, 22, 0.15], [3, 3, 0.15, 20], [25, 3, 0.15, 20.15], [14, 3, 0.15, 20]] as const) flat(a, b, c, d, line);
  // Bancadas vazias: é um treino à porta fechada.
  for (let row = 0; row < 3; row++) box(0.3 + row * 0.1, 3 + row * 0, 1.8 - row * 0.5, 20, 2 - row * 0.6, '#7a7f8a', '#5d6470', '#4b5564');
  // Sacos, garrafas e cones à volta do campo.
  box(26.4, 6, 3, 1.4, 0.8, '#3a4252', '#2a3347', '#1f2838');
  box(26.4, 9, 2.6, 2.6, 1, '#3a4252', '#2a3347', '#1f2838');
  for (const [i, j] of [[27, 9.7], [28.1, 9.7], [27, 10.8], [28.1, 10.8]] as const) {
    const [x, y] = P(i, j, 1);
    drawBall(g, Math.round(x), Math.round(y) - 3);
  }
  for (const [i, j] of [[8, 25], [12, 25], [16, 25], [20, 25]] as const) box(i, j, 0.5, 0.5, 0.5, '#e8622a', '#c9622f', '#a44b22');
}

const sceneCache = new Map<string, HTMLCanvasElement>();

interface Actor {
  i: number;
  j: number;
  z: number;
  pose: PoseName;
  look: Look;
  flip: boolean;
  back: boolean;
  ball: boolean;
}

/** Quem está em cena e o que faz. Cada um tem o seu lugar e uma pequena rotina, para a sala parecer viva. */
function sceneActors(kind: SceneKind, roster: readonly Player[], kit: ClubKit, rival: Team, now: number): Actor[] {
  const look = (n: number): Look => ({ ...lookOf(roster[n % roster.length]!, 'blue'), custom: kit });
  const coach: Look = { ...lookOf(roster[0]!, 'coach'), style: 0, legs: 6, torso: 6, build: 'athletic' };
  const physio = lookOf({ ...roster[1]!, name: 'Fisioterapeuta' }, 'coach');
  const beat = (period: number, offset = 0): boolean => Math.floor(now / period + offset) % 2 === 0;
  const walk: PoseName[] = ['run0', 'run1', 'run2', 'run1'];
  const actors: Actor[] = [];
  const stand = (i: number, j: number, n: number, pose: PoseName, flip = false, back = false, ball = false): void => {
    actors.push({ i, j, z: 0, pose, look: look(n), flip, back, ball });
  };
  const sit = (i: number, j: number, n: number, z = BENCH_HEIGHT): void => {
    actors.push({ i, j, z, pose: 'sit', look: look(n), flip: false, back: false, ball: false });
  };
  if (kind === 'gym') {
    stand(8, 8, 0, beat(280) ? 'drib0' : 'drib1', false, false, true);
    stand(10, 12, 1, beat(700) ? 'cheer0' : 'cheer1');
    stand(8, 16, 2, beat(900, 0.5) ? 'defend' : 'idle');
    stand(11, 19, 3, beat(280, 0.3) ? 'drib0' : 'drib1', true, false, true);
    stand(6, 12, 4, beat(800, 0.2) ? 'idle' : 'pass');
    rival.roster.slice(0, 5).forEach((p, n) => {
      const pose: PoseName = n % 2 ? (beat(800, n) ? 'cheer0' : 'idle') : (beat(300, n) ? 'drib0' : 'drib1');
      actors.push({ i: 19 + (n % 2) * 2, j: 6 + n * 3.2, z: 0, pose, look: lookOf(p, 'cream'), flip: true, back: false, ball: n % 2 === 0 });
    });
    actors.push({ i: 15, j: 25.5, z: 0, pose: beat(1400) ? 'pass' : 'idle', look: coach, flip: false, back: false, ball: false });
    return actors;
  }
  const pace = (now / 1000) % 8;
  const along = pace < 4 ? pace : 8 - pace;
  const seatJ = BENCH_A.j + BENCH_A.b / 2;
  const benchI = BENCH_B.i + BENCH_B.a / 2;
  // Quem está na marquesa e o fisioterapeuta ao lado, nos dois momentos.
  actors.push({ i: MASSAGE.i + 2.6, j: MASSAGE.j + 1, z: 0.9, pose: 'sit', look: look(11), flip: false, back: false, ball: false });
  actors.push({ i: MASSAGE.i + 1.4, j: MASSAGE.j + MASSAGE.b + 0.7, z: 0, pose: beat(500) ? 'pass' : 'idle', look: physio, flip: false, back: false, ball: false });
  if (kind === 'lockerPre') {
    // Antes do jogo: há quem aqueça, quem se concentre, quem vá buscar as coisas ao cacifo.
    sit(SEATS_A[0]!, seatJ, 0);
    sit(SEATS_A[2]!, seatJ, 1);
    sit(SEATS_A[4]!, seatJ, 2);
    sit(benchI, SEATS_B[0]!, 3);
    sit(benchI, SEATS_B[2]!, 4);
    stand(10.7, 2.7, 5, 'idle', false, true);
    stand(9, 9.6, 6, beat(650) ? 'cheer0' : 'cheer1');
    stand(13, 13, 7, beat(260) ? 'drib0' : 'drib1', false, false, true);
    stand(17.5 + along * 0.9, 16.5, 8, walk[Math.floor(now / 170) % 4]!, pace >= 4);
    stand(17.2, 8, 9, beat(1300) ? 'idle' : 'pass');
    stand(20.4, 7.6, 10, beat(1300, 1) ? 'idle' : 'pass', true);
  } else {
    // No intervalo: quase toda a equipa sentada a ouvir o treinador, e dois a irem beber água.
    SEATS_A.forEach((i, n) => sit(i, seatJ, n));
    SEATS_B.forEach((j, n) => { if (n < 3) sit(benchI, j, n + 5); });
    stand(17.2, 8, 8, beat(1600) ? 'idle' : 'pass', true);
    stand(20.4, 7.6, 9, beat(1600, 0.5) ? 'idle' : 'pass');
    stand(14, 14, 10, 'idle', false, true);
  }
  actors.push({ i: 21.2, j: 14, z: 0, pose: kind === 'lockerHalf' ? (beat(800) ? 'pass' : 'cheer0') : (beat(1500) ? 'pass' : 'idle'), look: coach, flip: true, back: false, ball: false });
  return actors;
}

export function drawSceneFrame(canvas: HTMLCanvasElement, kind: SceneKind, roster: readonly Player[], kit: ClubKit, rival: Team, score: string, now: number): void {
  const g = canvas.getContext('2d')!;
  const { width: W, height: H } = canvas;
  const key = `${kind}|${W}x${H}|${kitKey(kit)}`;
  let base = sceneCache.get(key);
  if (!base) {
    base = document.createElement('canvas');
    base.width = W;
    base.height = H;
    const b = base.getContext('2d')!;
    if (kind === 'gym') paintGym(b, W, H);
    else paintLocker(b, W, H, kit);
    sceneCache.set(key, base);
  }
  g.imageSmoothingEnabled = false;
  g.drawImage(base, 0, 0);
  const { P } = iso(g, H, W);
  const person = (a: Actor): SceneItem => ({
    i0: a.i - 0.35, i1: a.i + 0.35, j0: a.j - 0.35, j1: a.j + 0.35, z: a.z,
    draw: () => {
      const [fx, fy] = P(a.i, a.j, a.z);
      const x = Math.round(fx);
      const y = Math.round(fy);
      if (a.z === 0) drawShadow(g, x, y, 6);
      drawSprite(g, a.pose, a.look, x, y, a.flip, a.back, a.ball);
    },
  });
  const furniture = kind === 'gym' ? [] : lockerFurniture(g, W, H, kind === 'lockerHalf', score);
  for (const item of depthOrder([...furniture, ...sceneActors(kind, roster, kit, rival, now).map(person)])) item.draw();
  if (kind !== 'gym') {
    // Vapor a sair do duche.
    const [sx, sy] = P(13.9, 1.2, 1.6);
    for (let n = 0; n < 6; n++) {
      const t = (now / 1800 + n / 6) % 1;
      g.fillStyle = `rgba(240,248,248,${(0.4 * (1 - t)).toFixed(2)})`;
      const size = 5 + t * 9;
      g.fillRect(Math.round(sx + Math.sin(t * 7 + n) * 10 - size / 2), Math.round(sy - t * 36), Math.round(size), Math.round(size));
    }
  }
}

/** O quadro de táticas: os cinco a mostrar o que muda com cada escolha. */
export function drawTacticsBoard(canvas: HTMLCanvasElement, tactics: Tactics): void {
  const g = canvas.getContext('2d')!;
  const { width: W, height: H } = canvas;
  g.fillStyle = '#17564f';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#f4f1e4';
  const hoopX = W - 30;
  const cy = H / 2;
  g.strokeStyle = '#f4f1e4';
  g.lineWidth = 2;
  g.strokeRect(12.5, 12.5, W - 25, H - 25);
  g.strokeRect(hoopX - 90, cy - 48, 108, 96);
  g.beginPath();
  g.arc(hoopX, cy, 8, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(hoopX - 6, cy, 150, Math.PI * 0.62, Math.PI * 1.38);
  g.stroke();
  const spread = 1 + tactics.spacing * 0.32;
  const home: [number, number][] = [[0.4, 0], [0.62, -0.72], [0.62, 0.72], [0.8, -0.28], [0.86, 0.22]];
  const pressure = 26 - tactics.pressure * 16;
  home.forEach(([u, v], n) => {
    const x = 20 + (W - 60) * (tactics.spacing < 0 && n > 2 ? u + 0.03 : u - (n > 2 ? 0 : Math.max(0, tactics.spacing) * 0.08));
    const y = cy + v * (H / 2 - 22) * (n < 3 ? spread : 1);
    const dx = (hoopX - x) / Math.max(1, Math.hypot(hoopX - x, cy - y));
    const dy = (cy - y) / Math.max(1, Math.hypot(hoopX - x, cy - y));
    const defX = x + dx * pressure;
    const defY = y + dy * pressure;
    g.fillStyle = '#cf3a2c';
    g.fillRect(defX - 5, defY - 5, 10, 10);
    g.fillStyle = '#2b5fd9';
    g.fillRect(x - 6, y - 6, 12, 12);
    g.fillStyle = '#f4f1e4';
    g.fillRect(x - 2, y - 2, 4, 4);
    if (n === 0) {
      g.strokeStyle = '#f2c230';
      g.lineWidth = 2;
      const length = 40 + tactics.pace * 30;
      g.beginPath();
      g.moveTo(x + 8, y);
      g.lineTo(x + 8 + length, y);
      g.lineTo(x + length, y - 6);
      g.moveTo(x + 8 + length, y);
      g.lineTo(x + length, y + 6);
      g.stroke();
      g.strokeStyle = '#f4f1e4';
    }
  });
}
