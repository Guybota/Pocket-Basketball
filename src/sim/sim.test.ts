import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { attributeWinRate, betterTeamWinRate, fullBonusWinRate, summarize, type Summary } from './batch.ts';
import { THREE_RADIUS, hoopDistance, isThree, segmentDistance } from './court.ts';
import { createMatch, simulateMatch, step } from './match.ts';
import { makeRng, next, weightedIndex } from './rng.ts';
import { baseChance, freeThrowChance, shotChance } from './shot.ts';
import { DIVISIONS, generateLeagueTeam, generateTeam, teamRating } from './teamgen.ts';
import { ATTRIBUTE_KEYS, gradeOf, validateTeam, type Attributes } from './types.ts';

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
    expect(text).not.toMatch(/Math\.(random|sin|cos|tan|asin|acos|atan|atan2|pow|exp|log|log2|log10|hypot|cbrt)\b|\bDate\b|\*\*/);
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

  it('a classificação da equipa reflete o nível pedido', () => {
    expect(teamRating(generateTeam(1, 'A', 70))).toBeGreaterThan(teamRating(generateTeam(1, 'A', 40)));
  });
});
