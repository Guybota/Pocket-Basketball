import { simulateMatch } from '../sim/match.ts';
import { generateTeam } from '../sim/teamgen.ts';
import { matchReport } from '../ui/commentary.ts';

// Mesmas equipas que `npm run watch-match`, para comparar o browser com o Node.
const form = document.querySelector('form')!;
const input = document.querySelector<HTMLInputElement>('#seed')!;
const output = document.querySelector('output')!;

function show(seed: number): void {
  const s = simulateMatch(generateTeam(seed * 2 + 1, 'Vilar BC', 55), generateTeam(seed * 2 + 2, 'Ribeirinha BC', 55), seed);
  output.textContent = matchReport(s);
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const seed = Number(input.value);
  if (Number.isInteger(seed)) show(seed);
});
show(Number(input.value));
