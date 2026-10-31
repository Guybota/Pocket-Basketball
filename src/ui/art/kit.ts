// O equipamento e o emblema do clube são dados guardados. Só os desenhos é que precisam de um browser.
import { text } from './font.ts';
import { INK } from './palette.ts';

export type KitPattern = 'plain' | 'stripes' | 'band' | 'half';

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
export const KIT_PATTERNS: readonly (readonly [KitPattern, string])[] = [['plain', 'Liso'], ['stripes', 'Riscas'], ['band', 'Faixa'], ['half', 'Metades']];

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
  if (kit.pattern === 'stripes') return x % 4 < 2;
  if (kit.pattern === 'band') return y >= 22 && y <= 25;
  return kit.pattern === 'half' && x >= 17;
}

// Estas cores vão parar a atributos de HTML, por isso um clube guardado só as passa com este formato.
const isColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

export function validKit(kit: ClubKit): boolean {
  return typeof kit === 'object' && kit !== null && typeof kit.id === 'string' && typeof kit.name === 'string'
    && [kit.jersey, kit.second, kit.trim, kit.shorts].every(isColor)
    && KIT_PATTERNS.some(([pattern]) => pattern === kit.pattern);
}

export type EmblemShape = 'shield' | 'circle' | 'diamond' | 'pennant';
export type EmblemPattern = 'plain' | 'stripes' | 'half' | 'band';
export type EmblemSymbol = 'ball' | 'star' | 'bolt' | 'crown' | 'hoop' | 'none';

export interface Emblem {
  shape: EmblemShape;
  pattern: EmblemPattern;
  primary: string;
  secondary: string;
  accent: string;
  symbol: EmblemSymbol;
  letters: string;
}

const EMBLEM_SHAPES: readonly EmblemShape[] = ['shield', 'circle', 'diamond', 'pennant'];
const EMBLEM_PATTERNS: readonly EmblemPattern[] = ['plain', 'stripes', 'half', 'band'];
const EMBLEM_SYMBOLS: Record<Exclude<EmblemSymbol, 'none'>, readonly string[]> = {
  ball: ['...####...', '..#.##.#..', '.#..##..#.', '#...##...#', '##########', '##########', '#...##...#', '.#..##..#.', '..#.##.#..', '...####...'],
  star: ['....##....', '....##....', '...####...', '##########', '.########.', '..######..', '..######..', '.###..###.', '.##....##.', '#........#'],
  bolt: ['.....###..', '....###...', '...###....', '..######..', '.######...', '....###...', '...###....', '..###.....', '..##......', '.#........'],
  crown: ['..........', '#...##...#', '##..##..##', '###.##.###', '##########', '##########', '##########', '##########', '..........', '##########'],
  hoop: ['##########', '#........#', '#..####..#', '#..#..#..#', '##########', '..######..', '..#.##.#..', '..#.##.#..', '...#..#...', '...#..#...'],
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
    && (emblem.symbol === 'none' || emblem.symbol in EMBLEM_SYMBOLS)
    && [emblem.primary, emblem.secondary, emblem.accent].every(isColor)
    && typeof emblem.letters === 'string' && emblemLetters(emblem.letters) === emblem.letters;
}

const EMBLEM_SIZE = 32;
const emblemCache = new Map<string, string>();

function inEmblem(shape: EmblemShape, x: number, y: number): boolean {
  const c = (EMBLEM_SIZE - 1) / 2;
  const dx = x - c;
  const dy = y - c;
  if (shape === 'circle') return dx * dx + dy * dy <= 15.5 * 15.5;
  if (shape === 'diamond') return Math.abs(dx) + Math.abs(dy) <= 16;
  if (shape === 'pennant') return y < 31 && Math.abs(dx) <= 15 * (1 - Math.max(0, y - 18) / 13);
  // O escudo: direito em cima, a afunilar em bico.
  return y >= 1 && (y < 17 ? Math.abs(dx) <= 14 : Math.abs(dx) <= 14 - (y - 17));
}

/** Desenhado a partir das escolhas, por isso qualquer combinação sai logo em pixel art. */
export function emblemImage(emblem: Emblem): string {
  const key = JSON.stringify(emblem);
  const cached = emblemCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = EMBLEM_SIZE;
  canvas.height = EMBLEM_SIZE;
  const g = canvas.getContext('2d')!;
  const fill = (x: number, y: number): string => {
    if (emblem.pattern === 'stripes') return x % 8 < 4 ? emblem.primary : emblem.secondary;
    if (emblem.pattern === 'half') return x >= EMBLEM_SIZE / 2 ? emblem.secondary : emblem.primary;
    if (emblem.pattern === 'band') return Math.abs(x - y) <= 4 ? emblem.secondary : emblem.primary;
    return emblem.primary;
  };
  for (let y = 0; y < EMBLEM_SIZE; y++) {
    for (let x = 0; x < EMBLEM_SIZE; x++) {
      if (!inEmblem(emblem.shape, x, y)) continue;
      const edge = !inEmblem(emblem.shape, x - 1, y) || !inEmblem(emblem.shape, x + 1, y) || !inEmblem(emblem.shape, x, y - 1) || !inEmblem(emblem.shape, x, y + 1);
      g.fillStyle = edge ? INK : fill(x, y);
      g.fillRect(x, y, 1, 1);
    }
  }
  if (emblem.symbol !== 'none') {
    const rows = EMBLEM_SYMBOLS[emblem.symbol];
    const paint = (color: string, size: number, offset: number): void => {
      g.fillStyle = color;
      rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '#') g.fillRect(10 + x + offset, 4 + y + offset, size, size);
      }));
    };
    paint(INK, 2, 0);
    paint(emblem.accent, 1, 0);
  }
  if (emblem.letters) {
    const left = Math.round((EMBLEM_SIZE - (emblem.letters.length * 4 - 1)) / 2);
    g.fillStyle = INK;
    g.fillRect(left - 1, 16, emblem.letters.length * 4 + 1, 7);
    text(g, emblem.letters, left, 17, '#ffffff', 1);
  }
  const url = canvas.toDataURL();
  emblemCache.set(key, url);
  return url;
}
