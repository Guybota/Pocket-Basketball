import { heightCmOf } from './teamgen.ts';
import { BALANCE as B } from './balance.ts';
import {
  COURT_HALF_WIDTH,
  ARC_SPOTS,
  COURT_LENGTH,
  CUT_SPOTS,
  ZONE_PLAN,
  zoneRegion,
  zoneRole,
  POST_WAIT_SPOTS,
  LANE_U,
  LANE_HALF_V,
  inLane,
  DT,
  FREE_THROW_DEFENSE_SPOTS,
  FREE_THROW_OFFENSE_SPOTS,
  LOW_POST_SPOTS,
  SPOTS,
  distance,
  hoopDistance,
  CRASH_SPOTS,
  isThree,
  threeLineGap,
  seconds,
  segmentDistance,
  HOOP_U,
  CLEAR_SPOTS,
  BENCH_START_X,
  BENCH_SPACING,
  BENCH_Y,
} from './court.ts';
import { between, chance, makeRng, next, weightedIndex, type Rng } from './rng.ts';
import { freeThrowChance, shotChance } from './shot.ts';
import { NEUTRAL_TACTICS, validateTactics, validateTeam, type MoveId, type Player, type Tactics, type Team } from './types.ts';

export type TeamIndex = 0 | 1;
interface LooseBall {
  fromX: number;
  fromY: number;
  fromZ: number;
  toX: number;
  toY: number;
  /** Quanto a bola sobe acima da linha direta entre o aro e as mãos. */
  rise: number;
  total: number;
  /** Só estes disputam a bola. Os outros seguem o seu papel. */
  chasers: Body[];
  /** Bola perdida: quem a perdeu. A perda só conta quando a bola sai do campo. */
  lostBy?: Body;
  /** Decidido quando a bola cai; só a apanha quando chega ao pé dela. */
  winner: Body | null;
}

/** Quem repõe a bola, de onde, e quem vem receber. */
interface Inbound {
  passer: Body;
  x: number;
  y: number;
  receivers: { body: Body; x: number; y: number }[];
  waited: number;
  settled: number;
  /** Quem repõe já apanhou a bola do chão e leva-a na mão. */
  hasBall: boolean;
}

interface JumpBall {
  a: Body;
  b: Body;
  total: number;
}

export type Phase = 'intro' | 'jump' | 'dead' | 'live' | 'pass' | 'shot' | 'rebound' | 'freeThrow' | 'timeout' | 'break' | 'end';

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
  /** Um corte a ler o defensor: para onde vai, até quando, e se já saiu para o canto (0 sem corte, 1 a cortar, 2 a sair). */
  cutTo: readonly [number, number] | null;
  cutUntil: number;
  cutStage: 0 | 1 | 2;
  nextCutTick: number;
  enteredTick: number;
  stunnedUntil: number;
  /** Porque está atordoado: nos tornozelos partidos tem uma animação própria. */
  stunKind: 'ankle' | null;
  /** No chão, de `fallenFrom` a `fallenUntil`. */
  fallenFrom: number;
  fallenUntil: number;
  /** Para que lado de x fica a cabeça, e se cai de barriga para baixo (senão, de costas). */
  fallHead: -1 | 1;
  fallProne: boolean;
  /** Até quando um bloqueio não o volta a apanhar. */
  screenCooldownUntil: number;
  /** Os 3 segundos: há quantos passos seguidos está na área, e até quando fica fora depois de sair. */
  laneTicks: number;
  laneOutUntil: number;
  /** Depois de perder um encontrão, corre mais devagar até aqui. */
  slowedUntil: number;
  nextBumpTick: number;
  /** O espaço que ocupa em campo. */
  radius: number;
  /** Quanto andou no último passo: um encontrão só acontece com alguém a correr contra o outro. */
  stepX: number;
  stepY: number;
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
  | 'bump'
  | 'knockdown'
  | 'tipOff'
  | 'jumpBall'
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
  bump?: 'run' | 'rebound' | 'post';
  hard?: boolean;
  move?: MoveId;
  /** O lançamento é um afundanço garantido pelo movimento especial. */
  dunk?: boolean;
  /** Um lay-up: perto do cesto, em corrida, a largar a bola por cima do aro. */
  layup?: boolean;
  /** Numa troca: quanto tempo quem sai leva a chegar ao banco, à sua velocidade. */
  ticks?: number;
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
  /** Onde o intercetador corta a linha do passe: a bola acaba aí, nas mãos dele, e não no destino. */
  cutX?: number;
  cutY?: number;
  bad: boolean;
  lob: boolean;
  /** Um passe que recomeça o jogo: não pode ser intercetado nem conta para assistência. */
  restart: boolean;
  /** A altura de onde parte, na bola ao alto. */
  fromZ: number | null;
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
  dunk: boolean;
  layup: boolean;
  /** No lay-up, onde a bola saiu da mão, quando sai. */
  releaseX?: number;
  releaseY?: number;
  releaseZ?: number;
}

/** Decisões do treinador. Ficam registadas: semente, equipas e comandos reproduzem o jogo exatamente. */
export type Command =
  | { kind: 'timeout'; tick: number; team: TeamIndex }
  | { kind: 'substitution'; tick: number; team: TeamIndex; slot: number; incoming: number }
  | { kind: 'cancelSubstitution'; tick: number; team: TeamIndex; slot: number }
  | { kind: 'reorder'; tick: number; team: TeamIndex; a: number; b: number }
  | { kind: 'autoRotation'; tick: number; team: TeamIndex; on: boolean }
  | { kind: 'tactics'; tick: number; team: TeamIndex; tactics: Tactics };

/** As jogadas de uma posse: livre, bloqueio direto, bloqueios sem bola, e as montadas para uma opção (isolamento, isolamento no poste, bloqueio e abrir). */
export type Play = 'free' | 'pickRoll' | 'screens' | 'iso' | 'postIso' | 'pickPop';

export interface MatchState {
  teams: [Team, Team];
  /** Equipa dirigida por uma pessoa: não pede descontos sozinha. */
  controlled: [boolean, boolean];
  tactics: [Tactics, Tactics];
  /** Quem joga fora, porque a Vontade conta mais longe de casa. */
  visitor: TeamIndex;
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
  /** Quem está a jogar de costas para o cesto, a empurrar o defensor. */
  posting: Body | null;
  /** Quem está a fazer um bloqueio nesta jogada, e em quem. */
  screen: { by: Body; on: Body } | null;
  inbound: Inbound | null;
  jump: JumpBall | null;
  /** A trajetória da bola depois de um falhanço, e onde vai cair. */
  loose: LooseBall | null;
  /** A jogada desta posse, escolhida ao começar pelo foco do ataque. */
  play: Play;
  /** Para quem é a jogada desta posse, quando é montada para uma opção de ataque. */
  playFor: Body | null;
  /** `returning`: entre dois lances, a bola ainda está a voltar ao lançador pelas mãos do árbitro. */
  freeThrow: { shooter: Body; left: number; returning?: boolean } | null;
  /** A última leva de trocas: o passo em que aconteceu e até quando quem saiu ainda vai a caminho do banco. */
  subsTick: number;
  /** Até quando dura o contra-ataque, e quem está a cortar agora (um de cada vez). */
  breakUntil: number;
  cutter: Body | null;
  cutterUntil: number;
  subWaitUntil: number;
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
export const toU = (s: MatchState, team: TeamIndex, x: number): number => Math.abs(attackBaseline(s, team) - x);
const fromU = (s: MatchState, team: TeamIndex, u: number): number => attackBaseline(s, team) - attackDirection(s, team) * u;

function emit(s: MatchState, type: MatchEventType, team: TeamIndex, extra: Partial<MatchEvent> = {}): void {
  s.events.push({ type, tick: s.tick, period: s.period, clock: s.clock, team, ...extra });
}

const maxSpeed = (b: Body): number =>
  (B.baseSpeed + b.player.attributes.speed * B.speedPerPoint - B.speedLossPerCm * (heightCmOf(b.player) - B.referenceHeight)) * (1 - B.fatigueSpeedLoss * b.fatigue);

const hasMove = (b: Body, move: MoveId): boolean => b.player.moves.includes(move);

/** Vai ao chão: não se mexe nem defende até se levantar. */
function knockDown(s: MatchState, b: Body, headX: number, prone: boolean): void {
  const ticks = seconds(B.fallSeconds);
  b.stunKind = null;
  b.fallHead = headX < 0 ? -1 : 1;
  b.fallProne = prone;
  b.fallenFrom = s.tick;
  b.fallenUntil = s.tick + ticks;
  b.stunnedUntil = Math.max(b.stunnedUntil, s.tick + ticks);
  emit(s, 'knockdown', b.team, { player: b.player.name });
}

/** O defensor marcado bate no bloqueio posto: pode ficar atordoado, e quanto mais forte o bloqueador mais vezes cai. */
function checkScreenHit(s: MatchState): void {
  const screen = s.screen;
  if (!screen || s.phase !== 'live') return;
  const { by, on } = screen;
  if (s.tick < on.screenCooldownUntil || on.stunnedUntil > s.tick || distance(by.x, by.y, on.x, on.y) >= B.screenContactRange) return;
  on.screenCooldownUntil = s.tick + seconds(B.screenHitCooldownSeconds);
  const strength = by.player.attributes.strength;
  if (!chance(s.rng, B.screenStunBase + (strength - on.player.attributes.strength) * B.screenStunPerStrength)) return;
  if (chance(s.rng, (strength - B.screenFallFromStrength) * B.screenFallPerStrength)) {
    // Bate no bloqueio e cai para trás, de costas, com a cabeça para o lado contrário ao do bloqueador.
    knockDown(s, on, on.x - by.x, false);
    return;
  }
  on.stunKind = null;
  on.stunnedUntil = s.tick + seconds(B.screenStunSeconds);
}

function emitMove(s: MatchState, b: Body, move: MoveId): void {
  emit(s, 'move', b.team, { player: b.player.name, move });
}

/** Não há ninguém capaz de se meter entre quem tem a bola e o cesto, como num contra-ataque. */
function hasOpenLane(s: MatchState, h: Body): boolean {
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
function pressureOn(s: MatchState, b: Body): number {
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
    ? (heightCmOf(b.player) - B.referenceHeight) * B.finishPerCm
    : 0;
  const focus = s.tactics[other(b.team)].focus ?? [];
  const marked = focus.length === 0 ? 0 : focus.includes(s.teams[b.team].roster.indexOf(b.player)) ? -B.focusShotPenalty : B.unfocusedShotBonus;
  const probability = shotChance(b.player.attributes, {
    bonus: physical + extraBonus + marked,
    distanceToHoop: dist,
    three,
    pressure,
    fatigue: b.fatigue,
    clutch: s.period >= 4 && s.clock <= seconds(B.clutchSeconds),
    away: b.team === s.visitor,
  });
  // Um lay-up livre entra quase sempre, para qualquer jogador: a probabilidade não desce abaixo de `openLayupChance`.
  const openLayup = dist <= B.layupMaxDistance && pressure < B.openShotPressure && s.posting !== b && hasOpenLane(s, b);
  return { chance: openLayup ? Math.max(probability, B.openLayupChance) : probability, points: three ? 3 : 2, distance: dist };
}

/** Um contra-ataque: dura uns segundos, mais com o ritmo rápido. */
function startBreak(s: MatchState, team: TeamIndex): void {
  s.breakUntil = s.tick + seconds(B.breakSeconds * (1 + B.tacticPaceBreak * s.tactics[team].pace));
}

/** Para onde se corta: para o cesto; contra a zona, para os buracos dela, o poste alto ou o canto curto. */
function cutTarget(s: MatchState, b: Body): readonly [number, number] {
  const side = b.y >= 0 ? 1 : -1;
  if (s.tactics[other(b.team)].defense === 'zone') return toU(s, b.team, b.x) > 4 ? [5, 0] : [1.5, side * 4.2];
  return [1.9, side * 0.9];
}

function startCut(s: MatchState, b: Body, to: readonly [number, number]): void {
  b.cutTo = to;
  b.cutStage = 1;
  b.cutUntil = s.tick + seconds(B.cutSeconds);
  s.cutter = b;
  s.cutterUntil = b.cutUntil;
}

/** Está a correr a fundo: a cortar para o cesto, a entrar com a bola, ou no ataque de um contra-ataque. */
export function isSprinting(s: MatchState, b: Body): boolean {
  if (b.slot < 0 || b.team !== s.offense || (s.phase !== 'live' && s.phase !== 'pass')) return false;
  return (b.cutStage === 1 && b.cutTo !== null) || (b === s.holder && s.driving) || s.tick < s.breakUntil;
}

/** O defensor está à frente do atacante: entre ele e o cesto que ele ataca. Atrás dele, não se defende, corre-se. */
function inFrontOf(s: MatchState, defender: Body, attacker: Body): boolean {
  const hoopX = fromU(s, attacker.team, HOOP_U);
  return distance(defender.x, defender.y, hoopX, 0) < distance(attacker.x, attacker.y, hoopX, 0);
}

function newPossession(s: MatchState, team: TeamIndex): void {
  s.offense = team;
  s.lines[team].possessions++;
  s.driving = false;
  s.lastPasser = null;
  s.cutter = null;
  for (const b of s.court[team]) {
    b.cutTo = null;
    b.cutStage = 0;
  }
  s.shotClock = seconds(B.shotClockSeconds);
  const focus = s.tactics[team].spacing;
  s.playFor = null;
  // Com opções de ataque, muitas posses são uma jogada montada para uma delas, conforme o tipo de jogador que é.
  const options = (s.tactics[team].options ?? []).map(name => s.court[team].find(b => b.player.name === name)).filter((b): b is Body => b !== undefined);
  if (options.length > 0 && chance(s.rng, B.optionPlayChance)) {
    const target = options.length > 1 && !chance(s.rng, B.optionFirstShare) ? options[1]! : options[0]!;
    s.playFor = target;
    s.play = playFor(target);
    return;
  }
  s.play = (['free', 'pickRoll', 'screens'] as const)[weightedIndex(s.rng, focus < 0 ? B.playsInside : focus > 0 ? B.playsOutside : B.playsMixed)]!;
}

/** A jogada que serve cada tipo de jogador. */
function playFor(b: Body): Play {
  const p = b.player;
  const a = p.attributes;
  if (p.height >= B.bigHeight) return p.onBall === 'postUp' || a.shooting < B.popShooting ? 'postIso' : 'pickPop';
  if (p.onBall === 'playmaker') return 'pickRoll';
  if (p.onBall === 'shooter' || p.offBall === 'spotUp' || a.shooting >= Math.max(a.speed, a.technique)) return 'screens';
  return 'iso';
}

/** Quanto mais uma opção de ataque é procurada: 1 para quem não é. */
function optionFactor(s: MatchState, b: Body): number {
  const options = s.tactics[b.team].options ?? [];
  return options[0] === b.player.name ? B.firstOptionFactor : options[1] === b.player.name ? B.secondOptionFactor : 1;
}

function giveBall(s: MatchState, b: Body): void {
  s.holder = b;
  s.phase = 'live';
  s.flight = null;
  s.nextDecision = s.tick + seconds(between(s.rng, B.decisionMinSeconds, B.decisionMaxSeconds));
}

/** Prepara a reposição: depois de um cesto, da linha de fundo; nos outros casos, da lateral mais próxima da bola. */
function setupInbound(s: MatchState, kind: 'baseline' | 'side'): void {
  const offense = s.offense;
  const defense = other(offense);
  const attack = attackDirection(s, offense);
  const side = s.ball.y < 0 ? -1 : 1;
  // Repõe-se do ponto da linha mais perto de onde a bola está: na linha de fundo, a de fundo mais perta (a do cesto onde se
  // marcou, ou por onde a bola saiu), nunca mesmo atrás da tabela; na lateral, à altura da bola.
  const endX = s.ball.x < COURT_LENGTH / 2 ? 0 : COURT_LENGTH;
  const inward = endX === 0 ? 1 : -1;
  const x = kind === 'baseline' ? endX - inward * B.inboundOutside : Math.max(2, Math.min(COURT_LENGTH - 2, s.ball.x));
  const y = kind === 'baseline' ? (Math.abs(s.ball.y) < 2.4 ? side * 2.4 : Math.max(-COURT_HALF_WIDTH + 1, Math.min(COURT_HALF_WIDTH - 1, s.ball.y))) : side * (COURT_HALF_WIDTH + B.inboundOutside);
  const team = s.court[offense];
  // Repõe quem está mais perto. O base vem sempre receber, porque é quem conduz o ataque.
  const passer = team.filter(b => b.slot !== 0).sort((a, b) => distance(a.x, a.y, x, y) - distance(b.x, b.y, x, y))[0]!;
  const near = kind === 'baseline'
    ? { x: endX + inward * 3.8, y: -side * 3 }
    : { x: x + attack * 2.2, y: side * (COURT_HALF_WIDTH - 2.5) };
  const far = kind === 'baseline'
    ? { x: endX + inward * 5.6, y: side * 3 }
    : { x: x - attack * 1.5, y: side * (COURT_HALF_WIDTH - 3.5) };
  const receivers = [{ body: team[0]!, ...near }];
  // Contra uma defesa em pressão, ou às vezes, vêm dois para dar outra opção.
  if (s.tactics[defense].pressure > 0 || chance(s.rng, B.inboundTwoReceiversChance)) {
    const second = team.find(b => b.slot !== 0 && b !== passer);
    if (second) receivers.push({ body: second, ...far });
  }
  s.inbound = { passer, x, y, receivers, waited: 0, settled: 0, hasBall: false };
}

/** Passa a quem estiver mais solto. */
function throwInbound(s: MatchState): void {
  const { passer, receivers } = s.inbound!;
  const openness = (b: Body): number => distance(b.x, b.y, nearestDefender(s, b).x, nearestDefender(s, b).y);
  const target = receivers.map(r => r.body).sort((a, b) => openness(b) - openness(a))[0]!;
  const dist = distance(passer.x, passer.y, target.x, target.y);
  s.inbound = null;
  s.flight = {
    kind: 'pass',
    ticks: 0,
    total: Math.max(seconds(B.minPassSeconds), seconds(dist / B.passSpeed)),
    fromX: passer.x,
    fromY: passer.y,
    passer,
    target,
    interceptedBy: null,
    bad: false,
    lob: false,
    restart: true,
    fromZ: null,
  };
  s.phase = 'pass';
}

/** Uma bola perdida rola até à linha mais perto, à vista de todos; só depois é que a reposição começa. */
function loseBallOut(s: MatchState, lostBy: Body): void {
  const { x, y, z } = s.ball;
  const out = B.inboundOutside;
  const toSideline = COURT_HALF_WIDTH - Math.abs(y) <= Math.min(x, COURT_LENGTH - x);
  const toX = toSideline ? x : x < COURT_LENGTH / 2 ? -out : COURT_LENGTH + out;
  const toY = toSideline ? (y < 0 ? -1 : 1) * (COURT_HALF_WIDTH + out) : y;
  const total = Math.max(4, Math.ceil(seconds(distance(x, y, toX, toY) / B.lostBallRollSpeed)));
  s.holder = null;
  s.flight = null;
  s.driving = false;
  s.phase = 'rebound';
  s.timer = total;
  // Sem ninguém a disputá-la: quando chega à linha, repõe o adversário.
  s.loose = { fromX: x, fromY: y, fromZ: z, toX, toY, rise: 0, total, chasers: [], winner: null, lostBy };
}

/** Bola parada. A reposição é feita pela equipa indicada, por quem fica fora de campo. */
/** A linha mais perto da bola: é daí que se repõe depois de uma falta ou de uma violação, como manda a regra. */
function nearestLine(s: MatchState): 'baseline' | 'side' {
  return Math.min(s.ball.x, COURT_LENGTH - s.ball.x) < COURT_HALF_WIDTH - Math.abs(s.ball.y) ? 'baseline' : 'side';
}

function deadBall(s: MatchState, inbounding: TeamIndex, keepsPossession: boolean, kind: 'baseline' | 'side' = nearestLine(s)): void {
  if (!keepsPossession) newPossession(s, inbounding);
  s.holder = null;
  s.flight = null;
  // A bola perdida que rolou até à linha acaba aqui; se ficasse, punha a bola a voar no lance livre seguinte.
  s.loose = null;
  s.driving = false;
  s.phase = 'dead';
  const before = s.events.length;
  applyPendingSubs(s);
  rotate(s, 0);
  rotate(s, 1);
  s.timer = seconds(s.events.slice(before).some(e => e.type === 'substitution') ? B.substitutionSeconds : B.deadBallSeconds);
  setupInbound(s, kind);
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

/** Dois jogadores em campo trocam de lugar, e com ele de papel. */
function swapSlots(s: MatchState, team: TeamIndex, a: number, b: number): void {
  const x = s.court[team][a]!;
  const y = s.court[team][b]!;
  s.court[team][a] = y;
  s.court[team][b] = x;
  x.slot = b;
  y.slot = a;
}

function applyPendingSubs(s: MatchState): void {
  for (const sub of s.pendingSubs) {
    if (sub.incoming.slot === -1) swapIn(s, sub.team, sub.slot, sub.incoming);
    else if (sub.incoming.slot !== sub.slot) swapSlots(s, sub.team, sub.slot, sub.incoming.slot);
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

/** O lugar de cada um no banco, pela ordem em que lá está. */
function seatOf(s: MatchState, b: Body): { x: number; y: number } {
  const bench = s.bodies.filter(x => x.team === b.team && x.slot === -1);
  return { x: BENCH_START_X[b.team] + Math.max(0, bench.indexOf(b)) * BENCH_SPACING, y: BENCH_Y };
}

function swapIn(s: MatchState, team: TeamIndex, slot: number, incoming: Body): void {
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
function subsSettled(s: MatchState): boolean {
  if (s.subsTick < 0 || s.tick - s.subsTick >= seconds(B.substitutionMaxWaitSeconds)) return true;
  if (s.tick < s.subWaitUntil) return false;
  return [...s.court[0], ...s.court[1]].every(b => b.enteredTick !== s.subsTick || Math.abs(b.y) <= COURT_HALF_WIDTH);
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
    const candidates = bench.filter(b => b.line.fouls < B.foulOutAt && (fouledOut || b.fatigue <= B.subInFatigue + (b.player.offBall === 'sixthMan' ? B.sixthManSubIn : 0)));
    if (candidates.length === 0) continue;
    // Entra o primeiro do banco que está fresco: a ordem do plantel é a ordem de entrada.
    const incoming = candidates[0]!;
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

/** O sítio de cada um à volta do círculo, cada equipa do seu lado. */
function jumpSpots(s: MatchState, team: TeamIndex, jumper: Body): Map<Body, [number, number]> {
  const dir = attackDirection(s, team);
  const around: readonly (readonly [number, number])[] = [[1.8, 3.6], [1.8, -3.6], [4.5, 2], [4.5, -2]];
  const spots = new Map<Body, [number, number]>();
  let next = 0;
  for (const b of s.court[team]) {
    if (b === jumper) {
      spots.set(b, [COURT_LENGTH / 2 - dir * 0.45, 0]);
    } else {
      const [d, y] = around[next++]!;
      spots.set(b, [COURT_LENGTH / 2 - dir * d, y]);
    }
  }
  return spots;
}

/** Salta quem chega mais alto de cada equipa. */
const bestJumper = (s: MatchState, team: TeamIndex): Body =>
  [...s.court[team]].sort((a, b) => jumpReach(b) - jumpReach(a))[0]!;

const jumpReach = (b: Body): number => b.player.attributes.jumping + (heightCmOf(b.player) - B.referenceHeight) * B.jumpPerCm;

/** As equipas vão para o círculo: a entrar do banco, no início do jogo, ou de onde estavam na pausa, no prolongamento. */
function placeForJump(s: MatchState, walkIn: boolean): void {
  const a = bestJumper(s, 0);
  const b = bestJumper(s, 1);
  s.jump = { a, b, total: seconds(B.jumpSeconds) };
  s.ball.x = COURT_LENGTH / 2;
  s.ball.y = 0;
  // Nas mãos do árbitro, até ele a atirar.
  s.ball.z = 1.7;
  for (const team of [0, 1] as const) {
    const dir = attackDirection(s, team);
    for (const [body, [x, y]] of jumpSpots(s, team, team === 0 ? a : b)) {
      body.targetX = x;
      body.targetY = y;
      if (walkIn) {
        body.x = COURT_LENGTH / 2 - dir * (3 + body.slot * 1.4);
        body.y = -COURT_HALF_WIDTH - 0.6;
      }
    }
  }
}

function startJump(s: MatchState): void {
  s.phase = 'jump';
  s.timer = s.jump!.total;
  emit(s, 'tipOff', s.offense);
}

/** Ganha quem chega mais alto, com alguma sorte, e toca a bola para um colega. */
function resolveJump(s: MatchState): void {
  const { a, b } = s.jump!;
  s.jump = null;
  const edge = Math.max(-B.jumpMaxEdge, Math.min(B.jumpMaxEdge, (jumpReach(a) - jumpReach(b)) * B.jumpEdgePerPoint));
  const winner = chance(s.rng, 0.5 + edge) ? a : b;
  const loser = winner === a ? b : a;
  emit(s, 'jumpBall', winner.team, { player: winner.player.name, other: loser.player.name });
  s.firstOffense = winner.team;
  newPossession(s, winner.team);
  const target = s.court[winner.team].find(body => body.slot === 0 && body !== winner) ?? s.court[winner.team].find(body => body !== winner)!;
  const dist = distance(s.ball.x, s.ball.y, target.x, target.y);
  s.flight = {
    kind: 'pass',
    ticks: 0,
    total: Math.max(seconds(B.minPassSeconds), seconds(dist / B.passSpeed)),
    fromX: s.ball.x,
    fromY: s.ball.y,
    passer: winner,
    target,
    interceptedBy: null,
    bad: false,
    lob: false,
    restart: true,
    fromZ: s.ball.z,
  };
  s.phase = 'pass';
}

function beginPeriod(s: MatchState): void {
  s.period++;
  s.clock = seconds(s.period <= 4 ? B.periodSeconds : B.overtimeSeconds);
  s.teamFouls = [0, 0];
  s.clockStopped = false;
  if (s.period === 1 || s.period === 3) s.timeoutsLeft = [B.timeoutsPerHalf, B.timeoutsPerHalf];
  else if (s.period > 4) s.timeoutsLeft = [B.timeoutsInOvertime, B.timeoutsInOvertime];
  if (s.period === 1 || s.period > 4) {
    placeForJump(s, s.period === 1);
    emit(s, 'period', s.offense);
    s.phase = 'intro';
    s.timer = seconds(B.introMaxSeconds);
    return;
  }
  // Posse alternada entre períodos: perde-a quem ganhou a bola ao alto, e repõe-se do meio-campo.
  newPossession(s, s.period % 2 === 1 ? s.firstOffense : other(s.firstOffense));
  // Depois do balneário, a equipa já está em campo quando a imagem volta. Nas outras pausas, vem a andar do banco.
  if (s.period === 3) placeForPeriod(s);
  emit(s, 'period', s.offense);
  s.flight = null;
  s.holder = null;
  s.phase = 'dead';
  s.timer = seconds(B.deadBallSeconds);
  if (s.period === 3) {
    s.ball.x = COURT_LENGTH / 2;
    s.ball.y = COURT_HALF_WIDTH;
    s.ball.z = B.ballRestHeight;
  }
  // Nos outros períodos a bola fica onde o anterior acabou: quem repõe vai buscá-la e leva-a à linha.
  setupInbound(s, 'side');
  if (s.period === 3) {
    s.inbound!.passer.x = s.inbound!.x;
    s.inbound!.passer.y = s.inbound!.y;
    s.inbound!.hasBall = true;
  }
}

function endPeriod(s: MatchState): void {
  s.holder = null;
  s.flight = null;
  s.inbound = null;
  s.loose = null;
  emit(s, 'periodEnd', s.offense);
  applyPendingSubs(s);
  if (s.period >= 4 && s.score[0] !== s.score[1]) {
    s.phase = 'end';
    s.ball.z = B.ballRestHeight;
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
  // Cada comportamento acerta mais na jogada que é a sua: o atirador a receber e lançar, o cortador a receber junto ao cesto,
  // o penetrador a acabar um drible e o poste a lançar de costas.
  const justReceived = s.lastPasser !== null && s.tick - s.lastPassTick <= seconds(B.catchAndShootSeconds);
  const catchAndShoot = shooter.player.offBall === 'spotUp' && justReceived;
  const cutting = shooter.player.offBall === 'cutter' && justReceived && hoopDistance(toU(s, shooter.team, shooter.x), shooter.y) <= B.midDistance;
  const slashing = shooter.player.onBall === 'slasher' && s.driving;
  const posting = shooter.player.onBall === 'postUp' && s.posting === shooter;
  const styleBonus = (catchAndShoot ? B.spotUpBonus : 0) + (cutting ? B.cutterFinishBonus : 0) + (slashing ? B.slasherFinishBonus : 0) + (posting ? B.postUpFinishBonus : 0);
  const odds = shotOdds(s, shooter, s.posting === shooter ? pressure * postRelief(s, shooter) : pressure, styleBonus + (lob ? B.alleyOopBonus : powerDunk ? B.powerDunkBonus : 0));
  const unstoppable = lob || powerDunk;
  const defender = nearestDefender(s, shooter);
  const offenseAttrs = shooter.player.attributes;
  const defenseAttrs = defender.player.attributes;
  const line = s.lines[shooter.team];
  if (odds.points === 3) line.threeAttempts++;
  else line.twoAttempts++;
  const dunk = unstoppable || (odds.distance <= B.dunkMaxDistance && offenseAttrs.jumping >= B.dunkMinJumping);
  // Perto do cesto sem afundar, e sem ser de costas no poste, é um lay-up.
  const layup = !dunk && odds.distance <= B.layupMaxDistance && s.posting !== shooter;
  emit(s, 'shot', shooter.team, { player: shooter.player.name, points: odds.points, distance: odds.distance, ...(dunk ? { dunk: true } : {}), ...(layup ? { layup: true } : {}) });

  let blockedBy: Body | null = null;
  if (!unstoppable && pressure >= B.blockPressureMin && odds.distance <= B.blockMaxDistance) {
    const edge = defenseAttrs.jumping - offenseAttrs.jumping + (heightCmOf(defender.player) - heightCmOf(shooter.player)) * (B.blockPerCm / B.blockSlope);
    if (chance(s.rng, Math.max(0.005, B.blockBase + B.blockSlope * edge) * (defender.player.offBall === 'rimProtector' ? B.rimProtectorBlock : 1))) blockedBy = defender;
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
    dunk,
    layup,
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
  s.loose = null;
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
    startRebound(s, true);
    return;
  }
  if (f.fouledBy) commitFoul(s, f.fouledBy);
  if (f.made) {
    if (f.dunk) {
      // Um poster: quem estava em cima do lance pode ir ao chão.
      const victim = nearestDefender(s, f.shooter);
      const fall = Math.min(B.posterFallMax, B.posterFallBase + (f.shooter.player.attributes.strength - 50) * B.posterFallPerStrength);
      if (distance(victim.x, victim.y, f.shooter.x, f.shooter.y) < B.posterRange && chance(s.rng, fall)) knockDown(s, victim, victim.x - f.shooter.x, false);
    }
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
    else deadBall(s, other(team), false, 'baseline');
    return;
  }
  emit(s, 'missed', team, { player: f.shooter.player.name, points: f.points });
  if (f.fouledBy) startFreeThrows(s, f.shooter, f.points);
  else startRebound(s);
}

function startRebound(s: MatchState, blocked = false): void {
  // O voo acaba uma imagem antes de chegar: o ressalto tem de partir mesmo do ferro.
  if (s.flight?.kind === 'shot' && !blocked) placeShotBall(s, s.flight, 1);
  s.flight = null;
  s.holder = null;
  s.phase = 'rebound';
  const { x: fromX, y: fromY, z: fromZ } = s.ball;
  // Uma bola desarmada cai perto de quem a desarmou. As outras saltam do aro para a frente do cesto.
  const toX = blocked
    ? Math.max(0.5, Math.min(COURT_LENGTH - 0.5, fromX + between(s.rng, -B.reboundBlockedTravel, B.reboundBlockedTravel)))
    : fromU(s, s.offense, 1.575 + between(s.rng, 0.4, 2.2));
  const toY = blocked
    ? Math.max(0.3 - COURT_HALF_WIDTH, Math.min(COURT_HALF_WIDTH - 0.3, fromY + between(s.rng, -B.reboundBlockedTravel, B.reboundBlockedTravel)))
    : between(s.rng, -2, 2);
  let rise: number;
  if (blocked) rise = between(s.rng, B.reboundBlockedRiseMin, B.reboundBlockedRiseMax);
  else if (chance(s.rng, B.reboundDropChance)) rise = between(s.rng, B.reboundDropRiseMin, B.reboundDropRiseMax);
  else rise = between(s.rng, B.reboundBounceRiseMin, B.reboundBounceRiseMax);
  const total = seconds(B.reboundSeconds + rise * B.reboundSecondsPerRise);
  s.timer = total;
  // Vai quem está perto e tem esse papel: os grandes atacam o cesto, e os bases ficam para trás.
  const score = (b: Body): number => {
    const dist = distance(b.x, b.y, toX, toY);
    if (b.team === s.offense) return reboundRole(b) === 'crash' ? dist - B.reboundCrashPreference : dist;
    return b.slot === 0 ? dist + B.reboundGuardReluctance : dist;
  };
  const pick = (team: Body[], count: number): Body[] => [...team].sort((a, b) => score(a) - score(b)).slice(0, count);
  const chasers = [
    ...pick(s.court[s.offense].filter(b => reboundRole(b) !== 'back'), B.reboundChasersOffense),
    ...pick(s.court[other(s.offense)], B.reboundChasersDefense),
  ];
  s.loose = { fromX, fromY, fromZ, toX, toY, rise, total, chasers, winner: null };
}

/** Quando a bola cai, decide-se quem a ganha. Só fica com ela quando chega ao pé dela. */
function pickRebounder(s: MatchState): Body {
  const { toX, toY, chasers: candidates } = s.loose!;
  const weights = candidates.map(b => {
    const a = b.player.attributes;
    const dist = distance(b.x, b.y, toX, toY);
    const size = (heightCmOf(b.player) - B.referenceHeight) * B.reboundPerCm;
    const skill = Math.max(0.1, 0.25 + (a.jumping * 0.5 + a.strength * 0.5) / 100 + size);
    const closeness = 1 / (1 + dist * dist);
    const eager = b.team === s.offense && b.player.offBall === 'crasher' ? 1 + B.crasherReboundBonus : 1;
    return skill * closeness * eager * (b.team === s.offense ? 1 : B.reboundDefenseBonus);
  });
  return candidates[weightedIndex(s.rng, weights)]!;
}

function resolveRebound(s: MatchState): void {
  const rebounder = s.loose!.winner!;
  s.loose = null;
  const offensive = rebounder.team === s.offense;
  rebounder.line.rebounds++;
  if (offensive) {
    s.lines[rebounder.team].offensiveRebounds++;
    s.shotClock = Math.max(s.shotClock, seconds(B.offensiveReboundShotClockSeconds));
  } else {
    s.lines[rebounder.team].defensiveRebounds++;
    newPossession(s, rebounder.team);
    startBreak(s, rebounder.team);
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
    startBreak(s, f.interceptedBy.team);
    giveBall(s, f.interceptedBy);
    return;
  }
  if (f.bad) {
    loseBallOut(s, f.passer);
    return;
  }
  if (f.restart) {
    // Como no basquetebol, depois de parado o relógio só volta a andar quando alguém toca na bola.
    s.clockStopped = false;
    s.lastPasser = null;
    giveBall(s, f.target);
    return;
  }
  s.lastPasser = f.passer;
  s.lastPassTick = s.tick;
  giveBall(s, f.target);
  // Dar-e-ir: quem passou perto do cesto corta logo para ele, se ninguém estiver a cortar.
  if (s.tick >= s.cutterUntil && toU(s, team, f.passer.x) <= B.cutMaxU && chance(s.rng, B.giveAndGoChance)) startCut(s, f.passer, cutTarget(s, f.passer));
  if (f.lob) shoot(s, f.target, true);
}

function pass(s: MatchState, passer: Body, target: Body, lob = false): void {
  const dist = distance(passer.x, passer.y, target.x, target.y);
  const a = passer.player.attributes;
  let interceptedBy: Body | null = null;
  let cut = 1;
  // Um passe alto passa por cima dos defensores.
  for (const d of lob ? [] : s.court[other(passer.team)]) {
    if (segmentDistance(d.x, d.y, passer.x, passer.y, target.x, target.y) > B.interceptDistance) continue;
    const edge = d.player.attributes.speed + d.player.attributes.technique - a.technique * 2;
    if (chance(s.rng, Math.max(0.005, B.interceptBase + B.interceptSlope * edge) * (d.player.offBall === 'dynamo' ? B.dynamoSteal : 1))) {
      interceptedBy = d;
      // A bola só voa até onde o defensor corta a linha.
      const dx = target.x - passer.x;
      const dy = target.y - passer.y;
      cut = Math.max(0.1, Math.min(1, ((d.x - passer.x) * dx + (d.y - passer.y) * dy) / (dx * dx + dy * dy || 1)));
      break;
    }
  }
  const badChance = (B.badPassBase + B.badPassPerMeter * dist) * (1.5 - a.technique / 100);
  s.flight = {
    kind: 'pass',
    ticks: 0,
    total: Math.max(seconds(B.minPassSeconds), seconds((dist * cut) / B.passSpeed)),
    fromX: passer.x,
    fromY: passer.y,
    passer,
    target,
    interceptedBy,
    ...(interceptedBy ? { cutX: passer.x + (target.x - passer.x) * cut, cutY: passer.y + (target.y - passer.y) * cut } : {}),
    bad: !lob && !interceptedBy && chance(s.rng, badChance),
    lob,
    restart: false,
    fromZ: null,
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
    const stealChance = Math.max(0.002, (B.stealBase + B.stealSlope * edge) * pressure) * (pickpocket ? B.pickpocketFactor : 1) * (defender.player.offBall === 'dynamo' ? B.dynamoSteal : 1) * (1 + B.tacticPressureSteal * defenseTactics.pressure);
    if (chance(s.rng, stealChance)) {
      if (pickpocket) emitMove(s, defender, 'pickpocket');
      defender.line.steals++;
      s.lines[defender.team].steals++;
      s.lines[h.team].turnovers++;
      emit(s, 'steal', defender.team, { player: defender.player.name, other: h.player.name });
      newPossession(s, defender.team);
      startBreak(s, defender.team);
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
  // Contra-ataque: só vale com vantagem numérica à frente da bola; sem ela, abranda-se para o ataque organizado.
  // Conta-se no meio-campo atacado: os nossos lá à frente, com o portador, contra os defensores que já lá chegaram.
  if (s.tick < s.breakUntil && toU(s, h.team, h.x) < COURT_LENGTH / 2 + 4) {
    const half = COURT_LENGTH / 2;
    const ahead = s.court[h.team].filter(b => b !== h && toU(s, b.team, b.x) < half).length + 1;
    const back = s.court[other(h.team)].filter(d => toU(s, h.team, d.x) < half).length;
    if (ahead <= back) s.breakUntil = s.tick;
  }
  const breaking = s.tick < s.breakUntil;
  // Sozinho perto do cesto, lança: nem a opção de ataque nem o organizador valem mais do que um lançamento livre ali.
  if (hoopDistance(toU(s, h.team, h.x), h.y) <= B.openShotDistance && pressure < B.openShotPressure) {
    shoot(s, h);
    return;
  }
  // Com o caminho livre não se segura nem se passa para trás: vai-se ao cesto. Um grande longe do cesto continua a dar a bola a quem a conduz.
  if ((h.slot < 3 || toU(s, h.team, h.x) <= B.outletU || s.driving) && hasOpenLane(s, h)) {
    if (hoopDistance(toU(s, h.team, h.x), h.y) <= B.openLaneFinish) {
      shoot(s, h);
    } else {
      s.driving = true;
      s.nextDecision = s.tick + seconds(B.openLaneCheckSeconds);
    }
    return;
  }
  // Com a bola na área há quase 3 segundos, já não se segura: lança-se ou passa-se para quem tiver o melhor lance.
  if (h.laneTicks >= seconds(B.laneDecideSeconds)) {
    const own = shotOdds(s, h, pressure);
    const mates = s.court[h.team].filter(b => b !== h).map(b => {
      const o = shotOdds(s, b, pressureOn(s, b));
      return { b, value: o.chance * o.points };
    });
    const best = mates.sort((x, y) => y.value - x.value)[0]!;
    if (best.value > own.chance * own.points) pass(s, h, best.b);
    else shoot(s, h);
    return;
  }
  if (chance(s.rng, B.looseBallBase * (1.5 - a.technique / 100))) {
    loseBallOut(s, h);
    return;
  }

  const u = toU(s, h.team, h.x);
  const teammates = s.court[h.team].filter(b => b !== h);
  const shotSeconds = s.shotClock / seconds(1);

  if (u > B.shootingRangeU) {
    const runners = teammates.filter(b => toU(s, b.team, b.x) <= B.aheadPassRangeU && pressureOn(s, b) < 0.2);
    // Quem já vai sozinho para o cesto recebe a bola quase sempre, antes dos outros.
    const loose = runners.find(b => hasOpenLane(s, b));
    if (loose && chance(s.rng, B.aheadOpenLaneChance)) {
      pass(s, h, loose);
      return;
    }
    if (runners.length > 0 && chance(s.rng, breaking ? B.breakAheadPassChance : B.aheadPassChance)) {
      pass(s, h, runners[0]!);
      return;
    }
    // Contra pressão no campo de trás, passa-se ao colega mais solto que esteja à frente, em vez de se gastar o tempo de posse.
    if (pressure >= B.pressBreakPressure && chance(s.rng, B.pressBreakPassChance)) {
      const ahead = teammates.filter(b => toU(s, b.team, b.x) < u - 1);
      const openness = (b: Body): number => distance(b.x, b.y, nearestDefender(s, b).x, nearestDefender(s, b).y);
      const target = ahead.sort((x, y) => openness(y) - openness(x))[0];
      if (target && openness(target) > 1.2) pass(s, h, target);
    }
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
    away: h.team === s.visitor,
  });
  const driveValue = dist > 2.5 && !s.driving ? driveChance * 2 : 0;
  const urgency = 1 + B.urgencyPerShotClock * (1 - shotSeconds / B.shotClockSeconds);
  const cube = (value: number): number => value * value * value;
  const style = B.onBall[h.player.onBall];
  const onTheLine = Math.abs(threeLineGap(u, h.y)) < B.shotLineMargin && shotSeconds > B.shotLineRushSeconds;
  // Quem é grande e ganhou a bola longe do cesto passa-a a quem a conduz, em vez de subir a driblar.
  // Só um poste com técnica a sério fica com ela de vez em quando.
  if (h.slot >= 3 && u > B.outletU && !s.driving) {
    const guard = teammates.find(b => b.slot === 0 || b.player.offBall === 'leaker') ?? teammates.find(b => b.slot === 1);
    if (guard && chance(s.rng, B.outletPassChance - Math.max(0, a.technique - B.outletSkilledFrom) * B.outletSkillSlope)) {
      pass(s, h, guard);
      return;
    }
  }
  // O base, ou um organizador, vê o colega livre e passa-lhe quase sempre, se o lance dele valer quase tanto como o seu.
  const freeMates = teammates.map(b => pressureOn(s, b) < B.wideOpenPressure || hasOpenLane(s, b));
  if (h.slot === 0 || h.player.onBall === 'playmaker') {
    const open = teammates.map((b, i) => ({ b, value: passValues[i]!, free: freeMates[i]! })).filter(m => m.free && m.value >= shootValue * B.guardOpenPassValue).sort((x, y) => y.value - x.value)[0];
    if (open && chance(s.rng, B.guardOpenPassChance)) {
      pass(s, h, open.b);
      return;
    }
  }
  const weights = [
    (onTheLine ? 0 : 1) * cube(shootValue) * B.shootWeight * urgency * (odds.points === 3 ? style.three * (1 + B.tacticThree * tactics.spacing) : style.shoot) * (1 + B.tacticPaceShoot * tactics.pace),
    // Livre, ninguém fica a segurar a bola; com o bloqueio posto, apetece penetrar.
    B.holdWeight * style.hold * (1 - B.tacticPaceHold * tactics.pace) * (pressure < B.openPressure ? B.openHoldFactor : 1),
    cube(driveValue) * B.driveWeight * style.drive * (1 - B.tacticInsideDrive * tactics.spacing) * (s.screen?.on === nearestDefender(s, h) ? B.pickRollDrive : 1),
    ...passValues.map((value, i) => cube(value) * B.passWeight * style.pass * (1 - B.tacticPacePass * tactics.pace) * (h.slot >= 3 && u > B.outletU && (teammates[i]!.slot === 0 || teammates[i]!.player.offBall === 'leaker') ? B.outletBoost : 1)),
  ];
  // As opções de ataque lançam e penetram mais e recebem mais a bola; na jogada montada para uma delas, ainda mais.
  const own = optionFactor(s, h);
  // Um organizador como opção cria para os outros: só se procura a si próprio quando o lance dele vale pelo menos o melhor passe.
  const creator = own > 1 && h.player.onBall === 'playmaker';
  const passer = s.lastPasser;
  const fed = passer !== null && passer !== h && s.tick - s.lastPassTick <= seconds(B.fedSeconds) && optionFactor(s, passer) > 1 && passer.player.onBall === 'playmaker';
  const bestPass = Math.max(0, ...passValues);
  weights[0]! *= (creator && shootValue < bestPass ? 1 : own) * (fed ? B.fedShotFactor : 1);
  weights[2]! *= (creator && driveValue < bestPass ? 1 : own) * (s.playFor === h && s.play === 'iso' ? B.isoDriveFactor : 1) * (fed ? B.fedShotFactor : 1) * (breaking ? B.breakDriveFactor : 1);
  teammates.forEach((b, i) => {
    const rolling = s.driving && s.screen?.by === b;
    // Um colega muito livre, ou com o caminho livre para o cesto, pede a bola.
    const free = freeMates[i]!;
    // O organizador só puxa pelos colegas que têm um lançamento melhor do que o dele, ou que estão livres: um base estrela também carrega a equipa.
    const better = passValues[i]! >= shootValue || free;
    weights[3 + i]! *= optionFactor(s, b) * (s.playFor === b ? B.playPassFactor : 1) * (creator && better ? B.creatorPassFactor * (rolling ? B.rollPassFactor : 1) : 1) * (free ? B.openTeammatePass : 1);
  });
  const choice = weightedIndex(s.rng, weights);
  if (choice === 0) shoot(s, h);
  else if (choice === 2) {
    s.driving = true;
    // O crossover deixa o defensor parado por um instante e abre o caminho para o cesto.
    if (hasMove(h, 'crossover') && pressure >= B.crossoverMinPressure && chance(s.rng, B.crossoverChance)) {
      defender.stunKind = 'ankle';
      defender.stunnedUntil = s.tick + seconds(B.crossoverStunSeconds);
      if (chance(s.rng, B.ankleFallBase + (a.technique - 50) * B.ankleFallPerTechnique)) knockDown(s, defender, h.x - defender.x, true);
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
  if (b.player.offBall === 'lowPost') return mirrored(POST_WAIT_SPOTS);
  if (b.player.offBall === 'cutter' || b.player.offBall === 'dynamo') return mirrored(CUT_SPOTS);
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

/** A força de um jogador num encontrão: conta o físico, o peso e a altura, e cansado empurra menos. */
export function pushPower(b: Body): number {
  const { attributes } = b.player;
  const raw = attributes.strength + (heightCmOf(b.player) - B.referenceHeight) * B.pushPerCm;
  return Math.max(B.pushPowerMin, raw * (1 - B.pushFatigueLoss * b.fatigue));
}

/** Joga-se de costas perto do cesto, com um defensor colado: quem gosta disso, ou quem é claramente mais forte. */
function isPosting(s: MatchState, b: Body): boolean {
  if (s.phase !== 'live' || s.driving) return false;
  const dist = hoopDistance(toU(s, b.team, b.x), b.y);
  if (dist < B.postMinDistance || dist > B.postMaxDistance) return false;
  const defender = nearestDefender(s, b);
  if (distance(b.x, b.y, defender.x, defender.y) > B.postContactRange) return false;
  return b.player.onBall === 'postUp' || (s.play === 'postIso' && s.playFor === b) || pushPower(b) - pushPower(defender) >= B.postPowerEdge;
}

/** Quanto a pressão diminui para quem ganhou o encosto: um defensor mais fraco não consegue contestar bem. */
function postRelief(s: MatchState, b: Body): number {
  const edge = (pushPower(b) - pushPower(nearestDefender(s, b))) / B.postPowerScale;
  return 1 - B.postPressureRelief * clamp01(edge);
}

/** O que cada atacante faz quando a bola sai para o cesto. */
function reboundRole(b: Body): 'crash' | 'back' | 'stay' {
  const style = b.player.offBall;
  if (style === 'crasher' || style === 'lowPost') return 'crash';
  if (style === 'leaker' || b.slot === 0) return 'back';
  if (style === 'spotUp') return 'stay';
  return b.slot >= 3 ? 'crash' : 'stay';
}

function updateTargets(s: MatchState): void {
  s.posting = s.holder && s.holder.team === s.offense && isPosting(s, s.holder) ? s.holder : null;
  const offense = s.offense;
  const defense = other(offense);
  const shotInAir = s.phase === 'shot';
  // Só vale a pena largar a defesa em lançamentos de longe, que dão ressaltos longos.
  const flight = s.flight;
  const leakingShot = flight?.kind === 'shot' && distance(flight.fromX, flight.fromY, fromU(s, offense, 1.575), 0) >= B.leakMinShotDistance;
  for (const b of s.court[offense]) {
    if (s.tick >= b.nextCutTick) {
      // Lê-se o defensor: colado e entre o atacante e a bola, corta-se pelas costas; senão muda-se de lugar.
      // Só se corta com quem tem a bola a conseguir ver, perto do cesto, e um de cada vez.
      const h = s.holder;
      const defender = nearestDefender(s, b);
      const canSee = h !== null && h !== b && s.phase === 'live' && pressureOn(s, h) < B.cutSignalPressure && s.tick >= s.cutterUntil;
      const denied = h !== null && distance(defender.x, defender.y, b.x, b.y) < B.cutDenyRange && distance(defender.x, defender.y, h.x, h.y) < distance(b.x, b.y, h.x, h.y);
      if (canSee && denied && toU(s, offense, b.x) <= B.cutMaxU) startCut(s, b, cutTarget(s, b));
      else b.spot = weightedIndex(s.rng, [3, 1, 1]);
      const pace = b.player.offBall === 'cutter' ? B.cutterCutFactor : b.player.offBall === 'dynamo' ? B.dynamoCutFactor : 1;
      b.nextCutTick = s.tick + seconds(between(s.rng, B.cutMinSeconds, B.cutMaxSeconds) * pace);
    }
    // Quem cortou e não recebeu sai para o canto contrário, para não entupir o garrafão.
    if (b.cutStage === 1 && s.tick >= b.cutUntil) {
      b.cutStage = 2;
      b.cutTo = [0.9, b.y >= 0 ? -6.6 : 6.6];
      b.cutUntil = s.tick + seconds(B.cutClearSeconds);
    } else if (b.cutStage === 2 && s.tick >= b.cutUntil) {
      b.cutStage = 0;
      b.cutTo = null;
    }
    if (b === s.holder) b.cutTo = null;
    const [u, v] = b === s.holder ? onBallSpot(b) : b.cutTo ?? attackSpot(b);
    b.targetX = fromU(s, offense, u);
    // Abrir o campo afasta os jogadores do meio; jogar por dentro aproxima-os.
    b.targetY = Math.max(-COURT_HALF_WIDTH + 0.3, Math.min(COURT_HALF_WIDTH - 0.3, v * (1 + B.tacticSpacingSpot * s.tactics[offense].spacing)));
    if (b === s.holder && s.driving) {
      b.targetX = fromU(s, offense, 1.9);
      b.targetY = 0;
    }
    // Contra-ataque: o portador empurra pelo meio, as asas correm abertas à frente da bola, o poste vai direito ao aro e o 4 vem atrás.
    if (s.tick < s.breakUntil && (s.phase === 'live' || s.phase === 'pass') && s.holder) {
      const hu = toU(s, offense, s.holder.x);
      if (b === s.holder) {
        b.targetX = fromU(s, offense, Math.max(B.breakStopU, hu - 5));
        b.targetY = b.y * 0.5;
      } else {
        const runners = s.court[offense].filter(r => r !== s.holder).sort((p, q) => q.slot - p.slot);
        const rim = runners[0]!;
        const trail = runners[1]!;
        if (b === rim) {
          b.targetX = fromU(s, offense, 1.9);
          b.targetY = b.y >= 0 ? 0.8 : -0.8;
        } else if (b === trail) {
          b.targetX = fromU(s, offense, Math.max(7.5, hu - 2));
          b.targetY = 0;
        } else {
          const wings = runners.slice(2);
          const side = wings.length === 2 && wings[0]!.y * wings[1]!.y > 0 ? (b === wings[0] ? 1 : -1) : b.y >= 0 ? 1 : -1;
          // As asas correm abertas pelas laterais e, com a bola no meio-campo, fecham em diagonal para o cesto.
          b.targetX = fromU(s, offense, Math.max(1.5, hu - 5));
          b.targetY = side * (hu > COURT_LENGTH / 2 ? 6.2 : Math.max(1.5, 6.2 * (hu - 1.5) / (COURT_LENGTH / 2 - 1.5)));
        }
      }
    }
    // De costas, vai-se recuando na direção do cesto, com o defensor pelo meio.
    if (b === s.posting) {
      const hoopX = fromU(s, offense, 1.575);
      const dist = distance(b.x, b.y, hoopX, 0) || 1;
      b.targetX = b.x + (hoopX - b.x) / dist;
      b.targetY = b.y - b.y / dist;
    }
    // Mal a bola sai da mão, os grandes atacam o cesto e o base recua, para não haver contra-ataque.
    if (shotInAir || s.phase === 'rebound') {
      const role = reboundRole(b);
      if (role === 'crash') {
        const [crashU, crashV] = CRASH_SPOTS[b.slot]!;
        b.targetX = fromU(s, offense, crashU);
        b.targetY = crashV;
      } else if (role === 'back') {
        b.targetX = fromU(s, offense, B.reboundSafetyU);
        b.targetY = v * 0.5;
      }
    }
    // Quem afunda, ou faz um lay-up, corre com a bola até ao aro, em vez de a atirar de onde está.
    if (flight?.kind === 'shot' && (flight.dunk || flight.layup) && !flight.blockedBy && b === flight.shooter) {
      b.targetX = fromU(s, offense, 1.9);
      b.targetY = 0;
    }
    // Quem faz bloqueios coloca-se no caminho do defensor do colega com a bola.
    if (b.player.offBall === 'screener' && s.holder && s.holder !== b && s.phase === 'live') {
      const hoopX = fromU(s, offense, 1.575);
      const dist = distance(s.holder.x, s.holder.y, hoopX, 0) || 1;
      b.targetX = s.holder.x + ((hoopX - s.holder.x) / dist) * B.screenDistance;
      b.targetY = s.holder.y + ((0 - s.holder.y) / dist) * B.screenDistance;
    }
  }
  s.screen = null;
  if (s.holder && s.phase === 'live') {
    const h = s.holder;
    const hu = toU(s, offense, h.x);
    if (hu > B.halfCourtPickUpU && pressureOn(s, h) >= B.pressBreakPressure) {
      // Saída contra pressão: o colega mais perto vem para a frente do portador, do lado contrário ao defensor, dar linha de passe.
      const helper = [...s.court[offense]].filter(b => b !== h).sort((a, b) => distance(a.x, a.y, h.x, h.y) - distance(b.x, b.y, h.x, h.y))[0]!;
      const defender = nearestDefender(s, h);
      helper.targetX = fromU(s, offense, hu - B.pressHelpDistance);
      helper.targetY = Math.max(-COURT_HALF_WIDTH + 0.5, Math.min(COURT_HALF_WIDTH - 0.5, h.y + (defender.y > h.y ? -2.5 : 2.5)));
    } else if (hu <= B.shootingRangeU && !s.driving) {
      // Se a opção saiu numa troca a meio da posse, a jogada deixa de ser para ela.
      if (s.playFor && s.playFor.slot < 0) s.playFor = null;
      const pf = s.playFor;
      // O grande de serviço para os bloqueios: o mais alto que não seja quem tem a bola nem a opção.
      const biggest = (except: readonly Body[]): Body => [...s.court[offense]].filter(b => !except.includes(b)).sort((a, b) => b.player.height - a.player.height)[0]!;
      if ((s.play === 'pickRoll' && (!pf || pf === h)) || (s.play === 'pickPop' && pf && pf !== h)) {
        // Bloqueio direto: o grande vem bloquear o defensor do portador. No pick-and-roll rola para o cesto; no pick-and-pop abre para o arco.
        const big = s.play === 'pickPop' ? pf! : pf ? biggest([h]) : s.court[offense][h.slot === 4 ? 3 : 4]!;
        const on = nearestDefender(s, h);
        big.targetX = on.x + (on.x - h.x) * 0.3;
        big.targetY = on.y + (on.y - h.y) * 0.3;
        s.screen = { by: big, on };
      } else if (s.play === 'screens' && pf !== h) {
        // Bloqueio sem bola: um grande bloqueia o defensor do lançador, que se desmarca para um sítio aberto do arco.
        const shooter = pf ?? s.court[offense][h.slot === 1 ? 0 : 1]!;
        const blocker = pf ? biggest([h, pf]) : s.court[offense][h.slot === 3 ? 4 : 3]!;
        const on = s.court[defense][shooter.slot]!;
        blocker.targetX = on.x + (on.x - shooter.x) * 0.3;
        blocker.targetY = on.y + (on.y - shooter.y) * 0.3;
        const [cu, cv] = ARC_SPOTS[shooter.spot]!;
        shooter.targetX = fromU(s, offense, cu);
        shooter.targetY = cv * (shooter.slot % 2 === 0 ? 1 : -1);
        s.screen = { by: blocker, on };
      }
    }
  }
  if (s.driving && s.screen && s.screen.on === nearestDefender(s, s.holder!)) {
    if (s.play === 'pickPop') {
      // Abre para o arco, do lado de onde está, à espera do passe para lançar.
      const [pu, pv] = ARC_SPOTS[1]!;
      s.screen.by.targetX = fromU(s, offense, pu);
      s.screen.by.targetY = pv * (s.screen.by.y >= 0 ? 1 : -1);
    } else {
      s.screen.by.targetX = fromU(s, offense, 2.2);
      s.screen.by.targetY = 0;
    }
  }
  // Isolamentos: quem joga para a opção abre o campo do lado contrário, para lhe deixar o caminho, ou o poste, livres.
  const iso = s.playFor;
  if (iso && iso.slot >= 0 && (s.play === 'iso' || s.play === 'postIso') && s.phase === 'live' && s.holder && !s.driving && toU(s, offense, s.holder.x) <= B.shootingRangeU) {
    const side = iso.y >= 0 ? 1 : -1;
    if (iso !== s.holder) {
      const [iu, iv] = s.play === 'postIso' ? LOW_POST_SPOTS[0]! : ARC_SPOTS[2]!;
      iso.targetX = fromU(s, offense, iu);
      iso.targetY = iv * side;
    }
    s.court[offense].filter(b => b !== iso && b !== s.holder).forEach((b, i) => {
      const [cu, cv] = CLEAR_SPOTS[i]!;
      b.targetX = fromU(s, offense, cu);
      b.targetY = -cv * side;
    });
  }
  if (s.phase === 'dead' && s.inbound) {
    const { passer, x, y, receivers, hasBall } = s.inbound;
    passer.targetX = hasBall ? x : s.ball.x;
    passer.targetY = hasBall ? y : s.ball.y;
    for (const r of receivers) {
      r.body.targetX = r.x;
      r.body.targetY = r.y;
    }
  }
  const focus = s.tactics[defense].focus ?? [];
  const attackers = s.teams[offense].roster;
  const defenseTactics = s.tactics[defense];
  const pickUp = defenseTactics.pressure >= 1 ? Infinity : defenseTactics.pressure >= 0 ? B.halfCourtPickUpU : B.defensePickUpU;
  const ballU = toU(s, offense, s.ball.x);
  const zone = defenseTactics.defense === 'zone' && ballU <= pickUp && s.phase !== 'dead';
  const ballHolder = s.holder ?? [...s.court[offense]].sort((a, b) => distance(a.x, a.y, s.ball.x, s.ball.y) - distance(b.x, b.y, s.ball.x, s.ball.y))[0]!;
  // Na zona, cada um guarda a sua área: a zona desliza em bloco conforme onde a bola está, e só um fecha sobre ela.
  const zonePlan = zone ? ZONE_PLAN[zoneRegion(toU(s, offense, ballHolder.x), ballHolder.y)] : null;
  const zoneSide: 1 | -1 = ballHolder.y >= 0 ? 1 : -1;
  // Defesa de transição: enquanto o adversário contra-ataca, os dois mais perto do próprio cesto protegem o garrafão,
  // o mais perto da bola trava-a, e os outros correm para a linha onde pegam.
  const transition = s.tick < s.breakUntil && (s.phase === 'live' || s.phase === 'pass');
  const ownHoopX = fromU(s, offense, HOOP_U);
  const protectors = transition ? [...s.court[defense]].sort((p, q) => distance(p.x, p.y, ownHoopX, 0) - distance(q.x, q.y, ownHoopX, 0)).slice(0, 2) : [];
  const stopper = transition ? [...s.court[defense]].filter(d => !protectors.includes(d)).sort((p, q) => distance(p.x, p.y, ballHolder.x, ballHolder.y) - distance(q.x, q.y, ballHolder.x, ballHolder.y))[0] ?? null : null;
  for (const b of s.court[defense]) {
    const man = s.court[offense][b.slot]!;
    const hoopX = fromU(s, offense, 1.575);
    if (transition && protectors.includes(b)) {
      b.targetX = fromU(s, offense, B.transitionProtectU);
      b.targetY = protectors[0] === b ? B.transitionProtectV : -B.transitionProtectV;
      continue;
    }
    if (transition && b === stopper) {
      const d = distance(ballHolder.x, ballHolder.y, hoopX, 0) || 1;
      b.targetX = ballHolder.x + ((hoopX - ballHolder.x) / d) * 1.2;
      b.targetY = ballHolder.y + ((0 - ballHolder.y) / d) * 1.2;
      continue;
    }
    if (zonePlan) {
      const role = zoneRole(b.slot, zoneSide);
      if (role === zonePlan.closer) {
        const d = distance(ballHolder.x, ballHolder.y, hoopX, 0) || 1;
        b.targetX = ballHolder.x + ((hoopX - ballHolder.x) / d) * B.zoneCloseGap;
        b.targetY = ballHolder.y + ((0 - ballHolder.y) / d) * B.zoneCloseGap;
      } else {
        const [zu, zv] = zonePlan.spots[role];
        b.targetX = fromU(s, offense, zu);
        b.targetY = zv * zoneSide;
      }
      continue;
    }
    const baseGap = b.player.offBall === 'shadow' ? B.shadowGap : man === s.holder ? 1 : 1.5;
    const dist = distance(man.x, man.y, hoopX, 0) || 1;
    // O guarda do aro só larga o seu homem quando ele está longe do cesto; perto, fica colado para desarmar.
    const marking = (focus.length === 0 ? 1 : focus.includes(attackers.indexOf(man.player)) ? B.focusGap : B.unfocusedGap) * (b.player.offBall === 'rimProtector' && man !== s.holder && dist > B.rimProtectorSagFrom ? B.rimProtectorGap : 1);
    const gap = Math.max(0.5, baseGap * marking - B.tacticPressureGap * s.tactics[defense].pressure);
    b.targetX = man.x + ((hoopX - man.x) / dist) * gap;
    b.targetY = man.y + ((0 - man.y) / dist) * gap;
    // Sem pressão campo inteiro, ninguém segue o ataque até ao outro lado: espera-se na linha escolhida, cada um no seu lado.
    if (b.player.offBall !== 'shadow' && toU(s, offense, b.targetX) > pickUp) {
      b.targetX = fromU(s, offense, pickUp);
      b.targetY *= 0.8;
    }
    // Quem joga em contra-ataque deixa de defender mal o adversário lança.
    if (leakingShot && b.player.offBall === 'leaker') {
      b.targetX = fromU(s, defense, B.leakU);
      b.targetY = man.y * 0.4;
    }
  }
  if (s.phase === 'rebound' && s.loose) {
    // Corre-se para onde a bola vai cair, e não para onde ela está.
    const { toX, toY, chasers } = s.loose;
    // Quem não disputa a bola segura o sítio, em vez de ir atrás do seu jogador para o meio da confusão.
    for (const b of s.court[defense]) {
      b.targetX = b.x;
      b.targetY = b.y;
    }
    for (const b of chasers) {
      b.targetX = toX;
      b.targetY = toY;
    }
  }
  const f = s.flight;
  if (f?.kind === 'pass' && f.interceptedBy) {
    f.interceptedBy.targetX = f.cutX ?? f.target.x;
    f.interceptedBy.targetY = f.cutY ?? f.target.y;
  }
  if (f?.kind === 'pass' && f.lob) {
    f.target.targetX = fromU(s, offense, 1.9);
    f.target.targetY = 0;
  }
  applyLaneLimits(s);
}

/** A bola está controlada no meio-campo atacante: só aí contam os 3 segundos. */
function laneCounts(s: MatchState): boolean {
  if (s.phase !== 'live' && s.phase !== 'pass') return false;
  const ballX = s.holder ? s.holder.x : s.ball.x;
  return toU(s, s.offense, ballX) <= COURT_LENGTH / 2;
}

/** Um defensor que marca alguém a um braço, ou o portador da bola, pode ficar na área. */
function guardingInLane(s: MatchState, b: Body, holderGuard: Body | null): boolean {
  if (b === holderGuard) return true;
  return s.court[s.offense].some(a => distance(a.x, a.y, b.x, b.y) <= B.armLength);
}

/** Conta, a cada passo, há quanto tempo cada um está na área. Quem tem a bola e vai para o cesto não conta. */
function updateLaneTime(s: MatchState): void {
  const counting = laneCounts(s);
  const holderGuard = counting && s.holder ? nearestDefender(s, s.holder) : null;
  for (const team of s.court) {
    for (const b of team) {
      const inside = inLane(toU(s, s.offense, b.x), b.y);
      const counts = counting && inside && (b.team === s.offense ? !(s.holder === b && s.driving) : !guardingInLane(s, b, holderGuard));
      b.laneTicks = counts ? b.laneTicks + 1 : 0;
    }
  }
}

/** O ponto mais perto fora da área: para a frente, além da linha de lance livre, ou para o lado. */
function laneExit(s: MatchState, x: number, y: number): [number, number] {
  const u = toU(s, s.offense, x);
  const front = LANE_U + B.laneExitMargin - u;
  const side = LANE_HALF_V + B.laneExitMargin - Math.abs(y);
  if (front < side) return [fromU(s, s.offense, LANE_U + B.laneExitMargin), y];
  return [x, (y < 0 ? -1 : 1) * (LANE_HALF_V + B.laneExitMargin)];
}

/** Os 3 segundos, sem apito: quem está na área há muito tempo sai dela, ou, se defende, cola-se a um atacante. */
function applyLaneLimits(s: MatchState): void {
  if (!laneCounts(s)) return;
  const leave = seconds(B.laneLeaveSeconds);
  const f = s.flight;
  for (const team of s.court) {
    for (const b of team) {
      if (b.laneTicks >= leave) b.laneOutUntil = s.tick + seconds(B.laneOutSeconds);
      if (s.tick >= b.laneOutUntil) continue;
      if (b.team === s.offense) {
        // Quem tem a bola, quem a vai receber e quem rola do bloqueio continuam: o portador decide em `decide`.
        if (b === s.holder || (f?.kind === 'pass' && f.target === b) || s.screen?.by === b) continue;
        if (inLane(toU(s, s.offense, b.targetX), b.targetY)) [b.targetX, b.targetY] = laneExit(s, b.targetX, b.targetY);
        continue;
      }
      if (!inLane(toU(s, s.offense, b.targetX), b.targetY)) continue;
      // O defensor cola-se ao atacante mais perto que esteja na área; se não houver nenhum, sai para a beira da área.
      const hoopX = fromU(s, s.offense, HOOP_U);
      const near = s.court[s.offense].filter(a => inLane(toU(s, s.offense, a.x), a.y)).sort((p, q) => distance(p.x, p.y, b.x, b.y) - distance(q.x, q.y, b.x, b.y))[0];
      if (near) {
        const d = distance(near.x, near.y, hoopX, 0) || 1;
        b.targetX = near.x + ((hoopX - near.x) / d) * B.laneGuardGap;
        b.targetY = near.y + ((0 - near.y) / d) * B.laneGuardGap;
      } else {
        [b.targetX, b.targetY] = laneExit(s, b.targetX, b.targetY);
      }
    }
  }
}

function isScreened(s: MatchState, b: Body): boolean {
  if (b.team === s.offense) return false;
  if (s.screen && s.screen.on === b && distance(s.screen.by.x, s.screen.by.y, b.x, b.y) < B.screenSetRange) return true;
  for (const a of s.court[s.offense]) {
    if (a.player.offBall === 'screener' && distance(a.x, a.y, b.x, b.y) < B.screenSlowRange) return true;
  }
  return false;
}

function movePlayers(s: MatchState): void {
  checkScreenHit(s);
  for (const team of s.court) {
    for (const b of team) {
      const dx = b.targetX - b.x;
      const dy = b.targetY - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      b.stepX = 0;
      b.stepY = 0;
      if (dist < 0.01 || b.stunnedUntil > s.tick) continue;
      // Em posição de defesa, perto do seu homem, anda-se de lado, mais devagar; longe dele, corre-se.
      // Só quem defende o jogador com a bola fica em posição de defesa: o defensor mais perto dele.
      const man = b.team !== s.offense && s.phase === 'live' && s.holder && nearestDefender(s, s.holder) === b ? s.holder : undefined;
      // Só desliza devagar quem já está quase no sítio; quem ficou para trás corre para lá.
      // Atrás do seu homem não há posição de defesa: corre-se para voltar a ficar entre ele e o cesto.
      const stance = man !== undefined && inFrontOf(s, b, man) && distance(b.x, b.y, man.x, man.y) < B.stanceRange && dist < B.stanceChaseRange ? B.stanceSpeed : 1;
      const slowed = stance * (isScreened(s, b) ? B.screenSlowdown : 1) * (b.slowedUntil > s.tick ? B.bumpSlowdown : 1) * (b === s.posting ? B.postSpeedFactor : 1) * (s.phase === 'intro' ? B.introWalkFactor : 1);
      const dunking = s.flight?.kind === 'shot' && (s.flight.dunk || s.flight.layup) && !s.flight.blockedBy && s.flight.shooter === b;
      const stepLength = Math.min(dist, maxSpeed(b) * slowed * (dunking ? B.dunkBurst : isSprinting(s, b) ? B.sprintFactor : 1) * DT);
      b.stepX = (dx / dist) * stepLength;
      b.stepY = (dy / dist) * stepLength;
      b.x += b.stepX;
      b.y += b.stepY;
    }
  }
}

function tryBump(s: MatchState, a: Body, b: Body, nx: number, ny: number): void {
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

function updateFatigue(s: MatchState): void {
  for (const b of s.bodies) {
    const a = b.player.attributes;
    if (b.slot >= 0) {
      b.line.secondsPlayed += DT;
      const teamTactics = s.tactics[b.team];
      const bodyLoad = (1 + B.tacticPressureFatigue * teamTactics.pressure + B.tacticPaceFatigue * teamTactics.pace);
      b.fatigue = clamp01(b.fatigue + B.fatigueGain * bodyLoad * (isSprinting(s, b) ? B.sprintFatigue : 1) * (1 + B.fatigueStaminaFactor * (0.6 - a.stamina / 100)) * DT);
    } else {
      b.fatigue = clamp01(b.fatigue - B.benchRecovery * (b.player.offBall === 'sixthMan' ? B.sixthManRecovery : 1) * (1 + B.benchStrengthFactor * (a.strength / 100 - 0.6)) * DT);
    }
  }
}

function placeShotBall(s: MatchState, f: ShotFlight, t: number): void {
  const hoopX = fromU(s, f.shooter.team, 1.575);
  // Quem afunda, ou faz um lay-up, leva a bola consigo até ao aro.
  const carried = (f.dunk || f.layup) && !f.blockedBy;
  const fromX = carried ? f.shooter.x : f.fromX;
  const fromY = carried ? f.shooter.y : f.fromY;
  const dist = distance(fromX, fromY, hoopX, 0) || 1;
  if (f.blockedBy) {
    // Desarmada, a bola quase não sai da mão do lançador.
    s.ball.x = f.fromX + (hoopX - f.fromX) * B.blockedTravel * t;
    s.ball.y = f.fromY * (1 - B.blockedTravel * t);
    s.ball.z = 2.6 + 0.3 * t;
  } else {
    // O cesto vai ao centro do aro; o falhanço bate no ferro, à frente ou atrás.
    const miss = f.made ? 0 : B.rimMissOffset * (f.total % 2 === 0 ? 1 : -1);
    const aimX = hoopX + ((fromX - hoopX) / dist) * miss;
    const aimY = (fromY / dist) * miss;
    if (f.layup && !f.dunk) {
      // No lay-up a bola vai na mão, a subir, até sair; depois voa sozinha do ponto onde saiu até ao aro.
      if (t < B.layupReleaseT) {
        s.ball.x = f.shooter.x;
        s.ball.y = f.shooter.y;
        s.ball.z = 1 + 1.6 * (t / B.layupReleaseT);
        f.releaseX = s.ball.x;
        f.releaseY = s.ball.y;
        f.releaseZ = s.ball.z;
      } else {
        const rx = f.releaseX ?? f.shooter.x;
        const ry = f.releaseY ?? f.shooter.y;
        const rz = f.releaseZ ?? 2.6;
        const k = (t - B.layupReleaseT) / (1 - B.layupReleaseT);
        s.ball.x = rx + (aimX - rx) * k;
        s.ball.y = ry + (aimY - ry) * k;
        s.ball.z = rz + (B.rimHeight - rz) * k + B.layupArc * k * (1 - k);
      }
      return;
    }
    const arc = Math.max(B.shotMinArc, carried ? B.dunkArc : B.shotArcBase + dist * B.shotArcPerMeter);
    s.ball.x = fromX + (aimX - fromX) * t;
    s.ball.y = fromY + (aimY - fromY) * t;
    s.ball.z = 2.2 + (B.rimHeight - 2.2) * t + arc * t * (1 - t);
  }
}

function updateBall(s: MatchState): void {
  const f = s.flight;
  if (f) {
    // A contagem sobe depois disto: assim a última posição é mesmo a do fim da trajetória.
    const t = (f.ticks + 1) / f.total;
    if (f.kind === 'pass') {
      s.ball.x = f.fromX + ((f.cutX ?? f.target.x) - f.fromX) * t;
      s.ball.y = f.fromY + ((f.cutY ?? f.target.y) - f.fromY) * t;
      if (f.fromZ !== null) s.ball.z = f.fromZ + (1.3 - f.fromZ) * t;
      else s.ball.z = f.lob ? 1.5 + 1.7 * t + 2.5 * t * (1 - t) : 1.3;
    } else {
      placeShotBall(s, f, t);
    }
  } else if (s.holder) {
    s.ball.x = s.holder.x;
    s.ball.y = s.holder.y;
    s.ball.z = 1;
  } else if (s.jump && s.phase === 'jump') {
    // A bola sobe entre os dois saltadores e começa a cair quando eles chegam lá acima.
    const t = 1 - s.timer / s.jump.total;
    s.ball.z = 1.7 + (B.rimHeight - 1.7) * t + B.jumpBallArc * t * (1 - t);
  } else if (s.inbound) {
    // A bola cai e fica onde está; quem vai repor vai buscá-la, e só depois a leva na mão.
    const { passer } = s.inbound;
    if (!s.inbound.hasBall && s.ball.z <= B.ballRestHeight + 0.01 && distance(passer.x, passer.y, s.ball.x, s.ball.y) < 1.2) s.inbound.hasBall = true;
    if (s.inbound.hasBall) {
      s.ball.x = passer.x;
      s.ball.y = passer.y;
      s.ball.z = 1;
    } else {
      s.ball.z = Math.max(B.ballRestHeight, s.ball.z - B.ballFallSpeed * DT);
    }
  } else if (s.loose) {
    // Uma parábola entre o aro e as mãos de quem a apanha: quanto mais `rise`, mais sobe antes de cair.
    const { fromX, fromY, fromZ, toX, toY, rise, total } = s.loose;
    if (s.timer <= 0) {
      // Já caiu: fica no chão à espera de quem a vai apanhar.
      s.ball.x = toX;
      s.ball.y = toY;
      s.ball.z = Math.max(B.ballRestHeight, s.ball.z - B.ballFallSpeed * DT);
    } else {
      const t = 1 - s.timer / total;
      s.ball.x = fromX + (toX - fromX) * t;
      s.ball.y = fromY + (toY - fromY) * t;
      // Uma bola perdida rola pelo chão; a do ressalto cai do aro para as mãos.
      s.ball.z = s.loose.chasers.length === 0 ? Math.max(B.ballRestHeight, fromZ - B.ballFallSpeed * DT * (total - s.timer)) : fromZ + (B.reboundCatchHeight - fromZ) * t + 4 * rise * t * (1 - t);
    }
  } else if (s.freeThrow) {
    const shooter = s.freeThrow.shooter;
    const flightTicks = seconds(B.freeThrowFlightSeconds);
    if (s.timer < flightTicks) {
      // No último passo do voo a bola está mesmo no centro do aro: antes ficava 8 % do caminho antes dele e saltava para lá ao cair.
      const t = 1 - Math.max(0, s.timer - 1) / flightTicks;
      s.ball.x = shooter.x + (fromU(s, shooter.team, 1.575) - shooter.x) * t;
      s.ball.y = shooter.y * (1 - t);
      s.ball.z = 2 + 1.05 * t + (B.shotArcBase + 4 * B.shotArcPerMeter) * t * (1 - t);
    } else if (s.freeThrow.returning) {
      // Entre lances: cai do aro, rola até ao árbitro, que está debaixo do cesto um pouco ao lado, e ele passa-a ao lançador.
      const elapsed = seconds(B.freeThrowSeconds) - s.timer;
      const fall = seconds(B.freeThrowFallSeconds);
      const roll = seconds(B.freeThrowRollSeconds);
      const throwTicks = seconds(B.freeThrowPassSeconds);
      const hoopX = fromU(s, shooter.team, HOOP_U);
      const refX = fromU(s, shooter.team, B.freeThrowRefereeU);
      const refY = B.freeThrowRefereeV;
      if (elapsed < fall) {
        s.ball.x = hoopX;
        s.ball.y = 0;
        s.ball.z = Math.max(B.ballRestHeight, 3.05 - (3.05 - B.ballRestHeight) * (elapsed / fall));
      } else if (elapsed < fall + roll) {
        const t = (elapsed - fall) / roll;
        s.ball.x = hoopX + (refX - hoopX) * t;
        s.ball.y = refY * t;
        s.ball.z = B.ballRestHeight + (1 - B.ballRestHeight) * t;
      } else if (elapsed < fall + roll + throwTicks) {
        const t = (elapsed - fall - roll) / throwTicks;
        s.ball.x = refX + (shooter.x - refX) * t;
        s.ball.y = refY + (shooter.y - refY) * t;
        s.ball.z = 1 + t + 1.2 * t * (1 - t);
      } else {
        s.freeThrow.returning = false;
        s.ball.x = shooter.x;
        s.ball.y = shooter.y;
        s.ball.z = 2;
      }
    } else if (distance(shooter.x, shooter.y, s.ball.x, s.ball.y) > 0.4) {
      // Antes do primeiro lance, o árbitro leva a bola ao lançador a andar.
      s.ball.z = Math.max(B.ballRestHeight, s.ball.z - B.ballFallSpeed * DT);
      if (s.ball.z <= B.ballRestHeight + 0.01) {
        const dist = distance(shooter.x, shooter.y, s.ball.x, s.ball.y);
        s.ball.x += ((shooter.x - s.ball.x) / dist) * Math.min(dist, B.refereeWalkSpeed * DT);
        s.ball.y += ((shooter.y - s.ball.y) / dist) * Math.min(dist, B.refereeWalkSpeed * DT);
      }
    } else {
      s.ball.x = shooter.x;
      s.ball.y = shooter.y;
      s.ball.z = 2;
    }
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
  // A defesa fica com os lugares de baixo e um terceiro; o ataque com os do meio; os grandes de cada equipa vão para o garrafão.
  const bySize = (list: readonly Body[]): Body[] => [...list].sort((a, b) => b.slot - a.slot);
  bySize(s.court[other(team)]).forEach((b, i) => {
    const [u, v] = FREE_THROW_DEFENSE_SPOTS[i]!;
    b.targetX = fromU(s, team, u);
    b.targetY = v;
  });
  bySize(s.court[team].filter(b => b !== shooter)).forEach((b, i) => {
    const [u, v] = FREE_THROW_OFFENSE_SPOTS[i]!;
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
    free.returning = true;
    return;
  }
  s.freeThrow = null;
  if (made) {
    deadBall(s, other(team), false, 'baseline');
  } else {
    s.ball.x = fromU(s, team, 1.575);
    s.ball.y = 0;
    s.ball.z = B.rimHeight;
    startRebound(s);
  }
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

function applyCommand(s: MatchState, c: Command): void {
  if (c.kind === 'tactics') setTactics(s, c.team, c.tactics);
  else if (c.kind === 'timeout') requestTimeout(s, c.team);
  else if (c.kind === 'substitution') queueSubstitution(s, c.team, c.slot, c.incoming);
  else if (c.kind === 'cancelSubstitution') cancelSubstitution(s, c.team, c.slot);
  else if (c.kind === 'reorder') reorderBench(s, c.team, c.a, c.b);
  else setAutoRotation(s, c.team, c.on);
}

/** Durante o desconto, cada equipa junta-se à frente do seu banco. */
/** Nas paragens, cada equipa junta-se à frente do seu banco. Ao intervalo, sai para o balneário pelo canto do seu lado. */
function updateHuddle(s: MatchState): void {
  const lockerRoom = s.phase === 'break' && s.period === 2;
  for (const team of [0, 1] as const) {
    s.court[team].forEach((b, i) => {
      if (lockerRoom) {
        // Pelo túnel do centro, em fila.
        b.targetX = (team === 0 ? 13.6 : 14.4) + (i % 2) * 0.2;
        b.targetY = -COURT_HALF_WIDTH - 3.8 - i * 0.5;
      } else {
        b.targetX = (team === 0 ? 8 : 23.5) + (i - 2) * 0.9;
        b.targetY = -5.6 + (i % 2) * 0.9;
      }
    });
  }
}

/** Com o jogo parado, a bola cai e fica no chão: nunca fica suspensa no ar. */
function settleBall(s: MatchState): void {
  s.ball.z = Math.max(B.ballRestHeight, s.ball.z - B.ballFallSpeed * DT);
}

/** Avança a simulação um passo (1/20 de segundo). */
export function step(s: MatchState): void {
  if (s.phase === 'end') return;
  s.tick++;
  if (s.phase === 'break') {
    updateHuddle(s);
    movePlayers(s);
    settleBall(s);
    if (--s.timer <= 0) beginPeriod(s);
    return;
  }
  if (s.phase === 'timeout') {
    updateHuddle(s);
    movePlayers(s);
    settleBall(s);
    if (--s.timer <= 0) {
      // Volta tudo ao lugar com o relógio parado, e o jogo recomeça com reposição.
      s.timeoutTeam = null;
      s.phase = 'dead';
      s.timer = seconds(B.afterTimeoutSeconds);
      s.clockStopped = true;
      setupInbound(s, 'side');
    }
    return;
  }
  if (s.phase === 'intro') {
    movePlayers(s);
    resolveContacts(s);
    // Quando toda a gente chegou ao seu lugar, a bola sobe.
    const arrived = [...s.court[0], ...s.court[1]].every(b => distance(b.x, b.y, b.targetX, b.targetY) < 0.3);
    if (arrived || --s.timer <= 0) startJump(s);
    return;
  }
  if (s.phase === 'jump') {
    movePlayers(s);
    updateBall(s);
    if (--s.timer <= 0) resolveJump(s);
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
  resolveContacts(s);
  updateLaneTime(s);
  updateBall(s);

  switch (s.phase) {
    case 'dead':
      if (--s.timer <= 0 && s.inbound && subsSettled(s)) {
        // Quem repõe chega ao seu lugar e assenta os pés antes de passar, mas não se espera para sempre.
        const { passer, x, y } = s.inbound;
        s.inbound.waited++;
        if (s.inbound.hasBall && distance(passer.x, passer.y, x, y) < B.inboundSettleDistance) s.inbound.settled++;
        if (s.inbound.settled >= seconds(B.inboundSettleSeconds) || s.inbound.waited >= seconds(B.inboundMaxWaitSeconds)) throwInbound(s);
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
    case 'rebound': {
      const loose = s.loose!;
      if (loose.chasers.length === 0) {
        // Bola perdida a rolar: só quando chega à linha é que conta como perdida, e a bola passa ao adversário.
        if (--s.timer <= 0) {
          s.lines[s.offense].turnovers++;
          emit(s, 'turnover', s.offense, loose.lostBy ? { player: loose.lostBy.player.name } : {});
          deadBall(s, other(s.offense), false, Math.abs(loose.toY) > COURT_HALF_WIDTH ? 'side' : 'baseline');
        }
        break;
      }
      if (loose.winner === null && --s.timer <= 0) loose.winner = pickRebounder(s);
      if (loose.winner) {
        // Com a bola no chão e quem a ganhou ainda longe, fica com ela quem chegar primeiro, seja quem for: antes outro
        // podia ficar ao lado dela sem a apanhar. Com o vencedor perto, a altura e o salto continuam a decidir.
        const onFloor = s.ball.z <= B.ballRestHeight + 0.01 && distance(loose.winner.x, loose.winner.y, s.ball.x, s.ball.y) > B.reboundCatchDistance * 2;
        const first = onFloor ? [...s.court[0], ...s.court[1]].filter(b => b.stunnedUntil <= s.tick && distance(b.x, b.y, s.ball.x, s.ball.y) <= B.reboundCatchDistance).sort((p, q) => distance(p.x, p.y, s.ball.x, s.ball.y) - distance(q.x, q.y, s.ball.x, s.ball.y))[0] : undefined;
        if (first) loose.winner = first;
        if (first || distance(loose.winner.x, loose.winner.y, s.ball.x, s.ball.y) <= B.reboundCatchDistance || --s.timer <= -seconds(B.reboundMaxWaitSeconds)) resolveRebound(s);
      }
      break;
    }
  }
  // Uma bola no ar quando o tempo acaba acaba o voo: o lançamento sobre o apito conta, um passe chega às mãos e um ressalto
  // cai e é apanhado; só depois o período acaba, em vez de a bola parar no ar e cair.
  const phase = s.phase as Phase;
  if (s.clock === 0 && phase !== 'shot' && phase !== 'pass' && phase !== 'rebound' && phase !== 'freeThrow' && phase !== 'timeout') endPeriod(s);
}

export function createMatch(home: Team, away: Team, seed: number, controlled: [boolean, boolean] = [false, false], visitor: TeamIndex = 1): MatchState {
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
        stunKind: null,
        fallenFrom: 0,
        fallenUntil: 0,
        fallHead: 1,
        fallProne: false,
        screenCooldownUntil: 0,
        laneTicks: 0,
        laneOutUntil: 0,
        cutTo: null,
        cutUntil: 0,
        cutStage: 0,
        slowedUntil: 0,
        nextBumpTick: 0,
        radius: B.bodyRadius,
        stepX: 0,
        stepY: 0,
        fatigue: clamp01(player.fatigue * (1 + B.conditionStaminaFactor * (0.5 - player.attributes.stamina / 100))),
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
    visitor,
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
    loose: null,
    play: 'free',
    playFor: null,
    posting: null,
    screen: null,
    inbound: null,
    jump: null,
    freeThrow: null,
    subsTick: -1,
    breakUntil: 0,
    cutter: null,
    cutterUntil: 0,
    subWaitUntil: 0,
    score: [0, 0],
    teamFouls: [0, 0],
    lines: [emptyTeamLine(), emptyTeamLine()],
    events: [],
  };
  beginPeriod(s);
  return s;
}

/** Reproduz um jogo a partir da semente, das equipas e das decisões do treinador. */
export function replayMatch(home: Team, away: Team, seed: number, controlled: [boolean, boolean], commands: readonly Command[], visitor: TeamIndex = 1, untilTick = Infinity): MatchState {
  const s = createMatch(home, away, seed, controlled, visitor);
  let next = 0;
  const maxTicks = Math.min(untilTick, seconds(B.periodSeconds) * 200);
  while (s.phase !== 'end' && s.tick < maxTicks) {
    while (next < commands.length && commands[next]!.tick === s.tick) applyCommand(s, commands[next++]!);
    step(s);
  }
  return s;
}

export function simulateMatch(home: Team, away: Team, seed: number, controlled: [boolean, boolean] = [false, false], visitor: TeamIndex = 1): MatchState {
  const s = createMatch(home, away, seed, controlled, visitor);
  // Limite de segurança: nunca deve ser atingido, mas uma equipa vinda de fora não pode bloquear o jogo.
  const maxTicks = seconds(B.periodSeconds) * 200;
  while (s.phase !== 'end' && s.tick < maxTicks) step(s);
  if (s.phase !== 'end') throw new Error(`O jogo com a semente ${seed} não terminou`);
  return s;
}
