import { HOOP_U, THREE_CORNER_MAX_U, THREE_CORNER_V, THREE_RADIUS } from '../../sim/court.ts';
import { emblemCanvas, type Emblem } from './kit.ts';
import { INK } from './sprites.ts';
import { remember } from './cache.ts';
import { FONT } from './font.ts';

type Rgb = readonly [number, number, number];

/** A hora e o tempo do jogo: mudam a luz, as janelas e, no campo de rua, o céu. */
export interface Sky {
  hour: 'day' | 'evening' | 'night';
  /** Um dia de sol forte. */
  sun: boolean;
}

// Há espaço à volta do campo antes das bancadas, como num pavilhão a sério.
const WALL_NEAR_X = -4;
const WALL_FAR_X = 32;
const WALL_Y = -11;
const NEAR_Y = 17;
/** Para onde a câmara olha em repouso: um pouco para lá do meio do campo. */
export const LOOK_Y = -1.1;
/** Quantas filas de público cabem na bancada deste pavilhão. */
const rowStep = (theme: CourtTheme): number => theme.crowd?.rowStep ?? FAN_ROW_STEP;
export const fanRows = (theme: CourtTheme): number => (theme.crowd ? Math.min(5, Math.floor((theme.crowd.to - theme.crowd.from - CROWD_WALL) / rowStep(theme))) : 0);
/** A altura de uma fila de público na bancada, acima do muro. */
export const fanHeight = (theme: CourtTheme, row: number): number => (theme.crowd ? theme.crowd.from : 1) + CROWD_WALL + 0.3 + row * rowStep(theme);
/** Onde assentam os pés de um adepto da bancada lateral: a bancada recua ao subir. */
export const sideFanSpot = (theme: CourtTheme, row: number): { y: number; z: number } => {
  const z = fanHeight(theme, row);
  return { y: WALL_Y - theme.slope * z, z };
};
/** O mesmo, nas bancadas dos topos. */
export const endFanSpot = (theme: CourtTheme, far: boolean, row: number): { x: number; z: number } => {
  const z = fanHeight(theme, row);
  const slope = theme.endSlope ?? theme.slope;
  return { x: far ? WALL_FAR_X + slope * z : WALL_NEAR_X - slope * z, z };
};
/** As escadas: corredores de degraus que sobem a bancada a meio das filas, com 1,3 m, onde passa um adepto (~0,84 m) à vontade. */
const AISLE_HALF = 0.65;
/** Um adepto sentado ocupa ~0,42 m para cada lado: os lugares ficam a 1,1 m do meio do corredor. */
const SEAT_CLEAR = 1.1;
/** Nas bancadas em degraus, os dois cantos do fundo são cortados a 45°: uma terceira bancada, 4 m para cada lado do canto. */
const CHAMFER = 4;
/** Sem cantos cortados (o ginásio), há uma escada encostada à parede de cada topo, com esta largura. */
const WALL_STAIR = 1.3;
/** Sem cantos cortados, o primeiro lugar fica a esta distância da parede, fora da escada. */
const JUNCTION_GAP = 1.8;
/** Nos cantos cortados, as filas dão a volta sem interrupção: os lugares ficam a esta distância da dobra, para dois adeptos
 * de bancadas vizinhas (a 135°) ficarem a um lugar um do outro. */
const CREASE_GAP = 0.7;
/** Quanto cada dobra anda ao longo da fila por metro de altura: as filas do canto alargam ao subir, como num anel. */
const junctionShift = (theme: CourtTheme): number => (Math.SQRT2 - 1) * theme.slope;
const sideJunction = (theme: CourtTheme, z: number, far: boolean): number => (far ? WALL_FAR_X - CHAMFER + junctionShift(theme) * z : WALL_NEAR_X + CHAMFER - junctionShift(theme) * z);
const endJunction = (theme: CourtTheme, z: number): number => WALL_Y + CHAMFER - junctionShift(theme) * z;
/** Metade do comprimento de uma fila da bancada do canto, à altura z, medida a partir do meio da diagonal. */
const diagHalf = (theme: CourtTheme, z: number): number => CHAMFER / Math.SQRT2 + junctionShift(theme) * z;

export type SeatPlane = 'side' | 'end' | 'diag';
/** Um lugar da bancada: onde assentam os pés, em que bancada fica e a posição ao longo da fila (x, y ou a diagonal). */
export interface Seat {
  x: number;
  y: number;
  z: number;
  plane: SeatPlane;
  far: boolean;
  along: number;
}

/**
 * As escadas de cada bancada, [de, até] ao longo da fila: x nas laterais, y nos topos e, na diagonal, a partir do meio dela.
 * Ficam longe das dobras dos cantos, onde as filas dão a volta em esquadria.
 */
export function stairs(theme: CourtTheme, plane: SeatPlane): [number, number][] {
  if (!theme.steps) return [];
  const mid = (c: number): [number, number] => [c - AISLE_HALF, c + AISLE_HALF];
  if (plane === 'diag') return [mid(0)];
  if (plane === 'end') return [mid(0), mid(7)];
  // A meio da lateral não há escada: por baixo fica o túnel, que é a entrada.
  if (theme.chamfer) return [mid(7), mid(21)];
  return [[WALL_NEAR_X, WALL_NEAR_X + WALL_STAIR], mid(0), mid(7), mid(21), mid(28), [WALL_FAR_X - WALL_STAIR, WALL_FAR_X]];
}
/** Se um lugar ao longo da fila fica perto de mais de uma escada. */
export const inAisle = (theme: CourtTheme, plane: SeatPlane, along: number): boolean =>
  stairs(theme, plane).some(([a, b]) => along > a - (SEAT_CLEAR - AISLE_HALF) && along < b + (SEAT_CLEAR - AISLE_HALF));

/** Onde começa a fila de cadeiras de cada bancada (o meio da primeira cadeira com gente): as cadeiras partem daqui. */
function seatStart(theme: CourtTheme, plane: SeatPlane, row: number): number {
  const z = fanHeight(theme, row);
  const half = (row % 2) * (FAN_SPACING / 2);
  if (!theme.steps) return plane === 'side' ? endFanSpot(theme, false, row).x + 0.7 + half : sideFanSpot(theme, row).y + 0.7 + half;
  // Sem cantos cortados, a bancada da lateral vai de parede a parede, com uma escada em cada ponta.
  if (!theme.chamfer) return plane === 'side' ? WALL_NEAR_X + JUNCTION_GAP + half : sideFanSpot(theme, row).y + JUNCTION_GAP + half;
  if (plane === 'side') return sideJunction(theme, z, false) + CREASE_GAP + half;
  if (plane === 'end') return endJunction(theme, z) + CREASE_GAP + half;
  // Na diagonal, a escada fica ao meio e os lugares dos dois lados ficam na mesma grelha de cadeiras (a escada tapa a do meio).
  return FAN_SPACING + half;
}

/**
 * Todos os lugares de uma fila, sem as escadas, as dobras dos cantos e a frente do túnel. Os adeptos sentam-se aqui e as
 * cadeiras desenham-se a partir daqui, uma por meio lugar, para cada adepto ficar sentado numa.
 */
export function seats(theme: CourtTheme, row: number): Seat[] {
  if (!theme.crowd) return [];
  const out: Seat[] = [];
  const z = fanHeight(theme, row);
  const sideY = WALL_Y - theme.slope * z;
  const last = !theme.steps ? endFanSpot(theme, true, row).x - 0.5 : theme.chamfer ? sideJunction(theme, z, true) - CREASE_GAP + 1e-6 : WALL_FAR_X - JUNCTION_GAP + 1e-6;
  for (let x = seatStart(theme, 'side', row); theme.steps ? x <= last : x < last; x += FAN_SPACING) {
    if (z < TUNNEL.height + 0.3 && x > TUNNEL.x0 - 0.5 && x < TUNNEL.x1 + 0.5) continue;
    if (inAisle(theme, 'side', x)) continue;
    out.push({ x, y: sideY, z, plane: 'side', far: false, along: x });
  }
  for (const far of theme.endStands === false ? [] : [false, true]) {
    const x = endFanSpot(theme, far, row).x;
    for (let y = seatStart(theme, 'end', row); y < 9; y += FAN_SPACING) if (!inAisle(theme, 'end', y)) out.push({ x, y, z, plane: 'end', far, along: y });
  }
  if (theme.chamfer) {
    const limit = diagHalf(theme, z) - CREASE_GAP + 1e-6;
    for (const far of [false, true]) {
      for (let m = seatStart(theme, 'diag', row); m <= limit; m += FAN_SPACING) {
        for (const a of [-m, m]) {
          // Do canto ao lugar: s ao longo do fundo, t ao longo do topo (a frente da diagonal tem s + t = CHAMFER).
          const s = (CHAMFER - Math.SQRT2 * theme.slope * z + Math.SQRT2 * a) / 2;
          const t = (CHAMFER - Math.SQRT2 * theme.slope * z - Math.SQRT2 * a) / 2;
          out.push({ x: far ? WALL_FAR_X - s : WALL_NEAR_X + s, y: WALL_Y + t, z, plane: 'diag', far, along: a });
        }
      }
    }
  }
  return out;
}

/**
 * Onde cai um ponto ao longo de uma fila de cadeiras, de 0 a 1: 0,5 é o meio de uma cadeira, 0 e 1 a frincha entre duas.
 * Há uma cadeira por cada meio lugar, alinhada com `seats`.
 */
export const chairPhase = (theme: CourtTheme, plane: SeatPlane, row: number, along: number): number =>
  frac((along - seatStart(theme, plane, row)) / (FAN_SPACING / 2) + 0.5);
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

// Marcas inventadas para a publicidade, sem acentos.
// Cada pavilhão começa a lista num sítio diferente, por isso as placas mudam de clube para clube.
const SPONSORS = ['SOPA DA AVO', 'PASTEL BAR', 'SESTA FM', 'BIFANA MAX', 'BAILARICO', 'CAFE CENTRAL', 'BICA BOA', 'TALHO LUIS', 'GRELHADOS', 'BOLO REI', 'TREMOCO FM', 'FERRAGENS ZE'] as const;

const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
const frac = (value: number): number => ((value % 1) + 1) % 1;
const shade = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];
const tinted = (c: Rgb, k: Rgb | undefined): Rgb => (k ? [c[0] * k[0], c[1] * k[1], c[2] * k[2]] : c);
const mix = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const hexRgb = (c: string): Rgb => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

export interface CourtTheme {
  name: string;
  note: string;
  swatch: string;
  floor(x: number, y: number, noise: number, plank: number): Rgb;
  paint: Rgb;
  center: Rgb;
  line(noise: number): Rgb;
  apron(noise: number): Rgb;
  /** Tudo o que não é público nem publicidade. Recebe o próprio tema, para ler a cor da parede, as janelas e a hora. */
  wall(u: number, z: number, t: CourtTheme): Rgb;
  /** A cor lisa da parede, e as janelas altas (cor e quantas por metro), onde as houver. */
  wallColor: Rgb;
  windows?: { color: Rgb; period: number };
  /** Ao ar livre: a cor do céu. */
  sky?: Rgb;
  /** A luz do dia ou da noite, multiplicada em cada canal do chão e das paredes. */
  tint?: Rgb;
  hour?: Sky['hour'];
  /** De 0 a 1: onde começa a lista de patrocinadores e por quanto se desloca o pano de fundo do bairro. Muda de clube para clube. */
  shift?: number;
  /** O soalho dentro da linha de 3 pontos fica mais escuro, envernizado de outra cor. */
  stain?: boolean;
  /** A faixa da claque no muro da bancada, com as cores do clube. */
  banner?: readonly [Rgb, Rgb];
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
  /** `rowStep`: a altura de cada fila de público (por omissão FAN_ROW_STEP); nas bancadas de tábuas é mais baixa. */
  crowd: { from: number; to: number; density: number; seats: readonly Rgb[]; shirts: readonly Rgb[]; dim: number; rowStep?: number } | null;
  flashes: boolean;
  /** A bancada em degraus a sério (piso, cadeiras e espelho), em vez de um plano inclinado com os lugares pintados. */
  steps?: boolean;
  /** Os dois cantos do fundo cortados a 45°, com uma terceira bancada (nas arenas). */
  chamfer?: boolean;
  /** Degraus de tábuas pintadas, sem cadeiras: as bancadas que se recolhem nos ginásios das escolas. */
  woodSteps?: boolean;
  /** Sem público nos topos: são paredes. */
  endStands?: boolean;
  /** A inclinação das paredes dos topos (por omissão a das bancadas); zero é uma parede a direito. */
  endSlope?: number;
  /** Acima da bancada da lateral, a parede sobe a direito em vez de continuar a recuar. */
  wallAbove?: boolean;
  /** Linhas de outras modalidades, desenhadas por baixo das do basquetebol, cada grupo com a sua cor. */
  extraLines?: readonly { color: Rgb; lines: readonly (readonly [number, number])[][] }[];
}

const SKIN_TONES: readonly Rgb[] = [[240, 200, 160], [208, 150, 104], [140, 92, 58], [98, 64, 42]];

/** As linhas que um pavilhão de escola partilha com outras modalidades: vólei a vermelho e dois campos de badminton a verde. */
// Só as linhas principais do badminton: as duplas colavam-se e o chão ficava cheio de linhas a tremer com a câmara.
const badminton = (cx: number): [number, number][][] => [
  [[cx - 3.05, -6.7], [cx + 3.05, -6.7], [cx + 3.05, 6.7], [cx - 3.05, 6.7], [cx - 3.05, -6.7]],
  [[cx - 3.05, 0], [cx + 3.05, 0]],
  [[cx - 3.05, -1.98], [cx + 3.05, -1.98]],
  [[cx - 3.05, 1.98], [cx + 3.05, 1.98]],
];
// Cores calmas, perto do tom do soalho: o vólei cor de tijolo, para não se confundir com as camisolas vermelhas.
const SCHOOL_LINES: CourtTheme['extraLines'] = [
  { color: [128, 160, 108], lines: [...badminton(7), ...badminton(21)] },
  { color: [176, 98, 72], lines: [[[5, -4.5], [23, -4.5], [23, 4.5], [5, 4.5], [5, -4.5]], [[11, -4.5], [11, 4.5]], [[17, -4.5], [17, 4.5]]] },
];

/** As paredes dos topos do ginásio (y ao longo da parede): espaldares, o marcador de abas e cartazes de papel. */
function schoolEnd(y: number, z: number, t: CourtTheme): Rgb {
  // Espaldares de madeira: só as barras ao alto, grossas, e a de cima; os degraus finos saíam em píxeis soltos.
  if (y > -9.5 && y < -3 && z < 2.8) {
    if (z > 2.62) return [150, 104, 58];
    return frac((y + 9.5) / 0.5) < 0.36 ? [176, 124, 70] : shade(t.wallColor, 0.94);
  }
  // O marcador de abas: moldura de madeira, fundo verde e quatro abas de papel com a dobra a meio.
  if (y > 0.5 && y < 5.5 && z > 3.2 && z < 4.6) {
    if (y < 0.6 || y > 5.4 || z < 3.3 || z > 4.5) return [92, 62, 38];
    for (const c of [1.3, 2, 3.4, 4.1]) {
      if (y > c && y < c + 0.6 && z > 3.5 && z < 4.25) return Math.abs(z - 3.87) < 0.03 ? [150, 140, 120] : [238, 230, 204];
    }
    return [30, 70, 50];
  }
  // Cartazes de papel presos com fita, cada um com uma faixa de cor e linhas de texto.
  for (const [c, band] of [[-1.6, [214, 64, 52]], [6.8, [52, 110, 170]], [9.4, [232, 180, 60]]] as const) {
    if (y > c && y < c + 1.1 && z > 1.9 && z < 3) {
      if (z > 2.78) return band as Rgb;
      return frac(z / 0.16) < 0.3 && y > c + 0.15 && y < c + 0.95 - (Math.floor(z / 0.16) % 2) * 0.25 ? [120, 116, 108] : [244, 238, 222];
    }
  }
  return t.wallColor;
}

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
    wall: (u0, z, t) => {
      // O pano de fundo, ao longe: prédios baixos e árvores do bairro, e o céu por cima. Cada bairro tem os seus prédios.
      const u = u0 + (t.shift ?? 0) * 40;
      const night = t.hour === 'night';
      const block = Math.floor(u / 5.5);
      const height = 2.3 + hash(block, 11) * 3.6;
      if (hash(block, 5) < 0.55 && z < height) {
        const tones: Rgb[] = [[196, 150, 112], [176, 168, 150], [150, 120, 104]];
        const tone = tones[Math.abs(block) % tones.length]!;
        const window = frac(u / 5.5) > 0.15 && frac(u / 5.5) < 0.85 && frac((u * 1.4) % 1) < 0.35 && frac(z * 1.1) > 0.35 && frac(z * 1.1) < 0.75;
        // À noite só algumas janelas estão acesas, e o resto do prédio fica no escuro.
        if (window) return !night ? [228, 220, 170] : hash(Math.floor(u * 1.4), Math.floor(z * 1.1)) < 0.55 ? [250, 214, 130] : [40, 44, 66];
        const c = z > height - 0.2 ? shade(tone, 0.7) : tone;
        return night ? shade(c, 0.36) : c;
      }
      if (Math.sin(u * 0.9) * 0.7 + 3.3 > z) return night ? [22, 48, 44] : [62, 134, 92];
      return t.sky ?? [156, 206, 226];
    },
    wallColor: [156, 206, 226],
    sky: [156, 206, 226],
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
    // As janelas sobem para cima da bancada de tábuas; os topos são paredes com espaldares, o marcador e cartazes.
    wall: (u, z, t) => (u >= SIDE_WALL_SPAN ? schoolEnd(u - SIDE_WALL_SPAN + WALL_Y, z, t) : t.windows && z > 5.4 && z < 7 && frac(u * t.windows.period) < 0.7 ? t.windows.color : t.wallColor),
    wallColor: [236, 226, 196],
    windows: { color: [186, 226, 240], period: 0.6 },
    slope: 0.9,
    steps: true,
    woodSteps: true,
    endStands: false,
    endSlope: 0,
    wallAbove: true,
    extraLines: SCHOOL_LINES,
    seams: true,
    pole: '#7f8a94',
    board: '#f4f4ee',
    ambient: 0.9,
    spot: 0.1,
    reflection: 0.1,
    boards: [[58, 128, 124], [226, 214, 182]],
    boardText: [40, 60, 70],
    crowd: { from: 1, to: 4.5, density: 0.3, seats: [[52, 86, 134], [44, 74, 116]], shirts: [[60, 110, 170], [190, 80, 60], [240, 210, 110], [90, 150, 110]], dim: 1, rowStep: 0.9 },
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
    wall: (_u, _z, t) => t.wallColor,
    wallColor: [70, 50, 52],
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
    steps: true,
    chamfer: true,
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
    wall: (_u, _z, t) => t.wallColor,
    wallColor: [14, 18, 36],
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
    steps: true,
    chamfer: true,
  },
];

// As linhas do campo não vão na textura: reamostrada em perspetiva, saíam serrilhadas e com espessuras diferentes.
// São traçados no mundo, desenhados depois do chão como linhas de 1 píxel, sempre com a mesma espessura.
const arc = (cx: number, r: number, from: number, to: number): [number, number][] => {
  const n = Math.max(4, Math.ceil((r * (to - from)) / 0.25));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / n;
    return [cx + r * Math.cos(a), r * Math.sin(a)];
  });
};
const halfCourtLines = (): [number, number][][] => {
  const cornerA = Math.asin(THREE_CORNER_V / THREE_RADIUS);
  const threeX = HOOP_U + THREE_RADIUS * Math.cos(cornerA);
  const lines: [number, number][][] = [
    [[0, -7.5], [0, 7.5]],
    [[0, 2.45], [5.8, 2.45], [5.8, -2.45], [0, -2.45]],
    // Mais pequeno do que o da FIBA, para não encostar à linha de 3, que também é mais curta.
    arc(5.8, 1.5, -Math.PI / 2, Math.PI / 2),
    arc(1.575, 1.25, -Math.PI / 2, Math.PI / 2),
    [[0, -THREE_CORNER_V], [Math.min(THREE_CORNER_MAX_U, threeX), -THREE_CORNER_V], ...arc(HOOP_U, THREE_RADIUS, -cornerA, cornerA), [0, THREE_CORNER_V]],
  ];
  // Traços ao longo da área, onde os jogadores se alinham no lance livre.
  for (const mark of [1.75, 2.6, 3.45, 4.3]) for (const side of [-1, 1]) lines.push([[mark, side * 2.45], [mark, side * 2.72]]);
  return lines;
};
export const COURT_LINES: readonly (readonly [number, number][])[] = [
  ...halfCourtLines(),
  ...halfCourtLines().map(l => l.map(([x, y]): [number, number] => [28 - x, y])),
  [[0, -7.5], [28, -7.5]],
  [[0, 7.5], [28, 7.5]],
  [[14, -7.5], [14, 7.5]],
  arc(14, 1.8, 0, Math.PI * 2),
];

/** O emblema do centro: uma bola desenhada com as costuras. */
function isCenterSeam(x: number, y: number): boolean {
  const r = Math.sqrt((x - 14) * (x - 14) + y * y);
  if (r > 1.05) return false;
  const arc = Math.sqrt((x - 12.9) * (x - 12.9) + y * y);
  return Math.abs(r - 1) < 0.05 || Math.abs(y) < 0.04 || Math.abs(arc - 0.95) < 0.04;
}

const packRgb = (c: Rgb): number => (255 << 24) | ((Math.max(0, Math.min(255, c[2])) & 255) << 16) | ((Math.max(0, Math.min(255, c[1])) & 255) << 8) | (Math.max(0, Math.min(255, c[0])) & 255);

/** A luz do teto ilumina o centro de cada meio-campo e deixa os cantos mais escuros. */
export function lightAt(theme: CourtTheme, x: number, y: number): number {
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
  /** Ao ar livre: o céu, e o passeio e as duas relvas de fora da rede, já com a luz da hora. */
  sky: number;
  ground: readonly [number, number, number];
  /** As cores dos degraus, por fila, já com a luz; null onde a bancada é um plano. */
  steps: StepColours | null;
}

/**
 * Os degraus da bancada: o primeiro piso fica 0,3 m acima do muro e cada um sobe uma fila de público (os pés dos adeptos
 * assentam no fundo de cada piso). Cores por fila, a escurecer para cima.
 */
interface StepColours {
  zs: number;
  t0: number;
  rise: number;
  rows: number;
  /** Tábuas sem cadeiras: o espelho mostra as juntas das tábuas. */
  wood: boolean;
  tread: Uint32Array;
  nosing: Uint32Array;
  chair: Uint32Array;
  chairTop: Uint32Array;
  gap: Uint32Array;
  riser: Uint32Array;
  aisleTread: Uint32Array;
  aisleRiser: Uint32Array;
  aisleSide: Uint32Array;
  aisleNose: Uint32Array;
  /** O lado dos blocos de cadeiras, cortados pela escada. */
  cutSide: Uint32Array;
}

function stepColours(theme: CourtTheme): StepColours | null {
  const crowd = theme.crowd;
  if (!theme.steps || !crowd) return null;
  const zs = crowd.from + CROWD_WALL;
  const t0 = zs + 0.3;
  const rise = rowStep(theme);
  const rows = Math.ceil((crowd.to - t0) / rise) + 2;
  const seat = crowd.seats[0]!;
  if (theme.woodSteps) {
    // Tábuas de madeira no piso, e o espelho de tábuas pintadas na cor do clube, com as juntas mais escuras.
    const wood: Rgb = [206, 162, 106];
    const painted = mix(seat, [96, 66, 44], 0.2);
    const woodTones = {
      tread: wood,
      nosing: mix(wood, [250, 232, 196], 0.45),
      chair: painted,
      chairTop: painted,
      gap: shade(painted, 0.78),
      riser: painted,
      aisleTread: shade(wood, 0.92),
      aisleRiser: shade(wood, 0.7),
      aisleSide: shade(wood, 0.8),
      aisleNose: mix(wood, [250, 232, 196], 0.45),
      cutSide: shade(painted, 0.86),
    };
    const woodOut = Object.fromEntries(Object.entries(woodTones).map(([name, c]) => [name, Uint32Array.from({ length: rows }, () => packRgb(tinted(shade(c, crowd.dim), theme.tint)))])) as unknown as Omit<StepColours, 'zs' | 't0' | 'rise' | 'rows' | 'wood'>;
    return { zs, t0, rise, rows, wood: true, ...woodOut };
  }
  const tread = mix(seat, [128, 128, 132], 0.62);
  // As cadeiras mais claras do que o betão por trás (nas arenas escuras confundiam-se), com a aresta de cima ao sol;
  // as escadas no tom do piso e com rebordo, para não parecerem pilares; a frincha pouco escura, para não piscar a andar.
  const chair = mix(seat, [236, 236, 236], 0.14);
  // As escadas em betão claro, para se lerem como um caminho a subir entre as cadeiras e não como um buraco: em cinzentos, o
  // tampo fica ~0,2 de L acima das cadeiras, e a frente, à sombra, ainda ~0,15.
  const stairTread = mix(seat, [222, 222, 226], 0.9);
  const tones = {
    tread,
    nosing: mix(seat, [196, 196, 196], 0.55),
    chair,
    chairTop: mix(seat, [236, 236, 236], 0.32),
    gap: shade(chair, 0.8),
    riser: shade(mix(seat, [24, 24, 30], 0.72), 0.8),
    aisleTread: stairTread,
    aisleRiser: shade(stairTread, 0.8),
    aisleSide: shade(stairTread, 0.9),
    // O rebordo de cada degrau da escada com uma faixa clara, como as de segurança.
    aisleNose: [250, 238, 190] as Rgb,
    // O lado dos blocos de cadeiras é do betão dos pisos, à sombra: escuro como o espelho, lia-se como um buraco.
    cutSide: shade(tread, 0.86),
  };
  const out = Object.fromEntries(Object.entries(tones).map(([name, c]) => [name, Uint32Array.from({ length: rows }, (_, j) => packRgb(tinted(shade(c, crowd.dim * (1 - (0.45 * j) / rows)), theme.tint)))])) as unknown as Omit<StepColours, 'zs' | 't0' | 'rise' | 'rows' | 'wood'>;
  return { zs, t0, rise, rows, wood: false, ...out };
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
  const rgb = hexRgb(accent);
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
      } else if (theme.crowd && z >= BOARD_HEIGHT && z < theme.crowd.from + CROWD_WALL && (u < SIDE_WALL_SPAN || theme.endStands !== false)) {
        // O muro baixo entre as placas e a primeira fila; dos dois lados do túnel, a faixa da claque, às riscas nas cores do clube.
        const top = theme.crowd.from + CROWD_WALL;
        const onBanner = theme.banner && u < SIDE_WALL_SPAN && ((x > 2.4 && x < 10.6) || (x > 17.4 && x < 25.6)) && z < top - 0.1;
        if (onBanner) color = shade(theme.banner![frac(x / 1.2) < 0.5 ? 0 : 1], z > top - 0.16 || z < BOARD_HEIGHT + 0.06 ? 0.7 : 1);
        else color = z > top - 0.08 ? [120, 120, 118] : [156, 156, 150];
      } else {
        color = (u < SIDE_WALL_SPAN || theme.endStands !== false ? crowdColor(theme, u, z, frame) : null) ?? theme.wall(u, z, theme);
      }
      wall[j * wallW + i] = packRgb(theme.open ? color : tinted(color, theme.tint));
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
      const label = SPONSORS[(k + Math.floor((theme.shift ?? 0) * SPONSORS.length)) % SPONSORS.length]!;
      const start = k * BOARD_WIDTH * WALL_SCALE;
      const width = label.length * 4 * scale - scale;
      const left = Math.round(start + (BOARD_WIDTH * WALL_SCALE + width) / 2);
      [...label].forEach((ch, index) => {
        const glyph = FONT[ch] ?? '00000';
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

/** Um número fixo por clube, tirado do emblema: o mesmo clube tem sempre o mesmo pavilhão. */
function venueSeed(emblem: Emblem): number {
  let h = 2166136261;
  for (const ch of JSON.stringify(emblem)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

// O soalho: o de sempre, cor de âmbar, nogueira escura e madeira clara lavada. Na rua: alcatrão, piso pintado de verde ou de tijolo.
const WOOD_TONES: readonly Rgb[] = [[1, 1, 1], [1.08, 0.97, 0.84], [0.86, 0.8, 0.78], [1.03, 1.05, 1.1]];
const STREET_TONES: readonly Rgb[] = [[1, 1, 1], [0.86, 1.22, 0.96], [1.3, 1, 0.86]];
const SCHOOL_WALLS: readonly Rgb[] = [[236, 226, 196], [212, 230, 208], [222, 228, 240]];
const HALL_WALLS: readonly Rgb[] = [[70, 50, 52], [42, 56, 72], [58, 62, 46]];
const SEAT_SHADOW: Rgb = [40, 40, 46];

/** O pavilhão de cada clube. A divisão manda no tipo de casa (rua, escola, municipal, arena); o emblema escolhe as cadeiras e a faixa
 * nas cores do clube, a parede, o tom do soalho, a luz, os patrocinadores, e os prédios do bairro. */
function clubVenue(theme: CourtTheme, emblem: Emblem): CourtTheme {
  const seed = venueSeed(emblem);
  const r = (salt: number): number => (Math.imul(seed ^ Math.imul(salt, 0x9e3779b9), 2654435761) >>> 0) / 4294967296;
  const pick = <T>(list: readonly T[], salt: number): T => list[Math.floor(r(salt) * list.length)]!;
  const tone = pick(theme.open ? STREET_TONES : WOOD_TONES, 1);
  const floor = theme.floor;
  const venue: CourtTheme = {
    ...theme,
    shift: r(2),
    ambient: theme.ambient + (r(3) - 0.5) * 0.08,
    spot: Math.max(0, theme.spot + (r(4) - 0.5) * 0.14),
    floor: (x, y, n, plank) => tinted(floor(x, y, n, plank), tone),
  };
  if (theme.open) return venue;
  const primary = hexRgb(emblem.primary);
  const secondary = hexRgb(emblem.secondary);
  return {
    ...venue,
    crowd: theme.crowd && { ...theme.crowd, seats: [mix(primary, SEAT_SHADOW, 0.35), mix(primary, SEAT_SHADOW, 0.5)] },
    banner: [primary, secondary],
    stain: r(10) < 0.5,
    wallColor: theme.windows ? pick(SCHOOL_WALLS, 6) : theme.slope >= 0.8 ? mix(theme.wallColor, primary, 0.2) : pick(HALL_WALLS, 6),
    windows: theme.windows && { ...theme.windows, period: pick([0.45, 0.6, 0.8], 7) },
  };
}

/** A hora e o tempo: a luz, as janelas e, ao ar livre, o céu. */
function underSky(theme: CourtTheme, sky: Sky): CourtTheme {
  const open = theme.open === true;
  const base: CourtTheme = { ...theme, hour: sky.hour };
  const windows = (color: Rgb): CourtTheme['windows'] => theme.windows && { ...theme.windows, color };
  if (sky.hour === 'night') {
    return open
      ? { ...base, sky: [26, 32, 62], ambient: 0.62, spot: 0.5, tint: [0.86, 0.9, 1.06] }
      : { ...base, ambient: theme.ambient * 0.86, spot: theme.spot + 0.16, tint: [0.94, 0.95, 1.03], windows: windows([34, 42, 74]) };
  }
  if (sky.hour === 'evening') return { ...base, sky: [236, 164, 120], ambient: theme.ambient * 0.96, tint: [1.06, 0.93, 0.82], windows: windows([246, 176, 118]) };
  if (sky.sun) return { ...base, sky: [110, 184, 236], ambient: theme.ambient * 1.07, tint: [1.04, 1.02, 0.95], windows: windows([236, 248, 252]) };
  return base;
}

// O emblema da equipa da casa, com 3 m de lado, deitado no círculo central.
const CREST_METRES = 3;

/** As texturas calculam-se uma vez por divisão, cor da casa, emblema do dono do pavilhão e tempo. Desenhar um frame é só consultá-las. */
export function courtTextures(division: number | CourtTheme, accent?: string, emblem?: Emblem, sky?: Sky): CourtTextures {
  // Um tema em vez da divisão serve as maquetas de cenários novos.
  const key = `${typeof division === 'number' ? division : division.name}|${accent ?? ''}|${emblem ? JSON.stringify(emblem) : ''}|${sky ? `${sky.hour}${sky.sun}` : ''}`;
  const cached = textureCache.get(key);
  if (cached) return cached;
  let theme = typeof division === 'number' ? VENUES[division]! : division;
  if (emblem) theme = clubVenue(theme, emblem);
  if (accent) theme = dressed(theme, accent);
  if (sky) theme = underSky(theme, sky);
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
      if (x < 0 || Math.abs(y) > 7.5) color = theme.apron(noise);
      else if (x < 5.8 && Math.abs(y) < 2.45) color = theme.paint;
      else if ((14 - x) * (14 - x) + y * y < 1.8 * 1.8) {
        color = isCenterSeam(wx, y) ? theme.line(1) : theme.center;
        // A câmara está do lado do y positivo: o topo do emblema fica para o lado de lá do campo (y negativo).
        if (crestData) {
          const ex = Math.floor(((wx - 14 + CREST_METRES / 2) / CREST_METRES) * crestSize);
          const ey = Math.floor(((y + CREST_METRES / 2) / CREST_METRES) * crestSize);
          if (ex >= 0 && ey >= 0 && ex < crestSize && ey < crestSize) {
            const k = (ey * crestSize + ex) * 4;
            // Só os texels opacos: os meio-transparentes da borda saíam como pontos claros no contorno do escudo.
            if (crestData[k + 3]! === 255) color = [crestData[k]!, crestData[k + 1]!, crestData[k + 2]!];
          }
        }
      }
      else {
        const row = Math.floor(y / 0.55);
        const plank = hash(row, Math.floor((wx + hash(row, 3) * 4) / 3.1)) - 0.5;
        color = theme.floor(x, y, noise, plank);
        if (theme.seams && frac(y / 0.55) < 0.07) color = [color[0] - 16, color[1] - 16, color[2] - 16];
        if (theme.stain && x >= 0 && (x - HOOP_U) * (x - HOOP_U) + y * y < THREE_RADIUS * THREE_RADIUS && Math.abs(y) < THREE_CORNER_V) color = shade(color, 0.86);
      }
      floor[j * floorW + i] = packRgb(tinted(shade(color, lightAt(theme, x, y)), theme.tint));
    }
  }
  // Ao ar livre, o céu e o chão para lá da rede seguem a mesma luz.
  const outside = (c: Rgb): number => packRgb(tinted(shade(c, Math.min(1, theme.ambient)), theme.tint));
  const skyColor = packRgb(theme.sky ?? [156, 206, 226]);
  const ground = [outside(PAVEMENT), outside(GRASS), outside(GRASS_DARK)] as const;
  const wallW = Math.ceil(WALL_U_SPAN * WALL_SCALE);
  const wallH = WALL_Z_SPAN * WALL_SCALE;
  const walls = Array.from({ length: CROWD_FRAMES }, (_, frame) => buildWall(theme, frame, wallW, wallH));
  const floorLevels: CourtTextures['floorLevels'] = [{ data: floor, w: floorW, h: floorH, scale: FLOOR_SCALE }];
  for (let level = 1; level <= 2; level++) floorLevels.push(halve(floorLevels[level - 1]!));
  const textures = { theme, floor, floorW, floorH, floorLevels, walls, wallW, wallH, sky: skyColor, ground, steps: stepColours(theme) };
  // Cada pavilhão ocupa uns 12 MB e cada clube da casa tem o seu: só ficam os últimos.
  return remember(textureCache, key, textures, 3);
}

/** As linhas do campo, cada uma com os pontos e a cor de cada troço (já com a luz e a hora): as das outras modalidades
 * primeiro, para as do basquetebol ficarem por cima. */
export function courtLinePaths(theme: CourtTheme): { points: readonly (readonly [number, number])[]; colors: number[] }[] {
  const all = [...(theme.extraLines ?? []).flatMap(group => group.lines.map(line => ({ line, fixed: group.color as Rgb | null }))), ...COURT_LINES.map(line => ({ line, fixed: null as Rgb | null }))];
  return all.map(({ line, fixed }) => ({
    points: line,
    colors: line.slice(1).map((b, i) => {
      const a = line[i]!;
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      return packRgb(tinted(shade(fixed ?? theme.line(hash(Math.floor(mx * 3), Math.floor(my * 3))), lightAt(theme, mx < 14 ? mx : 28 - mx, my)), theme.tint));
    }),
  }));
}

/** As mesmas linhas em troços; os troços seguidos de uma linha partilham o ponto (`b` de um é o `a` do seguinte). */
export function courtLineSegments(theme: CourtTheme): { a: readonly [number, number]; b: readonly [number, number]; color: number }[] {
  return courtLinePaths(theme).flatMap(({ points, colors }) => colors.map((color, i) => ({ a: points[i]!, b: points[i + 1]!, color })));
}

/** O chão dentro do pavilhão, em metros, e a sua textura: `chamfer` corta os dois cantos do lado de lá. */
export const FLOOR_AREA = { x0: WALL_NEAR_X, x1: WALL_FAR_X, y0: WALL_Y, y1: NEAR_Y, scale: FLOOR_SCALE, chamfer: CHAMFER } as const;
/** As medidas das paredes e da sua textura, para a placa gráfica fazer as mesmas contas do traçador de raios. */
export const WALL_SHAPE = { scale: WALL_SCALE, zSpan: WALL_Z_SPAN, sideSpan: SIDE_WALL_SPAN } as const;

/** A câmara do jogo: onde está (y, z), para onde olha em repouso e a lente. Os bonecos têm o tamanho certo para esta. */
const GAME_TUNING = { cy: 11.8, cz: 11, lookY: LOOK_Y, focal: BASE_FOCAL };
const lookDistance = (t: { cy: number; cz: number; lookY: number }): number => Math.sqrt((t.lookY - t.cy) * (t.lookY - t.cy) + t.cz * t.cz);

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
  tuning = { ...GAME_TUNING };

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
      let color = t.sky;
      let mesh = 0;
      if (rz < 0 && floorT < back) {
        color = groundOutside(hitX, hitY, t.ground);
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

  /**
   * O tamanho de um boneco com os pés na linha `sy` do ecrã, em relação a um no meio do campo: como no Calciobit, os de
   * trás ficam mais pequenos e os da frente maiores. É a raiz da relação das distâncias ao chão, e não a relação em si: a
   * nossa câmara é mais funda, e a perspetiva toda deixava os de trás com metade do tamanho (o Calciobit fica-se por ~70 %).
   */
  depthScale(sy: number): number {
    // A distância ao chão ao longo da linha `row` é inversa a isto (ver drawScene): o raio desce mais depressa perto.
    const drop = (row: number): number => -(this.fwd[2] * this.focal + this.up[2] * (this.height / 2 - row - 0.5));
    const near = drop(sy);
    const middle = drop(this.project(this.lookX, 0)[1]);
    if (near <= 0 || middle <= 0) return 1;
    // Noutra câmara (mais longe, ou com outra lente), todos os bonecos mudam na mesma proporção que o mundo; na do jogo, 1.
    const view = (this.tuning.focal / BASE_FOCAL) * (lookDistance(GAME_TUNING) / lookDistance(this.tuning));
    return Math.max(0.65, Math.min(1.35, Math.sqrt(near / middle))) * view;
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
      this.drawCourtLines(pixels, t.theme);
      return true;
    }
    const { focal, fwd, right, up, cx, cy, cz, width, height } = this;
    const wall = t.walls[crowdFrame]!;
    const { slope } = t.theme;
    // As bancadas são planos inclinados que partem do chão e recuam ao subir. O raio só conta onde os corta acima do chão.
    const sideOffset = cy - WALL_Y + slope * cz;
    // Os topos podem ter outra inclinação (zero: paredes a direito).
    const endSlope = t.theme.endSlope ?? slope;
    const nearOffset = cx - WALL_NEAR_X + endSlope * cz;
    const farOffset = WALL_FAR_X + endSlope * cz - cx;
    // Onde a bancada da lateral acaba e a parede sobe a direito, quando sobe.
    const standTop = t.theme.wallAbove && t.theme.crowd ? t.theme.crowd.to : Infinity;
    const wallAboveY = WALL_Y - slope * standTop;
    // Os cantos cortados: a distância da câmara para lá de cada diagonal, medida na perpendicular.
    const chamfer = t.steps !== null && t.theme.chamfer === true;
    const diagNear0 = (WALL_NEAR_X - cx + WALL_Y - cy + CHAMFER) / Math.SQRT2;
    const diagFar0 = (cx - WALL_FAR_X + WALL_Y - cy + CHAMFER) / Math.SQRT2;
    // As bancadas em degraus, como um só bloco: em cada uma, a profundidade d atrás da linha da frente e a posição c ao longo
    // da fila, ambas lineares no raio (d = d0 + ax·dirX + ay·dirY por unidade, c = c0 + bx·dirX + by·dirY).
    const R = Math.SQRT1_2;
    // A altura do bloco das bancadas a uma profundidade d atrás da linha da frente: o muro inclinado, depois os pisos das filas;
    // e a das escadas, em degraus de ~0,3 m que calham nos pisos das filas.
    const stepsOf = t.steps;
    const stairStep = stepsOf ? stepsOf.rise / Math.max(2, Math.round(stepsOf.rise / 0.3)) : 1;
    const standAt = (d: number): number =>
      !stepsOf || d < slope * stepsOf.zs ? d / slope : stepsOf.t0 + stepsOf.rise * Math.max(0, Math.floor((d / slope - stepsOf.t0) / stepsOf.rise) + 1);
    // A escada começa no cimo do muro, como a primeira fila: o primeiro degrau sobe do muro ao primeiro piso (0,3 m).
    const stairLid = (z: number): number => (!stepsOf ? 0 : z < stepsOf.t0 ? stepsOf.t0 : stepsOf.t0 + stairStep * Math.ceil((z - stepsOf.t0) / stairStep));
    const stairAt = (d: number): number => {
      if (!stepsOf || d < slope * stepsOf.zs) return d / slope;
      const z = d / slope;
      return z < stepsOf.t0 ? stepsOf.t0 : stepsOf.t0 + stairStep * (Math.floor((z - stepsOf.t0) / stairStep) + 1);
    };
    const stands: { kind: SeatPlane; d0: number; ax: number; ay: number; c0: number; bx: number; by: number; stairs: [number, number][] }[] = [];
    if (t.steps) {
      stands.push({ kind: 'side', d0: WALL_Y - cy, ax: 0, ay: -1, c0: cx, bx: 1, by: 0, stairs: stairs(t.theme, 'side') });
      if (t.theme.endStands !== false && endSlope === slope) {
        stands.push({ kind: 'end', d0: WALL_NEAR_X - cx, ax: -1, ay: 0, c0: cy, bx: 0, by: 1, stairs: stairs(t.theme, 'end') });
        stands.push({ kind: 'end', d0: cx - WALL_FAR_X, ax: 1, ay: 0, c0: cy, bx: 0, by: 1, stairs: stairs(t.theme, 'end') });
      }
      if (chamfer) {
        stands.push({ kind: 'diag', d0: diagNear0, ax: -R, ay: -R, c0: (cx - WALL_NEAR_X - cy + WALL_Y) * R, bx: R, by: -R, stairs: stairs(t.theme, 'diag') });
        stands.push({ kind: 'diag', d0: diagFar0, ax: R, ay: -R, c0: (WALL_FAR_X - cx - cy + WALL_Y) * R, bx: -R, by: -R, stairs: stairs(t.theme, 'diag') });
      }
    }
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
        if (hitX > WALL_NEAR_X && hitX < WALL_FAR_X && hitY > WALL_Y && (!chamfer || (hitX - WALL_NEAR_X + hitY - WALL_Y > CHAMFER && WALL_FAR_X - hitX + hitY - WALL_Y > CHAMFER))) {
          pixels[row + sx] = floorSample(level, hitX, hitY, sampleOffX, sampleOffY, samples);
          continue;
        }
        let hit = Infinity;
        let onSide = false;
        let far = false;
        let diag = false;
        const dSide = dirY + slope * rz;
        if (dSide < 0) {
          const tSide = -sideOffset / dSide;
          if (cz + rz * tSide >= 0) {
            hit = tSide;
            onSide = true;
          }
        }
        const dNear = dirX + endSlope * rz;
        if (dNear < 0) {
          const tNear = -nearOffset / dNear;
          if (tNear < hit && cz + rz * tNear >= 0) {
            hit = tNear;
            onSide = false;
          }
        }
        const dFar = dirX - endSlope * rz;
        if (dFar > 0) {
          const tFar = farOffset / dFar;
          if (tFar < hit && cz + rz * tFar >= 0) {
            hit = tFar;
            onSide = false;
            far = true;
          }
        }
        if (chamfer) {
          // As duas bancadas dos cantos: o raio sai do pavilhão pelo primeiro plano que cruza.
          for (const isFar of [false, true]) {
            const dd = ((isFar ? dirX : -dirX) - dirY) / Math.SQRT2;
            const den = dd - slope * rz;
            if (den <= 0) continue;
            const tDiag = (slope * cz - (isFar ? diagFar0 : diagNear0)) / den;
            if (tDiag > 0 && tDiag < hit && cz + rz * tDiag >= 0) {
              hit = tDiag;
              onSide = false;
              far = isFar;
              diag = true;
            }
          }
        }
        // Acima da bancada, a parede da lateral sobe a direito: o raio que passou por cima dela bate nessa parede.
        if (onSide && !diag && cz + rz * hit > standTop && dirY < 0) hit = (cy - wallAboveY) / -dirY;
        // Cada bancada tem a sua faixa na textura: o texto da publicidade só fica na lateral. Acima de tudo, o teto.
        // Nos pavilhões com degraus, o raio que bate no plano da bancada recua até ao degrau que encontrou primeiro.
        const steps = t.steps;
        if (steps && hit !== Infinity && rz < 0 && (onSide || diag || t.theme.endStands !== false) && cz + rz * hit < standTop) {
          const zIn = cz + rz * hit;
          const inward = diag ? ((far ? dirX : -dirX) - dirY) / Math.SQRT2 : onSide ? -dirY : far ? dirX : -dirX;
          // Por cima do túnel não há degraus: a boca fica inteira, como na parede lisa.
          const xIn = cx + dirX * hit;
          const tunnel = onSide && xIn > TUNNEL.x0 - 0.2 && xIn < TUNNEL.x1 + 0.2 && zIn < TUNNEL.height + 0.2;
          if (inward > 0 && !tunnel && stands.length > 0) {
            const rise = steps.rise;
            // A bancada onde o raio bate: a que tem o ponto mais para trás da sua linha da frente.
            let owner = 0;
            // 0 piso, 1 espelho, 5 o muro liso por baixo da bancada; na escada, 6 piso, 7 espelho, 8 lado; 9 o corte das filas.
            let tHit = hit;
            let face = 5;
            let j = 0;
            let below = 0;
            if (zIn >= steps.zs) {
              // O plano passa pelos cantos de dentro: o ponto do plano fica debaixo do piso j, atrás do espelho j.
              j = Math.max(0, Math.ceil((zIn - steps.t0) / rise));
              const top = steps.t0 + j * rise;
              below = j === 0 ? steps.zs : top - rise;
              const tTread = (top - cz) / rz;
              // As bancadas são um só bloco e cada degrau um anel à volta do campo, dobrado em esquadria nos cantos: o raio entra
              // no espelho j quando passa a linha dele na primeira bancada em que a passa.
              let tRiser = Infinity;
              let riserOwner = owner;
              for (let p = 0; p < stands.length; p++) {
                const st = stands[p]!;
                const dd = st.ax * dirX + st.ay * dirY;
                if (dd <= 0) continue;
                const tp = (slope * below - st.d0) / dd;
                if (tp < tRiser) {
                  tRiser = tp;
                  riserOwner = p;
                }
              }
              tHit = Math.max(tTread, tRiser);
              face = tTread >= tRiser ? 0 : 1;
              owner = riserOwner;
            }
            if (face !== 1 && stands.length > 1) {
              const tt = tHit;
              let deepest = -Infinity;
              for (let p = 0; p < stands.length; p++) {
                const st = stands[p]!;
                const d = st.d0 + (st.ax * dirX + st.ay * dirY) * tt;
                if (d > deepest) {
                  deepest = d;
                  owner = p;
                }
              }
            }
            const sp = stands[owner]!;
            const dd = sp.ax * dirX + sp.ay * dirY;
            const db = sp.bx * dirX + sp.by * dirY;
            // As escadas sobem a bancada do muro ao cimo, com degraus de ~0,3 m e os cantos de dentro no plano da bancada; os
            // pisos das filas calham num degrau. Ganha o que o raio encontrar primeiro: a escada, os lados dela ou as filas.
            let best = tHit;
            let stairFront = 0;
            if (dd > 0) {
              const cHit = sp.c0 + db * tHit;
              for (let si = 0; si < sp.stairs.length; si++) {
                const lo = sp.stairs[si]![0];
                const hi = sp.stairs[si]![1];
                if (cHit < lo - 3 || cHit > hi + 3) continue;
                // Dentro da escada, os pisos das filas não existem; o muro por baixo dela sim.
                if (face !== 5 && cHit > lo && cHit < hi) best = Infinity;
                const tP = (slope * cz - sp.d0) / (dd - slope * rz);
                const zP = cz + rz * tP;
                if (zP >= steps.zs) {
                  const lid = stairLid(zP);
                  const front = lid <= steps.t0 ? slope * steps.zs : slope * (lid - stairStep);
                  const tTr = (lid - cz) / rz;
                  const tRi = (front - sp.d0) / dd;
                  const tS = Math.max(tTr, tRi);
                  const cS = sp.c0 + db * tS;
                  if (tS > 0 && tS < best && cS >= lo && cS <= hi) {
                    best = tS;
                    face = tTr >= tRi ? 6 : 7;
                    stairFront = front;
                  }
                }
                if (db === 0) continue;
                for (let e = 0; e < 2; e++) {
                  const edge = e === 0 ? lo : hi;
                  const tb = (edge - sp.c0) / db;
                  if (!(tb > 0) || tb >= best) continue;
                  const d = sp.d0 + dd * tb;
                  if (d < 0) continue;
                  const into = db > 0 === (e === 0);
                  if (cz + rz * tb <= (into ? stairAt(d) : standAt(d))) {
                    best = tb;
                    face = into ? 8 : 9;
                  }
                }
              }
            }
            if (best !== Infinity) tHit = best;
            if (face !== 5) {
              const zHit = cz + rz * tHit;
              const k = Math.min(steps.rows - 1, Math.max(0, face <= 1 ? j : Math.ceil((zHit - steps.t0) / rise)));
              const dHit = sp.d0 + dd * tHit;
              if (face === 0) pixels[row + sx] = dHit - slope * below < 0.08 ? steps.nosing[k]! : steps.tread[k]!;
              else if (face === 1) {
                // As costas das cadeiras no fundo de cada piso, com uma frincha entre elas; o resto do espelho é betão.
                const local = zHit - below;
                // Nas tábuas não há cadeiras: o espelho mostra as juntas entre as tábuas.
                if (steps.wood) pixels[row + sx] = frac(local / 0.3) < 0.12 ? steps.gap[k]! : steps.riser[k]!;
                else if (local < 0.55 && j > 0) {
                  // As cadeiras da fila j - 1 (cujos pés estão neste canto), centradas nos lugares onde os adeptos se sentam.
                  const u = chairPhase(t.theme, sp.kind, j - 1, sp.c0 + db * tHit);
                  pixels[row + sx] = u < 0.07 || u > 0.93 ? steps.gap[k]! : local > 0.47 ? steps.chairTop[k]! : steps.chair[k]!;
                } else pixels[row + sx] = steps.riser[k]!;
              } else if (face === 6) {
                // O rebordo de cada degrau tem sempre pelo menos um píxel: o que um píxel cobre no piso, a esta distância.
                const noseW = Math.max(0.08, (1.2 * tHit * (dirX * dirX + dirY * dirY + rz * rz)) / (focal * -rz));
                pixels[row + sx] = dHit - stairFront < noseW ? steps.aisleNose[k]! : steps.aisleTread[k]!;
              } else if (face === 7) pixels[row + sx] = steps.aisleRiser[k]!;
              else if (face === 8) pixels[row + sx] = steps.aisleSide[k]!;
              else pixels[row + sx] = steps.cutSide[k]!;
              continue;
            }
            hit = tHit;
          }
        }
        // A diagonal usa a faixa dos topos da textura (sem letras), perto do canto.
        // Nos topos nunca se vai à faixa da lateral: nos cantos, para lá da bancada, aparecia o público pintado da lateral.
        const along = hit === Infinity ? 0 : diag ? SIDE_WALL_SPAN + 0.5 : onSide ? cx + dirX * hit - WALL_NEAR_X : Math.max(SIDE_WALL_SPAN, cy + dirY * hit - WALL_Y + SIDE_WALL_SPAN);
        const z = hit === Infinity ? WALL_Z_SPAN : cz + rz * hit;
        const wu = Math.max(0, Math.min(t.wallW - 1, (along * WALL_SCALE) | 0));
        const wv = Math.max(0, Math.min(t.wallH - 1, (z * WALL_SCALE) | 0));
        pixels[row + sx] = wall[wv * t.wallW + wu]!;
      }
    }
    this.drawCourtLines(pixels, t.theme);
    return true;
  }

  /** As linhas do campo, por cima do chão: 1 píxel, com a cor e a luz de cada troço. */
  private drawCourtLines(pixels: Uint32Array, theme: CourtTheme): void {
    const { width, height } = this;
    let last: readonly [number, number] | null = null;
    let px = 0;
    let py = 0;
    for (const { a, b, color } of courtLineSegments(theme)) {
      // No início de cada linha parte do primeiro ponto; nos troços seguidos continua do píxel onde o anterior acabou.
      if (a !== last) {
        [px, py] = this.project(a[0], a[1]);
        // O chão de cada píxel é a média do troço logo abaixo do seu centro: a linha desce meio píxel para ficar onde a área muda de cor.
        px = Math.floor(px);
        py = Math.floor(py - 0.5);
      }
      last = b;
      const [qx0, qy0] = this.project(b[0], b[1]);
      const qx = Math.floor(qx0);
      const qy = Math.floor(qy0 - 0.5);
      // Bresenham: cada passo avança um píxel no eixo mais longo, por isso a linha nunca engrossa nem tem buracos.
      const dx = Math.abs(qx - px);
      const dy = -Math.abs(qy - py);
      const stepX = px < qx ? 1 : -1;
      const stepY = py < qy ? 1 : -1;
      let err = dx + dy;
      let ax = px;
      let ay = py;
      for (;;) {
        if (ax >= 0 && ay >= 0 && ax < width && ay < height) pixels[ay * width + ax] = color;
        if (ax === qx && ay === qy) break;
        const e2 = 2 * err;
        if (e2 >= dy) {
          err += dy;
          ax += stepX;
        }
        if (e2 <= dx) {
          err += dx;
          ay += stepY;
        }
      }
      px = qx;
      py = qy;
    }
  }

  /** Onde está e para onde olha: para a placa gráfica desenhar com a mesma câmara. */
  pose(): { position: readonly [number, number, number]; fwd: readonly [number, number, number]; right: readonly [number, number, number]; up: readonly [number, number, number]; focal: number; width: number; height: number } {
    return { position: [this.cx, this.cy, this.cz], fwd: this.fwd, right: this.right, up: this.up, focal: this.focal, width: this.width, height: this.height };
  }
}

/** O campo de rua, ao ar livre: o chão continua para lá da rede, com passeio e relva; a rede é só a malha, por cima do que está atrás;
 * ao longe, um pano de fundo vertical com prédios e árvores, e o céu por cima de tudo. Cada plano é cortado pelo raio onde calha. */
const BACKDROP = 14;
const FENCE_HEIGHT = 2.2;
const FENCE = packRgb([104, 112, 120]);
const POST = packRgb([110, 116, 124]);
const FENCE_CELL = 0.4;
// Um cinzento meio transparente, para a grade vista de longe.
const VEIL = (120 << 24) | (120 << 16) | (112 << 8) | 104;
// O passeio e a relva de fora são lisos: com ruído por célula, de raspão, viam-se riscas a arrastar com a câmara.
const PAVEMENT: Rgb = [150, 150, 146];
const GRASS: Rgb = [100, 154, 80];
const GRASS_DARK: Rgb = [92, 144, 74];
function groundOutside(x: number, y: number, ground: CourtTextures['ground']): number {
  const outside = Math.max(WALL_Y - y, WALL_NEAR_X - x, x - WALL_FAR_X);
  if (outside < 1.6) return ground[0];
  // Faixas largas de relva cortada, que não tremem.
  return Math.floor((x + y) / 4) % 2 === 0 ? ground[1] : ground[2];
}

/** As medidas do campo de rua e as cores da rede, para a placa gráfica fazer as mesmas contas. */
export const OPEN_SHAPE = { backdrop: BACKDROP, fenceHeight: FENCE_HEIGHT, fenceCell: FENCE_CELL, fence: FENCE, post: POST, veil: VEIL, pavement: 1.6, stripe: 4 } as const;

/**
 * Pinta os píxeis cujo centro fica dentro do polígono. Duas faces com uma aresta comum dividem-na sem buracos nem
 * sobreposições, e uma aresta isométrica (2:1) avança sempre dois píxeis por linha, seja qual for a fração dos vértices.
 */
export function fillPolygon(g: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], color: string): void {
  g.fillStyle = color;
  const xs0 = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  // Uma risca mais estreita do que um píxel não tem centros dentro: fica com um píxel por linha, para não sair tracejada.
  const thin = Math.max(...xs0) - Math.min(...xs0) < 1;
  const y0 = Math.max(0, Math.ceil(Math.min(...ys) - 0.5));
  const y1 = Math.min(g.canvas.height - 1, Math.ceil(Math.max(...ys) - 0.5) - 1);
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5;
    const xs: number[] = [];
    points.forEach((a, i) => {
      const b = points[(i + 1) % points.length]!;
      if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    });
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const left = Math.ceil(xs[i]! - 0.5);
      const right = Math.ceil(xs[i + 1]! - 0.5);
      if (right > left) g.fillRect(left, y, right - left, 1);
      else if (thin) g.fillRect(Math.floor((xs[i]! + xs[i + 1]!) / 2), y, 1, 1);
    }
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
