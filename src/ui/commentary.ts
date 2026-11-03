import type { MatchEvent, MatchState } from '../sim/match.ts';

// Texto do relato, partilhado entre `npm run watch-match` e a página web.
export const clock = (ticks: number): string => {
  const total = Math.ceil(ticks / 20);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export function describe(e: MatchEvent, s: MatchState): string | null {
  const team = s.teams[e.team].short;
  switch (e.type) {
    case 'period': return `\n--- ${e.period <= 4 ? `Período ${e.period}` : 'Prolongamento'} (bola para ${team}) ---`;
    case 'made': return `${team} ${e.player} marca ${e.points} pontos${e.other ? `, assistência de ${e.other}` : ''}`;
    case 'missed': return `${team} ${e.player} falha o lançamento de ${e.points}`;
    case 'block': return `${team} ${e.player} desarma ${e.other}`;
    case 'rebound': return `${team} ${e.player} ganha o ressalto ${e.offensive ? 'ofensivo' : 'defensivo'}`;
    case 'steal': return `${team} ${e.player} rouba a bola a ${e.other}`;
    case 'turnover': return `${team} ${e.player} perde a bola`;
    case 'foul': return `${team} ${e.player} faz falta`;
    case 'freeThrowMade': return `${team} ${e.player} marca o lance livre`;
    case 'freeThrowMissed': return `${team} ${e.player} falha o lance livre`;
    case 'substitution': return `${team} entra ${e.player}, sai ${e.other}`;
    case 'shot':
    case 'end': return null;
  }
}

// Relato completo de um jogo, linha a linha.
export function matchReport(s: MatchState): string {
  const out: string[] = [];
  const running: [number, number] = [0, 0];
  for (const e of s.events) {
    if (e.type === 'made') running[e.team] += e.points!;
    if (e.type === 'freeThrowMade') running[e.team] += 1;
    const line = describe(e, s);
    if (!line) continue;
    if (e.type === 'period') out.push(line);
    else out.push(`${clock(e.clock).padStart(5)}  ${String(running[0]).padStart(2)}-${String(running[1]).padEnd(2)}  ${line}`);
  }
  out.push(`\nResultado final: ${s.teams[0].name} ${s.score[0]} - ${s.score[1]} ${s.teams[1].name}\n`);
  for (const team of [0, 1] as const) {
    out.push(s.teams[team].name);
    const players = s.bodies.filter(b => b.team === team).sort((a, b) => b.line.points - a.line.points);
    for (const b of players) {
      const l = b.line;
      out.push(`  ${b.player.position} ${b.player.name.padEnd(10)} ${String(l.points).padStart(2)} pts  ${l.rebounds} res  ${l.assists} ass  ${l.steals} rou  ${l.fouls} fal  ${Math.round(l.secondsPlayed)} s`);
    }
  }
  return out.join('\n');
}
