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

export interface Player {
  name: string;
  position: Position;
  attributes: Attributes;
}

/** Os cinco primeiros jogadores do plantel são os titulares, por ordem de posição. */
export interface Team {
  name: string;
  short: string;
  roster: Player[];
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
  for (const player of team.roster) {
    if (!POSITIONS.includes(player.position)) throw new Error(`${player.name}: posição inválida`);
    for (const key of ATTRIBUTE_KEYS) {
      const value = player.attributes[key];
      if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`${player.name}: ${key} inválido`);
    }
  }
}
