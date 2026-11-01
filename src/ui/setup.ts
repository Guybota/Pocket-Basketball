import { DIVISIONS, generateLeagueTeam } from '../sim/teamgen.ts';
import type { Team } from '../sim/types.ts';

// Nomes de exemplo. A lista final fica para a Fase 5.
export const CLUB_NAMES = [
  'Vilar BC', 'Ribeirinha BC', 'Atlético do Monte', 'Portela Basket', 'União da Serra', 'Sporting da Foz',
  'Alvorada BC', 'Recreio do Cais', 'Estrela do Vale', 'Académica da Ponte', 'Marítimo do Sul', 'Grupo da Lomba',
  'Pinhal Basket', 'Aldeia Nova BC', 'Penedo BC', 'Quinta da Luz', 'Mirante BC', 'Salinas BC',
  'Olival Basket', 'Torre Alta', 'Moinhos BC', 'Areal BC', 'Figueiral BC', 'Silveira BC',
  'Carvalhal BC', 'Rio Seco', 'Barra Clara', 'Lagoa Azul', 'Estação BC', 'Recanto BC',
  'Fontanário BC', 'Eirinha BC', 'Vale Fundo', 'Cerro BC', 'Tojal Basket', 'Hortinha BC',
  'Jardim do Paço', 'Bairro da Graça', 'Ginásio da Nora', 'Zambujal BC', 'Kartódromo BC',
] as const;

/** Os clubes de fora: 12 da Taça Continental e, no fim, o campeão de outro continente, para o Mundial. */
export const FOREIGN_NAMES = [
  'Reyes del Sol', 'Lindhaven Lions', 'Dinamo Zelenograd', 'Castelrosso Basket', 'Aurora Boreal', 'Kronberg Löwen',
  'Port-Marin Océan', 'Sankt Ludwig', 'Vallecito Toros', 'Marmara Yildiz', 'Brightwater Union', 'Ferrovia Bianconera',
  'Pacific Harbor Breakers',
] as const;

/** A abreviatura do marcador: três letras da última palavra com mais de três letras. */
export function shortName(name: string): string {
  const word = name.split(' ').filter(part => part.length > 3 && part !== 'Basket').at(-1) ?? name;
  return word.normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 3).toUpperCase();
}

/** As equipas de um jogo dependem só da semente e da divisão, para o jogo poder ser repetido. */
export function matchTeams(seed: number, division: number): [Team, Team] {
  const { level } = DIVISIONS[division]!;
  const home = CLUB_NAMES[Math.abs(seed) % CLUB_NAMES.length]!;
  const away = CLUB_NAMES[(Math.abs(seed) + 1 + (Math.abs(seed) >> 4) % (CLUB_NAMES.length - 1)) % CLUB_NAMES.length]!;
  const teamA = generateLeagueTeam(seed * 2 + 1, home, level);
  const teamB = generateLeagueTeam(seed * 2 + 2, away, level);
  return [{ ...teamA, short: shortName(home) }, { ...teamB, short: shortName(away) }];
}
