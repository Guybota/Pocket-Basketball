// O jogo de demonstração do ecrã de título, quando ninguém toca durante uns segundos.
import { TICKS_PER_SECOND } from '../sim/court.ts';
import { DIVISIONS } from '../sim/teamgen.ts';
import { clubIdentity, kitAgainst } from './art/identity.ts';
import { aiTeam, clubColor, type ClubState } from './club.ts';
import { MatchView } from './match-view.ts';

const DEMO_AFTER_MS = 8000;

export interface Demo {
  /** Volta a contar os segundos sem toques até a demonstração começar. */
  schedule: () => void;
  stop: () => void;
  resize: () => void;
  /** Avança e desenha a demonstração. Devolve falso quando não há nenhuma a correr. */
  frame: (elapsed: number) => boolean;
  tick: () => number | null;
}

/** `source` dá os clubes da liga; `active` diz se ainda se está no título. */
export function createDemo(context: CanvasRenderingContext2D, source: () => ClubState, active: () => boolean): Demo {
  let view: MatchView | undefined;
  let timer = 0;
  let accumulator = 0;

  /** Sem ninguém a tocar, o título mostra um jogo entre dois clubes da divisão de cima, como uma máquina de arcada. */
  function start(): void {
    if (!active()) return;
    const clubs = source();
    const top = clubs.divisions[DIVISIONS.length - 1]!;
    const seed = Math.floor(Date.now() / 1000) & 0x7fffffff;
    const home = clubs.clubs[top[seed % top.length]!]!;
    const away = clubs.clubs[top[(seed + 1) % top.length]!]!;
    const quiet = { announce: () => {}, event: () => {}, sound: () => {} };
    const homeKit = clubIdentity(home.name).kits[0];
    view = new MatchView(context, aiTeam(home), aiTeam(away), seed, DIVISIONS.length - 1, quiet, [false, false], 1, homeKit, undefined, clubColor(home), 0.7, kitAgainst(away.name, homeKit), clubIdentity(home.name).emblem);
    view.snapCamera();
    accumulator = 0;
  }

  return {
    schedule: () => {
      clearTimeout(timer);
      timer = window.setTimeout(start, DEMO_AFTER_MS);
    },
    stop: () => {
      clearTimeout(timer);
      view = undefined;
    },
    resize: () => view?.resize(),
    frame: elapsed => {
      if (!view) return false;
      accumulator += elapsed * TICKS_PER_SECOND;
      while (accumulator >= 1 && view.s.phase !== 'end') {
        view.stepSim();
        accumulator -= 1;
      }
      if (view.s.phase === 'end') start();
      else view.render(Math.min(1, accumulator), elapsed);
      return true;
    },
    tick: () => (view ? view.s.tick : null),
  };
}
