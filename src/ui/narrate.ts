import type { MatchEvent, MatchState } from '../sim/match.ts';

/** Texto de um evento para o relato. Devolve null para os que não se contam. */
export function narrate(e: MatchEvent, s: MatchState): string | null {
  const team = s.teams[e.team].short;
  switch (e.type) {
    case 'period': return e.period <= 4 ? `Começa o período ${e.period}` : 'Começa o prolongamento';
    case 'made': return `${team}: ${e.player} marca ${e.points}${e.other ? `, assistência de ${e.other}` : ''}`;
    case 'missed': return `${team}: ${e.player} falha o lançamento de ${e.points}`;
    case 'block': return `${team}: ${e.player} desarma ${e.other}`;
    case 'rebound': return `${team}: ressalto ${e.offensive ? 'ofensivo' : 'defensivo'} de ${e.player}`;
    case 'steal': return `${team}: ${e.player} rouba a bola a ${e.other}`;
    case 'turnover': return `${team}: ${e.player} perde a bola`;
    case 'foul': return `${team}: falta de ${e.player}`;
    case 'freeThrowMade': return `${team}: ${e.player} marca o lance livre`;
    case 'freeThrowMissed': return `${team}: ${e.player} falha o lance livre`;
    case 'substitution': return `${team}: entra ${e.player}, sai ${e.other}`;
    case 'shot': return null;
    case 'end': return `Fim do jogo. Ganha ${s.teams[e.team].name}`;
  }
}

export function clockText(ticks: number): string {
  const total = Math.ceil(ticks / 20);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
