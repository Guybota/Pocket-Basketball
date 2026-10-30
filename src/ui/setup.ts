import { DIVISIONS, generateLeagueTeam } from '../sim/teamgen.ts';
import type { Team } from '../sim/types.ts';

// Nomes de exemplo. A lista final fica para a Fase 5.
const CLUBS = [
  'Vilar BC', 'Ribeirinha BC', 'Atlético do Monte', 'Portela Basket', 'União da Serra', 'Sporting da Foz',
  'Alvorada BC', 'Recreio do Cais', 'Estrela do Vale', 'Académica da Ponte', 'Marítimo do Sul', 'Grupo da Lomba',
];

/** As equipas de um jogo dependem só da semente e da divisão, para o jogo poder ser repetido. */
export function matchTeams(seed: number, division: number): [Team, Team] {
  const { level } = DIVISIONS[division]!;
  const home = CLUBS[Math.abs(seed) % CLUBS.length]!;
  const away = CLUBS[(Math.abs(seed) + 1 + (Math.abs(seed) >> 4) % (CLUBS.length - 1)) % CLUBS.length]!;
  const short = (name: string): string => {
    const word = name.split(' ').filter(part => part.length > 3).at(-1) ?? name;
    return word.normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 3).toUpperCase();
  };
  const teamA = generateLeagueTeam(seed * 2 + 1, home, level);
  const teamB = generateLeagueTeam(seed * 2 + 2, away, level);
  return [{ ...teamA, short: short(home) }, { ...teamB, short: short(away) }];
}
