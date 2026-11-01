// As taças: eliminatórias a um jogo, sorteadas ronda a ronda. Cada ronda só se sorteia quando chega a semana dela.
import type { Fixture } from './league.ts';
import { makeRng, shuffled } from './rng.ts';

export type CupName = 'federation' | 'continental' | 'world';

export interface CupState {
  /** Quem ainda está na taça. */
  alive: number[];
  /** Quem joga a pré-eliminatória; os outros só entram na ronda seguinte. */
  preliminary: number[];
  /** As rondas já sorteadas, com os resultados das já jogadas. */
  rounds: Fixture[][];
}

/** As semanas de cada taça. Para quem não joga nessa semana, é uma semana livre. */
export const CUP_WEEKS: Record<CupName, readonly number[]> = {
  federation: [2, 6, 10, 14, 18, 22],
  continental: [4, 12, 20, 26],
  world: [28],
};

export const CUP_NAMES: Record<CupName, string> = { federation: 'Taça da Federação', continental: 'Taça Continental', world: 'Mundial de Clubes' };

export const FEDERATION_ROUNDS = ['Pré-eliminatória', '1/16 de final', 'Oitavos de final', 'Quartos de final', 'Meias-finais', 'Final'] as const;
export const CUP_ROUNDS: Record<CupName, readonly string[]> = {
  federation: FEDERATION_ROUNDS,
  continental: ['Oitavos de final', 'Quartos de final', 'Meias-finais', 'Final'],
  world: ['Final'],
};
const PRELIMINARY_FROM_ABOVE = 6;

/** Todos os clubes entram. Os da última divisão e os mais fracos da seguinte começam na pré-eliminatória. */
export function createFederationCup(divisions: readonly (readonly number[])[], levelOf: (id: number) => number): CupState {
  const weakest = [...divisions[1]!].sort((a, b) => levelOf(a) - levelOf(b)).slice(0, PRELIMINARY_FROM_ABOVE);
  return { alive: divisions.flat(), preliminary: [...divisions[0]!, ...weakest], rounds: [] };
}

/** Uma eliminatória simples: entram todos na primeira ronda. */
export const createKnockoutCup = (ids: readonly number[]): CupState => ({ alive: [...ids], preliminary: [], rounds: [] });

/** Sorteia a ronda seguinte entre quem ainda está na taça. O primeiro de cada par joga em casa. */
export function drawCupRound(cup: CupState, seed: number): CupState {
  const round = cup.rounds.length;
  const pool = round === 0 && cup.preliminary.length > 0 ? cup.alive.filter(id => cup.preliminary.includes(id)) : cup.alive;
  const order = shuffled(pool, makeRng((seed ^ ((round + 1) * 0x3d1f)) & 0x7fffffff));
  const fixtures: Fixture[] = [];
  for (let i = 0; i + 1 < order.length; i += 2) fixtures.push({ home: order[i]!, away: order[i + 1]!, score: null });
  return { ...cup, rounds: [...cup.rounds, fixtures] };
}

/** Guarda os resultados de uma ronda e tira da taça quem perdeu. */
export function settleCupRound(cup: CupState, round: number, fixtures: readonly Fixture[]): CupState {
  const losers = new Set(fixtures.filter(f => f.score).map(f => (f.score![0] > f.score![1] ? f.away : f.home)));
  return { ...cup, rounds: cup.rounds.map((r, i) => (i === round ? [...fixtures] : r)), alive: cup.alive.filter(id => !losers.has(id)) };
}

/** O vencedor, depois da final. */
export function cupWinner(cup: CupState, totalRounds: number): number | null {
  const final = cup.rounds[totalRounds - 1];
  return final && final.every(f => f.score) && cup.alive.length === 1 ? cup.alive[0]! : null;
}

/** Até onde um clube chegou: a ronda em que caiu, ou o total se a ganhou. Null se ainda está em prova. */
export function cupExit(cup: CupState, id: number, totalRounds: number): number | null {
  if (cupWinner(cup, totalRounds) === id) return totalRounds;
  if (cup.alive.includes(id)) return null;
  const round = cup.rounds.findIndex(r => r.some(f => f.score && (f.home === id || f.away === id) && (f.score[0] > f.score[1] ? f.away : f.home) === id));
  return round < 0 ? 0 : round;
}
