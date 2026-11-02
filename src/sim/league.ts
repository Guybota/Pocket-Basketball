import { BALANCE as B } from './balance.ts';
import { CUP_WEEKS, type CupName } from './cup.ts';
import { between, makeRng, shuffled, type Rng } from './rng.ts';

export { shuffled };

/** Um clube da liga. Guarda só o necessário para gerar a equipa, para o save ficar pequeno. */
export interface LeagueClub {
  name: string;
  short: string;
  seed: number;
  level: number;
  /** Os 12 jogadores do pool, pelos lugares do plantel. Os clubes de fora não têm. */
  players?: number[];
}

export interface Fixture {
  home: number;
  away: number;
  score: [number, number] | null;
}

export interface Standing {
  club: number;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}

export type SeasonOutcome = 'champion' | 'promoted' | 'stayed' | 'relegated';

export const LEAGUE_SIZE = 10;
// Duas semanas de pré-época e 18 jornadas, com as semanas das taças pelo meio: 6 da Taça da Federação, 4 da Continental e 1 do Mundial.
export const PRESEASON_WEEKS = 2;
export const SEASON_WEEKS = 31;
export const MOVING_PLACES = 2;
const CUP_WEEK_SET = new Set(Object.values(CUP_WEEKS).flat());
/** As semanas com jornada, por ordem. */
export const LEAGUE_WEEKS: readonly number[] = Array.from({ length: SEASON_WEEKS }, (_, i) => i + 1).filter(week => week > PRESEASON_WEEKS && !CUP_WEEK_SET.has(week));

/** A jornada de cada semana, ou null numa semana de taça. */
export function weekRound(week: number): number | null {
  const round = LEAGUE_WEEKS.indexOf(week);
  return round < 0 ? null : round;
}

/** A taça e a ronda de uma semana, ou null numa semana de jornada. */
export function weekCup(week: number): { cup: CupName; round: number } | null {
  for (const cup of Object.keys(CUP_WEEKS) as CupName[]) {
    const round = CUP_WEEKS[cup].indexOf(week);
    if (round >= 0) return { cup, round };
  }
  return null;
}


/** Todos jogam contra todos, em casa e fora. Na segunda volta trocam-se os campos. */
export function roundRobin(ids: readonly number[], seed: number): Fixture[][] {
  const order = shuffled(ids, makeRng(seed));
  const rounds: Fixture[][] = [];
  for (let r = 0; r < order.length - 1; r++) {
    const round: Fixture[] = [];
    for (let i = 0; i < order.length / 2; i++) {
      const a = order[i]!;
      const b = order[order.length - 1 - i]!;
      // Quem roda muda de lugar em cada jornada, por isso basta trocar o lado para alternar casa e fora.
      round.push(r % 2 === 0 ? { home: a, away: b, score: null } : { home: b, away: a, score: null });
    }
    rounds.push(round);
    order.splice(1, 0, order.pop()!);
  }
  const second = rounds.map(round => round.map(f => ({ home: f.away, away: f.home, score: null })));
  return [...rounds, ...second];
}

/** Classificação: vitórias, depois diferença de pontos, depois pontos marcados. */
export function standings(ids: readonly number[], rounds: readonly (readonly Fixture[])[]): Standing[] {
  const table = new Map(ids.map(club => [club, { club, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }]));
  for (const round of rounds) {
    for (const { home, away, score } of round) {
      if (!score) continue;
      const a = table.get(home)!;
      const b = table.get(away)!;
      a.played++;
      b.played++;
      a.pointsFor += score[0];
      a.pointsAgainst += score[1];
      b.pointsFor += score[1];
      b.pointsAgainst += score[0];
      if (score[0] > score[1]) {
        a.wins++;
        b.losses++;
      } else {
        b.wins++;
        a.losses++;
      }
    }
  }
  return [...table.values()].sort((a, b) =>
    b.wins - a.wins
    || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst)
    || b.pointsFor - a.pointsFor
    || a.club - b.club);
}

export function seasonOutcome(position: number, division: number, divisionCount: number): SeasonOutcome {
  if (position === 0) return 'champion';
  if (position < MOVING_PLACES && division < divisionCount - 1) return 'promoted';
  if (position >= LEAGUE_SIZE - MOVING_PLACES && division > 0) return 'relegated';
  return 'stayed';
}

/** Os dois primeiros sobem e os dois últimos descem. Recebe cada divisão já ordenada, do melhor para o pior. */
export function moveDivisions(finalOrders: readonly (readonly number[])[]): number[][] {
  return finalOrders.map((order, d) => {
    const stay = order.slice(d < finalOrders.length - 1 ? MOVING_PLACES : 0, d > 0 ? order.length - MOVING_PLACES : order.length);
    const fromBelow = d > 0 ? finalOrders[d - 1]!.slice(0, MOVING_PLACES) : [];
    const fromAbove = d < finalOrders.length - 1 ? finalOrders[d + 1]!.slice(-MOVING_PLACES) : [];
    return [...stay, ...fromBelow, ...fromAbove];
  });
}

/** Sem ver os jogos das outras divisões, ganha quem tem mais nível, com alguma sorte à mistura. */
export function orderByLevel(ids: readonly number[], levelOf: (id: number) => number, rng: Rng): number[] {
  const ranked = ids.map(id => ({ id, score: levelOf(id) + between(rng, -B.otherDivisionLuck, B.otherDivisionLuck) }));
  return ranked.sort((a, b) => b.score - a.score).map(entry => entry.id);
}

/** Ganhar a quem é melhor dá mais confiança, e perder com quem é pior custa mais. */
export function confidenceChange(won: boolean, ownRating: number, opponentRating: number, official: boolean): number {
  const gap = opponentRating - ownRating;
  const size = won ? B.confidenceStep + B.confidenceGapWeight * gap : B.confidenceStep - B.confidenceGapWeight * gap;
  const bounded = Math.max(B.confidenceMinStep, Math.min(B.confidenceMaxStep, size));
  const scaled = official ? bounded : bounded * B.confidenceFriendlyFactor;
  return Math.round(won ? scaled : -scaled);
}

export const SEASON_CONFIDENCE: Record<SeasonOutcome, number> = {
  champion: B.confidenceChampion,
  promoted: B.confidencePromoted,
  stayed: 0,
  relegated: -B.confidenceRelegated,
};
