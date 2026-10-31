import { BALANCE as B } from '../sim/balance.ts';
import { LEAGUE_SIZE, SEASON_CONFIDENCE, SEASON_WEEKS, confidenceChange, moveDivisions, orderByLevel, roundRobin, seasonOutcome, shuffled, standings, weekRound, type Fixture, type LeagueClub, type SeasonOutcome, type Standing } from '../sim/league.ts';
import { simulateMatch, type MatchState, type TeamIndex } from '../sim/match.ts';
import { between, makeRng, next } from '../sim/rng.ts';
import { DIVISIONS, generateTeam, teamRating } from '../sim/teamgen.ts';
import { CARD_IDS, CARDS, MAX_CARDS_PER_PLAYER, endOfMatchCards, independentPractice, trainPlayer, type CardId, type Combo } from '../sim/training.ts';
import { NEUTRAL_TACTICS, validateTactics, validateTeam, type MoveId, type Tactics, type Team } from '../sim/types.ts';
import { CLUB_NAMES, shortName } from './setup.ts';

const SAVE_VERSION = 2;
const MATCH_FATIGUE = 0.22;
const WEEKLY_RECOVERY = 0.5;
const STARTING_CARDS: readonly CardId[] = ['shooting', 'dribble', 'sprints', 'readDefense', 'weights', 'nap'];
/** O clube do jogador é sempre o número 0 da lista de clubes. */
export const PLAYER_CLUB = 0;
const TACTIC_CHOICES = [-1, 0, 0, 1] as const;
const SEASON_CARDS: Record<SeasonOutcome, number> = { champion: 5, promoted: 3, stayed: 2, relegated: 1 };

export interface PlayerSeason {
  games: number;
  points: number;
  rebounds: number;
  assists: number;
}

export interface SeasonRecord {
  season: number;
  division: number;
  position: number;
  wins: number;
  losses: number;
  outcome: SeasonOutcome;
  topScorer: string;
  topScorerPoints: number;
  cards: CardId[];
  /** A tabela final, para o ecrã de fim de época. */
  table: Standing[];
}

export interface ClubState {
  version: number;
  seed: number;
  division: number;
  season: number;
  week: number;
  wins: number;
  losses: number;
  team: Team;
  tactics: Tactics;
  cards: Partial<Record<CardId, number>>;
  /** Combos já descobertos, para os mostrar na lista. */
  knownCombos: string[];
  /** Já treinou esta semana: só se treina uma vez entre jogos. */
  trainedThisWeek: boolean;
  /** De 0 a 100. Abaixo do limite, o treinador é despedido. */
  confidence: number;
  fired: boolean;
  clubs: LeagueClub[];
  divisions: number[][];
  rounds: Fixture[][];
  stats: Record<string, PlayerSeason>;
  history: SeasonRecord[];
  /** O balanço da época que acabou, até o jogador o ver. */
  seasonReport: SeasonRecord | null;
}

/** Os 40 clubes das 4 divisões. O nosso entra na divisão pedida e os outros são repartidos ao acaso. */
function createWorld(seed: number, division: number, playerName: string): { clubs: LeagueClub[]; divisions: number[][] } {
  const rng = makeRng(seed ^ 0x77a1c3);
  const names = shuffled(CLUB_NAMES.filter(name => name !== playerName), rng).slice(0, DIVISIONS.length * LEAGUE_SIZE - 1);
  const clubs: LeagueClub[] = [{ name: playerName, short: shortName(playerName), seed, level: 0 }];
  names.forEach((name, i) => clubs.push({ name, short: shortName(name), seed: (seed * 31 + (i + 1) * 7919) & 0x7fffffff, level: 0 }));
  const others = shuffled(names.map((_, i) => i + 1), rng);
  const divisions: number[][] = DIVISIONS.map((d, index) => {
    const ids = others.splice(0, index === division ? LEAGUE_SIZE - 1 : LEAGUE_SIZE);
    for (const id of ids) clubs[id]!.level = d.level + between(rng, -B.clubLevelSpread, B.clubLevelSpread);
    return index === division ? [PLAYER_CLUB, ...ids] : ids;
  });
  return { clubs, divisions };
}

export function newClub(seed: number, division = 0): ClubState {
  const cards: Partial<Record<CardId, number>> = {};
  for (const card of STARTING_CARDS) cards[card] = (cards[card] ?? 0) + 1;
  const name = CLUB_NAMES[Math.abs(seed) % CLUB_NAMES.length]!;
  // No nosso clube, os movimentos especiais aprendem-se no treino.
  const team = generateTeam(seed * 2 + 1, name, DIVISIONS[division]!.level + B.playerClubLevelOffset);
  const world = createWorld(seed, division, name);
  return {
    version: SAVE_VERSION,
    seed,
    division,
    season: 1,
    week: 1,
    wins: 0,
    losses: 0,
    team: { ...team, short: shortName(name), roster: team.roster.map(player => ({ ...player, moves: [] })) },
    tactics: { ...NEUTRAL_TACTICS },
    cards,
    knownCombos: [],
    trainedThisWeek: false,
    confidence: B.confidenceStart,
    fired: false,
    ...world,
    rounds: roundRobin(world.divisions[division]!, seed),
    stats: {},
    history: [],
    seasonReport: null,
  };
}

/** A semente do jogo desta semana. */
export const weekSeed = (club: ClubState): number => (club.seed + club.season * 10007 + club.week * 97) & 0x7fffffff;

/** O jogo oficial desta semana, ou null numa semana livre. */
export function currentFixture(club: ClubState): Fixture | null {
  const round = weekRound(club.week);
  if (round === null) return null;
  return club.rounds[round]?.find(f => f.home === PLAYER_CLUB || f.away === PLAYER_CLUB) ?? null;
}

/** O adversário desta semana: o da jornada, ou numa semana livre um clube da mesma divisão para um particular. */
export function opponentId(club: ClubState): number {
  const fixture = currentFixture(club);
  if (fixture) return fixture.home === PLAYER_CLUB ? fixture.away : fixture.home;
  const others = club.divisions[club.division]!.filter(id => id !== PLAYER_CLUB);
  return others[weekSeed(club) % others.length]!;
}

const teamCache = new Map<string, Team>();

/** A equipa de outro clube. Gera-se sempre da mesma forma a partir da semente e do nível. */
export function aiTeam(club: LeagueClub): Team {
  const key = `${club.seed}:${club.level}`;
  const cached = teamCache.get(key);
  if (cached) return cached;
  const rng = makeRng(club.seed ^ 0x1f3d5);
  const pick = (): number => TACTIC_CHOICES[Math.floor(next(rng) * TACTIC_CHOICES.length)]!;
  const team: Team = { ...generateTeam(club.seed, club.name, club.level), short: club.short, tactics: { pressure: pick(), spacing: pick(), pace: pick() } };
  if (teamCache.size > 60) teamCache.clear();
  teamCache.set(key, team);
  return team;
}

export const opponentOf = (club: ClubState): Team => aiTeam(club.clubs[opponentId(club)]!);

/** A equipa como entra em campo, com as táticas escolhidas. */
export const clubTeam = (club: ClubState): Team => ({ ...club.team, tactics: club.tactics });

/** Na interface, o nosso clube é sempre a equipa 0. Quando joga fora, é ela a visitante. */
export function visitorOf(club: ClubState): TeamIndex {
  return currentFixture(club)?.away === PLAYER_CLUB ? 0 : 1;
}

export const totalCards = (club: ClubState): number => CARD_IDS.reduce((sum, card) => sum + (club.cards[card] ?? 0), 0);

export const leagueIds = (club: ClubState): number[] => club.divisions[club.division]!;

export const leagueTable = (club: ClubState): Standing[] => standings(leagueIds(club), club.rounds);

export const leaguePosition = (club: ClubState): number => leagueTable(club).findIndex(row => row.club === PLAYER_CLUB);

export type TrainingPlan = Partial<Record<number, CardId[]>>;

export interface TrainingReport {
  playerIndex: number;
  name: string;
  gains: Partial<Record<string, number>>;
  combo: Combo | null;
  isNewCombo: boolean;
  newMove: MoveId | null;
  moveBlocked: boolean;
}

/** Cartas livres, depois de descontar as já escolhidas para outros jogadores. */
export function cardsLeft(club: ClubState, plan: TrainingPlan, card: CardId): number {
  let used = 0;
  for (const cards of Object.values(plan)) used += cards?.filter(c => c === card).length ?? 0;
  return (club.cards[card] ?? 0) - used;
}

/** Aplica o treino da semana. Rejeita um plano que use cartas que o clube não tem. */
export function runTraining(club: ClubState, plan: TrainingPlan): { club: ClubState; reports: TrainingReport[] } {
  if (club.trainedThisWeek) throw new Error('Esta semana já houve treino');
  const remaining = { ...club.cards };
  const rng = makeRng(weekSeed(club) ^ 0x51ed27);
  const known = new Set(club.knownCombos);
  const reports: TrainingReport[] = [];
  const roster = club.team.roster.map((player, index) => {
    const cards = plan[index] ?? [];
    if (cards.length > MAX_CARDS_PER_PLAYER) throw new Error(`${player.name}: demasiadas cartas`);
    for (const card of cards) {
      if (!(card in CARDS)) throw new Error(`Carta desconhecida: ${String(card)}`);
      const left = remaining[card] ?? 0;
      if (left <= 0) throw new Error(`Não há cartas de ${CARDS[card].name}`);
      remaining[card] = left - 1;
    }
    if (cards.length === 0) return independentPractice(player, rng);
    const result = trainPlayer(player, cards);
    const isNewCombo = result.combo !== null && !known.has(result.combo.id);
    if (result.combo) known.add(result.combo.id);
    reports.push({ playerIndex: index, name: player.name, gains: result.gains, combo: result.combo, isNewCombo, newMove: result.newMove, moveBlocked: result.moveBlocked });
    return result.player;
  });
  return {
    club: { ...club, team: { ...club.team, roster }, cards: remaining, knownCombos: [...known], trainedThisWeek: true },
    reports,
  };
}

/** Troca dois jogadores de lugar. Os cinco primeiros são os titulares. */
export function swapPlayers(club: ClubState, a: number, b: number): ClubState {
  const roster = [...club.team.roster];
  [roster[a], roster[b]] = [roster[b]!, roster[a]!];
  return { ...club, team: { ...club.team, roster } };
}

/** Quem não treinou com cartas treina sozinho, e toda a gente descansa um pouco. */
function closeWeek(club: ClubState, played: (index: number) => number): ClubState {
  const rng = makeRng(weekSeed(club) ^ 0x51ed27);
  const roster = club.team.roster.map((player, index) => {
    const practiced = club.trainedThisWeek ? player : independentPractice(player, rng);
    const fatigue = practiced.fatigue * WEEKLY_RECOVERY + (played(index) / 480) * MATCH_FATIGUE;
    return { ...practiced, fatigue: Math.max(0, Math.min(1, Math.round(fatigue * 100) / 100)) };
  });
  const closed: ClubState = { ...club, team: { ...club.team, roster }, week: club.week + 1, trainedThisWeek: false };
  return closed.week > SEASON_WEEKS ? endSeason(closed) : closed;
}

/** Fecha a época: subidas e descidas, prémio em cartas e o calendário da próxima. */
function endSeason(club: ClubState): ClubState {
  const rng = makeRng(club.seed ^ (club.season * 0x9e3779));
  const table = leagueTable(club);
  const position = table.findIndex(row => row.club === PLAYER_CLUB);
  const outcome = seasonOutcome(position, club.division, DIVISIONS.length);
  const orders = club.divisions.map((ids, d) =>
    d === club.division ? table.map(row => row.club) : orderByLevel(ids, id => club.clubs[id]!.level, rng));
  const divisions = moveDivisions(orders);
  const division = divisions.findIndex(ids => ids.includes(PLAYER_CLUB));
  // Quem muda de divisão aproxima-se do nível dela, para as divisões continuarem a ser diferentes.
  const clubs = club.clubs.map((c, id) => {
    const d = divisions.findIndex(ids => ids.includes(id));
    const level = c.level + (DIVISIONS[d]!.level - c.level) * B.clubLevelPull + between(rng, -B.clubLevelDrift, B.clubLevelDrift);
    return { ...c, level: Math.round(level * 10) / 10 };
  });
  const cards = Array.from({ length: SEASON_CARDS[outcome] }, () => CARD_IDS[Math.floor(next(rng) * CARD_IDS.length)]!);
  const owned = { ...club.cards };
  for (const card of cards) owned[card] = (owned[card] ?? 0) + 1;
  const own = table[position]!;
  const scorers = Object.entries(club.stats).sort((a, b) => b[1].points - a[1].points);
  const record: SeasonRecord = {
    season: club.season,
    division: club.division,
    position,
    wins: own.wins,
    losses: own.losses,
    outcome,
    topScorer: scorers[0]?.[0] ?? '',
    topScorerPoints: scorers[0]?.[1].points ?? 0,
    cards,
    table,
  };
  const confidence = Math.max(0, Math.min(100, club.confidence + SEASON_CONFIDENCE[outcome]));
  return {
    ...club,
    division,
    season: club.season + 1,
    week: 1,
    clubs,
    divisions,
    rounds: roundRobin(divisions[division]!, club.seed + club.season * 131),
    cards: owned,
    confidence,
    fired: club.fired || confidence < B.confidenceFired,
    stats: {},
    // Só a última tabela interessa ao ecrã, e as antigas ocupariam o save para nada.
    history: [...club.history.map(past => ({ ...past, table: [] })), record],
    seasonReport: record,
  };
}

export interface MatchResult {
  club: ClubState;
  cards: CardId[];
  /** A jornada toda, com os outros resultados. Null num particular. */
  round: Fixture[] | null;
  confidenceDelta: number;
}

function playRound(club: ClubState, round: number, s: MatchState): Fixture[] {
  return club.rounds[round]!.map((fixture, i) => {
    if (fixture.home === PLAYER_CLUB) return { ...fixture, score: [s.score[0], s.score[1]] };
    if (fixture.away === PLAYER_CLUB) return { ...fixture, score: [s.score[1], s.score[0]] };
    const home = club.clubs[fixture.home]!;
    const away = club.clubs[fixture.away]!;
    const other = simulateMatch(aiTeam(home), aiTeam(away), (weekSeed(club) + (i + 1) * 257) & 0x7fffffff);
    return { ...fixture, score: [other.score[0], other.score[1]] };
  });
}

/** Fecha a semana: resultado, cartas encontradas, confiança, os outros jogos e o cansaço de quem jogou. */
export function finishMatch(club: ClubState, s: MatchState, found: readonly CardId[]): MatchResult {
  const won = s.score[0] > s.score[1];
  const roundIndex = currentFixture(club) ? weekRound(club.week) : null;
  const cards = [...found, ...endOfMatchCards(won, weekSeed(club))];
  const owned = { ...club.cards };
  for (const card of cards) owned[card] = (owned[card] ?? 0) + 1;
  const bodies = s.bodies.filter(b => b.team === 0);
  const stats = { ...club.stats };
  for (const body of bodies) {
    const past = stats[body.player.name] ?? { games: 0, points: 0, rebounds: 0, assists: 0 };
    if (roundIndex !== null && body.line.secondsPlayed > 0) {
      stats[body.player.name] = {
        games: past.games + 1,
        points: past.points + body.line.points,
        rebounds: past.rebounds + body.line.rebounds,
        assists: past.assists + body.line.assists,
      };
    }
  }
  const round = roundIndex === null ? null : playRound(club, roundIndex, s);
  const rounds = round === null ? club.rounds : club.rounds.map((r, i) => (i === roundIndex ? round : r));
  const delta = confidenceChange(won, teamRating(club.team), teamRating(s.teams[1]), roundIndex !== null);
  const confidence = Math.max(0, Math.min(100, club.confidence + delta));
  const updated: ClubState = {
    ...club,
    cards: owned,
    rounds,
    stats,
    confidence,
    fired: confidence < B.confidenceFired,
    wins: club.wins + (won ? 1 : 0),
    losses: club.losses + (won ? 0 : 1),
  };
  return { club: closeWeek(updated, index => bodies[index]?.line.secondsPlayed ?? 0), cards, round, confidenceDelta: delta };
}

/** Numa semana livre, pode-se passar à frente sem jogar. */
export function skipWeek(club: ClubState): ClubState {
  if (currentFixture(club)) throw new Error('Esta semana há jogo oficial');
  return closeWeek(club, () => 0);
}

function validRounds(club: ClubState): boolean {
  const ids = leagueIds(club);
  return club.rounds.length > 0 && club.rounds.every(round => Array.isArray(round) && round.every(f => ids.includes(f.home) && ids.includes(f.away)));
}

/** Um clube guardado antes de haver época entra numa liga nova, com tudo o que já tinha treinado. */
function migrateV1(old: ClubState): ClubState {
  const world = createWorld(old.seed, old.division, old.team.name);
  return {
    ...old,
    version: SAVE_VERSION,
    season: 1,
    week: 1,
    trainedThisWeek: false,
    confidence: B.confidenceStart,
    fired: false,
    ...world,
    rounds: roundRobin(world.divisions[old.division]!, old.seed),
    stats: {},
    history: [],
    seasonReport: null,
  };
}

/** Lê um clube guardado. Devolve null se estiver estragado ou for de outra versão, sem deitar nada fora. */
export function parseClub(text: string | null): ClubState | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as ClubState;
    if (!Number.isInteger(parsed.seed) || !Number.isInteger(parsed.week) || parsed.week < 1) return null;
    if (!Number.isInteger(parsed.division) || parsed.division < 0 || parsed.division >= DIVISIONS.length) return null;
    validateTeam(parsed.team);
    validateTactics(parsed.tactics, parsed.team.name);
    if (typeof parsed.cards !== 'object' || parsed.cards === null) return null;
    for (const [card, count] of Object.entries(parsed.cards)) {
      if (!(card in CARDS) || !Number.isInteger(count) || (count as number) < 0) return null;
    }
    if (!Array.isArray(parsed.knownCombos)) return null;
    if (parsed.version === 1) return migrateV1(parsed);
    if (parsed.version !== SAVE_VERSION) return null;
    if (!Number.isInteger(parsed.season) || parsed.week > SEASON_WEEKS || !Number.isFinite(parsed.confidence)) return null;
    if (!Array.isArray(parsed.clubs) || !Array.isArray(parsed.divisions) || parsed.divisions.length !== DIVISIONS.length) return null;
    if (parsed.divisions.some(ids => !Array.isArray(ids) || ids.length !== LEAGUE_SIZE || ids.some(id => !parsed.clubs[id]))) return null;
    if (!leagueIds(parsed).includes(PLAYER_CLUB) || !Array.isArray(parsed.rounds) || !validRounds(parsed)) return null;
    if (typeof parsed.stats !== 'object' || parsed.stats === null || !Array.isArray(parsed.history)) return null;
    return parsed;
  } catch {
    return null;
  }
}
