import { describe, expect, it } from 'vitest';
import { FAN_SPACING, THEMES, chairPhase, courtTextures, fanHeight, fanRows, fillPolygon, seats, stairs } from './court.ts';

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

describe('bancada em degraus', () => {
  const stepped = THEMES.filter(t => t.steps);

  it('senta cada adepto no meio de uma cadeira, nas laterais, nos cantos e nos topos', () => {
    // As duas arenas com os cantos cortados, e o ginásio da escola com a bancada de tábuas só na lateral.
    expect(stepped.map(t => t.name)).toEqual(['Pavilhão Escolar', 'Pavilhão Municipal', 'Grande Arena']);
    for (const theme of stepped) {
      expect(fanRows(theme)).toBeGreaterThanOrEqual(3);
      for (let row = 0; row < fanRows(theme); row++) {
        const list = seats(theme, row);
        expect(new Set(list.map(s => s.plane))).toEqual(new Set(theme.chamfer ? ['side', 'end', 'diag'] : ['side']));
        for (const s of list) expect(chairPhase(theme, s.plane, row, s.along)).toBeCloseTo(0.5, 6);
      }
    }
  });

  it('não põe ninguém em cima de outro, nas escadas nem na dobra dos cantos', () => {
    for (const theme of stepped) {
      for (let row = 0; row < fanRows(theme); row++) {
        const list = seats(theme, row);
        // Na mesma fila, dois adeptos ficam pelo menos a um lugar de distância, também de uma bancada para a do lado.
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const d = Math.sqrt((list[i]!.x - list[j]!.x) ** 2 + (list[i]!.y - list[j]!.y) ** 2);
            expect(d).toBeGreaterThan(FAN_SPACING - 1e-6);
          }
        }
        // Um adepto sentado ocupa ~0,42 m para cada lado: fica fora das escadas e do seu lado da dobra do canto, que recua
        // ao subir.
        const z = fanHeight(theme, row);
        const shift = (Math.SQRT2 - 1) * theme.slope * z;
        for (const s of list) {
          for (const [lo, hi] of stairs(theme, s.plane)) expect(s.along <= lo - 0.42 || s.along >= hi + 0.42).toBe(true);
          if (!theme.chamfer) continue;
          const clear = s.plane === 'side' ? Math.min(s.x - (-shift), 28 + shift - s.x) : s.plane === 'end' ? s.y - (-7 - shift) : 4 / Math.SQRT2 + shift - Math.abs(s.along);
          expect(clear).toBeGreaterThan(0.42);
        }
      }
    }
  });
});
