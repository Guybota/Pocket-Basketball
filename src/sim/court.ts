// Medidas em metros, baseadas nas da FIBA. "u" é a distância à linha final atacada e "v" a posição lateral.
export const COURT_LENGTH = 28;
export const COURT_HALF_WIDTH = 7.5;
export const HOOP_U = 1.575;
// A linha de 3 é mais curta do que a verdadeira, sobretudo nos cantos, onde a da FIBA fica quase colada à lateral.
// Os bonecos são grandes para o campo, e assim cabem claramente de um lado ou do outro da linha.
export const THREE_RADIUS = 6.3;
export const THREE_CORNER_V = 5.7;
export const TICKS_PER_SECOND = 20;
export const DT = 1 / TICKS_PER_SECOND;

export const seconds = (s: number): number => Math.round(s * TICKS_PER_SECOND);

export function distance(x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  return Math.sqrt(dx * dx + dy * dy);
}

export const hoopDistance = (u: number, v: number): number => distance(u, v, HOOP_U, 0);

/** Onde a parte reta da linha de 3 encontra o arco. */
export const THREE_CORNER_MAX_U = HOOP_U + Math.sqrt(THREE_RADIUS * THREE_RADIUS - THREE_CORNER_V * THREE_CORNER_V);

/** A que distância da linha de 3 está o ponto: positiva por fora, negativa por dentro. */
export function threeLineGap(u: number, v: number): number {
  return u < THREE_CORNER_MAX_U ? Math.abs(v) - THREE_CORNER_V : hoopDistance(u, v) - THREE_RADIUS;
}

export const isThree = (u: number, v: number): boolean => threeLineGap(u, v) >= 0;

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
export const ARC_SPOTS: readonly (readonly [number, number])[] = [[1.3, 6.5], [5, 6.2], [7.8, 3.2]];
/** Pontos de quem joga de costas para o cesto. */
export const LOW_POST_SPOTS: readonly (readonly [number, number])[] = [[2.6, 1.9], [2.2, 1.4], [3.2, 2.2]];
/** Onde cada um ataca o ressalto, por lugar no ataque, para não irem todos para o mesmo sítio. */
export const CRASH_SPOTS: readonly (readonly [number, number])[] = [[3.6, 0], [3.2, -3], [3.2, 3], [3, 2.1], [2.6, -1.9]];
/** Pontos de quem corta: uma posição aberta e duas junto ao cesto. */
export const CUT_SPOTS: readonly (readonly [number, number])[] = [[5.4, 5.7], [1.9, 0.9], [2.4, 0.3]];

/** Pontos de ataque de cada posição, em (u, v). O primeiro é o ponto base. */
export const SPOTS: readonly (readonly (readonly [number, number])[])[] = [
  [[8.4, 0], [7.8, -3], [7.8, 3]],
  [[5.2, -6], [7.2, -5], [1.3, -6.5]],
  [[4.6, 4.8], [1.3, 6.5], [7.2, 5]],
  [[5.8, 2.4], [3.6, 3.2], [1.9, 1]],
  [[2.4, -2.2], [2.4, 2.2], [1.7, -1]],
];
