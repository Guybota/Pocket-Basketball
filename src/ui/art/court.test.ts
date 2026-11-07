import { describe, expect, it } from 'vitest';
import { courtTextures, fillPolygon } from './court.ts';

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

  it('a hora e a chuva mudam a luz; só chove no campo de rua', { tags: ['slow'] }, () => {
    const day = courtTextures(0, undefined, undefined, { hour: 'day', rain: false, sun: false });
    const night = courtTextures(0, undefined, undefined, { hour: 'night', rain: false, sun: false });
    const green = (t: typeof day): number => t.floor.reduce((sum, p) => sum + ((p >> 8) & 255), 0);
    expect(green(night)).toBeLessThan(green(day));
    expect(night.sky).not.toBe(day.sky);
    expect(courtTextures(0, undefined, undefined, { hour: 'day', rain: true, sun: false }).theme.rain).toBe(true);
    expect(courtTextures(2, undefined, undefined, { hour: 'day', rain: true, sun: false }).theme.rain).toBe(false);
  });
});

describe('polígonos', () => {
  it('faces vizinhas partilham a aresta sem buracos nem sobreposições, e a aresta 2:1 sobe sempre dois píxeis por linha', () => {
    const W = 80;
    const hits = new Array<number>(W * W).fill(0);
    const g = { canvas: { height: W }, fillStyle: '', fillRect(x: number, y: number, w: number, h: number) {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) hits[j * W + i]! += 1;
    } } as unknown as CanvasRenderingContext2D;
    // Uma caixa isométrica com vértices fracionários: face da frente, face do lado e tampo.
    const P = (i: number, j: number, k: number): [number, number] => [30.3 + (i - j) * 12, 20.7 + (i + j) * 6 - k * 12];
    const [i0, i1, j0, j1, h] = [0, 2.45, 0.1, 1.6, 2.2];
    fillPolygon(g, [P(i0, j1, 0), P(i1, j1, 0), P(i1, j1, h), P(i0, j1, h)], 'a');
    fillPolygon(g, [P(i1, j0, 0), P(i1, j1, 0), P(i1, j1, h), P(i1, j0, h)], 'b');
    fillPolygon(g, [P(i0, j0, h), P(i1, j0, h), P(i1, j1, h), P(i0, j1, h)], 'c');
    expect(hits.every(n => n <= 1)).toBe(true);
    // Sem buracos: em cada linha, os píxeis pintados são contíguos.
    const lefts: number[] = [];
    for (let y = 0; y < W; y++) {
      const row = hits.slice(y * W, y * W + W);
      const first = row.indexOf(1);
      if (first < 0) continue;
      expect(row.slice(first, row.lastIndexOf(1) + 1).every(n => n === 1)).toBe(true);
      lefts.push(first);
    }
    // O contorno esquerdo é o tampo (2:1), a aresta vertical e a base (2:1): fora dos cantos, cada degrau tem dois píxeis.
    const steps = lefts.slice(1).map((x, n) => x - lefts[n]!).filter(d => d !== 0);
    const corner = (n: number): boolean => Math.sign(steps[n - 1] ?? steps[n]!) !== Math.sign(steps[n]!) || Math.sign(steps[n + 1] ?? steps[n]!) !== Math.sign(steps[n]!);
    expect(steps.filter((d, n) => !corner(n) && Math.abs(d) !== 2)).toEqual([]);
    expect(steps.filter(d => Math.abs(d) === 2).length).toBeGreaterThan(10);
  });
});
