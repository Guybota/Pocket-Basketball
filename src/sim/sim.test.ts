import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { attributeWinRate, betterTeamWinRate, bodyWinRate, fullBonusWinRate, movesWinRate, styleWinRate, summarize, type Summary } from './batch.ts';
import { THREE_RADIUS, hoopDistance, isThree, segmentDistance } from './court.ts';
import { cancelSubstitution, createMatch, queueSubstitution, replayMatch, requestTimeout, setAutoRotation, setTactics, simulateMatch, step, type MatchState } from './match.ts';
import { makeRng, next, weightedIndex } from './rng.ts';
import { baseChance, freeThrowChance, shotChance } from './shot.ts';
import { DIVISIONS, generateLeagueTeam, generateTeam, teamRating, withBody, withMoves, withStyles, withTactics } from './teamgen.ts';
import { ATTRIBUTE_KEYS, MOVES, OFF_BALL_STYLES, ON_BALL_STYLES, gradeOf, validateTeam, type Attributes, type MoveId, type OffBallStyle, type OnBallStyle, type Tactics } from './types.ts';

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
    const short = { ...home.roster[0]!, heightCm: 90 };
    expect(() => validateTeam({ ...home, roster: [short, ...home.roster.slice(1)] })).toThrow();
    const light = { ...home.roster[0]!, weightKg: Number.NaN };
    expect(() => validateTeam({ ...home, roster: [light, ...home.roster.slice(1)] })).toThrow();
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
    expect(isThree(1.3, 6.8)).toBe(true);
    expect(isThree(1.3, 6.4)).toBe(false);
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

  it('a cada passo, os jogadores estão perto do campo e a bola tem um só dono', () => {
    const s = createMatch(home, away, 77);
    const problems: string[] = [];
    while (s.phase !== 'end') {
      step(s);
      for (const team of s.court) {
        for (const b of team) {
          if (b.x < -0.5 || b.x > 28.5 || Math.abs(b.y) > 8.5) problems.push(`${s.tick}: ${b.player.name} fora do campo`);
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
        expect(player.weightKg / ((player.heightCm / 100) * (player.heightCm / 100))).toBeGreaterThan(17);
        expect(player.weightKg / ((player.heightCm / 100) * (player.heightCm / 100))).toBeLessThan(36);
      }
    }
    expect(postes).toBeGreaterThan(bases + 100 * 20);
  });

  it('a altura ajuda sem decidir tudo', () => {
    const rate = bodyWinRate(10, 0, 500);
    expect(rate).toBeGreaterThan(0.53);
    expect(rate).toBeLessThan(0.75);
  });

  it('o peso sem físico não compensa por si só', () => {
    const rate = bodyWinRate(0, 15, 500);
    expect(rate).toBeGreaterThan(0.3);
    expect(rate).toBeLessThan(0.62);
  });

  it('uma equipa mais alta ganha mais ressaltos', () => {
    let tall = 0;
    let base = 0;
    for (let i = 0; i < 100; i++) {
      const team = generateTeam(i, 'A', 55);
      const s = simulateMatch(withBody(team, 12, 0), team, i + 1);
      tall += s.lines[0].offensiveRebounds + s.lines[0].defensiveRebounds;
      base += s.lines[1].offensiveRebounds + s.lines[1].defensiveRebounds;
    }
    expect(tall).toBeGreaterThan(base);
  });

  it('a classificação da equipa reflete o nível pedido', () => {
    expect(teamRating(generateTeam(1, 'A', 70))).toBeGreaterThan(teamRating(generateTeam(1, 'A', 40)));
  });
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
