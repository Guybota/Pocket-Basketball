import { describe, expect, it } from 'vitest';
import { FREE_WEEK, LEAGUE_SIZE, MOVING_PLACES, SEASON_WEEKS, confidenceChange, moveDivisions, roundRobin, seasonOutcome, standings, weekRound } from './league.ts';

const ids = Array.from({ length: LEAGUE_SIZE }, (_, i) => i);

describe('calendário', () => {
  it('cada clube joga com todos, uma vez em casa e outra fora', () => {
    const rounds = roundRobin(ids, 3);
    expect(rounds).toHaveLength((LEAGUE_SIZE - 1) * 2);
    const seen = new Set<string>();
    for (const round of rounds) {
      const playing = round.flatMap(f => [f.home, f.away]);
      expect(new Set(playing).size).toBe(LEAGUE_SIZE);
      for (const f of round) seen.add(`${f.home}-${f.away}`);
    }
    expect(seen.size).toBe(LEAGUE_SIZE * (LEAGUE_SIZE - 1));
  });

  it('metade dos jogos é em casa, e ninguém joga mais de 3 vezes seguidas no mesmo sítio', () => {
    const rounds = roundRobin(ids, 9);
    for (const id of ids) {
      const atHome = rounds.map(round => round.some(f => f.home === id));
      expect(atHome.filter(Boolean)).toHaveLength(rounds.length / 2);
      let streak = 0;
      atHome.forEach((home, i) => {
        streak = i > 0 && atHome[i - 1] === home ? streak + 1 : 1;
        expect(streak, `clube ${id}, jornada ${i + 1}`).toBeLessThanOrEqual(3);
      });
    }
  });

  it('todas as jornadas cabem nas semanas, com uma semana livre', () => {
    const weeks = Array.from({ length: SEASON_WEEKS }, (_, i) => weekRound(i + 1));
    expect(weeks.filter(round => round === null)).toHaveLength(1);
    expect(weekRound(FREE_WEEK)).toBeNull();
    expect(weeks.filter(round => round !== null)).toEqual(Array.from({ length: (LEAGUE_SIZE - 1) * 2 }, (_, i) => i));
    expect(weekRound(0)).toBeNull();
    expect(weekRound(SEASON_WEEKS + 1)).toBeNull();
  });

  it('o mesmo clube dá o mesmo calendário', () => {
    expect(roundRobin(ids, 5)).toEqual(roundRobin(ids, 5));
  });
});

describe('classificação', () => {
  it('ordena por vitórias e depois pela diferença de pontos', () => {
    const table = standings([1, 2, 3], [[
      { home: 1, away: 2, score: [40, 30] },
    ], [
      { home: 2, away: 3, score: [50, 30] },
    ], [
      { home: 3, away: 1, score: [35, 30] },
    ]]);
    expect(table.map(row => row.wins)).toEqual([1, 1, 1]);
    expect(table.map(row => row.club)).toEqual([2, 1, 3]);
    expect(table[0]).toMatchObject({ played: 2, pointsFor: 80, pointsAgainst: 70, losses: 1 });
  });

  it('um jogo por jogar não conta', () => {
    const table = standings([1, 2], [[{ home: 1, away: 2, score: null }]]);
    expect(table.every(row => row.played === 0)).toBe(true);
  });
});

describe('subidas e descidas', () => {
  it('o campeão e o segundo sobem, e os dois últimos descem', () => {
    expect(seasonOutcome(0, 1, 4)).toBe('champion');
    expect(seasonOutcome(1, 1, 4)).toBe('promoted');
    expect(seasonOutcome(2, 1, 4)).toBe('stayed');
    expect(seasonOutcome(LEAGUE_SIZE - 3, 1, 4)).toBe('stayed');
    expect(seasonOutcome(LEAGUE_SIZE - 2, 1, 4)).toBe('relegated');
  });

  it('não se desce da última divisão nem se sobe da primeira', () => {
    expect(seasonOutcome(LEAGUE_SIZE - 1, 0, 4)).toBe('stayed');
    expect(seasonOutcome(1, 3, 4)).toBe('stayed');
    expect(seasonOutcome(0, 3, 4)).toBe('champion');
  });

  it('as divisões mantêm o tamanho e ninguém se perde', () => {
    const orders = [0, 1, 2, 3].map(d => ids.map(i => d * 100 + i));
    const moved = moveDivisions(orders);
    expect(moved.map(d => d.length)).toEqual([LEAGUE_SIZE, LEAGUE_SIZE, LEAGUE_SIZE, LEAGUE_SIZE]);
    expect(new Set(moved.flat()).size).toBe(LEAGUE_SIZE * 4);
    // Os dois primeiros da divisão 0 sobem, e os dois últimos da divisão 1 descem.
    expect(moved[1]).toContain(0);
    expect(moved[1]).toContain(1);
    expect(moved[0]).toContain(100 + LEAGUE_SIZE - 1);
    expect(moved[0]).not.toContain(0);
    expect(moved[3]).toContain(300);
    expect(moved[3]).toContain(200);
    expect(moved[0]!.filter(id => id < 100)).toHaveLength(LEAGUE_SIZE - MOVING_PLACES);
  });
});

describe('confiança', () => {
  it('ganhar sobe e perder desce', () => {
    expect(confidenceChange(true, 50, 50, true)).toBeGreaterThan(0);
    expect(confidenceChange(false, 50, 50, true)).toBeLessThan(0);
  });

  it('ganhar a quem é melhor vale mais, e perder com quem é pior custa mais', () => {
    expect(confidenceChange(true, 40, 60, true)).toBeGreaterThan(confidenceChange(true, 60, 40, true));
    expect(confidenceChange(false, 60, 40, true)).toBeLessThan(confidenceChange(false, 40, 60, true));
  });

  it('um particular vale menos', () => {
    expect(confidenceChange(true, 50, 50, false)).toBeLessThan(confidenceChange(true, 50, 50, true));
    expect(confidenceChange(false, 50, 50, false)).toBeGreaterThan(confidenceChange(false, 50, 50, true));
  });

  it('nunca muda demasiado de uma vez', () => {
    expect(confidenceChange(true, 10, 99, true)).toBeLessThanOrEqual(9);
    expect(confidenceChange(false, 99, 10, true)).toBeGreaterThanOrEqual(-9);
    expect(Math.abs(confidenceChange(true, 99, 10, true))).toBeGreaterThanOrEqual(2);
  });
});
