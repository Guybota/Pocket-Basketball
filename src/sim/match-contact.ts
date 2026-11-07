/** Contactos: ninguém atravessa ninguém, e os encontrões entre adversários. */
import { heightCmOf } from './teamgen.ts';
import { BALANCE as B } from './balance.ts';
import { COURT_HALF_WIDTH, COURT_LENGTH, hoopDistance, seconds } from './court.ts';
import { between } from './rng.ts';
import { toU, emit } from './match-core.ts';
import type { Body, MatchState } from './match-types.ts';

/** A força de um jogador num encontrão: conta o físico, o peso e a altura, e cansado empurra menos. */
export function pushPower(b: Body): number {
  const { attributes } = b.player;
  const raw = attributes.strength + (heightCmOf(b.player) - B.referenceHeight) * B.pushPerCm;
  return Math.max(B.pushPowerMin, raw * (1 - B.pushFatigueLoss * b.fatigue));
}

export function tryBump(s: MatchState, a: Body, b: Body, nx: number, ny: number): void {
  if (s.phase !== 'live' && s.phase !== 'pass' && s.phase !== 'shot' && s.phase !== 'rebound') return;
  if (a.team === b.team || a.nextBumpTick > s.tick || b.nextBumpTick > s.tick) return;
  // Quem joga de costas encosta devagar. Os outros só chocam se vierem mesmo um contra o outro.
  const closing = (a.stepX - b.stepX) * nx + (a.stepY - b.stepY) * ny;
  const inPost = s.posting === a || s.posting === b;
  if (!inPost && closing < B.bumpMinClosing) return;
  const nearHoop = hoopDistance(toU(s, s.offense, a.x), a.y) < B.bumpHoopRange;
  if (!inPost && !nearHoop && s.holder !== a && s.holder !== b) return;
  const margin = pushPower(a) - pushPower(b) + between(s.rng, -B.bumpLuck, B.bumpLuck);
  const winner = margin >= 0 ? a : b;
  const loser = winner === a ? b : a;
  const hard = Math.abs(margin) >= B.bumpHardMargin;
  loser.slowedUntil = s.tick + seconds(B.bumpSlowSeconds);
  if (hard) {
    loser.stunKind = null;
    loser.stunnedUntil = Math.max(loser.stunnedUntil, s.tick + seconds(B.bumpStunSeconds));
  }
  a.nextBumpTick = s.tick + seconds(B.bumpCooldownSeconds);
  b.nextBumpTick = a.nextBumpTick;
  const bump = inPost ? 'post' : s.phase === 'rebound' ? 'rebound' : 'run';
  emit(s, 'bump', winner.team, { player: winner.player.name, other: loser.player.name, bump, hard, ...(bump === 'post' ? { offensive: winner === s.posting } : {}) });
}

/** Ninguém atravessa ninguém: quem se sobrepõe é afastado, e o mais fraco cede mais. */
export function resolveContacts(s: MatchState): void {
  // Corre em cada passo de cada jogo simulado, por isso evita criar listas.
  const c0 = s.court[0];
  const c1 = s.court[1];
  const bodyAt = (i: number): Body => (i < 5 ? c0[i]! : c1[i - 5]!);
  // Quem acabou de lançar está no ar e não se move.
  const planted = s.flight?.kind === 'shot' ? s.flight.shooter : s.inbound?.passer ?? null;
  const sidestep = (b: Body, tx: number, ty: number, amount: number): void => {
    // Contorna-se para o lado de onde se quer ir, para ninguém ficar preso de frente contra outro.
    const dx = b.targetX - b.x;
    const dy = b.targetY - b.y;
    const along = dx * tx + dy * ty;
    if (dx * dx + dy * dy < 0.09) return;
    const side = along >= 0 ? 1 : -1;
    b.x += tx * side * amount;
    b.y += ty * side * amount;
  };
  for (let pass = 0; pass < B.contactPasses; pass++) {
    let touching = false;
    for (let i = 0; i < 10; i++) {
      const a = bodyAt(i);
      for (let j = i + 1; j < 10; j++) {
        const b = bodyAt(j);
        const min = a.radius + b.radius;
        const dx = b.x - a.x;
        if (dx > min || dx < -min) continue;
        const dy = b.y - a.y;
        const squared = dx * dx + dy * dy;
        if (squared >= min * min) continue;
        touching = true;
        const dist = Math.sqrt(squared);
        const nx = dist > 0 ? dx / dist : 1;
        const ny = dist > 0 ? dy / dist : 0;
        const overlap = min - dist;
        const pa = pushPower(a);
        const pb = pushPower(b);
        let aShare = pb / (pa + pb);
        if (a === planted) aShare = 0;
        else if (b === planted) aShare = 1;
        const bShare = 1 - aShare;
        a.x -= nx * overlap * aShare;
        a.y -= ny * overlap * aShare;
        b.x += nx * overlap * bShare;
        b.y += ny * overlap * bShare;
        sidestep(a, -ny, nx, overlap * aShare * B.contactSlide);
        sidestep(b, -ny, nx, overlap * bShare * B.contactSlide);
        if (pass === 0 && a !== planted && b !== planted) tryBump(s, a, b, nx, ny);
      }
    }
    // A maior parte do tempo ninguém se toca, e assim simular uma época continua rápido.
    if (!touching) break;
  }
  // Ninguém sai das linhas com o jogo a correr: um empurrão encosta à linha e fica aí. Só quem repõe está fora,
  // e no início do jogo entra-se de fora a andar.
  // Quem acabou de repor desliza para dentro em vez de saltar.
  for (let i = 0; i < 10; i++) {
    const b = bodyAt(i);
    const outside = s.phase === 'intro' || (s.inbound !== null && s.inbound.passer === b) || (s.flight?.kind === 'pass' && s.flight.restart && s.flight.passer === b);
    const margin = outside ? 1 : -0.15;
    const slide = (value: number, low: number, high: number): number => (value < low ? Math.min(low, value + B.lineSlide) : value > high ? Math.max(high, value - B.lineSlide) : value);
    b.x = slide(b.x, -margin, COURT_LENGTH + margin);
    b.y = slide(b.y, -COURT_HALF_WIDTH - margin, COURT_HALF_WIDTH + margin);
  }
}
