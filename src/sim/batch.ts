import { simulateMatch } from './match.ts';
import { generateLeagueTeam, generateTeam, teamRating, withBody, withBonus, withMoves, withStyles } from './teamgen.ts';
import { ATTRIBUTE_KEYS, type Attributes, type MoveId, type OffBallStyle, type OnBallStyle, type Team } from './types.ts';

export interface Summary {
  matches: number;
  meanPoints: number;
  pointsInRange: number;
  meanPossessions: number;
  secondsPerPossession: number;
  pointsPerPossession: number;
  twoPercent: number;
  threePercent: number;
  threeShare: number;
  freeThrowPercent: number;
  freeThrowsPerTeam: number;
  offensiveReboundPercent: number;
  turnoversPerTeam: number;
  foulsPerTeam: number;
  blocksPerTeam: number;
  movesPerGame: number;
  overtimes: number;
  meanMargin: number;
}

const POINTS_MIN = 35;
const POINTS_MAX = 50;

export function summarize(makeTeams: (i: number) => [Team, Team], matches: number, seedBase = 1): Summary {
  let points = 0, inRange = 0, possessions = 0, ticks = 0, overtimes = 0, margin = 0;
  let twoA = 0, twoM = 0, threeA = 0, threeM = 0, ftA = 0, ftM = 0, oreb = 0, dreb = 0, to = 0, fouls = 0, blocks = 0, moves = 0;
  for (let i = 0; i < matches; i++) {
    const [home, away] = makeTeams(i);
    const s = simulateMatch(home, away, seedBase + i);
    margin += Math.abs(s.score[0] - s.score[1]);
    if (s.period > 4) overtimes++;
    ticks += s.tick;
    moves += s.events.filter(e => e.type === 'move').length;
    for (const team of [0, 1] as const) {
      const line = s.lines[team];
      const score = s.score[team];
      points += score;
      if (score >= POINTS_MIN && score <= POINTS_MAX) inRange++;
      possessions += line.possessions;
      twoA += line.twoAttempts;
      twoM += line.twoMade;
      threeA += line.threeAttempts;
      threeM += line.threeMade;
      ftA += line.freeThrowAttempts;
      ftM += line.freeThrowsMade;
      oreb += line.offensiveRebounds;
      dreb += line.defensiveRebounds;
      to += line.turnovers;
      fouls += line.fouls;
      blocks += line.blocks;
    }
  }
  const teamGames = matches * 2;
  return {
    matches,
    meanPoints: points / teamGames,
    pointsInRange: inRange / teamGames,
    meanPossessions: possessions / matches,
    secondsPerPossession: ticks / 20 / possessions,
    pointsPerPossession: points / possessions,
    twoPercent: twoM / twoA,
    threePercent: threeM / threeA,
    threeShare: threeA / (twoA + threeA),
    freeThrowPercent: ftM / ftA,
    freeThrowsPerTeam: ftA / teamGames,
    offensiveReboundPercent: oreb / (oreb + dreb),
    turnoversPerTeam: to / teamGames,
    foulsPerTeam: fouls / teamGames,
    blocksPerTeam: blocks / teamGames,
    movesPerGame: moves / matches,
    overtimes: overtimes / matches,
    meanMargin: margin / matches,
  };
}

/** Percentagem de vitórias da primeira equipa. Alterna o campo para anular a vantagem de jogar em casa. */
export function winRate(makeTeams: (i: number) => [Team, Team], matches: number, seedBase = 1): number {
  let wins = 0;
  for (let i = 0; i < matches; i++) {
    const [a, b] = makeTeams(i);
    if (i % 2 === 0) {
      const s = simulateMatch(a, b, seedBase + i);
      if (s.score[0] > s.score[1]) wins++;
    } else {
      const s = simulateMatch(b, a, seedBase + i);
      if (s.score[1] > s.score[0]) wins++;
    }
  }
  return wins / matches;
}

/** Duas equipas ao acaso do mesmo campeonato: quantas vezes ganha a de melhor classificação? */
export function betterTeamWinRate(level: number, matches: number, seedBase = 1): number {
  return winRate(i => {
    const a = generateLeagueTeam(seedBase * 7919 + i * 2, 'Equipa A', level);
    const b = generateLeagueTeam(seedBase * 7919 + i * 2 + 1, 'Equipa B', level);
    return teamRating(a) >= teamRating(b) ? [a, b] : [b, a];
  }, matches, seedBase);
}

const mirror = (i: number, level: number): Team => generateTeam(100000 + i, 'Base', level);

/** Duas equipas iguais, com todos os atributos de uma delas subidos. */
export function fullBonusWinRate(bonus: number, matches: number, level = 55, seedBase = 1): number {
  return winRate(i => [withBonus(mirror(i, level), ATTRIBUTE_KEYS, bonus), mirror(i, level)], matches, seedBase);
}

/** Duas equipas iguais, com um único atributo subido numa delas. Mostra se algum domina ou não serve para nada. */
export function attributeWinRate(key: keyof Attributes, bonus: number, matches: number, level = 55, seedBase = 1): number {
  return winRate(i => [withBonus(mirror(i, level), [key], bonus), mirror(i, level)], matches, seedBase);
}

/** Duas equipas iguais, com o corpo de todos os jogadores de uma delas mudado. */
export function bodyWinRate(levels: number, matches: number, level = 55, seedBase = 1): number {
  return winRate(i => [withBody(mirror(i, level), levels), mirror(i, level)], matches, seedBase);
}

/** Duas equipas iguais em tudo, mas só uma tem movimentos especiais. */
export function movesWinRate(moves: readonly MoveId[], matches: number, level = 55, seedBase = 1): number {
  return winRate(i => [withMoves(mirror(i, level), moves), withMoves(mirror(i, level), [])], matches, seedBase);
}

/** Dois titulares e os seus suplentes com um comportamento, contra a mesma equipa sem nenhum. Cinco iguais não seria realista. */
export function styleWinRate(styles: { offBall?: OffBallStyle; onBall?: OnBallStyle }, matches: number, level = 55, seedBase = 1): number {
  const plain = (i: number): Team => withStyles(mirror(i, level), { offBall: 'balanced', onBall: 'balanced' });
  const styled = (i: number): Team => {
    const team = plain(i);
    return { ...team, roster: team.roster.map((player, index) => ([1, 2, 6, 7].includes(index) ? { ...player, ...styles } : player)) };
  };
  return winRate(i => [styled(i), plain(i)], matches, seedBase);
}
