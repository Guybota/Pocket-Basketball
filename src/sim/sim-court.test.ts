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


describe('ressaltos', () => {
  /** Para cada ressalto de jogos reais: a altura máxima da bola e onde estava quando começou. */
  const rebounds = (matches: number): { startZ: number; peak: number; endX: number; toX: number; blocked: boolean; caught: boolean }[] => {
    const found: { startZ: number; peak: number; endX: number; toX: number; blocked: boolean; caught: boolean }[] = [];
    for (let seed = 1; seed <= matches; seed++) {
      const s = createMatch(home, away, seed);
      let current: (typeof found)[number] | null = null;
      while (s.phase !== 'end') {
        const events = s.events.length;
        step(s);
        if (s.phase === 'rebound' && s.loose) {
          if (!current) {
            current = { startZ: s.loose.fromZ, peak: s.ball.z, endX: s.ball.x, toX: s.loose.toX, blocked: s.events.slice(events).some(e => e.type === 'block'), caught: false };
            found.push(current);
          }
          current.peak = Math.max(current.peak, s.ball.z);
          current.endX = s.ball.x;
        } else {
          // Um período pode acabar com a bola no ar, e aí ninguém a apanha.
          if (current) current.caught = s.events.at(-1)?.type === 'rebound';
          current = null;
        }
      }
    }
    return found;
  };

  it('depois de bater no aro, a bola umas vezes sobe e outras cai logo', () => {
    const rim = rebounds(40).filter(r => !r.blocked);
    expect(rim.length).toBeGreaterThan(100);
    for (const r of rim) expect(r.startZ).toBeCloseTo(3.05, 1);
    const up = rim.filter(r => r.peak > r.startZ + 0.25).length / rim.length;
    const down = rim.filter(r => r.peak <= r.startZ + 0.05).length / rim.length;
    expect(up).toBeGreaterThan(0.5);
    expect(up).toBeLessThan(0.85);
    expect(down).toBeGreaterThan(0.15);
    for (const r of rim) expect(r.peak).toBeLessThan(5);
  });

  it('a bola acaba onde os jogadores a foram buscar', () => {
    const caught = rebounds(10).filter(r => r.caught);
    expect(caught.length).toBeGreaterThan(50);
    for (const r of caught) expect(Math.abs(r.endX - r.toX)).toBeLessThan(1);
  });

  it('a bola nunca sai para fora do campo depois de um desarme', () => {
    for (const r of rebounds(40).filter(r => r.blocked)) {
      expect(r.toX).toBeGreaterThanOrEqual(0);
      expect(r.toX).toBeLessThanOrEqual(28);
    }
  });
});

describe('linha de 3', () => {
  it('nenhum lugar de ataque fica em cima da linha', () => {
    for (const spot of [...SPOTS.flat(), ...ARC_SPOTS, ...LOW_POST_SPOTS, ...CUT_SPOTS]) {
      expect(Math.abs(threeLineGap(spot[0], spot[1])), `(${spot[0]}, ${spot[1]})`).toBeGreaterThan(0.5);
    }
  });

  it('a linha continua: o canto e o arco encontram-se, sem degraus', () => {
    expect(threeLineGap(THREE_CORNER_MAX_U - 0.001, THREE_CORNER_V)).toBeCloseTo(0, 2);
    expect(threeLineGap(THREE_CORNER_MAX_U + 0.001, THREE_CORNER_V)).toBeCloseTo(0, 2);
  });

  it('o canto deixa espaço para um jogador entre a linha e a lateral', () => {
    expect(COURT_HALF_WIDTH - THREE_CORNER_V).toBeGreaterThan(1.5);
  });

  it('quase ninguém lança com os pés em cima da linha', () => {
    let shots = 0;
    let onTheLine = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const s = createMatch(home, away, seed);
      let flight: unknown = null;
      while (s.phase !== 'end') {
        step(s);
        if (s.flight?.kind === 'shot' && s.flight !== flight) {
          flight = s.flight;
          // Quase todos os lançamentos são feitos na metade do cesto atacado.
          const u = Math.min(s.flight.fromX, COURT_LENGTH - s.flight.fromX);
          shots++;
          if (Math.abs(threeLineGap(u, s.flight.fromY)) < 0.25) onTheLine++;
        }
      }
    }
    expect(shots).toBeGreaterThan(1000);
    expect(onTheLine / shots).toBeLessThan(0.03);
  });
});
