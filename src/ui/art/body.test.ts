import { describe, expect, it } from 'vitest';
import { buildOf, pixelsForHeight } from './body.ts';

describe('tipos de corpo', () => {
  it('escolhe o tipo pelo peso, pela altura e pela força', () => {
    expect(buildOf(190, 72, 40)).toBe('slim');
    expect(buildOf(198, 98, 50)).toBe('athletic');
    expect(buildOf(198, 98, 80)).toBe('muscular');
    expect(buildOf(208, 125, 40)).toBe('heavy');
    expect(buildOf(208, 125, 80)).toBe('muscular');
  });

  it('respeita os limites exatos da regra', () => {
    expect(buildOf(200, 86, 50)).toBe('athletic');
    expect(buildOf(200, 85.9, 50)).toBe('slim');
    expect(buildOf(200, 112, 64)).toBe('heavy');
    expect(buildOf(200, 112, 65)).toBe('muscular');
    expect(buildOf(200, 100, 71)).toBe('athletic');
    expect(buildOf(200, 100, 72)).toBe('muscular');
  });

  it('converte a altura em píxeis, sem sair dos limites do boneco', () => {
    expect(pixelsForHeight(170)).toEqual({ legs: 5, torso: 5 });
    expect(pixelsForHeight(185)).toEqual({ legs: 6, torso: 6 });
    expect(pixelsForHeight(200)).toEqual({ legs: 7, torso: 7 });
    expect(pixelsForHeight(192)).toEqual({ legs: 7, torso: 6 });
    const tiny = pixelsForHeight(120);
    const huge = pixelsForHeight(260);
    expect(tiny.legs + tiny.torso + 12).toBe(20);
    expect(huge.legs + huge.torso + 12).toBe(30);
  });
});
