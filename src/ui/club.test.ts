import { PLAYER_POOL } from '../sim/teamgen.ts';
import { describe, expect, it } from 'vitest';
import { simulateMatch } from '../sim/match.ts';
import { generateTeam, teamRating } from '../sim/teamgen.ts';
import { CARD_IDS, CARDS, COMBOS, comboFor, cardFromEvent, endOfMatchCards, independentPractice, previewGains, trainPlayer, trainingFactor, type CardId } from '../sim/training.ts';
import { makeRng } from '../sim/rng.ts';
import { MOVES, OFF_BALL_STYLES, ON_BALL_STYLES, validateTeam } from '../sim/types.ts';
import { BALANCE as B } from '../sim/balance.ts';
import { LEAGUE_SIZE, PRESEASON_WEEKS, SEASON_WEEKS } from '../sim/league.ts';
import { DIVISIONS } from '../sim/teamgen.ts';
import { CUP_ROUNDS, FEDERATION_ROUNDS } from '../sim/cup.ts';
import { PLAYOFF_FORMATS } from '../sim/playoff.ts';
import { clubSeasons, seasonLines, CONTINENTAL_CLUBS, FOREIGN_START, PLAYER_CLUB, WORLD_CLUB, activeKit, aiTeam, applyRenewals, autoRenew, cancelOffer, careerOf, clubTeam, cupStatus, makeOffer, marketList, releasePlayer, rivalTeam, salaryFor, sellPlayer, signPlayer, specialTeam, surplus, transferWindowOpen, yearsAtClub, currentFixture, currentGame, currentSeries, finishMatch, finishPractice, firstHalfOver, leaguePosition, leagueTable, newClub, opponentId, opponentOf, parseClub, renameClub, skipWeek, swapPlayers, totalCards, trainOne, visitorOf, weekSeed, type ClubState } from './club.ts';
import { createMatch, step } from '../sim/match.ts';
import { CLUB_NAMES, shortName } from './setup.ts';

const base = generateTeam(1, 'A', 50).roster[0]!;

describe('cartas e combos', () => {
  it('há 20 cartas, nas 4 categorias', () => {
    expect(CARD_IDS).toHaveLength(20);
    expect(new Set(CARD_IDS.map(card => CARDS[card].category))).toEqual(new Set(['tactic', 'technique', 'physical', 'support']));
  });

  it('há 33 combos válidos e todos diferentes', () => {
    expect(COMBOS).toHaveLength(33);
    expect(new Set(COMBOS.map(combo => combo.id)).size).toBe(33);
    expect(new Set(COMBOS.map(combo => [...combo.cards].sort().join('+'))).size).toBe(33);
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

  it('o combo pede as cartas exatas, por qualquer ordem', () => {
    expect(comboFor(['nap', 'massage', 'shooting'])).toBeNull();
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
    // Os tipos novos dão mais roubos e desarmes, e cada um pode dar carta: a média anda nos 10.
    expect(total / N).toBeLessThan(11);
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
  // Um clube já na primeira jornada, depois da pré-época.
  const club = (): ClubState => ({ ...newClub(21, 2), week: PRESEASON_WEEKS + 1 });
  const playWeek = (c: ClubState): ClubState => finishMatch(c, simulateMatch(clubTeam(c), opponentOf(c), weekSeed(c), [true, false]), []).club;

  it('começa com cartas e sem movimentos, e o adversário nunca é o próprio clube', () => {
    const c = club();
    expect(totalCards(c)).toBeGreaterThan(0);
    expect(c.team.roster.every(player => player.moves.length === 0)).toBe(true);
    for (let week = 1; week < 40; week++) expect(opponentOf({ ...c, week }).name).not.toBe(c.team.name);
  });

  it('o treino gasta as cartas e regista os combos novos', () => {
    const c = club();
    const { club: after, isNewCombo } = trainOne(c, 0, ['shooting', 'dribble']);
    expect(isNewCombo).toBe(false);
    expect(after.cards.shooting).toBe((c.cards.shooting ?? 0) - 1);
    expect(after.team.roster[0]!.attributes.shooting).toBeGreaterThan(c.team.roster[0]!.attributes.shooting);
    expect(after.recentTraining[c.team.roster[0]!.name]).toEqual([c.season * 100 + c.week]);
    const withCombo = trainOne({ ...c, cards: { ...c.cards, nap: 1, massage: 1 } }, 1, ['nap', 'massage']);
    expect(withCombo.isNewCombo).toBe(true);
    expect(withCombo.club.knownCombos).toContain('lazyWeekend');
  });

  it('cada jogador treina uma vez por semana, e nunca com cartas que não há', () => {
    const c = { ...club(), cards: { shooting: 2 } };
    expect(() => trainOne(c, 0, ['fado'])).toThrow();
    expect(() => trainOne(c, 0, [])).toThrow();
    const { club: one } = trainOne(c, 0, ['shooting']);
    expect(() => trainOne(one, 0, ['shooting'])).toThrow();
    const { club: two } = trainOne(one, 1, ['shooting']);
    expect(() => trainOne(two, 2, ['shooting'])).toThrow();
    expect(two.trainedThisWeek).toHaveLength(2);
  });

  it('quem não treinou com cartas treina sozinho, e quem treinou não', () => {
    const c = club();
    const { club: trained } = trainOne(c, 0, ['shooting']);
    const after = playWeek(trained);
    expect(after.team.roster[0]!.attributes).toEqual(trained.team.roster[0]!.attributes);
    expect(after.team.roster.some((p, i) => JSON.stringify(p.attributes) !== JSON.stringify(c.team.roster[i]!.attributes))).toBe(true);
  });

  it('um jogo fecha a semana, com resultado, cartas e cansaço', () => {
    const c = club();
    const s = simulateMatch(clubTeam(c), opponentOf(c), weekSeed(c), [true, false]);
    const { club: after, cards } = finishMatch(c, s, ['fado']);
    expect(after.week).toBe(PRESEASON_WEEKS + 2);
    expect(after.wins + after.losses).toBe(1);
    expect(cards).toContain('fado');
    expect(after.cards.fado).toBeGreaterThanOrEqual(1);
    expect(after.trainedThisWeek).toEqual([]);
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
    const { club: c } = trainOne(club(), 0, ['shooting']);
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

  it('não aceita cores nem emblemas que possam meter HTML na página', () => {
    const c = club();
    const bad = '"><img src=x onerror=alert(1)>';
    expect(parseClub(JSON.stringify({ ...c, kits: c.kits.map(kit => ({ ...kit, jersey: bad })) }))).toBeNull();
    expect(parseClub(JSON.stringify({ ...c, emblem: { ...c.emblem, primary: bad } }))).toBeNull();
    expect(parseClub(JSON.stringify({ ...c, emblem: { ...c.emblem, letters: bad } }))).toBeNull();
    expect(parseClub(JSON.stringify({ ...c, kitChoice: 'nenhum' }))).toBeNull();
  });

  it('o emblema e os equipamentos ficam guardados', () => {
    const c = club();
    const edited: ClubState = { ...c, emblem: { ...c.emblem, shape: 'circle', letters: 'XY7' }, kits: c.kits.map(kit => ({ ...kit, pattern: 'stripes' })), kitChoice: 'gold' };
    const read = parseClub(JSON.stringify(edited))!;
    expect(read.emblem.letters).toBe('XY7');
    expect(activeKit(read).id).toBe('gold');
    expect(activeKit(read).pattern).toBe('stripes');
  });

  it('o número da camisola não muda com a troca no plantel', () => {
    const c = club();
    const swapped = swapPlayers(c, 0, 6);
    expect(swapped.shirts[swapped.team.roster[6]!.name]).toBe(4);
  });

  it('um jogo-treino acaba ao fim de dois períodos, só conta para as cartas e não fecha a semana', () => {
    const c = club();
    const rival = opponentOf(c);
    const s = createMatch(clubTeam(c), rival, weekSeed(c), [true, false]);
    while (!firstHalfOver(s)) step(s);
    expect(s.period).toBe(2);
    const { club: after, confidenceDelta, round } = finishPractice(c, s, ['fado']);
    expect(after.week).toBe(c.week);
    expect(after.practicedThisWeek).toBe(true);
    expect(after.cards.fado).toBeGreaterThanOrEqual(1);
    expect(confidenceDelta).toBe(0);
    expect(round).toBeNull();
    expect(after.confidence).toBe(c.confidence);
    expect(after.wins + after.losses).toBe(c.wins + c.losses);
    expect(after.rounds).toEqual(c.rounds);
    const tiredness = (x: ClubState): number => x.team.roster.reduce((sum, p) => sum + p.fatigue, 0);
    expect(tiredness(after)).toBeGreaterThan(tiredness(c));
    expect(tiredness(after) - tiredness(c)).toBeLessThan(tiredness(playWeek(c)) - tiredness(c) * 0.5);
    expect(() => finishPractice(after, s, [])).toThrow();
    // O jogo oficial da mesma semana fecha-a e volta a permitir um jogo-treino.
    expect(playWeek(after).practicedThisWeek).toBe(false);
  });

  it('o nome do clube é à escolha, com o nome curto e as letras do emblema a acompanhar', () => {
    const c = club();
    const named = renameClub(c, '  Dragões   do Minho ');
    expect(named.team.name).toBe('Dragões do Minho');
    expect(named.team.short).toBe('MIN');
    expect(named.clubs[PLAYER_CLUB]!.name).toBe('Dragões do Minho');
    expect(named.emblem.letters).toBe('MIN');
    expect(opponentOf(named).name).not.toBe('Dragões do Minho');
    expect(renameClub(c, '   ')).toBe(c);
    expect(renameClub(c, 'a'.repeat(40)).team.name).toHaveLength(24);
    const custom = renameClub({ ...c, emblem: { ...c.emblem, letters: 'XYZ' } }, 'Outro');
    expect(custom.emblem.letters).toBe('XYZ');
    expect(parseClub(JSON.stringify(named))).toEqual(named);
    expect(parseClub(JSON.stringify({ ...c, team: { ...c.team, name: 'a'.repeat(40) } }))).toBeNull();
  });

  it('a carreira do treinador passa de clube para clube', () => {
    const record = { season: 1, division: 0, position: 0, wins: 15, losses: 3, outcome: 'champion' as const, topScorer: 'Fonseca', topScorerPoints: 200, cards: [], table: [], cups: [], federationExit: 2, continentalExit: null, worldExit: null, playoffExit: null, departures: [], arrivals: [], prizeMoney: 0 };
    const first = { ...club(), history: [record] };
    const second = newClub(22, 0, careerOf(first));
    expect(careerOf(second)).toEqual([{ ...record, club: first.team.name }]);
    expect(parseClub(JSON.stringify(second))?.career).toHaveLength(1);
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
      // O que um treinador faz com os combos que aprende: sobem atributos e ensinam movimentos e comportamentos.
      const rotation: CardId[][] = [['dribble', 'sprints', 'readDefense'], ['weights', 'jumps', 'soup'], ['shooting', 'freeThrows', 'nap'], ['bouncePass', 'readDefense', 'pickRoll'], ['shooting', 'readDefense', 'nap'], ['weights', 'jumps', 'pickRoll']];
      for (let week = 0; week < 10; week++) {
        // 9 cartas por semana: pouco mais do que as 8 que um jogo costuma dar.
        trained = { ...trained, trainedThisWeek: [] };
        for (let p = 0; p < 3; p++) {
          const list = rotation[(week + p) % rotation.length]!;
          trained = trainOne({ ...trained, cards: Object.fromEntries(list.map(card => [card, 1])) }, (week + p) % 8, list).club;
        }
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
    for (let i = 0; i < 80 && !current.seasonReport; i++) current = week(current);
    return current;
  };
  /** Fecha o balanço e as renovações, como um treinador que fica com toda a gente que couber. */
  const nextSeason = (c: ClubState): ClubState => autoRenew({ ...c, seasonReport: null });
  const stronger = (c: ClubState, bonus: number): ClubState => ({ ...c, team: { ...c.team, roster: c.team.roster.map(p => ({ ...p, attributes: Object.fromEntries(Object.entries(p.attributes).map(([k, v]) => [k, Math.min(100, v + bonus)])) as unknown as typeof p.attributes })) } });

  it('os nomes dos clubes chegam para as 4 divisões, com abreviaturas diferentes', () => {
    expect(CLUB_NAMES.length).toBeGreaterThan(DIVISIONS.length * LEAGUE_SIZE);
    expect(new Set(CLUB_NAMES.map(shortName)).size).toBe(CLUB_NAMES.length);
  });

  it('há 40 clubes diferentes, com o nosso na última divisão', () => {
    const c = newClub(5);
    expect(c.divisions.flat().sort((a, b) => a - b)).toEqual(Array.from({ length: 40 }, (_, i) => i));
    expect(new Set(c.clubs.map(club => club.name)).size).toBe(53);
    expect(c.clubs[WORLD_CLUB]!.level).toBeGreaterThan(c.clubs[FOREIGN_START]!.level);
    expect(c.divisions[0]).toContain(PLAYER_CLUB);
    expect(c.division).toBe(0);
  });

  it('o adversário vem do calendário, e o nosso jogo fica lá escrito com a jornada inteira', () => {
    const c = { ...newClub(11), week: PRESEASON_WEEKS + 1 };
    const fixture = currentFixture(c)!;
    expect([fixture.home, fixture.away]).toContain(opponentId(c));
    const result = finishMatch(c, simulateMatch(clubTeam(c), opponentOf(c), weekSeed(c), [true, false], visitorOf(c)), []);
    expect(result.round).toHaveLength(LEAGUE_SIZE / 2);
    expect(result.round!.every(f => f.score !== null)).toBe(true);
    expect(leagueTable(result.club).filter(row => row.played === 1)).toHaveLength(LEAGUE_SIZE);
    const own = leagueTable(result.club).find(row => row.club === PLAYER_CLUB)!;
    expect(own.pointsFor).toBe(result.club.wins === 1 ? Math.max(own.pointsFor, own.pointsAgainst) : Math.min(own.pointsFor, own.pointsAgainst));
  });

  it('os clubes de cada divisão e o pool de jogadores são iguais em todas as carreiras; os plantéis sorteiam-se', () => {
    const a = newClub(5, 1);
    const b = newClub(5 + CLUB_NAMES.length, 1);
    expect(a.team.name).toBe(b.team.name);
    for (let d = 0; d < DIVISIONS.length; d++) expect(a.divisions[d]!.map(id => a.clubs[id]!.name)).toEqual(b.divisions[d]!.map(id => b.clubs[id]!.name));
    expect(a.clubs[1]!.players).not.toEqual(b.clubs[1]!.players);
    const first = aiTeam(a.clubs[1]!).roster[0]!;
    const body = PLAYER_POOL[a.clubs[1]!.players![0]!]!;
    expect([first.name, first.heightCm]).toEqual([body.name, body.heightCm]);
    // Nenhum jogador do pool está em dois clubes, e nenhum plantel repete um apelido.
    const all = a.clubs.flatMap(c => c.players ?? []);
    expect(new Set(all).size).toBe(all.length);
    for (const c of a.clubs) if (c.players) expect(new Set(c.players.map(i => PLAYER_POOL[i]!.name)).size).toBe(c.players.length);
  });

  it('uma semana lesionado fica marcada no registo do jogador', () => {
    const c = newClub(23);
    const name = c.team.roster[0]!.name;
    const hurt = { ...c, team: { ...c.team, roster: c.team.roster.map((p, i) => (i === 0 ? { ...p, injuryWeeks: 2 } : p)) } };
    expect(skipWeek(hurt).recentTraining[name]).toEqual([-(c.season * 100 + c.week)]);
  });

  it('os números da época de um rival somam os pontos reais da equipa', () => {
    let c = newClub(23);
    for (let i = 0; i < 6; i++) c = week(c);
    const row = leagueTable(c).find(r => r.club !== PLAYER_CLUB && r.played > 0)!;
    const lines = seasonLines(c, row.club, aiTeam(c.clubs[row.club]!));
    expect(lines[0]!.games).toBe(row.played);
    expect(lines.reduce((sum, l) => sum + l.points, 0)).toBeCloseTo(row.pointsFor, 5);
    expect(clubSeasons(c, -1)).toEqual([]);
  });

  it('a ficha de um clube mostra três épocas, e o fim da época fica lá escrito', () => {
    const c = newClub(23);
    expect(clubSeasons(c, PLAYER_CLUB).map(e => e.position === null)).toEqual([false, true, true]);
    expect(clubSeasons(c, 11).every(e => e.position !== null && e.position >= 0 && e.position < LEAGUE_SIZE)).toBe(true);
    const after = season(c);
    expect(after.clubs[11]!.past).toHaveLength(1);
    expect(clubSeasons(after, PLAYER_CLUB)[1]!.position).not.toBeNull();
    expect(parseClub(JSON.stringify(after))).toEqual(after);
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
    for (let i = 1; i < 4 + PRESEASON_WEEKS; i++) c = week(c);
    expect(c.week).toBe(4 + PRESEASON_WEEKS);
    expect(currentFixture(c)).toBeNull();
    const before = leagueTable(c);
    const friendly = finishMatch(c, simulateMatch(clubTeam(c), opponentOf(c), 7), []);
    expect(friendly.round).toBeNull();
    expect(friendly.club.week).toBe(5 + PRESEASON_WEEKS);
    expect(leagueTable(friendly.club)).toEqual(before);
    expect(skipWeek(c).week).toBe(5 + PRESEASON_WEEKS);
  });

  it('a Taça da Federação sorteia-se ronda a ronda, e o nosso clube começa na pré-eliminatória', () => {
    let c = newClub(29);
    expect(c.cups.federation.rounds).toHaveLength(0);
    expect(c.cups.federation.alive).toHaveLength(40);
    expect(c.cups.federation.preliminary).toHaveLength(16);
    expect(c.cups.federation.preliminary).toContain(PLAYER_CLUB);
    for (let i = 0; i <= PRESEASON_WEEKS; i++) c = week(c);
    expect(c.week).toBe(PRESEASON_WEEKS + 2);
    const game = currentGame(c)!;
    expect(game.cup).toBe('federation');
    expect(game.round).toBe(0);
    expect(c.cups.federation.rounds[0]).toHaveLength(8);
    const before = leagueTable(c);
    const result = finishMatch(c, simulateMatch(clubTeam(c), opponentOf(c), weekSeed(c), [true, false], visitorOf(c)), []);
    expect(result.cup).toBe('federation');
    expect(result.round).toHaveLength(8);
    expect(leagueTable(result.club)).toEqual(before);
    expect(result.club.cups.federation.alive).toHaveLength(32);
    const mine = result.round!.find(f => f.home === PLAYER_CLUB || f.away === PLAYER_CLUB)!;
    const won = mine.home === PLAYER_CLUB ? mine.score![0] > mine.score![1] : mine.score![1] > mine.score![0];
    expect(result.club.cups.federation.alive.includes(PLAYER_CLUB)).toBe(won);
    expect(result.confidenceDelta).not.toBe(0);
    expect(parseClub(JSON.stringify(result.club))).toEqual(result.club);
  });

  it('a taça acaba com um vencedor mesmo sem nós, e o balanço diz até onde chegámos', () => {
    let c = newClub(23);
    // Quer joguemos quer não, os outros jogam na mesma e cada ronda fecha-se com metade dos clubes.
    for (let i = 0; i < SEASON_WEEKS - 1; i++) {
      c = week(c);
      const sizes = c.cups.federation.rounds.map(round => round.length);
      expect(sizes, `semana ${c.week}`).toEqual([8, 16, 8, 4, 2, 1].slice(0, sizes.length));
    }
    expect(c.cups.federation.alive).toHaveLength(1);
    expect(c.cups.federation.rounds.flat().every(f => f.score)).toBe(true);
    const after = week(c);
    const cup = after.history[0]!;
    expect(cup.federationExit).toBeGreaterThanOrEqual(0);
    expect(cup.federationExit).toBeLessThanOrEqual(FEDERATION_ROUNDS.length);
    expect(cup.cups.includes('federation')).toBe(cup.federationExit === FEDERATION_ROUNDS.length);
    expect(after.cups.federation.rounds).toHaveLength(0);
    expect(after.cups.federation.alive).toHaveLength(40);
  });

  it('um clube com tudo a 100 ganha a taça, e isso dá cartas, confiança e fica na carreira', () => {
    const perfect = (seed: number): ClubState => {
      const start = newClub(seed);
      return { ...start, team: { ...start.team, roster: start.team.roster.map(p => ({ ...p, attributes: Object.fromEntries(Object.keys(p.attributes).map(k => [k, 100])) as unknown as typeof p.attributes })) } };
    };
    // Seis rondas a um jogo: até um clube perfeito pode perder uma, por isso vale a primeira época ganha em três.
    let won: ClubState | null = null;
    for (const seed of [61, 62, 63]) {
      const after = season(perfect(seed));
      if (after.history[0]!.cups.includes('federation')) {
        won = after;
        break;
      }
    }
    expect(won).not.toBeNull();
    const record = won!.history[0]!;
    expect(record.federationExit).toBe(FEDERATION_ROUNDS.length);
    expect(record.cards.length).toBeGreaterThan(season(newClub(61)).history[0]!.cards.length);
    expect(careerOf(won!)[0]!.cups).toContain('federation');
    expect(cupStatus(perfect(61), 'federation').alive).toBe(true);
  });

  it('não se pode saltar uma jornada', () => {
    expect(() => skipWeek({ ...newClub(1), week: PRESEASON_WEEKS + 1 })).toThrow();
    expect(skipWeek(newClub(1)).week).toBe(2);
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

  it('a Taça Continental joga-se com os 4 da Pro Liga 1 e os 12 de fora, e o Mundial a seguir', () => {
    let c = newClub(23);
    expect(c.continentalQualified).toHaveLength(4);
    expect(c.continentalQualified.every(id => c.divisions[3]!.includes(id))).toBe(true);
    expect(c.cups.continental.alive).toHaveLength(4 + CONTINENTAL_CLUBS);
    expect(cupStatus(c, 'continental').entered).toBe(false);
    for (let i = 0; i < SEASON_WEEKS - 1; i++) {
      c = week(c);
      const sizes = c.cups.continental.rounds.map(round => round.length);
      expect(sizes, `semana ${c.week}`).toEqual([8, 4, 2, 1].slice(0, sizes.length));
    }
    expect(c.cups.continental.alive).toHaveLength(1);
    expect(c.cups.world).toBeDefined();
    expect(c.cups.world!.alive).toHaveLength(1);
    expect(c.cups.world!.rounds[0]![0]!.score).not.toBeNull();
    expect([c.cups.world!.rounds[0]![0]!.home, c.cups.world!.rounds[0]![0]!.away]).toContain(WORLD_CLUB);
    const after = week(c);
    expect(after.history[0]!.continentalExit).toBeNull();
    expect(after.history[0]!.worldExit).toBeNull();
    expect(after.cups.world).toBeUndefined();
    expect(after.continentalQualified).toHaveLength(4);
    expect(parseClub(JSON.stringify(after))).toEqual(after);
  });

  it('o campeão da Pro Liga 1 entra na Taça Continental na época seguinte', () => {
    const first = season(stronger(newClub(91, 3), 30));
    expect(first.history[0]!.outcome).toBe('champion');
    expect(first.continentalQualified).toContain(PLAYER_CLUB);
    expect(cupStatus(first, 'continental').entered).toBe(true);
    const second = season(nextSeason(first));
    const record = second.history[1]!;
    expect(record.continentalExit).not.toBeNull();
    expect(record.continentalExit).toBeLessThanOrEqual(CUP_ROUNDS.continental.length);
    expect(record.worldExit !== null).toBe(record.continentalExit === CUP_ROUNDS.continental.length);
    expect(record.cups.includes('continental')).toBe(record.continentalExit === CUP_ROUNDS.continental.length);
  });

  it('o tempo passa: o potencial desce no fim da época, e quem o esgota sai e é substituído', () => {
    const start = newClub(101);
    const doomed = start.team.roster[11]!.name;
    const c = { ...start, team: { ...start.team, roster: start.team.roster.map((p, i) => (i === 11 ? { ...p, potential: 1 } : p)) } };
    const after = season(c);
    const record = after.history[0]!;
    for (const player of after.team.roster) {
      const before = c.team.roster.find(p => p.name === player.name);
      if (before) expect(player.potential).toBeLessThan(before.potential);
    }
    expect(record.departures).toEqual([doomed]);
    expect(record.farewells?.map(f => f.player.name)).toEqual([doomed]);
    expect(record.farewells![0]!.seasons).toBeGreaterThanOrEqual(1);
    expect(record.arrivals).toHaveLength(1);
    expect(after.team.roster.some(p => p.name === doomed)).toBe(false);
    expect(after.team.roster.length).toBe(12);
    const newcomer = after.team.roster.find(p => p.name === record.arrivals[0])!;
    expect(newcomer.potential).toBeGreaterThanOrEqual(65);
    expect(after.joined[newcomer.name]).toBe(2);
    expect(yearsAtClub(after, newcomer.name)).toBe(1);
    expect(yearsAtClub(after, after.team.roster[0]!.name)).toBe(2);
    expect(after.shirts[newcomer.name]).toBeDefined();
    expect(parseClub(JSON.stringify(after))).toEqual(after);
  });

  it('um veterano com o potencial no fim perde velocidade, salto e resistência', () => {
    const start = newClub(103);
    const c = { ...start, team: { ...start.team, roster: start.team.roster.map((p, i) => (i === 0 ? { ...p, potential: 12 } : p)) } };
    const after = season(c);
    const veteran = after.team.roster.find(p => p.name === c.team.roster[0]!.name)!;
    expect(veteran.attributes.speed).toBeLessThan(c.team.roster[0]!.attributes.speed);
    expect(veteran.attributes.shooting).toBeGreaterThanOrEqual(c.team.roster[0]!.attributes.shooting - 2);
  });

  it('no fim da época toda a gente pede um salário novo, e só se continua dentro do orçamento', () => {
    const after = season(newClub(105));
    expect(after.pendingRenewals).not.toBeNull();
    expect(after.pendingRenewals!.length).toBe(after.team.roster.length - after.history[0]!.arrivals.length);
    expect(after.money).toBeGreaterThan(0);
    const all = after.pendingRenewals!.map(r => r.name);
    const total = after.pendingRenewals!.reduce((sum, r) => sum + r.asked, 0);
    if (total <= after.money) {
      const kept = applyRenewals(after, all);
      expect(kept.pendingRenewals).toBeNull();
      expect(surplus(kept)).toBe(after.money - total);
    } else {
      expect(() => applyRenewals(after, all)).toThrow();
    }
    // Libertar quase toda a gente enche o plantel com jogadores livres até ao mínimo.
    const few = applyRenewals(after, all.slice(0, 3));
    expect(few.team.roster.length).toBe(10);
    expect(few.team.roster.filter(p => all.slice(0, 3).includes(p.name))).toHaveLength(3);
    expect(parseClub(JSON.stringify(few))).toEqual(few);
    const auto = autoRenew(after);
    expect(auto.pendingRenewals).toBeNull();
    expect(surplus(auto)).toBeGreaterThanOrEqual(0);
  });

  it('contratar e libertar mexem no salário, no número e na data de chegada', () => {
    const c = newClub(107);
    const stranger = { ...aiTeam(c.clubs[3]!).roster[0]!, name: 'Zé Novo' };
    const signed = signPlayer(c, stranger);
    expect(signed.team.roster).toHaveLength(13);
    expect(signed.salaries['Zé Novo']).toBe(salaryFor(stranger));
    expect(signed.shirts['Zé Novo']).toBe(16);
    expect(signed.joined['Zé Novo']).toBe(1);
    expect(surplus(signed)).toBe(surplus(c) - salaryFor(stranger));
    expect(() => signPlayer(signed, stranger)).toThrow();
    const released = releasePlayer(signed, 'Zé Novo');
    expect(released.team.roster).toHaveLength(12);
    expect(released.salaries['Zé Novo']).toBeUndefined();
    expect(() => releasePlayer(released, 'Zé Novo')).toThrow();
  });

  it('o mercado muda todas as semanas, os livres entram logo e os outros demoram e podem recusar', () => {
    const c = { ...newClub(109), money: 5000 };
    const list = marketList(c);
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list.filter(e => e.clubId === null)).toHaveLength(3);
    expect(marketList({ ...c, week: 2 })).not.toEqual(list);
    expect(marketList(c)).toEqual(list);
    const free = list.find(e => e.clubId === null)!;
    const signed = makeOffer(c, free);
    expect(signed.team.roster).toHaveLength(13);
    expect(signed.salaries[free.player.name]).toBe(free.salary);
    const foreign = list.find(e => e.clubId !== null)!;
    const offered = makeOffer(signed, foreign);
    expect(offered.offers).toHaveLength(1);
    expect(offered.money).toBe(signed.money - foreign.fee);
    expect(cancelOffer(offered, foreign.player.name).money).toBe(signed.money);
    expect(() => makeOffer({ ...c, money: 0 }, free)).toThrow();
    expect(() => makeOffer({ ...signed, week: 21 }, foreign)).toThrow();
    expect(transferWindowOpen({ ...c, week: 21 })).toBe(false);
    // Semanas a seguir: a proposta acaba aceite ou recusada, e o dinheiro nunca desaparece.
    let current = offered;
    for (let i = 0; i < 4 && current.offers.length > 0; i++) current = week(current);
    expect(current.offers).toHaveLength(0);
    const joined = current.team.roster.some(p => p.name === foreign.player.name);
    expect(joined ? current.money : current.money).toBe(joined ? signed.money - foreign.fee : signed.money);
    expect(parseClub(JSON.stringify(offered))).toEqual(offered);
  });

  it('os adversários especiais: a universidade é fraca com potencial no máximo, os veteranos não têm resistência, os sósias somos nós', () => {
    const c = newClub(113, 1);
    const uni = specialTeam(c, -1);
    expect(uni.roster.every(p => p.potential === 95)).toBe(true);
    expect(teamRating(uni)).toBeLessThan(teamRating(c.team));
    const vets = specialTeam(c, -2);
    expect(vets.roster.every(p => p.attributes.stamina === 15 && p.potential === 5)).toBe(true);
    const twins = specialTeam(c, -3);
    expect(twins.roster.map(p => p.name)).toEqual(c.team.roster.map(p => `${p.name} II`));
    expect(rivalTeam(c, -3)).toEqual(twins);
    expect(rivalTeam(c, 1)).toEqual(aiTeam(c.clubs[1]!));
    // Uma equipa especial sobrevive ao JSON e joga.
    expect(JSON.parse(JSON.stringify(uni))).toEqual(uni);
    expect(simulateMatch(clubTeam(c), twins, 1).phase).toBe('end');
  });

  it('vender dá o valor do jogador, mas nunca abaixo do mínimo do plantel', () => {
    const c = newClub(111);
    const name = c.team.roster[11]!.name;
    const sold = sellPlayer(c, name);
    expect(sold.team.roster).toHaveLength(11);
    expect(sold.money).toBeGreaterThan(c.money);
    let small = sold;
    small = sellPlayer(small, small.team.roster[10]!.name);
    expect(() => sellPlayer(small, small.team.roster[9]!.name)).toThrow();
  });

  it('nas divisões de baixo a época acaba na fase regular, sem playoffs', () => {
    const after = season(newClub(23));
    expect(after.history[0]!.playoffExit).toBeNull();
    expect(after.playoffs).toBeNull();
  });

  it('na Pro Liga 1 o campeão sai dos playoffs, com os jogos da série na mesma semana', () => {
    let c = stronger(newClub(81, 3), 20);
    for (let i = 0; i < SEASON_WEEKS; i++) c = week(c);
    expect(c.week).toBe(SEASON_WEEKS + 1);
    expect(c.playoffs).not.toBeNull();
    expect(c.playoffs!.seeds).toHaveLength(8);
    expect(c.playoffs!.seeds).toContain(PLAYER_CLUB);
    const series = currentSeries(c)!;
    expect(series.bestOf).toBe(3);
    const game = currentGame(c)!;
    expect(game.playoff).toBe(true);
    const first = finishMatch(c, simulateMatch(clubTeam(c), opponentOf(c), weekSeed(c), [true, false], visitorOf(c)), []);
    expect(first.series).not.toBeNull();
    expect(first.series!.wins[0] + first.series!.wins[1]).toBe(1);
    expect(first.series!.decided).toBe(false);
    expect(first.club.week).toBe(SEASON_WEEKS + 1);
    expect(parseClub(JSON.stringify(first.club))).toEqual(first.club);
    const after = season(first.club);
    const record = after.history[0]!;
    expect(record.playoffExit).not.toBeNull();
    expect(after.playoffs).toBeNull();
    expect(after.week).toBe(1);
    expect(record.outcome === 'champion').toBe(record.playoffExit === PLAYOFF_FORMATS[3]!.bestOf.length);
  });

  it('na Pro Liga 2 sobem o 1.º da fase regular e o vencedor do playoff', () => {
    const results = [83, 84, 85].map(seed => season(stronger(newClub(seed, 2), 25)));
    for (const after of results) {
      const record = after.history[0]!;
      if (record.outcome === 'champion') {
        expect(record.position).toBe(0);
        expect(record.playoffExit).toBeNull();
      }
      if (record.outcome === 'promoted') expect(record.playoffExit).toBe(PLAYOFF_FORMATS[2]!.bestOf.length);
      expect(after.division === 3).toBe(record.outcome === 'champion' || record.outcome === 'promoted');
      // Quem acaba em 2.º e perde o playoff fica.
      if (record.position === 1 && record.playoffExit !== PLAYOFF_FORMATS[2]!.bestOf.length) expect(record.outcome).toBe('stayed');
    }
    expect(results.some(after => after.history[0]!.outcome !== 'stayed')).toBe(true);
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
    const { club: trained } = trainOne(newClub(71), 0, ['shooting']);
    const old = {
      version: 1, seed: trained.seed, division: 2, week: 7, wins: 4, losses: 2, team: trained.team, tactics: trained.tactics, cards: trained.cards, knownCombos: ['lazyWeekend'], trainedThisWeek: true,
    };
    const migrated = parseClub(JSON.stringify(old))!;
    expect(migrated).not.toBeNull();
    expect(migrated.version).toBe(12);
    expect(migrated.trainedThisWeek).toEqual([]);
    expect(migrated.week).toBe(1);
    expect(migrated.season).toBe(1);
    expect(migrated.wins).toBe(4);
    expect(migrated.team).toEqual(trained.team);
    expect(migrated.knownCombos).toEqual(['lazyWeekend']);
    expect(migrated.divisions[2]).toContain(PLAYER_CLUB);
    expect(new Set(migrated.clubs.map(club => club.name)).size).toBe(53);
    expect(leaguePosition(migrated)).toBeGreaterThanOrEqual(0);
    expect(parseClub(JSON.stringify(migrated))).toEqual(migrated);
  });

  it('um clube guardado antes dos editores continua igual, com os valores novos', () => {
    const c = trainOne(newClub(72), 0, ['shooting']).club;
    const { emblem: _e, kits: _k, kitChoice: _c, shirts: _s, recentTraining: _r, career: _a, ...rest } = c;
    const migrated = parseClub(JSON.stringify({ ...rest, version: 2, trainedThisWeek: true }))!;
    expect(migrated.version).toBe(12);
    expect(migrated.team).toEqual(c.team);
    expect(migrated.trainedThisWeek).toHaveLength(c.team.roster.length);
    expect(activeKit(migrated).id).toBe('home');
    expect(migrated.emblem.letters).toBe(c.team.short);
    expect(parseClub(JSON.stringify(migrated))).toEqual(migrated);
    expect(parseClub(JSON.stringify({ ...rest, version: 2, trainedThisWeek: false }))!.trainedThisWeek).toEqual([]);
  });

  it('não aceita uma liga estragada', () => {
    const c = newClub(73);
    expect(parseClub(JSON.stringify({ ...c, divisions: [[0]] }))).toBeNull();
    expect(parseClub(JSON.stringify({ ...c, rounds: [[{ home: 99, away: 0, score: null }]] }))).toBeNull();
    expect(parseClub(JSON.stringify({ ...c, week: 99 }))).toBeNull();
    expect(parseClub(JSON.stringify({ ...c, confidence: 'muita' }))).toBeNull();
  });
});
