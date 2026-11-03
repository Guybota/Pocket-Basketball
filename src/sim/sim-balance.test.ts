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


describe('critérios da Fase 0', () => {
  const league = (level: number) => (i: number): [ReturnType<typeof generateTeam>, ReturnType<typeof generateTeam>] => [
    generateLeagueTeam(i * 2 + 1, 'A', level),
    generateLeagueTeam(i * 2 + 2, 'B', level),
  ];
  let summary: Summary;
  beforeAll(() => {
    summary = summarize(league(55), 500);
  });

  it('resultados entre 35 e 50 pontos por equipa', () => {
    expect(summary.meanPoints).toBeGreaterThanOrEqual(38);
    expect(summary.meanPoints).toBeLessThanOrEqual(46);
    // A sorte de um jogo curto faz alguns resultados saírem do intervalo.
    expect(summary.pointsInRange).toBeGreaterThanOrEqual(0.6);
  });

  it('todas as divisões têm uma média dentro do intervalo', () => {
    for (const { level } of DIVISIONS) {
      const { meanPoints } = summarize(league(level), 200);
      expect(meanPoints).toBeGreaterThanOrEqual(35);
      expect(meanPoints).toBeLessThanOrEqual(50);
    }
  });

  it('60 a 70 posses por jogo', () => {
    expect(summary.meanPossessions).toBeGreaterThanOrEqual(60);
    expect(summary.meanPossessions).toBeLessThanOrEqual(70);
  });

  it('as estatísticas parecem basquetebol', () => {
    expect(summary.twoPercent).toBeGreaterThan(0.45);
    expect(summary.twoPercent).toBeLessThan(0.62);
    expect(summary.threePercent).toBeGreaterThan(0.3);
    expect(summary.threePercent).toBeLessThan(0.42);
    expect(summary.threeShare).toBeGreaterThan(0.25);
    expect(summary.threeShare).toBeLessThan(0.5);
    expect(summary.offensiveReboundPercent).toBeGreaterThan(0.18);
    expect(summary.offensiveReboundPercent).toBeLessThan(0.32);
    expect(summary.overtimes).toBeLessThan(0.1);
    // Um desarme é um momento alto: tem de acontecer em quase todos os jogos, mas sem ser banal.
    expect(summary.blocksPerTeam).toBeGreaterThan(0.5);
    expect(summary.blocksPerTeam).toBeLessThan(3);
  });

  it('a melhor equipa do campeonato ganha cerca de 70% das vezes', () => {
    const rate = betterTeamWinRate(55, 600);
    expect(rate).toBeGreaterThanOrEqual(0.65);
    expect(rate).toBeLessThanOrEqual(0.76);
  });

  it('uma nota acima em tudo ganha quase sempre, mas não sempre', () => {
    const rate = fullBonusWinRate(17, 400);
    expect(rate).toBeGreaterThan(0.8);
    expect(rate).toBeLessThan(0.99);
  });

  it('todos os atributos contam, e nenhum domina', () => {
    for (const key of ATTRIBUTE_KEYS) {
      const rate = attributeWinRate(key, 17, 600);
      expect(rate, key).toBeGreaterThan(0.52);
      expect(rate, key).toBeLessThan(0.72);
    }
  });

  it('uma equipa gerada não repete apelidos', () => {
    for (let seed = 0; seed < 50; seed++) {
      const names = generateTeam(seed, 'A', 55).roster.map(player => player.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('os postes são mais altos do que os bases, e as medidas são credíveis', () => {
    let bases = 0;
    let postes = 0;
    for (let seed = 0; seed < 100; seed++) {
      const roster = generateTeam(seed, 'A', 55).roster;
      bases += roster[0]!.heightCm;
      postes += roster[4]!.heightCm;
      for (const player of roster) {
        expect(player.heightCm).toBeGreaterThanOrEqual(165);
        expect(player.heightCm).toBeLessThanOrEqual(225);
      }
    }
    expect(postes).toBeGreaterThan(bases + 100 * 20);
  });

  it('a altura ajuda sem decidir tudo', () => {
    const rate = bodyWinRate(10, 500);
    expect(rate).toBeGreaterThan(0.53);
    expect(rate).toBeLessThan(0.75);
  });

  it('uma equipa mais alta ganha mais ressaltos', () => {
    let tall = 0;
    let base = 0;
    for (let i = 0; i < 100; i++) {
      const team = generateTeam(i, 'A', 55);
      const s = simulateMatch(withBody(team, 12), team, i + 1);
      tall += s.lines[0].offensiveRebounds + s.lines[0].defensiveRebounds;
      base += s.lines[1].offensiveRebounds + s.lines[1].defensiveRebounds;
    }
    expect(tall).toBeGreaterThan(base);
  });

  it('a classificação da equipa reflete o nível pedido', () => {
    expect(teamRating(generateTeam(1, 'A', 70))).toBeGreaterThan(teamRating(generateTeam(1, 'A', 40)));
  });
});
