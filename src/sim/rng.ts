// Mulberry32. O estado é um número simples, por isso um jogo pode ser guardado e retomado.
export interface Rng {
  state: number;
}

export const makeRng = (seed: number): Rng => ({ state: seed >>> 0 });

export function next(rng: Rng): number {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const chance = (rng: Rng, probability: number): boolean => next(rng) < probability;

export const between = (rng: Rng, min: number, max: number): number => min + next(rng) * (max - min);

/** Devolve um índice com probabilidade proporcional ao peso. */
export function weightedIndex(rng: Rng, weights: readonly number[]): number {
  let total = 0;
  for (const w of weights) total += w;
  let roll = next(rng) * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i]!;
    if (roll < 0) return i;
  }
  return weights.length - 1;
}
