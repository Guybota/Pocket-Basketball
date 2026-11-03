// Os playoffs das duas ligas profissionais: séries à melhor de 3 ou de 5, com o melhor classificado a jogar em casa os jogos ímpares.
import type { Fixture } from './league.ts';

export interface Series {
  /** O melhor classificado da fase regular: joga em casa o 1.º, o 3.º e o 5.º jogo. */
  top: number;
  bottom: number;
  bestOf: number;
  /** Os jogos já jogados, cada um com quem foi a casa. */
  games: Fixture[];
}

export interface PlayoffState {
  division: number;
  /** Quem entrou, do melhor para o pior da fase regular. */
  seeds: number[];
  rounds: Series[][];
}

export interface PlayoffFormat {
  name: string;
  /** Os lugares da fase regular que entram, a contar do zero. */
  places: readonly number[];
  bestOf: readonly number[];
  roundNames: readonly string[];
  /** Quem ganha o playoff é campeão; senão, ganha só a segunda subida. */
  decidesTitle: boolean;
}

/** Por divisão. A Pro Liga 1 decide o campeão; na Pro Liga 2 o 1.º sobe logo e o playoff decide a segunda subida. */
export const PLAYOFF_FORMATS: Partial<Record<number, PlayoffFormat>> = {
  3: { name: 'Playoffs', places: [0, 1, 2, 3, 4, 5, 6, 7], bestOf: [3, 3, 5], roundNames: ['Quartos de final', 'Meias-finais', 'Final'], decidesTitle: true },
  2: { name: 'Playoff de subida', places: [1, 2, 3, 4], bestOf: [3, 3], roundNames: ['Meias-finais', 'Final'], decidesTitle: false },
};

export const PLAYOFF_WEEKS = Math.max(...Object.values(PLAYOFF_FORMATS).map(format => format!.bestOf.length));

export const winsNeeded = (bestOf: number): number => Math.ceil(bestOf / 2);

/** Vitórias de cada lado, pela ordem (melhor classificado, pior classificado). */
export function seriesWins(series: Series): [number, number] {
  let top = 0;
  let bottom = 0;
  for (const game of series.games) {
    if (!game.score) continue;
    const homeWon = game.score[0] > game.score[1];
    if ((game.home === series.top) === homeWon) top++;
    else bottom++;
  }
  return [top, bottom];
}

export function seriesWinner(series: Series): number | null {
  const [top, bottom] = seriesWins(series);
  const needed = winsNeeded(series.bestOf);
  return top >= needed ? series.top : bottom >= needed ? series.bottom : null;
}

/** O jogo seguinte da série, ou null se já está decidida. */
export function nextGame(series: Series): Fixture | null {
  if (seriesWinner(series) !== null) return null;
  const index = series.games.length;
  return index % 2 === 0 ? { home: series.top, away: series.bottom, score: null } : { home: series.bottom, away: series.top, score: null };
}

/** Os pares da primeira ronda, ordenados para o quadro: 1.º-8.º, 4.º-5.º, 2.º-7.º, 3.º-6.º, e assim os vencedores vizinhos encontram-se. */
function bracketPairs(seeds: readonly number[]): [number, number][] {
  const n = seeds.length;
  const pairs: [number, number][] = [];
  const order = n === 8 ? [0, 3, 1, 2] : n === 4 ? [0, 1] : Array.from({ length: n / 2 }, (_, i) => i);
  for (const i of order) pairs.push([seeds[i]!, seeds[n - 1 - i]!]);
  return pairs;
}

export function createPlayoffs(division: number, order: readonly number[]): PlayoffState | null {
  const format = PLAYOFF_FORMATS[division];
  if (!format) return null;
  const seeds = format.places.map(place => order[place]!);
  const rounds: Series[][] = [bracketPairs(seeds).map(([top, bottom]) => ({ top, bottom, bestOf: format.bestOf[0]!, games: [] }))];
  return { division, seeds, rounds };
}

const seedRank = (state: PlayoffState, id: number): number => state.seeds.indexOf(id);

/** Com uma ronda decidida, monta a seguinte: vencedores vizinhos no quadro, e o melhor classificado em casa. */
export function drawNextRound(state: PlayoffState): PlayoffState {
  const format = PLAYOFF_FORMATS[state.division]!;
  const last = state.rounds[state.rounds.length - 1]!;
  if (state.rounds.length >= format.bestOf.length || last.some(series => seriesWinner(series) === null)) return state;
  const winners = last.map(series => seriesWinner(series)!);
  const next: Series[] = [];
  for (let i = 0; i + 1 < winners.length; i += 2) {
    const [a, b] = [winners[i]!, winners[i + 1]!];
    const top = seedRank(state, a) < seedRank(state, b) ? a : b;
    next.push({ top, bottom: top === a ? b : a, bestOf: format.bestOf[state.rounds.length]!, games: [] });
  }
  return { ...state, rounds: [...state.rounds, next] };
}

export function playoffWinner(state: PlayoffState): number | null {
  const format = PLAYOFF_FORMATS[state.division]!;
  if (state.rounds.length < format.bestOf.length) return null;
  const final = state.rounds[state.rounds.length - 1]!;
  return final.length === 1 ? seriesWinner(final[0]!) : null;
}

/** Até onde um clube chegou: a ronda em que caiu, ou o total se ganhou. Null se não entrou ou ainda está em prova. */
export function playoffExit(state: PlayoffState, id: number): number | null {
  if (!state.seeds.includes(id)) return null;
  if (playoffWinner(state) === id) return PLAYOFF_FORMATS[state.division]!.bestOf.length;
  const round = state.rounds.findIndex(r => r.some(series => (series.top === id || series.bottom === id) && seriesWinner(series) !== null && seriesWinner(series) !== id));
  return round < 0 ? null : round;
}
