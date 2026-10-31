import { BUILDS, INK, hairColor, kitColors, kitId, skinColors, type Look } from './sprites.ts';

// Retrato da ficha de jogador: 28×28 píxeis. Cabeça grande, pele lisa e poucos traços.
// A sombra fica só no nariz, na orelha e no pescoço: pintar a cara suja o maxilar a esta resolução.
const SIZE = 28;
const CX = 14;
const HEAD_Y = 4;
const HEAD_ROWS = 17;
const NECK_Y = HEAD_Y + HEAD_ROWS;
const JERSEY_Y = NECK_Y + 1;

/** Meia-largura da cabeça em cada linha, de cima para baixo. */
const FACE_SHAPES: readonly (readonly number[])[] = [
  [4, 6, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 6, 5, 4], // redonda
  [4, 5, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 6, 5, 3], // comprida
  [5, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 6, 5], // quadrada
  [4, 6, 7, 8, 8, 8, 8, 8, 8, 8, 7, 7, 6, 6, 5, 4, 3], // queixo fino
];

const cache = new Map<string, string>();

/** Mistura duas cores #rrggbb. */
function mix(a: string, b: string, k: number): string {
  const channel = (hex: string, i: number): number => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const part = (i: number): string => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * k).toString(16).padStart(2, '0');
  return `#${part(0)}${part(1)}${part(2)}`;
}

export function portraitImage(look: Look): string {
  const key = `${kitId(look)}|${look.skin}|${look.hair}|${look.style}|${look.build}|${look.face}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const grid: (string | null)[] = new Array<string | null>(SIZE * SIZE).fill(null);
  const put = (x: number, y: number, color: string): void => {
    if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) grid[y * SIZE + x] = color;
  };
  const rect = (x: number, y: number, w: number, h: number, color: string): void => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, color);
  };
  /** Uma linha centrada, com `half` píxeis para cada lado. */
  const span = (y: number, half: number, color: string): void => rect(CX - half, y, half * 2, 1, color);

  const [skin, skinShade] = skinColors(look);
  const hair = hairColor(look);
  const hairLight = mix(hair, '#ffffff', 0.24);
  const kit = kitColors(look);
  const build = BUILDS[look.build];
  const trait = (shift: number, options: number): number => (look.face >>> shift) % options;

  const shape = FACE_SHAPES[look.face % FACE_SHAPES.length]!;
  const widthAdjust = (row: number): number => (build.jaw > 0 && row >= 8 ? 1 : 0) - (look.build === 'slim' && row >= 7 ? 1 : 0);
  const halfAt = (row: number): number => shape[Math.max(0, Math.min(HEAD_ROWS - 1, row))]! + widthAdjust(row);
  const rowY = (row: number): number => HEAD_Y + row;
  const face = halfAt(8);
  const longHair = look.style === 0 && trait(18, 4) === 0;

  // Afro: fica por trás da cabeça, por isso pinta-se primeiro.
  if (look.style === 2) {
    for (let y = 0; y < 17; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx = x + 0.5 - CX;
        const dy = y + 0.5 - 7;
        if (dx * dx + dy * dy > 11 * 11) continue;
        put(x, y, (x * 2 + y * 3) % 11 === 0 ? hairLight : hair);
      }
    }
  }

  // Orelhas, a sair da cabeça. O cabelo comprido tapa-as.
  if (!longHair) {
    for (const side of [-1, 1]) {
      const outer = side < 0 ? CX - face - 2 : CX + face;
      rect(outer, rowY(8), 2, 4, skin);
      rect(side < 0 ? outer + 1 : outer, rowY(9), 1, 2, skinShade);
    }
  }

  // Camisola: tapa os ombros, com decote redondo. Só as pontas dos braços ficam à vista.
  const broad = build.shoulder > 6 ? 1 : build.shoulder < 6 ? -1 : 0;
  const jersey = (y: number): number => [6, 8, 10, 11, 11, 11][y - JERSEY_Y]! + broad;
  for (let y = JERSEY_Y; y < SIZE; y++) {
    const half = jersey(y);
    span(y, half, kit.jersey);
    rect(CX + half - 2, y, 2, 1, kit.shade);
  }
  for (let y = JERSEY_Y + 2; y < SIZE; y++) {
    const half = jersey(y);
    rect(CX - half - 2, y, 2, 1, skin);
    rect(CX + half, y, 2, 1, skinShade);
    put(CX - half, y, kit.trim);
    put(CX + half - 1, y, kit.trim);
  }

  // Pescoço e decote. A sombra do queixo é a única sombra forte do retrato.
  const neck = 3 + (build.shoulder > 6 ? 1 : 0) + (build.jaw > 0 ? 1 : 0) - (look.build === 'slim' ? 1 : 0);
  const lowerNeck = Math.max(2, neck - 1);
  span(NECK_Y, neck, skinShade);
  span(JERSEY_Y, neck, skin);
  span(JERSEY_Y + 1, lowerNeck, skin);
  put(CX - neck - 1, JERSEY_Y, kit.trim);
  put(CX + neck, JERSEY_Y, kit.trim);
  put(CX - lowerNeck - 1, JERSEY_Y + 1, kit.trim);
  put(CX + lowerNeck, JERSEY_Y + 1, kit.trim);
  span(JERSEY_Y + 2, lowerNeck, kit.trim);

  // Cabeça, lisa.
  for (let row = 0; row < HEAD_ROWS; row++) span(rowY(row), halfAt(row), skin);

  // Cabelo.
  const hairRow = (row: number, half: number, stranded: boolean): void => {
    // Madeixas verticais, nas linhas de cima.
    for (let x = CX - half; x < CX + half; x++) put(x, rowY(row), stranded && row <= 2 && (x + 2) % 4 === 0 ? hairLight : hair);
  };
  if (look.style === 0 || look.style === 4) {
    span(rowY(-1), 3, hair);
    for (let row = 0; row <= 3; row++) hairRow(row, halfAt(row), true);
    const half = halfAt(4);
    const fringe = trait(14, 4);
    for (let x = CX - half; x < CX + half; x++) {
      const gap = (fringe === 1 && (x === CX - 1 || x === CX)) || (fringe === 2 && x > CX + 2) || (fringe === 3 && x % 2 === 0 && Math.abs(x - CX) < half - 1);
      if (!gap) put(x, rowY(4), hair);
    }
    if (fringe === 2) rect(CX - half, rowY(5), half, 1, hair);
    // Patilhas, ou cabelo comprido até à linha da boca.
    const sideEnd = longHair ? 13 : 7;
    for (let row = 5; row <= sideEnd; row++) {
      const width = longHair ? 2 : row === 7 ? 1 : 2;
      const edge = halfAt(row);
      rect(CX - edge, rowY(row), width, 1, hair);
      rect(CX + edge - width, rowY(row), width, 1, hair);
    }
    if (longHair) {
      for (let row = 8; row <= 13; row++) {
        const edge = halfAt(row);
        put(CX - edge - 1, rowY(row), hair);
        put(CX + edge, rowY(row), hair);
      }
    }
  } else if (look.style === 1) {
    // Corte alto: volume no topo e lados rapados.
    span(rowY(-4), 3, hair);
    span(rowY(-3), 5, hair);
    span(rowY(-2), 6, hair);
    span(rowY(-1), 7, hair);
    for (let row = 0; row <= 3; row++) hairRow(row, Math.min(7, halfAt(row)), true);
    for (let row = 4; row <= 6; row++) {
      const edge = halfAt(row);
      put(CX - edge, rowY(row), mix(skin, hair, 0.55));
      put(CX + edge - 1, rowY(row), mix(skin, hair, 0.55));
    }
  } else if (look.style === 2) {
    // A frente do afro, por cima da testa.
    for (let row = 0; row <= 4; row++) hairRow(row, halfAt(row), false);
  } else {
    // Careca: só um brilho na cabeça.
    rect(CX - 4, rowY(1), 3, 1, mix(skin, '#ffffff', 0.45));
  }
  if (look.style === 4) span(rowY(4), halfAt(4), kit.trim);

  // Sobrancelhas.
  const browRow = 6;
  const browColor = look.style === 3 ? mix(skinShade, INK, 0.5) : mix(hair, INK, 0.25);
  const browMood = trait(4, 3);
  for (let i = 0; i < 3; i++) {
    const tilt = browMood === 1 && i === 2 ? 1 : browMood === 2 && i === 0 ? 1 : 0;
    put(CX - 6 + i, rowY(browRow + tilt), browColor);
    put(CX + 5 - i, rowY(browRow + tilt), browColor);
  }

  // Olhos: dois pontos escuros, como nas fichas de jogo antigas.
  const eyes = trait(6, 3);
  for (const x of [CX - 5, CX + 3]) {
    if (eyes === 0) rect(x, rowY(8), 2, 2, INK);
    else if (eyes === 1) rect(x === CX - 5 ? x + 1 : x, rowY(8), 1, 2, INK);
    else {
      // Com um pouco de branco, a olhar para o centro.
      rect(x, rowY(8), 2, 1, INK);
      put(x === CX - 5 ? x : x + 1, rowY(9), '#fbf6e2');
      put(x === CX - 5 ? x + 1 : x, rowY(9), INK);
    }
  }

  // Nariz: a única marca na cara.
  const nose = trait(8, 3);
  if (nose === 0) {
    rect(CX, rowY(10), 1, 2, skinShade);
    put(CX - 1, rowY(11), skinShade);
  } else if (nose === 1) {
    rect(CX - 1, rowY(11), 2, 1, skinShade);
  } else {
    rect(CX - 1, rowY(10), 1, 2, skinShade);
    put(CX, rowY(11), skinShade);
  }

  // Barba: nenhuma, bigode, pera ou cheia. Sempre cor lisa, nunca um padrão.
  const beard = trait(10, 6);
  const beardColor = look.style === 3 ? mix(skinShade, INK, 0.55) : hair;
  if (beard === 1 || beard === 3) span(rowY(12), 3, beardColor);
  if (beard === 2 || beard === 3) {
    span(rowY(15), 2, beardColor);
    span(rowY(16), 1, beardColor);
  }
  if (beard === 3) {
    for (let row = 13; row <= 14; row++) {
      put(CX - 3, rowY(row), beardColor);
      put(CX + 2, rowY(row), beardColor);
    }
  }

  // Boca: uma linha, às vezes aberta ou com os cantos para cima.
  const mouth = trait(12, 4);
  const lips = mix(skinShade, INK, 0.5);
  if (mouth === 3) {
    span(rowY(13), 2, lips);
    span(rowY(14), 2, INK);
    span(rowY(13), 1, '#fbf6e2');
  } else {
    span(rowY(13), mouth === 1 ? 3 : 2, lips);
    if (mouth === 2) {
      put(CX - 3, rowY(12), lips);
      put(CX + 2, rowY(12), lips);
    }
  }

  // Contorno automático, igual ao dos bonecos.
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const g = canvas.getContext('2d')!;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      const near = (x > 0 && grid[i - 1]) || (x < SIZE - 1 && grid[i + 1]) || (y > 0 && grid[i - SIZE]) || (y < SIZE - 1 && grid[i + SIZE]);
      const color = grid[i] ?? (near ? INK : null);
      if (color) {
        g.fillStyle = color;
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}
