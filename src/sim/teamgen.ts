import { between, makeRng, next, type Rng } from './rng.ts';
import { ATTRIBUTE_KEYS, POSITIONS, type Attributes, type Player, type Position, type Team } from './types.ts';

// Nomes de exemplo para testes. A lista final fica para a Fase 5.
const SURNAMES = [
  'Tavares', 'Alves', 'Okafor', 'Rocha', 'Mendes', 'Sousa', 'Pinto', 'Costa', 'Ferreira', 'Lopes',
  'Nunes', 'Gomes', 'Ramos', 'Teixeira', 'Barros', 'Moreira', 'Silva', 'Duarte', 'Cardoso', 'Neves',
  'Varela', 'Semedo', 'Andrade', 'Monteiro', 'Fonseca', 'Baptista', 'Correia', 'Matos', 'Reis', 'Faria',
];

/** Nível médio dos clubes em cada divisão. */
export const DIVISIONS = [
  { name: 'Liga Iniciados', level: 37 },
  { name: 'Liga Avançada', level: 48 },
  { name: 'Pro Liga 2', level: 59 },
  { name: 'Pro Liga 1', level: 70 },
] as const;

const BIASES: Record<Position, Partial<Attributes>> = {
  BAS: { speed: 10, technique: 12, shooting: 4, strength: -8, jumping: -10 },
  ESC: { shooting: 10, speed: 6, technique: 4, strength: -4, jumping: -4 },
  EXT: { shooting: 4, speed: 2, jumping: 4 },
  EXP: { strength: 8, jumping: 10, speed: -4, shooting: -4, technique: -4 },
  POS: { strength: 12, jumping: 14, speed: -10, shooting: -10, technique: -8 },
};

function noise(rng: Rng, spread: number): number {
  return ((next(rng) + next(rng) + next(rng)) / 3 - 0.5) * 2 * spread;
}

function makePlayer(rng: Rng, names: string[], position: Position, level: number, spread: number): Player {
  const attributes = {} as Attributes;
  for (const key of ATTRIBUTE_KEYS) {
    const value = level + (BIASES[position][key] ?? 0) + noise(rng, spread);
    attributes[key] = Math.round(Math.max(1, Math.min(99, value)));
  }
  // Tirar o nome da lista evita dois jogadores com o mesmo apelido na equipa.
  const name = names.splice(Math.floor(next(rng) * names.length), 1)[0]!;
  return { name, position, attributes };
}

/** Plantel de 12: cinco titulares, cinco suplentes por posição e dois extra, ligeiramente mais fracos. */
export function generateTeam(seed: number, name: string, level: number, spread = 16): Team {
  const rng = makeRng(seed);
  const names = [...SURNAMES];
  const roster: Player[] = POSITIONS.map(position => makePlayer(rng, names, position, level, spread));
  for (const position of POSITIONS) roster.push(makePlayer(rng, names, position, level - 6, spread));
  roster.push(makePlayer(rng, names, 'ESC', level - 10, spread), makePlayer(rng, names, 'EXP', level - 10, spread));
  return { name, short: name.slice(0, 3).toUpperCase(), roster };
}

/** Média dos atributos dos oito primeiros jogadores: os que jogam mais minutos. */
export function teamRating(team: Team): number {
  let total = 0;
  const rotation = team.roster.slice(0, 8);
  for (const player of rotation) {
    for (const key of ATTRIBUTE_KEYS) total += player.attributes[key];
  }
  return total / (rotation.length * ATTRIBUTE_KEYS.length);
}

/** Equipas de um campeonato: à volta do mesmo nível, com diferenças entre clubes. */
export function generateLeagueTeam(seed: number, name: string, level: number, clubSpread = 9): Team {
  const rng = makeRng(seed ^ 0x5bd1e995);
  return generateTeam(seed, name, level + between(rng, -clubSpread, clubSpread));
}

export function withBonus(team: Team, keys: readonly (keyof Attributes)[], bonus: number): Team {
  return {
    ...team,
    roster: team.roster.map(player => {
      const attributes = { ...player.attributes };
      for (const key of keys) attributes[key] = Math.max(0, Math.min(100, attributes[key] + bonus));
      return { ...player, attributes };
    }),
  };
}
