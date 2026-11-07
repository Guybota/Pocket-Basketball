/** A bola: voos dos lançamentos e dos passes, ressaltos e bolas perdidas. */
import { heightCmOf } from './teamgen.ts';
import { BALANCE as B } from './balance.ts';
import { COURT_HALF_WIDTH, COURT_LENGTH, DT, distance, seconds, HOOP_U } from './court.ts';
import { between, chance, weightedIndex } from './rng.ts';
import { other, toU, fromU, emit, knockDown, nearestDefender } from './match-core.ts';
import { shoot } from './match-decide.ts';
import { startBreak, newPossession, giveBall, deadBall, addRun, commitFoul, startFreeThrows } from './match-flow.ts';
import { cutTarget, startCut } from './match-movement.ts';
import type { Body, PassFlight, ShotFlight, MatchState } from './match-types.ts';

/** Uma bola perdida rola até à linha mais perto, à vista de todos; só depois é que a reposição começa. */
export function loseBallOut(s: MatchState, lostBy: Body): void {
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

export function resolveShot(s: MatchState, f: ShotFlight): void {
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

export function startRebound(s: MatchState, blocked = false): void {
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
/** Até onde um jogador chega à bola: os braços de um alto apanham-na mais longe. */
export const reach = (b: Body): number => B.reboundCatchDistance + Math.max(0, heightCmOf(b.player) - B.referenceHeight) * B.reachPerCm;

export function pickRebounder(s: MatchState): Body {
  const { toX, toY, chasers: candidates } = s.loose!;
  const weights = candidates.map(b => {
    const a = b.player.attributes;
    const dist = distance(b.x, b.y, toX, toY);
    const size = (heightCmOf(b.player) - B.referenceHeight) * B.reboundPerCm;
    const skill = Math.max(0.1, 0.25 + (a.jumping * 0.5 + a.strength * 0.5) / 100 + size);
    const closeness = 1 / (1 + dist);
    const eager = b.team === s.offense && b.player.offBall === 'crasher' ? 1 + B.crasherReboundBonus : 1;
    return skill * closeness * eager * (b.team === s.offense ? 1 : B.reboundDefenseBonus);
  });
  return candidates[weightedIndex(s.rng, weights)]!;
}

export function resolveRebound(s: MatchState): void {
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

export function resolvePass(s: MatchState, f: PassFlight): void {
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

/** O que cada atacante faz quando a bola sai para o cesto. */
export function reboundRole(b: Body): 'crash' | 'back' | 'stay' {
  const style = b.player.offBall;
  if (style === 'crasher' || style === 'lowPost') return 'crash';
  if (style === 'leaker' || b.slot === 0) return 'back';
  if (style === 'spotUp') return 'stay';
  return b.slot >= 3 ? 'crash' : 'stay';
}

export function placeShotBall(s: MatchState, f: ShotFlight, t: number): void {
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

export function updateBall(s: MatchState): void {
  const f = s.flight;
  if (f) {
    // A contagem sobe depois disto: assim a última posição é mesmo a do fim da trajetória.
    const t = (f.ticks + 1) / f.total;
    if (f.kind === 'pass') {
      s.ball.x = f.fromX + ((f.cutX ?? f.target.x) - f.fromX) * t;
      s.ball.y = f.fromY + ((f.cutY ?? f.target.y) - f.fromY) * t;
      if (f.fromZ !== null) s.ball.z = f.fromZ + (1.3 - f.fromZ) * t;
      else if (f.lob) s.ball.z = 1.5 + 1.7 * t + 2.5 * t * (1 - t);
      else {
        // O arco é o do passe inteiro: cortado a meio, a bola chega alta ao intercetador, que tem de saltar.
        const u = t * (f.cut ?? 1);
        s.ball.z = 1.3 + (f.arc ?? 0) * 4 * u * (1 - u);
      }
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
