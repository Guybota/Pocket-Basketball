import { between, makeRng, next, type Rng } from './rng.ts';
import { ATTRIBUTE_KEYS, POSITIONS, type Attributes, type MoveId, type OffBallStyle, type OnBallStyle, type Player, type Position, type Tactics, type Team } from './types.ts';

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

// Medidas típicas por posição: altura em cm e índice de massa corporal.
const BODIES: Record<Position, { height: number; bmi: number }> = {
  BAS: { height: 183, bmi: 23.5 },
  ESC: { height: 192, bmi: 24 },
  EXT: { height: 198, bmi: 24.5 },
  EXP: { height: 204, bmi: 25.5 },
  POS: { height: 210, bmi: 26.5 },
};
const POSITION_MOVES: Record<Position, readonly MoveId[]> = {
  BAS: ['crossover', 'alleyOop', 'pickpocket'],
  ESC: ['stepBack', 'crossover', 'pickpocket'],
  EXT: ['stepBack', 'powerDunk', 'pickpocket'],
  EXP: ['powerDunk', 'alleyOop'],
  POS: ['powerDunk'],
};
// Comportamentos prováveis por posição. Repetir uma opção torna-a mais provável.
const POSITION_ON_BALL: Record<Position, readonly OnBallStyle[]> = {
  BAS: ['playmaker', 'playmaker', 'slasher', 'balanced'],
  ESC: ['shooter', 'scorer', 'balanced'],
  EXT: ['slasher', 'shooter', 'scorer', 'balanced'],
  EXP: ['postUp', 'balanced', 'scorer'],
  POS: ['postUp', 'postUp', 'balanced'],
};
const POSITION_OFF_BALL: Record<Position, readonly OffBallStyle[]> = {
  BAS: ['balanced', 'shadow', 'leaker'],
  ESC: ['spotUp', 'leaker', 'cutter', 'shadow'],
  EXT: ['cutter', 'spotUp', 'leaker', 'crasher'],
  EXP: ['crasher', 'screener', 'lowPost'],
  POS: ['lowPost', 'screener', 'crasher'],
};
// Os adversários já trazem movimentos. No clube do jogador, aprendem-se no treino (ver newClub).
const MOVE_CHANCE = 0.25;

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
  const body = BODIES[position];
  const heightCm = Math.round(body.height + noise(rng, 11));
  // Quem tem mais físico tende a ser mais pesado.
  const bmi = body.bmi + noise(rng, 4.5) + (attributes.strength - level) * 0.05;
  const weightKg = Math.round(bmi * (heightCm / 100) * (heightCm / 100));
  const options = POSITION_MOVES[position];
  const moves: MoveId[] = next(rng) < MOVE_CHANCE ? [options[Math.floor(next(rng) * options.length)]!] : [];
  const pick = <T>(list: readonly T[]): T => list[Math.floor(next(rng) * list.length)]!;
  const potential = Math.round(Math.max(10, Math.min(100, 60 + noise(rng, 40))));
  return { name, position, attributes, heightCm, weightKg, moves, offBall: pick(POSITION_OFF_BALL[position]), onBall: pick(POSITION_ON_BALL[position]), potential, fatigue: 0 };
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
export function generateLeagueTeam(seed: number, name: string, level: number, clubSpread = 8): Team {
  const rng = makeRng(seed ^ 0x5bd1e995);
  return generateTeam(seed, name, level + between(rng, -clubSpread, clubSpread));
}

export function withBody(team: Team, heightCm: number, weightKg: number): Team {
  return { ...team, roster: team.roster.map(player => ({ ...player, heightCm: player.heightCm + heightCm, weightKg: player.weightKg + weightKg })) };
}

export function withMoves(team: Team, moves: readonly MoveId[]): Team {
  return { ...team, roster: team.roster.map(player => ({ ...player, moves: [...moves] })) };
}

export function withTactics(team: Team, tactics: Tactics): Team {
  return { ...team, tactics };
}

export function withStyles(team: Team, styles: { offBall?: OffBallStyle; onBall?: OnBallStyle }): Team {
  return { ...team, roster: team.roster.map(player => ({ ...player, ...styles })) };
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
