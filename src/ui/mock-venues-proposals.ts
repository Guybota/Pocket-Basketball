// Os cenários propostos. Cada um é um tema do motor do campo, mais o que se desenha por cima (ecrãs, faixas, luz).
import { STAND, THEMES, fillPolygon, type Camera, type CourtTheme } from './art/court.ts';
import { text, textWidth } from './art/font.ts';
import type { Proposal } from './mock-venues.ts';

type Rgb = readonly [number, number, number];
const STREET = THEMES[0]!;
const SCHOOL = THEMES[1]!;
const HALL = THEMES[2]!;
const ARENA = THEMES[3]!;

const h2 = (a: number, b: number): number => {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const frac = (v: number): number => ((v % 1) + 1) % 1;
const hex = (c: string): Rgb => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const shade = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];
const add = (c: Rgb, d: number): Rgb => [c[0] + d, c[1] + d, c[2] + d];
const css = (c: Rgb, a = 1): string => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

type Point3 = readonly [number, number, number];
const quad = (g: CanvasRenderingContext2D, cam: Camera, pts: readonly Point3[], color: string): void => fillPolygon(g, pts.map(([x, y, z]) => cam.project(x, y, z)), color);
/** A parede do fundo à altura z, contando com o recuo da bancada. */
const farWall = (theme: CourtTheme, z: number): number => STAND.y - theme.slope * z;

/** Um painel pendurado ou colado à parede, com texto de lâmpadas no meio. */
function panel(g: CanvasRenderingContext2D, cam: Camera, x0: number, x1: number, y: number, z0: number, z1: number, frame: string, face: string, label: string, ink: string): void {
  quad(g, cam, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], frame);
  const m = 0.18;
  quad(g, cam, [[x0 + m, y + 0.01, z0 + m], [x1 - m, y + 0.01, z0 + m], [x1 - m, y + 0.01, z1 - m], [x0 + m, y + 0.01, z1 - m]], face);
  const [cx, cy] = cam.project((x0 + x1) / 2, y, (z0 + z1) / 2);
  text(g, label, Math.round(cx - textWidth(label, 1) / 2), Math.round(cy - 2), ink, 1);
}

/** O cubo de ecrãs pendurado por cima do meio-campo. */
function cube(g: CanvasRenderingContext2D, cam: Camera, x: number, y: number, z0: number, z1: number, half: number, screen: string, ring: string): void {
  const [x0, x1, y0, y1] = [x - half, x + half, y - half, y + half];
  // Os cabos até ao teto.
  for (const [cx, cy] of [[x0 + 0.2, y0 + 0.2], [x1 - 0.2, y0 + 0.2]] as const) {
    const a = cam.project(cx, cy, z1);
    const b = cam.project(cx, cy, z1 + 6);
    g.fillStyle = '#2a2f3c';
    g.fillRect(a[0] | 0, Math.min(a[1], b[1]) | 0, 1, Math.abs(a[1] - b[1]) | 0);
  }
  quad(g, cam, [[x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0]], '#0d0f16');
  quad(g, cam, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], '#151925');
  quad(g, cam, [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]], '#10131c');
  // Os ecrãs: um em cada face, com o anel de LED por baixo.
  quad(g, cam, [[x0 + 0.2, y1 + 0.01, z0 + 0.5], [x1 - 0.2, y1 + 0.01, z0 + 0.5], [x1 - 0.2, y1 + 0.01, z1 - 0.15], [x0 + 0.2, y1 + 0.01, z1 - 0.15]], screen);
  quad(g, cam, [[x0 - 0.01, y1 - 0.2, z0 + 0.5], [x0 - 0.01, y0 + 0.2, z0 + 0.5], [x0 - 0.01, y0 + 0.2, z1 - 0.15], [x0 - 0.01, y1 - 0.2, z1 - 0.15]], screen);
  quad(g, cam, [[x0, y1 + 0.02, z0 + 0.1], [x1, y1 + 0.02, z0 + 0.1], [x1, y1 + 0.02, z0 + 0.35], [x0, y1 + 0.02, z0 + 0.35]], ring);
  quad(g, cam, [[x0 - 0.02, y1, z0 + 0.1], [x0 - 0.02, y0, z0 + 0.1], [x0 - 0.02, y0, z0 + 0.35], [x0 - 0.02, y1, z0 + 0.35]], ring);
  const [sx, sy] = cam.project(x, y1, (z0 + z1) / 2 + 0.2);
  text(g, '54-48', Math.round(sx - textWidth('54-48', 1) / 2), Math.round(sy - 2), '#fbf6e2', 1);
}

/** Faixas penduradas no teto (títulos, camisolas retiradas). */
function hanging(g: CanvasRenderingContext2D, cam: Camera, y: number, z: number, xs: readonly number[], cloth: string, trim: string, labels: readonly string[]): void {
  xs.forEach((x, i) => {
    quad(g, cam, [[x - 0.7, y, z - 1.9], [x + 0.7, y, z - 1.9], [x + 0.7, y, z], [x - 0.7, y, z]], trim);
    quad(g, cam, [[x - 0.6, y + 0.01, z - 1.75], [x + 0.6, y + 0.01, z - 1.75], [x + 0.6, y + 0.01, z - 0.1], [x - 0.6, y + 0.01, z - 0.1]], cloth);
    const label = labels[i % labels.length]!;
    const [cx, cy] = cam.project(x, y, z - 0.9);
    text(g, label, Math.round(cx - textWidth(label, 1) / 2), Math.round(cy - 2), trim, 1);
  });
}

/** Focos: cones de luz suaves do teto até ao chão, somados por cima. */
function cones(g: CanvasRenderingContext2D, cam: Camera, spots: readonly (readonly [number, number])[], color: Rgb, alpha: number): void {
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const [x, y] of spots) {
    const top = cam.project(x, y, 13);
    const l = cam.project(x - 2.2, y, 0);
    const r = cam.project(x + 2.2, y, 0);
    const n = cam.project(x, y - 1.6, 0);
    const f = cam.project(x, y + 1.6, 0);
    fillPolygon(g, [top, l, f, r], css(color, alpha));
    fillPolygon(g, [l, n, r, f], css(color, alpha));
  }
  g.restore();
}

/** Cabeças em silhueta na borda de baixo: a primeira fila do lado da câmara. */
function heads(g: CanvasRenderingContext2D, cam: Camera, color: string): void {
  g.fillStyle = color;
  for (let i = 0; i < 18; i++) {
    const x = Math.round(i * 29 + h2(i, 4) * 12 - 6);
    const r = 8 + Math.round(h2(i, 9) * 4);
    const y = cam.height - 4 + Math.round(h2(i, 2) * 4);
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.round(Math.sqrt(r * r - dy * dy));
      g.fillRect(x - w, y - r + dy, w * 2, 1);
    }
    g.fillRect(x - r - 6, y + 2, (r + 6) * 2, 12);
  }
}

/** A mesa de oficiais e os dois bancos, do lado de lá. */
function bench(g: CanvasRenderingContext2D, cam: Camera, table: string, front: string): void {
  const y0 = -9.6;
  const y1 = -8.7;
  quad(g, cam, [[11.5, y0, 0.8], [16.5, y0, 0.8], [16.5, y1, 0.8], [11.5, y1, 0.8]], table);
  quad(g, cam, [[11.5, y1, 0], [16.5, y1, 0], [16.5, y1, 0.8], [11.5, y1, 0.8]], front);
  for (const x of [4.5, 18.5]) {
    quad(g, cam, [[x, y0, 0.45], [x + 5, y0, 0.45], [x + 5, y1, 0.45], [x, y1, 0.45]], '#3a4152');
    quad(g, cam, [[x, y1, 0], [x + 5, y1, 0], [x + 5, y1, 0.45], [x, y1, 0.45]], '#262b38');
  }
}

/** Prédios de um bairro, para os panos de fundo ao ar livre. */
function buildings(u: number, z: number, width: number, minH: number, maxH: number, tones: readonly Rgb[], windowColor: Rgb, salt: number): Rgb | null {
  const block = Math.floor(u / width);
  const height = minH + h2(block, salt) * (maxH - minH);
  if (z >= height) return null;
  const tone = tones[Math.floor(h2(block, salt + 1) * tones.length)]!;
  const lu = frac(u / width);
  if (lu < 0.04) return shade(tone, 0.75);
  const win = frac(lu * width * 0.9) < 0.45 && frac(z * 1.2) > 0.35 && frac(z * 1.2) < 0.8 && z > 0.8 && z < height - 0.4 && lu > 0.1 && lu < 0.92;
  if (win) return h2(Math.floor(u * 0.9 * 10), Math.floor(z * 1.2)) < 0.2 ? shade(windowColor, 0.7) : windowColor;
  return z > height - 0.25 ? shade(tone, 0.8) : tone;
}

const open = (base: Partial<CourtTheme>): CourtTheme => ({ ...STREET, ...base });

/* ---------- Rua ---------- */

const cage = open({
  name: 'A Gaiola',
  floor: (x, y, n) => {
    const patch = h2(Math.floor(x * 0.7), Math.floor(y * 0.7)) * 10;
    return add([47, 93, 158], n * 5 - patch);
  },
  paint: [224, 122, 63],
  center: [224, 122, 63],
  line: n => (n > 0.25 ? [240, 236, 226] : [176, 188, 206]),
  apron: n => add([58, 64, 74], n * 4),
  wall: (u, z, t) => buildings(u + 7, z, 6.5, 4, 8.5, [[138, 59, 46], [150, 82, 58], [116, 54, 44], [126, 70, 52]], [206, 220, 226], 3) ?? t.sky!,
  sky: [176, 212, 236],
  wallColor: [176, 212, 236],
});

const seaside = open({
  name: 'Beira-Mar',
  floor: (x, y, n) => {
    const joint = frac(x / 3) < 0.02 || frac(y / 3) < 0.03;
    return joint ? [176, 160, 136] : add([222, 206, 178], n * 6);
  },
  paint: [226, 104, 74],
  center: [226, 104, 74],
  line: () => [250, 244, 232],
  apron: n => add([196, 180, 150], n * 4),
  wall: (u0, z, t) => {
    const u = u0 + 3;
    // O sol a pôr-se no mar, as palmeiras em silhueta, e o céu do laranja ao roxo.
    const palm = Math.floor(u / 9);
    const pu = frac(u / 9) * 9 - 4.5 + h2(palm, 1) * 3;
    const ph = 5 + h2(palm, 2) * 2;
    if (h2(palm, 3) < 0.7) {
      const lean = (z / ph) * 0.8;
      if (z < ph && Math.abs(pu - lean) < 0.14) return [59, 44, 74];
      const dx = pu - 0.8;
      const dz = z - ph;
      if (dz > -0.9 && dz < 0.4 && Math.abs(dx) < 2.2 - Math.abs(dz + 0.2) * 1.6 && (Math.abs(dx) * 3 + frac(dx * 1.5) * 2 > -dz * 2)) return [59, 44, 74];
    }
    const sx = u0 - 18;
    const sz = z - 2.4;
    if (sx * sx + sz * sz < 2) return z < 1.3 ? [252, 190, 120] : [255, 222, 150];
    if (z < 1.3) {
      const glint = Math.abs(sx) < 1.6 - z && frac(z * 9 + h2(Math.floor(u0 * 3), 4)) < 0.4;
      if (glint) return [252, 196, 128];
      return frac(z * 6 + h2(Math.floor(u0), 5) * 0.3) < 0.15 ? [70, 112, 140] : [46, 94, 126];
    }
    return mix([246, 166, 96], [118, 82, 132], Math.min(1, (z - 1.3) / 9));
  },
  sky: [118, 82, 132],
  wallColor: [246, 166, 96],
  tint: [1.06, 0.94, 0.86],
  hour: 'evening',
});

const BLOCKS: readonly Rgb[] = [hex('#2a52be'), hex('#e63b2e'), hex('#f5c518'), hex('#f7f3e8')];
const blocks = open({
  name: 'Pátio de Cor',
  floor: x => BLOCKS[Math.floor(x / 3.5) % BLOCKS.length]!,
  paint: hex('#1c1c24'),
  center: hex('#f5c518'),
  line: () => [250, 248, 240],
  apron: () => hex('#1c1c24'),
  wall: (u, z, t) => {
    const b = buildings(u, z, 5, 5, 9, BLOCKS, [28, 28, 36], 8);
    return b ?? t.sky!;
  },
  sky: [190, 222, 240],
  wallColor: [190, 222, 240],
});

const lisbon = open({
  name: 'Miradouro',
  floor: (x, y, n) => add([181, 70, 58], n * 6 - h2(Math.floor(x), Math.floor(y)) * 6),
  paint: [146, 50, 44],
  center: [146, 50, 44],
  line: () => [246, 240, 228],
  apron: n => add([120, 112, 104], n * 4),
  wall: (u, z, t) => {
    // A cidade a descer até ao rio, com telhados de barro, e a outra margem ao longe.
    const row = Math.floor(z / 1.3);
    if (z < 5.2) {
      const w = 2.4 + h2(row, 1) * 1.2;
      const house = Math.floor((u + row * 1.1) / w);
      const lu = frac((u + row * 1.1) / w);
      const lz = frac(z / 1.3);
      if (lz > 0.66) return h2(house, row) < 0.5 ? [200, 108, 70] : [178, 90, 58];
      if (lu < 0.05) return [176, 170, 158];
      const wall: Rgb = h2(house, row + 9) < 0.65 ? [242, 236, 222] : h2(house, row) < 0.5 ? [242, 206, 112] : [150, 186, 210];
      return lu > 0.3 && lu < 0.45 && lz > 0.2 && lz < 0.5 ? [70, 86, 110] : wall;
    }
    if (z < 6.4) return frac(u * 0.4 + z * 2) < 0.06 ? [176, 208, 228] : [127, 167, 201];
    if (z < 7.4 + Math.sin(u * 0.2) * 0.4) return z < 6.9 && frac(u * 0.8) < 0.25 ? [214, 208, 196] : [150, 162, 120];
    return t.sky!;
  },
  sky: [170, 210, 236],
  wallColor: [170, 210, 236],
  tint: [1.03, 1.02, 0.96],
});

/* ---------- Escola ---------- */

const oldGym: CourtTheme = {
  ...SCHOOL,
  name: 'Ginásio Antigo',
  floor: (_x, _y, _n, plank) => {
    const b = 160 + plank * 18;
    return [b + 30, b - 26, b - 92];
  },
  paint: [46, 78, 122],
  center: [46, 78, 122],
  line: () => [241, 230, 200],
  apron: () => [122, 74, 34],
  wall: (u, z) => {
    if (z < 1.4) return frac(u * 2.5) < 0.08 ? [96, 58, 28] : z > 1.3 ? [150, 100, 54] : [122, 74, 34];
    const cell = frac(u / 3);
    const dx = (cell - 0.5) / 0.28;
    if (Math.abs(dx) < 1 && z > 3.2 && z < 6.2 + (1 - dx * dx) * 0.7) {
      const mullion = Math.abs(dx) < 0.07 || frac(z / 0.8) < 0.06;
      return mullion ? [236, 226, 200] : z > 5.4 ? [214, 236, 246] : [186, 222, 240];
    }
    if (z > 8.2) return frac(u / 3) < 0.12 ? [74, 50, 34] : frac(z * 2) < 0.15 ? [104, 70, 44] : [128, 88, 56];
    return [241, 230, 200];
  },
  wallColor: [241, 230, 200],
  windows: undefined,
  slope: 0.6,
  reflection: 0.34,
  ambient: 0.98,
  spot: 0.06,
  boards: [],
  crowd: { from: 1, to: 3.4, density: 0.32, seats: [[46, 78, 122], [38, 66, 104]], shirts: [[200, 70, 60]], dim: 1 },
};

const sportsHall: CourtTheme = {
  ...SCHOOL,
  name: 'Pavilhão de Linhas',
  floor: (x, y, n) => {
    const base = add([169, 196, 216], n * 4);
    const on = (v: number, at: number): boolean => Math.abs(v - at) < 0.05;
    // As linhas das outras modalidades: vólei a vermelho, badminton a verde, futsal a amarelo.
    if (Math.abs(y) < 4.55 && x > 4.95 && (on(x, 5) || on(x, 11))) return [224, 74, 58];
    if (x > 5 && on(Math.abs(y), 4.5)) return [224, 74, 58];
    if (x > 0.6 && x < 7.3 && (on(Math.abs(y), 3.05) || on(Math.abs(y), 2.6))) return [60, 140, 92];
    if (Math.abs(y) < 3.05 && x > 0.6 && (on(x, 0.6) || on(x, 7.3) || on(x, 2.6))) return [60, 140, 92];
    const r = Math.sqrt((14 - x) * (14 - x) + y * y);
    if (Math.abs(r - 3) < 0.05) return [242, 200, 60];
    return base;
  },
  paint: [72, 124, 168],
  center: [169, 196, 216],
  line: () => [250, 250, 246],
  apron: () => [128, 160, 186],
  wall: (u, z) => {
    if (z < 1.2) return z > 1.1 ? [44, 100, 70] : [60, 122, 90];
    if (z > 5.2 && z < 5.9) return frac(u / 1.5) < 0.06 ? [220, 220, 214] : [196, 222, 236];
    if (z > 7) return frac(u / 2) < 0.1 ? [150, 150, 146] : [206, 206, 200];
    return [236, 232, 222];
  },
  wallColor: [236, 232, 222],
  windows: undefined,
  slope: 0.4,
  reflection: 0.06,
  boards: [],
  crowd: { from: 1, to: 2.6, density: 0.2, seats: [[176, 176, 170], [160, 160, 154]], shirts: [[60, 110, 170]], dim: 1 },
};

/* ---------- Municipal ---------- */

const tinHall: CourtTheme = {
  ...HALL,
  name: 'Pavilhão de Chapa',
  floor: (x, y, n) => add([47, 107, 79], n * 4 - h2(Math.floor(x * 2), Math.floor(y * 2)) * 3),
  paint: [199, 54, 47],
  center: [199, 54, 47],
  line: () => [240, 237, 228],
  apron: () => [34, 82, 60],
  wall: (u, z) => {
    if (z > 12) return frac(u / 4) < 0.08 ? [60, 62, 70] : [92, 94, 102];
    return frac(u * 2.5) < 0.5 ? [199, 54, 47] : [172, 44, 40];
  },
  wallColor: [199, 54, 47],
  slope: 0.9,
  stain: false,
  reflection: 0.05,
  ambient: 0.92,
  spot: 0.1,
  boards: [[242, 179, 61], [240, 237, 228], [47, 107, 79]],
  boardText: [27, 34, 48],
  crowd: { from: 1, to: 4.2, density: 0.55, seats: [[156, 156, 148], [144, 144, 136]], shirts: [[199, 54, 47]], dim: 0.9 },
};

const orangeHall: CourtTheme = {
  ...HALL,
  name: 'Palácio Laranja',
  floor: (_x, _y, _n, plank) => {
    const b = 208 + plank * 14;
    return [b + 16, b - 80, b - 150];
  },
  paint: [45, 93, 168],
  center: [45, 93, 168],
  line: () => [245, 239, 224],
  apron: () => [32, 66, 124],
  wall: (_u, z) => (frac(z / 1.2) < 0.08 ? [150, 146, 136] : [184, 180, 170]),
  wallColor: [184, 180, 170],
  slope: 0.8,
  reflection: 0.16,
  boards: [[192, 48, 42], [245, 239, 224]],
  boardText: [27, 34, 48],
  crowd: { from: 1, to: 9, density: 0.62, seats: [[176, 172, 162], [160, 156, 146]], shirts: [[45, 93, 168]], dim: 0.9 },
};

/* ---------- Arenas ---------- */

const cauldron: CourtTheme = {
  ...ARENA,
  name: 'Caldeirão',
  floor: (_x, _y, _n, plank) => {
    const b = 222 + plank * 10;
    return [b + 10, b - 6, b - 40];
  },
  paint: [30, 138, 74],
  center: [30, 138, 74],
  line: () => [252, 250, 242],
  apron: () => [15, 61, 37],
  wallColor: [12, 36, 24],
  boards: [[30, 138, 74], [242, 194, 48]],
  boardText: [252, 250, 242],
  banner: [[30, 138, 74], [244, 239, 224]],
  ambient: 0.82,
  spot: 0.3,
  reflection: 0.2,
  crowd: { from: 1, to: 16, density: 0.95, seats: [[30, 138, 74], [24, 112, 60]], shirts: [], dim: 0.78 },
};

const darkArena: CourtTheme = {
  ...ARENA,
  name: 'Arena às Escuras',
  floor: (_x, _y, n, plank) => {
    const b = 172 + plank * 12 + (n > 0.5 ? 3 : 0);
    return [b + 46, b - 12, b - 80];
  },
  paint: [222, 64, 56],
  center: [222, 64, 56],
  line: () => [252, 246, 236],
  apron: () => [16, 16, 22],
  wallColor: [8, 8, 12],
  boards: [[222, 64, 56], [16, 16, 22]],
  boardText: [252, 246, 236],
  ambient: 0.42,
  spot: 0.9,
  reflection: 0.42,
  crowd: { from: 1, to: 16, density: 0.95, seats: [[26, 28, 38], [22, 24, 32]], shirts: [], dim: 0.3 },
};

const checker: CourtTheme = {
  ...ARENA,
  name: 'Parquet Clássico',
  floor: (x, y) => {
    const bx = Math.floor(x / 1.5);
    const by = Math.floor((y + 7.5) / 1.5);
    const odd = (bx + by) % 2 === 1;
    const stripe = odd ? frac(y / 0.3) < 0.1 : frac(x / 0.3) < 0.1;
    const base: Rgb = odd ? [196, 140, 76] : [176, 122, 60];
    return stripe ? shade(base, 0.86) : base;
  },
  seams: false,
  paint: [30, 107, 60],
  center: [30, 107, 60],
  line: () => [244, 238, 221],
  apron: () => [30, 107, 60],
  wallColor: [40, 28, 26],
  boards: [[244, 238, 221], [30, 107, 60]],
  boardText: [40, 28, 26],
  ambient: 0.78,
  spot: 0.32,
  reflection: 0.24,
  crowd: { from: 1, to: 16, density: 0.9, seats: [[120, 44, 42], [104, 38, 36]], shirts: [], dim: 0.62 },
};

const neon: CourtTheme = {
  ...ARENA,
  name: 'Noite de Final',
  floor: (_x, _y, _n, plank) => add([30, 26, 54], plank * 8),
  paint: [224, 56, 138],
  center: [46, 196, 214],
  line: () => [245, 242, 250],
  apron: () => [14, 12, 28],
  wallColor: [10, 8, 20],
  boards: [[46, 196, 214], [224, 56, 138]],
  boardText: [14, 12, 28],
  ambient: 0.9,
  spot: 0.25,
  reflection: 0.5,
  crowd: { from: 1, to: 16, density: 0.95, seats: [[30, 26, 50], [24, 20, 42]], shirts: [], dim: 0.5 },
};

/* ---------- As propostas ---------- */

export const PROPOSALS: readonly Proposal[] = [
  {
    id: 'gaiola', title: 'A Gaiola', division: 'Liga Iniciados · rua', theme: cage, tune: { lookY: -4 }, fans: 0,
    note: 'Piso azul com a área cor de laranja, rede alta e prédios de tijolo. O campo de rua das grandes cidades, com cores fortes em vez de alcatrão cinzento.',
  },
  {
    id: 'beira-mar', title: 'Beira-Mar', division: 'Liga Iniciados · rua', theme: seaside, tune: { lookY: -4 },
    note: 'Betão claro junto ao mar ao pôr do sol, palmeiras em silhueta e o sol a refletir na água. O fundo diz onde estamos.',
  },
  {
    id: 'patio', title: 'Pátio de Cor', division: 'Liga Iniciados · rua', theme: blocks, tune: { lookY: -4 },
    note: 'Um campo entre prédios, com o chão e as fachadas pintados em blocos lisos de cor. Muito legível em pixel art.',
  },
  {
    id: 'miradouro', title: 'Miradouro', division: 'Liga Iniciados · rua', theme: lisbon, tune: { lookY: -4 },
    note: 'Polidesportivo de piso vermelho num alto, com telhados de barro a descer até ao rio. Uma rua portuguesa.',
  },
  {
    id: 'ginasio', title: 'Ginásio Antigo', division: 'Liga Avançada · escola', theme: oldGym,
    back: (g, cam) => {
      // Faixas de sol que entram pelas janelas altas e caem no soalho.
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let x = 1.5; x < 30; x += 3) {
        const wy = farWall(oldGym, 6);
        fillPolygon(g, [cam.project(x - 0.8, wy, 6.4), cam.project(x + 0.8, wy, 6.4), cam.project(x + 2.6, -3, 0), cam.project(x + 1, -3, 0)], 'rgba(255,236,190,0.07)');
        fillPolygon(g, [cam.project(x + 0.2, -6.5, 0), cam.project(x + 1.8, -6.5, 0), cam.project(x + 2.6, -3, 0), cam.project(x + 1, -3, 0)], 'rgba(255,230,170,0.08)');
      }
      g.restore();
    },
    note: 'Soalho cor de mel escuro e brilhante, janelas altas em arco, lambrim de madeira e bancada de tábuas azuis. O sol entra às faixas.',
  },
  {
    id: 'linhas', title: 'Pavilhão de Linhas', division: 'Liga Avançada · escola', theme: sportsHall,
    note: 'Piso sintético azul-claro com as linhas de vólei, badminton e futsal por cima das do basquetebol, rodapé verde e janelas em fita. O pavilhão de qualquer escola portuguesa.',
  },
  {
    id: 'chapa', title: 'Pavilhão de Chapa', division: 'Pro Liga 2 · municipal', theme: tinHall, fanShirts: ['#c7362f', '#f0ede4'],
    back: (g, cam) => {
      const y = farWall(tinHall, 5.6);
      panel(g, cam, 11, 17, y, 4.6, 6.6, '#2b2e36', '#121318', 'CASA 54  48 FORA', '#f2b33d');
    },
    note: 'Piso sintético verde, paredes de chapa vermelha, bancada de betão só até meio e o marcador de lâmpadas pendurado. Pequeno e com caráter.',
  },
  {
    id: 'laranja', title: 'Palácio Laranja', division: 'Pro Liga 2 · municipal', theme: orangeHall, fanShirts: ['#2d5da8', '#f5efe0'],
    back: (g, cam) => {
      // Bandeirolas de festa de lado a lado do teto.
      for (const [y, z] of [[-9, 5.4], [-6, 5.8]] as const) {
        for (let x = -2; x < 30; x += 0.9) {
          const sag = 0.6 * (1 - ((x - 14) / 16) * ((x - 14) / 16));
          const a = cam.project(x, y, z - sag);
          const b = cam.project(x + 0.9, y, z - sag);
          const tip = cam.project(x + 0.45, y, z - sag - 0.6);
          fillPolygon(g, [a, b, tip], Math.round(x / 0.9) % 2 ? '#c0302a' : '#f5efe0');
        }
      }
    },
    note: 'Soalho cor de laranja com a área azul, bancadas de betão claro e bandeirolas de festa no teto. Alegre e diferente de todos os outros.',
  },
  {
    id: 'caldeirao', title: 'Caldeirão', division: 'Pro Liga 1 · arena', theme: cauldron, fanShirts: ['#1e8a4a', '#1e8a4a', '#f4efe0'],
    back: (g, cam) => hanging(g, cam, -10, 5.6, [4, 8, 12, 16, 20, 24], '#1e8a4a', '#f2c230', ['1998', '2004', '2011', '2017', '2020', '2024']),
    note: 'Madeira muito clara, cadeiras todas verdes, casa cheia vestida de verde e as faixas dos títulos penduradas. A arena europeia: o público é o cenário.',
  },
  {
    id: 'escuras', title: 'Arena às Escuras', division: 'Pro Liga 1 · arena', theme: darkArena, fanShirts: ['#de4038', '#f4efe0'], fanTint: '#4a4f66',
    back: (g, cam) => {
      bench(g, cam, '#de4038', '#16161c');
      cube(g, cam, 14, -5, 4.6, 6.6, 1.4, '#1d3f8a', '#de4038');
    },
    front: (g, cam) => cones(g, cam, [[5, -2], [5, 3], [11, 0]], [255, 236, 200], 0.05),
    note: 'Luz só no campo e bancada quase às escuras, cubo de ecrãs por cima, mesa e bancos com LED. O palco de um jogo grande.',
  },
  {
    id: 'parquet', title: 'Parquet Clássico', division: 'Pro Liga 1 · arena', theme: checker, fanShirts: ['#1e6b3c', '#f4eedd'],
    back: (g, cam) => hanging(g, cam, -10, 5.6, [6, 10, 14, 18, 22], '#f4eedd', '#1e6b3c', ['1979', '1986', '1992', '1999', '2008']),
    note: 'Parquet em xadrez de blocos, área e margem verde-garrafa, cadeiras bordô e faixas antigas no teto. Um pavilhão com história.',
  },
  {
    id: 'final', title: 'Noite de Final', division: 'Taças e finais', theme: neon, fanShirts: ['#f5f2fa'],
    back: (g, cam) => cube(g, cam, 14, -5, 4.6, 6.6, 1.4, '#e0388a', '#2ec4d6'),
    note: 'Piso escuro com a área magenta e o círculo azul-ciano, LED à volta e a bancada toda de branco. Para as finais, a única noite diferente da época.',
  },
  {
    id: 'alto', title: 'Câmara Alta', division: 'Outra forma de construir', theme: { ...cauldron, name: 'Caldeirão · alto' }, fanShirts: ['#1e8a4a', '#f4efe0'],
    tune: { cy: 4, cz: 26, focal: 260 }, aim: 14,
    note: 'O mesmo motor com a câmara muito mais alta: vê-se o campo inteiro, como num jogo de gestão da Kairosoft. Os bonecos e o cenário ficam mais pequenos; a bancada quase desaparece.',
  },
  {
    id: 'transmissao', title: 'Câmara de Transmissão', division: 'Outra forma de construir', theme: { ...darkArena, name: 'Arena · baixa' }, fanShirts: ['#de4038', '#f4efe0'], fanTint: '#4a4f66',
    tune: { cy: 15, cz: 5, focal: 300 }, aim: 9,
    back: (g, cam) => bench(g, cam, '#de4038', '#16161c'),
    front: (g, cam) => heads(g, cam, '#2a2e3c'),
    note: 'Câmara baixa, como na televisão, com cabeças da primeira fila em silhueta à frente. Mais dramático, mas a jogada lê-se pior.',
  },
];
