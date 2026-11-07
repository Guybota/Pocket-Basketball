/** Os comandos do treinador. Ficam registados em `commands`, para o jogo se poder repetir. */
import { BALANCE as B } from './balance.ts';
import { seconds } from './court.ts';
import { NEUTRAL_TACTICS, validateTactics, type Tactics } from './types.ts';
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

/**
 * A equipa da IA lê o jogo nas paragens (fim de período e descontos) e muda de tática por regras simples, que o adjunto
 * consegue explicar: a perder por muito acelera (e no fim pressiona), a ganhar no fim abranda, contra zona abre o campo
 * para o triplo, e contra quem ataca por dentro fecha-se em zona.
 */
export function aiAdjustTactics(s: MatchState): void {
  for (const team of [0, 1] as const) {
    if (s.controlled[team]) continue;
    const rival = s.tactics[team === 0 ? 1 : 0];
    const base = s.teams[team].tactics ?? NEUTRAL_TACTICS;
    const t: Tactics = { ...s.tactics[team], pressure: base.pressure, spacing: base.spacing, pace: base.pace, defense: base.defense ?? 'man' };
    const margin = s.score[team] - s.score[team === 0 ? 1 : 0];
    const late = s.period >= 4 || (s.period === 3 && s.phase === 'break');
    if (margin <= -B.aiChaseMargin) {
      t.pace = 1;
      if (late) t.pressure = 1;
    } else if (late && margin >= B.aiProtectMargin) t.pace = -1;
    if (rival.defense === 'zone') t.spacing = 1;
    if (rival.spacing <= -B.aiReadSpacing) t.defense = 'zone';
    else if (rival.spacing >= B.aiReadSpacing) t.defense = 'man';
    const now = s.tactics[team];
    if (t.pressure !== now.pressure || t.spacing !== now.spacing || t.pace !== now.pace || t.defense !== (now.defense ?? 'man')) setTactics(s, team, t);
  }
}

export function applyCommand(s: MatchState, c: Command): void {
  // As táticas de uma equipa da IA ficam registadas, mas não se repetem: a simulação volta a decidi-las no mesmo sítio.
  if (c.kind === 'tactics') { if (s.controlled[c.team]) setTactics(s, c.team, c.tactics); }
  else if (c.kind === 'timeout') requestTimeout(s, c.team);
  else if (c.kind === 'resume') resumeMatch(s, c.team);
  else if (c.kind === 'hold') holdMatch(s, c.team);
  else if (c.kind === 'substitution') queueSubstitution(s, c.team, c.slot, c.incoming);
  else if (c.kind === 'cancelSubstitution') cancelSubstitution(s, c.team, c.slot);
  else if (c.kind === 'reorder') reorderBench(s, c.team, c.a, c.b);
  else setAutoRotation(s, c.team, c.on);
}
