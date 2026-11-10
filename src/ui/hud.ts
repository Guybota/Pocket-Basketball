// O marcador por cima do campo.
import { TICKS_PER_SECOND } from '../sim/court.ts';
import { clubIdentity } from './art/identity.ts';
import { emblemImage, type Emblem } from './art/kit.ts';
import type { MatchView } from './match-view.ts';
import { clockText } from './narrate.ts';
import { escapeHtml, slotCode } from './panel.ts';

export interface Hud {
  update: (view: MatchView, homeEmblem: Emblem) => void;
  /** Esquece o que estava escrito, para o próximo jogo voltar a desenhar o marcador. */
  reset: () => void;
}

/** Quanto dura o piscar do número de quem marcou. */
const SCORE_FLASH_MS = 600;

/** O marcador é HTML: a letra fica nítida a qualquer tamanho e só muda quando algo muda. */
export function createHud(hud: HTMLElement): Hud {
  let shown = '';
  // O número de quem marcou pisca uma vez na cor da equipa. Guarda-se quando subiu, para o piscar continuar onde ia
  // quando o marcador se reescreve (o relógio muda a cada segundo).
  let lastScore: [number, number] | null = null;
  const flashAt: [number, number] = [-Infinity, -Infinity];
  return {
    reset: () => {
      shown = '';
      lastScore = null;
    },
    update: (view, homeEmblem) => {
      const { s } = view;
      const carrier = view.carrier();
      const period = s.period <= 4 ? `P${s.period}` : 'PR';
      const shotClock = s.phase === 'live' || s.phase === 'pass' ? Math.max(0, Math.ceil(s.shotClock / TICKS_PER_SECOND)) : null;
      const carrierName = carrier ? carrier.player.name : '';
      const carrierPos = carrier ? slotCode(carrier.slot) : '';
      const now = performance.now();
      // Num momento grande, o marcador só muda quando o número novo troca no centro.
      const score = view.shownScore();
      if (lastScore) for (const i of [0, 1] as const) if (score[i] > lastScore[i]) flashAt[i] = now;
      lastScore = [score[0], score[1]];
      const points = (i: 0 | 1): string => {
        const age = now - flashAt[i];
        return age < SCORE_FLASH_MS ? `<b class="points flash team-${i}" style="animation-delay:-${Math.round(age)}ms">${score[i]}</b>` : `<b class="points">${score[i]}</b>`;
      };
      const next = [score[0], score[1], period, now - flashAt[0] < SCORE_FLASH_MS, now - flashAt[1] < SCORE_FLASH_MS, clockText(s.clock), shotClock, carrierName, carrier?.team, s.teams[0].short, s.teams[1].short].join('|');
      if (next === shown) return;
      shown = next;
      const urgent = shotClock !== null && shotClock <= 3;
      hud.innerHTML = `<div class="scorebug">
      <span class="side team-0"><img class="emblem" alt="" style="width:14px;height:14px" src="${emblemImage(homeEmblem)}">${escapeHtml(s.teams[0].short)}</span>
      ${points(0)}
      <span class="time"><small>${period}</small>${clockText(s.clock)}</span>
      ${points(1)}
      <span class="side team-1">${escapeHtml(s.teams[1].short)}<img class="emblem" alt="" style="width:14px;height:14px" src="${emblemImage(clubIdentity(s.teams[1].name).emblem)}"></span>
      <span class="shot-clock${urgent ? ' urgent' : ''}">${shotClock ?? '-'}</span>
    </div>
    ${carrier ? `<div class="carrier team-${carrier.team}"><i></i><span>${carrierPos}</span><b>${escapeHtml(carrierName)}</b></div>` : ''}`;
    },
  };
}
