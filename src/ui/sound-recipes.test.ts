import { describe, expect, it } from 'vitest';
import { cook } from './sound-recipes.ts';
import { babble, horn, makeRng, roar, type Sample } from './synth.ts';

/** A semente que o jogo dá à variante `i` do som `key`. */
function seedOf(key: string, i: number): number {
  let seed = 0;
  for (let k = 0; k < key.length; k++) seed = (seed * 31 + key.charCodeAt(k)) | 0;
  return seed + i * 7919;
}
const flat = (s: Sample): number[] => (s instanceof Float32Array ? [...s] : s.flatMap(c => [...c]));

describe('as receitas dos sons', () => {
  it('dão o mesmo que chamar a síntese diretamente, com os argumentos pela ordem certa', () => {
    expect(flat(cook('horn:150:1', 1, ['horn', 150, 1])[0]!)).toEqual(flat(horn(150, 1, makeRng(seedOf('horn:150:1', 0)))));
    expect(flat(cook('roar:good:5#0', 1, ['roar', 5, 1, 'good'])[0]!)).toEqual(flat(roar(5, 1, makeRng(seedOf('roar:good:5#0', 0)), 'good')));
    const [, second] = cook('babble:3:far', 2, ['babble', 3, 0.5, 1600]);
    expect(flat(second!)).toEqual(flat(babble(3, 0.5, makeRng(seedOf('babble:3:far', 1)), 1600)));
  });
});
