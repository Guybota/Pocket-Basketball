import { BALANCE as B } from '../sim/balance.ts';
import { PLAYOFF_FORMATS, PLAYOFF_WEEKS, createPlayoffs, drawNextRound, nextGame, playoffExit, playoffWinner, seriesWinner, seriesWins, type PlayoffState, type Series } from '../sim/playoff.ts';
import { CUP_ROUNDS, CUP_WEEKS, FEDERATION_ROUNDS, createFederationCup, createKnockoutCup, cupExit, cupWinner, drawCupRound, settleCupRound, type CupName, type CupState } from '../sim/cup.ts';
import { LEAGUE_SIZE, PRESEASON_WEEKS, SEASON_CONFIDENCE, SEASON_WEEKS, confidenceChange, moveDivisions, orderByLevel, roundRobin, seasonOutcome, shuffled, standings, weekCup, weekRound, type Fixture, type LeagueClub, type SeasonOutcome, type Standing } from '../sim/league.ts';
import { simulateMatch, type MatchState, type TeamIndex } from '../sim/match.ts';
import { between, chance, makeRng, next, type Rng } from '../sim/rng.ts';
import { DIVISIONS, PLAYER_POOL, ROSTER_SLOTS, dealPool, heightCmOf, levelOfHeight, generatePlayer, generateTeam, generateTeamFrom, playerRating, teamRating } from '../sim/teamgen.ts';
import { CARD_IDS, CARDS, endOfMatchCards, independentPractice, trainPlayer, type CardCategory, type CardId, type TrainingResult } from '../sim/training.ts';
import { NEUTRAL_TACTICS, POSITIONS, validateTactics, validateTeam, type Player, type Position, type Tactics, type Team } from '../sim/types.ts';
import { DEFAULT_KITS, defaultEmblem, validEmblem, validKit, type ClubKit, type Emblem } from './art/kit.ts';
import { clubIdentity } from './art/identity.ts';
import { CLUB_NAMES, FOREIGN_NAMES, shortName } from './setup.ts';

const SAVE_VERSION = 13;
// Nos playoffs, os jogos da série jogam-se na mesma semana, sem descanso pelo meio.
const PLAYOFF_GAME_FATIGUE = 0.6;
// Um jogo inteiro tira 10 % de condição; quem joga e treina todas as semanas fica à volta dos 70 %.
const MATCH_FATIGUE = 0.1;
// Dois períodos sem público cansam metade de um jogo a sério.
const PRACTICE_FATIGUE = 0.5;
export const CLUB_NAME_MAX = 24;
const WEEKLY_RECOVERY = 0.4;
// A resistência faz recuperar mais de semana para semana: com 90, fica 0,38 do cansaço; com 20, 0,59.
const STAMINA_RECOVERY = 0.3;
// Lesões, como no original: quem joga cansado arrisca-se, e fica de fora umas semanas.
const INJURY_BASE = 0.02;
const INJURY_PER_FATIGUE = 8;
const INJURY_MIN_WEEKS = 1;
const INJURY_MAX_WEEKS = 4;
const STARTING_CARDS: readonly CardId[] = ['shooting', 'dribble', 'sprints', 'readDefense', 'weights', 'nap'];
/** O clube do jogador é sempre o número 0 da lista de clubes. */
export const PLAYER_CLUB = 0;
const TACTIC_CHOICES = [-1, 0, 0, 1] as const;
const RECENT_TRAINING = 4;
// Cartas por ganhar cada taça, ou por chegar à final.
const CUP_PRIZES: Record<CupName, { winner: number; finalist: number }> = { federation: { winner: 4, finalist: 2 }, continental: { winner: 5, finalist: 2 }, world: { winner: 6, finalist: 3 } };
/** Os clubes de fora vêm a seguir aos 40 da liga. */
export const FOREIGN_START = DIVISIONS.length * LEAGUE_SIZE;
export const CONTINENTAL_CLUBS = 12;
export const WORLD_CLUB = FOREIGN_START + CONTINENTAL_CLUBS;
const CONTINENTAL_PLACES = 4;
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
  /** As taças ganhas nesta época. */
  cups: CupName[];
  /** Até onde chegou na Taça da Federação: a ronda em que caiu, ou o total se a ganhou. */
  federationExit: number;
  /** O mesmo para a Taça Continental e o Mundial. Null se não entrou. */
  continentalExit: number | null;
  worldExit: number | null;
  /** Nos playoffs: a ronda em que caiu, ou o total se os ganhou. Null se a divisão não tem playoffs ou não se apurou. */
  playoffExit: number | null;
  /** Quem saiu no fim da época, com o potencial esgotado, e quem chegou para o lugar deles. */
  departures: string[];
  arrivals: string[];
  /** O dinheiro ganho em prémios nesta época, em milhares. */
  prizeMoney: number;
  /** Quem saiu, com o que fez no clube, para a despedida. Os clubes guardados antes disto não o têm. */
  farewells?: { player: Player; games: number; points: number; seasons: number }[];
}

/** Um jogador à venda esta semana: livre, ou de outro clube, com o que custa. */
export interface MarketEntry {
  player: Player;
  /** O clube de origem, ou null se está livre. */
  clubId: number | null;
  salary: number;
  /** O que o clube de origem pede. Zero num jogador livre. */
  fee: number;
}

/** Uma proposta a um jogador de outro clube, à espera: o dinheiro já está reservado. */
export interface Offer {
  player: Player;
  clubId: number;
  salary: number;
  fee: number;
  weeksLeft: number;
}

/** Um contrato por renovar no fim da época: o salário de agora e o que o jogador pede. */
export interface Renewal {
  name: string;
  current: number;
  asked: number;
}

/** Uma época acabada na carreira do treinador, em qualquer clube. */
export interface CareerRecord extends SeasonRecord {
  club: string;
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
  /** Quem já treinou esta semana: cada jogador treina uma vez entre jogos. */
  trainedThisWeek: string[];
  /** Um jogo-treino por semana, antes do jogo oficial ou numa semana livre. */
  /** As categorias dos últimos treinos de cada jogador, a mais recente primeiro. */
  /** As últimas semanas de cada jogador (época × 100 + semana): positiva se treinou, negativa se esteve lesionado. Em saves antigos há nomes de categorias, que nunca coincidem. */
  recentTraining: Record<string, (number | CardCategory)[]>;
  /** O número da camisola não muda quando o jogador troca de lugar no plantel. */
  shirts: Record<string, number>;
  emblem: Emblem;
  kits: ClubKit[];
  kitChoice: string;
  /** As épocas feitas noutros clubes. Os troféus são do treinador, por isso não se perdem com o clube. */
  career: CareerRecord[];
  /** A época em que cada jogador chegou ao clube. */
  joined: Record<string, number>;
  /** O orçamento desta época e o salário de cada jogador, em milhares. O que sobra é para contratar. */
  money: number;
  salaries: Record<string, number>;
  /** As renovações por decidir, entre o balanço da época e a época seguinte. */
  pendingRenewals: Renewal[] | null;
  /** As propostas a jogadores de outros clubes, à espera de resposta. */
  offers: Offer[];
  /** De 0 a 100. Abaixo do limite, o treinador é despedido. */
  confidence: number;
  fired: boolean;
  clubs: LeagueClub[];
  divisions: number[][];
  rounds: Fixture[][];
  /** As taças desta época. Por agora só a da Federação; as outras entram no passo 2 da Fase 4. */
  cups: Partial<Record<CupName, CupState>> & { federation: CupState; continental: CupState };
  /** Os 4 da Pro Liga 1 que jogam a Taça Continental nesta época. */
  continentalQualified: number[];
  /** Os playoffs desta época, depois da fase regular, nas divisões que os têm. */
  playoffs: PlayoffState | null;
  stats: Record<string, PlayerSeason>;
  history: SeasonRecord[];
  /** O balanço da época que acabou, até o jogador o ver. */
  seasonReport: SeasonRecord | null;
}

/** Os 40 clubes das 4 divisões, sempre os mesmos em cada divisão, como no original. O nosso entra na divisão pedida no lugar do último dela. */
function createWorld(seed: number, division: number, playerName: string): { clubs: LeagueClub[]; divisions: number[][] } {
  const rng = makeRng(seed ^ 0x77a1c3);
  const clubs: LeagueClub[] = [{ name: playerName, short: shortName(playerName), seed, level: 0 }];
  const spare = CLUB_NAMES[DIVISIONS.length * LEAGUE_SIZE]!;
  const divisions: number[][] = DIVISIONS.map((d, index) => {
    // Se o nosso clube tem o nome de um clube da lista, esse sai e entra o de reserva.
    const group = CLUB_NAMES.slice(index * LEAGUE_SIZE, (index + 1) * LEAGUE_SIZE).filter(name => name !== playerName);
    if (group.length < LEAGUE_SIZE) group.push(spare);
    const ids = group.slice(0, index === division ? LEAGUE_SIZE - 1 : LEAGUE_SIZE).map(name => {
      clubs.push({ name, short: shortName(name), seed: (seed * 31 + clubs.length * 7919) & 0x7fffffff, level: d.level + between(rng, -B.clubLevelSpread, B.clubLevelSpread) });
      return clubs.length - 1;
    });
    return index === division ? [PLAYER_CLUB, ...ids] : ids;
  });
  // Os jogadores vêm todos do mesmo pool, repartidos ao acaso nesta carreira.
  const deal = dealPool(rng, clubs.length);
  clubs.forEach((club, i) => {
    club.players = deal[i];
  });
  clubs.push(...foreignClubs(seed, rng));
  return { clubs, divisions };
}

/** Os clubes de fora, sempre pela mesma ordem: 12 continentais e o campeão de outro continente. */
function foreignClubs(seed: number, rng: Rng): LeagueClub[] {
  const top = DIVISIONS[DIVISIONS.length - 1]!.level;
  return FOREIGN_NAMES.map((name, i) => ({
    name,
    short: shortName(name),
    seed: (seed * 31 + (FOREIGN_START + i + 1) * 7919) & 0x7fffffff,
    level: Math.round((top + (i === CONTINENTAL_CLUBS ? B.worldLevelOffset : B.continentalLevelOffset + between(rng, -B.clubLevelSpread, B.clubLevelSpread))) * 10) / 10,
  }));
}

/** A Taça Continental desta época: os apurados da Pro Liga 1 e os 12 de fora. */
const continentalCup = (qualified: readonly number[]): CupState =>
  createKnockoutCup([...qualified, ...Array.from({ length: CONTINENTAL_CLUBS }, (_, i) => FOREIGN_START + i)]);

/** Na primeira época ainda não há classificação: entram os 4 mais fortes da Pro Liga 1. */
const firstQualified = (clubs: readonly LeagueClub[], divisions: readonly (readonly number[])[], seed: number): number[] =>
  orderByLevel(divisions[DIVISIONS.length - 1]!, id => clubs[id]!.level, makeRng(seed ^ 0x5a17)).slice(0, CONTINENTAL_PLACES);

/** O salário que um jogador vale: pela nota, e um pouco mais por quem ainda vai crescer. */
export const salaryFor = (player: Player): number => Math.round(B.salaryBase + B.salaryPerPoint * playerRating(player) + B.salaryPotentialWeight * Math.max(0, player.potential - 50));

const salariesFor = (team: Team): Record<string, number> => Object.fromEntries(team.roster.map(player => [player.name, salaryFor(player)]));

/** O que um clube guarda além da liga, com os valores de quem acabou de chegar. */
const clubExtras = (team: Team, division = 0, season = 1): Pick<ClubState, 'recentTraining' | 'shirts' | 'emblem' | 'kits' | 'kitChoice' | 'joined' | 'money' | 'salaries' | 'pendingRenewals' | 'offers'> => ({
  offers: [],
  joined: Object.fromEntries(team.roster.map(player => [player.name, season])),
  money: B.budgetByDivision[division]!,
  salaries: salariesFor(team),
  pendingRenewals: null,
  recentTraining: {},
  shirts: Object.fromEntries(team.roster.map((player, index) => [player.name, index + 4])),
  emblem: defaultEmblem(team.short),
  kits: DEFAULT_KITS.map(kit => ({ ...kit })),
  kitChoice: DEFAULT_KITS[0]!.id,
});

export function newClub(seed: number, division = 0, career: CareerRecord[] = []): ClubState {
  const cards: Partial<Record<CardId, number>> = {};
  for (const card of STARTING_CARDS) cards[card] = (cards[card] ?? 0) + 1;
  const name = CLUB_NAMES[Math.abs(seed) % CLUB_NAMES.length]!;
  const world = createWorld(seed, division, name);
  // No nosso clube, os movimentos especiais aprendem-se no treino.
  const team = generateTeamFrom(world.clubs[PLAYER_CLUB]!.players!.map(i => PLAYER_POOL[i]!), seed * 2 + 1, name, DIVISIONS[division]!.level + B.playerClubLevelOffset);
  const squad: Team = { ...team, short: shortName(name), roster: team.roster.map(player => ({ ...player, moves: [] })) };
  const qualified = firstQualified(world.clubs, world.divisions, seed);
  return {
    version: SAVE_VERSION,
    seed,
    division,
    season: 1,
    week: 1,
    wins: 0,
    losses: 0,
    team: squad,
    tactics: { ...NEUTRAL_TACTICS },
    cards,
    knownCombos: [],
    trainedThisWeek: [],
    ...clubExtras(squad, division),
    career,
    confidence: B.confidenceStart,
    fired: false,
    ...world,
    rounds: roundRobin(world.divisions[division]!, seed),
    cups: { federation: createFederationCup(world.divisions, id => world.clubs[id]!.level), continental: continentalCup(qualified) },
    continentalQualified: qualified,
    playoffs: null,
    stats: {},
    history: [],
    seasonReport: null,
  };
}

/** O jogo oficial desta semana e o que ele é: jornada da liga ou ronda de uma taça. */
export interface OfficialGame {
  fixture: Fixture;
  cup: CupName | null;
  playoff: boolean;
  round: number;
}

const inSeries = (series: Series): boolean => series.top === PLAYER_CLUB || series.bottom === PLAYER_CLUB;

/** A ronda dos playoffs que esta semana joga, a contar do zero, ou null fora deles. */
export const playoffRound = (club: ClubState): number | null => (club.playoffs && club.week > SEASON_WEEKS ? club.week - SEASON_WEEKS - 1 : null);

/** A nossa série nesta ronda dos playoffs, se estivermos nela. */
export function currentSeries(club: ClubState): Series | null {
  const round = playoffRound(club);
  return round === null ? null : club.playoffs!.rounds[round]?.find(inSeries) ?? null;
}

export function currentGame(club: ClubState): OfficialGame | null {
  const mine = (f: Fixture): boolean => f.home === PLAYER_CLUB || f.away === PLAYER_CLUB;
  const series = currentSeries(club);
  if (series) {
    const game = nextGame(series);
    return game ? { fixture: game, cup: null, playoff: true, round: playoffRound(club)! } : null;
  }
  const round = weekRound(club.week);
  if (round !== null) {
    const fixture = club.rounds[round]?.find(mine);
    return fixture ? { fixture, cup: null, playoff: false, round } : null;
  }
  const cup = weekCup(club.week);
  const state = cup ? club.cups[cup.cup] : undefined;
  if (!cup || !state) return null;
  const fixture = state.rounds[cup.round]?.find(mine);
  return fixture ? { fixture, cup: cup.cup, playoff: false, round: cup.round } : null;
}

/** O nome da ronda de uma taça. */
export const cupRoundName = (cup: CupName, round: number): string => CUP_ROUNDS[cup][round] ?? `Ronda ${round + 1}`;

/** A semente do jogo desta semana. */
export const weekSeed = (club: ClubState): number => (club.seed + club.season * 10007 + club.week * 97) & 0x7fffffff;

/** O jogo oficial desta semana, ou null numa semana livre. */
export const currentFixture = (club: ClubState): Fixture | null => currentGame(club)?.fixture ?? null;

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
  const defense = next(rng) < 0.3 ? 'zone' : 'man';
  const generated = club.players ? generateTeamFrom(club.players.map(i => PLAYER_POOL[i]!), club.seed, club.name, club.level) : generateTeam(club.seed, club.name, club.level);
  // Os adversários montam o ataque para os seus dois titulares mais fortes.
  const strength = (p: Player): number => Object.values(p.attributes).reduce((sum, value) => sum + value, 0);
  const options = [...generated.roster.slice(0, 5)].sort((a, b) => strength(b) - strength(a)).slice(0, 2).map(p => p.name);
  const team: Team = { ...generated, short: club.short, tactics: { pressure: pick(), spacing: pick(), pace: pick(), defense, options } };
  if (teamCache.size > 60) teamCache.clear();
  teamCache.set(key, team);
  return team;
}

export const opponentOf = (club: ClubState): Team => aiTeam(club.clubs[opponentId(club)]!);

/** A cor de cada clube da liga, para o pavilhão dele: a cor principal do emblema. */
export const clubColor = (club: LeagueClub): string => clubIdentity(club.name).emblem.primary;

/** A equipa como entra em campo, com as táticas escolhidas. */
/** A equipa que vai a jogo: os lesionados ficam de fora, se sobrarem cinco. */
export function clubTeam(club: ClubState): Team {
  const fit = club.team.roster.filter(p => !p.injuryWeeks);
  return { ...club.team, roster: fit.length >= 5 ? fit : club.team.roster, tactics: club.tactics };
}

/** Segundos jogados por cada jogador do plantel, pelo nome, porque os lesionados não vão a jogo. */
const secondsPlayedBy = (club: ClubState, s: MatchState): ((index: number) => number) => {
  const bodies = s.bodies.filter(b => b.team === 0);
  return index => bodies.find(b => b.player.name === club.team.roster[index]!.name)?.line.secondsPlayed ?? 0;
};

/** Na interface, o nosso clube é sempre a equipa 0. Quando joga fora, é ela a visitante. */
export function visitorOf(club: ClubState): TeamIndex {
  return currentFixture(club)?.away === PLAYER_CLUB ? 0 : 1;
}

export const totalCards = (club: ClubState): number => CARD_IDS.reduce((sum, card) => sum + (club.cards[card] ?? 0), 0);

export const leagueIds = (club: ClubState): number[] => club.divisions[club.division]!;

export const leagueTable = (club: ClubState): Standing[] => standings(leagueIds(club), club.rounds);

export interface SeasonLine {
  games: number;
  points: number;
  rebounds: number;
  assists: number;
}

// Dos pontos da equipa, quantos ressaltos e assistências lhe costumam corresponder, e quanto joga cada lugar do plantel.
const TEAM_REBOUNDS_PER_POINT = 0.45;
const TEAM_ASSISTS_PER_POINT = 0.35;
const shareOfMinutes = (index: number): number => (index < 5 ? 1 : index < 10 ? 0.4 : 0.15);

/** Os números da época de cada jogador de um clube, pela ordem do plantel. */
export function seasonLines(club: ClubState, id: number, team: Team): SeasonLine[] {
  if (id === PLAYER_CLUB) return team.roster.map(p => club.stats[p.name] ?? { games: 0, points: 0, rebounds: 0, assists: 0 });
  // shortcut: dos jogos dos outros só se guarda o resultado, por isso os pontos reais da equipa repartem-se pelas notas; para números reais seria preciso simular jogador a jogador.
  const played = club.rounds.flat().filter(f => f.score && (f.home === id || f.away === id));
  const points = played.reduce((sum, f) => sum + (f.home === id ? f.score![0] : f.score![1]), 0);
  const split = (total: number, weight: (p: Player) => number): number[] => {
    const weights = team.roster.map((p, i) => weight(p) * weight(p) * shareOfMinutes(i));
    const sum = weights.reduce((x, y) => x + y, 0);
    return weights.map(w => (total * w) / sum);
  };
  const scored = split(points, p => p.attributes.shooting);
  const rebounds = split(points * TEAM_REBOUNDS_PER_POINT, p => p.attributes.jumping + (heightCmOf(p) - 165));
  const assists = split(points * TEAM_ASSISTS_PER_POINT, p => p.attributes.technique);
  return team.roster.map((_, i) => ({ games: played.length, points: scored[i]!, rebounds: rebounds[i]!, assists: assists[i]! }));
}

/** As três últimas épocas de um clube, para a ficha da federação. O lugar é null quando o nosso clube ainda não existia. */
export function clubSeasons(club: ClubState, id: number): { label: string; division: number; position: number | null }[] {
  const division = club.divisions.findIndex(ids => ids.includes(id));
  // Os clubes de fora e os adversários especiais não têm épocas nas nossas ligas.
  if (division < 0) return [];
  const now = division === club.division
    ? leagueTable(club).findIndex(row => row.club === id)
    : [...club.divisions[division]!].sort((a, b) => club.clubs[b]!.level - club.clubs[a]!.level).indexOf(id);
  const info = club.clubs[id]!;
  const earlier = (n: number): { division: number; position: number | null } => {
    const known = info.past?.[n];
    if (known) return known;
    if (id === PLAYER_CLUB) return { division, position: null };
    // shortcut: antes da carreira não houve jogos, por isso o passado dos outros clubes é inventado pela semente; deixa de contar à medida que as épocas se jogam.
    return { division, position: (info.seed >>> (n * 5 + 3)) % LEAGUE_SIZE };
  };
  return [{ label: 'Esta época', division, position: now }, { label: 'Época passada', ...earlier(0) }, { label: 'Há 2 épocas', ...earlier(1) }];
}

export const leaguePosition = (club: ClubState): number => leagueTable(club).findIndex(row => row.club === PLAYER_CLUB);

/** O nome que o treinador escolhe. O nome curto e as letras do emblema acompanham-no, se ainda eram os de origem. */
export function renameClub(club: ClubState, name: string): ClubState {
  const trimmed = name.trim().replace(/\s+/g, ' ').slice(0, CLUB_NAME_MAX);
  if (!trimmed) return club;
  const short = shortName(trimmed);
  const emblem = club.emblem.letters === club.team.short ? { ...club.emblem, letters: short } : club.emblem;
  return {
    ...club,
    team: { ...club.team, name: trimmed, short },
    clubs: club.clubs.map((entry, id) => (id === PLAYER_CLUB ? { ...entry, name: trimmed, short } : entry)),
    emblem,
  };
}

/** Há quantas épocas o jogador está no clube. */
export const yearsAtClub = (club: ClubState, name: string): number => club.season - (club.joined[name] ?? 1) + 1;

export const totalSalaries = (club: ClubState): number => club.team.roster.reduce((sum, player) => sum + (club.salaries[player.name] ?? salaryFor(player)), 0);

/** O que sobra do orçamento depois dos salários: é com isto que se contrata. */
export const surplus = (club: ClubState): number => club.money - totalSalaries(club);

/** O próximo número de camisola livre. */
const nextShirt = (club: ClubState): number => {
  const used = new Set(Object.values(club.shirts));
  let n = 4;
  while (used.has(n)) n++;
  return n;
};

/** Um jogador livre entra no plantel, com salário, número e data de chegada. */
export function signPlayer(club: ClubState, player: Player, salary = salaryFor(player)): ClubState {
  if (club.team.roster.length >= B.squadMax) throw new Error('O plantel está cheio');
  if (club.team.roster.some(p => p.name === player.name)) throw new Error(`${player.name} já está no clube`);
  return {
    ...club,
    team: { ...club.team, roster: [...club.team.roster, player] },
    shirts: { ...club.shirts, [player.name]: nextShirt(club) },
    joined: { ...club.joined, [player.name]: club.season },
    salaries: { ...club.salaries, [player.name]: salary },
  };
}

/** Um jogador sai do clube. O que ficar abaixo do mínimo é preenchido com jogadores livres gerados. */
export function releasePlayer(club: ClubState, name: string): ClubState {
  const roster = club.team.roster.filter(p => p.name !== name);
  if (roster.length === club.team.roster.length) throw new Error(`${name} não está no clube`);
  const drop = <T>(record: Record<string, T>): Record<string, T> => Object.fromEntries(Object.entries(record).filter(([key]) => key !== name));
  return { ...club, team: { ...club.team, roster }, shirts: drop(club.shirts), joined: drop(club.joined), salaries: drop(club.salaries), recentTraining: drop(club.recentTraining) };
}

/** O molde de geração de quem ocupava um lugar: os cinco lugares em campo têm papéis, e a lista repete-os. */
const archetypeOf = (club: ClubState, name: string): Position => POSITIONS[Math.max(0, club.team.roster.findIndex(p => p.name === name)) % POSITIONS.length]!;

/** Quem sai é substituído por um jogador livre gerado com o molde do lugar dele, fraco e com futuro. */
function fillSquad(club: ClubState, positions: readonly Position[], salt: number, target: number = B.squadMin): { club: ClubState; arrivals: string[] } {
  let current = club;
  const arrivals: string[] = [];
  const rng = makeRng((club.seed + club.season * 7919 + salt) & 0x7fffffff);
  let i = 0;
  while (current.team.roster.length < Math.min(B.squadMax, target)) {
    const position = positions[i] ?? POSITIONS[current.team.roster.length % POSITIONS.length]!;
    const potential = between(rng, B.freeAgentPotentialMin, B.freeAgentPotentialMax);
    const player = generatePlayer((club.seed * 31 + club.season * 101 + i * 17 + salt) & 0x7fffffff, position, DIVISIONS[current.division]!.level + B.freeAgentLevelOffset, potential, current.team.roster.map(p => p.name));
    current = signPlayer(current, player);
    arrivals.push(player.name);
    i++;
  }
  return { club: current, arrivals };
}

/** As renovações decididas: quem fica paga o que pediu, quem sai sai, e o plantel enche-se até ao mínimo. */
export function applyRenewals(club: ClubState, keep: readonly string[]): ClubState {
  const renewals = club.pendingRenewals;
  if (!renewals) throw new Error('Não há renovações por decidir');
  const kept = renewals.filter(r => keep.includes(r.name));
  const total = kept.reduce((sum, r) => sum + r.asked, 0);
  if (total > club.money) throw new Error('Os salários passam do orçamento');
  let current: ClubState = { ...club, pendingRenewals: null, salaries: Object.fromEntries(kept.map(r => [r.name, r.asked])) };
  const released = renewals.filter(r => !keep.includes(r.name));
  const positions = released.map(r => archetypeOf(club, r.name));
  for (const r of released) current = releasePlayer(current, r.name);
  return fillSquad(current, positions, 1).club;
}

// Prognóstico: cada ponto de nota vale 3,5% e jogar em casa 4%.
const FORECAST_PER_POINT = 0.035;
const FORECAST_HOME = 0.04;

/** Prognóstico do jogo, como no original: a hipótese de ganharmos, em percentagem, pelas notas e por jogar em casa. */
export function forecast(club: ClubState, rival: Team, home: boolean): number {
  const edge = (teamRating(clubTeam(club)) - teamRating(rival)) * FORECAST_PER_POINT + (home ? FORECAST_HOME : -FORECAST_HOME);
  return Math.round(Math.max(5, Math.min(95, 50 + edge * 100)));
}

export interface OtherGame {
  home: number;
  away: number;
  s: MatchState;
}

/** Os outros jogos desta jornada ou ronda de taça, simulados já com as sementes com que a semana os fecha: para se verem a decorrer. */
export function liveOtherGames(club: ClubState): OtherGame[] {
  const game = currentGame(club);
  if (!game || game.playoff) return [];
  const fixtures = game.cup ? club.cups[game.cup]?.rounds[game.round] : club.rounds[game.round];
  if (!fixtures) return [];
  return fixtures.flatMap((fixture, i) => {
    if (fixture.home === PLAYER_CLUB || fixture.away === PLAYER_CLUB || fixture.score) return [];
    return [{ home: fixture.home, away: fixture.away, s: simulateMatch(aiTeam(club.clubs[fixture.home]!), aiTeam(club.clubs[fixture.away]!), (weekSeed(club) + (i + 1) * 257) & 0x7fffffff) }];
  });
}

/** O resultado de um jogo simulado no ponto do relógio em que vai o nosso. */
export function scoreAt(s: MatchState, period: number, clock: number): [number, number] {
  const score: [number, number] = [0, 0];
  for (const e of s.events) {
    if (e.period > period || (e.period === period && e.clock < clock)) break;
    if (e.type === 'made') score[e.team] += e.points!;
    else if (e.type === 'freeThrowMade') score[e.team] += 1;
  }
  return score;
}

/** A classificação com os jogos desta jornada como vão neste momento. Nas taças e nos playoffs não há tabela. */
export function liveTable(club: ClubState, ours: MatchState, others: readonly OtherGame[], period: number, clock: number): Standing[] | null {
  const game = currentGame(club);
  if (!game || game.cup || game.playoff) return null;
  const mine = game.fixture;
  const live: Fixture[] = [
    { ...mine, score: mine.home === PLAYER_CLUB ? [ours.score[0], ours.score[1]] : [ours.score[1], ours.score[0]] },
    ...others.map(o => ({ home: o.home, away: o.away, score: scoreAt(o.s, period, clock) })),
  ];
  const rounds = club.rounds.map((round, i) => (i === game.round ? round.map(f => live.find(l => l.home === f.home && l.away === f.away) ?? f) : round));
  return standings(leagueIds(club), rounds);
}

/** O valor de um jogador no mercado. */
export const transferFee = (player: Player): number => Math.round(salaryFor(player) * B.transferFeeFactor);

/** O que está à venda esta semana: alguns livres e alguns de clubes da nossa divisão ou da de cima. Muda todas as semanas. */
export function marketList(club: ClubState): MarketEntry[] {
  const rng = makeRng((weekSeed(club) ^ 0x6d4a7b) & 0x7fffffff);
  const taken = new Set([...club.team.roster.map(p => p.name), ...club.offers.map(o => o.player.name)]);
  const level = DIVISIONS[club.division]!.level;
  const entries: MarketEntry[] = [];
  for (let i = 0; i < B.marketFreeAgents; i++) {
    const position = POSITIONS[Math.floor(next(rng) * POSITIONS.length)]!;
    const player = generatePlayer((weekSeed(club) + i * 977) & 0x7fffffff, position, level + between(rng, -8, 4), between(rng, 30, 85), [...taken]);
    taken.add(player.name);
    entries.push({ player, clubId: null, salary: salaryFor(player), fee: 0 });
  }
  const pool = [...club.divisions[club.division]!, ...(club.divisions[club.division + 1] ?? [])].filter(id => id !== PLAYER_CLUB);
  for (let i = 0; i < B.marketClubPlayers; i++) {
    const clubId = pool[Math.floor(next(rng) * pool.length)]!;
    const roster = aiTeam(club.clubs[clubId]!).roster;
    const player = roster[Math.floor(next(rng) * roster.length)]!;
    if (taken.has(player.name)) continue;
    taken.add(player.name);
    entries.push({ player, clubId, salary: salaryFor(player), fee: transferFee(player) });
  }
  return entries;
}

export const transferWindowOpen = (club: ClubState): boolean => club.week <= B.transferDeadlineWeek;

/** Uma proposta: um jogador livre entra logo; um de outro clube demora semanas e pode recusar, com o dinheiro reservado entretanto. */
export function makeOffer(club: ClubState, entry: MarketEntry): ClubState {
  const cost = entry.salary + entry.fee;
  if (club.team.roster.length + club.offers.length >= B.squadMax) throw new Error('O plantel está cheio');
  if (surplus(club) < cost) throw new Error('Não há dinheiro para esta proposta');
  if (entry.clubId === null) return signPlayer(club, entry.player, entry.salary);
  if (!transferWindowOpen(club)) throw new Error('O prazo das transferências já passou');
  const rng = makeRng((weekSeed(club) + entry.player.name.length * 131) & 0x7fffffff);
  const weeksLeft = Math.floor(between(rng, B.offerMinWeeks, B.offerMaxWeeks + 1));
  return { ...club, money: club.money - entry.fee, offers: [...club.offers, { player: entry.player, clubId: entry.clubId, salary: entry.salary, fee: entry.fee, weeksLeft }] };
}

export function cancelOffer(club: ClubState, name: string): ClubState {
  const offer = club.offers.find(o => o.player.name === name);
  if (!offer) throw new Error('Não há proposta a esse jogador');
  return { ...club, money: club.money + offer.fee, offers: club.offers.filter(o => o !== offer) };
}

/** Vender: o jogador sai e o clube recebe o valor dele. Nunca abaixo do mínimo do plantel. */
export function sellPlayer(club: ClubState, name: string): ClubState {
  if (club.team.roster.length <= B.squadMin) throw new Error(`O plantel não pode ter menos de ${B.squadMin} jogadores`);
  const player = club.team.roster.find(p => p.name === name);
  if (!player) throw new Error(`${name} não está no clube`);
  return { ...releasePlayer(club, name), money: club.money + transferFee(player) };
}

/** No fim da semana, as propostas avançam: aceites entram, recusadas devolvem o dinheiro. */
function settleOffers(club: ClubState): { club: ClubState; accepted: string[]; refused: string[] } {
  const rng = makeRng((weekSeed(club) ^ 0x3f1a9c) & 0x7fffffff);
  let current = club;
  const accepted: string[] = [];
  const refused: string[] = [];
  const remaining: Offer[] = [];
  for (const offer of club.offers) {
    const weeksLeft = offer.weeksLeft - 1;
    if (weeksLeft > 0) {
      remaining.push({ ...offer, weeksLeft });
      continue;
    }
    const room = current.team.roster.length < B.squadMax && !current.team.roster.some(p => p.name === offer.player.name);
    if (room && next(rng) < B.offerAcceptChance) {
      current = signPlayer(current, offer.player, offer.salary);
      accepted.push(offer.player.name);
    } else {
      current = { ...current, money: current.money + offer.fee };
      refused.push(offer.player.name);
    }
  }
  return { club: { ...current, offers: remaining }, accepted, refused };
}

/** Decide as renovações sozinho: fica toda a gente que couber, a começar pelos melhores. */
export function autoRenew(club: ClubState): ClubState {
  if (!club.pendingRenewals) return club;
  const byRating = [...club.pendingRenewals].sort((a, b) => playerRating(club.team.roster.find(p => p.name === b.name)!) - playerRating(club.team.roster.find(p => p.name === a.name)!));
  const keep: string[] = [];
  let total = 0;
  for (const r of byRating) {
    if (total + r.asked <= club.money) {
      keep.push(r.name);
      total += r.asked;
    }
  }
  return applyRenewals(club, keep);
}

export const activeKit = (club: ClubState): ClubKit => club.kits.find(kit => kit.id === club.kitChoice) ?? club.kits[0]!;

/** Toda a carreira do treinador, incluindo as épocas neste clube. */
export const careerOf = (club: ClubState): CareerRecord[] =>
  [...club.career, ...club.history.map(record => ({ ...record, club: club.team.name, table: [] }))];

/** O nome e as regras dos playoffs da divisão do clube, se os houver. */
export const playoffFormat = (club: ClubState) => PLAYOFF_FORMATS[club.division];

/** Onde o clube está numa taça, para os ecrãs. `entered` diz se chegou a entrar nela. */
export function cupStatus(club: ClubState, cup: CupName): { entered: boolean; alive: boolean; exit: number | null; winner: number | null } {
  const state = club.cups[cup];
  if (!state) return { entered: false, alive: false, exit: null, winner: null };
  const entered = cup === 'federation' || state.alive.includes(PLAYER_CLUB) || state.rounds.some(r => r.some(f => f.home === PLAYER_CLUB || f.away === PLAYER_CLUB));
  return { entered, alive: state.alive.includes(PLAYER_CLUB), exit: entered ? cupExit(state, PLAYER_CLUB, CUP_ROUNDS[cup].length) : null, winner: cupWinner(state, CUP_ROUNDS[cup].length) };
}

export interface TrainingOutcome {
  club: ClubState;
  result: TrainingResult;
  isNewCombo: boolean;
}

/** Treina um jogador, logo, com as cartas escolhidas. Cada jogador treina uma vez por semana. */
export function trainOne(club: ClubState, index: number, cards: readonly CardId[]): TrainingOutcome {
  const player = club.team.roster[index];
  if (!player) throw new Error(`Não há jogador ${index}`);
  if (club.trainedThisWeek.includes(player.name)) throw new Error(`${player.name} já treinou esta semana`);
  if (player.injuryWeeks) throw new Error(`${player.name} está lesionado`);
  if (cards.length === 0) throw new Error('Falta escolher as cartas');
  const owned = { ...club.cards };
  for (const card of cards) {
    if (!(card in CARDS)) throw new Error(`Carta desconhecida: ${String(card)}`);
    const left = owned[card] ?? 0;
    if (left <= 0) throw new Error(`Não há cartas de ${CARDS[card].name}`);
    owned[card] = left - 1;
  }
  const result = trainPlayer(player, cards);
  const isNewCombo = result.combo !== null && !club.knownCombos.includes(result.combo.id);
  return {
    result,
    isNewCombo,
    club: {
      ...club,
      cards: owned,
      team: { ...club.team, roster: club.team.roster.map((p, i) => (i === index ? result.player : p)) },
      knownCombos: isNewCombo ? [...club.knownCombos, result.combo!.id] : club.knownCombos,
      trainedThisWeek: [...club.trainedThisWeek, player.name],
      recentTraining: { ...club.recentTraining, [player.name]: [club.season * 100 + club.week, ...(club.recentTraining[player.name] ?? [])].slice(0, RECENT_TRAINING) },
    },
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
    const injured = (player.injuryWeeks ?? 0) > 0;
    const practiced = injured || club.trainedThisWeek.includes(player.name) ? player : independentPractice(player, rng);
    const recovery = WEEKLY_RECOVERY - ((practiced.attributes.stamina - 50) / 100) * STAMINA_RECOVERY;
    const fatigue = practiced.fatigue * recovery + (played(index) / 480) * MATCH_FATIGUE;
    const next: Player = { ...practiced, fatigue: Math.max(0, Math.min(1, Math.round(fatigue * 100) / 100)) };
    // Quem jogou com a condição em baixo pode lesionar-se; quem está lesionado conta mais uma semana de recuperação.
    let injuryWeeks = Math.max(0, (player.injuryWeeks ?? 0) - 1);
    if (!injured && played(index) > 0 && chance(rng, INJURY_BASE * (1 + INJURY_PER_FATIGUE * player.fatigue))) injuryWeeks = Math.round(between(rng, INJURY_MIN_WEEKS, INJURY_MAX_WEEKS));
    if (injuryWeeks > 0) next.injuryWeeks = injuryWeeks;
    else delete next.injuryWeeks;
    return next;
  });
  // Os alvos são do adversário desta semana, por isso não passam para a seguinte.
  const settled = settleOffers({ ...settlePendingCup(club), team: { ...club.team, roster } }).club;
  const recentTraining = { ...settled.recentTraining };
  for (const player of club.team.roster) {
    if ((player.injuryWeeks ?? 0) > 0) recentTraining[player.name] = [-(club.season * 100 + club.week), ...(recentTraining[player.name] ?? [])].slice(0, RECENT_TRAINING);
  }
  const closed: ClubState = { ...settled, recentTraining, tactics: { ...club.tactics, focus: [] }, week: club.week + 1, trainedThisWeek: [] };
  return closed.week > SEASON_WEEKS ? afterRegularSeason(closed) : drawCups(closed);
}

/** Joga uma série inteira entre dois clubes da simulação, jogo a jogo. */
function simulateSeries(club: ClubState, series: Series, salt: number): Series {
  let current = series;
  for (let game = nextGame(current); game; game = nextGame(current)) {
    const s = simulateMatch(aiTeam(club.clubs[game.home]!), aiTeam(club.clubs[game.away]!), (weekSeed(club) + salt * 257 + current.games.length * 31) & 0x7fffffff);
    current = { ...current, games: [...current.games, { ...game, score: [s.score[0], s.score[1]] }] };
  }
  return current;
}

/** Fecha a ronda atual dos playoffs, jogando as séries dos outros, e monta a seguinte. */
function settlePlayoffRound(club: ClubState, state: PlayoffState, round: number): PlayoffState {
  const settled = state.rounds[round]!.map((series, i) => (seriesWinner(series) !== null ? series : simulateSeries(club, series, (round + 1) * 10 + i)));
  return drawNextRound({ ...state, rounds: state.rounds.map((r, i) => (i === round ? settled : r)) });
}

/** Sem nós em prova, o resto dos playoffs joga-se de uma vez. */
function resolvePlayoffs(club: ClubState, state: PlayoffState): PlayoffState {
  let current = state;
  while (playoffWinner(current) === null) current = settlePlayoffRound(club, current, current.rounds.length - 1);
  return current;
}

/** Acabou a fase regular, ou mais uma semana de playoffs: há playoffs para nós, ou a época fecha-se. */
function afterRegularSeason(club: ClubState): ClubState {
  if (!club.playoffs) {
    const state = createPlayoffs(club.division, leagueTable(club).map(row => row.club));
    if (!state) return endSeason(club);
    const inside = state.seeds.includes(PLAYER_CLUB);
    return inside ? { ...club, playoffs: state } : endSeason({ ...club, playoffs: resolvePlayoffs(club, state) });
  }
  const { playoffs } = club;
  const round = playoffRound(club)!;
  const stillIn = playoffs.rounds[round]?.some(inSeries) ?? false;
  if (stillIn) return club;
  return endSeason({ ...club, playoffs: resolvePlayoffs(club, playoffs) });
}

/** Numa semana de taça em que não jogámos, os jogos dos outros simulam-se na mesma, para a ronda ficar fechada. */
function settlePendingCup(club: ClubState): ClubState {
  const cup = weekCup(club.week);
  const state = cup ? club.cups[cup.cup] : undefined;
  if (!cup || !state) return club;
  const fixtures = state.rounds[cup.round];
  if (!fixtures || fixtures.every(f => f.score)) return club;
  const played = fixtures.map((fixture, i) => {
    if (fixture.score) return fixture;
    const other = simulateMatch(aiTeam(club.clubs[fixture.home]!), aiTeam(club.clubs[fixture.away]!), (weekSeed(club) + (i + 1) * 257) & 0x7fffffff);
    return { ...fixture, score: [other.score[0], other.score[1]] as [number, number] };
  });
  return { ...club, cups: { ...club.cups, [cup.cup]: settleCupRound(state, cup.round, played) } };
}

/** Numa semana de taça, sorteia-se a ronda ao chegar a ela. O Mundial nasce quando há campeão continental. */
function drawCups(club: ClubState): ClubState {
  const cup = weekCup(club.week);
  if (!cup) return club;
  let state = club.cups[cup.cup];
  if (cup.cup === 'world' && !state) {
    const champion = cupWinner(club.cups.continental, CUP_ROUNDS.continental.length);
    if (champion === null) return club;
    state = createKnockoutCup([champion, WORLD_CLUB]);
  }
  if (!state || state.rounds.length > cup.round) return club;
  return { ...club, cups: { ...club.cups, [cup.cup]: drawCupRound(state, weekSeed(club)) } };
}

/** Fecha a época: subidas e descidas, prémio em cartas e o calendário da próxima. */
function endSeason(club: ClubState): ClubState {
  const rng = makeRng(club.seed ^ (club.season * 0x9e3779));
  const table = leagueTable(club);
  const position = table.findIndex(row => row.club === PLAYER_CLUB);
  const regular = table.map(row => row.club);
  // Com playoffs, o vencedor passa para a frente: é o campeão na Pro Liga 1, e a segunda subida na Pro Liga 2.
  const winner = club.playoffs ? playoffWinner(club.playoffs) : null;
  const decidesTitle = club.playoffs ? PLAYOFF_FORMATS[club.division]!.decidesTitle : false;
  const order = winner === null ? regular : decidesTitle ? [winner, ...regular.filter(id => id !== winner)] : [regular[0]!, winner, ...regular.slice(1).filter(id => id !== winner)];
  const outcome = winner === null ? seasonOutcome(position, club.division, DIVISIONS.length) : seasonOutcome(order.indexOf(PLAYER_CLUB) < 2 ? order.indexOf(PLAYER_CLUB) : position, club.division, DIVISIONS.length);
  const orders = club.divisions.map((ids, d) =>
    d === club.division ? order : orderByLevel(ids, id => club.clubs[id]!.level, rng));
  const divisions = moveDivisions(orders);
  const division = divisions.findIndex(ids => ids.includes(PLAYER_CLUB));
  // Quem muda de divisão aproxima-se do nível dela, para as divisões continuarem a ser diferentes. Os de fora só oscilam.
  const clubs = club.clubs.map((c, id) => {
    const d = divisions.findIndex(ids => ids.includes(id));
    const level = d < 0 ? c.level + between(rng, -B.clubLevelDrift, B.clubLevelDrift) : c.level + (DIVISIONS[d]!.level - c.level) * B.clubLevelPull + between(rng, -B.clubLevelDrift, B.clubLevelDrift);
    const was = club.divisions.findIndex(ids => ids.includes(id));
    const past = was < 0 ? c.past : [{ division: was, position: orders[was]!.indexOf(id) }, ...(c.past ?? [])].slice(0, 2);
    return { ...c, level: Math.round(level * 10) / 10, ...(past ? { past } : {}) };
  });
  const federationExit = cupExit(club.cups.federation, PLAYER_CLUB, FEDERATION_ROUNDS.length) ?? 0;
  const continentalExit = cupStatus(club, 'continental').exit;
  const worldExit = cupStatus(club, 'world').exit;
  const exits: [CupName, number | null][] = [['federation', federationExit], ['continental', continentalExit], ['world', worldExit]];
  const cups: CupName[] = exits.filter(([cup, exit]) => exit === CUP_ROUNDS[cup].length).map(([cup]) => cup);
  const prize = SEASON_CARDS[outcome] + exits.reduce((sum, [cup, exit]) => sum + (exit === CUP_ROUNDS[cup].length ? CUP_PRIZES[cup].winner : exit === CUP_ROUNDS[cup].length - 1 ? CUP_PRIZES[cup].finalist : 0), 0);
  const cards = Array.from({ length: prize }, () => CARD_IDS[Math.floor(next(rng) * CARD_IDS.length)]!);
  const owned = { ...club.cards };
  for (const card of cards) owned[card] = (owned[card] ?? 0) + 1;
  const own = table[position]!;
  const scorers = Object.entries(club.stats).sort((a, b) => b[1].points - a[1].points);
  // O tempo passa: o potencial desce, quem o esgota sai, e quem fica pede um salário novo.
  const aged = club.team.roster.map(player => {
    const decay = B.potentialDecayBase + B.potentialDecayPerYear * yearsAtClub(club, player.name) + B.potentialDecayPerGame * (club.stats[player.name]?.games ?? 0) + between(rng, -B.potentialDecayLuck, B.potentialDecayLuck);
    const potential = Math.max(0, Math.round(player.potential - decay));
    const drop = Math.max(0, Math.round((B.potentialDeclineFrom - potential) * B.potentialDeclineRate));
    const attributes = drop === 0 ? player.attributes : { ...player.attributes, speed: Math.max(1, player.attributes.speed - drop), jumping: Math.max(1, player.attributes.jumping - drop), stamina: Math.max(1, player.attributes.stamina - drop) };
    return { ...player, potential, attributes };
  });
  const departures = aged.filter(player => player.potential <= 0).map(player => player.name);
  let shrunk: ClubState = { ...club, team: { ...club.team, roster: aged } };
  for (const name of departures) shrunk = releasePlayer(shrunk, name);
  const prizeMoney = cups.reduce((sum, cup) => sum + B.prizeMoney[cup], 0)
    + (club.playoffs && PLAYOFF_FORMATS[club.division]!.decidesTitle ? (playoffWinner(club.playoffs) === PLAYER_CLUB ? B.prizeMoney.playoffChampion : playoffExit(club.playoffs, PLAYER_CLUB) === PLAYOFF_FORMATS[club.division]!.bestOf.length - 1 ? B.prizeMoney.playoffFinalist : 0) : 0);
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
    cups,
    federationExit,
    continentalExit,
    worldExit,
    playoffExit: club.playoffs ? playoffExit(club.playoffs, PLAYER_CLUB) : null,
    departures,
    arrivals: [],
    prizeMoney,
    farewells: aged.filter(player => player.potential <= 0).map(player => ({ player, games: club.stats[player.name]?.games ?? 0, points: club.stats[player.name]?.points ?? 0, seasons: yearsAtClub(club, player.name) })),
  };
  const confidence = Math.max(0, Math.min(100, club.confidence + SEASON_CONFIDENCE[outcome] + cups.length * B.confidenceCup));
  const qualified = orders[DIVISIONS.length - 1]!.slice(0, CONTINENTAL_PLACES);
  const filled = fillSquad({ ...shrunk, season: club.season + 1, division }, departures.map(name => archetypeOf(club, name)), 0, aged.length);
  record.arrivals = filled.arrivals;
  const renewals: Renewal[] = filled.club.team.roster.filter(p => !filled.arrivals.includes(p.name)).map(player => ({ name: player.name, current: club.salaries[player.name] ?? salaryFor(player), asked: salaryFor(player) }));
  return {
    ...club,
    team: filled.club.team,
    shirts: filled.club.shirts,
    joined: filled.club.joined,
    salaries: filled.club.salaries,
    recentTraining: filled.club.recentTraining,
    // As propostas pendentes caem com a época, e o dinheiro reservado volta.
    money: B.budgetByDivision[division]! + prizeMoney,
    offers: [],
    pendingRenewals: renewals,
    division,
    season: club.season + 1,
    week: 1,
    clubs,
    divisions,
    rounds: roundRobin(divisions[division]!, club.seed + club.season * 131),
    cups: { federation: createFederationCup(divisions, id => clubs[id]!.level), continental: continentalCup(qualified) },
    continentalQualified: qualified,
    playoffs: null,
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
  /** A jornada ou a ronda toda, com os outros resultados. Null num particular. */
  round: Fixture[] | null;
  /** A taça a que o jogo pertenceu, se foi de taça. */
  cup: CupName | null;
  /** Numa série de playoffs: as vitórias de cada lado depois deste jogo, a começar pelas nossas, e se já está decidida. */
  series: { wins: [number, number]; decided: boolean } | null;
  confidenceDelta: number;
}

/** Um jogo de uma série de playoffs. Enquanto a série não estiver decidida, a semana não fecha. */
function finishPlayoffGame(club: ClubState, s: MatchState, found: readonly CardId[], game: OfficialGame): MatchResult {
  const won = s.score[0] > s.score[1];
  const cards = [...found, ...endOfMatchCards(won, (weekSeed(club) + club.playoffs!.rounds[game.round]![0]!.games.length * 7) & 0x7fffffff)];
  const owned = { ...club.cards };
  for (const card of cards) owned[card] = (owned[card] ?? 0) + 1;
  const bodies = s.bodies.filter(b => b.team === 0);
  const stats = { ...club.stats };
  for (const body of bodies) {
    const past = stats[body.player.name] ?? { games: 0, points: 0, rebounds: 0, assists: 0 };
    if (body.line.secondsPlayed > 0) stats[body.player.name] = { games: past.games + 1, points: past.points + body.line.points, rebounds: past.rebounds + body.line.rebounds, assists: past.assists + body.line.assists };
  }
  const played = game.fixture.home === PLAYER_CLUB ? [s.score[0], s.score[1]] as [number, number] : [s.score[1], s.score[0]] as [number, number];
  const rounds = club.playoffs!.rounds.map((round, i) => (i !== game.round ? round : round.map(series => (inSeries(series) ? { ...series, games: [...series.games, { ...game.fixture, score: played }] } : series))));
  const playoffs = { ...club.playoffs!, rounds };
  const series = rounds[game.round]!.find(inSeries)!;
  const [top, bottom] = seriesWins(series);
  const wins: [number, number] = series.top === PLAYER_CLUB ? [top, bottom] : [bottom, top];
  const decided = seriesWinner(series) !== null;
  const delta = confidenceChange(won, teamRating(club.team), teamRating(s.teams[1]), true);
  const confidence = Math.max(0, Math.min(100, club.confidence + delta));
  const updated: ClubState = { ...club, cards: owned, stats, confidence, fired: confidence < B.confidenceFired, wins: club.wins + (won ? 1 : 0), losses: club.losses + (won ? 0 : 1), playoffs };
  const secondsOf = secondsPlayedBy(club, s);
  if (decided) {
    const settled = { ...updated, playoffs: settlePlayoffRound(updated, playoffs, game.round) };
    return { club: closeWeek(settled, secondsOf), cards, round: null, cup: null, series: { wins, decided }, confidenceDelta: delta };
  }
  // Mais um jogo esta semana: só o cansaço deste jogo, sem o descanso da semana.
  const roster = updated.team.roster.map((player, index) => ({ ...player, fatigue: Math.max(0, Math.min(1, Math.round((player.fatigue + (secondsOf(index) / 480) * MATCH_FATIGUE * PLAYOFF_GAME_FATIGUE) * 100) / 100)) }));
  return { club: { ...updated, team: { ...updated.team, roster } }, cards, round: null, cup: null, series: { wins, decided }, confidenceDelta: delta };
}

/** Os outros jogos da mesma ronda, simulados a sério, e o nosso com o resultado visto. */
function playRound(club: ClubState, fixtures: readonly Fixture[], s: MatchState): Fixture[] {
  return fixtures.map((fixture, i) => {
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
  const game = currentGame(club);
  if (game?.playoff) return finishPlayoffGame(club, s, found, game);
  const cards = [...found, ...endOfMatchCards(won, weekSeed(club))];
  const owned = { ...club.cards };
  for (const card of cards) owned[card] = (owned[card] ?? 0) + 1;
  const bodies = s.bodies.filter(b => b.team === 0);
  const stats = { ...club.stats };
  for (const body of bodies) {
    const past = stats[body.player.name] ?? { games: 0, points: 0, rebounds: 0, assists: 0 };
    if (game && body.line.secondsPlayed > 0) {
      stats[body.player.name] = {
        games: past.games + 1,
        points: past.points + body.line.points,
        rebounds: past.rebounds + body.line.rebounds,
        assists: past.assists + body.line.assists,
      };
    }
  }
  const round = game === null ? null : playRound(club, game.cup ? club.cups[game.cup]!.rounds[game.round]! : club.rounds[game.round]!, s);
  const rounds = round === null || game!.cup ? club.rounds : club.rounds.map((r, i) => (i === game!.round ? round : r));
  const cups = round === null || !game!.cup ? club.cups : { ...club.cups, [game!.cup]: settleCupRound(club.cups[game!.cup]!, game!.round, round) };
  const delta = confidenceChange(won, teamRating(club.team), teamRating(s.teams[1]), game !== null);
  const confidence = Math.max(0, Math.min(100, club.confidence + delta));
  const updated: ClubState = {
    ...club,
    cards: owned,
    rounds,
    cups,
    stats,
    confidence,
    fired: confidence < B.confidenceFired,
    wins: club.wins + (won ? 1 : 0),
    losses: club.losses + (won ? 0 : 1),
  };
  return { club: closeWeek(updated, secondsPlayedBy(club, s)), cards, round, cup: game?.cup ?? null, series: null, confidenceDelta: delta };
}

/** Um jogo-treino são os dois primeiros períodos. No resto dos jogos, é a hora do intervalo: depois de as equipas saírem para o balneário. */
export const firstHalfOver = (s: MatchState): boolean => s.period >= 3 || (s.period === 2 && s.phase === 'break' && s.timer <= 1);

/** O fim de um jogo-treino: dá menos cartas, cansa menos e não fecha a semana. Só conta para as cartas e para o cansaço. */
export function finishPractice(club: ClubState, s: MatchState, found: readonly CardId[]): MatchResult {
  const won = s.score[0] > s.score[1];
  const cards = [...found, ...(won ? endOfMatchCards(won, weekSeed(club)).slice(0, 1) : [])];
  const owned = { ...club.cards };
  for (const card of cards) owned[card] = (owned[card] ?? 0) + 1;
  // O jogo-treino gasta a semana livre, tal como o particular, por isso nunca há dois na mesma semana.
  const seconds = secondsPlayedBy(club, s);
  return { club: closeWeek({ ...club, cards: owned }, index => seconds(index) * PRACTICE_FATIGUE), cards, round: null, cup: null, series: null, confidenceDelta: 0 };
}

/** Os adversários de jogo-treino que não são clubes: números negativos, para não se confundirem com os da liga. */
export const SPECIAL_RIVALS: readonly { id: number; name: string; note: string }[] = [
  { id: -1, name: 'Universidade do Cais', note: 'Aprendem depressa' },
  { id: -2, name: 'Veteranos Unidos', note: 'Sem fôlego' },
  { id: -3, name: 'Os Sósias', note: 'Nós, ao espelho' },
];

/** A equipa de um adversário especial. A universidade é fraca com potencial máximo; os veteranos são bons sem resistência; os sósias somos nós. */
export function specialTeam(club: ClubState, id: number): Team {
  const level = DIVISIONS[club.division]!.level;
  const seed = (club.season * 977 + club.week * 31 - id) & 0x7fffffff;
  if (id === -1) {
    const team = generateTeam(seed, 'Universidade do Cais', Math.max(20, level - 10));
    return { ...team, short: 'UNI', roster: team.roster.map(p => ({ ...p, potential: 95 })) };
  }
  if (id === -2) {
    const team = generateTeam(seed, 'Veteranos Unidos', level + 8);
    return { ...team, short: 'VET', roster: team.roster.map(p => ({ ...p, potential: 5, attributes: { ...p.attributes, stamina: 15 } })) };
  }
  const own = clubTeam(club);
  return { name: 'Os Sósias', short: 'SOS', roster: own.roster.map(p => ({ ...p, name: `${p.name} II`, fatigue: 0 })) };
}

/** A equipa de qualquer adversário, da liga ou especial. */
export const rivalTeam = (club: ClubState, id: number): Team => (id < 0 ? specialTeam(club, id) : aiTeam(club.clubs[id]!));

/** Quantas semanas faltam para o próximo jogo oficial: 0 se é esta semana, null se a época já não tem mais. */
export function weeksToNextGame(club: ClubState): number | null {
  for (let week = club.week; week <= SEASON_WEEKS + PLAYOFF_WEEKS; week++) {
    if (currentGame({ ...club, week })) return week - club.week;
  }
  return null;
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

function validCups(club: ClubState): boolean {
  const known = (id: number): boolean => Number.isInteger(id) && Boolean(club.clubs[id]);
  const valid = (cup: CupState | undefined, name: CupName): boolean => typeof cup === 'object' && cup !== null && Array.isArray(cup.alive) && cup.alive.every(known) && Array.isArray(cup.preliminary) && cup.preliminary.every(known)
    && Array.isArray(cup.rounds) && cup.rounds.length <= CUP_ROUNDS[name].length && cup.rounds.every(round => Array.isArray(round) && round.every(f => known(f.home) && known(f.away)));
  return typeof club.cups === 'object' && club.cups !== null && valid(club.cups.federation, 'federation') && valid(club.cups.continental, 'continental')
    && (club.cups.world === undefined || valid(club.cups.world, 'world')) && Array.isArray(club.continentalQualified) && club.continentalQualified.every(known)
    && club.clubs.length === FOREIGN_START + FOREIGN_NAMES.length;
}

/** Antes das taças de fora: entram os clubes estrangeiros e a Taça Continental desta época, sem nós. */
function migrateV5(old: ClubState): ClubState {
  const clubs = [...old.clubs.slice(0, FOREIGN_START), ...foreignClubs(old.seed, makeRng(old.seed ^ 0x77a1c3))];
  const qualified = firstQualified(clubs, old.divisions, old.seed);
  return migrateV6({ ...old, version: 6, clubs, continentalQualified: qualified, cups: { ...old.cups, continental: continentalCup(qualified) } });
}

/** Antes do dinheiro e do tempo: toda a gente chegou na época 1 e ganha o que vale. */
function migrateV6(old: ClubState): ClubState {
  return migrateV7({ ...old, version: 7, joined: Object.fromEntries(old.team.roster.map(player => [player.name, 1])), money: B.budgetByDivision[old.division]!, salaries: salariesFor(old.team), pendingRenewals: null });
}

/** Antes do mercado não havia propostas. */
function migrateV7(old: ClubState): ClubState {
  return migrateV8({ ...old, version: 8, offers: [] });
}

/** Até à versão 8 cada jogador tinha uma posição fixa. Agora o lugar na lista é que manda, e o campo desaparece de todo o lado. */
function stripField(value: unknown, field: string): void {
  if (Array.isArray(value)) value.forEach(item => stripField(item, field));
  else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('attributes' in record && field in record) delete record[field];
    for (const key of Object.keys(record)) stripField(record[key], field);
  }
}

function migrateV8(old: ClubState): ClubState {
  const next = { ...old, version: 9 };
  stripField(next, 'position');
  return migrateV9(next);
}

/** A época ganhou duas semanas de pré-época: o calendário todo andou duas semanas para a frente. */
function migrateV9(old: ClubState): ClubState {
  return migrateV10({ ...old, version: 10, week: old.week + PRESEASON_WEEKS });
}

/** Os jogadores passaram a vir de um pool fixo: os clubes guardados sem jogadores recebem os deles. O nosso plantel já está guardado. */
function migrateV10(old: ClubState): ClubState {
  const deal = dealPool(makeRng(old.seed ^ 0x77a1c3), FOREIGN_START);
  return migrateV11({ ...old, version: 11, clubs: old.clubs.map((club, i) => (i < FOREIGN_START && !club.players ? { ...club, players: deal[i] } : club)) });
}

/** Os jogadores deixaram de ter peso. */
function migrateV11(old: ClubState): ClubState {
  const next = { ...old, version: 12 };
  stripField(next, 'weightKg');
  return migrateV12(next);
}

/** A altura passou de centímetros a três níveis, com o mesmo corte das estrelas. */
function migrateV12(old: ClubState): ClubState {
  const next = { ...old, version: SAVE_VERSION };
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if ('attributes' in record && typeof record.heightCm === 'number') {
        record.height = levelOfHeight(record.heightCm);
        delete record.heightCm;
      }
      for (const key of Object.keys(record)) walk(record[key]);
    }
  };
  walk(next);
  return next;
}

/** Antes dos playoffs, a época acabava na fase regular. */
function migrateV4(old: ClubState): ClubState {
  return migrateV5({ ...old, version: 5, playoffs: null });
}

/** Antes das taças, a época tinha 19 semanas. O clube entra na taça desta época só se ela ainda não começou. */
function migrateV3(old: ClubState): ClubState {
  const cup = createFederationCup(old.divisions, id => old.clubs[id]!.level);
  // No calendário dessa altura a pré-eliminatória era na semana 2.
  const started = old.week > 2;
  // Nesta versão ainda não havia Taça Continental: a migração seguinte acrescenta-a.
  return migrateV4(drawCups({ ...old, version: 4, cups: { federation: started ? { ...cup, alive: cup.alive.filter(id => id !== PLAYER_CLUB) } : cup } as ClubState['cups'] }));
}

/** Um clube guardado antes de haver época entra numa liga nova, com tudo o que já tinha treinado. */
function migrateV1(old: ClubState): ClubState {
  const world = createWorld(old.seed, old.division, old.team.name);
  return {
    ...old,
    version: SAVE_VERSION,
    season: 1,
    week: 1,
    trainedThisWeek: [],
    ...clubExtras(old.team, old.division),
    career: [],
    confidence: B.confidenceStart,
    fired: false,
    ...world,
    rounds: roundRobin(world.divisions[old.division]!, old.seed),
    cups: { federation: createFederationCup(world.divisions, id => world.clubs[id]!.level), continental: continentalCup(firstQualified(world.clubs, world.divisions, old.seed)) },
    continentalQualified: firstQualified(world.clubs, world.divisions, old.seed),
    playoffs: null,
    stats: {},
    history: [],
    seasonReport: null,
  };
}

/** Antes de cada jogador treinar à vez, o treino da semana era de toda a equipa. */
function migrateV2(old: ClubState): ClubState {
  const trained = (old.trainedThisWeek as unknown) === true ? old.team.roster.map(player => player.name) : [];
  return { ...old, version: 3, trainedThisWeek: trained, ...clubExtras(old.team, old.division), career: [] };
}

function validExtras(club: ClubState): boolean {
  const isRecord = (value: unknown): boolean => typeof value === 'object' && value !== null;
  const playoffs = club.playoffs === null || (isRecord(club.playoffs) && Array.isArray(club.playoffs.seeds) && Array.isArray(club.playoffs.rounds) && PLAYOFF_FORMATS[club.playoffs.division] !== undefined);
  const money = Number.isFinite(club.money) && isRecord(club.salaries) && isRecord(club.joined) && (club.pendingRenewals === null || (Array.isArray(club.pendingRenewals) && club.pendingRenewals.every(r => typeof r.name === 'string' && Number.isFinite(r.asked))))
    && Array.isArray(club.offers) && club.offers.every(o => isRecord(o.player) && Number.isFinite(o.fee) && Number.isFinite(o.weeksLeft));
  return playoffs && money && Array.isArray(club.trainedThisWeek) && isRecord(club.recentTraining) && isRecord(club.shirts) && Array.isArray(club.career)
    && validEmblem(club.emblem) && Array.isArray(club.kits) && club.kits.length > 0 && club.kits.every(validKit)
    && club.kits.some(kit => kit.id === club.kitChoice);
}

/** Lê um clube guardado. Devolve null se estiver estragado ou for de outra versão, sem deitar nada fora. */
export function parseClub(text: string | null): ClubState | null {
  if (!text) return null;
  try {
    let parsed = JSON.parse(text) as ClubState;
    if (!Number.isInteger(parsed.seed) || !Number.isInteger(parsed.week) || parsed.week < 1) return null;
    if (!Number.isInteger(parsed.division) || parsed.division < 0 || parsed.division >= DIVISIONS.length) return null;
    validateTeam(parsed.team);
    if (typeof parsed.team.name !== 'string' || !parsed.team.name || parsed.team.name.length > CLUB_NAME_MAX) return null;
    validateTactics(parsed.tactics, parsed.team.name);
    if (typeof parsed.cards !== 'object' || parsed.cards === null) return null;
    for (const [card, count] of Object.entries(parsed.cards)) {
      if (!(card in CARDS) || !Number.isInteger(count) || (count as number) < 0) return null;
    }
    if (!Array.isArray(parsed.knownCombos)) return null;
    if (parsed.version === 1) return migrateV1(parsed);
    if (parsed.version === 2) parsed = migrateV2(parsed);
    if (parsed.version === 3) parsed = migrateV3(parsed);
    if (parsed.version === 4) parsed = migrateV4(parsed);
    if (parsed.version === 5) parsed = migrateV5(parsed);
    if (parsed.version === 6) parsed = migrateV6(parsed);
    if (parsed.version === 7) parsed = migrateV7(parsed);
    if (parsed.version === 8) parsed = migrateV8(parsed);
    if (parsed.version === 9) parsed = migrateV9(parsed);
    if (parsed.version === 10) parsed = migrateV10(parsed);
    if (parsed.version === 11) parsed = migrateV11(parsed);
    if (parsed.version === 12) parsed = migrateV12(parsed);
    if (parsed.version !== SAVE_VERSION || !validExtras(parsed)) return null;
    if (!Number.isInteger(parsed.season) || parsed.week > SEASON_WEEKS + (parsed.playoffs ? PLAYOFF_WEEKS : 0) || !Number.isFinite(parsed.confidence)) return null;
    if (!Array.isArray(parsed.clubs) || !Array.isArray(parsed.divisions) || parsed.divisions.length !== DIVISIONS.length) return null;
    if (parsed.divisions.some(ids => !Array.isArray(ids) || ids.length !== LEAGUE_SIZE || ids.some(id => !parsed.clubs[id]))) return null;
    if (parsed.clubs.some((c: LeagueClub) => c.players !== undefined && (!Array.isArray(c.players) || c.players.length !== ROSTER_SLOTS.length || c.players.some(i => !Number.isInteger(i) || i < 0 || i >= PLAYER_POOL.length)))) return null;
    if (parsed.clubs.some((c: LeagueClub) => c.past !== undefined && (!Array.isArray(c.past) || c.past.some(e => !DIVISIONS[e.division] || !Number.isInteger(e.position))))) return null;
    if (!leagueIds(parsed).includes(PLAYER_CLUB) || !Array.isArray(parsed.rounds) || !validRounds(parsed) || !validCups(parsed)) return null;
    if (typeof parsed.stats !== 'object' || parsed.stats === null || !Array.isArray(parsed.history)) return null;
    return parsed;
  } catch {
    return null;
  }
}
