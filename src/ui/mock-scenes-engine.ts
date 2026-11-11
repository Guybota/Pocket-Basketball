// Maqueta: um motor pequeno de volumes para experimentar cenários construídos de raiz (telhados, viadutos, anéis de bancadas),
// em vez da caixa de paredes do court.ts. O chão é desenhado píxel a píxel; o resto são polígonos sombreados por face,
// ordenados de trás para a frente, com os bonecos verdadeiros do jogo pelo meio. Não entra no jogo.
import { fillPolygon, pixelLine } from './art/court.ts';
import { buildOf, pixelsForHeight } from './art/body.ts';
import { drawShadow, drawSprite, type KitName, type Look, type PoseName } from './art/sprites.ts';
import { text, textWidth } from './art/font.ts';

export type V3 = readonly [number, number, number];
export type Rgb = readonly [number, number, number];

export const css = (c: Rgb, a = 1): string => `rgba(${Math.max(0, Math.min(255, c[0])) | 0},${Math.max(0, Math.min(255, c[1])) | 0},${Math.max(0, Math.min(255, c[2])) | 0},${a})`;
export const shade = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];
export const mix = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const add = (c: Rgb, d: number): Rgb => [c[0] + d, c[1] + d, c[2] + d];
export const frac = (v: number): number => ((v % 1) + 1) % 1;
export const hash = (a: number, b: number): number => {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.sqrt(dot(a, a));
  return [a[0] / l, a[1] / l, a[2] / l];
};

export interface CamSpec {
  w: number;
  h: number;
  pos: V3;
  target: V3;
  focal: number;
}

/** Câmara de furo: posição, para onde olha e a lente em píxeis. Com a câmara muito longe e a lente muito longa fica quase isométrica. */
export class Cam {
  readonly f: V3;
  readonly r: V3;
  readonly u: V3;
  readonly spec: CamSpec;
  constructor(spec: CamSpec) {
    this.spec = spec;
    this.f = norm(sub(spec.target, spec.pos));
    this.r = norm(cross(this.f, [0, 0, 1]));
    this.u = cross(this.r, this.f);
  }
  get w(): number {
    return this.spec.w;
  }
  get h(): number {
    return this.spec.h;
  }
  /** [x, y no ecrã, distância]; null atrás da câmara. */
  project(p: V3): [number, number, number] | null {
    const d = sub(p, this.spec.pos);
    const z = dot(d, this.f);
    if (z < 0.3) return null;
    const k = this.spec.focal / z;
    return [this.w / 2 + dot(d, this.r) * k, this.h / 2 - dot(d, this.u) * k, z];
  }
}

interface Item {
  depth: number;
  draw: (g: CanvasRenderingContext2D) => void;
}

/** Tamanho dos bonecos: 1 no meio do campo com a câmara do jogo; diminui com a distância, mais devagar do que a perspetiva. */
const GAME_RATIO = 290 / 17.5;

/** Uma caixa no mundo, para a verificação de sobreposições. */
export interface Solid {
  b: readonly [number, number, number, number, number, number];
  tag: string;
}

export class Scene {
  readonly items: Item[] = [];
  /** O que ocupa espaço (caixas, prismas, filas de bancada) e onde ficam os pés de cada boneco: só para a verificação. */
  readonly solids: Solid[] = [];
  readonly people: { p: V3; tag: string }[] = [];
  /** A etiqueta das próximas peças (banco, bancada…), para a verificação dizer o que se sobrepõe a quê. */
  tag = 'cenário';
  readonly centre: number;
  readonly cam: Cam;
  constructor(cam: Cam) {
    this.cam = cam;
    this.centre = cam.project([14, 0, 0])?.[2] ?? 20;
  }

  /** Um polígono plano. `bias` puxa-o para a frente na ordem (decalques por cima de uma face). */
  poly(pts: readonly V3[], color: Rgb | string, bias = 0, depthAt?: V3): void {
    const ps = pts.map(p => this.cam.project(p));
    if (ps.some(p => !p)) return;
    const at = depthAt ? this.cam.project(depthAt) : null;
    const depth = (at ? at[2] : ps.reduce((s, p) => s + p![2], 0) / ps.length) - bias;
    const fill = typeof color === 'string' ? color : css(color);
    this.items.push({ depth, draw: g => fillPolygon(g, ps.map(p => [p![0], p![1]] as const), fill) });
  }

  /** Uma face com sombreado pela orientação; não se desenha se estiver de costas para a câmara. */
  face(pts: readonly V3[], n: V3, color: Rgb, bias = 0, depthAt?: V3): void {
    const c: V3 = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length, pts.reduce((s, p) => s + p[2], 0) / pts.length];
    if (dot(n, sub(this.cam.spec.pos, c)) <= 0) return;
    const k = n[2] > 0.5 ? 1 : n[2] < -0.5 ? 0.5 : n[1] > 0.5 ? 0.84 : n[1] < -0.5 ? 0.72 : n[0] > 0 ? 0.76 : 0.64;
    this.poly(pts, shade(color, k), bias, depthAt);
  }

  box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: Rgb, top?: Rgb, bias = 0): void {
    this.solids.push({ b: [x0, x1, y0, y1, z0, z1], tag: this.tag });
    const t = top ?? color;
    this.face([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], t, bias);
    this.face([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0], color, bias);
    this.face([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], color, bias);
    this.face([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0], color, bias);
    this.face([[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], [-1, 0, 0], color, bias);
    this.face([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], [0, 0, -1], color, bias);
  }

  /** Um prisma de n lados (depósitos, colunas, copas de árvores), com tampa. */
  prism(cx: number, cy: number, r: number, z0: number, z1: number, sides: number, color: Rgb, top?: Rgb, topR = r): void {
    const m = Math.max(r, topR) * 0.9;
    this.solids.push({ b: [cx - m, cx + m, cy - m, cy + m, z0, z1], tag: this.tag });
    for (let i = 0; i < sides; i++) {
      const a0 = (i / sides) * Math.PI * 2;
      const a1 = ((i + 1) / sides) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      const n: V3 = [Math.cos(am), Math.sin(am), 0];
      const pts: V3[] = [[cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, z0], [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, z0], [cx + Math.cos(a1) * topR, cy + Math.sin(a1) * topR, z1], [cx + Math.cos(a0) * topR, cy + Math.sin(a0) * topR, z1]];
      const c: V3 = [cx + n[0] * r, cy + n[1] * r, (z0 + z1) / 2];
      if (dot(n, sub(this.cam.spec.pos, c)) <= 0) continue;
      // Luz de cima e da esquerda: as faces viradas para lá ficam mais claras.
      const k = 0.62 + 0.3 * Math.max(0, n[1] * 0.7 - n[0] * 0.5);
      this.poly(pts, shade(color, k));
    }
    if (topR > 0.01) this.poly(Array.from({ length: sides }, (_, i) => [cx + Math.cos((i / sides) * Math.PI * 2) * topR, cy + Math.sin((i / sides) * Math.PI * 2) * topR, z1] as V3), top ?? color);
  }

  /** Uma linha grossa no mundo (cabos, treliças, grades). */
  line(a: V3, b: V3, color: string, thickness = 1, bias = 0): void {
    const pa = this.cam.project(a);
    const pb = this.cam.project(b);
    if (!pa || !pb) return;
    this.items.push({ depth: (pa[2] + pb[2]) / 2 - bias, draw: g => pixelLine(g, pa[0] | 0, pa[1] | 0, pb[0] | 0, pb[1] | 0, color, thickness) });
  }

  /** Um boneco do jogo com os pés no ponto dado, à escala da distância. */
  sprite(p: V3, pose: PoseName, look: Look, flip = false, withBall = false, shadow = true, bias = 0, depthAt?: V3, back = false): void {
    this.people.push({ p, tag: this.tag });
    const q = this.cam.project(p);
    if (!q) return;
    const order = depthAt ? (this.cam.project(depthAt)?.[2] ?? q[2]) : q[2];
    const base = this.cam.spec.focal / this.centre / GAME_RATIO;
    const k = Math.max(0.25, Math.min(1.8, base * Math.sqrt(this.centre / q[2])));
    this.items.push({
      depth: order - bias,
      draw: g => {
        if (shadow) drawShadow(g, q[0] | 0, q[1] | 0, Math.max(2, Math.round(7 * k)));
        drawSprite(g, pose, look, q[0] | 0, q[1] | 0, flip, back, withBall, undefined, k);
      },
    });
  }

  /** Texto de lâmpadas ou LED no ponto dado, de frente para a câmara. */
  label(p: V3, value: string, color: string, bias = 0.05): void {
    const q = this.cam.project(p);
    if (!q) return;
    this.items.push({ depth: q[2] - bias, draw: g => text(g, value, Math.round(q[0] - textWidth(value, 1) / 2), Math.round(q[1] - 2), color, 1) });
  }

  /** Um efeito que se pinta por cima de tudo o que está atrás dele (luz, nevoeiro). */
  overlay(depth: number, draw: (g: CanvasRenderingContext2D) => void): void {
    this.items.push({ depth, draw });
  }

  flush(g: CanvasRenderingContext2D): void {
    this.items.sort((a, b) => b.depth - a.depth);
    for (const item of this.items) item.draw(g);
  }
}

/** O chão e o céu, píxel a píxel: cada raio que desce acerta no plano z = 0. */
export function paintGround(g: CanvasRenderingContext2D, cam: Cam, floor: (x: number, y: number, dist: number) => Rgb, sky: (up: number, sx: number, sy: number) => Rgb): void {
  const { w, h } = cam;
  const image = g.createImageData(w, h);
  const data = image.data;
  const { f, r, u, focal, pos } = { f: cam.f, r: cam.r, u: cam.u, focal: cam.spec.focal, pos: cam.spec.pos };
  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      const a = sx + 0.5 - w / 2;
      const b = h / 2 - sy - 0.5;
      const dx = f[0] * focal + r[0] * a + u[0] * b;
      const dy = f[1] * focal + r[1] * a + u[1] * b;
      const dz = f[2] * focal + r[2] * a + u[2] * b;
      let c: Rgb;
      if (dz < 0) {
        const t = -pos[2] / dz;
        const x = pos[0] + dx * t;
        const y = pos[1] + dy * t;
        c = floor(x, y, t * Math.sqrt(dx * dx + dy * dy + dz * dz));
      } else c = sky(dz / Math.sqrt(dx * dx + dy * dy + dz * dz), sx, sy);
      const k = (sy * w + sx) * 4;
      data[k] = c[0];
      data[k + 1] = c[1];
      data[k + 2] = c[2];
      data[k + 3] = 255;
    }
  }
  g.putImageData(image, 0, 0);
}

/** Onde cai um ponto do chão: fora, margem, área, círculo central ou campo. */
export function zone(x: number, y: number, margin = 1.6): 'out' | 'apron' | 'key' | 'centre' | 'court' {
  if (x < -margin || x > 28 + margin || Math.abs(y) > 7.5 + margin) return 'out';
  if (x < 0 || x > 28 || Math.abs(y) > 7.5) return 'apron';
  const hx = x < 14 ? x : 28 - x;
  if (hx < 5.8 && Math.abs(y) < 2.45) return 'key';
  if ((x - 14) * (x - 14) + y * y < 1.8 * 1.8) return 'centre';
  return 'court';
}

/** As linhas do campo, traçadas por cima do chão como linhas de um píxel. */
export function courtLines(g: CanvasRenderingContext2D, cam: Cam, color: string): void {
  const path = (pts: readonly (readonly [number, number])[]): void => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = cam.project([pts[i]![0], pts[i]![1], 0]);
      const b = cam.project([pts[i + 1]![0], pts[i + 1]![1], 0]);
      if (a && b) pixelLine(g, a[0] | 0, a[1] | 0, b[0] | 0, b[1] | 0, color);
    }
  };
  const arc = (cx: number, cy: number, rad: number, from: number, to: number): [number, number][] => Array.from({ length: 33 }, (_, i) => {
    const t = from + ((to - from) * i) / 32;
    return [cx + Math.cos(t) * rad, cy + Math.sin(t) * rad];
  });
  path([[0, -7.5], [28, -7.5], [28, 7.5], [0, 7.5], [0, -7.5]]);
  path([[14, -7.5], [14, 7.5]]);
  path(arc(14, 0, 1.8, 0, Math.PI * 2));
  const theta = Math.asin(6.6 / 6.75);
  for (const side of [1, -1]) {
    const X = (x: number): number => (side === 1 ? x : 28 - x);
    const mirror = (pts: [number, number][]): [number, number][] => pts.map(([x, y]) => [X(x), y]);
    path(mirror([[0, -2.45], [5.8, -2.45], [5.8, 2.45], [0, 2.45]]));
    path(mirror(arc(5.8, 0, 1.8, -Math.PI / 2, Math.PI / 2)));
    path(mirror([[0, -6.6], [2.99, -6.6]]));
    path(mirror([[0, 6.6], [2.99, 6.6]]));
    path(mirror(arc(1.575, 0, 6.75, -theta, theta)));
  }
}

/** Um cesto: poste, braço, tabela, aro e rede. */
export function hoop(s: Scene, hx: number, pole: Rgb, board = '#f4f4ee'): void {
  const out = hx < 14 ? -1 : 1;
  const bx = hx + out * 0.375;
  const px = hx + out * 1.7;
  s.box(px - 0.16, px + 0.16, -0.16, 0.16, 0, 3.55, pole);
  s.box(Math.min(px, bx), Math.max(px, bx), -0.08, 0.08, 3.4, 3.55, pole);
  s.box(px - 0.5, px + 0.5, -0.5, 0.5, 0, 0.25, shade(pole, 0.8));
  s.poly([[bx, -0.9, 2.9], [bx, 0.9, 2.9], [bx, 0.9, 3.95], [bx, -0.9, 3.95]], '#1b2230', 0, [bx, 0, 3.4]);
  s.poly([[bx, -0.84, 2.95], [bx, 0.84, 2.95], [bx, 0.84, 3.9], [bx, -0.84, 3.9]], board, 0.01, [bx, 0, 3.4]);
  s.poly([[bx, -0.3, 3.05], [bx, 0.3, 3.05], [bx, 0.3, 3.5], [bx, -0.3, 3.5]], '#e8622a', 0.02, [bx, 0, 3.4]);
  s.poly([[bx, -0.24, 3.1], [bx, 0.24, 3.1], [bx, 0.24, 3.45], [bx, -0.24, 3.45]], board, 0.03, [bx, 0, 3.4]);
  const rimAt: V3 = [hx, 0, 3.05];
  const c = s.cam.project(rimAt);
  if (!c) return;
  const ring = Array.from({ length: 24 }, (_, i) => s.cam.project([hx + Math.cos((i / 24) * Math.PI * 2) * 0.28, Math.sin((i / 24) * Math.PI * 2) * 0.28, 3.05]));
  const net = Array.from({ length: 6 }, (_, i) => [s.cam.project([hx + Math.cos((i / 6) * Math.PI * 2) * 0.28, Math.sin((i / 6) * Math.PI * 2) * 0.28, 3.05]), s.cam.project([hx + Math.cos((i / 6) * Math.PI * 2) * 0.16, Math.sin((i / 6) * Math.PI * 2) * 0.16, 2.62])] as const);
  s.overlay(c[2] - 0.05, g => {
    for (const [a, b] of net) if (a && b) pixelLine(g, a[0] | 0, a[1] | 0, b[0] | 0, b[1] | 0, '#f8f6ee');
    g.fillStyle = '#e8622a';
    for (const p of ring) if (p) g.fillRect(p[0] | 0, p[1] | 0, 2, 2);
  });
}

/* ---------- Bonecos ---------- */

export const look = (seed: number, kit: KitName): Look => {
  // Os índices de pele e cabelo não podem ser negativos.
  const i = Math.abs(Math.round(seed));
  const height = 168 + ((i * 53) % 44);
  return { kit, skin: (i * 7) % 4, hair: (i * 5) % 6, style: (i * 3) % 5, build: buildOf(height, 66 + ((i * 29) % 34), 50), face: i * 131, ...pixelsForHeight(height) };
};

/** Um adepto: dois em cada três vestem a cor da casa, o resto roupa de rua. */
export const fan = (n: number, shirts: readonly string[]): Look => {
  const base = look(n, n % 2 ? 'fan' : 'fan2');
  if (n % 3 === 0 || shirts.length === 0) return { ...base, street: true };
  const jersey = shirts[n % shirts.length]!;
  return { ...base, street: true, custom: { id: jersey, name: jersey, jersey, second: jersey, pattern: 'plain', trim: jersey, shorts: '#2c3345' } };
};

const PLAYERS: readonly (readonly [number, number, PoseName, KitName])[] = [
  [8.6, 0.6, 'drib0', 'blue'], [5.2, -5, 'idle', 'blue'], [4.4, 4.6, 'run0', 'blue'], [3.2, 2.4, 'idle', 'blue'], [2.4, -1.8, 'idle', 'blue'],
  [7.4, 0.2, 'defend', 'cream'], [4.4, -4, 'defend', 'cream'], [3.8, 3.8, 'defend', 'cream'], [2.8, 1.6, 'defend', 'cream'], [1.9, -1, 'defend', 'cream'],
  [10.6, 4.4, 'idle', 'referee'],
];

/** A mesma jogada em todos os cenários: cinco contra cinco no meio-campo da esquerda, e o árbitro. */
export function players(s: Scene): void {
  PLAYERS.forEach(([x, y, pose, kit], i) => s.sprite([x, y, 0], pose, look(i + 40, kit), false, pose === 'drib0'));
}

/**
 * Uma bancada em degraus ao longo do x (lateral) ou do y (topo). `out` é o sentido em que sobe (+1 ou -1).
 * Cada degrau tem espelho e piso; os corredores de escada partem a bancada em blocos e ficam sem gente.
 */
export interface Stand {
  axis: 'x' | 'y';
  from: number;
  to: number;
  front: number;
  out: 1 | -1;
  rows: number;
  depth: number;
  rise: number;
  base?: number;
  seat: Rgb;
  seat2?: Rgb;
  riser: Rgb;
  aisle?: Rgb;
  aisleEvery?: number;
  fill: number;
  shirts: readonly string[];
  /** Escurece as filas de cima, para a bancada cair para o escuro. */
  fade?: number;
  pose?: PoseName;
  /**
   * Bancada em qualquer direção (cantos em diagonal ou curvos): `o` é o canto da frente onde a fila começa, `u` o sentido da
   * fila e `n` o sentido em que a bancada sobe e recua. Com `basis`, `front` e `out` não contam (a frente está em `o`).
   */
  basis?: { o: readonly [number, number]; u: readonly [number, number]; n: readonly [number, number] };
  /** Quanto cada ponta da fila cresce por metro de recuo: as filas de um canto alargam ao subir, como num anel. */
  grow?: number;
}

export function stand(s: Scene, st: Stand, salt = 1): void {
  const before = s.tag;
  s.tag = 'público da bancada';
  const base = st.base ?? 0;
  const bs = st.basis;
  const P = (along: number, across: number, z: number): V3 =>
    bs ? [bs.o[0] + bs.u[0] * along + bs.n[0] * across, bs.o[1] + bs.u[1] * along + bs.n[1] * across, z] : st.axis === 'x' ? [along, across, z] : [across, along, z];
  const front = bs ? 0 : st.front;
  const out = bs ? 1 : st.out;
  const grow = st.grow ?? 0;
  // As pontas da fila alargam com a distância à frente; os cortes de corredor do meio ficam onde estão.
  const ext = (c: number, across: number): number => (c === st.from ? c - grow * Math.abs(across - front) : c === st.to ? c + grow * Math.abs(across - front) : c);
  const every = st.aisleEvery ?? 0;
  let n = salt * 1000;
  for (let k = 0; k < st.rows; k++) {
    const a = front + out * k * st.depth;
    const b = front + out * (k + 1) * st.depth;
    const z0 = base + k * st.rise;
    const z1 = base + (k + 1) * st.rise;
    const dim = 1 - (st.fade ?? 0) * (k / Math.max(1, st.rows - 1));
    const seat = shade(k % 2 && st.seat2 ? st.seat2 : st.seat, dim);
    const riser = shade(st.riser, dim);
    const rowDepthAt = P((st.from + st.to) / 2, a, z1);
    const [ya, yb] = [Math.min(a, b), Math.max(a, b)];
    if (!bs) s.solids.push({ b: st.axis === 'x' ? [st.from, st.to, ya, yb, base, z1] : [ya, yb, st.from, st.to, base, z1], tag: 'bancada' });
    // Os blocos entre corredores.
    const cuts: [number, number, boolean][] = [];
    if (every > 0) {
      for (let x = st.from; x < st.to; x += every) {
        const end = Math.min(st.to, x + every);
        cuts.push([x, Math.max(x, end - 0.9), false]);
        if (end - 0.9 > x && end < st.to) cuts.push([end - 0.9, end, true]);
      }
    } else cuts.push([st.from, st.to, false]);
    for (const [c0, c1, isAisle] of cuts) {
      const top = isAisle ? shade(st.aisle ?? [160, 160, 156], dim) : seat;
      const nTop: V3 = [0, 0, 1];
      const nFront: V3 = bs ? [-bs.n[0], -bs.n[1], 0] : st.axis === 'x' ? [0, -st.out, 0] : [-st.out, 0, 0];
      s.face([P(ext(c0, a), a, z1), P(ext(c1, a), a, z1), P(ext(c1, b), b, z1), P(ext(c0, b), b, z1)], nTop, top, 0, rowDepthAt);
      s.face([P(ext(c0, a), a, z0), P(ext(c1, a), a, z0), P(ext(c1, a), a, z1), P(ext(c0, a), a, z1)], nFront, isAisle ? shade(top, 0.8) : riser, 0, rowDepthAt);
      if (isAisle) continue;
      const mid = (a + b) / 2;
      for (let x = ext(c0, mid) + 0.45 + (k % 2) * 0.3; x < ext(c1, mid) - 0.3; x += 0.78) {
        n++;
        if (hash(n, salt) >= st.fill) continue;
        s.sprite(P(x, mid, z1), st.pose ?? 'sit', fan(n, st.shirts), bs ? bs.n[0] > 0 : st.axis === 'x' ? false : st.out < 0, false, false, 0.02, rowDepthAt);
      }
    }
  }
  s.tag = before;
}

/**
 * Verifica sobreposições: bonecos dentro de volumes, dois bonecos no mesmo sítio, e bancos ou bancadas a atravessar outra peça.
 * Um boneco pode estar em cima de uma peça (sentado no banco, no parapeito); conta-se como dentro quando o corpo, de 1,6 m,
 * a atravessa.
 */
export function overlaps(s: Scene): string[] {
  const out: string[] = [];
  const f = (v: number): string => v.toFixed(1);
  for (const { p, tag } of s.people) {
    for (const { b, tag: what } of s.solids) {
      const [x0, x1, y0, y1, z0, z1] = b;
      const inside = p[0] > x0 - 0.2 && p[0] < x1 + 0.2 && p[1] > y0 - 0.15 && p[1] < y1 + 0.15 && p[2] < z1 - 0.05 && p[2] + 1.6 > z0;
      if (inside && !(what === 'bancada' && tag === 'público da bancada')) out.push(`${tag} em (${f(p[0])}, ${f(p[1])}, ${f(p[2])}) dentro de ${what} [${b.map(f).join(', ')}]`);
    }
  }
  s.people.forEach((a, i) => s.people.slice(i + 1).forEach(b => {
    const d = Math.sqrt((a.p[0] - b.p[0]) ** 2 + (a.p[1] - b.p[1]) ** 2);
    if (d < 0.45 && Math.abs(a.p[2] - b.p[2]) < 1) out.push(`${a.tag} e ${b.tag} juntos em (${f(a.p[0])}, ${f(a.p[1])})`);
  }));
  const watched = new Set(['banco', 'bancada']);
  s.solids.forEach((a, i) => s.solids.slice(i + 1).forEach(b => {
    if (!watched.has(a.tag) && !watched.has(b.tag)) return;
    if (a.tag === b.tag) return;
    const e = 0.01;
    const hit = a.b[0] < b.b[1] - e && b.b[0] < a.b[1] - e && a.b[2] < b.b[3] - e && b.b[2] < a.b[3] - e && a.b[4] < b.b[5] - e && b.b[4] < a.b[5] - e;
    if (hit) out.push(`${a.tag} [${a.b.map(f).join(', ')}] atravessa ${b.tag} [${b.b.map(f).join(', ')}]`);
  }));
  return out;
}
