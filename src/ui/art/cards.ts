import type { CardCategory, CardId } from '../../sim/training.ts';
import { pixelsForHeight } from './body.ts';
import { drawShadow, drawSprite, INK, type Look, type PoseName } from './sprites.ts';

export const CATEGORY_INFO: Record<CardCategory, { name: string; color: string }> = {
  tactic: { name: 'Tática', color: '#1f8a8c' },
  technique: { name: 'Técnica', color: '#e8622a' },
  physical: { name: 'Físico', color: '#cf3a2c' },
  support: { name: 'Apoio', color: '#7246c4' },
};
export const CATEGORIES = Object.keys(CATEGORY_INFO) as CardCategory[];

const CARD_W = 40;
const CARD_H = 44;
const FOOT_Y = 41;
const WHITE = '#fff7e0';
const GOLD = '#f2c230';
const ORANGE = '#e8622a';

type Pixels = CanvasRenderingContext2D;
const rect = (g: Pixels, color: string, x: number, y: number, w: number, h: number): void => {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
};
const ball = (g: Pixels, x: number, y: number): void => {
  rect(g, INK, x, y - 1, 5, 7);
  rect(g, INK, x - 1, y, 7, 5);
  rect(g, ORANGE, x, y, 5, 5);
};
const arrowRight = (g: Pixels, x: number, y: number, color = WHITE): void => {
  rect(g, color, x, y, 6, 2);
  rect(g, color, x + 4, y - 2, 2, 6);
  rect(g, color, x + 6, y - 1, 2, 4);
};
const note = (g: Pixels, x: number, y: number): void => {
  rect(g, WHITE, x + 3, y, 2, 7);
  rect(g, WHITE, x, y + 6, 4, 3);
  rect(g, WHITE, x + 5, y, 3, 2);
};

// Cada carta é um jogador numa pose, com um objeto que diz logo o que é.
const ART: Record<CardId, { pose: PoseName; ball?: boolean; flip?: boolean; prop?: (g: Pixels) => void }> = {
  readDefense: { pose: 'defend', prop: g => {
    // Lupa
    rect(g, INK, 27, 4, 8, 8);
    rect(g, '#bfe6ee', 29, 6, 4, 4);
    rect(g, INK, 25, 12, 3, 3);
    rect(g, INK, 23, 15, 3, 3);
  } },
  pickRoll: { pose: 'pass', ball: true, prop: g => {
    rect(g, WHITE, 3, 8, 8, 2);
    rect(g, WHITE, 9, 8, 2, 9);
    arrowRight(g, 11, 15);
  } },
  whiteboard: { pose: 'idle', prop: g => {
    rect(g, INK, 25, 6, 13, 12);
    rect(g, WHITE, 26, 7, 11, 10);
    rect(g, '#cf3a2c', 28, 9, 2, 2);
    rect(g, '#2b5fd9', 33, 13, 2, 2);
    rect(g, INK, 30, 11, 3, 1);
    rect(g, INK, 30, 18, 1, 8);
    rect(g, INK, 34, 18, 1, 8);
  } },
  video: { pose: 'sit', prop: g => {
    rect(g, INK, 5, 6, 16, 12);
    rect(g, '#7ec8e0', 6, 7, 14, 10);
    rect(g, WHITE, 11, 9, 2, 6);
    rect(g, WHITE, 13, 10, 2, 4);
    rect(g, WHITE, 15, 11, 1, 2);
  } },
  transition: { pose: 'run0', prop: g => {
    arrowRight(g, 3, 8);
    arrowRight(g, 26, 8);
    arrowRight(g, 28, 16);
  } },
  shooting: { pose: 'shoot', ball: true, prop: g => {
    rect(g, WHITE, 29, 10, 8, 2);
    rect(g, ORANGE, 27, 12, 8, 1);
    rect(g, WHITE, 28, 13, 1, 4);
    rect(g, WHITE, 31, 13, 1, 4);
    rect(g, WHITE, 34, 13, 1, 4);
  } },
  dribble: { pose: 'dribRun0', ball: true, prop: g => {
    rect(g, WHITE, 3, 24, 5, 2);
    rect(g, WHITE, 2, 30, 7, 2);
    rect(g, WHITE, 4, 36, 4, 2);
  } },
  bouncePass: { pose: 'pass', ball: true, prop: g => {
    for (let i = 0; i < 4; i++) {
      rect(g, WHITE, 27 + i * 2, 18 + i * 5, 2, 2);
      rect(g, WHITE, 33 + i, 36 - i * 5, 2, 2);
    }
  } },
  freeThrows: { pose: 'drib1', ball: true, prop: g => {
    // Linha de lance livre e o «1»
    rect(g, WHITE, 2, 40, 36, 2);
    rect(g, WHITE, 6, 7, 3, 12);
    rect(g, WHITE, 4, 9, 2, 2);
    rect(g, WHITE, 4, 19, 7, 2);
  } },
  hookShot: { pose: 'dunk', ball: true, prop: g => {
    rect(g, WHITE, 5, 14, 2, 8);
    rect(g, WHITE, 7, 10, 2, 4);
    rect(g, WHITE, 9, 7, 3, 3);
    rect(g, WHITE, 12, 5, 4, 2);
  } },
  sprints: { pose: 'run2', prop: g => {
    rect(g, WHITE, 2, 18, 8, 2);
    rect(g, WHITE, 1, 25, 7, 2);
    rect(g, WHITE, 3, 32, 6, 2);
  } },
  weights: { pose: 'cheer0', prop: g => {
    rect(g, INK, 5, 8, 30, 3);
    rect(g, INK, 2, 3, 6, 13);
    rect(g, INK, 32, 3, 6, 13);
    rect(g, '#8d93a3', 3, 4, 4, 11);
    rect(g, '#8d93a3', 33, 4, 4, 11);
  } },
  jumps: { pose: 'block', prop: g => {
    rect(g, WHITE, 32, 18, 2, 18);
    rect(g, WHITE, 30, 20, 6, 2);
    rect(g, WHITE, 31, 18, 4, 2);
    rect(g, INK, 4, 41, 32, 1);
  } },
  longRun: { pose: 'run1', prop: g => {
    // Sol e estrada
    rect(g, GOLD, 29, 5, 8, 8);
    rect(g, WHITE, 2, 40, 6, 2);
    rect(g, WHITE, 16, 40, 6, 2);
    rect(g, WHITE, 30, 40, 6, 2);
  } },
  agility: { pose: 'run0', prop: g => {
    rect(g, WHITE, 3, 37, 34, 1);
    rect(g, WHITE, 3, 42, 34, 1);
    for (let x = 3; x <= 36; x += 6) rect(g, WHITE, x, 37, 1, 6);
  } },
  soup: { pose: 'sit', prop: g => {
    rect(g, WHITE, 27, 28, 2, 4);
    rect(g, WHITE, 31, 26, 2, 6);
    rect(g, INK, 25, 33, 12, 7);
    rect(g, WHITE, 26, 33, 10, 5);
    rect(g, GOLD, 27, 33, 8, 2);
  } },
  nap: { pose: 'sit', prop: g => {
    rect(g, WHITE, 27, 6, 7, 2);
    rect(g, WHITE, 31, 8, 2, 2);
    rect(g, WHITE, 29, 10, 2, 2);
    rect(g, WHITE, 27, 12, 7, 2);
    rect(g, WHITE, 22, 15, 4, 1);
    rect(g, WHITE, 24, 16, 1, 1);
    rect(g, WHITE, 22, 17, 4, 1);
  } },
  massage: { pose: 'idle', prop: g => {
    for (const x of [4, 28]) {
      rect(g, INK, x, 6, 8, 7);
      rect(g, '#f0c29a', x + 1, 7, 6, 5);
      rect(g, '#f0c29a', x + 1, 4, 1, 3);
      rect(g, '#f0c29a', x + 3, 3, 1, 4);
      rect(g, '#f0c29a', x + 5, 4, 1, 3);
    }
  } },
  dance: { pose: 'cheer1', prop: g => {
    note(g, 2, 6);
    note(g, 30, 13);
  } },
  fado: { pose: 'idle', prop: g => {
    note(g, 3, 8);
    // Guitarra
    rect(g, INK, 27, 22, 9, 9);
    rect(g, '#b5763a', 28, 23, 7, 7);
    rect(g, INK, 30, 25, 3, 3);
    rect(g, INK, 31, 10, 2, 12);
    rect(g, INK, 30, 7, 4, 3);
  } },
};

// Sempre o mesmo jogador nas cartas, para ninguém as confundir com uma ficha.
const CARD_LOOK: Look = { kit: 'cream', skin: 1, hair: 2, style: 0, ...pixelsForHeight(178), build: 'athletic', face: 0 };
const cache = new Map<CardId, string>();

export function cardImage(card: CardId, category: CardCategory): string {
  const cached = cache.get(card);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const g = canvas.getContext('2d')!;
  rect(g, CATEGORY_INFO[category].color, 0, 0, CARD_W, CARD_H);
  g.fillStyle = 'rgba(255,255,255,0.14)';
  for (let i = -CARD_H; i < CARD_W; i += 8) {
    for (let d = 0; d < CARD_H; d++) g.fillRect(i + d, CARD_H - d, 1, 1);
  }
  const art = ART[card];
  drawShadow(g, 20, FOOT_Y, 6);
  drawSprite(g, art.pose, CARD_LOOK, 20, FOOT_Y, art.flip ?? false, false, art.ball ?? false);
  art.prop?.(g);
  const url = canvas.toDataURL();
  cache.set(card, url);
  return url;
}
