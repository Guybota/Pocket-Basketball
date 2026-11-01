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


describe('decisões do treinador', () => {
  const start = (seed = 1): MatchState => createMatch(home, away, seed, [true, false]);
  const runUntil = (s: MatchState, done: () => boolean): void => {
    for (let i = 0; i < 40000 && !done() && s.phase !== 'end'; i++) step(s);
  };

  it('o desconto para o relógio, junta a equipa e gasta um dos descontos', () => {
    const s = start();
    runUntil(s, () => s.phase === 'live' && s.offense === 0);
    expect(requestTimeout(s, 0)).toBe(true);
    step(s);
    expect(s.phase).toBe('timeout');
    expect(s.timeoutsLeft[0]).toBe(1);
    const clock = s.clock;
    runUntil(s, () => s.phase === 'live');
    expect(s.clock).toBe(clock);
    expect(s.events.some(e => e.type === 'timeout')).toBe(true);
  });

  it('não dá para pedir mais descontos do que os permitidos por parte', () => {
    const s = start();
    for (let i = 0; i < 2; i++) {
      runUntil(s, () => s.phase === 'live' && s.offense === 0 && s.period === 1);
      expect(requestTimeout(s, 0)).toBe(true);
      expect(requestTimeout(s, 0)).toBe(false);
      runUntil(s, () => s.phase === 'timeout');
      runUntil(s, () => s.phase === 'live');
    }
    expect(s.timeoutsLeft[0]).toBe(0);
    expect(requestTimeout(s, 0)).toBe(false);
  });

  it('os descontos voltam na segunda parte', () => {
    const s = start();
    runUntil(s, () => s.period === 3);
    expect(s.timeoutsLeft).toEqual([2, 2]);
  });

  it('a troca entra na bola parada seguinte e não antes', () => {
    const s = start();
    runUntil(s, () => s.phase === 'live');
    const incoming = s.bodies.findIndex(b => b.team === 0 && b.slot === -1);
    const name = s.bodies[incoming]!.player.name;
    expect(queueSubstitution(s, 0, 2, incoming)).toBe(true);
    expect(s.court[0][2]!.player.name).not.toBe(name);
    runUntil(s, () => s.court[0].some(b => b.player.name === name));
    expect(s.court[0][2]!.player.name).toBe(name);
    expect(new Set(s.court[0]).size).toBe(5);
  });

  it('recusa trocas impossíveis', () => {
    const s = start();
    const onCourt = s.bodies.indexOf(s.court[0][0]!);
    const rival = s.bodies.findIndex(b => b.team === 1 && b.slot === -1);
    const benchIndex = s.bodies.findIndex(b => b.team === 0 && b.slot === -1);
    expect(queueSubstitution(s, 0, 1, onCourt)).toBe(false);
    expect(queueSubstitution(s, 0, 1, rival)).toBe(false);
    expect(queueSubstitution(s, 0, 7, benchIndex)).toBe(false);
    expect(queueSubstitution(s, 0, 1, 999)).toBe(false);
    expect(s.pendingSubs).toEqual([]);
  });

  it('uma troca cancelada não acontece', () => {
    const s = start();
    runUntil(s, () => s.phase === 'live');
    const incoming = s.bodies.findIndex(b => b.team === 0 && b.slot === -1);
    queueSubstitution(s, 0, 2, incoming);
    cancelSubstitution(s, 0, 2);
    expect(s.pendingSubs).toEqual([]);
  });

  it('em rotação manual, a simulação não troca ninguém, salvo por faltas', () => {
    const s = start();
    setAutoRotation(s, 0, false);
    const names = s.court[0].map(b => b.player.name);
    while (s.phase !== 'end') {
      step(s);
      s.court[0].forEach((b, slot) => {
        if (b.player.name !== names[slot]) {
          expect(s.bodies.find(x => x.team === 0 && x.player.name === names[slot])!.line.fouls).toBeGreaterThanOrEqual(5);
          names[slot] = b.player.name;
        }
      });
    }
  });

  it('com semente, equipas e comandos, o jogo reproduz-se exatamente', () => {
    const s = start(5);
    runUntil(s, () => s.phase === 'live' && s.offense === 0);
    requestTimeout(s, 0);
    runUntil(s, () => s.tick > 500);
    queueSubstitution(s, 0, 3, s.bodies.findIndex(b => b.team === 0 && b.slot === -1));
    runUntil(s, () => s.tick > 2000);
    setAutoRotation(s, 0, true);
    while (s.phase !== 'end') step(s);
    const replay = replayMatch(home, away, 5, [true, false], s.commands);
    expect(replay.events).toEqual(s.events);
    expect(replay.score).toEqual(s.score);
  });

  it('a equipa da simulação pede descontos, e a do jogador nunca sozinha', () => {
    let rival = 0;
    let player = 0;
    for (let i = 0; i < 100; i++) {
      const s = simulateMatch(generateTeam(i, 'A', 55), generateTeam(i + 300, 'B', 55), i + 1, [true, false]);
      for (const e of s.events) {
        if (e.type === 'timeout' && e.team === 0) player++;
        if (e.type === 'timeout' && e.team === 1) rival++;
      }
    }
    expect(player).toBe(0);
    expect(rival).toBeGreaterThan(0);
  });

  it('a violação de posse acontece, mas é rara, e passa a bola ao adversário', () => {
    let violations = 0;
    for (let i = 0; i < 200; i++) {
      const s = simulateMatch(generateTeam(i, 'A', 55), generateTeam(i + 300, 'B', 55), i + 1);
      const events = s.events;
      events.forEach(e => {
        if (e.type === 'shotClockViolation') violations++;
      });
    }
    expect(violations).toBeGreaterThan(0);
    expect(violations / 200).toBeLessThan(4);
  });

  it('cada fim de período tem o seu evento, para tocar o buzzer', () => {
    const s = simulateMatch(home, away, 1);
    expect(s.events.filter(e => e.type === 'periodEnd').length).toBe(s.period);
  });
});

describe('trajetória da bola', () => {
  it('um cesto acaba no centro do aro e um falhanço acaba no ferro', () => {
    const offsets = { made: [] as number[], missed: [] as number[] };
    for (let seed = 1; seed <= 15; seed++) {
      const s = createMatch(home, away, seed);
      let lastFlight: MatchState['flight'] = null;
      let last = { x: 0, y: 0, z: 0 };
      while (s.phase !== 'end') {
        step(s);
        if (s.flight?.kind === 'shot' && !s.flight.blockedBy) {
          lastFlight = s.flight;
          last = { ...s.ball };
        } else if (lastFlight?.kind === 'shot') {
          const hoopX = s.period >= 3 === (lastFlight.shooter.team === 0) ? 1.575 : 26.425;
          const off = Math.sqrt((last.x - hoopX) * (last.x - hoopX) + last.y * last.y);
          (lastFlight.made ? offsets.made : offsets.missed).push(off);
          lastFlight = null;
        }
      }
    }
    expect(offsets.made.length).toBeGreaterThan(50);
    expect(offsets.missed.length).toBeGreaterThan(50);
    // A última posição guardada é a de um passo antes do fim, daí a margem.
    expect(Math.max(...offsets.made)).toBeLessThan(0.9);
    const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean(offsets.made)).toBeLessThan(mean(offsets.missed));
  });
});

describe('táticas', () => {
  const totals = (tactics: Partial<Tactics>): { threes: number; twos: number; possessions: number; steals: number; fouls: number; fatigue: number } => {
    const out = { threes: 0, twos: 0, possessions: 0, steals: 0, fouls: 0, fatigue: 0 };
    for (let i = 0; i < 100; i++) {
      const team = withTactics(generateTeam(i, 'A', 55), { pressure: 0, spacing: 0, pace: 0, ...tactics });
      const s = simulateMatch(team, generateTeam(i + 500, 'B', 55), i + 1);
      out.threes += s.lines[0].threeAttempts;
      out.twos += s.lines[0].twoAttempts;
      out.possessions += s.lines[0].possessions;
      out.steals += s.lines[0].steals;
      out.fouls += s.lines[0].fouls;
      out.fatigue += s.bodies.filter(b => b.team === 0).reduce((sum, b) => sum + b.fatigue, 0);
    }
    return out;
  };
  const share = (t: { threes: number; twos: number }): number => t.threes / (t.threes + t.twos);

  it('abrir o campo dá mais lançamentos de 3', () => {
    expect(share(totals({ spacing: 1 }))).toBeGreaterThan(share(totals({ spacing: -1 })) + 0.05);
  });

  it('o ritmo rápido dá mais posses de bola', () => {
    expect(totals({ pace: 1 }).possessions).toBeGreaterThan(totals({ pace: -1 }).possessions);
  });

  it('a pressão rouba mais bolas, faz mais faltas e cansa mais', () => {
    const high = totals({ pressure: 1 });
    const low = totals({ pressure: -1 });
    expect(high.steals).toBeGreaterThan(low.steals);
    expect(high.fouls).toBeGreaterThan(low.fouls);
    expect(high.fatigue).toBeGreaterThan(low.fatigue);
  });

  it('nenhuma tática ganha sempre', () => {
    const rate = (tactics: Tactics): number => {
      let wins = 0;
      for (let i = 0; i < 200; i++) {
        const base = withTactics(generateTeam(i, 'A', 55), { pressure: 0, spacing: 0, pace: 0 });
        const s = i % 2 === 0
          ? simulateMatch(withTactics(base, tactics), base, i + 1)
          : simulateMatch(base, withTactics(base, tactics), i + 1);
        if (s.score[i % 2 === 0 ? 0 : 1] > s.score[i % 2 === 0 ? 1 : 0]) wins++;
      }
      return wins / 200;
    };
    for (const tactics of [{ pressure: 1, spacing: 0, pace: 0 }, { pressure: -1, spacing: 0, pace: 0 }, { pressure: 0, spacing: 1, pace: 0 }, { pressure: 0, spacing: -1, pace: 0 }, { pressure: 0, spacing: 0, pace: 1 }, { pressure: 0, spacing: 0, pace: -1 }]) {
      const value = rate(tactics);
      expect(value, JSON.stringify(tactics)).toBeGreaterThan(0.3);
      expect(value, JSON.stringify(tactics)).toBeLessThan(0.7);
    }
  });

  it('um alvo marca menos pontos, sem isso decidir o jogo', () => {
    const N = 300;
    const best = (team: ReturnType<typeof generateTeam>): number[] =>
      [...team.roster.keys()].sort((x, y) => team.roster[y]!.attributes.shooting - team.roster[x]!.attributes.shooting).slice(0, 2);
    const run = (focus: boolean): { wins: number; targetPoints: number } => {
      let wins = 0;
      let targetPoints = 0;
      for (let i = 0; i < N; i++) {
        const a = generateTeam(i * 2 + 1, 'A', 55);
        const b = generateTeam(i * 2 + 2, 'B', 55);
        const targets = best(b);
        const s = simulateMatch({ ...a, tactics: { ...NEUTRAL_TACTICS, focus: focus ? targets : [] } }, b, i + 1);
        if (s.score[0] > s.score[1]) wins++;
        for (const body of s.bodies) if (body.team === 1 && targets.includes(b.roster.indexOf(body.player))) targetPoints += body.line.points;
      }
      return { wins, targetPoints };
    };
    const plain = run(false);
    const marked = run(true);
    expect(marked.targetPoints).toBeLessThan(plain.targetPoints * 0.93);
    expect(Math.abs(marked.wins - plain.wins) / N).toBeLessThan(0.06);
  });

  it('recusa mais de dois alvos, alvos repetidos e lugares que não existem', () => {
    const bad = (focus: number[]): void => expect(() => validateTactics({ ...NEUTRAL_TACTICS, focus }, 'x')).toThrow();
    bad([0, 1, 2]);
    bad([3, 3]);
    bad([15]);
    bad([-1]);
    expect(() => validateTactics({ ...NEUTRAL_TACTICS, focus: [0, 14] }, 'x')).not.toThrow();
  });

  it('recusa táticas fora dos limites e reproduz as que mudam a meio', () => {
    const s = createMatch(home, away, 3, [true, false]);
    expect(() => setTactics(s, 0, { pressure: 2, spacing: 0, pace: 0 })).toThrow();
    expect(() => validateTeam(withTactics(home, { pressure: 0, spacing: Number.NaN, pace: 0 }))).toThrow();
    for (let i = 0; i < 300; i++) step(s);
    setTactics(s, 0, { pressure: 1, spacing: -1, pace: 1 });
    while (s.phase !== 'end') step(s);
    expect(replayMatch(home, away, 3, [true, false], s.commands).events).toEqual(s.events);
  });

  it('um jogador cansado começa o jogo cansado', () => {
    const tired = { ...home, roster: home.roster.map(p => ({ ...p, fatigue: 0.5 })) };
    expect(createMatch(tired, away, 1).bodies[0]!.fatigue).toBe(0.5);
  });
});
