// Medidas FIBA em metros. "u" é a distância à linha final atacada e "v" a posição lateral.
export const COURT_LENGTH = 28;
export const COURT_HALF_WIDTH = 7.5;
export const HOOP_U = 1.575;
export const THREE_RADIUS = 6.75;
export const THREE_CORNER_V = 6.6;
export const THREE_CORNER_MAX_U = 3;
export const TICKS_PER_SECOND = 20;
export const DT = 1 / TICKS_PER_SECOND;

export const seconds = (s: number): number => Math.round(s * TICKS_PER_SECOND);

export function distance(x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  return Math.sqrt(dx * dx + dy * dy);
}

export const hoopDistance = (u: number, v: number): number => distance(u, v, HOOP_U, 0);

export function isThree(u: number, v: number): boolean {
  if (u < THREE_CORNER_MAX_U) return Math.abs(v) >= THREE_CORNER_V;
  return hoopDistance(u, v) >= THREE_RADIUS;
}

/** Distância do ponto (px, py) ao segmento entre (x0, y0) e (x1, y1). */
export function segmentDistance(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(px, py, x0, y0);
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / lengthSquared));
  return distance(px, py, x0 + dx * t, y0 + dy * t);
}

/** Lugares no lance livre, em (u, v): primeiro os defensores, junto ao cesto. */
export const FREE_THROW_SPOTS: readonly (readonly [number, number])[] = [
  [1.9, 2.9], [1.9, -2.9], [3.1, 2.9], [3.1, -2.9], [4.3, 2.9],
  [4.3, -2.9], [7.8, 0], [8.2, 3], [8.2, -3],
];

/** Pontos de quem espera aberto na linha de 3. `v` é multiplicado pelo lado do jogador. */
export const ARC_SPOTS: readonly (readonly [number, number])[] = [[1.3, 6.8], [5, 6.2], [7.8, 3.2]];
/** Pontos de quem joga de costas para o cesto. */
export const LOW_POST_SPOTS: readonly (readonly [number, number])[] = [[2.6, 1.9], [2.2, 1.4], [3.2, 2.2]];
/** Pontos de quem corta: uma posição aberta e duas junto ao cesto. */
export const CUT_SPOTS: readonly (readonly [number, number])[] = [[5.2, 5.5], [1.9, 0.9], [2.4, 0.3]];

/** Pontos de ataque de cada posição, em (u, v). O primeiro é o ponto base. */
export const SPOTS: readonly (readonly (readonly [number, number])[])[] = [
  [[8.4, 0], [7.8, -3], [7.8, 3]],
  [[5.2, -6], [7.2, -5], [1.3, -6.8]],
  [[4.6, 4.8], [1.3, 6.8], [7.2, 5]],
  [[5.8, 2.4], [3.6, 3.2], [1.9, 1]],
  [[2.4, -2.2], [2.4, 2.2], [1.7, -1]],
];
