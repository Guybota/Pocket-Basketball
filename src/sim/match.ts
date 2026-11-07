import { BALANCE as B } from './balance.ts';
import { COURT_HALF_WIDTH, COURT_LENGTH, distance, seconds } from './court.ts';
import { makeRng, next } from './rng.ts';
import { NEUTRAL_TACTICS, validateTeam, type Team } from './types.ts';
import { resolveShot, reach, pickRebounder, resolveRebound, resolvePass, updateBall } from './match-ball.ts';
import { applyCommand } from './match-commands.ts';
import { resolveContacts } from './match-contact.ts';
import { other, clamp01, emit, lowest } from './match-core.ts';
import { decide } from './match-decide.ts';
import { setupInbound, throwInbound, deadBall, grantTimeout, startJump, resolveJump, beginPeriod, endPeriod, updateFreeThrowTargets, stepFreeThrow, updateHuddle, settleBall } from './match-flow.ts';
import { updateTargets, updateLaneTime, movePlayers, updateFatigue } from './match-movement.ts';
import { placeBench, subsSettled } from './match-rotation.ts';
import type { TeamIndex, Phase, Body, TeamLine, PassFlight, ShotFlight, Command, MatchState } from './match-types.ts';

export type { TeamIndex, Phase, PlayerLine, Body, TeamLine, MatchEventType, MatchEvent, Command, Play, MatchState } from './match-types.ts';
export { toU, isSprinting } from './match-core.ts';
export { slotFit, bestSlot } from './match-rotation.ts';
export { pushPower, resolveContacts } from './match-contact.ts';
export { requestTimeout, holdMatch, resumeMatch, queueSubstitution, cancelSubstitution, reorderBench, setAutoRotation, setTactics } from './match-commands.ts';

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
        const onFloor = s.ball.z <= B.ballRestHeight + 0.01 && distance(loose.winner.x, loose.winner.y, s.ball.x, s.ball.y) > reach(loose.winner) * 2;
        const first = onFloor ? lowest([...s.court[0], ...s.court[1]].filter(b => b.stunnedUntil <= s.tick && distance(b.x, b.y, s.ball.x, s.ball.y) <= reach(b)), b => distance(b.x, b.y, s.ball.x, s.ball.y)) : undefined;
        if (first) loose.winner = first;
        if (first || distance(loose.winner.x, loose.winner.y, s.ball.x, s.ball.y) <= reach(loose.winner) || --s.timer <= -seconds(B.reboundMaxWaitSeconds)) resolveRebound(s);
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
    // Só a ficha de jogo se equipa: os primeiros da ordem do plantel; os reservas ficam de fora.
    teams[team].roster.slice(0, B.matchSquad).forEach((player, index) => {
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
    driveSide: 1,
    driveStart: 0,
    driveTurns: 0,
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
