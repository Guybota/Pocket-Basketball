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

/** O marcador é HTML: a letra fica nítida a qualquer tamanho e só muda quando algo muda. */
export function createHud(hud: HTMLElement): Hud {
  let shown = '';
  return {
    reset: () => {
      shown = '';
    },
    update: (view, homeEmblem) => {
      const { s } = view;
      const carrier = view.carrier();
      const period = s.period <= 4 ? `P${s.period}` : 'PR';
      const shotClock = s.phase === 'live' || s.phase === 'pass' ? Math.max(0, Math.ceil(s.shotClock / TICKS_PER_SECOND)) : null;
      const carrierName = carrier ? carrier.player.name : '';
      const carrierPos = carrier ? slotCode(carrier.slot) : '';
      const next = [s.score[0], s.score[1], period, clockText(s.clock), shotClock, carrierName, carrier?.team, s.teams[0].short, s.teams[1].short].join('|');
      if (next === shown) return;
      shown = next;
      const urgent = shotClock !== null && shotClock <= 3;
      hud.innerHTML = `<div class="scorebug">
      <span class="side team-0"><img class="emblem" alt="" style="width:14px;height:14px" src="${emblemImage(homeEmblem)}">${escapeHtml(s.teams[0].short)}</span>
      <b class="points">${s.score[0]}</b>
      <span class="time"><small>${period}</small>${clockText(s.clock)}</span>
      <b class="points">${s.score[1]}</b>
      <span class="side team-1">${escapeHtml(s.teams[1].short)}<img class="emblem" alt="" style="width:14px;height:14px" src="${emblemImage(clubIdentity(s.teams[1].name).emblem)}"></span>
      <span class="shot-clock${urgent ? ' urgent' : ''}">${shotClock ?? '-'}</span>
    </div>
    ${carrier ? `<div class="carrier team-${carrier.team}"><i></i><span>${carrierPos}</span><b>${escapeHtml(carrierName)}</b></div>` : ''}`;
    },
  };
}
