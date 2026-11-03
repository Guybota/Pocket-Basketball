import { simulateMatch } from '../sim/match.ts';
import { generateTeam } from '../sim/teamgen.ts';
import { matchReport } from '../ui/commentary.ts';

const seed = Number(process.argv[2] ?? 1);
if (!Number.isInteger(seed)) {
  console.error('Uso: npm run watch-match -- <semente>');
  process.exit(1);
}

const s = simulateMatch(generateTeam(seed * 2 + 1, 'Vilar BC', 55), generateTeam(seed * 2 + 2, 'Ribeirinha BC', 55), seed);
console.log(matchReport(s));
