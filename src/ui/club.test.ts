import { describe, expect, it } from 'vitest';
import { simulateMatch } from '../sim/match.ts';
import { generateTeam } from '../sim/teamgen.ts';
import { CARD_IDS, CARDS, COMBOS, comboFor, cardFromEvent, endOfMatchCards, independentPractice, previewGains, trainPlayer, trainingFactor, type CardId } from '../sim/training.ts';
import { makeRng } from '../sim/rng.ts';
import { MOVES, OFF_BALL_STYLES, ON_BALL_STYLES, validateTeam } from '../sim/types.ts';
import { BALANCE as B } from '../sim/balance.ts';
import { LEAGUE_SIZE, SEASON_WEEKS } from '../sim/league.ts';
import { DIVISIONS } from '../sim/teamgen.ts';
import { PLAYER_CLUB, aiTeam, cardsLeft, clubTeam, currentFixture, finishMatch, leaguePosition, leagueTable, newClub, opponentId, opponentOf, parseClub, runTraining, skipWeek, swapPlayers, totalCards, visitorOf, weekSeed, type ClubState } from './club.ts';
import { CLUB_NAMES, shortName } from './setup.ts';

const base = generateTeam(1, 'A', 50).roster[0]!;

describe('cartas e combos', () => {
  it('há 20 cartas, nas 4 categorias', () => {
    expect(CARD_IDS).toHaveLength(20);
    expect(new Set(CARD_IDS.map(card => CARDS[card].category))).toEqual(new Set(['tactic', 'technique', 'physical', 'support']));
  });

  it('há 30 combos válidos e todos diferentes', () => {
    expect(COMBOS).toHaveLength(30);
    expect(new Set(COMBOS.map(combo => combo.id)).size).toBe(30);
    expect(new Set(COMBOS.map(combo => [...combo.cards].sort().join('+'))).size).toBe(30);
    for (const combo of COMBOS) {
      expect(combo.cards.length, combo.id).toBeGreaterThanOrEqual(2);
      expect(combo.cards.length, combo.id).toBeLessThanOrEqual(3);
      expect(new Set(combo.cards).size, combo.id).toBe(combo.cards.length);
      for (const card of combo.cards) expect(CARD_IDS, combo.id).toContain(card);
    }
  });

  it('todos os movimentos e comportamentos se podem aprender', () => {
    for (const move of MOVES) expect(COMBOS.some(c => c.move === move), move).toBe(true);
    for (const style of OFF_BALL_STYLES.filter(s => s !== 'balanced')) expect(COMBOS.some(c => c.offBall === style), style).toBe(true);
    for (const style of ON_BALL_STYLES.filter(s => s !== 'balanced')) expect(COMBOS.some(c => c.onBall === style), style).toBe(true);
  });

  it('todas as cartas entram em pelo menos um combo', () => {
    const used = new Set(COMBOS.flatMap(combo => combo.cards));
    expect(CARD_IDS.filter(card => !used.has(card))).toEqual([]);
  });

  it('nenhum combo sobe atributos acima do limite', () => {
    for (const combo of COMBOS) {
      const total = Object.values(combo.gains).reduce((sum, value) => sum + Math.max(0, value), 0);
      expect(total, combo.id).toBeLessThanOrEqual(16);
    }
  });

  it('ganha o maior combo contido nas cartas, por qualquer ordem', () => {
    expect(comboFor(['nap', 'massage'])?.id).toBe('lazyWeekend');
    expect(comboFor(['massage', 'soup', 'nap'])?.id).toBe('perfectSunday');
    expect(comboFor(['readDefense', 'dribble', 'sprints'])?.id).toBe('brokenAnkles');
    expect(comboFor(['shooting'])).toBeNull();
    expect(comboFor([])).toBeNull();
  });
});

describe('treino', () => {
  it('as cartas sobem os atributos certos, sem alterar o jogador original', () => {
    const before = JSON.stringify(base);
    const { player, gains } = trainPlayer(base, ['shooting']);
    expect(player.attributes.shooting).toBeGreaterThan(base.attributes.shooting);
    expect(player.attributes.speed).toBe(base.attributes.speed);
    expect(gains.shooting).toBeGreaterThan(0);
    expect(JSON.stringify(base)).toBe(before);
  });

  it('mais potencial rende mais, e o cansaço rende menos', () => {
    const gain = (potential: number, fatigue: number): number => trainPlayer({ ...base, potential, fatigue }, ['shooting']).gains.shooting!;
    expect(gain(90, 0)).toBeGreaterThan(gain(30, 0));
    expect(gain(60, 0)).toBeGreaterThan(gain(60, 0.8));
    expect(trainingFactor(100, 0)).toBeCloseTo(1.4);
    expect(trainingFactor(0, 0)).toBeCloseTo(0.6);
  });

  it('quanto mais alto o atributo, menos rende', () => {
    const at = (shooting: number): number => trainPlayer({ ...base, attributes: { ...base.attributes, shooting } }, ['shooting']).gains.shooting!;
    expect(at(30)).toBeGreaterThan(at(60));
    expect(at(60)).toBeGreaterThan(at(90));
    expect(at(90)).toBeGreaterThan(0);
  });

  it('recusa mais de 3 cartas e cartas repetidas', () => {
    expect(() => trainPlayer(base, ['shooting', 'dribble', 'sprints', 'nap'])).toThrow();
    expect(() => trainPlayer(base, ['shooting', 'shooting'])).toThrow();
  });

  it('um combo desbloqueia o movimento, sem o repetir', () => {
    const plain = { ...base, moves: [] };
    const first = trainPlayer(plain, ['dribble', 'sprints', 'readDefense']);
    expect(first.newMove).toBe('crossover');
    expect(first.player.moves).toEqual(['crossover']);
    const second = trainPlayer(first.player, ['dribble', 'sprints', 'readDefense']);
    expect(second.newMove).toBeNull();
    expect(second.player.moves).toEqual(['crossover']);
  });

  it('não passa do limite de movimentos, mas avisa', () => {
    const full = { ...base, moves: ['stepBack', 'powerDunk'] as typeof base.moves };
    const result = trainPlayer(full, ['dribble', 'sprints', 'readDefense']);
    expect(result.newMove).toBeNull();
    expect(result.moveBlocked).toBe(true);
    expect(result.player.moves).toHaveLength(2);
  });

  it('um combo muda o comportamento com bola e sem bola', () => {
    const plain = { ...base, offBall: 'balanced' as const, onBall: 'balanced' as const };
    expect(trainPlayer(plain, ['shooting', 'readDefense', 'nap']).player.offBall).toBe('spotUp');
    expect(trainPlayer(plain, ['bouncePass', 'readDefense', 'pickRoll']).player.onBall).toBe('playmaker');
  });

  it('um combo mau tira atributos, sem nunca sair dos limites', () => {
    const { player, gains } = trainPlayer({ ...base, attributes: { ...base.attributes, stamina: 2, willpower: 1.5 } }, ['weights', 'sprints', 'longRun']);
    expect(gains.willpower).toBeLessThan(0);
    expect(player.attributes.willpower).toBeGreaterThanOrEqual(1);
    const top = trainPlayer({ ...base, potential: 100, attributes: { ...base.attributes, shooting: 98.9 } }, ['shooting', 'video']);
    expect(top.player.attributes.shooting).toBeLessThanOrEqual(99);
  });

  it('a pré-visualização não revela um combo por descobrir', () => {
    const cards: CardId[] = ['nap', 'massage'];
    const real = trainPlayer(base, cards).gains;
    expect(previewGains(base, cards, ['lazyWeekend'])).toEqual(real);
    const hidden = previewGains(base, cards, []);
    expect(hidden.stamina).toBeUndefined();
    expect(real.stamina).toBeGreaterThan(0);
  });

  it('as cartas físicas cansam e as de apoio descansam', () => {
    const tired = { ...base, fatigue: 0.5 };
    expect(trainPlayer(tired, ['weights']).player.fatigue).toBeGreaterThan(0.5);
    expect(trainPlayer(tired, ['nap']).player.fatigue).toBeLessThan(0.5);
  });

  it('um jogador treinado continua válido para jogar', () => {
    let player = base;
    for (const combo of COMBOS) player = trainPlayer(player, combo.cards).player;
    const team = generateTeam(2, 'B', 50);
    validateTeam({ ...team, roster: [player, ...team.roster.slice(1)] });
  });

  it('o treino por conta própria é pouco e repete-se com a mesma semente', () => {
    const a = independentPractice(base, makeRng(5));
    const b = independentPractice(base, makeRng(5));
    expect(a).toEqual(b);
    const total = (p: typeof base): number => Object.values(p.attributes).reduce((sum, value) => sum + value, 0);
    expect(total(a) - total(base)).toBeLessThanOrEqual(1.5);
  });
});

describe('cartas ganhas nos jogos', () => {
  const found = (seed: number, team: 0 | 1): CardId[] => {
    const s = simulateMatch(generateTeam(seed, 'A', 55), generateTeam(seed + 300, 'B', 55), seed);
    const rng = makeRng(seed);
    return s.events.flatMap(e => cardFromEvent(e, team, rng) ?? []);
  };

  it('um jogo dá um número razoável de cartas, variadas', () => {
    let total = 0;
    const kinds = new Set<CardId>();
    const N = 100;
    for (let seed = 1; seed <= N; seed++) {
      const cards = found(seed, 0);
      total += cards.length;
      for (const card of cards) kinds.add(card);
    }
    expect(total / N).toBeGreaterThan(3);
    expect(total / N).toBeLessThan(10);
    expect(kinds.size).toBeGreaterThan(12);
  });

  it('as mesmas sementes dão as mesmas cartas', () => {
    expect(found(7, 0)).toEqual(found(7, 0));
  });

  it('mesmo a perder se ganha uma carta, e a vencer ganham-se duas', () => {
    expect(endOfMatchCards(false, 3)).toHaveLength(1);
    expect(endOfMatchCards(true, 3)).toHaveLength(2);
  });
});

describe('clube', () => {
  const club = (): ClubState => newClub(21, 2);
  const playWeek = (c: ClubState): ClubState => finishMatch(c, simulateMatch(clubTeam(c), opponentOf(c), weekSeed(c), [true, false]), []).club;

  it('começa com cartas e sem movimentos, e o adversário nunca é o próprio clube', () => {
    const c = club();
    expect(totalCards(c)).toBeGreaterThan(0);
    expect(c.team.roster.every(player => player.moves.length === 0)).toBe(true);
    for (let week = 1; week < 40; week++) expect(opponentOf({ ...c, week }).name).not.toBe(c.team.name);
  });

  it('o treino gasta as cartas e regista os combos novos', () => {
    const c = club();
    const { club: after, reports } = runTraining(c, { 0: ['shooting', 'dribble'] });
    expect(after.cards.shooting).toBe((c.cards.shooting ?? 0) - 1);
    expect(reports).toHaveLength(1);
    expect(after.team.roster[0]!.attributes.shooting).toBeGreaterThan(c.team.roster[0]!.attributes.shooting);
    const withCombo = runTraining({ ...c, cards: { ...c.cards, nap: 1, massage: 1 } }, { 1: ['nap', 'massage'] });
    expect(withCombo.reports[0]!.isNewCombo).toBe(true);
    expect(withCombo.club.knownCombos).toContain('lazyWeekend');
  });

  it('recusa treinar com cartas que não tem, ou duas vezes na mesma semana', () => {
    const c = { ...club(), cards: { shooting: 1 } };
    expect(() => runTraining(c, { 0: ['shooting'], 1: ['shooting'] })).toThrow();
    expect(() => runTraining(c, { 0: ['fado'] })).toThrow();
    const { club: trained } = runTraining(c, {});
    expect(() => runTraining(trained, {})).toThrow();
  });

  it('conta as cartas já escolhidas para outros jogadores', () => {
    const c = { ...club(), cards: { shooting: 2 } };
    expect(cardsLeft(c, { 0: ['shooting'] }, 'shooting')).toBe(1);
    expect(cardsLeft(c, { 0: ['shooting'], 3: ['shooting'] }, 'shooting')).toBe(0);
  });

  it('um jogo fecha a semana, com resultado, cartas e cansaço', () => {
    const c = club();
    const s = simulateMatch(clubTeam(c), opponentOf(c), weekSeed(c), [true, false]);
    const { club: after, cards } = finishMatch(c, s, ['fado']);
    expect(after.week).toBe(2);
    expect(after.wins + after.losses).toBe(1);
    expect(cards).toContain('fado');
    expect(after.cards.fado).toBeGreaterThanOrEqual(1);
    expect(after.trainedThisWeek).toBe(false);
    for (const player of after.team.roster) {
      expect(player.fatigue).toBeGreaterThanOrEqual(0);
      expect(player.fatigue).toBeLessThanOrEqual(1);
    }
  });

  it('o cansaço não dispara ao longo de uma época inteira', () => {
    let c = club();
    for (let i = 0; i < 30; i++) c = playWeek(c);
    for (const player of c.team.roster) expect(player.fatigue).toBeLessThan(0.5);
  });

  it('guarda e lê um clube sem perder nada', () => {
    const { club: c } = runTraining(club(), { 0: ['shooting'] });
    expect(parseClub(JSON.stringify(c))).toEqual(c);
  });

  it('não aceita um clube guardado estragado', () => {
    const c = club();
    expect(parseClub(null)).toBeNull();
    expect(parseClub('isto não é json')).toBeNull();
    expect(parseClub(JSON.stringify({ ...c, version: 99 }))).toBeNull();
    expect(parseClub(JSON.stringify({ ...c, week: -1 }))).toBeNull();
    expect(parseClub(JSON.stringify({ ...c, division: 9 }))).toBeNull();
    expect(parseClub(JSON.stringify({ ...c, cards: { batota: 5 } }))).toBeNull();
    expect(parseClub(JSON.stringify({ ...c, cards: { shooting: -1 } }))).toBeNull();
    expect(parseClub(JSON.stringify({ ...c, team: { ...c.team, roster: [] } }))).toBeNull();
  });
});

// O critério da Fase 2: treinar tem de se notar em campo.
describe('critério da Fase 2', () => {
  it('10 semanas de treino com combos fazem a equipa ganhar à mesma equipa sem treino', () => {
    let wins = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const start = newClub(i + 1, 2);
      let trained = start;
      const rotation: CardId[][] = [['shooting', 'video'], ['weights', 'jumps'], ['sprints', 'longRun'], ['bouncePass', 'readDefense'], ['dribble', 'agility'], ['freeThrows', 'fado']];
      for (let week = 0; week < 10; week++) {
        const plan: Record<number, CardId[]> = {};
        // Cerca de 6 cartas por semana, o que um jogo costuma dar.
        for (let p = 0; p < 3; p++) plan[(week + p) % 8] = rotation[(week + p) % rotation.length]!;
        const cards: Partial<Record<CardId, number>> = {};
        for (const list of Object.values(plan)) for (const card of list) cards[card] = (cards[card] ?? 0) + 1;
        trained = { ...runTraining({ ...trained, cards, trainedThisWeek: false }, plan).club };
      }
      const rest = (t: ClubState['team']): ClubState['team'] => ({ ...t, roster: t.roster.map(p => ({ ...p, fatigue: 0 })) });
      const home = i % 2 === 0;
      const a = rest(trained.team);
      const b = rest(start.team);
      const s = simulateMatch(home ? a : b, home ? b : a, i + 1);
      if (s.score[home ? 0 : 1] > s.score[home ? 1 : 0]) wins++;
    }
    const rate = wins / N;
    expect(rate).toBeGreaterThan(0.6);
    expect(rate).toBeLessThan(0.95);
  });
});

describe('época', () => {
  const week = (c: ClubState): ClubState => currentFixture(c)
    ? finishMatch(c, simulateMatch(clubTeam(c), opponentOf(c), weekSeed(c), [true, false], visitorOf(c)), []).club
    : skipWeek(c);
  const season = (c: ClubState): ClubState => {
    let current = c;
    for (let i = 0; i < SEASON_WEEKS; i++) current = week(current);
    return current;
  };

  it('os nomes dos clubes chegam para as 4 divisões, com abreviaturas diferentes', () => {
    expect(CLUB_NAMES.length).toBeGreaterThan(DIVISIONS.length * LEAGUE_SIZE);
    expect(new Set(CLUB_NAMES.map(shortName)).size).toBe(CLUB_NAMES.length);
  });

  it('há 40 clubes diferentes, com o nosso na última divisão', () => {
    const c = newClub(5);
    expect(c.divisions.flat().sort((a, b) => a - b)).toEqual(Array.from({ length: 40 }, (_, i) => i));
    expect(new Set(c.clubs.map(club => club.name)).size).toBe(40);
    expect(c.divisions[0]).toContain(PLAYER_CLUB);
    expect(c.division).toBe(0);
  });

  it('o adversário vem do calendário, e o nosso jogo fica lá escrito com a jornada inteira', () => {
    const c = newClub(11);
    const fixture = currentFixture(c)!;
    expect([fixture.home, fixture.away]).toContain(opponentId(c));
    const result = finishMatch(c, simulateMatch(clubTeam(c), opponentOf(c), weekSeed(c), [true, false], visitorOf(c)), []);
    expect(result.round).toHaveLength(LEAGUE_SIZE / 2);
    expect(result.round!.every(f => f.score !== null)).toBe(true);
    expect(leagueTable(result.club).filter(row => row.played === 1)).toHaveLength(LEAGUE_SIZE);
    const own = leagueTable(result.club).find(row => row.club === PLAYER_CLUB)!;
    expect(own.pointsFor).toBe(result.club.wins === 1 ? Math.max(own.pointsFor, own.pointsAgainst) : Math.min(own.pointsFor, own.pointsAgainst));
  });

  it('os resultados dos outros jogos repetem-se com o mesmo clube', () => {
    const play = (): unknown => finishMatch(newClub(13), simulateMatch(clubTeam(newClub(13)), opponentOf(newClub(13)), 1), []).round;
    expect(play()).toEqual(play());
  });

  it('a Vontade conta para quem joga fora, seja que equipa for', () => {
    const c = newClub(17);
    const away = (visitor: 0 | 1): number[] => simulateMatch(clubTeam(c), opponentOf(c), 3, [true, false], visitor).score;
    expect(away(0)).not.toEqual(away(1));
    expect(simulateMatch(clubTeam(c), opponentOf(c), 3, [true, false], 0).visitor).toBe(0);
  });

  it('a semana livre tem particular, não conta para a liga, e pode-se saltar', () => {
    let c = newClub(19);
    for (let i = 1; i < 10; i++) c = week(c);
    expect(c.week).toBe(10);
    expect(currentFixture(c)).toBeNull();
    const before = leagueTable(c);
    const friendly = finishMatch(c, simulateMatch(clubTeam(c), opponentOf(c), 7), []);
    expect(friendly.round).toBeNull();
    expect(friendly.club.week).toBe(11);
    expect(leagueTable(friendly.club)).toEqual(before);
    expect(skipWeek(c).week).toBe(11);
  });

  it('não se pode saltar uma jornada', () => {
    expect(() => skipWeek(newClub(1))).toThrow();
  });

  it('uma época inteira acaba com tudo jogado, balanço e calendário novo', () => {
    const start = newClub(23);
    const after = season(start);
    const record = after.seasonReport!;
    expect(after.season).toBe(2);
    expect(after.week).toBe(1);
    expect(after.history).toHaveLength(1);
    expect(record.table.every(row => row.played === (LEAGUE_SIZE - 1) * 2)).toBe(true);
    expect(record.wins + record.losses).toBe((LEAGUE_SIZE - 1) * 2);
    expect(record.cards.length).toBeGreaterThan(0);
    expect(after.rounds.flat().every(f => f.score === null)).toBe(true);
    expect(after.divisions.map(ids => ids.length)).toEqual([10, 10, 10, 10]);
    expect(new Set(after.divisions.flat()).size).toBe(40);
    expect(Object.keys(after.stats)).toHaveLength(0);
    expect(record.topScorerPoints).toBeGreaterThan(0);
    expect(parseClub(JSON.stringify(after))).toEqual(after);
  });

  it('quem acaba em cima sobe, e quem acaba em baixo desce', () => {
    for (const seed of [31, 37, 41, 43, 47, 53]) {
      const start = newClub(seed, 1);
      const after = season(start);
      const expected = { champion: 2, promoted: 2, stayed: 1, relegated: 0 }[after.seasonReport!.outcome];
      expect(after.division, `semente ${seed}`).toBe(expected);
      expect(after.divisions[expected]).toContain(PLAYER_CLUB);
      expect(after.rounds.flat().every(f => after.divisions[expected]!.includes(f.home))).toBe(true);
    }
  });

  it('perder muito leva ao despedimento, que fica guardado', () => {
    let c = { ...newClub(59), confidence: 4 };
    let loops = 0;
    while (!c.fired && loops++ < 40) {
      const s = simulateMatch(clubTeam(c), opponentOf(c), weekSeed(c));
      // Um jogo perdido, seja qual for o resultado verdadeiro.
      s.score = [10, 60];
      c = finishMatch(c, s, []).club;
    }
    expect(c.fired).toBe(true);
    expect(c.confidence).toBeLessThan(B.confidenceFired);
    expect(parseClub(JSON.stringify(c))?.fired).toBe(true);
  });

  it('trocar jogadores muda quem começa o jogo e guarda-se', () => {
    const c = newClub(61);
    const swapped = swapPlayers(c, 0, 7);
    expect(swapped.team.roster[0]!.name).toBe(c.team.roster[7]!.name);
    expect(swapped.team.roster[7]!.name).toBe(c.team.roster[0]!.name);
    const s = simulateMatch(clubTeam(swapped), opponentOf(swapped), 1);
    expect(s.bodies[0]!.player.name).toBe(c.team.roster[7]!.name);
    expect(c.team.roster[0]!.name).not.toBe(swapped.team.roster[0]!.name);
  });

  it('as equipas dos outros clubes repetem-se e têm táticas válidas', () => {
    const c = newClub(67);
    const club = c.clubs[5]!;
    expect(aiTeam(club)).toEqual(aiTeam({ ...club }));
    validateTeam(aiTeam(club));
  });

  it('um clube guardado antes das épocas continua, com o que treinou', () => {
    const { club: trained } = runTraining(newClub(71), { 0: ['shooting'] });
    const old = {
      version: 1, seed: trained.seed, division: 2, week: 7, wins: 4, losses: 2, team: trained.team, tactics: trained.tactics, cards: trained.cards, knownCombos: ['lazyWeekend'], trainedThisWeek: true,
    };
    const migrated = parseClub(JSON.stringify(old))!;
    expect(migrated).not.toBeNull();
    expect(migrated.version).toBe(2);
    expect(migrated.week).toBe(1);
    expect(migrated.season).toBe(1);
    expect(migrated.wins).toBe(4);
    expect(migrated.team).toEqual(trained.team);
    expect(migrated.knownCombos).toEqual(['lazyWeekend']);
    expect(migrated.divisions[2]).toContain(PLAYER_CLUB);
    expect(new Set(migrated.clubs.map(club => club.name)).size).toBe(40);
    expect(leaguePosition(migrated)).toBeGreaterThanOrEqual(0);
    expect(parseClub(JSON.stringify(migrated))).toEqual(migrated);
  });

  it('não aceita uma liga estragada', () => {
    const c = newClub(73);
    expect(parseClub(JSON.stringify({ ...c, divisions: [[0]] }))).toBeNull();
    expect(parseClub(JSON.stringify({ ...c, rounds: [[{ home: 99, away: 0, score: null }]] }))).toBeNull();
    expect(parseClub(JSON.stringify({ ...c, week: 99 }))).toBeNull();
    expect(parseClub(JSON.stringify({ ...c, confidence: 'muita' }))).toBeNull();
  });
});
