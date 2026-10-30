import { BALANCE as B } from './balance.ts';
import {
  COURT_HALF_WIDTH,
  COURT_LENGTH,
  DT,
  SPOTS,
  distance,
  hoopDistance,
  isThree,
  seconds,
  segmentDistance,
} from './court.ts';
import { between, chance, makeRng, next, weightedIndex, type Rng } from './rng.ts';
import { freeThrowChance, shotChance } from './shot.ts';
import { validateTeam, type Player, type Team } from './types.ts';

export type TeamIndex = 0 | 1;
export type Phase = 'dead' | 'live' | 'pass' | 'shot' | 'rebound' | 'freeThrow' | 'break' | 'end';

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

export interface MatchState {
  teams: [Team, Team];
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
  (B.baseSpeed + b.player.attributes.speed * B.speedPerPoint) * (1 - B.fatigueSpeedLoss * b.fatigue);

/** Pressão de 0 a 1, conforme a distância e a qualidade do defensor mais próximo. */
function pressureOn(s: MatchState, b: Body): number {
  let best = 0;
  for (const d of s.court[other(b.team)]) {
    const closeness = clamp01((B.pressureRange - distance(b.x, b.y, d.x, d.y)) / B.pressureRange);
    const a = d.player.attributes;
    const quality = (a.speed * 0.5 + a.strength * 0.3 + a.jumping * 0.2) / 100;
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
    if (dist < bestDistance) {
      bestDistance = dist;
      best = d;
    }
  }
  return best;
}

function shotOdds(s: MatchState, b: Body, pressure: number): { chance: number; points: 2 | 3; distance: number } {
  const u = toU(s, b.team, b.x);
  const three = isThree(u, b.y);
  const dist = hoopDistance(u, b.y);
  const probability = shotChance(b.player.attributes, {
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
  rotate(s, 0);
  rotate(s, 1);
}

function placeBench(b: Body): void {
  b.x = COURT_LENGTH / 2;
  b.y = COURT_HALF_WIDTH + 1;
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
  incoming.y = COURT_HALF_WIDTH;
  s.court[team][slot] = incoming;
  emit(s, 'substitution', team, { player: incoming.player.name, other: outgoing.player.name });
}

/** Rotação automática. Mais tarde, será configurada nas Opções de Comando. */
function rotate(s: MatchState, team: TeamIndex): void {
  const bench = s.bodies.filter(b => b.team === team && b.slot === -1);
  for (let slot = 0; slot < 5; slot++) {
    const current = s.court[team][slot]!;
    const fouledOut = current.line.fouls >= B.foulOutAt;
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
  // Posse alternada entre períodos.
  newPossession(s, s.period % 2 === 1 ? s.firstOffense : other(s.firstOffense));
  placeForPeriod(s);
  emit(s, 'period', s.offense);
  giveBall(s, s.court[s.offense][0]!);
}

function endPeriod(s: MatchState): void {
  s.holder = null;
  s.flight = null;
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

function shoot(s: MatchState, shooter: Body): void {
  const pressure = pressureOn(s, shooter);
  const odds = shotOdds(s, shooter, pressure);
  const defender = nearestDefender(s, shooter);
  const offenseAttrs = shooter.player.attributes;
  const defenseAttrs = defender.player.attributes;
  const line = s.lines[shooter.team];
  if (odds.points === 3) line.threeAttempts++;
  else line.twoAttempts++;
  emit(s, 'shot', shooter.team, { player: shooter.player.name, points: odds.points, distance: odds.distance });

  let blockedBy: Body | null = null;
  if (pressure >= B.blockPressureMin && odds.distance <= B.blockMaxDistance) {
    const edge = defenseAttrs.jumping - offenseAttrs.jumping;
    if (chance(s.rng, Math.max(0.005, B.blockBase + B.blockSlope * edge))) blockedBy = defender;
  }
  let fouledBy: Body | null = null;
  if (!blockedBy) {
    const base = odds.distance <= B.midDistance ? B.rimFoulChance : B.jumperFoulChance;
    const edge = offenseAttrs.strength + offenseAttrs.technique - defenseAttrs.strength - defenseAttrs.technique;
    if (chance(s.rng, Math.max(0.005, (base + B.foulSkillSlope * edge) * pressure))) fouledBy = defender;
  }
  const made = !blockedBy && chance(s.rng, odds.chance);
  const duration = blockedBy ? 0.2 : between(s.rng, B.shotMinSeconds, B.shotMaxSeconds);
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
  s.timer = seconds(B.freeThrowSeconds);
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
    const skill = 0.25 + (a.jumping * 0.5 + a.strength * 0.5) / 100;
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
}

function pass(s: MatchState, passer: Body, target: Body): void {
  const dist = distance(passer.x, passer.y, target.x, target.y);
  const a = passer.player.attributes;
  let interceptedBy: Body | null = null;
  for (const d of s.court[other(passer.team)]) {
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
    bad: !interceptedBy && chance(s.rng, badChance),
  };
  s.holder = null;
  s.phase = 'pass';
  s.driving = false;
}

function decide(s: MatchState): void {
  const h = s.holder!;
  s.nextDecision = s.tick + seconds(between(s.rng, B.decisionMinSeconds, B.decisionMaxSeconds));
  const a = h.player.attributes;
  const pressure = pressureOn(s, h);

  if (pressure >= B.stealPressureMin) {
    const defender = nearestDefender(s, h);
    const edge = defender.player.attributes.speed + defender.player.attributes.technique - a.technique * 2;
    if (chance(s.rng, Math.max(0.002, (B.stealBase + B.stealSlope * edge) * pressure))) {
      defender.line.steals++;
      s.lines[defender.team].steals++;
      s.lines[h.team].turnovers++;
      emit(s, 'steal', defender.team, { player: defender.player.name, other: h.player.name });
      newPossession(s, defender.team);
      giveBall(s, defender);
      return;
    }
    if (pressure >= B.reachFoulPressureMin && chance(s.rng, B.reachFoulChance)) {
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
  const weights = [
    cube(shootValue) * B.shootWeight * urgency,
    B.holdWeight,
    cube(driveValue) * B.driveWeight,
    ...passValues.map(value => cube(value) * B.passWeight),
  ];
  const choice = weightedIndex(s.rng, weights);
  if (choice === 0) shoot(s, h);
  else if (choice === 2) s.driving = true;
  else if (choice >= 3) pass(s, h, teammates[choice - 3]!);
}

function updateTargets(s: MatchState): void {
  const offense = s.offense;
  const defense = other(offense);
  for (const b of s.court[offense]) {
    if (s.tick >= b.nextCutTick) {
      b.spot = weightedIndex(s.rng, [3, 1, 1]);
      b.nextCutTick = s.tick + seconds(between(s.rng, B.cutMinSeconds, B.cutMaxSeconds));
    }
    const [u, v] = SPOTS[b.slot]![b.spot]!;
    b.targetX = fromU(s, offense, u);
    b.targetY = v;
    if (b === s.holder && s.driving) {
      b.targetX = fromU(s, offense, 1.9);
      b.targetY = 0;
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
    const gap = man === s.holder ? 1 : 1.5;
    const dist = distance(man.x, man.y, hoopX, 0) || 1;
    b.targetX = man.x + ((hoopX - man.x) / dist) * gap;
    b.targetY = man.y + ((0 - man.y) / dist) * gap;
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
}

function movePlayers(s: MatchState): void {
  for (const team of s.court) {
    for (const b of team) {
      const dx = b.targetX - b.x;
      const dy = b.targetY - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.01) continue;
      const stepLength = Math.min(dist, maxSpeed(b) * DT);
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
      b.fatigue = clamp01(b.fatigue + B.fatigueGain * (1 + B.fatigueStaminaFactor * (0.6 - a.stamina / 100)) * DT);
    } else {
      b.fatigue = clamp01(b.fatigue - B.benchRecovery * (1 + B.benchStrengthFactor * (a.strength / 100 - 0.6)) * DT);
    }
  }
}

function updateBall(s: MatchState): void {
  const f = s.flight;
  if (f) {
    const t = f.ticks / f.total;
    if (f.kind === 'pass') {
      s.ball.x = f.fromX + (f.target.x - f.fromX) * t;
      s.ball.y = f.fromY + (f.target.y - f.fromY) * t;
      s.ball.z = 1.3;
    } else {
      const hoopX = fromU(s, f.shooter.team, 1.575);
      s.ball.x = f.fromX + (hoopX - f.fromX) * t;
      s.ball.y = f.fromY * (1 - t);
      s.ball.z = 2.2 + 0.85 * t + 10 * t * (1 - t);
    }
  } else if (s.holder) {
    s.ball.x = s.holder.x;
    s.ball.y = s.holder.y;
    s.ball.z = 1;
  }
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

/** Avança a simulação um passo (1/20 de segundo). */
export function step(s: MatchState): void {
  if (s.phase === 'end') return;
  s.tick++;
  if (s.phase === 'break') {
    if (--s.timer <= 0) beginPeriod(s);
    return;
  }
  if (s.phase === 'freeThrow') {
    stepFreeThrow(s);
    if (s.clock === 0 && s.phase !== 'freeThrow') endPeriod(s);
    return;
  }
  if (s.clock > 0) s.clock--;
  if (s.phase === 'live' || s.phase === 'pass') s.shotClock--;
  updateFatigue(s);
  updateTargets(s);
  movePlayers(s);
  updateBall(s);

  switch (s.phase) {
    case 'dead':
      if (--s.timer <= 0) giveBall(s, s.court[s.offense][0]!);
      break;
    case 'live':
      if (s.tick >= s.nextDecision) decide(s);
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
  if (s.clock === 0 && phase !== 'shot' && phase !== 'freeThrow') endPeriod(s);
}

export function createMatch(home: Team, away: Team, seed: number): MatchState {
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
        fatigue: 0,
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

export function simulateMatch(home: Team, away: Team, seed: number): MatchState {
  const s = createMatch(home, away, seed);
  // Limite de segurança: nunca deve ser atingido, mas uma equipa vinda de fora não pode bloquear o jogo.
  const maxTicks = seconds(B.periodSeconds) * 200;
  while (s.phase !== 'end' && s.tick < maxTicks) step(s);
  if (s.phase !== 'end') throw new Error(`O jogo com a semente ${seed} não terminou`);
  return s;
}
