import type { MatchEvent, MatchState } from '../sim/match.ts';
import type { MoveId, OffBallStyle, OnBallStyle } from '../sim/types.ts';

export const OFF_BALL_INFO: Record<OffBallStyle, { name: string; description: string }> = {
  balanced: { name: 'Equilibrado', description: 'Segue o sistema da equipa.' },
  spotUp: { name: 'Atirador Parado', description: 'Espera aberto na linha de 3.' },
  cutter: { name: 'Cortador', description: 'Corta para o cesto vezes sem conta.' },
  lowPost: { name: 'Poste Baixo', description: 'Fica sempre perto do cesto.' },
  crasher: { name: 'Ressaltador', description: 'Corre para o cesto em cada lançamento.' },
  leaker: { name: 'Contra-ataque', description: 'Larga a defesa cedo e corre para o outro lado.' },
  screener: { name: 'Bloqueador', description: 'Faz bloqueios para o colega com a bola.' },
  shadow: { name: 'Sombra', description: 'Defende colado ao adversário direto.' },
};

export const ON_BALL_INFO: Record<OnBallStyle, { name: string; description: string }> = {
  balanced: { name: 'Equilibrado', description: 'Escolhe conforme a jogada.' },
  playmaker: { name: 'Organizador', description: 'Procura primeiro o passe.' },
  scorer: { name: 'Solista', description: 'Prefere resolver sozinho.' },
  slasher: { name: 'Penetrador', description: 'Ataca o cesto em drible.' },
  shooter: { name: 'Lançador', description: 'Procura o lançamento de 3.' },
  postUp: { name: 'Poste de Costas', description: 'Joga perto do cesto, de costas.' },
};

export const MOVE_INFO: Record<MoveId, { name: string; description: string }> = {
  crossover: { name: 'Crossover', description: 'Muda de mão e deixa o defensor parado.' },
  stepBack: { name: 'Step-back', description: 'Recua antes de lançar para ganhar espaço.' },
  alleyOop: { name: 'Alley-oop', description: 'Passe alto para um colega afundar no ar.' },
  powerDunk: { name: 'Afundanço de Força', description: 'Perto do cesto, não há desarme que o pare.' },
  pickpocket: { name: 'Mão Rápida', description: 'Rouba a bola muito mais vezes.' },
};

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
    case 'move': return `${team}: ${MOVE_INFO[e.move!].name} de ${e.player}!`;
    case 'timeout': return `Desconto de tempo: ${s.teams[e.team].name}`;
    case 'shotClockViolation': return `${team}: acabou o tempo de posse`;
    case 'shot':
    case 'periodEnd': return null;
    case 'end': return `Fim do jogo. Ganha ${s.teams[e.team].name}`;
  }
}

export function clockText(ticks: number): string {
  const total = Math.ceil(ticks / 20);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
