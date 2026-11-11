/** Movimento e posicionamento: para onde cada um quer ir, os 3 segundos, os bloqueios e o cansaço. */
import { BALANCE as B } from './balance.ts';
import { COURT_HALF_WIDTH, ARC_SPOTS, COURT_LENGTH, CUT_SPOTS, ZONE_PLAN, zoneRegion, zoneRole, POST_WAIT_SPOTS, LANE_U, LANE_HALF_V, inLane, DT, LOW_POST_SPOTS, SPOTS, distance, hoopDistance, CRASH_SPOTS, seconds, segmentDistance, HOOP_U, CLEAR_SPOTS } from './court.ts';
import { between, chance, weightedIndex } from './rng.ts';
import { reboundRole } from './match-ball.ts';
import { pushPower } from './match-contact.ts';
import { other, clamp01, toU, fromU, maxSpeed, knockDown, lowest, pressureOn, nearestDefender, isSprinting, inFrontOf } from './match-core.ts';
import type { Body, MatchState } from './match-types.ts';

/** O defensor marcado bate no bloqueio posto: pode ficar atordoado, e quanto mais forte o bloqueador mais vezes cai. */
export function checkScreenHit(s: MatchState): void {
  const screen = s.screen;
  if (!screen || s.phase !== 'live') return;
  const { by, on } = screen;
  // O bloqueio direto só trava depois de posto: a caminho, o grande ainda está a correr.
  if (screen.handler && screen.x === undefined) return;
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

/** Para onde se corta: para o cesto; contra a zona, para os buracos dela, o poste alto ou o canto curto. */
export function cutTarget(s: MatchState, b: Body): readonly [number, number] {
  const side = b.y >= 0 ? 1 : -1;
  if (s.tactics[other(b.team)].defense === 'zone') return toU(s, b.team, b.x) > 4 ? [5, 0] : [1.5, side * 4.2];
  return [1.9, side * 0.9];
}

export function startCut(s: MatchState, b: Body, to: readonly [number, number]): void {
  b.cutTo = to;
  b.cutStage = 1;
  b.cutUntil = s.tick + seconds(B.cutSeconds);
  s.cutter = b;
  s.cutterUntil = b.cutUntil;
}

/** O sítio para onde o jogador quer ir, conforme o seu comportamento. */
export function attackSpot(b: Body): readonly [number, number] {
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
export function onBallSpot(b: Body): readonly [number, number] {
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

/** Joga-se de costas perto do cesto, com um defensor colado: quem gosta disso, ou quem é claramente mais forte. */
export function isPosting(s: MatchState, b: Body): boolean {
  if (s.phase !== 'live' || s.driving) return false;
  const dist = hoopDistance(toU(s, b.team, b.x), b.y);
  if (dist < B.postMinDistance || dist > B.postMaxDistance) return false;
  const defender = nearestDefender(s, b);
  if (distance(b.x, b.y, defender.x, defender.y) > B.postContactRange) return false;
  return b.player.onBall === 'postUp' || (s.play === 'postIso' && s.playFor === b) || pushPower(b) - pushPower(defender) >= B.postPowerEdge;
}

export function updateTargets(s: MatchState): void {
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
      // Dribla-se pelo ombro escolhido do defensor enquanto ele está à frente e perto; passado ele, direito ao aro.
      const defender = nearestDefender(s, b);
      const hoopX = fromU(s, offense, 1.9);
      if (inFrontOf(s, defender, b) && distance(b.x, b.y, defender.x, defender.y) < B.stanceRange) {
        b.targetX = defender.x + (hoopX > b.x ? 1 : -1);
        b.targetY = Math.max(-COURT_HALF_WIDTH + 0.5, Math.min(COURT_HALF_WIDTH - 0.5, defender.y + s.driveSide * B.driveSideGap));
      } else {
        b.targetX = hoopX;
        b.targetY = 0;
      }
    }
    // Pressão no campo de trás: com o defensor à frente e perto, dribla-se pelo ombro dele do lado do meio do campo, em vez de ir
    // contra ele e ficar encurralado na linha lateral.
    if (b === s.holder && !s.driving && s.phase === 'live' && toU(s, offense, b.x) > B.halfCourtPickUpU && pressureOn(s, b) >= B.pressBreakPressure) {
      const defender = nearestDefender(s, b);
      if (inFrontOf(s, defender, b) && distance(b.x, b.y, defender.x, defender.y) < B.stanceRange) {
        const middle = Math.abs(b.y) > 1 ? -Math.sign(b.y) : b.y >= defender.y ? 1 : -1;
        b.targetX = defender.x + fromU(s, offense, 0) - fromU(s, offense, 1);
        b.targetY = Math.max(-COURT_HALF_WIDTH + 0.5, Math.min(COURT_HALF_WIDTH - 0.5, defender.y + middle * B.driveSideGap));
      }
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
  // O bloqueio direto dura enquanto a bola estiver nas mãos de quem o recebeu; os outros recalculam-se a cada passo.
  if (s.screen && !(s.screen.handler && s.screen.handler === s.holder && s.phase === 'live' && !s.flight)) s.screen = null;
  if (s.holder && s.phase === 'live') {
    const h = s.holder;
    const hu = toU(s, offense, h.x);
    if (hu > B.halfCourtPickUpU && pressureOn(s, h) >= B.pressBreakPressure) {
      // Saída contra pressão: o colega mais perto vem para a frente do portador, do lado contrário ao defensor, dar linha de passe.
      const helper = lowest(s.court[offense].filter(b => b !== h), b => distance(b.x, b.y, h.x, h.y))!;
      const defender = nearestDefender(s, h);
      helper.targetX = fromU(s, offense, hu - B.pressHelpDistance);
      helper.targetY = Math.max(-COURT_HALF_WIDTH + 0.5, Math.min(COURT_HALF_WIDTH - 0.5, h.y + (defender.y > h.y ? -2.5 : 2.5)));
      // As saídas seguras: o mais perto a seguir fica atrás da bola, do lado do meio; o seguinte vem ao meio do campo, para
      // tirar a bola de uma armadilha na lateral.
      const rest = s.court[offense].filter(b => b !== h && b !== helper).sort((p, q) => distance(p.x, p.y, h.x, h.y) - distance(q.x, q.y, h.x, h.y));
      const [safety, pivot] = rest;
      if (safety) {
        safety.targetX = fromU(s, offense, Math.min(COURT_LENGTH - 1, hu + B.pressSafetyBehind));
        safety.targetY = h.y * 0.3;
      }
      if (pivot && hu > B.pressPivotU + 2) {
        pivot.targetX = fromU(s, offense, B.pressPivotU);
        pivot.targetY = 0;
      }
    } else if (hu <= B.screenStartU && !s.driving) {
      // Se a opção saiu numa troca a meio da posse, a jogada deixa de ser para ela.
      if (s.playFor && s.playFor.slot < 0) s.playFor = null;
      const pf = s.playFor;
      // O grande de serviço para os bloqueios: o mais alto que não seja quem tem a bola nem a opção.
      const biggest = (except: readonly Body[]): Body => lowest(s.court[offense].filter(b => !except.includes(b)), b => -b.player.height)!;
      const direct = (s.play === 'pickRoll' && (!pf || pf === h)) || (s.play === 'pickPop' && pf && pf !== h);
      if (direct && !s.screen && hu >= B.screenMinU && s.shotClock > seconds(B.screenWaitShotSeconds)) {
        // Bloqueio direto: o grande vem bloquear o defensor do portador. No pick-and-roll rola depois para o cesto; no
        // pick-and-pop abre para o arco.
        const big = s.play === 'pickPop' ? pf! : pf ? biggest([h]) : s.court[offense][h.slot === 3 ? 4 : 3]!;
        s.screen = { by: big, on: nearestDefender(s, h), handler: h, since: s.tick };
      }
      if (s.screen?.handler === h && !s.driving) {
        const sc = s.screen;
        const { by: big, on } = sc;
        if (sc.x === undefined || sc.y === undefined) {
          // A caminho, o sítio é onde fica quem defende o portador: entre ele e o cesto, e um pouco para o meio do campo.
          // Segue o portador até o grande lá chegar; o defensor bloqueado é o que estiver mais perto do portador nessa altura.
          const hoopX = fromU(s, offense, HOOP_U);
          const g = distance(h.x, h.y, hoopX, 0) || 1;
          const [fx, fy] = [(hoopX - h.x) / g, -h.y / g];
          let [px, py] = [-fy, fx];
          if (py * h.y > 0) [px, py] = [-px, -py];
          big.targetX = h.x + fx * B.screenAhead + px * B.screenSide;
          big.targetY = h.y + fy * B.screenAhead + py * B.screenSide;
          sc.on = nearestDefender(s, h);
          // Chegado, fica ali parado: é aí que o defensor bate.
          if (distance(big.x, big.y, big.targetX, big.targetY) < B.screenArriveRange) {
            sc.x = big.x;
            sc.y = big.y;
            sc.setAt = s.tick;
          }
        }
        if (sc.x !== undefined && sc.y !== undefined) {
          big.targetX = sc.x;
          big.targetY = sc.y;
        }
      } else if (hu > B.shootingRangeU) {
        // Os outros bloqueios só se montam ao alcance de lançamento.
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
  if (s.driving && s.screen?.handler === s.holder) {
    if (s.play === 'pickPop') {
      // Abre para o arco, do lado de onde está, à espera do passe para lançar.
      const [pu, pv] = ARC_SPOTS[1]!;
      s.screen.by.targetX = fromU(s, offense, pu);
      s.screen.by.targetY = pv * (s.screen.by.y >= 0 ? 1 : -1);
    } else {
      // Rola para o cesto pelo lado contrário ao da penetração, para não se cruzar com quem leva a bola.
      s.screen.by.targetX = fromU(s, offense, 2.2);
      s.screen.by.targetY = -s.driveSide * B.rollSide;
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
    const inbound = s.inbound;
    // Chegado ao sítio com a bola, quem repõe corre a linha de fundo, se puder (ver `setupInbound`).
    if (inbound.hasBall && inbound.runTo !== undefined && distance(inbound.passer.x, inbound.passer.y, inbound.x, inbound.y) < B.inboundSettleDistance) {
      inbound.y = inbound.runTo;
      inbound.runTo = undefined;
      inbound.settled = 0;
    }
    const { passer, x, y, receivers, hasBall } = inbound;
    passer.targetX = hasBall ? x : s.ball.x;
    passer.targetY = hasBall ? y : s.ball.y;
    for (const r of receivers) {
      // V-cut: enquanto quem repõe não tem a bola, o recetor afasta-se dela; depois vem recebê-la.
      const away = distance(r.x, r.y, x, y) || 1;
      const k = hasBall ? 0 : B.inboundVCutDistance / away;
      r.body.targetX = Math.max(0.5, Math.min(COURT_LENGTH - 0.5, r.x + (r.x - x) * k));
      r.body.targetY = Math.max(-COURT_HALF_WIDTH + 0.5, Math.min(COURT_HALF_WIDTH - 0.5, r.y + (r.y - y) * k));
    }
  }
  const focus = s.tactics[defense].focus ?? [];
  const attackers = s.teams[offense].roster;
  const defenseTactics = s.tactics[defense];
  const pickUp = defenseTactics.pressure >= 1 ? Infinity : defenseTactics.pressure >= 0 ? B.halfCourtPickUpU : B.defensePickUpU;
  const ballU = toU(s, offense, s.ball.x);
  const zone = defenseTactics.defense === 'zone' && ballU <= pickUp && s.phase !== 'dead';
  const ballHolder = s.holder ?? lowest(s.court[offense], b => distance(b.x, b.y, s.ball.x, s.ball.y))!;
  // Na zona, cada um guarda a sua área: a zona desliza em bloco conforme onde a bola está, e só um fecha sobre ela.
  const zonePlan = zone ? ZONE_PLAN[zoneRegion(toU(s, offense, ballHolder.x), ballHolder.y)] : null;
  const zoneSide: 1 | -1 = ballHolder.y >= 0 ? 1 : -1;
  // Defesa de transição: enquanto o adversário contra-ataca, os dois mais perto do próprio cesto protegem o garrafão,
  // o mais perto da bola trava-a, e os outros correm para a linha onde pegam.
  const transition = s.tick < s.breakUntil && (s.phase === 'live' || s.phase === 'pass');
  const ownHoopX = fromU(s, offense, HOOP_U);
  const protectors = transition ? [...s.court[defense]].sort((p, q) => distance(p.x, p.y, ownHoopX, 0) - distance(q.x, q.y, ownHoopX, 0)).slice(0, 2) : [];
  const stopper = transition ? lowest(s.court[defense].filter(d => !protectors.includes(d)), d => distance(d.x, d.y, ballHolder.x, ballHolder.y)) ?? null : null;
  // Ajuda ao drive, na defesa individual: com o portador já a passar o seu defensor, o defensor mais perto do corredor cujo
  // homem está longe do cesto larga-o e vem fechar; é esse que deixa alguém livre para o passe para fora.
  let helper: Body | null = null;
  if (!zone && !transition && s.driving && s.holder && s.phase === 'live') {
    const h = s.holder;
    const marker = nearestDefender(s, h);
    const hoopX = fromU(s, offense, HOOP_U);
    if (!inFrontOf(s, marker, h) || distance(h.x, h.y, marker.x, marker.y) > B.stanceRange) {
      const helpers = s.court[defense]
        .filter(d => d !== marker && d.stunnedUntil <= s.tick && hoopDistance(toU(s, offense, s.court[offense][d.slot]!.x), s.court[offense][d.slot]!.y) > B.helpManMinDistance);
      helper = lowest(helpers, d => segmentDistance(d.x, d.y, h.x, h.y, hoopX, 0)) ?? null;
    }
  }
  for (const b of s.court[defense]) {
    const man = s.court[offense][b.slot]!;
    const hoopX = fromU(s, offense, 1.575);
    if (b === helper) {
      const h = s.holder!;
      const d = distance(h.x, h.y, hoopX, 0) || 1;
      b.targetX = h.x + ((hoopX - h.x) / d) * B.helpGap;
      b.targetY = h.y + ((0 - h.y) / d) * B.helpGap;
      continue;
    }
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
export function laneCounts(s: MatchState): boolean {
  if (s.phase !== 'live' && s.phase !== 'pass') return false;
  const ballX = s.holder ? s.holder.x : s.ball.x;
  return toU(s, s.offense, ballX) <= COURT_LENGTH / 2;
}

/** Um defensor que marca alguém a um braço, ou o portador da bola, pode ficar na área. */
export function guardingInLane(s: MatchState, b: Body, holderGuard: Body | null): boolean {
  if (b === holderGuard) return true;
  return s.court[s.offense].some(a => distance(a.x, a.y, b.x, b.y) <= B.armLength);
}

/** Conta, a cada passo, há quanto tempo cada um está na área. Quem tem a bola e vai para o cesto não conta. */
export function updateLaneTime(s: MatchState): void {
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
export function laneExit(s: MatchState, x: number, y: number): [number, number] {
  const u = toU(s, s.offense, x);
  const front = LANE_U + B.laneExitMargin - u;
  const side = LANE_HALF_V + B.laneExitMargin - Math.abs(y);
  if (front < side) return [fromU(s, s.offense, LANE_U + B.laneExitMargin), y];
  return [x, (y < 0 ? -1 : 1) * (LANE_HALF_V + B.laneExitMargin)];
}

/** Os 3 segundos, sem apito: quem está na área há muito tempo sai dela, ou, se defende, cola-se a um atacante. */
export function applyLaneLimits(s: MatchState): void {
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
      const near = lowest(s.court[s.offense].filter(a => inLane(toU(s, s.offense, a.x), a.y)), a => distance(a.x, a.y, b.x, b.y));
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

export function isScreened(s: MatchState, b: Body): boolean {
  if (b.team === s.offense) return false;
  if (s.screen && s.screen.on === b && distance(s.screen.by.x, s.screen.by.y, b.x, b.y) < B.screenSetRange) return true;
  for (const a of s.court[s.offense]) {
    if (a.player.offBall === 'screener' && distance(a.x, a.y, b.x, b.y) < B.screenSlowRange) return true;
  }
  return false;
}

export function movePlayers(s: MatchState): void {
  checkScreenHit(s);
  for (const team of s.court) {
    for (const b of team) {
      const dx = b.targetX - b.x;
      const dy = b.targetY - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      b.stepX = 0;
      b.stepY = 0;
      if (dist < 0.01 || b.stunnedUntil > s.tick) continue;
      // Quem acabou de lançar está no ar: só volta a andar quando aterra. Quem afunda ou faz lay-up leva a bola e corre.
      const flight = s.flight;
      if (flight?.kind === 'shot' && flight.shooter === b && !flight.dunk && !flight.layup && flight.ticks < seconds(B.shotJumpSeconds)) continue;
      // Em posição de defesa, perto do seu homem, anda-se de lado, mais devagar; longe dele, corre-se.
      // Só quem defende o jogador com a bola fica em posição de defesa: o defensor mais perto dele.
      const man = b.team !== s.offense && s.phase === 'live' && s.holder && nearestDefender(s, s.holder) === b ? s.holder : undefined;
      // Só desliza devagar quem já está quase no sítio; quem ficou para trás corre para lá.
      // Atrás do seu homem não há posição de defesa: corre-se para voltar a ficar entre ele e o cesto.
      const stance = man !== undefined && inFrontOf(s, b, man) && distance(b.x, b.y, man.x, man.y) < B.stanceRange && dist < B.stanceChaseRange ? B.stanceSpeed : 1;
      // Quem leva a bola corre menos do que quem vai sem ela; a técnica reduz a perda, e a altura agrava-a (drible alto, mãos longe do chão).
      const dribbling = b === s.holder && s.phase === 'live' ? 1 - B.dribbleSpeedLoss * (1 - b.player.attributes.technique / 100) - B.dribbleHeightLoss * (b.player.height - 2) : 1;
      const slowed = stance * dribbling * (isScreened(s, b) ? B.screenSlowdown : 1) * (b.slowedUntil > s.tick ? B.bumpSlowdown : 1) * (b === s.posting ? B.postSpeedFactor : 1) * (s.phase === 'intro' ? B.introWalkFactor : 1);
      const dunking = s.flight?.kind === 'shot' && (s.flight.dunk || s.flight.layup) && !s.flight.blockedBy && s.flight.shooter === b;
      // O primeiro passo do drive é em explosão; o resto do drive, dos cortes e do contra-ataque é a sprintar.
      const firstStep = b === s.holder && s.driving && s.tick - s.driveStart < seconds(B.firstStepSeconds);
      // Quem já vai afundar ou fazer o lay-up chega ao aro mesmo que o tenham encostado pelo caminho.
      const stepLength = Math.min(dist, maxSpeed(b) * (dunking ? B.dunkBurst : slowed * (firstStep ? B.firstStepBurst : isSprinting(s, b) ? B.sprintFactor : 1)) * DT);
      b.stepX = (dx / dist) * stepLength;
      b.stepY = (dy / dist) * stepLength;
      b.x += b.stepX;
      b.y += b.stepY;
    }
  }
}

export function updateFatigue(s: MatchState): void {
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
