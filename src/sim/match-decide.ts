/** As decisões de quem tem a bola: lançar, passar, penetrar, e os movimentos especiais que as acompanham. */
import { heightCmOf } from './teamgen.ts';
import { BALANCE as B } from './balance.ts';
import { COURT_HALF_WIDTH, COURT_LENGTH, distance, hoopDistance, isThree, threeLineGap, seconds, segmentDistance, HOOP_U } from './court.ts';
import { between, chance, weightedIndex } from './rng.ts';
import { shotChance } from './shot.ts';
import { loseBallOut } from './match-ball.ts';
import { pushPower } from './match-contact.ts';
import { other, clamp01, toU, fromU, emit, hasMove, knockDown, emitMove, hasOpenLane, lowest, pressureOn, nearestDefender, inFrontOf } from './match-core.ts';
import { startBreak, newPossession, giveBall, deadBall, commitFoul, startFreeThrows } from './match-flow.ts';
import type { Body, MatchState } from './match-types.ts';

export function shotOdds(s: MatchState, b: Body, pressure: number, extraBonus = 0): { chance: number; points: 2 | 3; distance: number } {
  const u = toU(s, b.team, b.x);
  const three = isThree(u, b.y);
  const dist = hoopDistance(u, b.y);
  const physical = dist <= B.midDistance
    ? (heightCmOf(b.player) - B.referenceHeight) * B.finishPerCm
    : 0;
  const focus = s.tactics[other(b.team)].focus ?? [];
  const marked = focus.length === 0 ? 0 : focus.includes(s.teams[b.team].roster.indexOf(b.player)) ? -B.focusShotPenalty : B.unfocusedShotBonus;
  const own = s.tactics[b.team];
  const tactic = (dist <= B.midDistance ? B.tacticInsideFinish * Math.max(0, -own.spacing) : 0)
    + (s.tick < s.breakUntil ? B.tacticPaceBreakFinish * Math.max(0, own.pace) : 0);
  const probability = shotChance(b.player.attributes, {
    bonus: physical + extraBonus + marked + tactic,
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

/** Por que ombro do defensor se ataca: do lado do bloqueador, se o há; senão, pelo lado com mais espaço — sem ajuda no corredor
 * até ao cesto, sem ficar encostado à linha e ao contrário de para onde o defensor já está inclinado. Com pouca técnica lê-se mal. */
export function driveSide(s: MatchState, h: Body): 1 | -1 {
  const defender = nearestDefender(s, h);
  if (s.screen && s.screen.on === defender) return s.screen.by.y >= h.y ? 1 : -1;
  const hoopX = fromU(s, h.team, HOOP_U);
  const score = (side: 1 | -1): number => {
    const py = defender.y + side * B.driveSideGap;
    let crowd = 0;
    for (const d of s.court[other(h.team)]) if (d !== defender && d.stunnedUntil <= s.tick && segmentDistance(d.x, d.y, defender.x, py, hoopX, 0) < B.openLaneWidth) crowd++;
    const wall = Math.abs(py) > COURT_HALF_WIDTH - 1 ? 2 : 0;
    return -crowd * 2 - wall - (defender.y - h.y) * side;
  };
  const left = score(-1);
  const right = score(1);
  // Em igualdade vai-se pelo meio.
  let side: 1 | -1 = right > left ? 1 : left > right ? -1 : h.y >= 0 ? -1 : 1;
  if (chance(s.rng, (1 - h.player.attributes.technique / 100) * B.driveMisreadChance)) side = side === 1 ? -1 : 1;
  return side;
}

export function startDrive(s: MatchState, h: Body): void {
  s.driving = true;
  s.driveSide = driveSide(s, h);
  s.driveStart = s.tick;
  s.driveTurns = 0;
}

/** O crossover deixa o defensor parado por um instante e abre o caminho para o cesto. */
export function tryCrossover(s: MatchState, h: Body, defender: Body, pressure: number): void {
  if (!hasMove(h, 'crossover') || pressure < B.crossoverMinPressure || !chance(s.rng, B.crossoverChance)) return;
  defender.stunKind = 'ankle';
  defender.stunnedUntil = s.tick + seconds(B.crossoverStunSeconds);
  if (chance(s.rng, B.ankleFallBase + (h.player.attributes.technique - 50) * B.ankleFallPerTechnique)) knockDown(s, defender, h.x - defender.x, true);
  emitMove(s, h, 'crossover');
}

/** Quanto mais uma opção de ataque é procurada: 1 para quem não é. */
export function optionFactor(s: MatchState, b: Body): number {
  const options = s.tactics[b.team].options ?? [];
  return options[0] === b.player.name ? B.firstOptionFactor : options[1] === b.player.name ? B.secondOptionFactor : 1;
}

/** Recua para criar espaço, se tiver o movimento e o defensor estiver em cima. */
export function tryStepBack(s: MatchState, shooter: Body): void {
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

export function shoot(s: MatchState, shooter: Body, lob = false): void {
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

export function pass(s: MatchState, passer: Body, target: Body, lob = false): void {
  const dist = distance(passer.x, passer.y, target.x, target.y);
  const a = passer.player.attributes;
  let interceptedBy: Body | null = null;
  let cut = 1;
  // Um passe alto passa por cima dos defensores.
  for (const d of lob ? [] : s.court[other(passer.team)]) {
    if (segmentDistance(d.x, d.y, passer.x, passer.y, target.x, target.y) > B.interceptDistance) continue;
    const edge = d.player.attributes.speed + d.player.attributes.technique - a.technique * 2;
    if (chance(s.rng, Math.max(0.005, B.interceptBase + B.interceptSlope * edge) * (d.player.offBall === 'dynamo' ? B.dynamoSteal : 1) * (1 + B.tacticPressureIntercept * s.tactics[d.team].pressure))) {
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
    arc: lob ? 0 : Math.max(0, dist - B.passArcFromMeters) * B.passArcPerMeter,
    cut,
    bad: !lob && !interceptedBy && chance(s.rng, badChance),
    lob,
    restart: false,
    fromZ: null,
  };
  s.holder = null;
  s.phase = 'pass';
  s.driving = false;
}

export function decide(s: MatchState): void {
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
      if (!s.driving) startDrive(s, h);
      s.nextDecision = s.tick + seconds(B.openLaneCheckSeconds);
    }
    return;
  }
  // A meio do drive, com o defensor outra vez à frente e em cima, muda-se de direção uma vez: ataca-se o outro ombro.
  if (s.driving && s.driveTurns < 1 && s.tick - s.driveStart >= seconds(B.driveTurnSeconds)) {
    const defender = nearestDefender(s, h);
    if (inFrontOf(s, defender, h) && distance(h.x, h.y, defender.x, defender.y) < B.stanceRange) {
      s.driveSide = s.driveSide === 1 ? -1 : 1;
      s.driveStart = s.tick;
      s.driveTurns++;
      tryCrossover(s, h, defender, pressure);
      s.nextDecision = s.tick + seconds(B.openLaneCheckSeconds);
      return;
    }
  }
  // Com a bola na área há quase 3 segundos, já não se segura: lança-se ou passa-se para quem tiver o melhor lance.
  if (h.laneTicks >= seconds(B.laneDecideSeconds)) {
    const own = shotOdds(s, h, pressure);
    const mates = s.court[h.team].filter(b => b !== h).map(b => {
      const o = shotOdds(s, b, pressureOn(s, b));
      return { b, value: o.chance * o.points };
    });
    const best = lowest(mates, m => -m.value)!;
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
  // Conta o que acabar primeiro, a posse ou o período: no fim do período lança-se antes do apito, mesmo de longe.
  const shotSeconds = Math.min(s.shotClock, s.clock) / seconds(1);

  // No bloqueio direto, quem tem a bola espera, a driblar, que o grande chegue ao sítio; nunca mais do que um bocado.
  const sc = s.screen;
  if (sc?.handler === h && sc.x === undefined && !s.driving && shotSeconds > B.screenWaitShotSeconds && s.tick - sc.since! < seconds(B.screenWaitSeconds)) return;

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
      const target = lowest(ahead, b => -openness(b));
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
  // A ajuda fechou o corredor do drive: quem ela deixou está livre e recebe a bola.
  if (s.driving && dist > B.openLaneFinish) {
    const open = lowest(teammates.map((b, i) => ({ b, value: passValues[i]!, free: freeMates[i]! })).filter(m => m.free), m => -m.value);
    if (open && chance(s.rng, B.driveKickChance)) {
      pass(s, h, open.b);
      return;
    }
  }
  if (h.slot === 0 || h.player.onBall === 'playmaker') {
    const open = lowest(teammates.map((b, i) => ({ b, value: passValues[i]!, free: freeMates[i]! })).filter(m => m.free && m.value >= shootValue * B.guardOpenPassValue), m => -m.value);
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
    weights[3 + i]! *= optionFactor(s, b) * (s.playFor === b ? B.playPassFactor : 1) * (creator && better ? B.creatorPassFactor : 1) * (rolling ? B.rollPassFactor : 1) * (free ? B.openTeammatePass : 1);
  });
  const choice = weightedIndex(s.rng, weights);
  if (choice === 0) shoot(s, h);
  else if (choice === 2) {
    startDrive(s, h);
    tryCrossover(s, h, defender, pressure);
  }
  else if (choice >= 3) pass(s, h, teammates[choice - 3]!);
}

/** Quanto a pressão diminui para quem ganhou o encosto: um defensor mais fraco não consegue contestar bem. */
export function postRelief(s: MatchState, b: Body): number {
  const edge = (pushPower(b) - pushPower(nearestDefender(s, b))) / B.postPowerScale;
  return 1 - B.postPressureRelief * clamp01(edge);
}
