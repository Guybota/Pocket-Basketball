import { HOOP_U, THREE_CORNER_MAX_U, THREE_CORNER_V, THREE_RADIUS } from '../../sim/court.ts';
import { emblemCanvas, type Emblem } from './kit.ts';
import { INK } from './sprites.ts';
import { remember } from './cache.ts';

type Rgb = readonly [number, number, number];

// Há espaço à volta do campo antes das bancadas, como num pavilhão a sério.
const WALL_NEAR_X = -4;
const WALL_FAR_X = 32;
const WALL_Y = -11;
const NEAR_Y = 17;
/** Para onde a câmara olha em repouso: um pouco para lá do meio do campo. */
export const LOOK_Y = -1.1;
/** Quantas filas de público cabem na bancada deste pavilhão. */
export const fanRows = (theme: CourtTheme): number => (theme.crowd ? Math.min(5, Math.floor((theme.crowd.to - theme.crowd.from - CROWD_WALL) / FAN_ROW_STEP)) : 0);
/** A altura de uma fila de público na bancada, acima do muro. */
export const fanHeight = (theme: CourtTheme, row: number): number => (theme.crowd ? theme.crowd.from : 1) + CROWD_WALL + 0.3 + row * FAN_ROW_STEP;
/** Onde assentam os pés de um adepto da bancada lateral: a bancada recua ao subir. */
export const sideFanSpot = (theme: CourtTheme, row: number): { y: number; z: number } => {
  const z = fanHeight(theme, row);
  return { y: WALL_Y - theme.slope * z, z };
};
/** O mesmo, nas bancadas dos topos. */
export const endFanSpot = (theme: CourtTheme, far: boolean, row: number): { x: number; z: number } => {
  const z = fanHeight(theme, row);
  return { x: far ? WALL_FAR_X + theme.slope * z : WALL_NEAR_X - theme.slope * z, z };
};
const FLOOR_SCALE = 32;
const WALL_SCALE = 20;
const SIDE_WALL_SPAN = WALL_FAR_X - WALL_NEAR_X;
const END_WALL_SPAN = NEAR_Y - WALL_Y;
const WALL_U_SPAN = SIDE_WALL_SPAN + END_WALL_SPAN;
const WALL_Z_SPAN = 16;
// A câmara escolhida: baixa e longe, com a lente aberta, para se verem os dois lados do campo.
const BASE_FOCAL = 290;
const BASE_W = 360;
const BASE_H = 216;
const BOARD_HEIGHT = 1;
const BOARD_WIDTH = 6.4;
// A textura da bancada tem só as cadeiras, atrás de um muro baixo. O público são bonecos desenhados por cima.
const CROWD_CELL_W = 0.75;
const CROWD_CELL_H = 0.8;
const CROWD_WALL = 0.5;
/** As filas de público, uma por cada passo destes a subir a bancada. */
export const FAN_ROW_STEP = 1.3;
export const FAN_SPACING = 1.25;
export const STAND = { nearX: WALL_NEAR_X, farX: WALL_FAR_X, y: WALL_Y } as const;
/** O túnel para os balneários, no centro da bancada lateral dos pavilhões. */
export const TUNNEL = { x0: 12.6, x1: 15.4, height: 2.6 } as const;
// Cinco imagens do público: 0 em repouso; 1 e 2 poucos de pé, mas pessoas diferentes; 3 e 4 quase todos, também alternados.
// Assim, ao alternar entre duas, não salta toda a gente ao mesmo tempo.
export const CROWD_FRAMES = 5;

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
  /** Quanto a bancada recua por cada metro que sobe. Zero é uma parede a pique. */
  slope: number;
  /** Ao ar livre: em vez de paredes há uma rede fina, o exterior por trás e um pano de fundo ao longe; `wall` é esse fundo. */
  open?: boolean;
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
    // Alcatrão com manchas largas e pouco contraste: linhas finas, como rachas, tremiam ao longe e pareciam uma malha a arrastar.
    floor: (x, y, n) => {
      const patch = hash(Math.floor(x * 0.6), Math.floor(y * 0.6)) * 8;
      const b = 70 + patch + n * 4;
      return [b, b + 12, b + 24];
    },
    paint: [150, 72, 48],
    center: [120, 72, 58],
    line: n => (n > 0.2 ? [226, 222, 200] : [130, 140, 150]),
    apron: n => {
      const b = 62 + n * 4;
      return [b, b + 8, b + 18];
    },
    wall: (u, z) => {
      // O pano de fundo, ao longe: prédios baixos e árvores do bairro, e o céu por cima.
      const block = Math.floor(u / 5.5);
      const height = 2.3 + hash(block, 11) * 3.6;
      if (hash(block, 5) < 0.55 && z < height) {
        const tones: Rgb[] = [[196, 150, 112], [176, 168, 150], [150, 120, 104]];
        const tone = tones[block % tones.length]!;
        const window = frac(u / 5.5) > 0.15 && frac(u / 5.5) < 0.85 && frac((u * 1.4) % 1) < 0.35 && frac(z * 1.1) > 0.35 && frac(z * 1.1) < 0.75;
        return window ? [228, 220, 170] : z > height - 0.2 ? shade(tone, 0.7) : tone;
      }
      return Math.sin(u * 0.9) * 0.7 + 3.3 > z ? [62, 134, 92] : [156, 206, 226];
    },
    open: true,
    slope: 0,
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
    slope: 0.5,
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
    slope: 0.7,
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
    slope: 0.8,
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
  if (!crowd || z < crowd.from + CROWD_WALL || z >= crowd.to) return null;
  const rowValue = (z - crowd.from - CROWD_WALL) / CROWD_CELL_H;
  const row = Math.floor(rowValue);
  const columnValue = u / CROWD_CELL_W + (row % 2 ? 0.5 : 0);
  const column = Math.floor(columnValue);
  const h = hash(column, row);
  const fade = crowd.dim * Math.max(0.55, 1 - row * 0.012);
  const seat = shade(crowd.seats[row % crowd.seats.length]!, fade);
  // shortcut: as pessoas e as bandeiras são bonecos desenhados por cima da textura; esta só tem as cadeiras.
  if (h >= 0) return seat;
  if (h > crowd.density) return seat;
  const pick = hash(row * 3 + 1, column * 7 + 2);
  // Quem se levanta muda com a imagem: poucos num festejo pequeno, muitos num grande; as imagens pares levantam outras pessoas.
  const excitedChance = frame === 0 ? 0 : frame <= 2 ? 0.18 : 0.7;
  const raised = (frame % 2 === 0 ? 1 - pick : pick) < excitedChance;
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
  /** O chão a metade e a um quarto da resolução, para as filas longe da câmara: sem isto, cada píxel saltava texels e via-se moiré a arrastar. */
  floorLevels: { data: Uint32Array; w: number; h: number; scale: number }[];
  walls: Uint32Array[];
  wallW: number;
  wallH: number;
}

const textureCache = new Map<string, CourtTextures>();

/** Uma textura a metade: cada texel é a média de quatro. */
function halve(level: { data: Uint32Array; w: number; h: number; scale: number }): { data: Uint32Array; w: number; h: number; scale: number } {
  const w = level.w >> 1;
  const h = level.h >> 1;
  const data = new Uint32Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
        const p = level.data[(j * 2 + dy) * level.w + i * 2 + dx]!;
        r += p & 255;
        g += (p >> 8) & 255;
        b += (p >> 16) & 255;
      }
      data[j * w + i] = packRgb([r / 4, g / 4, b / 4]);
    }
  }
  return { data, w, h, scale: level.scale / 2 };
}

/** Um píxel do chão: ao longe cada linha do ecrã cobre muitos texels na vertical, por isso faz-se a média de `k` ao longo desse troço.
 * Com um só texel por linha saíam traços horizontais que saltavam com a câmara. */
function floorSample(level: FloorLevel, x: number, y: number, offX: Float64Array, offY: Float64Array, k: number): number {
  // Na horizontal mistura-se entre dois texels vizinhos: sem isso, cada coluna saltava de texel em texel e a textura tremia com a câmara.
  const { data, w, h, scale } = level;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < k; i++) {
    const uf = Math.min(w - 1.001, Math.max(0, (x + offX[i]! - WALL_NEAR_X) * scale - 0.5));
    const u0 = uf | 0;
    const fx = uf - u0;
    const v = Math.min(h - 1, Math.max(0, ((y + offY[i]! - WALL_Y) * scale) | 0));
    const p0 = data[v * w + u0]!;
    const p1 = data[v * w + u0 + 1]!;
    r += (p0 & 255) * (1 - fx) + (p1 & 255) * fx;
    g += ((p0 >> 8) & 255) * (1 - fx) + ((p1 >> 8) & 255) * fx;
    b += ((p0 >> 16) & 255) * (1 - fx) + ((p1 >> 16) & 255) * fx;
  }
  // As médias já ficam entre 0 e 255: dispensa-se o `packRgb`, que corre para cada píxel do chão.
  return (255 << 24) | (((b / k) & 255) << 16) | (((g / k) & 255) << 8) | ((r / k) & 255);
}

type FloorLevel = { data: Uint32Array; w: number; h: number; scale: number };
// Os desvios de cada amostra ao longo do troço: iguais em toda a linha, por isso calculam-se uma vez por linha.
const sampleOffX = new Float64Array(6);
const sampleOffY = new Float64Array(6);
function sampleOffsets(stepX: number, stepY: number, k: number): void {
  for (let i = 0; i < k; i++) {
    const f = (i + 0.5) / k;
    sampleOffX[i] = stepX * f;
    sampleOffY[i] = stepY * f;
  }
}

/** O nível do chão para uma fila: quantos texels cabem num píxel a esta distância. Um píxel vale `floorT` metros. */
const floorLevelFor = (t: CourtTextures, floorT: number): { data: Uint32Array; w: number; h: number; scale: number } => {
  const texels = floorT * FLOOR_SCALE;
  return t.floorLevels[texels >= 3 ? 2 : texels >= 1.5 ? 1 : 0]!;
};

/** As cores do clube da casa: o garrafão, o círculo, a orla do campo e metade da bancada. */
function dressed(theme: CourtTheme, accent: string): CourtTheme {
  const rgb: Rgb = [parseInt(accent.slice(1, 3), 16), parseInt(accent.slice(3, 5), 16), parseInt(accent.slice(5, 7), 16)];
  return {
    ...theme,
    paint: shade(rgb, 0.85),
    center: shade(rgb, 0.85),
    apron: theme.crowd ? () => shade(rgb, 0.5) : theme.apron,
    crowd: theme.crowd && { ...theme.crowd, shirts: [rgb, rgb, rgb, ...theme.crowd.shirts] },
  };
}

function buildWall(theme: CourtTheme, frame: number, wallW: number, wallH: number): Uint32Array {
  const wall = new Uint32Array(wallW * wallH);
  for (let j = 0; j < wallH; j++) {
    const z = (j + 0.5) / WALL_SCALE;
    for (let i = 0; i < wallW; i++) {
      const u = (i + 0.5) / WALL_SCALE;
      let color: Rgb;
      const x = u + WALL_NEAR_X;
      const tunnelFrame = theme.slope > 0 && u < SIDE_WALL_SPAN && x > TUNNEL.x0 - 0.2 && x < TUNNEL.x1 + 0.2 && z < TUNNEL.height + 0.2;
      if (tunnelFrame) {
        // A boca do túnel: escura por dentro, com uma moldura clara.
        color = x > TUNNEL.x0 && x < TUNNEL.x1 && z < TUNNEL.height ? [22, 24, 32] : [150, 152, 150];
      } else if (theme.boards.length > 0 && z < BOARD_HEIGHT) {
        const k = Math.floor(u / BOARD_WIDTH);
        // Vistas de lado, as placas do topo do campo ocupam muito ecrã, por isso ficam mais discretas.
        const base = shade(theme.boards[k % theme.boards.length]!, u < SIDE_WALL_SPAN ? 1 : 0.6);
        color = z > BOARD_HEIGHT - 0.06 ? shade(base, 0.7) : base;
      } else if (theme.crowd && z >= BOARD_HEIGHT && z < theme.crowd.from + CROWD_WALL) {
        // O muro baixo entre as placas e a primeira fila.
        color = z > theme.crowd.from + CROWD_WALL - 0.08 ? [120, 120, 118] : [156, 156, 150];
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
      // A placa que fica na boca do túnel não leva texto, senão as letras ficavam por cima dele.
      const x0 = WALL_NEAR_X + k * BOARD_WIDTH;
      if (theme.slope > 0 && x0 + BOARD_WIDTH > TUNNEL.x0 - 0.2 && x0 < TUNNEL.x1 + 0.2) continue;
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

/** O pavilhão dos jogos-treino: o da escola, à porta fechada. */
export const CLOSED_GYM = THEMES.length;
const VENUES: readonly CourtTheme[] = [...THEMES, { ...THEMES[1]!, name: 'Pavilhão Fechado', crowd: null }];

// O emblema da equipa da casa, com 3 m de lado, deitado no círculo central.
const CREST_METRES = 3;

/** As texturas calculam-se uma vez por divisão, cor da casa e emblema. Desenhar um frame é só consultá-las. */
export function courtTextures(division: number, accent?: string, emblem?: Emblem): CourtTextures {
  const key = `${division}|${accent ?? ''}|${emblem ? JSON.stringify(emblem) : ''}`;
  const cached = textureCache.get(key);
  if (cached) return cached;
  const theme = accent ? dressed(VENUES[division]!, accent) : VENUES[division]!;
  // Sem letras: no chão só se vê a forma e o símbolo.
  const crest = emblem ? emblemCanvas({ ...emblem, letters: '' }) : null;
  const crestSize = crest?.width ?? 0;
  const crestData = crest ? crest.getContext('2d')!.getImageData(0, 0, crestSize, crestSize).data : null;
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
      else if ((14 - x) * (14 - x) + y * y < 1.8 * 1.8) {
        color = isCenterSeam(wx, y) ? theme.line(1) : theme.center;
        // A câmara está do lado do y positivo: o topo do emblema fica para o lado de lá do campo (y negativo).
        if (crestData) {
          const ex = Math.floor(((wx - 14 + CREST_METRES / 2) / CREST_METRES) * crestSize);
          const ey = Math.floor(((y + CREST_METRES / 2) / CREST_METRES) * crestSize);
          if (ex >= 0 && ey >= 0 && ex < crestSize && ey < crestSize) {
            const k = (ey * crestSize + ex) * 4;
            if (crestData[k + 3]! > 128) color = [crestData[k]!, crestData[k + 1]!, crestData[k + 2]!];
          }
        }
      }
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
  const floorLevels: CourtTextures['floorLevels'] = [{ data: floor, w: floorW, h: floorH, scale: FLOOR_SCALE }];
  for (let level = 1; level <= 2; level++) floorLevels.push(halve(floorLevels[level - 1]!));
  const textures = { theme, floor, floorW, floorH, floorLevels, walls, wallW, wallH };
  // Cada pavilhão ocupa uns 12 MB e cada clube da casa tem o seu: só ficam os últimos.
  return remember(textureCache, key, textures, 3);
}

export class Camera {
  lookX = 14;
  lookY = LOOK_Y;
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
  /** A posição da câmara: onde está (y, z), para onde olha em repouso e a lente. Afinável, para se experimentarem enquadramentos. */
  tuning = { cy: 11.8, cz: 11, lookY: LOOK_Y, focal: BASE_FOCAL };

  setViewport(width: number, height: number): void {
    this.width = width;
    this.height = height;
    // Os bonecos têm sempre o mesmo tamanho em píxeis, por isso a lente também: um ecrã maior mostra mais campo, sem mudar o zoom.
    this.focal = this.tuning.focal;
  }

  tune(t: Partial<Camera['tuning']>): void {
    this.tuning = { ...this.tuning, ...t };
    this.setViewport(this.width, this.height);
    this.aim(this.lookX, this.lookY);
  }

  /** Câmara na lateral: acompanha a bola e roda um pouco para o cesto, como numa transmissão. Inclina-se quando a bola desce. */
  aim(lookX: number, lookY = this.tuning.lookY): void {
    this.lookX = lookX;
    this.lookY = lookY;
    this.cx = 14 + (lookX - 14) * 0.163;
    this.cy = this.tuning.cy;
    this.cz = this.tuning.cz;
    const dx = lookX - this.cx;
    const dy = lookY - this.cy;
    const dz = -this.cz;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this.fwd = [dx / length, dy / length, dz / length];
    const rightLength = Math.sqrt(this.fwd[0] * this.fwd[0] + this.fwd[1] * this.fwd[1]);
    this.right = [this.fwd[1] / rightLength, -this.fwd[0] / rightLength, 0];
    const [fx, fy, fz] = this.fwd;
    const [rx, ry, rz] = this.right;
    this.up = [ry * fz - rz * fy, rz * fx - rx * fz, rx * fy - ry * fx];
  }

  /** O campo de rua, ao ar livre: ver as cores e as distâncias do exterior, mais abaixo. A rede vai para a sua própria camada,
   * se a derem, para quem está do lado de fora poder ficar atrás dela. */
  drawOpenScene(pixels: Uint32Array, t: CourtTextures, fence?: Uint32Array): void {
  const { focal, fwd, right, up, cx, cy, cz, width, height } = this;
  const wall = t.walls[0]!;
  const backY = WALL_Y - BACKDROP;
  const backNearX = WALL_NEAR_X - BACKDROP;
  const backFarX = WALL_FAR_X + BACKDROP;
  for (let sy = 0; sy < height; sy++) {
    const vy = height / 2 - sy - 0.5;
    const row = sy * width;
    const rz = fwd[2] * focal + up[2] * vy;
    const baseX = fwd[0] * focal + up[0] * vy + right[0] * (0.5 - width / 2);
    const baseY = fwd[1] * focal + up[1] * vy + right[1] * (0.5 - width / 2);
    const floorT = rz < 0 ? -cz / rz : Infinity;
    const level = floorLevelFor(t, floorT);
    // O troço de chão que esta linha cobre na vertical, medido ao meio: quantos texels, tantas amostras (até 4).
    const rzN = fwd[2] * focal + up[2] * (vy - 1);
    const floorTN = rzN < 0 ? -cz / rzN : Infinity;
    const midX = baseX + right[0] * (width / 2);
    const midY = baseY + right[1] * (width / 2);
    const stepX = floorTN < Infinity && floorT < Infinity ? (cx + (midX - up[0]) * floorTN) - (cx + midX * floorT) : 0;
    const stepY = floorTN < Infinity && floorT < Infinity ? (cy + (midY - up[1]) * floorTN) - (cy + midY * floorT) : 0;
    const samples = Math.min(6, Math.max(1, Math.round(Math.sqrt(stepX * stepX + stepY * stepY) * level.scale)));
    sampleOffsets(stepX, stepY, samples);
    for (let sx = 0; sx < width; sx++) {
      const dirX = baseX + right[0] * sx;
      const dirY = baseY + right[1] * sx;
      const hitX = cx + dirX * floorT;
      const hitY = cy + dirY * floorT;
      if (rz < 0 && hitX > WALL_NEAR_X && hitX < WALL_FAR_X && hitY > WALL_Y) {
        pixels[row + sx] = floorSample(level, hitX, hitY, sampleOffX, sampleOffY, samples);
        // A camada da rede também se limpa aqui: senão ficavam os píxeis da frame anterior a arrastar sobre o campo quando a câmara rodava.
        if (fence) fence[row + sx] = 0;
        continue;
      }
      // O pano de fundo: três planos verticais, a BACKDROP metros da rede.
      let back = Infinity;
      let along = 0;
      if (dirY < 0) {
        const tb = (backY - cy) / dirY;
        if (cz + rz * tb >= 0) {
          back = tb;
          along = cx + dirX * tb - backNearX;
        }
      }
      if (dirX < 0) {
        const tb = (backNearX - cx) / dirX;
        if (tb < back && cz + rz * tb >= 0) {
          back = tb;
          along = SIDE_WALL_SPAN + (cy + dirY * tb - backY);
        }
      } else if (dirX > 0) {
        const tb = (backFarX - cx) / dirX;
        if (tb < back && cz + rz * tb >= 0) {
          back = tb;
          along = SIDE_WALL_SPAN + (cy + dirY * tb - backY);
        }
      }
      let color = SKY;
      let mesh = 0;
      if (rz < 0 && floorT < back) {
        color = groundOutside(hitX, hitY);
      } else if (back < Infinity) {
        const z = cz + rz * back;
        const wu = Math.max(0, Math.min(t.wallW - 1, (along * WALL_SCALE) | 0));
        const wv = Math.max(0, Math.min(t.wallH - 1, (z * WALL_SCALE) | 0));
        color = wall[wv * t.wallW + wu]!;
      }
      // A rede, por cima: só a malha, os postes e o varão de cima; no centro, o portão.
      const fenceAt = (tf: number, a: number, side: boolean): void => {
        const zf = cz + rz * tf;
        if (zf <= 0 || zf >= FENCE_HEIGHT || tf > floorT) return;
        if (side && a > TUNNEL.x0 && a < TUNNEL.x1) {
          if (a < TUNNEL.x0 + 0.15 || a > TUNNEL.x1 - 0.15 || zf > FENCE_HEIGHT - 0.12) mesh = POST;
          return;
        }
        if (frac(a / 4) < 0.03 || zf > FENCE_HEIGHT - 0.08) {
          mesh = POST;
          return;
        }
        // A malha em píxeis inteiros, ancorada ao mundo, com o período a crescer com a proximidade: sem moiré a arrastar.
        // A malha é fixa ao mundo, em células de 40 cm: ancorada ao ecrã deslizava sobre a grade quando a câmara rodava.
        // Onde a célula fica com menos de 4 píxeis, só um véu: linhas tão finas fazem moiré que também parece arrastar.
        const ppm = focal / tf;
        const cellPx = FENCE_CELL * ppm;
        if (cellPx < 4) {
          mesh = VEIL;
          return;
        }
        const lineW = Math.max(1.2, cellPx * 0.16) / cellPx;
        if (frac((a + zf) / FENCE_CELL) < lineW || frac((a - zf) / FENCE_CELL) < lineW) mesh = FENCE;
      };
      if (dirY < 0) {
        const tf = (WALL_Y - cy) / dirY;
        const a = cx + dirX * tf;
        if (a >= WALL_NEAR_X && a <= WALL_FAR_X) fenceAt(tf, a, true);
      }
      if (dirX < 0) {
        const tf = (WALL_NEAR_X - cx) / dirX;
        const a = cy + dirY * tf;
        if (a >= WALL_Y) fenceAt(tf, a, false);
      } else if (dirX > 0) {
        const tf = (WALL_FAR_X - cx) / dirX;
        const a = cy + dirY * tf;
        if (a >= WALL_Y) fenceAt(tf, a, false);
      }
      if (fence) {
        fence[row + sx] = mesh;
        pixels[row + sx] = color;
      } else {
        pixels[row + sx] = mesh || color;
      }
    }
  }
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

  private lastScene: unknown[] = [];

  /** Esquece a última imagem: para quando se pinta por cima dos píxeis que `drawScene` deixou. */
  forgetScene(): void {
    this.lastScene = [];
  }

  /** Desenha o chão e as paredes, píxel a píxel, como o Modo 7 das consolas antigas.
   * Com a câmara parada e a mesma bancada, os píxeis já lá estão: não se refaz nada e devolve `false`. */
  drawScene(pixels: Uint32Array, t: CourtTextures, crowdFrame: number, fence?: Uint32Array): boolean {
    const key = [pixels, t, crowdFrame, fence, this.lookX, this.lookY, this.tuning, this.width, this.height];
    if (key.every((v, i) => v === this.lastScene[i])) return false;
    this.lastScene = key;
    if (t.theme.open) {
      this.drawOpenScene(pixels, t, fence);
      return true;
    }
    const { focal, fwd, right, up, cx, cy, cz, width, height } = this;
    const wall = t.walls[crowdFrame]!;
    const { slope } = t.theme;
    // As bancadas são planos inclinados que partem do chão e recuam ao subir. O raio só conta onde os corta acima do chão.
    const sideOffset = cy - WALL_Y + slope * cz;
    const nearOffset = cx - WALL_NEAR_X + slope * cz;
    const farOffset = WALL_FAR_X + slope * cz - cx;
    for (let sy = 0; sy < height; sy++) {
      const vy = height / 2 - sy - 0.5;
      const row = sy * width;
      // A câmara não roda sobre si mesma, por isso a altura do raio é igual em toda a linha.
      const rz = fwd[2] * focal + up[2] * vy;
      const baseX = fwd[0] * focal + up[0] * vy + right[0] * (0.5 - width / 2);
      const baseY = fwd[1] * focal + up[1] * vy + right[1] * (0.5 - width / 2);
      const floorT = rz < 0 ? -cz / rz : Infinity;
      const level = floorLevelFor(t, floorT);
      // O troço de chão que esta linha cobre na vertical, medido ao meio: quantos texels, tantas amostras (até 4).
      const rzN = fwd[2] * focal + up[2] * (vy - 1);
      const floorTN = rzN < 0 ? -cz / rzN : Infinity;
      const midX = baseX + right[0] * (width / 2);
      const midY = baseY + right[1] * (width / 2);
      const stepX = floorTN < Infinity && floorT < Infinity ? (cx + (midX - up[0]) * floorTN) - (cx + midX * floorT) : 0;
      const stepY = floorTN < Infinity && floorT < Infinity ? (cy + (midY - up[1]) * floorTN) - (cy + midY * floorT) : 0;
      const samples = Math.min(6, Math.max(1, Math.round(Math.sqrt(stepX * stepX + stepY * stepY) * level.scale)));
      sampleOffsets(stepX, stepY, samples);
      for (let sx = 0; sx < width; sx++) {
        const dirX = baseX + right[0] * sx;
        const dirY = baseY + right[1] * sx;
        const hitX = cx + dirX * floorT;
        const hitY = cy + dirY * floorT;
        if (hitX > WALL_NEAR_X && hitX < WALL_FAR_X && hitY > WALL_Y) {
          pixels[row + sx] = floorSample(level, hitX, hitY, sampleOffX, sampleOffY, samples);
          continue;
        }
        let hit = Infinity;
        let onSide = false;
        const dSide = dirY + slope * rz;
        if (dSide < 0) {
          const tSide = -sideOffset / dSide;
          if (cz + rz * tSide >= 0) {
            hit = tSide;
            onSide = true;
          }
        }
        const dNear = dirX + slope * rz;
        if (dNear < 0) {
          const tNear = -nearOffset / dNear;
          if (tNear < hit && cz + rz * tNear >= 0) {
            hit = tNear;
            onSide = false;
          }
        }
        const dFar = dirX - slope * rz;
        if (dFar > 0) {
          const tFar = farOffset / dFar;
          if (tFar < hit && cz + rz * tFar >= 0) {
            hit = tFar;
            onSide = false;
          }
        }
        // Cada bancada tem a sua faixa na textura: o texto da publicidade só fica na lateral. Acima de tudo, o teto.
        const along = hit === Infinity ? 0 : onSide ? cx + dirX * hit - WALL_NEAR_X : cy + dirY * hit - WALL_Y + SIDE_WALL_SPAN;
        const z = hit === Infinity ? WALL_Z_SPAN : cz + rz * hit;
        const wu = Math.max(0, Math.min(t.wallW - 1, (along * WALL_SCALE) | 0));
        const wv = Math.max(0, Math.min(t.wallH - 1, (z * WALL_SCALE) | 0));
        pixels[row + sx] = wall[wv * t.wallW + wu]!;
      }
    }
    return true;
  }
}

/** O campo de rua, ao ar livre: o chão continua para lá da rede, com passeio e relva; a rede é só a malha, por cima do que está atrás;
 * ao longe, um pano de fundo vertical com prédios e árvores, e o céu por cima de tudo. Cada plano é cortado pelo raio onde calha. */
const BACKDROP = 14;
const FENCE_HEIGHT = 2.2;
const SKY = packRgb([156, 206, 226]);
const FENCE = packRgb([104, 112, 120]);
const POST = packRgb([110, 116, 124]);
const FENCE_CELL = 0.4;
// Um cinzento meio transparente, para a grade vista de longe.
const VEIL = (120 << 24) | (120 << 16) | (112 << 8) | 104;
// O passeio e a relva de fora são lisos: com ruído por célula, de raspão, viam-se riscas a arrastar com a câmara.
const PAVEMENT = packRgb([150, 150, 146]);
const GRASS = packRgb([100, 154, 80]);
const GRASS_DARK = packRgb([92, 144, 74]);
function groundOutside(x: number, y: number): number {
  const outside = Math.max(WALL_Y - y, WALL_NEAR_X - x, x - WALL_FAR_X);
  if (outside < 1.6) return PAVEMENT;
  // Faixas largas de relva cortada, que não tremem.
  return Math.floor((x + y) / 4) % 2 === 0 ? GRASS : GRASS_DARK;
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
