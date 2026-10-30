import { INK } from './sprites.ts';

type Rgb = readonly [number, number, number];

export const VIEW_W = 360;
export const VIEW_H = 216;
const WALL_NEAR_X = -2.4;
const WALL_FAR_X = 30.4;
const WALL_Y = -9.2;
const NEAR_Y = 11.8;
const FLOOR_SCALE = 32;
const WALL_SCALE = 16;
const WALL_U_MIN = -12;
const WALL_U_SPAN = 54;
const WALL_Z_SPAN = 16;

const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
const frac = (value: number): number => ((value % 1) + 1) % 1;

export interface CourtTheme {
  name: string;
  note: string;
  floor(x: number, y: number, noise: number, plank: number): Rgb;
  paint(noise: number, x: number, y: number): Rgb;
  line(noise: number): Rgb;
  apron(noise: number): Rgb;
  wall(u: number, z: number): Rgb;
  seams: boolean;
  pole: string;
  board: string;
}

/** Um campo por divisão, pela mesma ordem de DIVISIONS. */
export const THEMES: readonly CourtTheme[] = [
  {
    name: 'Campo do Bairro',
    note: 'Alcatrão rachado e tinta gasta',
    floor: (x, y, n) => {
      const b = 70 + n * 14;
      const crack = Math.abs(Math.sin(x * 1.3 + Math.sin(y * 2.1) * 1.4) * 3 + y * 0.3) < 0.05;
      return crack ? [40, 48, 58] : [b, b + 12, b + 24];
    },
    paint: n => (n > 0.25 ? [158, 72, 44] : [120, 72, 58]),
    line: n => (n > 0.2 ? [226, 222, 200] : [130, 140, 150]),
    apron: n => {
      const b = 60 + n * 10;
      return [b, b + 8, b + 18];
    },
    wall: (u, z) => {
      if (z > 3.4) return [156, 206, 226];
      const fence = frac((u + z) * 3) < 0.12 || frac((u - z) * 3) < 0.12;
      if (fence) return [176, 186, 190];
      return Math.sin(u * 0.9) * 0.7 + 2.3 > z ? [62, 134, 92] : [156, 206, 226];
    },
    seams: false,
    pole: '#59626e',
    board: '#e4e6e0',
  },
  {
    name: 'Pavilhão Escolar',
    note: 'Madeira clara e janelas altas',
    floor: (_x, _y, _n, plank) => {
      const b = 214 + plank * 16;
      return [b + 8, b - 18, b - 76];
    },
    paint: () => [64, 158, 148],
    line: () => [248, 244, 228],
    apron: () => [58, 128, 124],
    wall: (u, z) => {
      if (z < 1.2) return Math.floor(u * 1.4) % 2 ? [226, 214, 182] : [214, 200, 164];
      if (z > 2.6 && z < 4 && frac(u * 0.6) < 0.7) return [186, 226, 240];
      return [236, 226, 196];
    },
    seams: true,
    pole: '#7f8a94',
    board: '#f4f4ee',
  },
  {
    name: 'Pavilhão Municipal',
    note: 'Madeira cor de mel e público a sério',
    floor: (_x, _y, _n, plank) => {
      const b = 200 + plank * 18;
      return [b + 16, b - 34, b - 104];
    },
    paint: () => [23, 115, 122],
    line: () => [252, 246, 228],
    apron: () => [20, 88, 98],
    wall: (u, z) => {
      if (z < 1) {
        const k = Math.floor(u / 2.4);
        const colors: readonly Rgb[] = [[232, 98, 42], [248, 240, 216], [43, 95, 217], [242, 194, 48]];
        return colors[((k % 4) + 4) % 4]!;
      }
      const cu = Math.floor(u * 2.6);
      const cz = Math.floor(z * 2.6);
      const h = hash(cu, cz);
      if (h < 0.55 && frac(u * 2.6) > 0.25 && frac(z * 2.6) > 0.3) {
        const faces: readonly Rgb[] = [[240, 200, 160], [200, 140, 96], [120, 80, 54], [240, 200, 160]];
        return faces[Math.floor(h * 7) % 4]!;
      }
      return cz % 2 ? [150, 72, 56] : [132, 60, 50];
    },
    seams: true,
    pole: '#3a4557',
    board: '#f4f4ee',
  },
  {
    name: 'Grande Arena',
    note: 'Madeira polida e casa cheia',
    floor: (x, y, n, plank) => {
      const sheen = Math.max(0, 1 - Math.sqrt((x - 6) * (x - 6) + y * y) / 9) * 36;
      const b = 138 + plank * 12 + sheen + (n > 0.5 ? 4 : 0);
      return [b + 30, b - 26, b - 74];
    },
    paint: (_n, x, y) => {
      const d = Math.max(0, 1 - Math.sqrt((x - 4) * (x - 4) + y * y) / 7) * 34;
      return [18 + d * 0.4, 44 + d * 0.6, 104 + d];
    },
    line: () => [250, 240, 214],
    apron: () => [14, 26, 62],
    wall: (u, z) => {
      if (z < 1) return Math.floor((u + 40) / 3.2) % 2 ? [16, 22, 44] : [232, 98, 42];
      const cu = Math.floor(u * 3.2);
      const cz = Math.floor(z * 3.2);
      const h = hash(cu, cz);
      if (h > 0.975) return [255, 250, 220];
      if (h < 0.5 && frac(u * 3.2) > 0.25 && frac(z * 3.2) > 0.3) {
        const faces: readonly Rgb[] = [[110, 80, 80], [76, 62, 84], [60, 74, 110], [130, 100, 90]];
        return faces[Math.floor(h * 8) % 4]!;
      }
      return [20, 24, 46];
    },
    seams: true,
    pole: '#14182a',
    board: '#e6ecf4',
  },
];

function onLine(x: number, y: number): boolean {
  const w = 0.075;
  if (x < -w || x > 14 + w || Math.abs(y) > 7.5 + w) return false;
  const near = (a: number, b: number): boolean => Math.abs(a - b) < w;
  const dist = (cx: number): number => Math.sqrt((x - cx) * (x - cx) + y * y);
  if (near(x, 0) || near(Math.abs(y), 7.5) || near(x, 14)) return true;
  if (x < 5.8 + w && near(Math.abs(y), 2.45)) return true;
  if (near(x, 5.8) && Math.abs(y) < 2.45) return true;
  if (near(dist(5.8), 1.8) && x > 5.8) return true;
  if (near(dist(1.575), 1.25) && x > 1.575) return true;
  if (near(dist(1.575), 6.75) && Math.abs(y) < 6.6) return true;
  if (near(Math.abs(y), 6.6) && x < 3) return true;
  return near(dist(14), 1.8);
}

const packRgb = (c: Rgb): number => (255 << 24) | ((c[2] & 255) << 16) | ((c[1] & 255) << 8) | (c[0] & 255);

export interface CourtTextures {
  theme: CourtTheme;
  floor: Uint32Array;
  floorW: number;
  floorH: number;
  wall: Uint32Array;
  wallW: number;
  wallH: number;
}

const textureCache = new Map<number, CourtTextures>();

/** A textura vista de cima calcula-se uma vez por divisão. Desenhar um frame é só consultá-la. */
export function courtTextures(division: number): CourtTextures {
  const cached = textureCache.get(division);
  if (cached) return cached;
  const theme = THEMES[division]!;
  const floorW = Math.ceil((WALL_FAR_X - WALL_NEAR_X) * FLOOR_SCALE);
  const floorH = Math.ceil((NEAR_Y - WALL_Y) * FLOOR_SCALE);
  const floor = new Uint32Array(floorW * floorH);
  for (let j = 0; j < floorH; j++) {
    const y = WALL_Y + (j + 0.5) / FLOOR_SCALE;
    for (let i = 0; i < floorW; i++) {
      const wx = WALL_NEAR_X + (i + 0.5) / FLOOR_SCALE;
      const x = wx < 14 ? wx : 28 - wx; // O campo é simétrico: só a metade esquerda precisa de desenho.
      const noise = hash(Math.floor(x * 5), Math.floor(y * 5));
      let color: Rgb;
      if (onLine(x, y)) color = theme.line(hash(Math.floor(x * 3), Math.floor(y * 3)));
      else if (x < 0 || Math.abs(y) > 7.5) color = theme.apron(noise);
      else if (x < 5.8 && Math.abs(y) < 2.45) color = theme.paint(noise, x, y);
      else {
        const row = Math.floor(y / 0.55);
        const plank = hash(row, Math.floor((wx + hash(row, 3) * 4) / 3.1)) - 0.5;
        color = theme.floor(x, y, noise, plank);
        if (theme.seams && frac(y / 0.55) < 0.07) color = [color[0] - 16, color[1] - 16, color[2] - 16];
      }
      floor[j * floorW + i] = packRgb(color);
    }
  }
  const wallW = WALL_U_SPAN * WALL_SCALE;
  const wallH = WALL_Z_SPAN * WALL_SCALE;
  const wall = new Uint32Array(wallW * wallH);
  for (let j = 0; j < wallH; j++) {
    const z = (j + 0.5) / WALL_SCALE;
    for (let i = 0; i < wallW; i++) wall[j * wallW + i] = packRgb(theme.wall(WALL_U_MIN + (i + 0.5) / WALL_SCALE, z));
  }
  const textures = { theme, floor, floorW, floorH, wall, wallW, wallH };
  textureCache.set(division, textures);
  return textures;
}

export class Camera {
  lookX = 14;
  private cx = 0;
  private cy = 0;
  private cz = 0;
  private fwd: [number, number, number] = [0, 0, 0];
  private right: [number, number, number] = [0, 0, 0];
  private up: [number, number, number] = [0, 0, 0];
  private readonly focal = 318;

  constructor() {
    this.aim(14);
  }

  /** Câmara na lateral: acompanha a bola e roda um pouco para o cesto, como numa transmissão. */
  aim(lookX: number): void {
    this.lookX = lookX;
    this.cx = 14 + (lookX - 14) * 0.163;
    this.cy = 9.6;
    this.cz = 12.5;
    const dx = lookX - this.cx;
    const dy = -1 - this.cy;
    const dz = -this.cz;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this.fwd = [dx / length, dy / length, dz / length];
    const rightLength = Math.sqrt(this.fwd[0] * this.fwd[0] + this.fwd[1] * this.fwd[1]);
    this.right = [this.fwd[1] / rightLength, -this.fwd[0] / rightLength, 0];
    const [fx, fy, fz] = this.fwd;
    const [rx, ry, rz] = this.right;
    this.up = [ry * fz - rz * fy, rz * fx - rx * fz, rx * fy - ry * fx];
  }

  project(x: number, y: number, z = 0): [number, number] {
    const rx = x - this.cx;
    const ry = y - this.cy;
    const rz = z - this.cz;
    const depth = rx * this.fwd[0] + ry * this.fwd[1] + rz * this.fwd[2];
    const scale = this.focal / depth;
    return [
      VIEW_W / 2 + (rx * this.right[0] + ry * this.right[1] + rz * this.right[2]) * scale,
      VIEW_H / 2 - (rx * this.up[0] + ry * this.up[1] + rz * this.up[2]) * scale,
    ];
  }

  /** Desenha o chão e as paredes, píxel a píxel, como o Modo 7 das consolas antigas. */
  drawScene(pixels: Uint32Array, t: CourtTextures): void {
    const { focal, fwd, right, up, cx, cy, cz } = this;
    for (let sy = 0; sy < VIEW_H; sy++) {
      const vy = VIEW_H / 2 - sy - 0.5;
      const row = sy * VIEW_W;
      // A câmara não roda sobre si mesma, por isso a altura do raio é igual em toda a linha.
      const rz = fwd[2] * focal + up[2] * vy;
      const baseX = fwd[0] * focal + up[0] * vy + right[0] * (0.5 - VIEW_W / 2);
      const baseY = fwd[1] * focal + up[1] * vy + right[1] * (0.5 - VIEW_W / 2);
      const floorT = rz < 0 ? -cz / rz : Infinity;
      for (let sx = 0; sx < VIEW_W; sx++) {
        const dirX = baseX + right[0] * sx;
        const dirY = baseY + right[1] * sx;
        const hitX = cx + dirX * floorT;
        const hitY = cy + dirY * floorT;
        if (hitX > WALL_NEAR_X && hitX < WALL_FAR_X && hitY > WALL_Y) {
          const u = ((hitX - WALL_NEAR_X) * FLOOR_SCALE) | 0;
          const v = Math.min(t.floorH - 1, ((hitY - WALL_Y) * FLOOR_SCALE) | 0);
          pixels[row + sx] = t.floor[v * t.floorW + u]!;
          continue;
        }
        const tNear = dirX < 0 ? (WALL_NEAR_X - cx) / dirX : (WALL_FAR_X - cx) / dirX;
        const tSide = dirY < 0 ? (WALL_Y - cy) / dirY : Infinity;
        const hit = Math.min(tNear, tSide);
        const along = hit === tSide ? cx + dirX * hit : cy + dirY * hit;
        const z = cz + rz * hit;
        const wu = (((along - WALL_U_MIN) * WALL_SCALE) | 0) % t.wallW;
        const wv = Math.max(0, ((z * WALL_SCALE) | 0) % t.wallH);
        pixels[row + sx] = t.wall[wv * t.wallW + Math.max(0, wu)]!;
      }
    }
  }
}

export function fillPolygon(g: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], color: string): void {
  g.fillStyle = color;
  const ys = points.map(p => p[1]);
  const y0 = Math.max(0, Math.ceil(Math.min(...ys)));
  const y1 = Math.min(VIEW_H, Math.floor(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) {
    const xs: number[] = [];
    points.forEach((a, i) => {
      const b = points[(i + 1) % points.length]!;
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    });
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) g.fillRect(Math.round(xs[i]!), y, Math.max(1, Math.round(xs[i + 1]! - xs[i]!)), 1);
  }
}

export function pixelLine(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, thickness = 1): void {
  g.fillStyle = color;
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    g.fillRect(Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), thickness, thickness);
  }
}

export function drawHoop(g: CanvasRenderingContext2D, cam: Camera, theme: CourtTheme, hoopX: number): void {
  const outward = hoopX < 14 ? -1 : 1;
  const P = (x: number, y: number, z: number): [number, number] => cam.project(x, y, z);
  const boardX = hoopX + outward * 0.375;
  const poleX = hoopX + outward * 2.675;
  const line = (a: [number, number], b: [number, number], color: string, thickness = 1): void =>
    pixelLine(g, a[0] | 0, a[1] | 0, b[0] | 0, b[1] | 0, color, thickness);
  line(P(poleX, 0, 0), P(poleX, 0, 3.5), theme.pole, 3);
  line(P(poleX, 0, 3.5), P(boardX, 0, 3.5), theme.pole, 2);
  const a = P(boardX, -0.9, 2.9);
  const b = P(boardX, 0.9, 2.9);
  const c = P(boardX, 0.9, 3.95);
  const d = P(boardX, -0.9, 3.95);
  fillPolygon(g, [d, c, b, a], INK);
  const inset = (p: [number, number], q: [number, number]): [number, number] => [p[0] + (q[0] - p[0]) * 0.05, p[1] + (q[1] - p[1]) * 0.05];
  fillPolygon(g, [inset(d, b), inset(c, a), inset(b, d), inset(a, c)], theme.board);
  const s = [P(boardX, -0.3, 3.05), P(boardX, 0.3, 3.05), P(boardX, 0.3, 3.5), P(boardX, -0.3, 3.5)] as const;
  s.forEach((point, i) => line(point, s[(i + 1) % 4]!, '#e8622a'));
  for (let i = 0; i < 12; i += 2) {
    const an = (i / 12) * Math.PI * 2;
    line(P(hoopX + Math.cos(an) * 0.28, Math.sin(an) * 0.28, 3.05), P(hoopX + Math.cos(an) * 0.16, Math.sin(an) * 0.16, 2.62), '#f8f6ee');
  }
  g.fillStyle = '#e8622a';
  for (let i = 0; i < 28; i++) {
    const an = (i / 28) * Math.PI * 2;
    const p = P(hoopX + Math.cos(an) * 0.28, Math.sin(an) * 0.28, 3.05);
    g.fillRect(p[0] | 0, p[1] | 0, 2, 2);
  }
}
