import { BALANCE as B } from './balance.ts';
import {
  COURT_HALF_WIDTH,
  ARC_SPOTS,
  COURT_LENGTH,
  CUT_SPOTS,
  DT,
  FREE_THROW_SPOTS,
  LOW_POST_SPOTS,
  SPOTS,
  distance,
  hoopDistance,
  isThree,
  seconds,
  segmentDistance,
} from './court.ts';
import { between, chance, makeRng, next, weightedIndex, type Rng } from './rng.ts';
import { freeThrowChance, shotChance } from './shot.ts';
import { NEUTRAL_TACTICS, validateTactics, validateTeam, type MoveId, type Player, type Tactics, type Team } from './types.ts';

export type TeamIndex = 0 | 1;
export type Phase = 'dead' | 'live' | 'pass' | 'shot' | 'rebound' | 'freeThrow' | 'timeout' | 'break' | 'end';

export interface PlayerLine {
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  fouls: number;
  secondsPlayed: number;
}

export interface Body {
  player: Player;
  team: TeamIndex;
  slot: number;
  starterSlot: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  spot: number;
  nextCutTick: number;
  enteredTick: number;
  stunnedUntil: number;
  bmi: number;
  fatigue: number;
  line: PlayerLine;
}

export interface TeamLine {
  possessions: number;
  twoAttempts: number;
  twoMade: number;
  threeAttempts: number;
  threeMade: number;
  freeThrowAttempts: number;
  freeThrowsMade: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  turnovers: number;
  steals: number;
  blocks: number;
  fouls: number;
  assists: number;
}

export type MatchEventType =
  | 'period'
  | 'shot'
  | 'made'
  | 'missed'
  | 'block'
  | 'rebound'
  | 'steal'
  | 'turnover'
  | 'foul'
  | 'freeThrowMade'
  | 'freeThrowMissed'
  | 'substitution'
  | 'move'
  | 'timeout'
  | 'shotClockViolation'
  | 'periodEnd'
  | 'end';

export interface MatchEvent {
  type: MatchEventType;
  tick: number;
  period: number;
  clock: number;
  team: TeamIndex;
  player?: string;
  other?: string;
  points?: number;
  offensive?: boolean;
  distance?: number;
  move?: MoveId;
  /** O lançamento é um afundanço garantido pelo movimento especial. */
  dunk?: boolean;
}

interface PassFlight {
  kind: 'pass';
  ticks: number;
  total: number;
  fromX: number;
  fromY: number;
  passer: Body;
  target: Body;
  interceptedBy: Body | null;
  bad: boolean;
  lob: boolean;
}

interface ShotFlight {
  kind: 'shot';
  ticks: number;
  total: number;
  fromX: number;
  fromY: number;
  shooter: Body;
  points: 2 | 3;
  made: boolean;
  fouledBy: Body | null;
  blockedBy: Body | null;
}

/** Decisões do treinador. Ficam registadas: semente, equipas e comandos reproduzem o jogo exatamente. */
export type Command =
  | { kind: 'timeout'; tick: number; team: TeamIndex }
  | { kind: 'substitution'; tick: number; team: TeamIndex; slot: number; incoming: number }
  | { kind: 'cancelSubstitution'; tick: number; team: TeamIndex; slot: number }
  | { kind: 'autoRotation'; tick: number; team: TeamIndex; on: boolean }
  | { kind: 'tactics'; tick: number; team: TeamIndex; tactics: Tactics };

export interface MatchState {
  teams: [Team, Team];
  /** Equipa dirigida por uma pessoa: não pede descontos sozinha. */
  controlled: [boolean, boolean];
  tactics: [Tactics, Tactics];
  autoRotation: [boolean, boolean];
  timeoutsLeft: [number, number];
  pendingTimeout: [boolean, boolean];
  pendingSubs: { team: TeamIndex; slot: number; incoming: Body }[];
  commands: Command[];
  timeoutTeam: TeamIndex | null;
  clockStopped: boolean;
  run: { team: TeamIndex; points: number };
  bodies: Body[];
  court: [Body[], Body[]];
  rng: Rng;
  seed: number;
  tick: number;
  period: number;
  clock: number;
  phase: Phase;
  timer: number;
  offense: TeamIndex;
  firstOffense: TeamIndex;
  holder: Body | null;
  driving: boolean;
  shotClock: number;
  nextDecision: number;
  flight: PassFlight | ShotFlight | null;
  lastPasser: Body | null;
  lastPassTick: number;
  ball: { x: number; y: number; z: number };
  freeThrow: { shooter: Body; left: number } | null;
  score: [number, number];
  teamFouls: [number, number];
  lines: [TeamLine, TeamLine];
  events: MatchEvent[];
}

const other = (team: TeamIndex): TeamIndex => (team === 0 ? 1 : 0);
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const emptyTeamLine = (): TeamLine => ({
  possessions: 0,
  twoAttempts: 0,
  twoMade: 0,
  threeAttempts: 0,
  threeMade: 0,
  freeThrowAttempts: 0,
  freeThrowsMade: 0,
  offensiveRebounds: 0,
  defensiveRebounds: 0,
  turnovers: 0,
  steals: 0,
  blocks: 0,
  fouls: 0,
  assists: 0,
});

/** +1 significa que a equipa ataca o cesto em x = 28. As equipas trocam de lado ao intervalo. */
const attackDirection = (s: MatchState, team: TeamIndex): 1 | -1 => ((team === 0) !== s.period >= 3 ? 1 : -1);
const attackBaseline = (s: MatchState, team: TeamIndex): number => (attackDirection(s, team) > 0 ? COURT_LENGTH : 0);
const toU = (s: MatchState, team: TeamIndex, x: number): number => Math.abs(attackBaseline(s, team) - x);
const fromU = (s: MatchState, team: TeamIndex, u: number): number => attackBaseline(s, team) - attackDirection(s, team) * u;

function emit(s: MatchState, type: MatchEventType, team: TeamIndex, extra: Partial<MatchEvent> = {}): void {
  s.events.push({ type, tick: s.tick, period: s.period, clock: s.clock, team, ...extra });
}

const maxSpeed = (b: Body): number =>
  (B.baseSpeed + b.player.attributes.speed * B.speedPerPoint - B.speedLossPerBmi * (b.bmi - B.referenceBmi)) * (1 - B.fatigueSpeedLoss * b.fatigue);

const hasMove = (b: Body, move: MoveId): boolean => b.player.moves.includes(move);

function emitMove(s: MatchState, b: Body, move: MoveId): void {
  emit(s, 'move', b.team, { player: b.player.name, move });
}

/** Pressão de 0 a 1, conforme a distância e a qualidade do defensor mais próximo. */
function pressureOn(s: MatchState, b: Body): number {
  let best = 0;
  for (const d of s.court[other(b.team)]) {
    if (d.stunnedUntil > s.tick) continue;
    const closeness = clamp01((B.pressureRange - distance(b.x, b.y, d.x, d.y)) / B.pressureRange);
    const a = d.player.attributes;
    const quality = (a.speed * 0.5 + a.strength * 0.3 + a.jumping * 0.2) / 100 + (d.player.heightCm - B.referenceHeight) * B.contestPerCm;
    const freshness = 1 - B.fatigueDefenseLoss * d.fatigue;
    best = Math.max(best, closeness * freshness * (B.pressureBase + B.pressureSkill * quality));
  }
  return best;
}

function nearestDefender(s: MatchState, b: Body): Body {
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

function shotOdds(s: MatchState, b: Body, pressure: number, extraBonus = 0): { chance: number; points: 2 | 3; distance: number } {
  const u = toU(s, b.team, b.x);
  const three = isThree(u, b.y);
  const dist = hoopDistance(u, b.y);
  const physical = dist <= B.midDistance
    ? (b.player.heightCm - B.referenceHeight) * B.finishPerCm + (b.player.weightKg - B.referenceWeight) * B.finishPerKg
    : 0;
  const probability = shotChance(b.player.attributes, {
    bonus: physical + extraBonus,
    distanceToHoop: dist,
    three,
    pressure,
    fatigue: b.fatigue,
    clutch: s.period >= 4 && s.clock <= seconds(B.clutchSeconds),
    away: b.team === 1,
  });
  return { chance: probability, points: three ? 3 : 2, distance: dist };
}

function newPossession(s: MatchState, team: TeamIndex): void {
  s.offense = team;
  s.lines[team].possessions++;
  s.driving = false;
  s.lastPasser = null;
  s.shotClock = seconds(B.shotClockSeconds);
}

function giveBall(s: MatchState, b: Body): void {
  s.holder = b;
  s.phase = 'live';
  s.flight = null;
  s.nextDecision = s.tick + seconds(between(s.rng, B.decisionMinSeconds, B.decisionMaxSeconds));
}

/** Bola parada. A reposição é feita pela equipa indicada, depois de um segundo. */
function deadBall(s: MatchState, inbounding: TeamIndex, keepsPossession: boolean): void {
  if (!keepsPossession) newPossession(s, inbounding);
  s.holder = null;
  s.flight = null;
  s.driving = false;
  s.phase = 'dead';
  s.timer = seconds(B.deadBallSeconds);
  applyPendingSubs(s);
  rotate(s, 0);
  rotate(s, 1);
  // A equipa dirigida pela simulação trava os parciais do adversário com um desconto.
  if (!s.controlled[inbounding] && s.run.team !== inbounding && s.run.points >= B.aiTimeoutRun && s.timeoutsLeft[inbounding] > 0) {
    s.pendingTimeout[inbounding] = true;
    s.run.points = 0;
  }
  if (s.clock > 0) {
    if (s.pendingTimeout[s.offense]) grantTimeout(s, s.offense);
    else if (s.pendingTimeout[other(s.offense)]) grantTimeout(s, other(s.offense));
  }
}

function grantTimeout(s: MatchState, team: TeamIndex): void {
  s.pendingTimeout[team] = false;
  s.timeoutsLeft[team]--;
  s.timeoutTeam = team;
  s.phase = 'timeout';
  s.timer = seconds(B.timeoutSeconds);
  s.holder = null;
  s.flight = null;
  s.driving = false;
  for (const side of s.court) for (const b of side) b.fatigue = Math.max(0, b.fatigue - B.timeoutRecovery);
  emit(s, 'timeout', team);
  applyPendingSubs(s);
  rotate(s, 0);
  rotate(s, 1);
}

function applyPendingSubs(s: MatchState): void {
  for (const sub of s.pendingSubs) {
    if (sub.incoming.slot === -1) swapIn(s, sub.team, sub.slot, sub.incoming);
  }
  s.pendingSubs = [];
}

function addRun(s: MatchState, team: TeamIndex, points: number): void {
  if (s.run.team === team) s.run.points += points;
  else s.run = { team, points };
}

/** O banco fica na lateral do fundo, à vista da câmara. */
function placeBench(b: Body): void {
  b.x = COURT_LENGTH / 2;
  b.y = -COURT_HALF_WIDTH - 1;
  b.targetX = b.x;
  b.targetY = b.y;
}

function swapIn(s: MatchState, team: TeamIndex, slot: number, incoming: Body): void {
  const outgoing = s.court[team][slot]!;
  outgoing.slot = -1;
  placeBench(outgoing);
  incoming.slot = slot;
  incoming.enteredTick = s.tick;
  incoming.x = COURT_LENGTH / 2;
  incoming.y = -COURT_HALF_WIDTH;
  s.court[team][slot] = incoming;
  emit(s, 'substitution', team, { player: incoming.player.name, other: outgoing.player.name });
}

/** Rotação automática. Mais tarde, será configurada nas Opções de Comando. */
function rotate(s: MatchState, team: TeamIndex): void {
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
    const stintLimit = seconds(B.maxStintSeconds + slot * B.stintStaggerSeconds);
    const needsRest = current.fatigue >= B.subOutFatigue || s.tick - current.enteredTick >= stintLimit;
    if (!fouledOut && !needsRest) continue;
    const candidates = bench.filter(b => b.line.fouls < B.foulOutAt && (fouledOut || b.fatigue <= B.subInFatigue));
    if (candidates.length === 0) continue;
    const position = current.player.position;
    const samePosition = candidates.filter(b => b.player.position === position);
    const incoming = (samePosition.length > 0 ? samePosition : candidates)[0]!;
    swapIn(s, team, slot, incoming);
    bench.splice(bench.indexOf(incoming), 1, current);
  }
}

function placeForPeriod(s: MatchState): void {
  for (const team of [0, 1] as const) {
    for (const b of s.court[team]) {
      const [u, v] = SPOTS[b.slot]![0]!;
      if (team === s.offense) {
        b.x = fromU(s, team, Math.min(u + 8, COURT_LENGTH / 2));
        b.y = v;
      } else {
        b.x = fromU(s, other(team), u);
        b.y = v;
      }
      b.targetX = b.x;
      b.targetY = b.y;
    }
  }
}

function beginPeriod(s: MatchState): void {
  s.period++;
  s.clock = seconds(s.period <= 4 ? B.periodSeconds : B.overtimeSeconds);
  s.teamFouls = [0, 0];
  s.clockStopped = false;
  if (s.period === 1 || s.period === 3) s.timeoutsLeft = [B.timeoutsPerHalf, B.timeoutsPerHalf];
  else if (s.period > 4) s.timeoutsLeft = [B.timeoutsInOvertime, B.timeoutsInOvertime];
  // Posse alternada entre períodos.
  newPossession(s, s.period % 2 === 1 ? s.firstOffense : other(s.firstOffense));
  placeForPeriod(s);
  emit(s, 'period', s.offense);
  giveBall(s, s.court[s.offense][0]!);
}

function endPeriod(s: MatchState): void {
  s.holder = null;
  s.flight = null;
  emit(s, 'periodEnd', s.offense);
  applyPendingSubs(s);
  if (s.period >= 4 && s.score[0] !== s.score[1]) {
    s.phase = 'end';
    emit(s, 'end', s.score[0] > s.score[1] ? 0 : 1);
    return;
  }
  s.phase = 'break';
  s.timer = seconds(B.periodBreakSeconds);
  for (const b of s.bodies) b.fatigue = Math.max(0, b.fatigue - B.periodBreakRecovery);
  rotate(s, 0);
  rotate(s, 1);
}

/** Recua para criar espaço, se tiver o movimento e o defensor estiver em cima. */
function tryStepBack(s: MatchState, shooter: Body): void {
  if (!hasMove(shooter, 'stepBack') || pressureOn(s, shooter) < B.stepBackMinPressure) return;
  const u = toU(s, shooter.team, shooter.x);
  const dist = hoopDistance(u, shooter.y);
  if (dist < B.stepBackMinDistance || dist > B.stepBackMaxDistance || !chance(s.rng, B.stepBackChance)) return;
  const k = (dist + B.stepBackMeters) / dist;
  const nextU = 1.575 + (u - 1.575) * k;
  shooter.x = fromU(s, shooter.team, Math.min(COURT_LENGTH / 2, nextU));
  shooter.y = Math.max(-COURT_HALF_WIDTH + 0.2, Math.min(COURT_HALF_WIDTH - 0.2, shooter.y * k));
  emitMove(s, shooter, 'stepBack');
}

function shoot(s: MatchState, shooter: Body, lob = false): void {
  if (!lob) tryStepBack(s, shooter);
  const nearRim = hoopDistance(toU(s, shooter.team, shooter.x), shooter.y) <= B.powerDunkMaxDistance;
  const powerDunk = !lob && nearRim && hasMove(shooter, 'powerDunk');
  if (powerDunk) emitMove(s, shooter, 'powerDunk');
  const pressure = pressureOn(s, shooter);
  // O atirador parado acerta mais a receber e lançar; o penetrador, a acabar um drible.
  const catchAndShoot = shooter.player.offBall === 'spotUp' && s.lastPasser !== null && s.tick - s.lastPassTick <= seconds(B.catchAndShootSeconds);
  const slashing = shooter.player.onBall === 'slasher' && s.driving;
  const styleBonus = (catchAndShoot ? B.spotUpBonus : 0) + (slashing ? B.slasherFinishBonus : 0);
  const odds = shotOdds(s, shooter, pressure, styleBonus + (lob ? B.alleyOopBonus : powerDunk ? B.powerDunkBonus : 0));
  const unstoppable = lob || powerDunk;
  const defender = nearestDefender(s, shooter);
  const offenseAttrs = shooter.player.attributes;
  const defenseAttrs = defender.player.attributes;
  const line = s.lines[shooter.team];
  if (odds.points === 3) line.threeAttempts++;
  else line.twoAttempts++;
  emit(s, 'shot', shooter.team, { player: shooter.player.name, points: odds.points, distance: odds.distance, ...(unstoppable ? { dunk: true } : {}) });

  let blockedBy: Body | null = null;
  if (!unstoppable && pressure >= B.blockPressureMin && odds.distance <= B.blockMaxDistance) {
    const edge = defenseAttrs.jumping - offenseAttrs.jumping + (defender.player.heightCm - shooter.player.heightCm) * (B.blockPerCm / B.blockSlope);
    if (chance(s.rng, Math.max(0.005, B.blockBase + B.blockSlope * edge))) blockedBy = defender;
  }
  let fouledBy: Body | null = null;
  if (!blockedBy) {
    const base = odds.distance <= B.midDistance ? B.rimFoulChance : B.jumperFoulChance;
    const edge = offenseAttrs.strength + offenseAttrs.technique - defenseAttrs.strength - defenseAttrs.technique;
    if (chance(s.rng, Math.max(0.005, (base + B.foulSkillSlope * edge) * pressure))) fouledBy = defender;
  }
  const made = !blockedBy && chance(s.rng, odds.chance);
  const duration = blockedBy ? 0.2 : B.shotMinSeconds + odds.distance * B.shotSecondsPerMeter;
  s.flight = {
    kind: 'shot',
    ticks: 0,
    total: seconds(duration),
    fromX: shooter.x,
    fromY: shooter.y,
    shooter,
    points: odds.points,
    made,
    fouledBy,
    blockedBy,
  };
  s.holder = null;
  s.phase = 'shot';
  s.driving = false;
}

function commitFoul(s: MatchState, fouler: Body): void {
  fouler.line.fouls++;
  s.lines[fouler.team].fouls++;
  s.teamFouls[fouler.team]++;
  emit(s, 'foul', fouler.team, { player: fouler.player.name });
}

function startFreeThrows(s: MatchState, shooter: Body, count: number): void {
  s.freeThrow = { shooter, left: count };
  s.phase = 'freeThrow';
  s.timer = seconds(B.freeThrowSetupSeconds + B.freeThrowSeconds);
  s.holder = null;
  s.flight = null;
}

function resolveShot(s: MatchState, f: ShotFlight): void {
  const team = f.shooter.team;
  if (f.blockedBy) {
    f.blockedBy.line.blocks++;
    s.lines[f.blockedBy.team].blocks++;
    emit(s, 'block', f.blockedBy.team, { player: f.blockedBy.player.name, other: f.shooter.player.name });
    startRebound(s);
    return;
  }
  if (f.fouledBy) commitFoul(s, f.fouledBy);
  if (f.made) {
    addRun(s, team, f.points);
    s.score[team] += f.points;
    f.shooter.line.points += f.points;
    const line = s.lines[team];
    if (f.points === 3) line.threeMade++;
    else line.twoMade++;
    const assisted = s.lastPasser && s.lastPasser !== f.shooter && s.tick - s.lastPassTick <= seconds(3);
    if (assisted) {
      s.lastPasser!.line.assists++;
      line.assists++;
    }
    emit(s, 'made', team, {
      player: f.shooter.player.name,
      points: f.points,
      ...(assisted ? { other: s.lastPasser!.player.name } : {}),
    });
    if (f.fouledBy) startFreeThrows(s, f.shooter, 1);
    else deadBall(s, other(team), false);
    return;
  }
  emit(s, 'missed', team, { player: f.shooter.player.name, points: f.points });
  if (f.fouledBy) startFreeThrows(s, f.shooter, f.points);
  else startRebound(s);
}

function startRebound(s: MatchState): void {
  s.flight = null;
  s.holder = null;
  s.phase = 'rebound';
  s.timer = seconds(B.reboundSeconds);
  const u = 1.575 + between(s.rng, 0.4, 2.2);
  s.ball.x = fromU(s, s.offense, u);
  s.ball.y = between(s.rng, -2, 2);
  s.ball.z = 1.5;
}

function resolveRebound(s: MatchState): void {
  const candidates = [...s.court[0], ...s.court[1]];
  const weights = candidates.map(b => {
    const a = b.player.attributes;
    const dist = distance(b.x, b.y, s.ball.x, s.ball.y);
    const size = (b.player.heightCm - B.referenceHeight) * B.reboundPerCm + (b.player.weightKg - B.referenceWeight) * B.reboundPerKg;
    const skill = Math.max(0.1, 0.25 + (a.jumping * 0.5 + a.strength * 0.5) / 100 + size);
    const closeness = 1 / (1 + dist * dist);
    return skill * closeness * (b.team === s.offense ? 1 : B.reboundDefenseBonus);
  });
  const rebounder = candidates[weightedIndex(s.rng, weights)]!;
  const offensive = rebounder.team === s.offense;
  rebounder.line.rebounds++;
  if (offensive) {
    s.lines[rebounder.team].offensiveRebounds++;
    s.shotClock = Math.max(s.shotClock, seconds(B.offensiveReboundShotClockSeconds));
  } else {
    s.lines[rebounder.team].defensiveRebounds++;
    newPossession(s, rebounder.team);
  }
  emit(s, 'rebound', rebounder.team, { player: rebounder.player.name, offensive });
  giveBall(s, rebounder);
}

function resolvePass(s: MatchState, f: PassFlight): void {
  const team = f.passer.team;
  if (f.interceptedBy) {
    f.interceptedBy.line.steals++;
    s.lines[f.interceptedBy.team].steals++;
    s.lines[team].turnovers++;
    emit(s, 'steal', f.interceptedBy.team, { player: f.interceptedBy.player.name, other: f.passer.player.name });
    newPossession(s, f.interceptedBy.team);
    giveBall(s, f.interceptedBy);
    return;
  }
  if (f.bad) {
    s.lines[team].turnovers++;
    emit(s, 'turnover', team, { player: f.passer.player.name });
    deadBall(s, other(team), false);
    return;
  }
  s.lastPasser = f.passer;
  s.lastPassTick = s.tick;
  giveBall(s, f.target);
  if (f.lob) shoot(s, f.target, true);
}

function pass(s: MatchState, passer: Body, target: Body, lob = false): void {
  const dist = distance(passer.x, passer.y, target.x, target.y);
  const a = passer.player.attributes;
  let interceptedBy: Body | null = null;
  // Um passe alto passa por cima dos defensores.
  for (const d of lob ? [] : s.court[other(passer.team)]) {
    if (segmentDistance(d.x, d.y, passer.x, passer.y, target.x, target.y) > B.interceptDistance) continue;
    const edge = d.player.attributes.speed + d.player.attributes.technique - a.technique * 2;
    if (chance(s.rng, Math.max(0.005, B.interceptBase + B.interceptSlope * edge))) {
      interceptedBy = d;
      break;
    }
  }
  const badChance = (B.badPassBase + B.badPassPerMeter * dist) * (1.5 - a.technique / 100);
  s.flight = {
    kind: 'pass',
    ticks: 0,
    total: Math.max(seconds(B.minPassSeconds), seconds(dist / B.passSpeed)),
    fromX: passer.x,
    fromY: passer.y,
    passer,
    target,
    interceptedBy,
    bad: !lob && !interceptedBy && chance(s.rng, badChance),
    lob,
  };
  s.holder = null;
  s.phase = 'pass';
  s.driving = false;
}

function decide(s: MatchState): void {
  const h = s.holder!;
  const tactics = s.tactics[h.team];
  s.nextDecision = s.tick + seconds(between(s.rng, B.decisionMinSeconds, B.decisionMaxSeconds) * (1 - B.tacticPaceDecision * tactics.pace));
  const a = h.player.attributes;
  const pressure = pressureOn(s, h);

  if (pressure >= B.stealPressureMin) {
    const defender = nearestDefender(s, h);
    const edge = defender.player.attributes.speed + defender.player.attributes.technique - a.technique * 2;
    const pickpocket = hasMove(defender, 'pickpocket');
    const defenseTactics = s.tactics[defender.team];
    const stealChance = Math.max(0.002, (B.stealBase + B.stealSlope * edge) * pressure) * (pickpocket ? B.pickpocketFactor : 1) * (1 + B.tacticPressureSteal * defenseTactics.pressure);
    if (chance(s.rng, stealChance)) {
      if (pickpocket) emitMove(s, defender, 'pickpocket');
      defender.line.steals++;
      s.lines[defender.team].steals++;
      s.lines[h.team].turnovers++;
      emit(s, 'steal', defender.team, { player: defender.player.name, other: h.player.name });
      newPossession(s, defender.team);
      giveBall(s, defender);
      return;
    }
    if (pressure >= B.reachFoulPressureMin && chance(s.rng, B.reachFoulChance * (1 + B.tacticPressureFoul * defenseTactics.pressure))) {
      commitFoul(s, defender);
      if (s.teamFouls[defender.team] > B.teamFoulLimit) {
        startFreeThrows(s, h, 2);
      } else {
        s.shotClock = Math.max(s.shotClock, seconds(B.offensiveReboundShotClockSeconds));
        deadBall(s, h.team, true);
      }
      return;
    }
  }
  if (chance(s.rng, B.looseBallBase * (1.5 - a.technique / 100))) {
    s.lines[h.team].turnovers++;
    emit(s, 'turnover', h.team, { player: h.player.name });
    deadBall(s, other(h.team), false);
    return;
  }

  const u = toU(s, h.team, h.x);
  const teammates = s.court[h.team].filter(b => b !== h);
  const shotSeconds = s.shotClock / seconds(1);

  if (u > B.shootingRangeU) {
    const runners = teammates.filter(b => toU(s, b.team, b.x) <= B.aheadPassRangeU && pressureOn(s, b) < 0.2);
    if (runners.length > 0 && chance(s.rng, B.aheadPassChance)) pass(s, h, runners[0]!);
    return;
  }
  if (shotSeconds <= B.forcedShotSeconds) {
    shoot(s, h);
    return;
  }

  if (hasMove(h, 'alleyOop')) {
    const finishers = teammates.filter(b => hoopDistance(toU(s, b.team, b.x), b.y) <= B.alleyOopRange && b.player.attributes.jumping >= B.alleyOopMinJumping && pressureOn(s, b) <= B.alleyOopMaxPressure);
    if (finishers.length > 0 && chance(s.rng, B.alleyOopChance)) {
      emitMove(s, h, 'alleyOop');
      pass(s, h, finishers[0]!, true);
      return;
    }
  }

  const odds = shotOdds(s, h, pressure);
  const shootValue = odds.chance * odds.points;
  const passValues = teammates.map(b => {
    const teammateOdds = shotOdds(s, b, pressureOn(s, b));
    return teammateOdds.chance * teammateOdds.points;
  });
  const dist = hoopDistance(u, h.y);
  const defender = nearestDefender(s, h);
  const speedEdge = (a.speed - defender.player.attributes.speed) / 100;
  const drivePressure = clamp01(pressure * (B.drivePressureRelief - speedEdge));
  const driveChance = shotChance(a, {
    distanceToHoop: 1,
    three: false,
    pressure: drivePressure,
    fatigue: h.fatigue,
    clutch: false,
    away: h.team === 1,
  });
  const driveValue = dist > 2.5 && !s.driving ? driveChance * 2 : 0;
  const urgency = 1 + B.urgencyPerShotClock * (1 - shotSeconds / B.shotClockSeconds);
  const cube = (value: number): number => value * value * value;
  const style = B.onBall[h.player.onBall];
  const weights = [
    cube(shootValue) * B.shootWeight * urgency * (odds.points === 3 ? style.three * (1 + B.tacticThree * tactics.spacing) : style.shoot) * (1 + B.tacticPaceShoot * tactics.pace),
    B.holdWeight * style.hold * (1 - B.tacticPaceHold * tactics.pace),
    cube(driveValue) * B.driveWeight * style.drive * (1 - B.tacticInsideDrive * tactics.spacing),
    ...passValues.map(value => cube(value) * B.passWeight * style.pass * (1 - B.tacticPacePass * tactics.pace)),
  ];
  const choice = weightedIndex(s.rng, weights);
  if (choice === 0) shoot(s, h);
  else if (choice === 2) {
    s.driving = true;
    // O crossover deixa o defensor parado por um instante e abre o caminho para o cesto.
    if (hasMove(h, 'crossover') && pressure >= B.crossoverMinPressure && chance(s.rng, B.crossoverChance)) {
      defender.stunnedUntil = s.tick + seconds(B.crossoverStunSeconds);
      emitMove(s, h, 'crossover');
    }
  }
  else if (choice >= 3) pass(s, h, teammates[choice - 3]!);
}

/** O sítio para onde o jogador quer ir, conforme o seu comportamento. */
function attackSpot(b: Body): readonly [number, number] {
  // Cada jogador tem um lado do campo, para os colegas não se juntarem todos no mesmo sítio.
  const side = b.slot % 2 === 0 ? 1 : -1;
  const mirrored = (spots: readonly (readonly [number, number])[]): readonly [number, number] => {
    const [u, v] = spots[b.spot]!;
    return [u, v * side];
  };
  if (b.player.offBall === 'spotUp') return mirrored(ARC_SPOTS);
  if (b.player.offBall === 'lowPost') return mirrored(LOW_POST_SPOTS);
  if (b.player.offBall === 'cutter') return mirrored(CUT_SPOTS);
  return SPOTS[b.slot]![b.spot]!;
}

/** Com a bola, o comportamento com bola manda sobre o movimento sem bola. */
function onBallSpot(b: Body): readonly [number, number] {
  const side = b.slot % 2 === 0 ? 1 : -1;
  if (b.player.onBall === 'shooter') {
    const [u, v] = ARC_SPOTS[b.spot]!;
    return [u, v * side];
  }
  if (b.player.onBall === 'postUp') {
    const [u, v] = LOW_POST_SPOTS[b.spot]!;
    return [u, v * side];
  }
  return SPOTS[b.slot]![b.spot]!;
}

function updateTargets(s: MatchState): void {
  const offense = s.offense;
  const defense = other(offense);
  const shotInAir = s.phase === 'shot';
  // Só vale a pena largar a defesa em lançamentos de longe, que dão ressaltos longos.
  const flight = s.flight;
  const leakingShot = flight?.kind === 'shot' && distance(flight.fromX, flight.fromY, fromU(s, offense, 1.575), 0) >= B.leakMinShotDistance;
  for (const b of s.court[offense]) {
    if (s.tick >= b.nextCutTick) {
      b.spot = weightedIndex(s.rng, [3, 1, 1]);
      const pace = b.player.offBall === 'cutter' ? B.cutterCutFactor : 1;
      b.nextCutTick = s.tick + seconds(between(s.rng, B.cutMinSeconds, B.cutMaxSeconds) * pace);
    }
    const [u, v] = b === s.holder ? onBallSpot(b) : attackSpot(b);
    b.targetX = fromU(s, offense, u);
    // Abrir o campo afasta os jogadores do meio; jogar por dentro aproxima-os.
    b.targetY = Math.max(-COURT_HALF_WIDTH + 0.3, Math.min(COURT_HALF_WIDTH - 0.3, v * (1 + B.tacticSpacingSpot * s.tactics[offense].spacing)));
    if (b === s.holder && s.driving) {
      b.targetX = fromU(s, offense, 1.9);
      b.targetY = 0;
    }
    // Quem vai ao ressalto corre para o cesto mal a bola sai da mão.
    if (shotInAir && b.player.offBall === 'crasher') {
      b.targetX = fromU(s, offense, 2.4);
      b.targetY = v * 0.4;
    }
    // Quem faz bloqueios coloca-se no caminho do defensor do colega com a bola.
    if (b.player.offBall === 'screener' && s.holder && s.holder !== b && s.phase === 'live') {
      const hoopX = fromU(s, offense, 1.575);
      const dist = distance(s.holder.x, s.holder.y, hoopX, 0) || 1;
      b.targetX = s.holder.x + ((hoopX - s.holder.x) / dist) * B.screenDistance;
      b.targetY = s.holder.y + ((0 - s.holder.y) / dist) * B.screenDistance;
    }
  }
  if (s.phase === 'dead') {
    const inbounder = s.court[offense][0]!;
    inbounder.targetX = fromU(s, defense, 0.5);
    inbounder.targetY = 2;
  }
  for (const b of s.court[defense]) {
    const man = s.court[offense][b.slot]!;
    const hoopX = fromU(s, offense, 1.575);
    const baseGap = b.player.offBall === 'shadow' ? B.shadowGap : man === s.holder ? 1 : 1.5;
    const gap = Math.max(0.5, baseGap - B.tacticPressureGap * s.tactics[defense].pressure);
    const dist = distance(man.x, man.y, hoopX, 0) || 1;
    b.targetX = man.x + ((hoopX - man.x) / dist) * gap;
    b.targetY = man.y + ((0 - man.y) / dist) * gap;
    // Quem joga em contra-ataque deixa de defender mal o adversário lança.
    if (leakingShot && b.player.offBall === 'leaker') {
      b.targetX = fromU(s, defense, B.leakU);
      b.targetY = man.y * 0.4;
    }
  }
  if (s.phase === 'rebound') {
    for (const b of [...s.court[0], ...s.court[1]]) {
      if (distance(b.x, b.y, s.ball.x, s.ball.y) < 5) {
        b.targetX = s.ball.x;
        b.targetY = s.ball.y;
      }
    }
  }
  const f = s.flight;
  if (f?.kind === 'pass' && f.interceptedBy) {
    f.interceptedBy.targetX = f.target.x;
    f.interceptedBy.targetY = f.target.y;
  }
  if (f?.kind === 'pass' && f.lob) {
    f.target.targetX = fromU(s, offense, 1.9);
    f.target.targetY = 0;
  }
}

function isScreened(s: MatchState, b: Body): boolean {
  if (b.team === s.offense) return false;
  for (const a of s.court[s.offense]) {
    if (a.player.offBall === 'screener' && distance(a.x, a.y, b.x, b.y) < B.screenSlowRange) return true;
  }
  return false;
}

function movePlayers(s: MatchState): void {
  for (const team of s.court) {
    for (const b of team) {
      const dx = b.targetX - b.x;
      const dy = b.targetY - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.01 || b.stunnedUntil > s.tick) continue;
      const slowed = isScreened(s, b) ? B.screenSlowdown : 1;
      const stepLength = Math.min(dist, maxSpeed(b) * slowed * DT);
      b.x += (dx / dist) * stepLength;
      b.y += (dy / dist) * stepLength;
    }
  }
}

function updateFatigue(s: MatchState): void {
  for (const b of s.bodies) {
    const a = b.player.attributes;
    if (b.slot >= 0) {
      b.line.secondsPlayed += DT;
      const teamTactics = s.tactics[b.team];
      const bodyLoad = (1 + B.fatiguePerBmi * (b.bmi - B.referenceBmi)) * (1 + B.tacticPressureFatigue * teamTactics.pressure + B.tacticPaceFatigue * teamTactics.pace);
      b.fatigue = clamp01(b.fatigue + B.fatigueGain * bodyLoad * (1 + B.fatigueStaminaFactor * (0.6 - a.stamina / 100)) * DT);
    } else {
      b.fatigue = clamp01(b.fatigue - B.benchRecovery * (1 + B.benchStrengthFactor * (a.strength / 100 - 0.6)) * DT);
    }
  }
}

function updateBall(s: MatchState): void {
  const f = s.flight;
  if (f) {
    // A contagem sobe depois disto: assim a última posição é mesmo a do fim da trajetória.
    const t = (f.ticks + 1) / f.total;
    if (f.kind === 'pass') {
      s.ball.x = f.fromX + (f.target.x - f.fromX) * t;
      s.ball.y = f.fromY + (f.target.y - f.fromY) * t;
      s.ball.z = f.lob ? 1.5 + 1.7 * t + 2.5 * t * (1 - t) : 1.3;
    } else {
      const hoopX = fromU(s, f.shooter.team, 1.575);
      const dist = distance(f.fromX, f.fromY, hoopX, 0) || 1;
      if (f.blockedBy) {
        // Desarmada, a bola quase não sai da mão do lançador.
        s.ball.x = f.fromX + (hoopX - f.fromX) * B.blockedTravel * t;
        s.ball.y = f.fromY * (1 - B.blockedTravel * t);
        s.ball.z = 2.6 + 0.3 * t;
      } else {
        // O cesto vai ao centro do aro; o falhanço bate no ferro, à frente ou atrás.
        const miss = f.made ? 0 : B.rimMissOffset * (f.total % 2 === 0 ? 1 : -1);
        const aimX = hoopX + ((f.fromX - hoopX) / dist) * miss;
        const aimY = (f.fromY / dist) * miss;
        const arc = B.shotArcBase + dist * B.shotArcPerMeter;
        s.ball.x = f.fromX + (aimX - f.fromX) * t;
        s.ball.y = f.fromY + (aimY - f.fromY) * t;
        s.ball.z = 2.2 + 0.85 * t + arc * t * (1 - t);
      }
    }
  } else if (s.holder) {
    s.ball.x = s.holder.x;
    s.ball.y = s.holder.y;
    s.ball.z = 1;
  } else if (s.freeThrow) {
    const shooter = s.freeThrow.shooter;
    const flightTicks = seconds(B.freeThrowFlightSeconds);
    const t = s.timer < flightTicks ? 1 - s.timer / flightTicks : 0;
    s.ball.x = shooter.x + (fromU(s, shooter.team, 1.575) - shooter.x) * t;
    s.ball.y = shooter.y * (1 - t);
    s.ball.z = 2 + 1.05 * t + (B.shotArcBase + 4 * B.shotArcPerMeter) * t * (1 - t);
  } else {
    s.ball.z = Math.max(B.ballRestHeight, s.ball.z - B.ballFallSpeed * DT);
  }
}

/** No lance livre, o marcador vai para a linha e os outros alinham-se ao longo da área. */
function updateFreeThrowTargets(s: MatchState): void {
  const shooter = s.freeThrow!.shooter;
  const team = shooter.team;
  shooter.targetX = fromU(s, team, 5.9);
  shooter.targetY = 0;
  const others = [...s.court[other(team)], ...s.court[team].filter(b => b !== shooter)];
  others.forEach((b, i) => {
    const [u, v] = FREE_THROW_SPOTS[i]!;
    b.targetX = fromU(s, team, u);
    b.targetY = v;
  });
}

function stepFreeThrow(s: MatchState): void {
  if (--s.timer > 0) return;
  const free = s.freeThrow!;
  const shooter = free.shooter;
  const team = shooter.team;
  free.left--;
  s.lines[team].freeThrowAttempts++;
  const made = chance(s.rng, freeThrowChance(shooter.player.attributes));
  if (made) {
    addRun(s, team, 1);
    s.score[team]++;
    shooter.line.points++;
    s.lines[team].freeThrowsMade++;
  }
  emit(s, made ? 'freeThrowMade' : 'freeThrowMissed', team, { player: shooter.player.name, points: 1 });
  if (free.left > 0) {
    s.timer = seconds(B.freeThrowSeconds);
    return;
  }
  s.freeThrow = null;
  if (made) deadBall(s, other(team), false);
  else startRebound(s);
}

/** Pede um desconto. Entra na próxima bola parada, ou logo se a equipa tiver a bola. */
export function requestTimeout(s: MatchState, team: TeamIndex): boolean {
  if (s.phase === 'end' || s.timeoutsLeft[team] <= 0 || s.pendingTimeout[team] || s.timeoutTeam === team) return false;
  s.pendingTimeout[team] = true;
  s.commands.push({ kind: 'timeout', tick: s.tick, team });
  return true;
}

/** Pede uma troca. Entra na próxima bola parada. Uma troca manual desliga a rotação automática da equipa. */
export function queueSubstitution(s: MatchState, team: TeamIndex, slot: number, incomingIndex: number): boolean {
  const incoming = s.bodies[incomingIndex];
  if (s.phase === 'end' || !Number.isInteger(slot) || slot < 0 || slot > 4) return false;
  if (!incoming || incoming.team !== team || incoming.slot !== -1 || incoming.line.fouls >= B.foulOutAt) return false;
  s.pendingSubs = s.pendingSubs.filter(sub => !(sub.team === team && (sub.slot === slot || sub.incoming === incoming)));
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

function applyCommand(s: MatchState, c: Command): void {
  if (c.kind === 'tactics') setTactics(s, c.team, c.tactics);
  else if (c.kind === 'timeout') requestTimeout(s, c.team);
  else if (c.kind === 'substitution') queueSubstitution(s, c.team, c.slot, c.incoming);
  else if (c.kind === 'cancelSubstitution') cancelSubstitution(s, c.team, c.slot);
  else setAutoRotation(s, c.team, c.on);
}

/** Durante o desconto, cada equipa junta-se à frente do seu banco. */
function updateHuddle(s: MatchState): void {
  for (const team of [0, 1] as const) {
    s.court[team].forEach((b, i) => {
      b.targetX = (team === 0 ? 8 : 20) + (i - 2) * 0.9;
      b.targetY = -5.6 + (i % 2) * 0.9;
    });
  }
}

/** Avança a simulação um passo (1/20 de segundo). */
export function step(s: MatchState): void {
  if (s.phase === 'end') return;
  s.tick++;
  if (s.phase === 'break') {
    if (--s.timer <= 0) beginPeriod(s);
    return;
  }
  if (s.phase === 'timeout') {
    updateHuddle(s);
    movePlayers(s);
    if (--s.timer <= 0) {
      // Volta tudo ao lugar com o relógio parado, e o jogo recomeça com reposição.
      s.timeoutTeam = null;
      s.phase = 'dead';
      s.timer = seconds(B.afterTimeoutSeconds);
      s.clockStopped = true;
    }
    return;
  }
  if (s.phase === 'live' && s.clock > 0 && s.pendingTimeout[s.offense]) {
    grantTimeout(s, s.offense);
    return;
  }
  if (s.phase === 'freeThrow') {
    updateFreeThrowTargets(s);
    movePlayers(s);
    updateBall(s);
    stepFreeThrow(s);
    if (s.clock === 0 && s.phase !== 'freeThrow') endPeriod(s);
    return;
  }
  if (s.clock > 0 && !s.clockStopped) s.clock--;
  if (s.phase === 'live' || s.phase === 'pass') s.shotClock--;
  updateFatigue(s);
  updateTargets(s);
  movePlayers(s);
  updateBall(s);

  switch (s.phase) {
    case 'dead':
      if (--s.timer <= 0) {
        s.clockStopped = false;
        giveBall(s, s.court[s.offense][0]!);
      }
      break;
    case 'live':
      if (s.shotClock <= 0) {
        // Acabou o tempo de posse sem lançamento: a bola passa para o adversário.
        s.lines[s.offense].turnovers++;
        emit(s, 'shotClockViolation', s.offense);
        deadBall(s, other(s.offense), false);
      } else if (s.tick >= s.nextDecision) {
        decide(s);
      }
      break;
    case 'pass': {
      const f = s.flight as PassFlight;
      if (++f.ticks >= f.total) resolvePass(s, f);
      break;
    }
    case 'shot': {
      const f = s.flight as ShotFlight;
      if (++f.ticks >= f.total) resolveShot(s, f);
      break;
    }
    case 'rebound':
      if (--s.timer <= 0) resolveRebound(s);
      break;
  }
  // Uma bola no ar quando o tempo acaba ainda conta: é assim que nasce o lançamento sobre o apito.
  const phase = s.phase as Phase;
  if (s.clock === 0 && phase !== 'shot' && phase !== 'freeThrow' && phase !== 'timeout') endPeriod(s);
}

export function createMatch(home: Team, away: Team, seed: number, controlled: [boolean, boolean] = [false, false]): MatchState {
  validateTeam(home);
  validateTeam(away);
  const teams: [Team, Team] = [home, away];
  const bodies: Body[] = [];
  const court: [Body[], Body[]] = [[], []];
  for (const team of [0, 1] as const) {
    teams[team].roster.forEach((player, index) => {
      const onCourt = index < 5;
      const body: Body = {
        player,
        team,
        slot: onCourt ? index : -1,
        starterSlot: onCourt ? index : -1,
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        spot: 0,
        nextCutTick: 0,
        enteredTick: 0,
        stunnedUntil: 0,
        bmi: player.weightKg / ((player.heightCm / 100) * (player.heightCm / 100)),
        fatigue: player.fatigue,
        line: { points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0, fouls: 0, secondsPlayed: 0 },
      };
      bodies.push(body);
      if (onCourt) court[team].push(body);
      else placeBench(body);
    });
  }
  const rng = makeRng(seed);
  const firstOffense: TeamIndex = next(rng) < 0.5 ? 0 : 1;
  const s: MatchState = {
    teams,
    controlled,
    tactics: [{ ...(home.tactics ?? NEUTRAL_TACTICS) }, { ...(away.tactics ?? NEUTRAL_TACTICS) }],
    autoRotation: [true, true],
    timeoutsLeft: [B.timeoutsPerHalf, B.timeoutsPerHalf],
    pendingTimeout: [false, false],
    pendingSubs: [],
    commands: [],
    timeoutTeam: null,
    clockStopped: false,
    run: { team: 0, points: 0 },
    bodies,
    court,
    rng,
    seed,
    tick: 0,
    period: 0,
    clock: 0,
    phase: 'break',
    timer: 0,
    offense: firstOffense,
    firstOffense,
    holder: null,
    driving: false,
    shotClock: 0,
    nextDecision: 0,
    flight: null,
    lastPasser: null,
    lastPassTick: 0,
    ball: { x: COURT_LENGTH / 2, y: 0, z: 1 },
    freeThrow: null,
    score: [0, 0],
    teamFouls: [0, 0],
    lines: [emptyTeamLine(), emptyTeamLine()],
    events: [],
  };
  beginPeriod(s);
  return s;
}

/** Reproduz um jogo a partir da semente, das equipas e das decisões do treinador. */
export function replayMatch(home: Team, away: Team, seed: number, controlled: [boolean, boolean], commands: readonly Command[]): MatchState {
  const s = createMatch(home, away, seed, controlled);
  let next = 0;
  const maxTicks = seconds(B.periodSeconds) * 200;
  while (s.phase !== 'end' && s.tick < maxTicks) {
    while (next < commands.length && commands[next]!.tick === s.tick) applyCommand(s, commands[next++]!);
    step(s);
  }
  return s;
}

export function simulateMatch(home: Team, away: Team, seed: number, controlled: [boolean, boolean] = [false, false]): MatchState {
  const s = createMatch(home, away, seed, controlled);
  // Limite de segurança: nunca deve ser atingido, mas uma equipa vinda de fora não pode bloquear o jogo.
  const maxTicks = seconds(B.periodSeconds) * 200;
  while (s.phase !== 'end' && s.tick < maxTicks) step(s);
  if (s.phase !== 'end') throw new Error(`O jogo com a semente ${seed} não terminou`);
  return s;
}
