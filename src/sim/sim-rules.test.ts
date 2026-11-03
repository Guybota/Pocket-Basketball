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


describe('gerador aleatório', () => {
  it('repete a mesma sequência para a mesma semente', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const first = [next(a), next(a), next(a)];
    expect([next(b), next(b), next(b)]).toEqual(first);
    expect(first.every(value => value >= 0 && value < 1)).toBe(true);
  });

  it('nunca escolhe uma opção de peso zero', () => {
    const rng = makeRng(7);
    for (let i = 0; i < 500; i++) expect(weightedIndex(rng, [0, 1, 0, 2])).not.toBe(0);
  });
});

describe('regras da simulação', () => {
  const dir = new URL('./', import.meta.url);
  const sources = readdirSync(dir)
    .filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .map(file => ({
      file,
      text: readFileSync(new URL(file, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''),
    }));

  it.each(sources.map(s => [s.file, s.text]))('%s não usa funções proibidas', (_file, text) => {
    expect(text).not.toMatch(/Math\.(random|sin|cos|tan|asin|acos|atan|atan2|pow|exp|log|log2|log10|hypot|cbrt)\b|\b(Date|document|window|process)\b|\*\*/);
  });

  it.each(sources.map(s => [s.file, s.text]))('%s só importa de src/sim', (_file, text) => {
    for (const match of text.matchAll(/from\s+'([^']+)'/g)) expect(match[1]).toMatch(/^\.\/[\w.-]+\.ts$/);
  });
});

describe('determinismo', () => {
  it('a mesma semente dá exatamente o mesmo jogo', () => {
    const a = simulateMatch(home, away, 123);
    const b = simulateMatch(home, away, 123);
    expect(b.events).toEqual(a.events);
    expect(b.score).toEqual(a.score);
    expect(b.tick).toBe(a.tick);
  });

  it('sementes diferentes dão jogos diferentes', () => {
    expect(simulateMatch(home, away, 1).events).not.toEqual(simulateMatch(home, away, 2).events);
  });

  it('as equipas sobrevivem a JSON sem mudar o jogo', () => {
    const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    expect(simulateMatch(copy(home), copy(away), 9).events).toEqual(simulateMatch(home, away, 9).events);
  });

  it('não altera as equipas recebidas', () => {
    const before = JSON.stringify([home, away]);
    simulateMatch(home, away, 5);
    expect(JSON.stringify([home, away])).toBe(before);
  });
});

describe('validação das equipas', () => {
  it('rejeita planteis pequenos, grandes e atributos inválidos', () => {
    expect(() => validateTeam({ ...home, roster: home.roster.slice(0, 4) })).toThrow();
    expect(() => validateTeam({ ...home, roster: [...home.roster, ...home.roster] })).toThrow();
    const broken = { ...home.roster[0]!, attributes: { ...flat(50), speed: Number.NaN } };
    expect(() => validateTeam({ ...home, roster: [broken, ...home.roster.slice(1)] })).toThrow();
    expect(() => createMatch({ ...home, roster: [] }, away, 1)).toThrow();
    const short = { ...home.roster[0]!, height: 4 as never };
    expect(() => validateTeam({ ...home, roster: [short, ...home.roster.slice(1)] })).toThrow();
    const cheat = { ...home.roster[0]!, moves: ['voar' as MoveId] };
    expect(() => validateTeam({ ...home, roster: [cheat, ...home.roster.slice(1)] })).toThrow();
    const lost = { ...home.roster[0]!, offBall: 'perdido' as OffBallStyle };
    expect(() => validateTeam({ ...home, roster: [lost, ...home.roster.slice(1)] })).toThrow();
    const greedy = { ...home.roster[0]!, onBall: 'guloso' as OnBallStyle };
    expect(() => validateTeam({ ...home, roster: [greedy, ...home.roster.slice(1)] })).toThrow();
  });

  it('joga até ao fim só com cinco jogadores, mesmo sem suplentes', () => {
    const small = { ...home, roster: home.roster.slice(0, 5) };
    const s = simulateMatch(small, { ...away, roster: away.roster.slice(0, 5) }, 3);
    expect(s.phase).toBe('end');
  });
});

describe('fórmulas', () => {
  it('converte valores em notas nos limites certos', () => {
    expect([0, 16, 17, 33, 34, 49, 50, 66, 67, 83, 84, 100].map(gradeOf)).toEqual(
      ['E', 'E', 'D', 'D', 'C', 'C', 'B', 'B', 'A', 'A', 'S', 'S'],
    );
  });

  it('reconhece a linha de 3 pontos, incluindo os cantos', () => {
    expect(isThree(1.575 + THREE_RADIUS + 0.1, 0)).toBe(true);
    expect(isThree(1.575 + THREE_RADIUS - 0.1, 0)).toBe(false);
    expect(isThree(1.3, THREE_CORNER_V + 0.1)).toBe(true);
    expect(isThree(1.3, THREE_CORNER_V - 0.1)).toBe(false);
    expect(hoopDistance(1.575, 0)).toBe(0);
  });

  it('mede a distância a um segmento', () => {
    expect(segmentDistance(1, 1, 0, 0, 2, 0)).toBe(1);
    expect(segmentDistance(5, 0, 0, 0, 2, 0)).toBe(3);
    expect(segmentDistance(3, 4, 0, 0, 0, 0)).toBe(5);
  });

  it('um lançamento é mais fácil de perto, sem pressão e com mais talento', () => {
    expect(baseChance(1, false)).toBeGreaterThan(baseChance(5, false));
    expect(baseChance(5, false)).toBeGreaterThan(baseChance(7, true));
    const context = { distanceToHoop: 7, three: true, pressure: 0, fatigue: 0, clutch: false, away: false };
    expect(shotChance(flat(50), context)).toBeGreaterThan(shotChance(flat(50), { ...context, pressure: 1 }));
    expect(shotChance(flat(50), context)).toBeGreaterThan(shotChance(flat(50), { ...context, fatigue: 1 }));
    expect(shotChance(flat(80), context)).toBeGreaterThan(shotChance(flat(50), context));
  });

  it('as probabilidades ficam sempre entre 0 e 1', () => {
    for (const value of [0, 100]) {
      const context = { distanceToHoop: value === 0 ? 20 : 0.5, three: value === 0, pressure: value === 0 ? 1 : 0, fatigue: 1, clutch: true, away: true };
      const chance = shotChance(flat(value), context);
      expect(chance).toBeGreaterThan(0);
      expect(chance).toBeLessThan(1);
      expect(freeThrowChance(flat(value))).toBeGreaterThan(0);
      expect(freeThrowChance(flat(value))).toBeLessThan(1);
    }
  });
});

describe('coerência de um jogo', () => {
  const seeds = Array.from({ length: 40 }, (_, i) => i + 1);

  it.each(seeds)('semente %i', seed => {
    const s = simulateMatch(generateTeam(seed * 2, 'A', 55), generateTeam(seed * 2 + 1, 'B', 55), seed);
    expect(s.score[0]).not.toBe(s.score[1]);
    for (const team of [0, 1] as const) {
      const line = s.lines[team];
      const players = s.bodies.filter(b => b.team === team);
      expect(line.twoMade * 2 + line.threeMade * 3 + line.freeThrowsMade).toBe(s.score[team]);
      expect(players.reduce((sum, b) => sum + b.line.points, 0)).toBe(s.score[team]);
      expect(players.reduce((sum, b) => sum + b.line.assists, 0)).toBe(line.assists);
      expect(players.reduce((sum, b) => sum + b.line.fouls, 0)).toBe(line.fouls);
      expect(line.twoMade).toBeLessThanOrEqual(line.twoAttempts);
      expect(line.threeMade).toBeLessThanOrEqual(line.threeAttempts);
      expect(line.freeThrowsMade).toBeLessThanOrEqual(line.freeThrowAttempts);
      expect(s.court[team]).toHaveLength(5);
      expect(new Set(s.court[team]).size).toBe(5);
    }
    const lastEvent = s.events[s.events.length - 1]!;
    expect(lastEvent.type).toBe('end');
    expect(lastEvent.team).toBe(s.score[0] > s.score[1] ? 0 : 1);
  });

  it('a bola nunca sai disparada: fica sempre perto do campo e abaixo dos 9 m', () => {
    // Uma bola perdida que ficava guardada depois da reposição punha a bola a voar no lance livre seguinte.
    const problems: string[] = [];
    for (let i = 0; i < 30; i++) {
      const a = generateTeam(i, 'A', 30 + (i % 5) * 12);
      const b = generateTeam(i + 900, 'B', 30 + (i % 3) * 15);
      const home = i % 3 === 0 ? withTactics(a, { pressure: 1, spacing: 1, pace: 1, defense: 'zone' }) : a;
      const s = createMatch(home, b, i + 7);
      while (s.phase !== 'end') {
        step(s);
        const { x, y, z } = s.ball;
        if (!(x > -4 && x < 32 && Math.abs(y) < 12 && z < 9)) {
          problems.push(`jogo ${i}, passo ${s.tick}, fase ${s.phase}: bola em ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`);
          break;
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('a cada passo, os jogadores estão perto do campo e a bola tem um só dono', () => {
    const s = createMatch(home, away, 77);
    const problems: string[] = [];
    let graceUntil = -1;
    while (s.phase !== 'end') {
      step(s);
      // Quem repõe fica até um metro fora da linha. Ao intervalo saem todos para o balneário. Com a bola em jogo, ninguém está fora das linhas.
      const leaving = s.phase === 'break' && s.period === 2;
      // Quem acabou de repor ainda está a deslizar para dentro durante uns passos.
      if (s.flight?.kind === 'pass' && s.flight.restart) graceUntil = s.tick + 6;
      const playing = s.tick >= graceUntil && (s.phase === 'live' || s.phase === 'pass' || s.phase === 'shot' || s.phase === 'rebound');
      for (const team of s.court) {
        for (const b of team) {
          if (!leaving && (b.x < -1 || b.x > 29 || Math.abs(b.y) > 8.5)) problems.push(`${s.tick}: ${b.player.name} fora do campo`);
          if (playing && (b.x < -0.2 || b.x > 28.2 || Math.abs(b.y) > 7.7)) problems.push(`${s.tick}: ${b.player.name} fora das linhas com a bola em jogo`);
        }
      }
      const expectedHolder = s.phase === 'live' ? s.holder?.team === s.offense : s.holder === null;
      if (!expectedHolder) problems.push(`${s.tick}: dono da bola errado na fase ${s.phase}`);
      if (s.clock < 0) problems.push(`${s.tick}: relógio negativo`);
    }
    expect(problems).toEqual([]);
  });
});

// Os critérios da Fase 0, em docs/02-plano-desenvolvimento.md.
