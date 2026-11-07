// Parte dos testes da simulação. Estão divididos em ficheiros para correrem em paralelo.
import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { BALANCE as B } from './balance.ts';
import { attributeWinRate, betterTeamWinRate, bodyWinRate, fullBonusWinRate, movesWinRate, styleWinRate, summarize, type Summary } from './batch.ts';
import { ARC_SPOTS, COURT_HALF_WIDTH, COURT_LENGTH, CUT_SPOTS, LOW_POST_SPOTS, SPOTS, THREE_CORNER_MAX_U, THREE_CORNER_V, THREE_RADIUS, hoopDistance, isThree, segmentDistance, threeLineGap } from './court.ts';
import { cancelSubstitution, createMatch, pushPower, queueSubstitution, replayMatch, requestTimeout, resolveContacts, setAutoRotation, setTactics, simulateMatch, step, type Body, type MatchState } from './match.ts';
import { makeRng, next, weightedIndex } from './rng.ts';
import { baseChance, freeThrowChance, shotChance } from './shot.ts';
import { DIVISIONS, generateLeagueTeam, generateTeam, teamRating, withBody, withBonus, withMoves, withStyles, withTactics } from './teamgen.ts';
import { ATTRIBUTE_KEYS, MOVES, OFF_BALL_STYLES, ON_BALL_STYLES, gradeOf, validateTeam, type Attributes, type MoveId, type OffBallStyle, type OnBallStyle, type Tactics, NEUTRAL_TACTICS, validateTactics } from './types.ts';
import { away, flat, home } from './test-teams.ts';

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
        // Uma bola perdida a rolar para fora também é «rebound», mas ninguém a disputa.
        if (s.phase === 'rebound' && s.loose && s.loose.chasers.length > 0) {
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

  it('depois de bater no aro, a bola umas vezes sobe e outras cai logo', { tags: ['slow'] }, () => {
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

  it('quem ganha o ressalto só fica com a bola quando chega ao pé dela, e quem afunda chega ao aro', { tags: ['slow'] }, () => {
    let rebounds = 0;
    let close = 0;
    let dunks = 0;
    let atRim = 0;
    let layups = 0;
    let layupsAtRim = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = createMatch(home, away, seed);
      let seen = 0;
      while (s.phase !== 'end') {
        step(s);
        for (; seen < s.events.length; seen++) {
          const e = s.events[seen]!;
          if (e.type !== 'rebound' && e.type !== 'made') continue;
          const b = s.bodies.find(body => body.team === e.team && body.player.name === e.player)!;
          if (e.type === 'rebound') {
            rebounds++;
            // Até onde os braços chegam: o alcance de um jogador do nível mais alto, com folga.
            if (Math.hypot(b.x - s.ball.x, b.y - s.ball.y) <= B.reboundCatchDistance + (B.heightByLevel[2]! - B.referenceHeight) * B.reachPerCm + 0.1) close++;
          } else {
            const shot = s.events.slice(0, seen).reverse().find(x => x.type === 'shot');
            const hoopX = (e.team === 0) !== e.period >= 3 ? 26.425 : 1.575;
            if (shot?.dunk) {
              dunks++;
              if (Math.hypot(b.x - hoopX, b.y) <= 0.9) atRim++;
            } else if (shot?.layup) {
              layups++;
              if (Math.hypot(b.x - hoopX, b.y) <= 1.2) layupsAtRim++;
            }
          }
        }
      }
    }
    expect(rebounds).toBeGreaterThan(400);
    expect(close / rebounds).toBeGreaterThan(0.95);
    expect(dunks).toBeGreaterThan(100);
    expect(atRim / dunks).toBeGreaterThan(0.9);
    // O lay-up também se acaba junto ao aro, com a bola levada na mão.
    expect(layups).toBeGreaterThan(50);
    expect(layupsAtRim / layups).toBeGreaterThan(0.9);
  });

  it('a bola nunca sai para fora do campo depois de um desarme', { tags: ['slow'] }, () => {
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

  it('quase ninguém lança com os pés em cima da linha', { tags: ['slow'] }, () => {
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
