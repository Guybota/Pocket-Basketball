import type { MatchState } from '../sim/match.ts';
import { makeRng } from '../sim/rng.ts';
import { DIVISIONS } from '../sim/teamgen.ts';
import { CARD_IDS, CARDS, MAX_CARDS_PER_PLAYER, endOfMatchCards, independentPractice, trainPlayer, type CardId, type Combo } from '../sim/training.ts';
import { NEUTRAL_TACTICS, validateTeam, type MoveId, type Tactics, type Team } from '../sim/types.ts';
import { matchTeams } from './setup.ts';

const SAVE_VERSION = 1;
const MATCH_FATIGUE = 0.22;
const WEEKLY_RECOVERY = 0.5;
const STARTING_CARDS: readonly CardId[] = ['shooting', 'dribble', 'sprints', 'readDefense', 'weights', 'nap'];

export interface ClubState {
  version: number;
  seed: number;
  division: number;
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
}

export function newClub(seed: number, division: number): ClubState {
  const cards: Partial<Record<CardId, number>> = {};
  for (const card of STARTING_CARDS) cards[card] = (cards[card] ?? 0) + 1;
  // No nosso clube, os movimentos especiais aprendem-se no treino.
  const team = matchTeams(seed, division)[0];
  return {
    version: SAVE_VERSION,
    seed,
    division,
    week: 1,
    wins: 0,
    losses: 0,
    team: { ...team, roster: team.roster.map(player => ({ ...player, moves: [] })) },
    tactics: { ...NEUTRAL_TACTICS },
    cards,
    knownCombos: [],
    trainedThisWeek: false,
  };
}

/** A semente do jogo desta semana. */
export const weekSeed = (club: ClubState): number => club.seed + (club.week - 1) * 97;

/** O adversário desta semana. Nunca é o próprio clube. */
export function opponentOf(club: ClubState): Team {
  const seed = weekSeed(club);
  const away = matchTeams(seed, club.division)[1];
  return away.name === club.team.name ? matchTeams(seed + 1, club.division)[1] : away;
}

/** A equipa como entra em campo, com as táticas escolhidas. */
export const clubTeam = (club: ClubState): Team => ({ ...club.team, tactics: club.tactics });

export const totalCards = (club: ClubState): number => CARD_IDS.reduce((sum, card) => sum + (club.cards[card] ?? 0), 0);

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

/** Fecha a semana: resultado, cartas encontradas e o cansaço de quem jogou. */
export function finishMatch(club: ClubState, s: MatchState, found: readonly CardId[]): { club: ClubState; cards: CardId[] } {
  const won = s.score[0] > s.score[1];
  const cards = [...found, ...endOfMatchCards(won, weekSeed(club))];
  const owned = { ...club.cards };
  for (const card of cards) owned[card] = (owned[card] ?? 0) + 1;
  const roster = club.team.roster.map((player, index) => {
    const played = s.bodies.filter(b => b.team === 0)[index]?.line.secondsPlayed ?? 0;
    const fatigue = player.fatigue * WEEKLY_RECOVERY + (played / 480) * MATCH_FATIGUE;
    return { ...player, fatigue: Math.max(0, Math.min(1, Math.round(fatigue * 100) / 100)) };
  });
  return {
    club: {
      ...club,
      team: { ...club.team, roster },
      cards: owned,
      week: club.week + 1,
      wins: club.wins + (won ? 1 : 0),
      losses: club.losses + (won ? 0 : 1),
      trainedThisWeek: false,
    },
    cards,
  };
}

/** Lê um clube guardado. Devolve null se estiver estragado ou for de outra versão, sem deitar nada fora. */
export function parseClub(text: string | null): ClubState | null {
  if (!text) return null;
  try {
    const club = JSON.parse(text) as ClubState;
    if (club.version !== SAVE_VERSION || !Number.isInteger(club.week) || club.week < 1) return null;
    if (!Number.isInteger(club.division) || club.division < 0 || club.division >= DIVISIONS.length) return null;
    validateTeam(club.team);
    if (typeof club.cards !== 'object' || club.cards === null) return null;
    for (const [card, count] of Object.entries(club.cards)) {
      if (!(card in CARDS) || !Number.isInteger(count) || (count as number) < 0) return null;
    }
    if (!Array.isArray(club.knownCombos)) return null;
    return club;
  } catch {
    return null;
  }
}
