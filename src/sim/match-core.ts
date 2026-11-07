/** Utilitários partilhados pelo jogo: orientação do campo, eventos, velocidade e leituras da defesa. */
import { heightCmOf } from './teamgen.ts';
import { BALANCE as B } from './balance.ts';
import { COURT_LENGTH, distance, seconds, HOOP_U } from './court.ts';
import type { MoveId } from './types.ts';
import type { TeamIndex, Body, MatchEventType, MatchEvent, MatchState } from './match-types.ts';

export const other = (team: TeamIndex): TeamIndex => (team === 0 ? 1 : 0);

export const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** +1 significa que a equipa ataca o cesto em x = 28. As equipas trocam de lado ao intervalo. */
export const attackDirection = (s: MatchState, team: TeamIndex): 1 | -1 => ((team === 0) !== s.period >= 3 ? 1 : -1);

export const attackBaseline = (s: MatchState, team: TeamIndex): number => (attackDirection(s, team) > 0 ? COURT_LENGTH : 0);

export const toU = (s: MatchState, team: TeamIndex, x: number): number => Math.abs(attackBaseline(s, team) - x);

export const fromU = (s: MatchState, team: TeamIndex, u: number): number => attackBaseline(s, team) - attackDirection(s, team) * u;

export function emit(s: MatchState, type: MatchEventType, team: TeamIndex, extra: Partial<MatchEvent> = {}): void {
  s.events.push({ type, tick: s.tick, period: s.period, clock: s.clock, team, ...extra });
}

export const maxSpeed = (b: Body): number =>
  (B.baseSpeed + b.player.attributes.speed * B.speedPerPoint) * (1 - B.speedLossPerLevel * (b.player.height - 2)) * (1 - B.fatigueSpeedLoss * b.fatigue);

export const hasMove = (b: Body, move: MoveId): boolean => b.player.moves.includes(move);

/** Vai ao chão: não se mexe nem defende até se levantar. */
export function knockDown(s: MatchState, b: Body, headX: number, prone: boolean): void {
  const ticks = seconds(B.fallSeconds);
  b.stunKind = null;
  b.fallHead = headX < 0 ? -1 : 1;
  b.fallProne = prone;
  b.fallenFrom = s.tick;
  b.fallenUntil = s.tick + ticks;
  b.stunnedUntil = Math.max(b.stunnedUntil, s.tick + ticks);
  emit(s, 'knockdown', b.team, { player: b.player.name });
}

export function emitMove(s: MatchState, b: Body, move: MoveId): void {
  emit(s, 'move', b.team, { player: b.player.name, move });
}

/** Não há ninguém capaz de se meter entre quem tem a bola e o cesto, como num contra-ataque. */
export function hasOpenLane(s: MatchState, h: Body): boolean {
  const hoopX = fromU(s, h.team, HOOP_U);
  const dx = hoopX - h.x;
  const dy = -h.y;
  const length = dx * dx + dy * dy;
  if (length === 0) return true;
  let ahead = 0;
  for (const d of s.court[other(h.team)]) {
    if (d.stunnedUntil > s.tick) continue;
    const along = ((d.x - h.x) * dx + (d.y - h.y) * dy) / length;
    if (along <= 0) continue;
    // Com a defesa toda à frente é um ataque organizado, mesmo que haja um corredor.
    if (++ahead > B.openLaneMaxAhead) return false;
    const t = Math.min(1, along);
    if (distance(d.x, d.y, h.x + dx * t, h.y + dy * t) < B.openLaneWidth) return false;
  }
  return true;
}

/** Pressão de 0 a 1, conforme a distância e a qualidade do defensor mais próximo. */
/** O primeiro com a pontuação mais baixa, sem criar listas: o mesmo que uma ordenação estável seguida de [0]. */
export function lowest<T>(items: readonly T[], score: (item: T) => number): T | undefined {
  let best: T | undefined;
  let bestScore = Infinity;
  for (const item of items) {
    const value = score(item);
    if (best === undefined || value < bestScore) {
      best = item;
      bestScore = value;
    }
  }
  return best;
}

export function pressureOn(s: MatchState, b: Body): number {
  let best = 0;
  for (const d of s.court[other(b.team)]) {
    if (d.stunnedUntil > s.tick) continue;
    const closeness = clamp01((B.pressureRange - distance(b.x, b.y, d.x, d.y)) / B.pressureRange);
    const a = d.player.attributes;
    const quality = (a.speed * 0.5 + a.strength * 0.3 + a.jumping * 0.2) / 100 + (heightCmOf(d.player) - B.referenceHeight) * B.contestPerCm;
    const freshness = 1 - B.fatigueDefenseLoss * d.fatigue;
    // Um defensor preso num bloqueio pressiona a metade.
    const screened = s.screen !== null && s.screen.on === d && distance(s.screen.by.x, s.screen.by.y, d.x, d.y) < B.screenSetRange ? B.screenPressureFactor : 1;
    best = Math.max(best, closeness * freshness * screened * (B.pressureBase + B.pressureSkill * quality));
  }
  return best;
}

export function nearestDefender(s: MatchState, b: Body): Body {
  let best = s.court[other(b.team)][0]!;
  let bestDistance = Infinity;
  for (const d of s.court[other(b.team)]) {
    const dist = distance(b.x, b.y, d.x, d.y);
    if (dist < bestDistance && d.stunnedUntil <= s.tick) {
      bestDistance = dist;
      best = d;
    }
  }
  return best;
}

/** Está a correr a fundo: a cortar para o cesto, a entrar com a bola, ou no ataque de um contra-ataque. */
export function isSprinting(s: MatchState, b: Body): boolean {
  if (b.slot < 0 || (s.phase !== 'live' && s.phase !== 'pass')) return false;
  // No contra-ataque correm os dois lados: quem ataca e quem recupera.
  if (s.tick < s.breakUntil) return true;
  return b.team === s.offense && ((b.cutStage === 1 && b.cutTo !== null) || (b === s.holder && s.driving));
}

/** O defensor está à frente do atacante: entre ele e o cesto que ele ataca. Atrás dele, não se defende, corre-se. */
export function inFrontOf(s: MatchState, defender: Body, attacker: Body): boolean {
  const hoopX = fromU(s, attacker.team, HOOP_U);
  return distance(defender.x, defender.y, hoopX, 0) < distance(attacker.x, attacker.y, hoopX, 0);
}
