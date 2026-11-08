/** Trocas e banco: quem entra, quem sai e a rotação automática. */
import { heightCmOf } from './teamgen.ts';
import { BALANCE as B } from './balance.ts';
import { COURT_HALF_WIDTH, COURT_LENGTH, distance, seconds, BENCH_START_X, BENCH_SPACING, BENCH_Y } from './court.ts';
import { ATTRIBUTE_KEYS, type Attributes, type Player } from './types.ts';
import { emit, maxSpeed } from './match-core.ts';
import type { TeamIndex, Body, MatchState } from './match-types.ts';

/** Dois jogadores em campo trocam de lugar, e com ele de papel. */
export function swapSlots(s: MatchState, team: TeamIndex, a: number, b: number): void {
  const x = s.court[team][a]!;
  const y = s.court[team][b]!;
  s.court[team][a] = y;
  s.court[team][b] = x;
  x.slot = b;
  y.slot = a;
}

export function applyPendingSubs(s: MatchState): void {
  for (const sub of s.pendingSubs) {
    if (sub.incoming.slot === -1) swapIn(s, sub.team, sub.slot, sub.incoming);
    else if (sub.incoming.slot !== sub.slot) swapSlots(s, sub.team, sub.slot, sub.incoming.slot);
  }
  s.pendingSubs = [];
}

/** O banco fica na lateral do fundo, à vista da câmara. */
export function placeBench(b: Body): void {
  b.x = COURT_LENGTH / 2;
  b.y = -COURT_HALF_WIDTH - 1;
  b.targetX = b.x;
  b.targetY = b.y;
}

/** O lugar de cada um no banco, pela ordem em que lá está. */
export function seatOf(s: MatchState, b: Body): { x: number; y: number } {
  const bench = s.bodies.filter(x => x.team === b.team && x.slot === -1);
  return { x: BENCH_START_X[b.team] + Math.max(0, bench.indexOf(b)) * BENCH_SPACING, y: BENCH_Y };
}

export function swapIn(s: MatchState, team: TeamIndex, slot: number, incoming: Body): void {
  const outgoing = s.court[team][slot]!;
  // Quem entra levanta-se do seu lugar e vai a correr, à sua velocidade, para o campo; começa à beira do banco, à frente do lugar.
  const from = { x: seatOf(s, incoming).x, y: -COURT_HALF_WIDTH - 0.7 };
  const leaveX = outgoing.x;
  const leaveY = outgoing.y;
  outgoing.slot = -1;
  incoming.slot = slot;
  incoming.enteredTick = s.tick;
  incoming.x = from.x;
  incoming.y = from.y;
  incoming.targetX = from.x;
  incoming.targetY = from.y;
  const seat = seatOf(s, outgoing);
  placeBench(outgoing);
  s.court[team][slot] = incoming;
  // Quem sai vai a correr até ao banco; o jogo só espera que ele saia das linhas, não que se sente.
  const ticks = Math.max(1, seconds(distance(leaveX, leaveY, seat.x, seat.y) / maxSpeed(outgoing)));
  const offCourt = Math.max(1, seconds(Math.max(0, leaveY + COURT_HALF_WIDTH + 0.3) / maxSpeed(outgoing)));
  s.subsTick = s.tick;
  s.subWaitUntil = Math.max(s.subWaitUntil, s.tick + offCourt);
  emit(s, 'substitution', team, { player: incoming.player.name, other: outgoing.player.name, ticks });
}

/** A bola parada só acaba quando as trocas acabaram: quem saiu já está fora das linhas e quem entrou já está dentro delas. */
export function subsSettled(s: MatchState): boolean {
  if (s.subsTick < 0 || s.tick - s.subsTick >= seconds(B.substitutionMaxWaitSeconds)) return true;
  if (s.tick < s.subWaitUntil) return false;
  return [...s.court[0], ...s.court[1]].every(b => b.enteredTick !== s.subsTick || Math.abs(b.y) <= COURT_HALF_WIDTH);
}

/** Rotação automática. Mais tarde, será configurada nas Opções de Comando. */
export function rotate(s: MatchState, team: TeamIndex): void {
  const bench = s.bodies.filter(b => b.team === team && b.slot === -1);
  for (let slot = 0; slot < 5; slot++) {
    const current = s.court[team][slot]!;
    const fouledOut = current.line.fouls >= B.foulOutAt;
    // Em rotação manual, a simulação só troca quem foi excluído por faltas.
    if (!s.autoRotation[team] && !fouledOut) continue;
    const starter = bench.find(b => b.starterSlot === slot && b.fatigue <= B.starterReturnFatigue && b.line.fouls < B.foulOutAt);
    if (starter && current.starterSlot !== slot) {
      swapIn(s, team, slot, starter);
      bench.splice(bench.indexOf(starter), 1, current);
      continue;
    }
    // Sair por tempo, e não só por cansaço, faz a resistência contar: quem aguenta mais chega ao fim menos cansado.
    // As opções de ataque (a primeira e a segunda) não têm limite de tempo: só saem cansadas.
    const stintLimit = seconds(B.maxStintSeconds + slot * B.stintStaggerSeconds);
    const option = s.tactics[team].options?.includes(current.player.name) ?? false;
    const needsRest = current.fatigue >= B.subOutFatigue || (!option && s.tick - current.enteredTick >= stintLimit);
    if (!fouledOut && !needsRest) continue;
    const candidates = bench.filter(b => b.line.fouls < B.foulOutAt && (fouledOut || b.fatigue <= B.subInFatigue + (b.player.offBall === 'sixthMan' ? B.sixthManSubIn : 0)));
    if (candidates.length === 0) continue;
    // Entra, dos frescos, quem melhor encaixa no lugar que vaga: um poste não vai jogar a base só por ser o primeiro do banco.
    // A ordem do banco desempata.
    const incoming = candidates.map((b, i) => ({ b, score: slotFit(b.player, slot) + B.benchOrderFit * (1 - i / candidates.length) })).sort((p, q) => q.score - p.score)[0]!.b;
    swapIn(s, team, slot, incoming);
    bench.splice(bench.indexOf(incoming), 1, current);
  }
}

/** Quanto um jogador encaixa num lugar (0 a cerca de 1): os atributos que esse lugar pede, e a altura a contar a favor
 * nos lugares de dentro e contra nos de fora. Não há posições fixas: é isto que diz quem substitui quem. */
export function slotFit(player: Player, slot: number): number {
  const profile = B.slotProfiles[slot] as Partial<Record<keyof Attributes, number>> & { heightPerCm: number };
  let fit = 0;
  for (const key of ATTRIBUTE_KEYS) fit += ((profile[key] ?? 0) * player.attributes[key]) / 100;
  return fit + profile.heightPerCm * (heightCmOf(player) - B.referenceHeight);
}

/** O lugar onde um jogador encaixa melhor. */
export function bestSlot(player: Player): number {
  let best = 0;
  for (let slot = 1; slot < 5; slot++) if (slotFit(player, slot) > slotFit(player, best)) best = slot;
  return best;
}
