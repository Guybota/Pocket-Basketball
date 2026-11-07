import { describe, expect, it } from 'vitest';
import { courtTextures } from './court.ts';

describe('pavilhão', () => {
  it('veste as cores do clube da casa, e guarda cada versão', { tags: ['slow'] }, () => {
    const plain = courtTextures(2);
    const red = courtTextures(2, '#cf3a2c');
    expect(red).not.toBe(plain);
    expect(courtTextures(2, '#cf3a2c')).toBe(red);
    expect(red.theme.name).toBe(plain.theme.name);
    expect(red.floor.some((p, i) => p !== plain.floor[i])).toBe(true);
    // A bancada da textura são só cadeiras: a cor do público está nos bonecos, desenhados pela vista do jogo.
    expect(red.walls[0]!.every((p, i) => p === plain.walls[0]![i])).toBe(true);
  });

  it('no campo de rua só muda a pintura, porque não há bancada', () => {
    const plain = courtTextures(0);
    const red = courtTextures(0, '#cf3a2c');
    expect(red.floor.some((p, i) => p !== plain.floor[i])).toBe(true);
    expect(red.walls[0]!.every((p, i) => p === plain.walls[0]![i])).toBe(true);
  });
});
