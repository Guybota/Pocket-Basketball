// O que se vê no ecrã de cima antes do jogo e no intervalo: o balneário, o pavilhão fechado e o quadro de táticas.
// E fora dos jogos: o escritório, o despedimento e o balneário vazio depois de uma descida.
import type { Player, Tactics, Team } from '../../sim/types.ts';
import { fillPolygon } from './court.ts';
import { text } from './font.ts';
import { kitKey, shadeOf, type ClubKit } from './kit.ts';
import { INK, drawBall, drawShadow, drawSprite, lookOf, type Look, type PoseName } from './sprites.ts';
import { remember } from './cache.ts';
import { STAFF } from '../staff.ts';

function projector(ox: number, oy: number, th: number): (i: number, j: number, k?: number) => [number, number] {
  return (i, j, k = 0) => [ox + (i - j) * th * 2, oy + (i + j) * th - k * th * 2];
}

export type SceneKind = 'lockerPre' | 'lockerHalf' | 'gym' | 'office' | 'fired' | 'relegated';

/** `lower` desce a sala no ecrã, para uma etiqueta por cima não tapar as paredes. */
function iso(g: CanvasRenderingContext2D, H: number, W: number, lower = 0) {
  const P = projector(W / 2 - 6, 18 + lower + Math.max(0, H - 270) / 2, 6);
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
    // Camisola de basquetebol: sem mangas, com duas alças finas e a gola em V entre elas.
    rect(0.6, 1.2, 2, 1.7, kit.jersey);
    rect(0.6, 0.3, 3.7, 0.4, kit.jersey);
    rect(1.5, 0.3, 3.7, 0.4, kit.jersey);
    if (kit.pattern === 'band') rect(0.6, 1.2, 2.7, 0.35, kit.second);
    if (kit.pattern === 'stripes') for (let u = 0.6; u < 1.7; u += 0.5) rect(u, 0.2, 2, 1.7, kit.second);
    if (kit.pattern === 'pin') for (let u = 0.75; u < 1.7; u += 0.4) rect(u, 0.06, 2, 1.7, kit.second);
    if (kit.pattern === 'hoops') for (let k = 2.2; k < 3.6; k += 0.6) rect(0.6, 1.2, k, 0.25, kit.second);
    if (kit.pattern === 'half') rect(1.2, 0.6, 2, 1.7, kit.second);
    if (kit.pattern === 'sides') { rect(0.6, 0.18, 2, 1.7, kit.second); rect(1.62, 0.18, 2, 1.7, kit.second); }
    if (kit.pattern === 'sash') for (let n = 0; n < 6; n++) rect(0.6 + n * 0.18, 0.3, 3.4 - n * 0.27, 0.3, kit.second);
    rect(0.9, 0.6, 3.55, 0.15, kit.trim);
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

/** Mistura duas cores em hexadecimal: t = 0 dá a primeira, t = 1 a segunda. */
function mix(a: string, b: string, t: number): string {
  const ch = (hex: string, n: number): number => parseInt(hex.slice(1 + n * 2, 3 + n * 2), 16);
  const out = [0, 1, 2].map(n => Math.round(ch(a, n) + (ch(b, n) - ch(a, n)) * t).toString(16).padStart(2, '0'));
  return `#${out.join('')}`;
}

const OFFICE_LOWER = 56;

/** O escritório: paredes de papel de parede, soalho, a janela, a estante e a porta. A porta abre-se no despedimento. */
function paintOffice(g: CanvasRenderingContext2D, W: number, H: number, kit: ClubKit, doorOpen: boolean): void {
  const { flat, box, onJ, onI } = iso(g, H, W, OFFICE_LOWER);
  g.fillStyle = '#231a16';
  g.fillRect(0, 0, W, H);
  const size = 46;
  onJ(0, 0, size, 0, 7, '#d9c9a2');
  onI(0, 0, size, 0, 7, '#c0ae86');
  // Riscas do papel de parede e um lambrim de madeira até meio.
  for (let n = 0.6; n < size; n += 1.2) {
    onJ(n, 0, 0.12, 2.2, 4.8, '#cfbd94');
    onI(0, n, 0.12, 2.2, 4.8, '#b4a27a');
  }
  onJ(0, 0, size, 0, 2.2, '#8a6440');
  onI(0, 0, size, 0, 2.2, '#76553a');
  onJ(0, 0, size, 2.1, 0.2, '#5e4128');
  onI(0, 0, size, 2.1, 0.2, '#4f3622');
  for (let i = 0; i < size; i += 1) flat(i, 0, 1, size, i % 2 ? '#a8774a' : '#9c6d43');
  for (let i = 0; i < size; i += 1) for (let j = (i * 7) % 5; j < size; j += 5) flat(i, j, 1, 0.08, '#7f5634');
  // O tapete por baixo da secretária, nas cores do clube.
  flat(6, 3.6, 11, 9, shadeOf(kit.jersey));
  flat(6.5, 4.1, 10, 8, kit.jersey);
  flat(7.3, 4.9, 8.4, 6.4, shadeOf(kit.jersey));
  // A janela, com a cidade lá fora.
  onJ(3.6, 0, 6.2, 2.6, 3.8, INK);
  onJ(3.9, 0, 5.6, 2.9, 3.2, '#8fd0e6');
  onJ(3.9, 0, 5.6, 2.9, 0.9, '#6f8fa6');
  for (const [u, h] of [[4.2, 1.5], [5.4, 1.1], [6.6, 1.8], [7.9, 1.2], [8.8, 1.6]] as const) onJ(u, 0, 0.9, 2.9, h, '#5b6f86');
  onJ(5.2, 0, 1.4, 5.2, 0.4, '#f4f4f4');
  onJ(6.65, 0, 0.15, 2.9, 3.2, INK);
  onJ(3.9, 0, 5.6, 4.45, 0.12, INK);
  // A fotografia de equipa e o relógio.
  onJ(10.6, 0, 2.6, 4.1, 1.8, INK);
  onJ(10.75, 0, 2.3, 4.25, 1.5, '#e8dcc0');
  for (let n = 0; n < 5; n++) onJ(11 + n * 0.42, 0, 0.26, 4.4, 0.7, kit.jersey);
  onJ(10.75, 0, 2.3, 4.25, 0.25, '#7a8a6a');
  onJ(1.4, 0, 1.2, 5.2, 1.2, INK);
  onJ(1.55, 0, 0.9, 5.35, 0.9, '#f4efe0');
  onJ(1.95, 0, 0.12, 5.75, 0.4, INK);
  onJ(1.95, 0, 0.4, 5.75, 0.1, INK);
  // A estante, de livros e dossiês.
  box(0.1, 2.4, 1.4, 5.6, 5, '#6b4a2e', '#5a3d25', '#7d5836');
  const spines = ['#cf3a2c', '#2b5fd9', '#f2c230', '#3d8a3a', '#e8dcc0', '#7246c4', '#e8622a'];
  for (let row = 0; row < 3; row++) {
    onI(1.5, 2.5, 5.4, 0.3 + row * 1.6, 0.12, '#3e2a19');
    for (let n = 0; n < 11; n++) {
      if ((n + row * 3) % 7 === 6) continue;
      onI(1.5, 2.65 + n * 0.47, 0.36, 0.42 + row * 1.6, 0.9 + ((n * 5 + row) % 3) * 0.15, spines[(n * 3 + row * 2) % spines.length]!);
    }
  }
  // A porta para o corredor, com a placa.
  onI(0, 9.4, 3.4, 0, 5.6, '#5e4128');
  if (doorOpen) {
    onI(0, 9.7, 2.8, 0, 5.2, '#1b1410');
    onI(0, 9.7, 2.8, 0, 0.3, '#3a2a20');
  } else {
    onI(0, 9.7, 2.8, 0, 5.2, '#8a5a32');
    onI(0, 10, 2.2, 3, 1.8, '#9c6a3c');
    onI(0, 10, 2.2, 0.5, 2.1, '#9c6a3c');
    onI(0, 12.05, 0.3, 2.4, 0.3, '#f2c230');
  }
  onI(0, 10.3, 1.6, 5.9, 0.6, '#e8dcc0');
  // O arquivo, ao canto.
  box(12, 0.1, 2, 1.6, 3.2, '#8f9aa0', '#7a858b', '#a7b1b6');
  for (const k of [0.4, 1.4, 2.4]) onJ(12.15, 1.7, 1.7, k, 0.7, '#9aa5ab');
  for (const k of [0.65, 1.65, 2.65]) onJ(12.75, 1.7, 0.5, k, 0.15, INK);
}

/** O vaso ao lado da secretária. Com a confiança alta está direito e com flor; a descer, as folhas caem e o caule dobra. */
function drawPlant(g: CanvasRenderingContext2D, x: number, y: number, confidence: number, now: number): void {
  const d = Math.max(0, Math.min(1, 1 - confidence / 100));
  const px = (cx: number, cy: number, w: number, h: number, c: string): void => {
    g.fillStyle = c;
    g.fillRect(Math.round(cx), Math.round(cy), w, h);
  };
  // Folhas caídas no chão, mais quanto mais murcho.
  const fallen = d > 0.45 ? Math.floor((d - 0.45) * 9) : 0;
  for (let n = 0; n < fallen; n++) px(x - 14 + ((n * 11) % 28), y - 1 + (n % 2) * 2, 4, 2, mix('#6f8a3a', '#8a6a3a', d));
  // O vaso de barro.
  px(x - 8, y - 15, 16, 4, INK);
  px(x - 7, y - 14, 14, 1, '#d97a46');
  px(x - 7, y - 13, 14, 1, '#b0552e');
  for (let n = 0; n < 11; n++) {
    const half = 6 - Math.floor(n / 4);
    px(x - half - 1, y - 11 + n, half * 2 + 2, 1, INK);
    px(x - half, y - 11 + n, half * 2, 1, '#c8673a');
    px(x + half - 3, y - 11 + n, 3, 1, '#a84d28');
  }
  px(x - 6, y - 15, 12, 1, '#4a3020');
  // O caule: onze bocados, cada um mais dobrado do que o anterior.
  const sway = d < 0.4 ? Math.sin(now / 900) * 0.06 : 0;
  const stem = mix('#3d8a3a', '#7a5a2e', d);
  const leaf = mix('#5cbf4a', '#9a7a3a', d);
  const vein = mix('#3d8a3a', '#6b4a2a', d);
  let sx = x;
  let sy = y - 15;
  let angle = sway;
  for (let k = 1; k <= 11; k++) {
    angle += d * d * 0.2 + sway * 0.2;
    sx += Math.sin(angle) * 3;
    sy -= Math.cos(angle) * 3;
    px(sx - 1, sy - 1, 2, 3, stem);
    if (k % 2 === 0 && k < 11 && !(d > 0.7 && k === 2)) {
      const side = k % 4 === 0 ? 1 : -1;
      const tilt = angle + side * (1.0 + d * 1.2);
      for (let n = 1; n <= 5; n++) {
        const thick = n >= 2 && n <= 4 ? 3 : 2;
        px(sx + Math.sin(tilt) * n * 1.4 - 1, sy - Math.cos(tilt) * n * 1.4 - 1, 2, thick, n === 3 ? vein : leaf);
      }
    }
  }
  if (d < 0.55) {
    // A flor, amarela, com o miolo laranja.
    for (const [ox, oy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, -2], [-2, 2], [2, 2]] as const) px(sx + ox - 1, sy + oy - 1, 2, 2, '#f2c230');
    px(sx - 1, sy - 1, 3, 3, '#e8622a');
  } else {
    px(sx - 2, sy, 4, 3, '#6b4a2a');
    px(sx - 1, sy + 3, 2, 1, '#6b4a2a');
  }
  // Murcho, de vez em quando cai mais uma folha.
  if (d > 0.6 && now > 0) {
    const t = (now % 5000) / 1400;
    if (t < 1) px(x + 5 + Math.sin(t * 9) * 3, y - 26 + t * 25, 3, 1, leaf);
  }
}

/** A caixa de cartão com o que o treinador leva: o vaso murcho e a fotografia. `x`, `y` é o fundo da caixa. */
function drawBoxCarried(g: CanvasRenderingContext2D, x: number, y: number): void {
  const px = (cx: number, cy: number, w: number, h: number, c: string): void => {
    g.fillStyle = c;
    g.fillRect(cx, cy, w, h);
  };
  px(x - 3, y - 15, 2, 6, '#7a5a2e');
  px(x - 1, y - 15, 3, 1, '#9a7a3a');
  px(x + 1, y - 14, 2, 1, '#9a7a3a');
  px(x + 2, y - 13, 1, 2, '#6b4a2a');
  px(x + 3, y - 14, 4, 5, INK);
  px(x + 4, y - 13, 2, 3, '#e8dcc0');
  px(x - 7, y - 10, 14, 10, INK);
  px(x - 6, y - 9, 12, 8, '#c8955a');
  px(x - 6, y - 9, 12, 2, '#a87840');
  px(x - 1, y - 6, 2, 3, '#a87840');
}

/** O escritório: o treinador à secretária e a secretária ao arquivo. No despedimento, o treinador sai de caixa na mão
 * e entrega as chaves ao presidente, que fica à porta. */
function drawOffice(g: CanvasRenderingContext2D, W: number, H: number, fired: boolean, roster: readonly Player[], kit: ClubKit, now: number, confidence: number): void {
  const { P, box, onJ } = iso(g, H, W, OFFICE_LOWER);
  const coach: Look = { ...lookOf(roster[0]!, 'coach'), style: 0, legs: 6, torso: 6, build: 'athletic' };
  const beat = (period: number, offset = 0): boolean => Math.floor(now / period + offset) % 2 === 0;
  const item = (i0: number, a: number, j0: number, b: number, z: number, draw: () => void): SceneItem => ({ i0, i1: i0 + a, j0, j1: j0 + b, z, draw });
  const at = (i: number, j: number, k: number): [number, number] => {
    const [x, y] = P(i, j, k);
    return [Math.round(x), Math.round(y)];
  };
  const items: SceneItem[] = [
    // A cadeira, de costas altas.
    item(9.8, 1.6, 4.9, 1.8, 0, () => {
      onJ(9.8, 4.9, 1.6, 0.5, 2.5, '#2a3347');
      box(9.8, 5.1, 1.6, 1.6, 0.5, '#3a4252', '#2a3347', '#1f2838');
    }),
    // A secretária, com o telefone e uma pilha de papéis que cresce com os maus resultados.
    item(8.8, 5.4, 7, 2.4, 0, () => {
      box(8.8, 7, 5.4, 2.4, 1.6, '#8a5a32', '#6b4426', '#5a3820');
      onJ(9.1, 9.4, 4.8, 0.2, 1.2, '#5e3c22');
      if (fired) return;
      const pile = Math.round(2 + (1 - confidence / 100) * 12);
      const [qx, qy] = at(9.4, 8.2, 1.6);
      for (let n = 0; n < pile; n++) {
        g.fillStyle = n % 3 === 2 ? '#d8d2c0' : '#f4f1e4';
        g.fillRect(qx - 5 + (n % 2), qy - 1 - n, 10, 1);
      }
      g.fillStyle = INK;
      g.fillRect(qx - 6, qy - 1 - pile, 1, pile);
      const [tx, ty] = at(13.2, 8.4, 1.6);
      g.fillStyle = INK;
      g.fillRect(tx - 4, ty - 4, 8, 4);
      g.fillStyle = '#cf3a2c';
      g.fillRect(tx - 3, ty - 3, 6, 2);
      g.fillStyle = INK;
      g.fillRect(tx - 4, ty - 6, 8, 2);
    }),
  ];
  const actors: Actor[] = [];
  const secretary = STAFF.secretary.look;
  const president = STAFF.president.look;
  if (!fired) {
    items.push(item(15.1, 1, 8.1, 1, 0, () => {
      const [x, y] = at(15.6, 8.6, 0);
      drawShadow(g, x, y, 6);
      drawPlant(g, x, y, confidence, now);
    }));
    actors.push({ i: 10.6, j: 5.9, z: 0.5, pose: 'sit', look: coach, flip: false, back: false, ball: false });
    const filing = beat(2400);
    actors.push({ i: 13, j: 3.2, z: 0, pose: filing ? 'idle' : 'pass', look: secretary, flip: !filing, back: filing, ball: false });
  } else {
    // Dez segundos: vai até ao presidente, entrega as chaves, sai pela porta. A sala fica vazia, só com o presidente.
    const t = (now / 1000) % 10;
    const start: [number, number] = [11.5, 11.6];
    const stop: [number, number] = [4.6, 11.6];
    const door: [number, number] = [0.6, 11];
    const walk = (['holdRun0', 'holdRun1', 'holdRun2', 'holdRun3'] as const)[Math.floor(now / 170) % 4]!;
    let pos: [number, number] | null = null;
    let pose: PoseName = 'hold';
    if (t < 4) {
      const u = t / 4;
      pos = [start[0] + (stop[0] - start[0]) * u, start[1] + (stop[1] - start[1]) * u];
      pose = now === 0 ? 'hold' : walk;
    } else if (t < 6) {
      pos = stop;
    } else if (t < 7.6) {
      const u = (t - 6) / 1.6;
      pos = [stop[0] + (door[0] - stop[0]) * u, stop[1] + (door[1] - stop[1]) * u];
      pose = walk;
      if (pos[0] < 1.4) pos = null;
    }
    const handing = t >= 4.3 && t < 5.6;
    actors.push({ i: 3, j: 8.6, z: 0, pose: handing ? 'pass' : 'idle', look: president, flip: false, back: false, ball: false });
    if (pos) {
      const [ci, cj] = pos;
      items.push({
        i0: ci - 0.35, i1: ci + 0.35, j0: cj - 0.35, j1: cj + 0.35, z: 0,
        draw: () => {
          const [x, y] = at(ci, cj, 0);
          drawShadow(g, x, y, 6);
          drawSprite(g, pose, coach, x, y, true, false, false);
          drawBoxCarried(g, x - 3, y - 9);
        },
      });
    }
    // As chaves passam de uma mão para a outra num arco, e ficam com o presidente.
    if (t >= 4.6) {
      const u = Math.min(1, (t - 4.6) / 0.7);
      const [ax, ay] = at(stop[0], stop[1], 0);
      const [bx, by] = at(3, 8.6, 0);
      const kx = Math.round(ax - 8 + (bx + 6 - (ax - 8)) * u);
      const ky = Math.round(ay - 16 + (by - 15 - (ay - 16)) * u - Math.sin(u * Math.PI) * 6);
      items.push({ i0: 50, i1: 51, j0: 50, j1: 51, z: 9, draw: () => {
        g.fillStyle = INK;
        g.fillRect(kx - 1, ky - 1, 6, 4);
        g.fillStyle = '#f2c230';
        g.fillRect(kx, ky, 2, 2);
        g.fillRect(kx + 2, ky + 1, 3, 1);
        g.fillRect(kx + 4, ky + 1, 1, 2);
      } });
    }
  }
  for (const it of depthOrder([...items, ...actors.map(a => actorItem(g, P, a))])) it.draw();
}

/** O balneário depois da descida: ninguém, a luz a falhar, o duche a pingar e uma bola esquecida a rolar. */
function drawEmptyLocker(g: CanvasRenderingContext2D, W: number, H: number, kit: ClubKit, now: number): void {
  const { P, flat, disc } = iso(g, H, W);
  const items = lockerFurniture(g, W, H, true, '???');
  // A camisola de alguém que já não volta, deixada no banco.
  items.push({ i0: 7.6, i1: 9.2, j0: 4.4, j1: 5.4, z: BENCH_HEIGHT, draw: () => {
    flat(7.7, 4.45, 1.5, 0.9, kit.jersey, BENCH_HEIGHT + 0.05);
    flat(7.7, 4.45, 1.5, 0.15, kit.trim, BENCH_HEIGHT + 0.06);
  } });
  const t = (now / 1000) % 14;
  const roll = t < 7 ? 1 - (1 - t / 7) * (1 - t / 7) : 1;
  const bj = 8.5 + roll * 8;
  items.push({ i0: 11.6, i1: 12.4, j0: bj - 0.4, j1: bj + 0.4, z: 0, draw: () => {
    const [x, y] = P(12, bj, 0);
    drawShadow(g, Math.round(x), Math.round(y), 5);
    drawBall(g, Math.round(x), Math.round(y) - 3);
  } });
  for (const it of depthOrder(items)) it.draw();
  // O duche que ninguém fechou bem.
  const drip = (now % 1400) / 1400;
  const [dx, dy] = P(13.8, 0.4, 4.2 - drip * 4.2);
  g.fillStyle = '#bfe6ee';
  g.fillRect(Math.round(dx), Math.round(dy), 1, 2);
  // A luz: uma lâmpada só, que de vez em quando falha.
  const phase = now % 5200;
  const flicker = now > 0 && (phase < 110 || (phase > 240 && phase < 300));
  g.fillStyle = `rgba(10,14,32,${flicker ? 0.7 : 0.5})`;
  g.fillRect(0, 0, W, H);
  if (!flicker) disc(13, 12, 6, 'rgba(255,232,160,0.12)');
  const [lx, ly] = P(13, 12, 7.5);
  g.fillStyle = INK;
  g.fillRect(Math.round(lx), 0, 1, Math.max(0, Math.round(ly)));
  g.fillStyle = flicker ? '#6b6450' : '#ffe9a0';
  g.fillRect(Math.round(lx) - 2, Math.round(ly), 5, 4);
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
    // De pé à frente dos bancos, a saltitar no sítio: antes do jogo ninguém se senta (ao intervalo, sentam-se todos).
    stand(SEATS_A[0]!, BENCH_A.j + BENCH_A.b + 0.9, 0, beat(420) ? 'idle' : 'clap0');
    stand(SEATS_A[2]!, BENCH_A.j + BENCH_A.b + 0.9, 1, beat(520, 0.5) ? 'cheer0' : 'idle');
    stand(SEATS_A[4]!, BENCH_A.j + BENCH_A.b + 0.9, 2, beat(460, 0.2) ? 'idle' : 'clap1');
    stand(BENCH_B.i + BENCH_B.a + 0.9, SEATS_B[0]!, 3, beat(600, 0.7) ? 'idle' : 'cheer0');
    stand(BENCH_B.i + BENCH_B.a + 0.9, SEATS_B[2]!, 4, beat(380, 0.3) ? 'clap0' : 'idle');
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

/** Uma pessoa em cena, com a sombra no chão. */
function actorItem(g: CanvasRenderingContext2D, P: (i: number, j: number, k?: number) => [number, number], a: Actor): SceneItem {
  return {
    i0: a.i - 0.35, i1: a.i + 0.35, j0: a.j - 0.35, j1: a.j + 0.35, z: a.z,
    draw: () => {
      const [fx, fy] = P(a.i, a.j, a.z);
      const x = Math.round(fx);
      const y = Math.round(fy);
      if (a.z === 0) drawShadow(g, x, y, 6);
      drawSprite(g, a.pose, a.look, x, y, a.flip, a.back, a.ball);
    },
  };
}

/** `confidence`, de 0 a 100, só conta no escritório: é dela que depende o vaso. */
export function drawSceneFrame(canvas: HTMLCanvasElement, kind: SceneKind, roster: readonly Player[], kit: ClubKit, rival: Team, score: string, now: number, confidence = 50): void {
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
    else if (kind === 'office' || kind === 'fired') paintOffice(b, W, H, kit, kind === 'fired');
    else paintLocker(b, W, H, kit);
    remember(sceneCache, key, base, 6);
  }
  g.imageSmoothingEnabled = false;
  g.drawImage(base, 0, 0);
  if (kind === 'office' || kind === 'fired') {
    drawOffice(g, W, H, kind === 'fired', roster, kit, now, confidence);
    return;
  }
  if (kind === 'relegated') {
    drawEmptyLocker(g, W, H, kit, now);
    return;
  }
  const { P } = iso(g, H, W);
  const person = (a: Actor): SceneItem => actorItem(g, P, a);
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
