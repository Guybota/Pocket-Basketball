import { describe, expect, it } from 'vitest';
import { CUP_WEEKS, type CupName } from '../sim/cup.ts';
import { LEAGUE_WEEKS, SEASON_WEEKS, type Fixture } from '../sim/league.ts';
import { DIVISIONS } from '../sim/teamgen.ts';
import { PLAYER_CLUB, WORLD_CLUB, newClub, type ClubState, type MatchResult } from './club.ts';
import { titleTrophy, titleWon } from './trophies.ts';

const result = (club: ClubState, round: Fixture[] | null, extra: Partial<MatchResult> = {}): MatchResult => ({ club, cards: [], round, cup: null, series: null, confidenceDelta: 0, ...extra });
const played = (f: Fixture, ours: number, theirs: number): Fixture => ({ ...f, score: f.home === PLAYER_CLUB ? [ours, theirs] : [theirs, ours] });

/** O clube na semana de uma ronda de taça, com o nosso jogo nela contra o clube 7 (ou o de fora, no Mundial). */
function cupWeek(cup: CupName, round: number): { club: ClubState; fixture: Fixture } {
  const fixture: Fixture = { home: PLAYER_CLUB, away: cup === 'world' ? WORLD_CLUB : 7, score: null };
  const base = newClub(1, DIVISIONS.length - 1);
  const rounds = Array.from({ length: round + 1 }, (_, i) => (i === round ? [fixture] : []));
  return { club: { ...base, week: CUP_WEEKS[cup][round]!, cups: { ...base.cups, [cup]: { alive: [PLAYER_CLUB, fixture.away], preliminary: [], rounds } } }, fixture };
}

/** Uma época jogada ronda a ronda: nos outros jogos ganha a casa, e nos nossos `win` diz o resultado. Devolve as jornadas que deram título. */
function seasonTitles(division: number, win: (round: number) => boolean): number[] {
  let club = newClub(1, division);
  const titles: number[] = [];
  club.rounds.forEach((fixtures, r) => {
    const before = { ...club, week: LEAGUE_WEEKS[r]! };
    const round = fixtures.map(f => (f.home === PLAYER_CLUB || f.away === PLAYER_CLUB ? played(f, win(r) ? 80 : 70, win(r) ? 70 : 80) : { ...f, score: [80, 70] as [number, number] }));
    if (titleWon(before, result(before, round))) titles.push(r);
    club = { ...before, rounds: club.rounds.map((x, i) => (i === r ? round : x)) };
  });
  return titles;
}

describe('o jogo que dá um título', () => {
  it('ganhar a final de uma taça dá essa taça; perder, ou ganhar antes da final, não', () => {
    for (const cup of ['federation', 'continental', 'world'] as const) {
      const last = { federation: 5, continental: 3, world: 0 }[cup];
      const { club, fixture } = cupWeek(cup, last);
      expect(titleWon(club, result(club, [played(fixture, 90, 80)], { cup }))).toEqual({ kind: 'cup', cup });
      expect(titleWon(club, result(club, [played(fixture, 80, 90)], { cup }))).toBeNull();
      if (last > 0) {
        const semi = cupWeek(cup, last - 1);
        expect(titleWon(semi.club, result(semi.club, [played(semi.fixture, 90, 80)], { cup }))).toBeNull();
      }
    }
  });

  it('na Pro Liga 1 o título é o da final dos playoffs, quando a série fica nossa', () => {
    const top = DIVISIONS.length - 1;
    const series = { top: PLAYER_CLUB, bottom: 5, bestOf: 5, games: [] };
    const base = newClub(1, top);
    const atRound = (round: number): ClubState => ({ ...base, week: SEASON_WEEKS + 1 + round, playoffs: { division: top, seeds: [], rounds: Array.from({ length: round + 1 }, () => [series]) } });
    const final = atRound(2);
    expect(titleWon(final, result(final, null, { series: { wins: [3, 1], decided: true } }))).toEqual({ kind: 'league', division: top });
    expect(titleWon(final, result(final, null, { series: { wins: [2, 1], decided: false } }))).toBeNull();
    expect(titleWon(final, result(final, null, { series: { wins: [1, 3], decided: true } }))).toBeNull();
    const semi = atRound(1);
    expect(titleWon(semi, result(semi, null, { series: { wins: [2, 0], decided: true } }))).toBeNull();
    // Na Pro Liga 2 o playoff só dá a segunda subida.
    const second = { ...newClub(1, 2), week: SEASON_WEEKS + 2, playoffs: { division: 2, seeds: [], rounds: [[series], [series]] } };
    expect(titleWon(second, result(second, null, { series: { wins: [2, 0], decided: true } }))).toBeNull();
  });

  it('sem playoffs que decidam, o título chega uma só vez, na jornada em que o 1.º lugar fica garantido', () => {
    for (const division of [0, 1, 2]) {
      const titles = seasonTitles(division, () => true);
      expect(titles, DIVISIONS[division]!.name).toHaveLength(1);
      // A ganhar tudo, com os outros a dividir, fica garantido antes da última jornada.
      expect(titles[0]!).toBeLessThan(LEAGUE_WEEKS.length - 1);
      expect(seasonTitles(division, () => false)).toEqual([]);
    }
    // Uma derrota na última jornada não tira o título, que já vinha de trás.
    expect(seasonTitles(0, r => r < 17)).toHaveLength(1);
  });

  it('na Pro Liga 1 a fase regular não dá o título, nem um amigável dá nada', () => {
    expect(seasonTitles(DIVISIONS.length - 1, () => true)).toEqual([]);
    const { club } = cupWeek('federation', 5);
    expect(titleWon(club, result(club, null))).toBeNull();
  });

  it('o troféu é o da vitrina: a taça grande para a Pro Liga 1 e o Mundial', () => {
    expect(titleTrophy({ kind: 'league', division: DIVISIONS.length - 1 })).toEqual({ name: 'Pro Liga 1', kind: 'bigCup', banner: 'CAMPEÕES DA PRO LIGA 1' });
    expect(titleTrophy({ kind: 'league', division: 0 }).kind).toBe('cup');
    expect(titleTrophy({ kind: 'cup', cup: 'federation' })).toEqual({ name: 'Taça da Federação', kind: 'cup', banner: 'TAÇA DA FEDERAÇÃO' });
    expect(titleTrophy({ kind: 'cup', cup: 'world' }).kind).toBe('bigCup');
  });
});
