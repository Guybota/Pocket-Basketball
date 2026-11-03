import { describe, expect, it } from 'vitest';
import { createPlayoffs, drawNextRound, nextGame, playoffExit, playoffWinner, seriesWinner, seriesWins } from './playoff.ts';
import { FEDERATION_ROUNDS, createFederationCup, cupExit, cupWinner, drawCupRound, settleCupRound } from './cup.ts';
import { LEAGUE_SIZE, MOVING_PLACES, PRESEASON_WEEKS, SEASON_WEEKS, confidenceChange, moveDivisions, weekCup, roundRobin, seasonOutcome, standings, weekRound } from './league.ts';

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

  it('todas as jornadas cabem nas semanas, e as outras semanas são de taça', () => {
    const weeks = Array.from({ length: SEASON_WEEKS }, (_, i) => i + 1);
    const rounds = weeks.map(weekRound);
    expect(rounds.filter(round => round === null)).toHaveLength(11 + PRESEASON_WEEKS);
    expect(rounds.filter(round => round !== null)).toEqual(Array.from({ length: (LEAGUE_SIZE - 1) * 2 }, (_, i) => i));
    for (const week of weeks) {
      if (week <= PRESEASON_WEEKS) expect(weekRound(week) === null && weekCup(week) === null, `semana ${week}`).toBe(true);
      else expect((weekRound(week) === null) !== (weekCup(week) === null), `semana ${week}`).toBe(true);
    }
    expect(weeks.filter(week => weekCup(week)?.cup === 'federation')).toHaveLength(6);
    expect(weekCup(PRESEASON_WEEKS + 2)).toEqual({ cup: 'federation', round: 0 });
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

describe('taça', () => {
  const ids = Array.from({ length: 40 }, (_, i) => i);
  const divisions = [ids.slice(0, 10), ids.slice(10, 20), ids.slice(20, 30), ids.slice(30, 40)];
  const cup = createFederationCup(divisions, id => id);

  it('entram todos, e 16 começam na pré-eliminatória', () => {
    expect(cup.alive).toHaveLength(40);
    expect(cup.preliminary).toHaveLength(16);
    expect(cup.preliminary.slice(0, 10)).toEqual(divisions[0]);
    expect(cup.preliminary.slice(10)).toEqual([10, 11, 12, 13, 14, 15]);
  });

  it('as rondas têm 8, 16, 8, 4, 2 e 1 jogos, e sobra um vencedor', () => {
    let state = cup;
    const sizes: number[] = [];
    for (let round = 0; round < FEDERATION_ROUNDS.length; round++) {
      state = drawCupRound(state, 7);
      const fixtures = state.rounds[round]!;
      sizes.push(fixtures.length);
      expect(new Set(fixtures.flatMap(f => [f.home, f.away])).size).toBe(fixtures.length * 2);
      state = settleCupRound(state, round, fixtures.map(f => ({ ...f, score: [1, 0] as [number, number] })));
    }
    expect(sizes).toEqual([8, 16, 8, 4, 2, 1]);
    expect(state.alive).toHaveLength(1);
    expect(cupWinner(state, FEDERATION_ROUNDS.length)).toBe(state.alive[0]);
    expect(cupExit(state, state.alive[0]!, FEDERATION_ROUNDS.length)).toBe(FEDERATION_ROUNDS.length);
    const firstLoser = state.rounds[0]![0]!.away;
    expect(cupExit(state, firstLoser, FEDERATION_ROUNDS.length)).toBe(0);
    expect(cupExit(cup, 3, FEDERATION_ROUNDS.length)).toBeNull();
  });

  it('o mesmo sorteio com a mesma semente', () => {
    expect(drawCupRound(cup, 11)).toEqual(drawCupRound(cup, 11));
    expect(drawCupRound(cup, 11)).not.toEqual(drawCupRound(cup, 12));
  });
});

describe('playoffs', () => {
  const order = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const play = (series: NonNullable<ReturnType<typeof nextGame>> & { home: number }, topWins: boolean, s: { top: number; games: typeof series[] }): void => {
    const homeIsTop = series.home === s.top;
    s.games.push({ ...series, score: homeIsTop === topWins ? [1, 0] : [0, 1] });
  };

  it('na Pro Liga 1 entram 8, com 1.º-8.º, 4.º-5.º, 2.º-7.º e 3.º-6.º, e séries de 3, 3 e 5', () => {
    const state = createPlayoffs(3, order)!;
    expect(state.rounds[0]!.map(s => [s.top, s.bottom])).toEqual([[10, 17], [13, 14], [11, 16], [12, 15]]);
    expect(state.rounds[0]!.every(s => s.bestOf === 3)).toBe(true);
    expect(createPlayoffs(2, order)!.rounds[0]!.map(s => [s.top, s.bottom])).toEqual([[11, 14], [12, 13]]);
    expect(createPlayoffs(1, order)).toBeNull();
  });

  it('o melhor classificado joga em casa os jogos ímpares, e a série acaba com duas vitórias', () => {
    const series = createPlayoffs(3, order)!.rounds[0]![0]!;
    expect(nextGame(series)!.home).toBe(10);
    play(nextGame(series)!, true, series);
    expect(nextGame(series)!.home).toBe(17);
    play(nextGame(series)!, false, series);
    expect(seriesWins(series)).toEqual([1, 1]);
    expect(nextGame(series)!.home).toBe(10);
    play(nextGame(series)!, false, series);
    expect(seriesWinner(series)).toBe(17);
    expect(nextGame(series)).toBeNull();
  });

  it('as rondas seguintes juntam vencedores vizinhos, até ao campeão', () => {
    let state = createPlayoffs(3, order)!;
    const sweep = (topWins: (s: { top: number; bottom: number }) => boolean): void => {
      for (const series of state.rounds[state.rounds.length - 1]!) {
        while (!seriesWinner(series)) play(nextGame(series)!, topWins(series), series);
      }
      state = drawNextRound(state);
    };
    sweep(() => true);
    expect(state.rounds[1]!.map(s => [s.top, s.bottom])).toEqual([[10, 13], [11, 12]]);
    sweep(s => s.top !== 10);
    expect(state.rounds[2]!.map(s => [s.top, s.bottom, s.bestOf])).toEqual([[11, 13, 5]]);
    expect(playoffWinner(state)).toBeNull();
    sweep(() => false);
    expect(playoffWinner(state)).toBe(13);
    expect(playoffExit(state, 13)).toBe(3);
    expect(playoffExit(state, 10)).toBe(1);
    expect(playoffExit(state, 17)).toBe(0);
    expect(playoffExit(state, 19)).toBeNull();
    expect(state.rounds).toHaveLength(3);
  });
});
