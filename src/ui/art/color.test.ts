import { describe, expect, it } from 'vitest';
import { kitClash } from '../airport.ts';
import { CLUB_NAMES, FOREIGN_NAMES } from '../setup.ts';
import { CLASH, VISION_LIST, deltaE, oklabOf, teamsClash } from './color.ts';
import { clubIdentity, kitAgainst } from './identity.ts';
import { DEFAULT_KITS, PALETTE } from './kit.ts';

describe('cor das camisolas', () => {
  it('confere com os valores de referência de cor.md', () => {
    expect(oklabOf('#ffffff')[0]).toBeCloseTo(1, 4);
    expect(deltaE('#000000', '#ffffff')).toBeCloseTo(1, 4);
    // As linhas das matrizes somam 1: o branco e o preto não mudam.
    for (const v of VISION_LIST) {
      expect(deltaE('#ffffff', '#ffffff', v)).toBe(0);
      expect(oklabOf('#ffffff', v)[0]).toBeCloseTo(1, 2);
    }
    // §6.2: azul e roxo quase iguais em deuteranopia, verde e vermelho também.
    expect(deltaE('#2b5fd9', '#7246c4')).toBeCloseTo(0.105, 2);
    expect(deltaE('#2b5fd9', '#7246c4', 'deuteranopia')).toBeCloseTo(0.034, 2);
    expect(deltaE('#2f8f5b', '#cf3a2c', 'deuteranopia')).toBeCloseTo(0.064, 2);
    expect(teamsClash('#2f8f5b', '#cf3a2c')).toBe(true);
    expect(teamsClash('#1b2230', '#f2c230')).toBe(false);
  });

  const names = [...CLUB_NAMES, ...FOREIGN_NAMES];
  const distinct = (x: string, y: string): boolean =>
    Math.abs(oklabOf(x)[0] - oklabOf(y)[0]) >= CLASH.lightness ||
    (deltaE(x, y) >= CLASH.normal && VISION_LIST.every(v => deltaE(x, y, v) >= CLASH.simulated));

  // Todos os pares, e não só os da mesma divisão: as subidas e as taças juntam clubes de qualquer lado.
  it('qualquer clube da liga distingue-se do da casa, com e sem daltonismo', () => {
    const failing = names.flatMap(home => names.filter(name => name !== home).flatMap(name => {
      const ours = clubIdentity(home).kits[0];
      const theirs = kitAgainst(name, ours);
      return distinct(ours.jersey, theirs.jersey) ? [] : [`${home} ${ours.jersey} / ${name} ${theirs.jersey}`];
    }));
    expect(failing).toEqual([]);
  });

  it('qualquer clube da liga se distingue dos nossos equipamentos de origem', () => {
    for (const kit of DEFAULT_KITS) {
      expect(names.filter(name => !distinct(kit.jersey, kitAgainst(name, kit).jersey))).toEqual([]);
    }
  });

  it('kitClash usa a mesma regra', () => {
    const jerseys = [...new Set([...PALETTE, ...names.flatMap(name => clubIdentity(name).kits.map(kit => kit.jersey))])];
    for (const x of jerseys) for (const y of jerseys) {
      expect(kitClash({ ...DEFAULT_KITS[0]!, jersey: x }, { ...DEFAULT_KITS[0]!, jersey: y })).toBe(teamsClash(x, y));
    }
  });
});
