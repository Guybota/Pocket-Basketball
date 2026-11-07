import { describe, expect, it } from 'vitest';
import { simulateMatch } from '../sim/match.ts';
import { generateTeam } from '../sim/teamgen.ts';
import { decisiveTick, resultReasons } from './panel.ts';

describe('o lance decisivo', () => {
  it('é a última vez que o vencedor passou para a frente, e nunca depois do fim', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const s = simulateMatch(generateTeam(seed, 'A', 55), generateTeam(seed + 50, 'B', 55), seed);
      const tick = decisiveTick(s);
      expect(tick).toBeGreaterThan(0);
      expect(tick).toBeLessThanOrEqual(s.tick);
      const winner = s.score[0] > s.score[1] ? 0 : 1;
      const event = s.events.find(e => e.tick === tick && (e.type === 'made' || e.type === 'freeThrowMade'))!;
      expect(event.team).toBe(winner);
    }
  });
});

describe('as razões do resultado', () => {
  it('são no máximo três, e cada uma tem números', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const reasons = resultReasons(simulateMatch(generateTeam(seed, 'A', 55), generateTeam(seed + 50, 'B', 55), seed));
      expect(reasons.length).toBeGreaterThan(0);
      expect(reasons.length).toBeLessThanOrEqual(3);
      for (const r of reasons) expect(r).toMatch(/\d/);
    }
  });
});
