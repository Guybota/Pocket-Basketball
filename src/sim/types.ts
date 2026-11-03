/** Valores internos de 0 a 100. A nota de S a E é só a sua leitura. */
export interface Attributes {
  shooting: number;
  speed: number;
  stamina: number;
  technique: number;
  strength: number;
  jumping: number;
  willpower: number;
}

export const ATTRIBUTE_KEYS = ['shooting', 'speed', 'stamina', 'technique', 'strength', 'jumping', 'willpower'] as const;

export const POSITIONS = ['BAS', 'ESC', 'EXT', 'EXP', 'POS'] as const;
export type Position = (typeof POSITIONS)[number];

/** Movimentos especiais. Mais tarde, desbloqueiam-se com combinações de cartas de treino. */
export const MOVES = ['crossover', 'stepBack', 'alleyOop', 'powerDunk', 'pickpocket'] as const;
export type MoveId = (typeof MOVES)[number];

/** Como se move sem bola, tanto a atacar como a defender. Muda com o treino. */
export const OFF_BALL_STYLES = ['balanced', 'spotUp', 'cutter', 'lowPost', 'crasher', 'leaker', 'screener', 'shadow', 'sixthMan', 'dynamo', 'rimProtector'] as const;
export type OffBallStyle = (typeof OFF_BALL_STYLES)[number];

/** O que tende a fazer quando tem a bola. Muda com o treino. */
export const ON_BALL_STYLES = ['balanced', 'playmaker', 'scorer', 'slasher', 'shooter', 'postUp'] as const;
export type OnBallStyle = (typeof ON_BALL_STYLES)[number];

/** Sem posição fixa, como no original: o lugar na lista da equipa é que define o papel em campo. A posição só existe ao gerar o jogador. */
export interface Player {
  name: string;
  attributes: Attributes;
  heightCm: number;
  moves: MoveId[];
  offBall: OffBallStyle;
  onBall: OnBallStyle;
  /** De 0 a 100: quanto mais alto, mais o jogador aproveita o treino. */
  potential: number;
  /** De 0 a 1: a condição física com que chega ao jogo, somada pelo treino e pelos jogos e recuperada de semana para semana. */
  fatigue: number;
  /** Semanas até recuperar de uma lesão. Sem lesão, não existe. */
  injuryWeeks?: number;
}

export const DEFENSES = ['man', 'zone'] as const;
export type Defense = (typeof DEFENSES)[number];
/** Cada tática vai de -1 a 1. Pressão: normal (espera no meio-campo de defesa), meio campo, campo inteiro. Ataque (`spacing`): 2 pontos, livre, 3 pontos; as jogadas escolhem-se a partir daqui. Ritmo: lento a rápido. */
export interface Tactics {
  pressure: number;
  spacing: number;
  pace: number;
  /** Homem a homem (por omissão) ou zona: cada defensor guarda um sítio e fecha-se para a bola. */
  defense?: Defense;
  /** Até dois adversários a marcar de perto, pelo lugar deles no plantel. Os outros ficam mais soltos. */
  focus?: number[];
  /** A primeira e a segunda opção de ataque, pelo nome: a equipa procura-as primeiro e monta jogadas para elas. */
  options?: string[];
}
export const NEUTRAL_TACTICS: Tactics = { pressure: 0, spacing: 0, pace: 0 };
export const MAX_FOCUS = 2;
/** Quantas opções de ataque se podem escolher. */
export const MAX_OPTIONS = 2;

export function validateTactics(tactics: Tactics, label: string): void {
  for (const value of [tactics.pressure, tactics.spacing, tactics.pace]) {
    if (!Number.isFinite(value) || value < -1 || value > 1) throw new Error(`${label}: tática inválida`);
  }
  if (tactics.defense !== undefined && !DEFENSES.includes(tactics.defense)) throw new Error(`${label}: defesa inválida`);
  if (tactics.options !== undefined) {
    const { options } = tactics;
    if (!Array.isArray(options) || options.length > MAX_OPTIONS || new Set(options).size !== options.length || options.some(name => typeof name !== 'string' || name.length === 0)) throw new Error(`${label}: opções de ataque inválidas`);
  }
  if (tactics.focus !== undefined) {
    const { focus } = tactics;
    if (!Array.isArray(focus) || focus.length > MAX_FOCUS || new Set(focus).size !== focus.length || focus.some(i => !Number.isInteger(i) || i < 0 || i >= 15)) throw new Error(`${label}: alvos inválidos`);
  }
}

/** Os cinco primeiros jogadores do plantel são os titulares, por ordem de posição. */
export interface Team {
  name: string;
  short: string;
  roster: Player[];
  tactics?: Tactics;
}

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';

export function gradeOf(value: number): Grade {
  if (value >= 84) return 'S';
  if (value >= 67) return 'A';
  if (value >= 50) return 'B';
  if (value >= 34) return 'C';
  if (value >= 17) return 'D';
  return 'E';
}

/** Rejeita equipas inválidas, que no futuro podem vir de outros jogadores. */
export function validateTeam(team: Team): void {
  if (team.roster.length < 5) throw new Error(`${team.name}: são precisos pelo menos 5 jogadores`);
  if (team.roster.length > 15) throw new Error(`${team.name}: máximo de 15 jogadores`);
  if (team.tactics) validateTactics(team.tactics, team.name);
  for (const player of team.roster) {
    if (!Number.isFinite(player.heightCm) || player.heightCm < 150 || player.heightCm > 240) throw new Error(`${player.name}: altura inválida`);
    if (!Array.isArray(player.moves) || player.moves.some(move => !MOVES.includes(move))) throw new Error(`${player.name}: movimento inválido`);
    if (!OFF_BALL_STYLES.includes(player.offBall)) throw new Error(`${player.name}: comportamento sem bola inválido`);
    if (!ON_BALL_STYLES.includes(player.onBall)) throw new Error(`${player.name}: comportamento com bola inválido`);
    if (!Number.isFinite(player.potential) || player.potential < 0 || player.potential > 100) throw new Error(`${player.name}: potencial inválido`);
    if (!Number.isFinite(player.fatigue) || player.fatigue < 0 || player.fatigue > 1) throw new Error(`${player.name}: cansaço inválido`);
    if (player.injuryWeeks !== undefined && (!Number.isInteger(player.injuryWeeks) || player.injuryWeeks < 0)) throw new Error(`${player.name}: lesão inválida`);
    for (const key of ATTRIBUTE_KEYS) {
      const value = player.attributes[key];
      if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`${player.name}: ${key} inválido`);
    }
  }
}
