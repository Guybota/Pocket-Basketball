// O ícone de cada divisão: bola de bronze, seta de prata, escudo dourado com duas estrelas e coroa de ouro.
import { iconFrom } from './icons.ts';

// '#' é a cor da divisão, 'o' o laranja de realce e 'x' a tinta.
const ICONS: readonly (readonly [readonly string[], string])[] = [
  [[
    '.....xxxx.....', '...xx####xx...', '..x###xx###x..', '.x###x##x###x.', '.x##x####x##x.', 'x###x####x###x', 'xxxxxxxxxxxxxx',
    'x###x####x###x', '.x##x####x##x.', '.x###x##x###x.', '..x###xx###x..', '...xx####xx...', '.....xxxx.....', '..............',
  ], '#b87333'],
  [[
    '......xx......', '.....x##x.....', '....x####x....', '...x######x...', '..x########x..', '.x##########x.', 'xxxxxx##xxxxxx',
    '.....x##x.....', '.....x##x.....', '.....x##x.....', '.....x##x.....', '.....x##x.....', '.....xxxx.....', '..............',
  ], '#c0c7d1'],
  [[
    'xxxxxxxxxxxxxx', 'x############x', 'x###o####o###x', 'x##ooo##ooo##x', 'x###o####o###x', 'x############x', 'x############x',
    '.x##########x.', '.x##########x.', '..x########x..', '...x######x...', '....x####x....', '.....x##x.....', '......xx......',
  ], '#f2c230'],
  [[
    '..............', '.x....xx....x.', '.xx..x##x..xx.', '.x#x.x##x.x#x.', '.x##x####x##x.', '.x##########x.', '.x##########x.',
    '.x#o##o##o##x.', '.x##########x.', '.xxxxxxxxxxxx.', '.x##########x.', '.xxxxxxxxxxxx.', '..............', '..............',
  ], '#f2c230'],
];

const cache = new Map<number, string>();

/** A imagem do ícone de uma divisão, 16 por 16, pelo número dela (0 é a de baixo). */
export function leagueIcon(division: number): string {
  const cached = cache.get(division);
  if (cached) return cached;
  const [rows, color] = ICONS[Math.max(0, Math.min(ICONS.length - 1, division))]!;
  const url = iconFrom(rows, color, null);
  cache.set(division, url);
  return url;
}
