// O Aeroporto: a nossa equipa vai num ficheiro pequeno para outra pessoa, e a dela vem cá jogar um amigável.
// O ficheiro vem de fora, por isso só se aceita o que se conhece: cada campo é verificado e copiado à mão.
import { ATTRIBUTE_KEYS, HEIGHT_LEVELS, MOVES, OFF_BALL_STYLES, ON_BALL_STYLES, validateTactics, validateTeam, type Player, type Tactics, type Team } from '../sim/types.ts';
import { EMBLEM_SYMBOL_LIST, RESERVED_SYMBOLS, emblemLetters, validEmblem, validKit, type ClubKit, type Emblem } from './art/kit.ts';
import { teamsClash } from './art/color.ts';

export const TEAM_FILE_FORMAT = 'pocket-basketball-equipa';
export const TEAM_FILE_VERSION = 1;
/** Uma equipa ocupa uns 5 KB; mais do que isto já não é um ficheiro do jogo. */
const TEAM_FILE_MAX = 64 * 1024;
/** O adversário do amigável do Aeroporto, entre os números negativos dos adversários que não são clubes. */
export const GUEST_RIVAL = -10;
export const GUEST_GAMES_KEPT = 10;
const NAME_MAX = 24;
const KITS_MAX = 8;
// Letras, números, espaços e pouca pontuação: os nomes vão para o ecrã, e assim nunca levam código.
const SAFE_NAME = /^[\p{L}\p{M}\p{N}' .,-]+$/u;
const SYMBOLS = new Set<string>([...EMBLEM_SYMBOL_LIST.map(([symbol]) => symbol), ...RESERVED_SYMBOLS]);
const BORDERS = new Set<string>(['ink', 'light', 'gold']);

/** A equipa de outra pessoa, como fica guardada no clube. */
export interface GuestTeam {
  name: string;
  short: string;
  emblem: Emblem;
  kits: ClubKit[];
  roster: Player[];
  tactics: Tactics;
}

/** Um amigável já jogado contra uma equipa de fora. */
export interface GuestGame {
  name: string;
  score: [number, number];
  season: number;
  week: number;
}

/** O que o ficheiro leva do clube: só a equipa, sem dinheiro, cartas nem liga. */
export interface TeamSource {
  team: Team;
  emblem: Emblem;
  kits: ClubKit[];
  tactics: Tactics;
}

/** O ficheiro da equipa: os jogadores chegam frescos e sem lesões, porque é a equipa e não a semana dela. */
export function teamFile(club: TeamSource): string {
  const roster = club.team.roster.map(({ injuryWeeks: _, ...player }) => ({ ...player, fatigue: 0 }));
  return JSON.stringify({ format: TEAM_FILE_FORMAT, version: TEAM_FILE_VERSION, name: club.team.name, short: club.team.short, emblem: club.emblem, kits: club.kits, roster, tactics: club.tactics });
}

/** Lê o ficheiro de outra pessoa. Dá erro, com uma frase para o jogador, se não for uma equipa que o jogo aceite. */
export function parseTeamFile(text: string): GuestTeam {
  if (text.length > TEAM_FILE_MAX) throw new Error('O ficheiro é grande demais para ser uma equipa.');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('Este ficheiro não é uma equipa do Pocket Basketball.');
  }
  if (!isRecord(value) || value.format !== TEAM_FILE_FORMAT) throw new Error('Este ficheiro não é uma equipa do Pocket Basketball.');
  if (value.version !== TEAM_FILE_VERSION) throw new Error('Esta equipa vem de outra versão do jogo.');
  return readGuest(value);
}

/** Verifica uma equipa de fora e copia só os campos conhecidos. Serve para o ficheiro e para o clube guardado. */
export function readGuest(value: unknown): GuestTeam {
  const bad = (what: string): never => {
    throw new Error(`A equipa do ficheiro tem ${what} inválido.`);
  };
  if (!isRecord(value)) return bad('um formato');
  const name = safeName(value.name) ?? bad('o nome');
  const short = typeof value.short === 'string' && value.short && emblemLetters(value.short) === value.short ? value.short : bad('a abreviatura');
  const emblem = readEmblem(value.emblem) ?? bad('o emblema');
  const kits = Array.isArray(value.kits) && value.kits.length > 0 && value.kits.length <= KITS_MAX ? value.kits.map(kit => readKit(kit) ?? bad('um equipamento')) : bad('o equipamento');
  if (!Array.isArray(value.roster)) return bad('o plantel');
  const roster = value.roster.map(player => readPlayer(player) ?? bad('um jogador'));
  if (new Set(roster.map(p => p.name)).size !== roster.length) return bad('um nome repetido no plantel');
  const tactics = readTactics(value.tactics) ?? bad('a tática');
  const team: Team = { name, short, roster, tactics };
  try {
    validateTeam(team);
  } catch {
    return bad('o plantel');
  }
  return { name, short, emblem, kits, roster, tactics };
}

/** A equipa de fora como entra em campo. Um nome igual ao de um dos nossos ganha um «II», como os sósias. */
export function guestTeam(guest: GuestTeam, own: Team): Team {
  const taken = new Set(own.roster.map(p => p.name));
  const rename = (name: string): string => (taken.has(name) ? `${name} II` : name);
  const roster = guest.roster.map(p => ({ ...p, name: rename(p.name), fatigue: 0 }));
  const options = guest.tactics.options?.map(rename).filter(name => roster.some(p => p.name === name));
  return { name: guest.name, short: guest.short, roster, tactics: { ...guest.tactics, ...(options ? { options } : {}) } };
}

/** As duas camisolas são tão parecidas que em campo não se distinguem as equipas. */
export const kitClash = (kit: ClubKit, other: ClubKit): boolean => teamsClash(kit.jersey, other.jersey);

/** O equipamento da equipa de fora: o primeiro que não se confunde com o nosso. */
export const guestKit = (guest: GuestTeam, ours: ClubKit): ClubKit => guest.kits.find(kit => !kitClash(kit, ours)) ?? guest.kits[0]!;

/** O amigável fica na lista, o mais recente primeiro. */
export const withGuestGame = (games: readonly GuestGame[], game: GuestGame): GuestGame[] => [game, ...games].slice(0, GUEST_GAMES_KEPT);

export const validGuestGames = (games: unknown): boolean => Array.isArray(games) && games.every(game => isRecord(game) && typeof game.name === 'string'
  && Array.isArray(game.score) && game.score.length === 2 && game.score.every(n => Number.isInteger(n)) && Number.isInteger(game.season) && Number.isInteger(game.week));

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function safeName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return name && name.length <= NAME_MAX && SAFE_NAME.test(name) ? name : null;
}

function readEmblem(value: unknown): Emblem | null {
  if (!isRecord(value)) return null;
  const { shape, pattern, primary, secondary, accent, symbol, letters, border } = value;
  const emblem = { shape, pattern, primary, secondary, accent, symbol, letters, ...(border === undefined ? {} : { border }) } as Emblem;
  // O validEmblem procura com «in», que também aceita nomes como «constructor»: aqui só passam os da lista.
  return validEmblem(emblem) && SYMBOLS.has(emblem.symbol) && (border === undefined || BORDERS.has(emblem.border!)) ? emblem : null;
}

function readKit(value: unknown): ClubKit | null {
  if (!isRecord(value)) return null;
  const { id, name, jersey, second, pattern, trim, shorts } = value;
  const kit = { id, name: safeName(name), jersey, second, pattern, trim, shorts } as ClubKit;
  return kit.name && typeof id === 'string' && id.length <= NAME_MAX && validKit(kit) ? kit : null;
}

function readPlayer(value: unknown): Player | null {
  if (!isRecord(value) || !isRecord(value.attributes) || !Array.isArray(value.moves)) return null;
  const name = safeName(value.name);
  const { attributes, height, moves, offBall, onBall, potential } = value;
  if (!name || !HEIGHT_LEVELS.includes(height as never) || !OFF_BALL_STYLES.includes(offBall as never) || !ON_BALL_STYLES.includes(onBall as never)) return null;
  if (moves.some(move => !MOVES.includes(move as never)) || new Set(moves).size !== moves.length) return null;
  const numbers = ATTRIBUTE_KEYS.map(key => attributes[key]);
  if (!numbers.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100)) return null;
  if (typeof potential !== 'number' || !Number.isFinite(potential) || potential < 0 || potential > 100) return null;
  return {
    name,
    attributes: Object.fromEntries(ATTRIBUTE_KEYS.map((key, i) => [key, numbers[i]])) as unknown as Player['attributes'],
    height: height as Player['height'],
    moves: moves as Player['moves'],
    offBall: offBall as Player['offBall'],
    onBall: onBall as Player['onBall'],
    potential,
    fatigue: 0,
  };
}

function readTactics(value: unknown): Tactics | null {
  if (!isRecord(value)) return null;
  const { pressure, spacing, pace, defense, focus, options } = value;
  const tactics = { pressure, spacing, pace, ...(defense === undefined ? {} : { defense }), ...(focus === undefined ? {} : { focus }), ...(options === undefined ? {} : { options }) } as Tactics;
  try {
    validateTactics(tactics, 'Equipa');
  } catch {
    return null;
  }
  return tactics;
}
