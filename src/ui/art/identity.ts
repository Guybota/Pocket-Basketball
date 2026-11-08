// A identidade fixa de cada clube da liga: emblema e equipamentos iguais em todas as carreiras, e únicos.
import { CLUB_NAMES, FOREIGN_NAMES } from '../setup.ts';
import { teamsClash } from './color.ts';
import { EMBLEM_PATTERN_LIST, EMBLEM_SHAPE_LIST, KIT_PATTERNS, RESERVED_SYMBOLS, type ClubKit, type Emblem, type EmblemBorder } from './kit.ts';

// Cor principal, segunda cor e cor de realce. As principais são escuras, para a camisola contrastar com a letra.
const SETS: readonly (readonly [string, string, string])[] = [
  ['#2b5fd9', '#ffffff', '#f2c230'], ['#cf3a2c', '#ffffff', '#1b2230'], ['#2f8f5b', '#f4efe0', '#f2c230'], ['#1b2230', '#f2c230', '#ffffff'],
  ['#7246c4', '#ffffff', '#f2c230'], ['#e8622a', '#1b2230', '#f4efe0'], ['#17737a', '#f4efe0', '#e8622a'], ['#8b3a2c', '#f4efe0', '#f2c230'],
  ['#1b2230', '#7ec8e0', '#ffffff'], ['#cf3a2c', '#f2c230', '#1b2230'], ['#2b5fd9', '#f2c230', '#ffffff'], ['#2f8f5b', '#ffffff', '#cf3a2c'],
  ['#7246c4', '#f2c230', '#f4efe0'], ['#17737a', '#ffffff', '#cf3a2c'], ['#e8622a', '#ffffff', '#2b5fd9'], ['#8b3a2c', '#f2c230', '#ffffff'],
];
const BORDERS: readonly EmblemBorder[] = ['ink', 'gold', 'light'];

export interface ClubIdentity {
  emblem: Emblem;
  kits: readonly [ClubKit, ClubKit];
}

const cache = new Map<string, ClubIdentity>();

/** O número fixo de um clube: o lugar na lista de nomes. Um nome fora das listas (os Sósias, um clube renomeado) recebe um número pelo texto. */
function indexOf(name: string): number {
  const league = (CLUB_NAMES as readonly string[]).indexOf(name);
  if (league >= 0) return league;
  const foreign = (FOREIGN_NAMES as readonly string[]).indexOf(name);
  if (foreign >= 0) return CLUB_NAMES.length + foreign;
  let hash = 11;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash;
}

export function clubIdentity(name: string): ClubIdentity {
  const cached = cache.get(name);
  if (cached) return cached;
  const i = indexOf(name);
  const [primary, secondary, accent] = SETS[i % SETS.length]!;
  // O símbolo anda em ciclos de 21 e a forma em ciclos de 8: o par só se repete ao fim de 168 clubes, por isso os 54 são todos diferentes.
  const emblem: Emblem = {
    shape: EMBLEM_SHAPE_LIST[(i * 3) % EMBLEM_SHAPE_LIST.length]![0],
    pattern: EMBLEM_PATTERN_LIST[(i * 5) % EMBLEM_PATTERN_LIST.length]![0],
    primary,
    secondary,
    accent,
    symbol: RESERVED_SYMBOLS[i % RESERVED_SYMBOLS.length]!,
    // Sem letras: o símbolo é a identidade, como no original.
    letters: '',
    border: BORDERS[i % BORDERS.length]!,
  };
  const pattern = KIT_PATTERNS[(i * 7) % KIT_PATTERNS.length]![0];
  const home: ClubKit = { id: 'home', name: 'Principal', jersey: primary, second: secondary, pattern, trim: accent, shorts: primary };
  const away: ClubKit = { id: 'away', name: 'Alternativo', jersey: secondary, second: primary, pattern, trim: primary, shorts: secondary };
  const identity: ClubIdentity = { emblem, kits: [home, away] };
  cache.set(name, identity);
  return identity;
}

/** O equipamento com que um clube joga contra outro: o principal, ou o alternativo quando as camisolas se confundem. */
export function kitAgainst(name: string, other: ClubKit): ClubKit {
  const [home, away] = clubIdentity(name).kits;
  return teamsClash(home.jersey, other.jersey) ? away : home;
}
