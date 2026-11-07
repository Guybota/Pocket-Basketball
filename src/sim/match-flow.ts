/** O fluxo do jogo: posses, reposições, bolas paradas, descontos, períodos, bola ao alto e lances livres. */
import { heightCmOf } from './teamgen.ts';
import { BALANCE as B } from './balance.ts';
import { COURT_HALF_WIDTH, COURT_LENGTH, DT, FREE_THROW_DEFENSE_SPOTS, FREE_THROW_OFFENSE_SPOTS, SPOTS, distance, seconds, huddleSpot } from './court.ts';
import { between, chance, weightedIndex } from './rng.ts';
import { freeThrowChance } from './shot.ts';
import { startRebound } from './match-ball.ts';
import { other, attackDirection, fromU, emit, lowest, nearestDefender } from './match-core.ts';
import { applyPendingSubs, rotate } from './match-rotation.ts';
import type { TeamIndex, Body, Play, MatchState } from './match-types.ts';

/** Um contra-ataque: dura uns segundos, mais com o ritmo rápido. */
export function startBreak(s: MatchState, team: TeamIndex): void {
  s.breakUntil = s.tick + seconds(B.breakSeconds * (1 + B.tacticPaceBreak * s.tactics[team].pace));
}

export function newPossession(s: MatchState, team: TeamIndex): void {
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
export function playFor(b: Body): Play {
  const p = b.player;
  const a = p.attributes;
  if (p.height >= B.bigHeight) return p.onBall === 'postUp' || a.shooting < B.popShooting ? 'postIso' : 'pickPop';
  if (p.onBall === 'playmaker') return 'pickRoll';
  if (p.onBall === 'shooter' || p.offBall === 'spotUp' || a.shooting >= Math.max(a.speed, a.technique)) return 'screens';
  return 'iso';
}

export function giveBall(s: MatchState, b: Body): void {
  s.holder = b;
  s.phase = 'live';
  s.flight = null;
  s.nextDecision = s.tick + seconds(between(s.rng, B.decisionMinSeconds, B.decisionMaxSeconds));
}

/** Prepara a reposição: depois de um cesto, da linha de fundo; nos outros casos, da lateral mais próxima da bola. */
export function setupInbound(s: MatchState, kind: 'baseline' | 'side'): void {
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
  const passer = lowest(team.filter(b => b.slot !== 0), b => distance(b.x, b.y, x, y))!;
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
export function throwInbound(s: MatchState): void {
  const { passer, receivers } = s.inbound!;
  const openness = (b: Body): number => distance(b.x, b.y, nearestDefender(s, b).x, nearestDefender(s, b).y);
  const target = lowest(receivers.map(r => r.body), b => -openness(b))!;
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

/** Bola parada. A reposição é feita pela equipa indicada, por quem fica fora de campo. */
/** A linha mais perto da bola: é daí que se repõe depois de uma falta ou de uma violação, como manda a regra. */
export function nearestLine(s: MatchState): 'baseline' | 'side' {
  return Math.min(s.ball.x, COURT_LENGTH - s.ball.x) < COURT_HALF_WIDTH - Math.abs(s.ball.y) ? 'baseline' : 'side';
}

export function deadBall(s: MatchState, inbounding: TeamIndex, keepsPossession: boolean, kind: 'baseline' | 'side' = nearestLine(s)): void {
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

/** Quanto dura uma paragem: com um treinador humano, o tempo de ele decidir (o botão Continuar acaba-a antes); só com IA, o mínimo. */
export function holdSeconds(s: MatchState, aiSeconds: number): number {
  return s.controlled.some(Boolean) ? B.coachPauseSeconds : aiSeconds;
}

export function grantTimeout(s: MatchState, team: TeamIndex): void {
  s.pendingTimeout[team] = false;
  s.timeoutsLeft[team]--;
  s.timeoutTeam = team;
  s.phase = 'timeout';
  s.timer = seconds(holdSeconds(s, B.timeoutSeconds));
  s.holder = null;
  s.flight = null;
  s.driving = false;
  for (const side of s.court) for (const b of side) b.fatigue = Math.max(0, b.fatigue - B.timeoutRecovery);
  emit(s, 'timeout', team);
  applyPendingSubs(s);
  rotate(s, 0);
  rotate(s, 1);
}

export function addRun(s: MatchState, team: TeamIndex, points: number): void {
  if (s.run.team === team) s.run.points += points;
  else s.run = { team, points };
}

export function placeForPeriod(s: MatchState): void {
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
export function jumpSpots(s: MatchState, team: TeamIndex, jumper: Body): Map<Body, [number, number]> {
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
export const bestJumper = (s: MatchState, team: TeamIndex): Body =>
  lowest(s.court[team], b => -jumpReach(b))!;

export const jumpReach = (b: Body): number => b.player.attributes.jumping + (heightCmOf(b.player) - B.referenceHeight) * B.jumpPerCm;

/** As equipas vão para o círculo: a entrar do banco, no início do jogo, ou de onde estavam na pausa, no prolongamento. */
export function placeForJump(s: MatchState, walkIn: boolean): void {
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

export function startJump(s: MatchState): void {
  s.phase = 'jump';
  s.timer = s.jump!.total;
  emit(s, 'tipOff', s.offense);
}

/** Ganha quem chega mais alto, com alguma sorte, e toca a bola para um colega. */
export function resolveJump(s: MatchState): void {
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

export function beginPeriod(s: MatchState): void {
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
  // Como na regra: todos os períodos, menos o primeiro, começam com reposição no prolongamento da linha de meio-campo, na
  // lateral oposta à mesa (os bancos estão no lado negativo). Nos períodos 2 e 4 quem repõe vai buscar a bola ao sítio.
  s.ball.x = COURT_LENGTH / 2;
  s.ball.y = COURT_HALF_WIDTH;
  s.ball.z = B.ballRestHeight;
  setupInbound(s, 'side');
  if (s.period === 3) {
    s.inbound!.passer.x = s.inbound!.x;
    s.inbound!.passer.y = s.inbound!.y;
    s.inbound!.hasBall = true;
  }
}

export function endPeriod(s: MatchState): void {
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
  s.timer = seconds(holdSeconds(s, B.periodBreakSeconds));
  for (const b of s.bodies) b.fatigue = Math.max(0, b.fatigue - B.periodBreakRecovery);
  rotate(s, 0);
  rotate(s, 1);
}

export function commitFoul(s: MatchState, fouler: Body): void {
  fouler.line.fouls++;
  s.lines[fouler.team].fouls++;
  s.teamFouls[fouler.team]++;
  emit(s, 'foul', fouler.team, { player: fouler.player.name });
}

export function startFreeThrows(s: MatchState, shooter: Body, count: number): void {
  s.freeThrow = { shooter, left: count };
  s.phase = 'freeThrow';
  s.loose = null;
  s.timer = seconds(B.freeThrowSetupSeconds + B.freeThrowSeconds);
  s.holder = null;
  s.flight = null;
}

/** No lance livre, o marcador vai para a linha e os outros alinham-se ao longo da área. */
export function updateFreeThrowTargets(s: MatchState): void {
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

export function stepFreeThrow(s: MatchState): void {
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

/** Durante o desconto, cada equipa junta-se à frente do seu banco. */
/** Nas paragens, cada equipa junta-se à frente do seu banco. Ao intervalo, sai para o balneário pelo canto do seu lado. */
export function updateHuddle(s: MatchState): void {
  const lockerRoom = s.phase === 'break' && s.period === 2;
  for (const team of [0, 1] as const) {
    s.court[team].forEach((b, i) => {
      if (lockerRoom) {
        // Pelo túnel do centro, em fila.
        b.targetX = (team === 0 ? 13.6 : 14.4) + (i % 2) * 0.2;
        b.targetY = -COURT_HALF_WIDTH - 3.8 - i * 0.5;
      } else {
        // Em roda à volta do treinador; os lugares que ficam de permeio são de suplentes, que a vista põe lá.
        const [hx, hy] = huddleSpot(team, [0, 2, 4, 6, 7][i]!);
        b.targetX = hx;
        b.targetY = hy;
      }
    });
  }
}

/** Com o jogo parado, a bola cai e fica no chão: nunca fica suspensa no ar. */
export function settleBall(s: MatchState): void {
  s.ball.z = Math.max(B.ballRestHeight, s.ball.z - B.ballFallSpeed * DT);
}
