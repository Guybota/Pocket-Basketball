import { attributeWinRate, betterTeamWinRate, fullBonusWinRate, summarize } from '../sim/batch.ts';
import { DIVISIONS, generateLeagueTeam } from '../sim/teamgen.ts';
import { ATTRIBUTE_KEYS } from '../sim/types.ts';

const matches = Number(process.argv[2] ?? 1000);
if (!Number.isInteger(matches) || matches < 1) {
  console.error('Uso: npm run sim -- <número de jogos>');
  process.exit(1);
}

const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const start = performance.now();
const league = (level: number) => (i: number): [ReturnType<typeof generateLeagueTeam>, ReturnType<typeof generateLeagueTeam>] => [
  generateLeagueTeam(i * 2 + 1, 'Equipa A', level),
  generateLeagueTeam(i * 2 + 2, 'Equipa B', level),
];
const s = summarize(league(55), matches);
const elapsed = performance.now() - start;

console.log(`\nEquilíbrio em ${matches} jogos (nível 55), a ${(elapsed / matches).toFixed(1)} ms por jogo\n`);
console.log(`Pontos por equipa        ${s.meanPoints.toFixed(1)}   (objetivo: 35 a 50)`);
console.log(`Resultados entre 35 e 50 ${percent(s.pointsInRange)}`);
console.log(`Posses por jogo          ${s.meanPossessions.toFixed(1)}   (objetivo: 60 a 70)`);
console.log(`Segundos por posse       ${s.secondsPerPossession.toFixed(1)}    (objetivo: cerca de 7)`);
console.log(`Pontos por posse         ${s.pointsPerPossession.toFixed(2)}`);
console.log(`2 pontos                 ${percent(s.twoPercent)}`);
console.log(`3 pontos                 ${percent(s.threePercent)}, ${percent(s.threeShare)} dos lançamentos`);
console.log(`Lances livres            ${percent(s.freeThrowPercent)}, ${s.freeThrowsPerTeam.toFixed(1)} por equipa`);
console.log(`Ressaltos ofensivos      ${percent(s.offensiveReboundPercent)}`);
console.log(`Bolas perdidas           ${s.turnoversPerTeam.toFixed(1)} por equipa`);
console.log(`Faltas                   ${s.foulsPerTeam.toFixed(1)} por equipa`);
console.log(`Desarmes                 ${s.blocksPerTeam.toFixed(1)} por equipa`);
console.log(`Prolongamentos          ${percent(s.overtimes)}`);
console.log(`Diferença média          ${s.meanMargin.toFixed(1)} pontos`);

console.log(`\nPontos por divisão (${Math.min(matches, 300)} jogos cada)`);
for (const { name, level } of DIVISIONS) {
  const d = summarize(league(level), Math.min(matches, 300));
  console.log(`  ${name.padEnd(16)} ${d.meanPoints.toFixed(1)}`);
}

console.log(`\nA melhor equipa ganha    ${percent(betterTeamWinRate(55, matches))}   (objetivo: cerca de 70%)`);
console.log(`Uma nota acima em tudo   ${percent(fullBonusWinRate(17, Math.min(matches, 500)))}`);
console.log(`\nUma nota acima num só atributo (${Math.min(matches, 1000)} jogos cada; 50% seria sem efeito)`);
for (const key of ATTRIBUTE_KEYS) {
  console.log(`  ${key.padEnd(10)} ${percent(attributeWinRate(key, 17, Math.min(matches, 1000)))}`);
}
