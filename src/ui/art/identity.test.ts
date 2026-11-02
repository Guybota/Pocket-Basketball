import { describe, expect, it } from 'vitest';
import { CLUB_NAMES, FOREIGN_NAMES } from '../setup.ts';
import { clubIdentity, kitAgainst } from './identity.ts';
import { EMBLEM_SYMBOL_LIST, RESERVED_SYMBOLS, validEmblem, validKit } from './kit.ts';

describe('identidade dos clubes', () => {
  const names = [...CLUB_NAMES, ...FOREIGN_NAMES];

  it('cada clube tem um emblema só seu, com um símbolo que o editor não mostra', () => {
    const pairs = names.map(name => {
      const { emblem } = clubIdentity(name);
      return `${emblem.shape}:${emblem.symbol}`;
    });
    expect(new Set(pairs).size).toBe(names.length);
    for (const name of names) {
      const { emblem, kits } = clubIdentity(name);
      expect(validEmblem(emblem)).toBe(true);
      expect(EMBLEM_SYMBOL_LIST.some(([id]) => id === emblem.symbol)).toBe(false);
      expect(kits.every(validKit)).toBe(true);
    }
    expect(RESERVED_SYMBOLS.some(symbol => EMBLEM_SYMBOL_LIST.some(([id]) => id === symbol))).toBe(false);
  });

  it('é sempre a mesma, e contra uma camisola parecida joga-se com o equipamento alternativo', () => {
    expect(clubIdentity('Vilar BC')).toEqual(clubIdentity('Vilar BC'));
    const [home, away] = clubIdentity('Vilar BC').kits;
    expect(kitAgainst('Vilar BC', home)).toBe(away);
    expect(kitAgainst('Vilar BC', away)).toBe(home);
  });
});
