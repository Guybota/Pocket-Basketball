// Parte dos testes da simulação. Estão divididos em ficheiros para correrem em paralelo.
import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { attributeWinRate, betterTeamWinRate, bodyWinRate, fullBonusWinRate, movesWinRate, styleWinRate, summarize, type Summary } from './batch.ts';
import { ARC_SPOTS, COURT_HALF_WIDTH, COURT_LENGTH, CUT_SPOTS, LOW_POST_SPOTS, SPOTS, THREE_CORNER_MAX_U, THREE_CORNER_V, THREE_RADIUS, hoopDistance, isThree, segmentDistance, threeLineGap } from './court.ts';
import { cancelSubstitution, createMatch, pushPower, queueSubstitution, replayMatch, requestTimeout, resolveContacts, setAutoRotation, setTactics, simulateMatch, step, type Body, type MatchState } from './match.ts';
import { makeRng, next, weightedIndex } from './rng.ts';
import { baseChance, freeThrowChance, shotChance } from './shot.ts';
import { DIVISIONS, generateLeagueTeam, generateTeam, teamRating, withBody, withBonus, withMoves, withStyles, withTactics } from './teamgen.ts';
import { ATTRIBUTE_KEYS, MOVES, OFF_BALL_STYLES, ON_BALL_STYLES, gradeOf, validateTeam, type Attributes, type MoveId, type OffBallStyle, type OnBallStyle, type Tactics, NEUTRAL_TACTICS, validateTactics } from './types.ts';

const home = generateTeam(1, 'Vilar BC', 55);
const away = generateTeam(2, 'Ribeirinha BC', 55);
const flat = (value: number): Attributes => ({
  shooting: value, speed: value, stamina: value, technique: value, strength: value, jumping: value, willpower: value,
});


describe('movimentos especiais', () => {
  const countMoves = (moves: readonly MoveId[]): Record<string, number> => {
    const seen: Record<string, number> = {};
    for (let i = 0; i < 60; i++) {
      const team = withMoves(generateTeam(i, 'A', 55), moves);
      for (const e of simulateMatch(team, withMoves(generateTeam(i + 500, 'B', 55), []), i + 1).events) {
        if (e.type === 'move') seen[e.move!] = (seen[e.move!] ?? 0) + 1;
      }
    }
    return seen;
  };

  it('cada movimento acontece em jogo', () => {
    const seen = countMoves(MOVES);
    for (const move of MOVES) expect(seen[move] ?? 0, move).toBeGreaterThan(0);
  });

  it('quem não tem movimentos não os faz', () => {
    expect(countMoves([])).toEqual({});
  });

  it('o jogador nunca faz um movimento que não tem', () => {
    const team = withMoves(generateTeam(1, 'A', 55), []);
    const roster = team.roster.map((player, i) => (i === 0 ? { ...player, moves: ['crossover' as MoveId] } : player));
    const s = simulateMatch({ ...team, roster }, withMoves(generateTeam(2, 'B', 55), []), 3);
    for (const e of s.events) if (e.type === 'move') expect(e.player).toBe(roster[0]!.name);
  });

  it('as repetições continuam iguais com movimentos', () => {
    const team = withMoves(generateTeam(1, 'A', 55), MOVES);
    expect(simulateMatch(team, away, 8).events).toEqual(simulateMatch(team, away, 8).events);
  });

  it('um movimento ajuda sem decidir o jogo', () => {
    for (const move of MOVES) {
      const rate = movesWinRate([move], 300);
      expect(rate, move).toBeGreaterThan(0.45);
      expect(rate, move).toBeLessThan(0.75);
    }
  });
});

describe('comportamentos', () => {
  const plain = (seed: number, name: string): ReturnType<typeof generateTeam> =>
    withStyles(generateTeam(seed, name, 55), { offBall: 'balanced', onBall: 'balanced' });

  /** Distância média ao cesto atacado da equipa da casa, quando ataca sem bola. */
  function averageDistance(offBall: OffBallStyle): number {
    let total = 0;
    let samples = 0;
    for (let i = 0; i < 12; i++) {
      const s = createMatch(withStyles(plain(i, 'A'), { offBall }), plain(i + 100, 'B'), i + 1);
      while (s.phase !== 'end') {
        step(s);
        if (s.phase !== 'live' || s.offense !== 0) continue;
        const hoopX = s.period >= 3 ? 1.575 : 26.425;
        for (const b of s.court[0]) {
          if (b === s.holder) continue;
          total += Math.sqrt((b.x - hoopX) * (b.x - hoopX) + b.y * b.y);
          samples++;
        }
      }
    }
    return total / samples;
  }

  it('sem bola, cada comportamento muda mesmo o posicionamento', () => {
    const lowPost = averageDistance('lowPost');
    const cutter = averageDistance('cutter');
    const spotUp = averageDistance('spotUp');
    expect(lowPost).toBeLessThan(cutter);
    expect(cutter).toBeLessThan(spotUp);
  });

  /** Totais da equipa da casa com um comportamento com bola. */
  function homeTotals(styles: { onBall?: OnBallStyle; offBall?: OffBallStyle }): { threes: number; twos: number; assists: number; offensive: number; defensive: number } {
    const out = { threes: 0, twos: 0, assists: 0, offensive: 0, defensive: 0 };
    for (let i = 0; i < 80; i++) {
      const { lines } = simulateMatch(withStyles(plain(i, 'A'), styles), plain(i + 500, 'B'), i + 1);
      out.threes += lines[0].threeAttempts;
      out.twos += lines[0].twoAttempts;
      out.assists += lines[0].assists;
      out.offensive += lines[0].offensiveRebounds;
      out.defensive += lines[1].defensiveRebounds;
    }
    return out;
  }
  const threeShare = (t: { threes: number; twos: number }): number => t.threes / (t.threes + t.twos);

  it('com bola, os lançadores lançam mais de 3 do que os penetradores', () => {
    expect(threeShare(homeTotals({ onBall: 'shooter' }))).toBeGreaterThan(threeShare(homeTotals({ onBall: 'slasher' })) + 0.1);
  });

  it('os organizadores fazem mais assistências do que os solistas', () => {
    // Mede o próprio jogador: cinco organizadores na mesma equipa passam até acabar o tempo de posse.
    const baseAssists = (onBall: OnBallStyle): number => {
      let total = 0;
      for (let i = 0; i < 150; i++) {
        const team = plain(i, 'A');
        const roster = team.roster.map((player, index) => (index === 0 ? { ...player, onBall } : player));
        total += simulateMatch({ ...team, roster }, plain(i + 500, 'B'), i + 1).bodies[0]!.line.assists;
      }
      return total;
    };
    expect(baseAssists('playmaker')).toBeGreaterThan(baseAssists('scorer'));
  });

  it('o guarda do aro desarma mais, o dínamo rouba mais, e o sexto homem recupera mais no banco', () => {
    const totals = (offBall: OffBallStyle): { blocks: number; steals: number; benchFatigue: number } => {
      let blocks = 0;
      let steals = 0;
      let benchFatigue = 0;
      for (let i = 0; i < 60; i++) {
        const team = plain(i, 'A');
        const roster = team.roster.map((player, index) => (index < 5 ? { ...player, offBall } : player));
        const s = simulateMatch({ ...team, roster }, plain(i + 500, 'B'), i + 1);
        blocks += s.lines[0].blocks;
        steals += s.lines[0].steals;
        for (let k = 0; k < 5; k++) benchFatigue += s.bodies[k]!.fatigue;
      }
      return { blocks, steals, benchFatigue };
    };
    const base = totals('balanced');
    expect(totals('rimProtector').blocks).toBeGreaterThan(base.blocks);
    expect(totals('dynamo').steals).toBeGreaterThan(base.steals);
    expect(totals('sixthMan').benchFatigue).toBeLessThan(base.benchFatigue);
  });

  it('os ressaltadores ganham mais ressaltos ofensivos', () => {
    const rate = (t: { offensive: number; defensive: number }): number => t.offensive / (t.offensive + t.defensive);
    expect(rate(homeTotals({ offBall: 'crasher' }))).toBeGreaterThan(rate(homeTotals({ offBall: 'balanced' })));
  });

  it('nenhum comportamento decide o jogo sozinho', () => {
    for (const offBall of OFF_BALL_STYLES) {
      const rate = styleWinRate({ offBall }, 150);
      expect(rate, offBall).toBeGreaterThan(0.3);
      expect(rate, offBall).toBeLessThan(0.75);
    }
    for (const onBall of ON_BALL_STYLES) {
      const rate = styleWinRate({ onBall }, 150);
      expect(rate, onBall).toBeGreaterThan(0.3);
      expect(rate, onBall).toBeLessThan(0.75);
    }
  });
});
