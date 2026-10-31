import type { Player } from '../../sim/types.ts';
import { buildOf, pixelsForHeight } from './body.ts';
import { kitKey, shadeOf, usesSecond, type ClubKit } from './kit.ts';
import { INK } from './palette.ts';

export { INK };

const SKINS = [['#f2c7a0', '#d9a57c'], ['#c98d5e', '#a9713f'], ['#8d5a36', '#6f4326'], ['#5c3a24', '#472a18']] as const;
const HAIRS = ['#2a2230', '#5a3a22', '#a8642a', '#e0b94f', '#1b2230', '#7a3a2a'] as const;
export const KITS = {
  blue: { jersey: '#2b5fd9', shade: '#1d43a3', trim: '#ffffff', shorts: '#f4f4f4' },
  cream: { jersey: '#f4efe0', shade: '#cfc7ae', trim: '#cf3a2c', shorts: '#cf3a2c' },
  coach: { jersey: '#3a4252', shade: '#2a3040', trim: '#f4efe0', shorts: '#2c3345' },
  referee: { jersey: '#f4f4f4', shade: '#c9c9c9', trim: '#1b2230', shorts: '#1b2230' },
} as const;
export type KitName = keyof typeof KITS;

type Offset = readonly [number, number];
interface PoseShape {
  a: Offset;
  b: Offset;
  f: Offset;
  g: Offset;
  jump?: number;
  ball?: Offset;
}

const POSES = {
  idle: (L: number): PoseShape => ({ a: [-1, 5], b: [1, 5], f: [-2, L], g: [2, L] }),
  run0: (L: number): PoseShape => ({ a: [-3, 2], b: [3, 4], f: [-3, L - 1], g: [3, L], jump: 1 }),
  run1: (L: number): PoseShape => ({ a: [-1, 4], b: [2, 3], f: [-1, L], g: [1, L - 1] }),
  run2: (L: number): PoseShape => ({ a: [3, 3], b: [-3, 3], f: [3, L - 1], g: [-3, L], jump: 1 }),
  drib0: (L: number): PoseShape => ({ a: [-2, 4], b: [4, 3], f: [-2, L], g: [3, L], ball: [7, L - 2] }),
  drib1: (L: number): PoseShape => ({ a: [-2, 4], b: [4, 2], f: [-2, L], g: [3, L], ball: [7, L - 6] }),
  dribRun0: (L: number): PoseShape => ({ a: [-3, 2], b: [4, 3], f: [-3, L - 1], g: [3, L], jump: 1, ball: [7, L - 2] }),
  dribRun1: (L: number): PoseShape => ({ a: [-1, 4], b: [4, 2], f: [-1, L], g: [1, L - 1], ball: [7, L - 6] }),
  dribRun2: (L: number): PoseShape => ({ a: [2, 3], b: [4, 3], f: [3, L - 1], g: [-3, L], jump: 1, ball: [7, L - 2] }),
  dribRun3: (L: number): PoseShape => ({ a: [-1, 4], b: [4, 2], f: [1, L], g: [-1, L - 1], ball: [7, L - 6] }),
  crossover: (L: number): PoseShape => ({ a: [-4, 3], b: [3, 4], f: [-4, L], g: [4, L], ball: [-5, L - 3] }),
  stumble: (L: number): PoseShape => ({ a: [-5, 0], b: [4, 5], f: [-1, L], g: [5, L - 1] }),
  gather: (L: number): PoseShape => ({ a: [3, -2], b: [4, -3], f: [-2, L - 1], g: [2, L - 1], ball: [5, -9] }),
  shoot: (L: number): PoseShape => ({ a: [1, -7], b: [3, -8], f: [-1, L - 1], g: [2, L - 2], jump: 6, ball: [3, -18] }),
  dunk: (L: number): PoseShape => ({ a: [-4, 2], b: [4, -9], f: [-3, L - 2], g: [-4, L - 3], jump: 10, ball: [6, -19] }),
  block: (L: number): PoseShape => ({ a: [-1, -8], b: [2, -8], f: [-2, L - 1], g: [2, L - 1], jump: 6 }),
  defend: (L: number): PoseShape => ({ a: [-4, -2], b: [4, -2], f: [-3, L], g: [3, L] }),
  pass: (L: number): PoseShape => ({ a: [4, 0], b: [5, 1], f: [-2, L], g: [3, L], ball: [8, -6] }),
  cheer0: (L: number): PoseShape => ({ a: [-3, -6], b: [3, -6], f: [-2, L], g: [2, L] }),
  cheer1: (L: number): PoseShape => ({ a: [-4, -5], b: [4, -5], f: [-1, L - 1], g: [1, L - 1], jump: 4 }),
  sit: (L: number): PoseShape => ({ a: [-2, 3], b: [2, 3], f: [-3, 3], g: [3, 3], jump: 3 - L }),
};
export type PoseName = keyof typeof POSES;

/** Proporções do corpo, em píxeis. `shoulder` e `waist` são larguras do tronco; `arm` e `leg` são espessuras. */
export const BUILDS = {
  slim: { shoulder: 5, waist: 4, hips: 5, arm: 1, leg: 1, jaw: 0 },
  athletic: { shoulder: 6, waist: 6, hips: 6, arm: 2, leg: 2, jaw: 0 },
  muscular: { shoulder: 8, waist: 6, hips: 6, arm: 3, leg: 3, jaw: 0 },
  heavy: { shoulder: 7, waist: 8, hips: 8, arm: 3, leg: 3, jaw: 1 },
} as const;
export type Build = keyof typeof BUILDS;

export interface Look {
  kit: KitName;
  /** O equipamento do nosso clube, feito pelo jogador. Quando existe, manda mais do que `kit`. */
  custom?: ClubKit;
  skin: number;
  hair: number;
  style: number;
  legs: number;
  torso: number;
  build: Build;
  /** Escolhe os traços do retrato: forma da cara, sobrancelhas, barba. */
  face: number;
}

/** A aparência vem do nome: o mesmo jogador tem sempre a mesma cara. */
export function lookOf(player: Player, kit: KitName): Look {
  let hash = 7;
  for (let i = 0; i < player.name.length; i++) hash = (hash * 31 + player.name.charCodeAt(i)) >>> 0;
  return {
    kit,
    skin: hash % SKINS.length,
    // Com >>> o resultado nunca é negativo, o que daria uma cor de cabelo inexistente.
    hair: (hash >>> 3) % HAIRS.length,
    style: (hash >>> 6) % 5,
    ...pixelsForHeight(player.heightCm),
    build: buildOf(player.heightCm, player.weightKg, player.attributes.strength),
    face: hash >>> 9,
  };
}

/** As cores que um boneco ou um retrato vestem. */
export function kitColors(look: Look): { jersey: string; shade: string; trim: string; shorts: string } {
  const { custom } = look;
  return custom ? { jersey: custom.jersey, shade: shadeOf(custom.jersey), trim: custom.trim, shorts: custom.shorts } : KITS[look.kit];
}

/** Para as caches: dois bonecos só são iguais se tiverem a mesma roupa. */
export const kitId = (look: Look): string => (look.custom ? kitKey(look.custom) : look.kit);

export const skinColors = (look: Look): readonly [string, string] => SKINS[look.skin]!;
export const hairColor = (look: Look): string => HAIRS[look.hair]!;

export const spriteHeight = (look: Look): number => look.legs + look.torso + 12;

const SPRITE_W = 34;
const SPRITE_H = 46;
const ANCHOR_X = 17;
const ANCHOR_Y = 43;
const JERSEY_MARK = 'camisola';
const SHADE_MARK = 'sombra';
const cache = new Map<string, HTMLCanvasElement>();

function buildSprite(pose: PoseName, look: Look, back: boolean, withBall: boolean): HTMLCanvasElement {
  const grid: (string | null)[] = new Array<string | null>(SPRITE_W * SPRITE_H).fill(null);
  const put = (x: number, y: number, color: string | null): void => {
    x |= 0;
    y |= 0;
    if (x >= 0 && y >= 0 && x < SPRITE_W && y < SPRITE_H) grid[y * SPRITE_W + x] = color;
  };
  const rect = (x: number, y: number, w: number, h: number, color: string): void => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, color);
  };
  const limb = (x0: number, y0: number, x1: number, y1: number, thickness: number, colorAt: (k: number) => string): void => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      rect(Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k), thickness, 2, colorAt(k));
    }
  };
  const L = look.legs;
  const T = look.torso;
  const body = BUILDS[look.build];
  const shape = POSES[pose](L);
  // Camisola marcada com estes dois nomes: o desenho dela só se resolve no fim, quando já se sabe cada píxel.
  const kit = look.custom ? { ...kitColors(look), jersey: JERSEY_MARK, shade: SHADE_MARK } : KITS[look.kit];
  const [skin, skinShade] = SKINS[look.skin]!;
  const hair = HAIRS[look.hair]!;
  const hipY = ANCHOR_Y - L - (shape.jump ?? 0);
  const hx = ANCHOR_X;
  const hipLeft = hx - (body.hips >> 1);
  const leg = ([dx, dy]: Offset, x0: number, shaded: boolean): void => {
    const x1 = hx + dx - 1;
    const y1 = hipY + dy - 2;
    limb(x0, hipY, x1, y1, body.leg, k => (k < 0.5 ? kit.shorts : shaded ? skinShade : skin));
    rect(x1 - 1, y1 + 2, body.leg + 2, 2, '#f4f4f4');
    put(x1 - 1, y1 + 3, kit.jersey);
  };
  leg(shape.f, hipLeft + 1, true);
  leg(shape.g, hipLeft + body.hips - body.leg - 1, false);
  rect(hipLeft, hipY - 1, body.hips, 4, kit.shorts);
  rect(hipLeft, hipY + 2, 2, 1, kit.trim);
  rect(hipLeft + body.hips - 2, hipY + 2, 2, 1, kit.trim);
  const top = hipY - T;
  // O tronco é desenhado linha a linha, dos ombros à cintura.
  for (let row = 0; row < T; row++) {
    const width = Math.round(body.shoulder + ((body.waist - body.shoulder) * row) / Math.max(1, T - 1));
    const left = hx - (width >> 1);
    rect(left, top + row, width, 1, kit.jersey);
    if (row > 0) put(left + width - 1, top + row, kit.shade);
    // A camisola às riscas é o que faz reconhecer o árbitro no meio dos jogadores.
    if (look.kit === 'referee') for (let c = left; c < left + width; c += 2) put(c, top + row, INK);
  }
  if (back) {
    rect(hx - 1, top + 1, 2, 3, kit.trim);
  } else {
    rect(hx - 1, top, 2, 1, skin);
    rect(hx - 1, top + 2, 2, 2, kit.trim);
  }
  // A cabeça tem o topo e o queixo arredondados: linhas de 6, 8, 8, ... 8 e 6 píxeis.
  const headX = hx - 4;
  const headY = top - 7;
  const bald = look.style === 3;
  rect(headX + 1, headY - 1, 6, 1, bald ? skin : hair);
  rect(headX, headY, 8, 6, skin);
  rect(headX + 1, headY + 6, 6, 1, skinShade);
  if (body.jaw > 0) {
    rect(headX - body.jaw, headY + 3, 8 + body.jaw * 2, 3, skin);
    rect(headX - body.jaw + 1, headY + 6, 6 + body.jaw * 2 - 2, 1, skinShade);
  }
  if (look.style === 2) {
    rect(headX + 1, headY - 3, 6, 1, hair);
    rect(headX, headY - 2, 8, 1, hair);
    rect(headX - 1, headY - 1, 10, 3, hair);
    rect(headX - 1, headY + 2, 2, 2, hair);
    rect(headX + 7, headY + 2, 2, 2, hair);
  } else if (look.style === 1) {
    rect(headX + 2, headY - 3, 4, 1, hair);
    rect(headX + 1, headY - 2, 6, 1, hair);
  }
  if (!bald && look.style !== 2) {
    rect(headX, headY, 8, 2, hair);
    put(headX, headY + 2, hair);
    put(headX + 7, headY + 2, hair);
  }
  if (look.style === 4) rect(headX, headY + 1, 8, 1, kit.trim);
  if (back) {
    if (!bald) rect(headX, headY, 8, 5, hair);
  } else {
    rect(headX + 3, headY + 3, 1, 2, INK);
    rect(headX + 6, headY + 3, 1, 2, INK);
  }
  const shoulderLeft = hx - (body.shoulder >> 1);
  const shoulderRight = shoulderLeft + body.shoulder - 1;
  const overlap = body.arm > 1 ? 1 : 0;
  const leftArm = shoulderLeft - body.arm + overlap;
  const rightArm = shoulderRight + 1 - overlap;
  limb(leftArm, top + 1, leftArm + shape.a[0], top + 1 + shape.a[1], body.arm, () => skinShade);
  limb(rightArm, top + 1, rightArm + shape.b[0], top + 1 + shape.b[1], body.arm, () => skin);
  // A camisola tapa os ombros: o braço só aparece a partir da cava.
  rect(shoulderLeft - 1, top, body.shoulder + 2, 1, kit.jersey);
  rect(shoulderLeft, top + 1, body.shoulder, 1, kit.jersey);
  put(shoulderRight, top + 1, kit.shade);
  if (!back) rect(hx - 1, top, 2, 1, skin);
  if (withBall && shape.ball) {
    const bx = hx + shape.ball[0];
    const by = hipY + shape.ball[1];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue;
        put(bx + dx, by + dy, dx === 0 || dy === 0 ? '#a93f14' : '#e8622a');
      }
    }
    put(bx - 1, by - 1, '#ffb27a');
  }

  // Contorno automático: qualquer píxel vazio ao lado de um cheio fica na cor tinta.
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H;
  const g = canvas.getContext('2d')!;
  for (let y = 0; y < SPRITE_H; y++) {
    for (let x = 0; x < SPRITE_W; x++) {
      const i = y * SPRITE_W + x;
      const near = (x > 0 && grid[i - 1]) || (x < SPRITE_W - 1 && grid[i + 1]) || (y > 0 && grid[i - SPRITE_W]) || (y < SPRITE_H - 1 && grid[i + SPRITE_W]);
      let color = grid[i] ?? (near ? INK : null);
      if (look.custom && (color === JERSEY_MARK || color === SHADE_MARK)) {
        const base = usesSecond(look.custom, x, y) ? look.custom.second : look.custom.jersey;
        color = color === JERSEY_MARK ? base : shadeOf(base);
      }
      if (color) {
        g.fillStyle = color;
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  return canvas;
}

export function drawSprite(g: CanvasRenderingContext2D, pose: PoseName, look: Look, x: number, y: number, flip: boolean, back: boolean, withBall: boolean): void {
  const key = `${pose}|${kitId(look)}|${look.skin}|${look.hair}|${look.style}|${look.legs}|${look.torso}|${look.build}|${back}|${withBall}`;
  let sprite = cache.get(key);
  if (!sprite) {
    sprite = buildSprite(pose, look, back, withBall);
    cache.set(key, sprite);
  }
  if (flip) {
    g.save();
    g.translate(x | 0, 0);
    g.scale(-1, 1);
    g.drawImage(sprite, -ANCHOR_X, (y | 0) - ANCHOR_Y);
    g.restore();
  } else {
    g.drawImage(sprite, (x | 0) - ANCHOR_X, (y | 0) - ANCHOR_Y);
  }
}

/** A sombra é uma oval por degraus, ligeiramente deslocada, como se a luz viesse de cima e da frente. */
export function drawShadow(g: CanvasRenderingContext2D, x: number, y: number, radius = 7): void {
  x = (x | 0) + 1;
  y |= 0;
  g.fillStyle = 'rgba(20,16,30,.34)';
  g.fillRect(x - radius, y - 1, radius * 2, 2);
  g.fillRect(x - radius + 2, y - 2, radius * 2 - 4, 1);
  g.fillRect(x - radius + 2, y + 1, radius * 2 - 4, 1);
}

/** O reflexo no chão polido é o próprio boneco, virado ao contrário e quase transparente. */
export function drawReflection(g: CanvasRenderingContext2D, pose: PoseName, look: Look, x: number, y: number, flip: boolean, back: boolean, strength: number): void {
  g.save();
  g.globalAlpha = strength;
  g.translate(0, (y | 0) * 2 + 1);
  g.scale(1, -1);
  drawSprite(g, pose, look, x, y, flip, back, false);
  g.restore();
}

const faceCache = new Map<string, string>();

/** Retrato do jogador para o painel, recortado do próprio boneco. */
export function faceImage(look: Look): string {
  const key = `${kitId(look)}|${look.skin}|${look.hair}|${look.style}|${look.legs}|${look.torso}|${look.build}`;
  let url = faceCache.get(key);
  if (!url) {
    const canvas = document.createElement('canvas');
    canvas.width = 14;
    canvas.height = 14;
    const g = canvas.getContext('2d')!;
    drawSprite(g, 'idle', look, 7, look.legs + look.torso + 11, false, false, false);
    url = canvas.toDataURL();
    faceCache.set(key, url);
  }
  return url;
}

export function drawBall(g: CanvasRenderingContext2D, x: number, y: number): void {
  x |= 0;
  y |= 0;
  g.fillStyle = INK;
  g.fillRect(x - 2, y - 3, 5, 7);
  g.fillRect(x - 3, y - 2, 7, 5);
  g.fillStyle = '#e8622a';
  g.fillRect(x - 2, y - 2, 5, 5);
  g.fillStyle = '#a93f14';
  g.fillRect(x, y - 2, 1, 5);
  g.fillRect(x - 2, y, 5, 1);
  g.fillStyle = '#ffb27a';
  g.fillRect(x - 1, y - 1, 1, 1);
}

export function drawCarrierArrow(g: CanvasRenderingContext2D, x: number, y: number): void {
  x |= 0;
  y |= 0;
  g.fillStyle = INK;
  g.fillRect(x - 4, y - 5, 9, 2);
  g.fillRect(x - 3, y - 3, 7, 2);
  g.fillRect(x - 2, y - 1, 5, 2);
  g.fillRect(x - 1, y + 1, 3, 1);
  g.fillStyle = '#f2c230';
  g.fillRect(x - 3, y - 4, 7, 2);
  g.fillRect(x - 2, y - 2, 5, 2);
  g.fillRect(x - 1, y, 3, 1);
}
