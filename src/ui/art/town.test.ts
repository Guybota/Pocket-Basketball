import { describe, expect, it } from 'vitest';
import { HOUSE_SIZE, ROAD_SIZE, TOWN_HOUSES, TOWN_ROADS, TOWN_TREES } from './town.ts';

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

  it('as casas não ficam umas em cima das outras', () => {
    TOWN_HOUSES.forEach(([i, j], n) => {
      TOWN_HOUSES.slice(n + 1).forEach(([k, l]) => {
        const apart = Math.abs(i - k) >= HOUSE_SIZE || Math.abs(j - l) >= HOUSE_SIZE;
        expect(apart, `(${i}, ${j}) e (${k}, ${l})`).toBe(true);
      });
    });
  });
});
