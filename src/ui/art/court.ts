import { HOOP_U, THREE_CORNER_MAX_U, THREE_CORNER_V, THREE_RADIUS } from '../../sim/court.ts';
import { INK } from './sprites.ts';

type Rgb = readonly [number, number, number];

const WALL_NEAR_X = -2.4;
const WALL_FAR_X = 30.4;
const WALL_Y = -9.2;
const NEAR_Y = 16;
const FLOOR_SCALE = 32;
const WALL_SCALE = 20;
const SIDE_WALL_SPAN = WALL_FAR_X - WALL_NEAR_X;
const END_WALL_SPAN = NEAR_Y - WALL_Y;
const WALL_U_SPAN = SIDE_WALL_SPAN + END_WALL_SPAN;
const WALL_Z_SPAN = 16;
const BASE_FOCAL = 318;
const BASE_W = 360;
const BASE_H = 216;
const BOARD_HEIGHT = 1;
const BOARD_WIDTH = 6.4;
const CROWD_CELL_W = 0.42;
const CROWD_CELL_H = 0.46;
export const CROWD_FRAMES = 3;

// Marcas inventadas para a publicidade. Sem acentos, porque a fonte 3x5 não os tem.
const SPONSORS = ['SOPA DA AVO', 'PASTEL BAR', 'SESTA FM', 'BIFANA MAX', 'BAILARICO', 'CAFE CENTRAL'] as const;

const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
const frac = (value: number): number => ((value % 1) + 1) % 1;
const shade = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];

export interface CourtTheme {
  name: string;
  note: string;
  swatch: string;
  floor(x: number, y: number, noise: number, plank: number): Rgb;
  paint: Rgb;
  center: Rgb;
  line(noise: number): Rgb;
  apron(noise: number): Rgb;
  /** Tudo o que não é público nem publicidade. */
  wall(u: number, z: number): Rgb;
  seams: boolean;
  pole: string;
  board: string;
  /** Luz de teto: quanto o centro de cada meio-campo brilha face aos cantos. */
  ambient: number;
  spot: number;
  /** Força do reflexo dos jogadores no chão. */
  reflection: number;
  boards: readonly Rgb[];
  boardText: Rgb;
  crowd: { from: number; to: number; density: number; seats: readonly Rgb[]; shirts: readonly Rgb[]; dim: number } | null;
  flashes: boolean;
}

const SKIN_TONES: readonly Rgb[] = [[240, 200, 160], [208, 150, 104], [140, 92, 58], [98, 64, 42]];

/** Um campo por divisão, pela mesma ordem de DIVISIONS. */
export const THEMES: readonly CourtTheme[] = [
  {
    name: 'Campo do Bairro',
    note: 'Alcatrão rachado e tinta gasta',
    swatch: '#566676',
    floor: (x, y, n) => {
      const b = 70 + n * 14;
      const crack = Math.abs(Math.sin(x * 1.3 + Math.sin(y * 2.1) * 1.4) * 3 + y * 0.3) < 0.05;
      return crack ? [40, 48, 58] : [b, b + 12, b + 24];
    },
    paint: [150, 72, 48],
    center: [120, 72, 58],
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
    ambient: 1,
    spot: 0,
    reflection: 0,
    boards: [],
    boardText: [255, 255, 255],
    crowd: null,
    flashes: false,
  },
  {
    name: 'Pavilhão Escolar',
    note: 'Madeira clara e janelas altas',
    swatch: '#e6cd9c',
    floor: (_x, _y, _n, plank) => {
      const b = 214 + plank * 16;
      return [b + 8, b - 18, b - 76];
    },
    paint: [64, 158, 148],
    center: [64, 158, 148],
    line: () => [248, 244, 228],
    apron: () => [58, 128, 124],
    wall: (u, z) => {
      if (z > 3 && z < 4.6 && frac(u * 0.6) < 0.7) return [186, 226, 240];
      return [236, 226, 196];
    },
    seams: true,
    pole: '#7f8a94',
    board: '#f4f4ee',
    ambient: 0.9,
    spot: 0.1,
    reflection: 0.1,
    boards: [[58, 128, 124], [226, 214, 182]],
    boardText: [40, 60, 70],
    crowd: { from: 1, to: 2.9, density: 0.3, seats: [[196, 170, 124], [178, 152, 108]], shirts: [[60, 110, 170], [190, 80, 60], [240, 210, 110], [90, 150, 110]], dim: 1 },
    flashes: false,
  },
  {
    name: 'Pavilhão Municipal',
    note: 'Madeira cor de mel e público a sério',
    swatch: '#dca35c',
    floor: (_x, _y, _n, plank) => {
      const b = 200 + plank * 18;
      return [b + 16, b - 34, b - 104];
    },
    paint: [23, 115, 122],
    center: [23, 115, 122],
    line: () => [252, 246, 228],
    apron: () => [20, 88, 98],
    wall: () => [70, 50, 52],
    seams: true,
    pole: '#3a4557',
    board: '#f4f4ee',
    ambient: 0.84,
    spot: 0.2,
    reflection: 0.12,
    boards: [[232, 98, 42], [248, 240, 216], [43, 95, 217], [242, 194, 48]],
    boardText: [27, 34, 48],
    crowd: { from: 1, to: 16, density: 0.72, seats: [[128, 62, 54], [112, 54, 48]], shirts: [[43, 95, 217], [43, 95, 217], [244, 239, 224], [207, 58, 44], [242, 194, 48], [70, 80, 96]], dim: 0.68 },
    flashes: true,
  },
  {
    name: 'Grande Arena',
    note: 'Madeira polida e casa cheia',
    swatch: '#a8683c',
    floor: (_x, _y, n, plank) => {
      const b = 158 + plank * 14 + (n > 0.5 ? 4 : 0);
      return [b + 34, b - 26, b - 76];
    },
    paint: [24, 52, 124],
    center: [24, 52, 124],
    line: () => [250, 240, 214],
    apron: () => [14, 26, 62],
    wall: () => [14, 18, 36],
    seams: true,
    pole: '#14182a',
    board: '#e6ecf4',
    ambient: 0.68,
    spot: 0.42,
    reflection: 0.28,
    boards: [[232, 98, 42], [16, 22, 44]],
    boardText: [250, 240, 214],
    crowd: { from: 1, to: 16, density: 0.92, seats: [[24, 28, 54], [20, 24, 46]], shirts: [[60, 90, 170], [200, 200, 210], [190, 70, 60], [240, 190, 70], [80, 90, 120]], dim: 0.55 },
    flashes: true,
  },
];

function isLine(x: number, y: number): boolean {
  const w = 0.075;
  if (x < -w || x > 14 + w || Math.abs(y) > 7.5 + w) return false;
  const near = (a: number, b: number, width = w): boolean => Math.abs(a - b) < width;
  const dist = (cx: number): number => Math.sqrt((x - cx) * (x - cx) + y * y);
  const absY = Math.abs(y);
  if (near(x, 0) || near(absY, 7.5) || near(x, 14)) return true;
  if (x < 5.8 + w && near(absY, 2.45)) return true;
  if (near(x, 5.8) && absY < 2.45) return true;
  // Mais pequeno do que o da FIBA, para não encostar à linha de 3, que também é mais curta.
  if (near(dist(5.8), 1.5) && x > 5.8) return true;
  if (near(dist(1.575), 1.25) && x > 1.575) return true;
  if (near(dist(HOOP_U), THREE_RADIUS) && absY < THREE_CORNER_V) return true;
  if (near(absY, THREE_CORNER_V) && x < THREE_CORNER_MAX_U) return true;
  if (near(dist(14), 1.8)) return true;
  // Traços ao longo da área, onde os jogadores se alinham no lance livre.
  if (absY > 2.45 && absY < 2.72) {
    for (const mark of [1.75, 2.6, 3.45, 4.3]) if (near(x, mark, 0.05)) return true;
  }
  return false;
}

/** O emblema do centro: uma bola desenhada com as costuras. */
function isCenterSeam(x: number, y: number): boolean {
  const r = Math.sqrt((x - 14) * (x - 14) + y * y);
  if (r > 1.05) return false;
  const arc = Math.sqrt((x - 12.9) * (x - 12.9) + y * y);
  return Math.abs(r - 1) < 0.05 || Math.abs(y) < 0.04 || Math.abs(arc - 0.95) < 0.04;
}

const packRgb = (c: Rgb): number => (255 << 24) | ((Math.max(0, Math.min(255, c[2])) & 255) << 16) | ((Math.max(0, Math.min(255, c[1])) & 255) << 8) | (Math.max(0, Math.min(255, c[0])) & 255);

/** A luz do teto ilumina o centro de cada meio-campo e deixa os cantos mais escuros. */
function lightAt(theme: CourtTheme, x: number, y: number): number {
  const dx = (x - 7) / 11;
  const dy = y / 9;
  return theme.ambient + theme.spot * Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
}

function crowdColor(theme: CourtTheme, u: number, z: number, frame: number): Rgb | null {
  const crowd = theme.crowd;
  if (!crowd || z < crowd.from || z >= crowd.to) return null;
  const rowValue = (z - crowd.from) / CROWD_CELL_H;
  const row = Math.floor(rowValue);
  const columnValue = u / CROWD_CELL_W + (row % 2 ? 0.5 : 0);
  const column = Math.floor(columnValue);
  const h = hash(column, row);
  const fade = crowd.dim * Math.max(0.55, 1 - row * 0.012);
  const seat = shade(crowd.seats[row % crowd.seats.length]!, fade);
  if (h > crowd.density) return seat;
  const pick = hash(row * 3 + 1, column * 7 + 2);
  // Quem se levanta muda com a imagem: poucos em repouso, quase todos num festejo.
  const excitedChance = frame === 0 ? 0 : frame === 1 ? 0.14 : 0.7;
  const raised = pick < excitedChance;
  const lift = raised ? 0.14 : 0;
  const lx = frac(columnValue);
  const lz = frac(rowValue) - lift;
  const shirt = shade(crowd.shirts[Math.floor(pick * 37) % crowd.shirts.length]!, fade);
  const skin = shade(SKIN_TONES[Math.floor(h * 23) % SKIN_TONES.length]!, fade);
  if (raised && lz > 0.3 && lz < 0.92 && (lx < 0.15 || lx > 0.85)) return skin;
  if (lz < 0.5 && lx > 0.14 && lx < 0.86) return shirt;
  if (lz >= 0.5 && lz < 0.86 && lx > 0.28 && lx < 0.72) return skin;
  return seat;
}

const BOARD_FONT: Record<string, string> = {
  A: '25755', B: '65656', C: '34443', D: '65556', E: '74647', F: '74644', I: '72227', L: '44447', M: '57755',
  N: '65555', O: '25552', P: '65644', R: '65655', S: '34216', T: '72222', V: '55552', X: '55255', ' ': '00000',
};

export interface CourtTextures {
  theme: CourtTheme;
  floor: Uint32Array;
  floorW: number;
  floorH: number;
  walls: Uint32Array[];
  wallW: number;
  wallH: number;
}

const textureCache = new Map<number, CourtTextures>();

function buildWall(theme: CourtTheme, frame: number, wallW: number, wallH: number): Uint32Array {
  const wall = new Uint32Array(wallW * wallH);
  for (let j = 0; j < wallH; j++) {
    const z = (j + 0.5) / WALL_SCALE;
    for (let i = 0; i < wallW; i++) {
      const u = (i + 0.5) / WALL_SCALE;
      let color: Rgb;
      if (theme.boards.length > 0 && z < BOARD_HEIGHT) {
        const k = Math.floor(u / BOARD_WIDTH);
        // Vistas de lado, as placas do topo do campo ocupam muito ecrã, por isso ficam mais discretas.
        const base = shade(theme.boards[k % theme.boards.length]!, u < SIDE_WALL_SPAN ? 1 : 0.6);
        color = z > BOARD_HEIGHT - 0.06 ? shade(base, 0.7) : base;
      } else {
        color = crowdColor(theme, u, z, frame) ?? theme.wall(u, z);
      }
      wall[j * wallW + i] = packRgb(color);
    }
  }
  if (theme.boards.length > 0) {
    // A parede lateral é vista com o eixo invertido, por isso o texto escreve-se ao contrário.
    const scale = 2;
    const top = Math.round(((BOARD_HEIGHT - 0.1) * WALL_SCALE - 5 * scale) / 2) + 1;
    const ink = packRgb(theme.boardText);
    const boardsOnSide = Math.floor(SIDE_WALL_SPAN / BOARD_WIDTH);
    for (let k = 0; k < boardsOnSide; k++) {
      const label = SPONSORS[k % SPONSORS.length]!;
      const start = k * BOARD_WIDTH * WALL_SCALE;
      const width = label.length * 4 * scale - scale;
      const left = Math.round(start + (BOARD_WIDTH * WALL_SCALE + width) / 2);
      [...label].forEach((ch, index) => {
        const glyph = BOARD_FONT[ch] ?? '00000';
        for (let row = 0; row < 5; row++) {
          const bits = Number(glyph[row]);
          for (let col = 0; col < 3; col++) {
            if (!((bits >> (2 - col)) & 1)) continue;
            for (let dy = 0; dy < scale; dy++) {
              for (let dx = 0; dx < scale; dx++) {
                const px = left - (index * 4 + col) * scale - dx;
                const py = top + (4 - row) * scale + dy;
                wall[py * wallW + px] = ink;
              }
            }
          }
        }
      });
    }
  }
  return wall;
}

/** As texturas calculam-se uma vez por divisão. Desenhar um frame é só consultá-las. */
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
      if (isLine(x, y)) color = theme.line(hash(Math.floor(x * 3), Math.floor(y * 3)));
      else if (x < 0 || Math.abs(y) > 7.5) color = theme.apron(noise);
      else if (x < 5.8 && Math.abs(y) < 2.45) color = theme.paint;
      else if ((14 - x) * (14 - x) + y * y < 1.8 * 1.8) color = isCenterSeam(wx, y) ? theme.line(1) : theme.center;
      else {
        const row = Math.floor(y / 0.55);
        const plank = hash(row, Math.floor((wx + hash(row, 3) * 4) / 3.1)) - 0.5;
        color = theme.floor(x, y, noise, plank);
        if (theme.seams && frac(y / 0.55) < 0.07) color = [color[0] - 16, color[1] - 16, color[2] - 16];
      }
      floor[j * floorW + i] = packRgb(shade(color, lightAt(theme, x, y)));
    }
  }
  const wallW = Math.ceil(WALL_U_SPAN * WALL_SCALE);
  const wallH = WALL_Z_SPAN * WALL_SCALE;
  const walls = Array.from({ length: CROWD_FRAMES }, (_, frame) => buildWall(theme, frame, wallW, wallH));
  const textures = { theme, floor, floorW, floorH, walls, wallW, wallH };
  textureCache.set(division, textures);
  return textures;
}

export class Camera {
  lookX = 14;
  width = BASE_W;
  height = BASE_H;
  private cx = 0;
  private cy = 0;
  private cz = 0;
  private fwd: [number, number, number] = [0, 0, 0];
  private right: [number, number, number] = [0, 0, 0];
  private up: [number, number, number] = [0, 0, 0];
  private focal = BASE_FOCAL;

  constructor() {
    this.aim(14);
  }

  /** O enquadramento é igual em qualquer ecrã: mudam só os píxeis disponíveis. */
  setViewport(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.focal = BASE_FOCAL * Math.min(width / BASE_W, height / BASE_H);
  }

  /** Câmara na lateral: acompanha a bola e roda um pouco para o cesto, como numa transmissão. */
  aim(lookX: number): void {
    this.lookX = lookX;
    this.cx = 14 + (lookX - 14) * 0.163;
    this.cy = 9.6;
    this.cz = 12.5;
    const dx = lookX - this.cx;
    const dy = -1.9 - this.cy;
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
      this.width / 2 + (rx * this.right[0] + ry * this.right[1] + rz * this.right[2]) * scale,
      this.height / 2 - (rx * this.up[0] + ry * this.up[1] + rz * this.up[2]) * scale,
    ];
  }

  /** Desenha o chão e as paredes, píxel a píxel, como o Modo 7 das consolas antigas. */
  drawScene(pixels: Uint32Array, t: CourtTextures, crowdFrame: number): void {
    const { focal, fwd, right, up, cx, cy, cz, width, height } = this;
    const wall = t.walls[crowdFrame]!;
    for (let sy = 0; sy < height; sy++) {
      const vy = height / 2 - sy - 0.5;
      const row = sy * width;
      // A câmara não roda sobre si mesma, por isso a altura do raio é igual em toda a linha.
      const rz = fwd[2] * focal + up[2] * vy;
      const baseX = fwd[0] * focal + up[0] * vy + right[0] * (0.5 - width / 2);
      const baseY = fwd[1] * focal + up[1] * vy + right[1] * (0.5 - width / 2);
      const floorT = rz < 0 ? -cz / rz : Infinity;
      for (let sx = 0; sx < width; sx++) {
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
        const tEnd = dirX < 0 ? (WALL_NEAR_X - cx) / dirX : (WALL_FAR_X - cx) / dirX;
        const tSide = dirY < 0 ? (WALL_Y - cy) / dirY : Infinity;
        const hit = Math.min(tEnd, tSide);
        // Cada parede tem a sua faixa na textura: o texto da publicidade só fica na lateral.
        const along = hit === tSide ? cx + dirX * hit - WALL_NEAR_X : cy + dirY * hit - WALL_Y + SIDE_WALL_SPAN;
        const z = cz + rz * hit;
        const wu = Math.max(0, Math.min(t.wallW - 1, (along * WALL_SCALE) | 0));
        const wv = Math.max(0, Math.min(t.wallH - 1, (z * WALL_SCALE) | 0));
        pixels[row + sx] = wall[wv * t.wallW + wu]!;
      }
    }
  }
}

export function fillPolygon(g: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], color: string): void {
  g.fillStyle = color;
  const ys = points.map(p => p[1]);
  const y0 = Math.max(0, Math.ceil(Math.min(...ys)));
  const y1 = Math.min(g.canvas.height, Math.floor(Math.max(...ys)));
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

const RIM_RADIUS = 0.28;
const RIM_Z = 3.05;

/** Parte de trás do cesto: poste, tabela e o que fica atrás da bola quando ela entra. */
export function drawHoopBack(g: CanvasRenderingContext2D, cam: Camera, theme: CourtTheme, hoopX: number, swish: number): void {
  const outward = hoopX < 14 ? -1 : 1;
  const P = (x: number, y: number, z: number): [number, number] => cam.project(x, y, z);
  const boardX = hoopX + outward * 0.375;
  const poleX = hoopX + outward * 2.675;
  const line = (a: [number, number], b: [number, number], color: string, thickness = 1): void =>
    pixelLine(g, a[0] | 0, a[1] | 0, b[0] | 0, b[1] | 0, color, thickness);
  // Base almofadada do poste, para ele não parecer um pau espetado no chão.
  fillPolygon(g, [P(poleX - 0.4, -0.5, 0), P(poleX + 0.4, -0.5, 0), P(poleX + 0.4, 0.5, 0), P(poleX - 0.4, 0.5, 0)], theme.pole);
  line(P(poleX, 0, 0), P(poleX, 0, 3.5), INK, 4);
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
  drawRimHalf(g, cam, hoopX, swish, false);
}

/** Parte da frente do cesto: a metade do aro e da rede que tapam a bola quando ela entra. */
export function drawHoopFront(g: CanvasRenderingContext2D, cam: Camera, hoopX: number, swish: number): void {
  drawRimHalf(g, cam, hoopX, swish, true);
}

function drawRimHalf(g: CanvasRenderingContext2D, cam: Camera, hoopX: number, swish: number, front: boolean): void {
  const P = (x: number, y: number, z: number): [number, number] => cam.project(x, y, z);
  const centerY = P(hoopX, 0, RIM_Z)[1];
  const netRadius = 0.16 + swish * 0.1;
  const netBottom = 2.62 - swish * 0.28;
  for (let i = 0; i < 12; i += 2) {
    const an = (i / 12) * Math.PI * 2;
    const top = P(hoopX + Math.cos(an) * RIM_RADIUS, Math.sin(an) * RIM_RADIUS, RIM_Z);
    if (top[1] >= centerY !== front) continue;
    const bottom = P(hoopX + Math.cos(an) * netRadius, Math.sin(an) * netRadius, netBottom);
    pixelLine(g, top[0] | 0, top[1] | 0, bottom[0] | 0, bottom[1] | 0, '#f8f6ee');
  }
  g.fillStyle = '#e8622a';
  for (let i = 0; i < 28; i++) {
    const an = (i / 28) * Math.PI * 2;
    const p = P(hoopX + Math.cos(an) * RIM_RADIUS, Math.sin(an) * RIM_RADIUS, RIM_Z);
    if (p[1] >= centerY !== front) continue;
    g.fillRect(p[0] | 0, p[1] | 0, 2, 2);
  }
}

/** O cesto inteiro, para quando não há bola a passar por ele. */
export function drawHoop(g: CanvasRenderingContext2D, cam: Camera, theme: CourtTheme, hoopX: number, swish: number): void {
  drawHoopBack(g, cam, theme, hoopX, swish);
  drawHoopFront(g, cam, hoopX, swish);
}

/** Mesa de oficiais e banco, ao longo da lateral do fundo. */
export function drawBox(g: CanvasRenderingContext2D, cam: Camera, x0: number, x1: number, y0: number, y1: number, height: number, top: string, front: string): void {
  const P = (x: number, y: number, z: number): [number, number] => cam.project(x, y, z);
  fillPolygon(g, [P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, height), P(x0, y1, height)], front);
  fillPolygon(g, [P(x0, y0, height), P(x1, y0, height), P(x1, y1, height), P(x0, y1, height)], top);
}
