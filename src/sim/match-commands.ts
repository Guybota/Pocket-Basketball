/** Os comandos do treinador. Ficam registados em `commands`, para o jogo se poder repetir. */
import { BALANCE as B } from './balance.ts';
import { seconds } from './court.ts';
import { validateTactics, type Tactics } from './types.ts';
import { applyPendingSubs } from './match-rotation.ts';
import type { TeamIndex, Command, MatchState } from './match-types.ts';

/** Pede um desconto. Entra na próxima bola parada, ou logo se a equipa tiver a bola. */
export function requestTimeout(s: MatchState, team: TeamIndex): boolean {
  if (s.phase === 'end' || s.timeoutsLeft[team] <= 0 || s.pendingTimeout[team] || s.timeoutTeam === team) return false;
  s.pendingTimeout[team] = true;
  s.commands.push({ kind: 'timeout', tick: s.tick, team });
  return true;
}

/** O treinador está atento: a paragem deixa de acabar sozinha e espera por ele (até um máximo). */
export function holdMatch(s: MatchState, team: TeamIndex): boolean {
  if ((s.phase !== 'timeout' && s.phase !== 'break') || s.timer >= seconds(B.coachHoldMaxSeconds)) return false;
  s.timer = seconds(B.coachHoldMaxSeconds);
  s.commands.push({ kind: 'hold', tick: s.tick, team });
  return true;
}

/** O treinador manda continuar: acaba a paragem (desconto ou fim de período) no passo seguinte. */
export function resumeMatch(s: MatchState, team: TeamIndex): boolean {
  if ((s.phase !== 'timeout' && s.phase !== 'break') || s.timer <= 1) return false;
  s.timer = 1;
  s.commands.push({ kind: 'resume', tick: s.tick, team });
  return true;
}

/** Pede uma troca. Entra na próxima bola parada. Uma troca manual desliga a rotação automática da equipa. */
export function queueSubstitution(s: MatchState, team: TeamIndex, slot: number, incomingIndex: number): boolean {
  const incoming = s.bodies[incomingIndex];
  if (s.phase === 'end' || !Number.isInteger(slot) || slot < 0 || slot > 4) return false;
  // Quem entra pode vir do banco ou de outro lugar em campo: nesse caso os dois trocam de lugar.
  if (!incoming || incoming.team !== team || incoming.slot === slot || (incoming.slot === -1 && incoming.line.fouls >= B.foulOutAt)) return false;
  s.pendingSubs = s.pendingSubs.filter(sub => !(sub.team === team && (sub.slot === slot || sub.incoming === incoming || sub.slot === incoming.slot || s.court[team][sub.slot] === incoming)));
  s.pendingSubs.push({ team, slot, incoming });
  s.autoRotation[team] = false;
  s.commands.push({ kind: 'substitution', tick: s.tick, team, slot, incoming: incomingIndex });
  if (s.phase === 'timeout' || s.phase === 'break') applyPendingSubs(s);
  return true;
}

export function cancelSubstitution(s: MatchState, team: TeamIndex, slot: number): void {
  s.pendingSubs = s.pendingSubs.filter(sub => !(sub.team === team && sub.slot === slot));
  s.commands.push({ kind: 'cancelSubstitution', tick: s.tick, team, slot });
}

/** Dois do banco trocam de ordem: a ordem do banco é a ordem de entrada na rotação automática. */
export function reorderBench(s: MatchState, team: TeamIndex, a: number, b: number): boolean {
  const x = s.bodies[a];
  const y = s.bodies[b];
  if (!x || !y || x === y || x.team !== team || y.team !== team || x.slot !== -1 || y.slot !== -1) return false;
  s.bodies[a] = y;
  s.bodies[b] = x;
  s.commands.push({ kind: 'reorder', tick: s.tick, team, a, b });
  return true;
}

export function setAutoRotation(s: MatchState, team: TeamIndex, on: boolean): void {
  s.autoRotation[team] = on;
  s.commands.push({ kind: 'autoRotation', tick: s.tick, team, on });
}

/** Muda as táticas da equipa. Fazem efeito logo. */
export function setTactics(s: MatchState, team: TeamIndex, tactics: Tactics): void {
  validateTactics(tactics, s.teams[team].name);
  s.tactics[team] = { ...tactics };
  s.commands.push({ kind: 'tactics', tick: s.tick, team, tactics: { ...tactics } });
}

export function applyCommand(s: MatchState, c: Command): void {
  if (c.kind === 'tactics') setTactics(s, c.team, c.tactics);
  else if (c.kind === 'timeout') requestTimeout(s, c.team);
  else if (c.kind === 'resume') resumeMatch(s, c.team);
  else if (c.kind === 'hold') holdMatch(s, c.team);
  else if (c.kind === 'substitution') queueSubstitution(s, c.team, c.slot, c.incoming);
  else if (c.kind === 'cancelSubstitution') cancelSubstitution(s, c.team, c.slot);
  else if (c.kind === 'reorder') reorderBench(s, c.team, c.a, c.b);
  else setAutoRotation(s, c.team, c.on);
}
