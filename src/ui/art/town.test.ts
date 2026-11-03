import { describe, expect, it } from 'vitest';
import { HOUSE_SIZE, ROAD_SIZE, TOWN_HOUSES, TOWN_ROADS, TOWN_TREES, townBoxes, townHit, weatherFor } from './town.ts';

const onRoad = (i0: number, i1: number, j0: number, j1: number, margin: number): boolean =>
  TOWN_ROADS.some(road => {
    const [low, high] = road.along === 'i' ? [j0, j1] : [i0, i1];
    return high > road.at - margin && low < road.at + ROAD_SIZE + margin;
  });

describe('mapa da cidade', () => {
  it('nenhuma casa fica em cima de uma estrada, nem colada a ela', () => {
    for (const [i, j] of TOWN_HOUSES) {
      expect(onRoad(i, i + HOUSE_SIZE, j, j + HOUSE_SIZE, 0.4), `casa em (${i}, ${j})`).toBe(false);
    }
  });

  it('nenhuma árvore nasce numa estrada', () => {
    for (const [i, j] of TOWN_TREES) expect(onRoad(i, i, j, j, 0.2), `árvore em (${i}, ${j})`).toBe(false);
  });

  it('tocar no meio de cada edifício abre esse edifício, e fora deles nada', () => {
    const boxes = townBoxes(360, 574, 1);
    for (const place of ['arena', 'office', 'training', 'federation', 'tower', 'airport'] as const) {
      const b = boxes[place];
      expect(townHit(360, 574, 1, (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2)).toBe(place);
    }
    expect(townHit(360, 574, 1, 0.02, 0.02)).toBeNull();
  });

  it('a luz e o tempo mudam com a semana: setembro limpo, dezembro de noite, janeiro com neve e nunca chuva', () => {
    expect(weatherFor(1)).toMatchObject({ tint: null, night: false, snow: false });
    expect(weatherFor(14).night).toBe(true);
    expect(weatherFor(18).snow).toBe(true);
    // Não chove: o dono do projeto tirou a chuva a 3 de novembro de 2026.
    expect(weatherFor(3)).not.toHaveProperty('rain');
  });

  it('as casas não ficam umas em cima das outras', () => {
    TOWN_HOUSES.forEach(([i, j], n) => {
      TOWN_HOUSES.slice(n + 1).forEach(([k, l]) => {
        const apart = Math.abs(i - k) >= HOUSE_SIZE || Math.abs(j - l) >= HOUSE_SIZE;
        expect(apart, `(${i}, ${j}) e (${k}, ${l})`).toBe(true);
      });
    });
  });
});
