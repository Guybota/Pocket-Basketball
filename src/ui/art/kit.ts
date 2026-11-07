// O equipamento e o emblema do clube são dados guardados. Só os desenhos é que precisam de um browser.
import { text } from './font.ts';
import { INK } from './palette.ts';
import { remember } from './cache.ts';

export type KitPattern = 'plain' | 'stripes' | 'band' | 'half' | 'sash' | 'hoops' | 'pin' | 'sides';

export interface ClubKit {
  id: string;
  name: string;
  jersey: string;
  second: string;
  pattern: KitPattern;
  trim: string;
  shorts: string;
}

export const DEFAULT_KITS: readonly ClubKit[] = [
  { id: 'home', name: 'Principal', jersey: '#2b5fd9', second: '#f8f0d8', pattern: 'plain', trim: '#ffffff', shorts: '#f4f4f4' },
  { id: 'gold', name: 'Alternativo', jersey: '#f2c230', second: '#1b2230', pattern: 'plain', trim: '#1b2230', shorts: '#1b2230' },
  { id: 'green', name: 'Terceiro', jersey: '#2f8f5b', second: '#f8f0d8', pattern: 'stripes', trim: '#f4efe0', shorts: '#f4efe0' },
  { id: 'cream', name: 'Claro', jersey: '#f4efe0', second: '#2b5fd9', pattern: 'band', trim: '#2b5fd9', shorts: '#2b5fd9' },
];
export const PALETTE: readonly string[] = ['#2b5fd9', '#17737a', '#2f8f5b', '#f2c230', '#e8622a', '#cf3a2c', '#7246c4', '#1b2230', '#f4efe0', '#ffffff', '#7ec8e0', '#8b3a2c'];
export const KIT_PATTERNS: readonly (readonly [KitPattern, string])[] = [['plain', 'Liso'], ['stripes', 'Riscas'], ['pin', 'Finas'], ['hoops', 'Aros'], ['band', 'Faixa'], ['sash', 'Diagonal'], ['half', 'Metades'], ['sides', 'Laterais']];

export function shadeOf(color: string): string {
  const value = parseInt(color.slice(1), 16);
  const dark = (c: number): number => Math.round(c * 0.72);
  return `#${[dark((value >> 16) & 255), dark((value >> 8) & 255), dark(value & 255)].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Para escolher a cor do texto por cima de uma cor do equipamento. */
export function isLight(color: string): boolean {
  const value = parseInt(color.slice(1), 16);
  return ((value >> 16) & 255) * 0.3 + ((value >> 8) & 255) * 0.59 + (value & 255) * 0.11 > 150;
}

export const kitKey = (kit: ClubKit): string => `${kit.jersey}${kit.second}${kit.pattern}${kit.trim}${kit.shorts}`;

/** O desenho da camisola escolhe, píxel a píxel, entre a cor principal e a segunda. */
export function usesSecond(kit: ClubKit, x: number, y: number): boolean {
  switch (kit.pattern) {
    case 'stripes': return x % 4 < 2;
    case 'pin': return x % 4 === 0;
    case 'hoops': return y % 6 < 3;
    case 'band': return y >= 22 && y <= 25;
    case 'sash': return Math.abs(x - y + 6) <= 1;
    case 'half': return x >= 17;
    case 'sides': return x < 13 || x > 21;
    default: return false;
  }
}

/** O mesmo desenho no tronco de um boneco, que é pequeno e muda de sítio com a altura: a faixa, a diagonal e as laterais
 * contam-se a partir do ombro esquerdo (col, row), em width colunas e rows linhas; os outros desenhos já se veem como estão. */
export function usesSecondOnBody(kit: ClubKit, x: number, y: number, col: number, row: number, width: number, rows: number): boolean {
  switch (kit.pattern) {
    case 'band': return row === (rows >> 1) - 1 || row === rows >> 1;
    case 'sash': return Math.abs(col - (row * (width - 1)) / Math.max(1, rows - 1)) < 1;
    case 'sides': return col <= 0 || col >= width - 1;
    default: return usesSecond(kit, x, y);
  }
}

// Estas cores vão parar a atributos de HTML, por isso um clube guardado só as passa com este formato.
const isColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

export function validKit(kit: ClubKit): boolean {
  return typeof kit === 'object' && kit !== null && typeof kit.id === 'string' && typeof kit.name === 'string'
    && [kit.jersey, kit.second, kit.trim, kit.shorts].every(isColor)
    && KIT_PATTERNS.some(([pattern]) => pattern === kit.pattern);
}

export type EmblemShape = 'shield' | 'circle' | 'diamond' | 'pennant' | 'hexagon' | 'badge' | 'oval' | 'round';
export type EmblemPattern = 'plain' | 'stripes' | 'half' | 'band' | 'quarters' | 'chevron' | 'hoops' | 'rays' | 'checks' | 'ring' | 'dots';
export type EmblemSymbol = 'ball' | 'star' | 'bolt' | 'crown' | 'hoop' | 'anchor' | 'tower' | 'tree' | 'wave' | 'sun' | 'moon' | 'mountain' | 'flame' | 'wing' | 'trident' | 'cross' | 'gem' | 'paw' | 'rocket' | 'heart'
  | 'lion' | 'bull' | 'eagle' | 'fish' | 'horse' | 'owl' | 'wolf' | 'ship' | 'bridge' | 'castle' | 'lighthouse' | 'windmill' | 'dragon' | 'bear' | 'shark' | 'rooster' | 'seagull' | 'wheat' | 'torch' | 'tram' | 'compass' | 'none';
/** Só os clubes da liga os usam: o editor não os mostra, para o emblema de cada clube ser único. */
export const RESERVED_SYMBOLS: readonly EmblemSymbol[] = ['lion', 'bull', 'eagle', 'fish', 'horse', 'owl', 'wolf', 'ship', 'bridge', 'castle', 'lighthouse', 'windmill', 'dragon', 'bear', 'shark', 'rooster', 'seagull', 'wheat', 'torch', 'tram', 'compass'];
export type EmblemBorder = 'ink' | 'light' | 'gold';

export interface Emblem {
  shape: EmblemShape;
  pattern: EmblemPattern;
  primary: string;
  secondary: string;
  accent: string;
  symbol: EmblemSymbol;
  letters: string;
  /** A cor do contorno. Sem valor, é a tinta, como nos clubes guardados antes de haver escolha. */
  border?: EmblemBorder;
}

/** As opções do emblema, com o nome que o editor mostra. */
export const EMBLEM_SHAPE_LIST: readonly (readonly [EmblemShape, string])[] = [['shield', 'Escudo'], ['round', 'Escudo redondo'], ['circle', 'Círculo'], ['oval', 'Oval'], ['diamond', 'Losango'], ['hexagon', 'Hexágono'], ['badge', 'Placa'], ['pennant', 'Galhardete']];
export const EMBLEM_PATTERN_LIST: readonly (readonly [EmblemPattern, string])[] = [['plain', 'Liso'], ['stripes', 'Riscas'], ['hoops', 'Aros'], ['half', 'Metades'], ['quarters', 'Quartos'], ['band', 'Faixa'], ['chevron', 'Chevron'], ['rays', 'Raios'], ['checks', 'Xadrez'], ['ring', 'Anel'], ['dots', 'Pintas']];
export const EMBLEM_SYMBOL_LIST: readonly (readonly [EmblemSymbol, string])[] = [['ball', 'Bola'], ['hoop', 'Cesto'], ['star', 'Estrela'], ['bolt', 'Raio'], ['crown', 'Coroa'], ['anchor', 'Âncora'], ['tower', 'Torre'], ['tree', 'Pinheiro'], ['wave', 'Onda'], ['sun', 'Sol'], ['moon', 'Lua'], ['mountain', 'Serra'], ['flame', 'Chama'], ['wing', 'Asa'], ['trident', 'Tridente'], ['cross', 'Cruz'], ['gem', 'Pedra'], ['paw', 'Pata'], ['rocket', 'Foguetão'], ['heart', 'Coração'], ['none', 'Nenhum']];
export const EMBLEM_BORDER_LIST: readonly (readonly [EmblemBorder, string])[] = [['ink', 'Tinta'], ['light', 'Claro'], ['gold', 'Dourado']];
const BORDER_COLORS: Record<EmblemBorder, string> = { ink: INK, light: '#f8f0d8', gold: '#f2c230' };

const EMBLEM_SHAPES: readonly EmblemShape[] = EMBLEM_SHAPE_LIST.map(([id]) => id);
const EMBLEM_PATTERNS: readonly EmblemPattern[] = EMBLEM_PATTERN_LIST.map(([id]) => id);
/** Os símbolos, 10 por 10, para o jogo e para as maquetas. */
export const EMBLEM_SYMBOLS: Record<Exclude<EmblemSymbol, 'none'>, readonly string[]> = {
  ball: ['...####...', '..#.##.#..', '.#..##..#.', '#...##...#', '##########', '##########', '#...##...#', '.#..##..#.', '..#.##.#..', '...####...'],
  // Os símbolos dos clubes da liga: 14 por 14 e a duas cores ('o' é a segunda cor), cada um com a sua figura.
  lion: ['....oooooo....', '..oooooooooo..', '.ooo######ooo.', '.oo########oo.', 'oo##o####o##oo', 'oo##########oo', 'oo###.##.###oo', 'oo##########oo', '.oo###oo###oo.', '.oo########oo.', '..ooo####ooo..', '...oooooooo...', '.....o..o.....', '......o.o.....'],
  bull: ['oo..........oo', 'ooo........ooo', '.ooo......ooo.', '..oo..##..oo..', '...o.####.o...', '....######....', '...########...', '..##########..', '..###.##.###..', '..##########..', '...########...', '...##.##.##...', '....######....', '.....####.....'],
  eagle: ['......oo......', '.....oooo.....', '......oo......', '#....####....#', '##..######..##', '###.######.###', '##############', '.############.', '..##########..', '...########...', '....######....', '.....####.....', '....##..##....', '...o......o...'],
  fish: ['..............', '..............', '.......###....', '....########.o', '..###########o', '.####o#######o', 'o#############', 'o#############', '.####o######.o', '..###########o', '....########.o', '.......###....', '..............', '..............'],
  horse: ['....oo........', '...o##o.......', '..o####o......', '.o######o.....', '.o#######o....', '..#########...', '...#.#######..', '.....########.', '......#######.', '.......###.##.', '.......###..#.', '.......###....', '......####....', '......###.....'],
  owl: ['.##........##.', '.###......###.', '.############.', '.##oo####oo##.', '.#o##o##o##o#.', '.#o##o##o##o#.', '.##oo#oo#oo##.', '.#####oo#####.', '.############.', '.############.', '..##########..', '..##..##..##..', '...########...', '....o.....o...'],
  wolf: ['.........o#...', '........o##...', '.......o###...', '......#####...', '.....######...', '....#######...', '...########...', '..#########...', '.##########...', '.###########..', '.####.######..', '.####..#####..', '.##o....###...', '.##o....o##...'],
  ship: ['.......o......', '.......oo.....', '.......ooo....', '.......oooo...', '.......ooooo..', '.......oooooo.', '.......oo.....', '..............', '##############', '.############.', '..##########..', '...########...', '..............', '..............'],
  bridge: ['..............', '..............', '#............#', '##############', '##############', '##..######..##', '#....####....#', '#.#..####..#.#', '#.#.##..##.#.#', '#.#.#....#.#.#', 'oooooooooooooo', '.oooooooooooo.', '..oooooooooo..', '..............'],
  castle: ['#.##..##..##.#', '##############', '##############', '.############.', '.##o##..##o##.', '.##o##..##o##.', '.############.', '.############.', '.####o##o####.', '.####o##o####.', '.############.', '####.####.####', '####.####.####', '##############'],
  lighthouse: ['.....o###o....', '....o#####o...', '.....#####....', '......###.....', '.....o###o....', '......###.....', '.....#####....', '.....#####....', '.....#####....', '....#######...', '....#######...', '....#######...', '...#########..', 'ooooooooooooo.'],
  windmill: ['oo........oo..', '.oo......oo...', '..oo....oo....', '...oo..oo.....', '....o##o......', '.....####.....', '....o##o......', '...oo..oo.....', '..oo.####.oo..', '.oo..####..oo.', 'oo...####...oo', '.....####.....', '....######....', '...########...'],
  dragon: ['..........o...', '.......o.oo...', '......o#ooo...', '.....o####o...', '....o#####....', '...o######....', '..#########...', '.##########...', '.###.######...', '.####.#######.', '..#########o..', '...######.o...', '....oooo......', '....o..o......'],
  bear: ['..oo......oo..', '.oooo....oooo.', '.oo########oo.', '..##########..', '.############.', '.############.', '.###.####.###.', '.############.', '..###oooo###..', '..##oooooo##..', '..##oo..oo##..', '...##oooo##...', '....######....', '.....####.....'],
  shark: ['..............', '......#.......', '.....##.......', '....####......', '...######.....', '.#########..#.', '#o#########.##', '##############', '.#############', '..####.#####..', '....##..#.....', '.....#........', '..............', '..............'],
  rooster: ['.....oo.......', '....oooo......', '...oo##oo.....', '....####o.....', '...#####o.....', '..######......', '.########.....', 'oo#########...', '.o##########..', '..##########..', '...########...', '....######....', '.....#..#.....', '....oo..oo....'],
  seagull: ['..............', '.......##.....', '.....####.....', '..######.##...', '.####.....##..', '.##.........#.', '..............', '..............', '..oooooooooo..', '.oooooooooooo.', 'ooooooooooooo.', '..............', '..............', '..............'],
  wheat: ['......oo......', '.....o##o.....', '....o####o....', '.....o##o.....', '....o####o....', '.....o##o.....', '....o####o....', '.....o##o.....', '....o####o....', '......##......', '......##......', '......##......', '.....####.....', '......##......'],
  torch: ['.....oo.......', '....oooo......', '...oooooo.....', '...oooooo.....', '....oooo......', '..##########..', '..##########..', '...########...', '....######....', '.....####.....', '.....####.....', '.....####.....', '.....####.....', '.....####.....'],
  tram: ['......o.......', '......o.......', '..oooooooooo..', '.############.', '.#o##o##o##o#.', '.#o##o##o##o#.', '.############.', '.############.', '.#o########o#.', '.############.', '..##########..', '..##..##..##..', '...##....##...', '..............'],
  compass: ['......##......', '......##......', '.....####.....', '....o####o....', '...oo####oo...', '..oo##..##oo..', '##############', '##############', '..oo##..##oo..', '...oo####oo...', '....o####o....', '.....####.....', '......##......', '......##......'],
  star: ['....##....', '....##....', '...####...', '##########', '.########.', '..######..', '..######..', '.###..###.', '.##....##.', '#........#'],
  bolt: ['.....###..', '....###...', '...###....', '..######..', '.######...', '....###...', '...###....', '..###.....', '..##......', '.#........'],
  crown: ['..........', '#...##...#', '##..##..##', '###.##.###', '##########', '##########', '##########', '##########', '..........', '##########'],
  hoop: ['##########', '#........#', '#..####..#', '#..#..#..#', '##########', '..######..', '..#.##.#..', '..#.##.#..', '...#..#...', '...#..#...'],
  anchor: ['....##....', '...#..#...', '....##....', '....##....', '.#..##..#.', '##..##..##', '.#..##..#.', '..##..##..', '...####...', '....##....'],
  tower: ['#.##.##.##', '##########', '.########.', '.########.', '.##.##.##.', '.########.', '.########.', '.###..###.', '.###..###.', '##########'],
  tree: ['....##....', '...####...', '..######..', '.########.', '...####...', '..######..', '.########.', '##########', '....##....', '....##....'],
  wave: ['..........', '..........', '.##...##..', '#..#.#..#.', '....#....#', '..........', '.##...##..', '#..#.#..#.', '....#....#', '..........'],
  sun: ['....##....', '.#..##..#.', '..#....#..', '...####...', '#.######.#', '#.######.#', '...####...', '..#....#..', '.#..##..#.', '....##....'],
  moon: ['...#####..', '..###.....', '.###......', '.##.......', '###.......', '###.......', '.##.......', '.###......', '..###.....', '...#####..'],
  mountain: ['..........', '.....#....', '....###...', '...#####..', '.#.######.', '###.######', '##########', '##########', '..........', '..........'],
  flame: ['....#.....', '....##....', '...###....', '..####....', '..#####...', '.#######..', '.##.####..', '.##..###..', '..##.##...', '...###....'],
  wing: ['.......###', '.....#####', '...#######', '.#########', '########..', '.#####....', '..####....', '...###....', '....##....', '.....#....'],
  trident: ['#...##...#', '#...##...#', '#...##...#', '##..##..##', '.########.', '..######..', '....##....', '....##....', '....##....', '....##....'],
  cross: ['...####...', '...####...', '...####...', '##########', '##########', '##########', '...####...', '...####...', '...####...', '...####...'],
  gem: ['..######..', '.#......#.', '#.#.##.#.#', '##########', '.#..##..#.', '.#..##..#.', '..#.##.#..', '..#.##.#..', '...#..#...', '....##....'],
  paw: ['..#....#..', '.###..###.', '.###..###.', '#..#..#..#', '###.##.###', '###....###', '..######..', '.########.', '.########.', '..######..'],
  rocket: ['....##....', '...####...', '...####...', '...####...', '..######..', '..######..', '.########.', '##.####.##', '...####...', '..#....#..'],
  heart: ['..........', '.###..###.', '#####.####', '##########', '##########', '.########.', '..######..', '...####...', '....##....', '..........'],
};

/** Só letras e números que a letra do jogo sabe desenhar. */
export const emblemLetters = (value: string): string =>
  value.normalize('NFD').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);

export const defaultEmblem = (short: string): Emblem => ({
  shape: 'shield', pattern: 'plain', primary: '#2b5fd9', secondary: '#f8f0d8', accent: '#f2c230', symbol: 'ball', letters: emblemLetters(short),
});

export function validEmblem(emblem: Emblem): boolean {
  return typeof emblem === 'object' && emblem !== null
    && EMBLEM_SHAPES.includes(emblem.shape) && EMBLEM_PATTERNS.includes(emblem.pattern)
    // Object.hasOwn e não `in`: um ficheiro de fora com «constructor» ou «toString» não pode passar por símbolo.
    && (emblem.symbol === 'none' || (typeof emblem.symbol === 'string' && Object.hasOwn(EMBLEM_SYMBOLS, emblem.symbol)))
    && [emblem.primary, emblem.secondary, emblem.accent].every(isColor)
    && typeof emblem.letters === 'string' && emblemLetters(emblem.letters) === emblem.letters
    && (emblem.border === undefined || (typeof emblem.border === 'string' && Object.hasOwn(BORDER_COLORS, emblem.border)));
}

const EMBLEM_SIZE = 32;
const emblemCache = new Map<string, string>();
const emblemCanvases = new Map<string, HTMLCanvasElement>();

function inEmblem(shape: EmblemShape, x: number, y: number): boolean {
  const c = (EMBLEM_SIZE - 1) / 2;
  const dx = x - c;
  const dy = y - c;
  if (shape === 'circle') return dx * dx + dy * dy <= 15.5 * 15.5;
  if (shape === 'oval') return (dx * dx) / (13 * 13) + (dy * dy) / (15.5 * 15.5) <= 1;
  if (shape === 'diamond') return Math.abs(dx) + Math.abs(dy) <= 16;
  if (shape === 'hexagon') return Math.abs(dx) <= 13.5 && Math.abs(dy) + Math.abs(dx) * 0.58 <= 15.5;
  if (shape === 'badge') return Math.abs(dx) <= 14 && Math.abs(dy) <= 14 && Math.abs(dx) + Math.abs(dy) <= 24;
  if (shape === 'pennant') return y < 31 && Math.abs(dx) <= 15 * (1 - Math.max(0, y - 18) / 13);
  // O escudo redondo: direito em cima, e por baixo do meio uma meia elipse.
  if (shape === 'round') return y >= 1 && Math.abs(dx) <= 14 && (y < 16 || (dx * dx) / (14 * 14) + ((y - 16) * (y - 16)) / (15 * 15) <= 1);
  // O escudo: direito em cima, a afunilar em bico.
  return y >= 1 && (y < 17 ? Math.abs(dx) <= 14 : Math.abs(dx) <= 14 - (y - 17));
}

/** Desenhado a partir das escolhas, por isso qualquer combinação sai logo em pixel art. */
export function emblemImage(emblem: Emblem): string {
  const key = JSON.stringify(emblem);
  const cached = emblemCache.get(key);
  if (cached) return cached;
  const url = emblemCanvas(emblem).toDataURL();
  remember(emblemCache, key, url, 300);
  return url;
}

/** O mesmo emblema como canvas, para quem o quer copiar coluna a coluna, como a bandeira. */
export function emblemCanvas(emblem: Emblem): HTMLCanvasElement {
  const key = JSON.stringify(emblem);
  const cached = emblemCanvases.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = EMBLEM_SIZE;
  canvas.height = EMBLEM_SIZE;
  const g = canvas.getContext('2d')!;
  const c = (EMBLEM_SIZE - 1) / 2;
  const second = (x: number, y: number): boolean => {
    const dx = x - c;
    const dy = y - c;
    switch (emblem.pattern) {
      case 'stripes': return x % 8 < 4;
      case 'hoops': return y % 8 < 4;
      case 'half': return x >= EMBLEM_SIZE / 2;
      case 'quarters': return (x >= EMBLEM_SIZE / 2) !== (y >= EMBLEM_SIZE / 2);
      case 'band': return Math.abs(x - y) <= 4;
      case 'chevron': return y - Math.abs(dx) >= 6 && y - Math.abs(dx) <= 11;
      // Doze sectores a partir do centro, alternados. Só a interface usa atan2: a simulação nunca passa por aqui.
      case 'rays': return Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI / 6)) % 2 === 0;
      case 'checks': return ((x >> 3) + (y >> 3)) % 2 === 1;
      case 'ring': return !inEmblem(emblem.shape, x - 5, y) || !inEmblem(emblem.shape, x + 5, y) || !inEmblem(emblem.shape, x, y - 5) || !inEmblem(emblem.shape, x, y + 5);
      case 'dots': return x % 6 < 2 && y % 6 < 2;
      default: return false;
    }
  };
  const fill = (x: number, y: number): string => (second(x, y) ? emblem.secondary : emblem.primary);
  const border = BORDER_COLORS[emblem.border ?? 'ink'];
  for (let y = 0; y < EMBLEM_SIZE; y++) {
    for (let x = 0; x < EMBLEM_SIZE; x++) {
      if (!inEmblem(emblem.shape, x, y)) continue;
      const edge = !inEmblem(emblem.shape, x - 1, y) || !inEmblem(emblem.shape, x + 1, y) || !inEmblem(emblem.shape, x, y - 1) || !inEmblem(emblem.shape, x, y + 1);
      g.fillStyle = edge ? border : fill(x, y);
      g.fillRect(x, y, 1, 1);
    }
  }
  if (emblem.symbol !== 'none') {
    const rows = EMBLEM_SYMBOLS[emblem.symbol];
    // O símbolo fica centrado; com letras por baixo, encosta-se a elas. Primeiro a tinta, 2 por 2, faz o contorno.
    const left = Math.round((EMBLEM_SIZE - rows[0]!.length) / 2);
    const top = emblem.letters ? 17 - rows.length : Math.round((EMBLEM_SIZE - rows.length) / 2);
    const paint = (match: (ch: string) => boolean, color: string, size: number): void => {
      g.fillStyle = color;
      rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (match(ch)) g.fillRect(left + x, top + y, size, size);
      }));
    };
    paint(ch => ch !== '.', INK, 2);
    paint(ch => ch === '#', emblem.accent, 1);
    paint(ch => ch === 'o', emblem.secondary, 1);
  }
  if (emblem.letters) {
    const left = Math.round((EMBLEM_SIZE - (emblem.letters.length * 4 - 1)) / 2);
    const top = emblem.symbol === 'none' ? 13 : 18;
    g.fillStyle = INK;
    g.fillRect(left - 1, top, emblem.letters.length * 4 + 1, 7);
    text(g, emblem.letters, left, top + 1, '#ffffff', 1);
  }
  remember(emblemCanvases, key, canvas, 300);
  return canvas;
}
