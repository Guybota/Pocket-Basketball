import { describe, expect, it } from 'vitest';
import { remember } from './cache.ts';

describe('cache com limite', () => {
  it('passado o limite, esquece o mais antigo', () => {
    const map = new Map<string, number>();
    for (const [i, key] of ['a', 'b', 'c', 'd'].entries()) expect(remember(map, key, i, 3)).toBe(i);
    expect([...map.keys()]).toEqual(['b', 'c', 'd']);
  });
});
