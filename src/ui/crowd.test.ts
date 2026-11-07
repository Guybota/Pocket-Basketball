import { describe, expect, it } from 'vitest';
import { CROWD_LINES, CROWD_MAX_LENGTH, crowdLine, type CrowdMood } from './crowd.ts';

const FONT = /^[A-Z0-9ÁÀÂÃÉÊÍÓÔÕÚÇ%:\-+.!? ]+$/;

describe('bancada', () => {
  it('só usa letras da fonte e cabe no balão', () => {
    for (const lines of Object.values(CROWD_LINES)) for (const line of lines) {
      expect(line, line).toMatch(FONT);
      expect(line.length, line).toBeLessThanOrEqual(CROWD_MAX_LENGTH);
    }
  });

  it('passa por todas as frases de um contexto antes de repetir', () => {
    for (const mood of Object.keys(CROWD_LINES) as CrowdMood[]) {
      const lines = CROWD_LINES[mood];
      expect(new Set(lines).size, mood).toBe(lines.length);
      for (const seed of [0, 42, 987654321]) {
        const said = new Set(lines.map((_, n) => crowdLine(mood, seed, n)));
        expect(said.size, mood).toBe(lines.length);
      }
    }
  });
});
