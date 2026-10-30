import { simulateMatch } from '../sim/match.ts';
import { clockText, narrate } from '../ui/narrate.ts';
import { matchTeams } from '../ui/setup.ts';

const seed = Number(process.argv[2] ?? 1);
const division = Number(process.argv[3] ?? 1);
if (!Number.isInteger(seed) || !Number.isInteger(division) || division < 0 || division > 3) {
  console.error('Uso: npm run watch-match -- <semente> <divisão de 0 a 3>');
  process.exit(1);
}

const s = simulateMatch(...matchTeams(seed, division), seed);
const running: [number, number] = [0, 0];
for (const e of s.events) {
  if (e.type === 'made') running[e.team] += e.points!;
  if (e.type === 'freeThrowMade') running[e.team] += 1;
  const line = narrate(e, s);
  if (!line) continue;
  if (e.type === 'period') console.log(`\n--- ${line} ---`);
  else console.log(`${clockText(e.clock).padStart(5)}  ${String(running[0]).padStart(2)}-${String(running[1]).padEnd(2)}  ${line}`);
}

console.log(`\nResultado final: ${s.teams[0].name} ${s.score[0]} - ${s.score[1]} ${s.teams[1].name}\n`);
for (const team of [0, 1] as const) {
  console.log(s.teams[team].name);
  const players = s.bodies.filter(b => b.team === team).sort((a, b) => b.line.points - a.line.points);
  for (const b of players) {
    const l = b.line;
    console.log(`  ${b.player.position} ${b.player.name.padEnd(10)} ${String(l.points).padStart(2)} pts  ${l.rebounds} res  ${l.assists} ass  ${l.steals} rou  ${l.fouls} fal  ${Math.round(l.secondsPlayed)} s`);
  }
}
