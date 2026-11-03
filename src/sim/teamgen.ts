import { between, makeRng, next, shuffled, type Rng } from './rng.ts';
import { ATTRIBUTE_KEYS, POSITIONS, type Attributes, type MoveId, type OffBallStyle, type OnBallStyle, type Player, type Position, type Tactics, type Team } from './types.ts';

// Os apelidos do pool de jogadores. Repetem-se entre clubes, nunca dentro do mesmo plantel.
const SURNAMES = [
  'Tavares', 'Alves', 'Okafor', 'Rocha', 'Mendes', 'Sousa', 'Pinto', 'Costa', 'Ferreira', 'Lopes',
  'Nunes', 'Gomes', 'Ramos', 'Teixeira', 'Barros', 'Moreira', 'Silva', 'Duarte', 'Cardoso', 'Neves',
  'Varela', 'Semedo', 'Andrade', 'Monteiro', 'Fonseca', 'Baptista', 'Correia', 'Matos', 'Reis', 'Faria',
  'Abreu', 'Aguiar', 'Almeida', 'Amaral', 'Amorim', 'Antunes', 'Araújo', 'Azevedo', 'Barbosa', 'Barreto',
  'Bastos', 'Bento', 'Bessa', 'Borges', 'Botelho', 'Braga', 'Brandão', 'Brito', 'Cabral', 'Caetano',
  'Caldeira', 'Campos', 'Carneiro', 'Carvalho', 'Castro', 'Cerqueira', 'Chaves', 'Coelho', 'Cordeiro', 'Coutinho',
  'Couto', 'Cruz', 'Cunha', 'Dantas', 'Dias', 'Domingues', 'Esteves', 'Évora', 'Falcão', 'Farinha',
  'Fernandes', 'Figueira', 'Fortes', 'Fraga', 'Franco', 'Freire', 'Freitas', 'Furtado', 'Gama', 'Garcia',
  'Gaspar', 'Godinho', 'Gonçalves', 'Gouveia', 'Guedes', 'Guerra', 'Guimarães', 'Henriques', 'Jorge', 'Lage',
  'Leal', 'Leite', 'Lemos', 'Lima', 'Lobo', 'Loureiro', 'Lourenço', 'Macedo', 'Machado', 'Magalhães',
  'Maia', 'Marques', 'Martins', 'Medeiros', 'Melo', 'Mesquita', 'Miranda', 'Morais', 'Mota', 'Moura',
  'Nascimento', 'Neto', 'Nogueira', 'Noronha', 'Oliveira', 'Pacheco', 'Paiva', 'Pais', 'Palma', 'Peixoto',
  'Pereira', 'Pimenta', 'Pires', 'Prata', 'Queirós', 'Ramalho', 'Rebelo', 'Rego', 'Resende', 'Ribeiro',
  'Rodrigues', 'Rosa', 'Salgado', 'Sampaio', 'Santos', 'Saraiva', 'Seabra', 'Serra', 'Simões', 'Soares',
  'Torres', 'Trindade', 'Valente', 'Vaz', 'Veiga', 'Ventura', 'Viana', 'Vicente', 'Vieira', 'Xavier',
  'Djaló', 'Baldé', 'Embaló', 'Sanhá', 'Candé', 'Mané', 'Camará', 'Dabó', 'Nhaga', 'Sambú',
  'Mascarenhas', 'Quaresma', 'Varanda', 'Zambujo', 'Bettencourt', 'Lobato', 'Quintela', 'Paixão', 'Negrão', 'Vilela',
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

// A altura típica de cada posição, em cm.
const BODIES: Record<Position, { height: number }> = {
  BAS: { height: 183 },
  ESC: { height: 192 },
  EXT: { height: 198 },
  EXP: { height: 204 },
  POS: { height: 210 },
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
  BAS: ['balanced', 'shadow', 'leaker', 'dynamo'],
  ESC: ['spotUp', 'leaker', 'cutter', 'shadow', 'sixthMan'],
  EXT: ['cutter', 'spotUp', 'leaker', 'crasher', 'dynamo'],
  EXP: ['crasher', 'screener', 'lowPost', 'rimProtector'],
  POS: ['lowPost', 'screener', 'crasher', 'rimProtector'],
};
// Os adversários já trazem movimentos. No clube do jogador, aprendem-se no treino (ver newClub).
const MOVE_CHANCE = 0.25;

function noise(rng: Rng, spread: number): number {
  return ((next(rng) + next(rng) + next(rng)) / 3 - 0.5) * 2 * spread;
}

/** Quem um jogador é: o nome, a posição natural e o corpo. No pool é fixo; os atributos sorteiam-se em cada carreira. */
export interface PoolPlayer {
  name: string;
  position: Position;
  heightCm: number;
}

/** Os 12 lugares de um plantel: cinco titulares, cinco suplentes por posição e dois extra. */
export const ROSTER_SLOTS: readonly Position[] = [...POSITIONS, ...POSITIONS, 'ESC', 'EXP'];
// Chega para os 40 clubes da liga, com dois de folga para evitar apelidos repetidos no mesmo plantel.
const POOL_CLUBS = 42;

function makeBody(rng: Rng, name: string, position: Position): PoolPlayer {
  const body = BODIES[position];
  const heightCm = Math.round(body.height + noise(rng, 11));
  return { name, position, heightCm };
}

/** O pool de jogadores, igual em todas as carreiras: nome, posição e corpo fixos, como no original. */
export const PLAYER_POOL: readonly PoolPlayer[] = (() => {
  const rng = makeRng(0x4f1bbcdc);
  const names = shuffled(SURNAMES, rng);
  const pool: PoolPlayer[] = [];
  let n = 0;
  for (const position of POSITIONS) {
    const count = ROSTER_SLOTS.filter(slot => slot === position).length * POOL_CLUBS;
    for (let i = 0; i < count; i++) pool.push(makeBody(rng, names[n++ % names.length]!, position));
  }
  return pool;
})();

/** Reparte o pool pelos clubes ao acaso: 12 por clube, pelos lugares do plantel, sem dois apelidos iguais no mesmo clube. */
export function dealPool(rng: Rng, clubs: number): number[][] {
  const free = new Map<Position, number[]>();
  for (const position of POSITIONS) free.set(position, shuffled(PLAYER_POOL.map((_, i) => i).filter(i => PLAYER_POOL[i]!.position === position), rng));
  return Array.from({ length: clubs }, () => {
    const taken: number[] = [];
    for (const position of ROSTER_SLOTS) {
      const list = free.get(position)!;
      const at = list.findIndex(i => !taken.some(t => PLAYER_POOL[t]!.name === PLAYER_POOL[i]!.name));
      taken.push(list.splice(Math.max(0, at), 1)[0]!);
    }
    return taken;
  });
}

function makePlayerFrom(rng: Rng, body: PoolPlayer, level: number, spread: number): Player {
  const { position } = body;
  const attributes = {} as Attributes;
  for (const key of ATTRIBUTE_KEYS) {
    const value = level + (BIASES[position][key] ?? 0) + noise(rng, spread);
    attributes[key] = Math.round(Math.max(1, Math.min(99, value)));
  }
  const options = POSITION_MOVES[position];
  const moves: MoveId[] = next(rng) < MOVE_CHANCE ? [options[Math.floor(next(rng) * options.length)]!] : [];
  const pick = <T>(list: readonly T[]): T => list[Math.floor(next(rng) * list.length)]!;
  const potential = Math.round(Math.max(10, Math.min(100, 60 + noise(rng, 40))));
  return { name: body.name, attributes, heightCm: body.heightCm, moves, offBall: pick(POSITION_OFF_BALL[position]), onBall: pick(POSITION_ON_BALL[position]), potential, fatigue: 0 };
}

/** Um jogador fora do pool, para os testes, os clubes de fora e o mercado. */
function makePlayer(rng: Rng, names: string[], position: Position, level: number, spread: number): Player {
  // Tirar o nome da lista evita dois jogadores com o mesmo apelido na equipa.
  const name = names.splice(Math.floor(next(rng) * names.length), 1)[0]!;
  return makePlayerFrom(rng, makeBody(rng, name, position), level, spread);
}

/** Um plantel a partir de 12 jogadores do pool: os cinco primeiros ao nível do clube, os suplentes 6 abaixo e os dois extra 10 abaixo. */
export function generateTeamFrom(bodies: readonly PoolPlayer[], seed: number, name: string, level: number, spread = 16): Team {
  const rng = makeRng(seed);
  const roster = bodies.map((body, i) => makePlayerFrom(rng, body, level - (i < 5 ? 0 : i < 10 ? 6 : 10), spread));
  return { name, short: name.slice(0, 3).toUpperCase(), roster };
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

/** Um jogador livre, para substituir quem sai: do nível pedido e com o potencial pedido. Evita os nomes que já há na equipa. */
export function generatePlayer(seed: number, position: Position, level: number, potential: number, taken: readonly string[]): Player {
  const rng = makeRng(seed ^ 0x2b7e15);
  const names = SURNAMES.filter(name => !taken.includes(name));
  const player = makePlayer(rng, names.length > 0 ? names : [...SURNAMES], position, level, 10);
  return { ...player, moves: [], potential: Math.round(Math.max(1, Math.min(100, potential))) };
}

/** A nota de um jogador: a média dos atributos. */
export function playerRating(player: Player): number {
  let total = 0;
  for (const key of ATTRIBUTE_KEYS) total += player.attributes[key];
  return total / ATTRIBUTE_KEYS.length;
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

export function withBody(team: Team, heightCm: number): Team {
  return { ...team, roster: team.roster.map(player => ({ ...player, heightCm: player.heightCm + heightCm })) };
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
