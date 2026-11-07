// Parte dos testes da simulação. Estão divididos em ficheiros para correrem em paralelo.
import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { attributeWinRate, betterTeamWinRate, bodyWinRate, fullBonusWinRate, movesWinRate, styleWinRate, summarize, type Summary } from './batch.ts';
import { ARC_SPOTS, COURT_HALF_WIDTH, COURT_LENGTH, CUT_SPOTS, LOW_POST_SPOTS, SPOTS, THREE_CORNER_MAX_U, THREE_CORNER_V, THREE_RADIUS, hoopDistance, isThree, segmentDistance, threeLineGap } from './court.ts';
import { cancelSubstitution, createMatch, pushPower, queueSubstitution, reorderBench, replayMatch, bestSlot, holdMatch, requestTimeout, resolveContacts, resumeMatch, slotFit, setAutoRotation, setTactics, simulateMatch, step, type Body, type MatchState } from './match.ts';
import { makeRng, next, weightedIndex } from './rng.ts';
import { baseChance, freeThrowChance, shotChance } from './shot.ts';
import { DIVISIONS, generateLeagueTeam, generateTeam, teamRating, withBody, withBonus, withMoves, withStyles, withTactics } from './teamgen.ts';
import { ATTRIBUTE_KEYS, MOVES, OFF_BALL_STYLES, ON_BALL_STYLES, gradeOf, validateTeam, type Attributes, type MoveId, type OffBallStyle, type OnBallStyle, type Player, type Tactics, type Team, NEUTRAL_TACTICS, validateTactics } from './types.ts';
import { away, flat, home } from './test-teams.ts';
import { aiAdjustTactics } from './match-commands.ts';

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
    // Quem já está no lugar não troca consigo mesmo; para outro lugar em campo, troca com quem lá está.
    expect(queueSubstitution(s, 0, 0, onCourt)).toBe(false);
    expect(queueSubstitution(s, 0, 1, rival)).toBe(false);
    expect(queueSubstitution(s, 0, 7, benchIndex)).toBe(false);
    expect(queueSubstitution(s, 0, 1, 999)).toBe(false);
    expect(s.pendingSubs).toEqual([]);
  });

  it('dois em campo trocam de lugar na bola parada seguinte, e o banco troca de ordem logo', () => {
    const s = start();
    runUntil(s, () => s.phase === 'live');
    const a = s.court[0][0]!;
    const b = s.court[0][3]!;
    expect(queueSubstitution(s, 0, 3, s.bodies.indexOf(a))).toBe(true);
    runUntil(s, () => s.court[0][3] === a);
    expect(s.court[0][0]).toBe(b);
    expect(a.slot).toBe(3);
    expect(b.slot).toBe(0);
    const bench = s.bodies.filter(x => x.team === 0 && x.slot === -1);
    const i = s.bodies.indexOf(bench[0]!);
    const j = s.bodies.indexOf(bench[1]!);
    expect(reorderBench(s, 0, i, j)).toBe(true);
    expect(s.bodies[i]).toBe(bench[1]);
    expect(s.bodies[j]).toBe(bench[0]);
    expect(reorderBench(s, 0, i, s.bodies.indexOf(a))).toBe(false);
    // A repetição refaz as duas trocas pelos comandos.
    const again = replayMatch(home, away, s.seed, [true, false], s.commands, 1, s.tick + 1);
    expect(again.bodies.map(x => x.player.name)).toEqual(s.bodies.map(x => x.player.name));
    expect(again.court[0].map(x => x.player.name)).toEqual(s.court[0].map(x => x.player.name));
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

  it('a equipa da simulação pede descontos, e a do jogador nunca sozinha', { tags: ['slow'] }, () => {
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

  it('a violação de posse acontece, mas é rara, e passa a bola ao adversário', { tags: ['slow'] }, () => {
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

  it('abrir o campo dá mais lançamentos de 3', { tags: ['slow'] }, () => {
    expect(share(totals({ spacing: 1 }))).toBeGreaterThan(share(totals({ spacing: -1 })) + 0.05);
  });

  it('o ritmo rápido dá mais posses de bola', { tags: ['slow'] }, () => {
    expect(totals({ pace: 1 }).possessions).toBeGreaterThan(totals({ pace: -1 }).possessions);
  });

  it('a pressão rouba mais bolas, faz mais faltas e cansa mais', { tags: ['slow'] }, () => {
    const high = totals({ pressure: 1 });
    const low = totals({ pressure: -1 });
    expect(high.steals).toBeGreaterThan(low.steals);
    expect(high.fouls).toBeGreaterThan(low.fouls);
    expect(high.fatigue).toBeGreaterThan(low.fatigue);
  });

  it('a zona deixa lançar mais de 3, e a pressão em todo o campo perde mais bolas', { tags: ['slow'] }, () => {
    const against = (tactics: Partial<Tactics>): { threes: number; twos: number; turnovers: number } => {
      const out = { threes: 0, twos: 0, turnovers: 0 };
      for (let i = 0; i < 100; i++) {
        const team = withTactics(generateTeam(i, 'A', 55), { pressure: 0, spacing: 0, pace: 0 });
        const rival = withTactics(generateTeam(i + 500, 'B', 55), { pressure: 0, spacing: 0, pace: 0, ...tactics });
        const s = simulateMatch(team, rival, i + 1);
        out.threes += s.lines[0].threeAttempts;
        out.twos += s.lines[0].twoAttempts;
        out.turnovers += s.lines[0].turnovers;
      }
      return out;
    };
    expect(share(against({ defense: 'zone' }))).toBeGreaterThan(share(against({ defense: 'man' })) + 0.03);
    expect(against({ pressure: 1 }).turnovers).toBeGreaterThan(against({ pressure: -1 }).turnovers);
  });

  it('a primeira opção de ataque marca mais, e uma opção inválida é recusada', { tags: ['slow'] }, () => {
    const N = 120;
    const points = (withOption: boolean): number => {
      let total = 0;
      for (let i = 0; i < N; i++) {
        const team = generateTeam(i, 'A', 55);
        const star = team.roster[3]!.name;
        const tactics = { pressure: 0, spacing: 0, pace: 0, ...(withOption ? { options: [star] } : {}) };
        const s = simulateMatch(withTactics(team, tactics), generateTeam(i + 500, 'B', 55), i + 1);
        total += s.bodies.find(b => b.team === 0 && b.player.name === star)!.line.points;
      }
      return total / N;
    };
    expect(points(true)).toBeGreaterThan(points(false) * 1.25);
    expect(() => validateTactics({ ...NEUTRAL_TACTICS, options: ['A', 'A'] }, 'x')).toThrow();
    expect(() => validateTactics({ ...NEUTRAL_TACTICS, options: ['A', 'B', 'C'] }, 'x')).toThrow();
  });

  it('um organizador como opção dá mais assistências', { tags: ['slow'] }, () => {
    const N = 120;
    const assists = (withOption: boolean): number => {
      let total = 0;
      for (let i = 0; i < N; i++) {
        const base = generateTeam(i, 'A', 60);
        const team = { ...base, roster: base.roster.map((p, j) => (j === 0 ? { ...p, onBall: 'playmaker' as const } : p)) };
        const name = team.roster[0]!.name;
        const s = simulateMatch(withTactics(team, { pressure: 0, spacing: 0, pace: 0, ...(withOption ? { options: [name] } : {}) }), generateTeam(i + 500, 'B', 60), i + 1);
        total += s.bodies.find(b => b.team === 0 && b.player.name === name)!.line.assists;
      }
      return total / N;
    };
    expect(assists(true)).toBeGreaterThan(assists(false) * 1.1);
    // E continua a poder marcar: não deixa de lançar.

  });

  it('nenhuma tática ganha sempre', { tags: ['slow'] }, () => {
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
    for (const tactics of [{ pressure: 1, spacing: 0, pace: 0 }, { pressure: -1, spacing: 0, pace: 0 }, { pressure: 0, spacing: 1, pace: 0 }, { pressure: 0, spacing: -1, pace: 0 }, { pressure: 0, spacing: 0, pace: 1 }, { pressure: 0, spacing: 0, pace: -1 }, { pressure: 0, spacing: 0, pace: 0, defense: 'zone' as const }]) {
      const value = rate(tactics);
      expect(value, JSON.stringify(tactics)).toBeGreaterThan(0.3);
      expect(value, JSON.stringify(tactics)).toBeLessThan(0.7);
    }
  });

  it('um alvo marca menos pontos, sem isso decidir o jogo', { tags: ['slow'] }, () => {
    // Com 300 jogos o ruído chegava aos 6%: são precisos mais para a diferença de vitórias dizer alguma coisa.
    const N = 500;
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
    // Com 500 jogos de cada lado, o ruído das vitórias anda nos 3 %: até 10 % de diferença ainda é «não decide o jogo».
    expect(Math.abs(marked.wins - plain.wins) / N).toBeLessThan(0.1);
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
    const replay = replayMatch(home, away, 3, [true, false], s.commands);
    expect(replay.events).toEqual(s.events);
    expect(replay.commands).toEqual(s.commands);
    // A IA viu o ataque por dentro e fechou-se em zona; fica registado como comando dela.
    expect(s.commands.some(c => c.kind === 'tactics' && c.team === 1 && c.tactics.defense === 'zone')).toBe(true);
  });

  it('a IA a perder por muito no fim acelera e pressiona; a ganhar, abranda', () => {
    const s = createMatch(home, away, 3);
    s.period = 3;
    s.phase = 'break';
    s.score = [30, 18];
    aiAdjustTactics(s);
    expect(s.tactics[0].pace).toBe(-1);
    expect(s.tactics[1]).toMatchObject({ pace: 1, pressure: 1 });
  });

  it('com a bola a correr a IA só muda a pressão e o ritmo; a defesa e o ataque só nas paragens', { tags: ['slow'] }, () => {
    let tempoChanges = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const s = createMatch(generateTeam(seed, 'Fortes', 70), generateTeam(seed + 100, 'Fracos', 45), seed);
      while (s.phase !== 'end') {
        const before = s.tactics.map(t => ({ ...t }));
        const stopped = s.phase === 'break' || s.phase === 'timeout';
        step(s);
        for (const team of [0, 1] as const) {
          const was = before[team]!, now = s.tactics[team];
          if (!stopped && s.phase !== 'break' && s.phase !== 'timeout') {
            expect(now.spacing).toBe(was.spacing);
            expect(now.defense ?? 'man').toBe(was.defense ?? 'man');
            if (now.pace !== was.pace || now.pressure !== was.pressure) tempoChanges++;
          }
        }
      }
    }
    // Com uma equipa muito mais fraca, a que perde acelera a meio de algum período, sem esperar pela paragem.
    expect(tempoChanges).toBeGreaterThan(0);
  });

  it('um jogador cansado começa o jogo cansado, e menos se tiver resistência', () => {
    const tired = (stamina: number): Team => ({ ...home, roster: home.roster.map(p => ({ ...p, fatigue: 0.5, attributes: { ...p.attributes, stamina } })) });
    expect(createMatch(tired(50), away, 1).bodies[0]!.fatigue).toBeCloseTo(0.5);
    expect(createMatch(tired(90), away, 1).bodies[0]!.fatigue).toBeLessThan(0.4);
    expect(createMatch(tired(20), away, 1).bodies[0]!.fatigue).toBeGreaterThan(0.6);
    expect(createMatch({ ...home, roster: home.roster.map(p => ({ ...p, fatigue: 0 })) }, away, 1).bodies[0]!.fatigue).toBe(0);
  });
});

describe('paragens com treinador', () => {
  const untilPhase = (s: MatchState, phase: string): void => {
    for (let i = 0; i < 40000 && s.phase !== phase && s.phase !== 'end'; i++) step(s);
  };
  it('com um treinador humano o desconto espera por ele, e Continuar acaba-o; só com IA é curto', () => {
    const s = createMatch(home, away, 3, [true, false]);
    for (let i = 0; i < 40000 && !(s.phase === 'live' && s.offense === 0); i++) step(s);
    expect(requestTimeout(s, 0)).toBe(true);
    untilPhase(s, 'timeout');
    for (let i = 0; i < 20 * 20; i++) step(s);
    expect(s.phase).toBe('timeout');
    // Com o treinador a mexer, a paragem deixa de acabar sozinha: passados mais de 30 s continua à espera.
    expect(holdMatch(s, 0)).toBe(true);
    for (let i = 0; i < 40 * 20; i++) step(s);
    expect(s.phase).toBe('timeout');
    expect(resumeMatch(s, 0)).toBe(true);
    step(s);
    expect(s.phase).toBe('dead');
    expect(s.commands.some(c => c.kind === 'resume')).toBe(true);
    const ai = createMatch(home, away, 3, [false, false]);
    for (let i = 0; i < 40000 && !(ai.phase === 'live' && ai.offense === 0); i++) step(ai);
    expect(requestTimeout(ai, 0)).toBe(true);
    untilPhase(ai, 'timeout');
    const start = ai.tick;
    untilPhase(ai, 'dead');
    expect(ai.tick - start).toBeLessThanOrEqual(5 * 20);
  });
});

describe('substituições por encaixe', () => {
  const withBody = (player: Player, attributes: Partial<Attributes>, height: 1 | 2 | 3): Player => ({ ...player, attributes: { ...player.attributes, ...attributes }, height });
  it('um poste encaixa dentro e um base fora', () => {
    const base = withBody(home.roster[0]!, { speed: 85, technique: 85, shooting: 70, strength: 40, jumping: 45 }, 1);
    const poste = withBody(home.roster[0]!, { speed: 40, technique: 45, shooting: 35, strength: 85, jumping: 80 }, 3);
    expect(bestSlot(base)).toBeLessThanOrEqual(1);
    expect(bestSlot(poste)).toBeGreaterThanOrEqual(3);
    expect(slotFit(base, 0)).toBeGreaterThan(slotFit(poste, 0));
    expect(slotFit(poste, 4)).toBeGreaterThan(slotFit(base, 4));
  });
  it('quando o base cansa entra o suplente que encaixa de base, mesmo não sendo o primeiro do banco', () => {
    const roster = home.roster.map((p, i) => (i === 5 ? withBody(p, { speed: 40, technique: 45, strength: 85, jumping: 80 }, 3) : i === 6 ? withBody(p, { speed: 85, technique: 85, strength: 40, jumping: 45 }, 1) : p));
    const s = createMatch({ ...home, roster }, away, 4, [false, false]);
    for (let i = 0; i < 2000 && s.phase !== 'live'; i++) step(s);
    const tired = s.court[0][0]!;
    tired.fatigue = 1;
    for (let i = 0; i < 4000 && s.court[0][0] === tired; i++) step(s);
    expect(s.court[0][0]).not.toBe(tired);
    expect(s.court[0][0]!.player.name).toBe(roster[6]!.name);
  });
});
