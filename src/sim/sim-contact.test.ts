import type { Team } from './types.ts';
// Parte dos testes da simulação. Estão divididos em ficheiros para correrem em paralelo.
import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { attributeWinRate, betterTeamWinRate, bodyWinRate, fullBonusWinRate, movesWinRate, styleWinRate, summarize, type Summary } from './batch.ts';
import { ARC_SPOTS, COURT_HALF_WIDTH, COURT_LENGTH, CUT_SPOTS, LOW_POST_SPOTS, SPOTS, THREE_CORNER_MAX_U, THREE_CORNER_V, THREE_RADIUS, hoopDistance, isThree, segmentDistance, threeLineGap } from './court.ts';
import { cancelSubstitution, createMatch, pushPower, queueSubstitution, replayMatch, requestTimeout, resolveContacts, setAutoRotation, setTactics, simulateMatch, step, type Body, type MatchState } from './match.ts';
import { BALANCE as B } from './balance.ts';
import { makeRng, next, weightedIndex } from './rng.ts';
import { baseChance, freeThrowChance, shotChance } from './shot.ts';
import { DIVISIONS, generateLeagueTeam, generateTeam, teamRating, withBody, withBonus, withMoves, withStyles, withTactics } from './teamgen.ts';
import { ATTRIBUTE_KEYS, MOVES, OFF_BALL_STYLES, ON_BALL_STYLES, gradeOf, validateTeam, type Attributes, type MoveId, type OffBallStyle, type OnBallStyle, type Tactics, NEUTRAL_TACTICS, validateTactics } from './types.ts';

const home = generateTeam(1, 'Vilar BC', 55);
const away = generateTeam(2, 'Ribeirinha BC', 55);
const flat = (value: number): Attributes => ({
  shooting: value, speed: value, stamina: value, technique: value, strength: value, jumping: value, willpower: value,
});


describe('colisões e encontrões', () => {
  const pair = (strongerFirst: number, strongerSecond: number): { s: MatchState; a: Body; b: Body } => {
    const s = createMatch(home, away, 1);
    for (const body of [...s.court[0], ...s.court[1]]) {
      body.x = 14;
      body.y = 7;
      body.targetX = 14;
      body.targetY = 7;
    }
    // Só estes dois ficam perto um do outro: os outros vão para longe.
    [...s.court[0], ...s.court[1]].forEach((body, i) => {
      body.x = 2 + i * 2.5;
      body.y = -6;
    });
    const a = s.court[0][0]!;
    const b = s.court[1][0]!;
    a.player = { ...a.player, attributes: { ...a.player.attributes, strength: strongerFirst }, heightCm: 195 };
    b.player = { ...b.player, attributes: { ...b.player.attributes, strength: strongerSecond }, heightCm: 195 };
    a.radius = 0.41;
    b.radius = 0.41;
    a.fatigue = 0;
    b.fatigue = 0;
    a.x = 14;
    a.y = 0;
    a.targetX = 14;
    a.targetY = 0;
    b.x = 14.2;
    b.y = 0;
    b.targetX = 14.2;
    b.targetY = 0;
    return { s, a, b };
  };

  it('dois jogadores sobrepostos ficam afastados', () => {
    const { s, a, b } = pair(50, 50);
    resolveContacts(s);
    expect(Math.abs(b.x - a.x)).toBeGreaterThan(0.75);
  });

  it('o mais forte cede bem menos terreno', () => {
    const { s, a, b } = pair(90, 40);
    resolveContacts(s);
    expect(Math.abs(a.x - 14)).toBeLessThan(Math.abs(b.x - 14.2) / 2);
  });

  it('o físico e a altura contam para empurrar, e o cansaço tira força', () => {
    const { a } = pair(60, 60);
    const base = pushPower(a);
    a.player = { ...a.player, heightCm: 210 };
    expect(pushPower(a)).toBeGreaterThan(base);
    a.player = { ...a.player, heightCm: 195 };
    a.fatigue = 1;
    expect(pushPower(a)).toBeLessThan(base);
  });

  it('quanto mais forte o adversário, mais vezes se vai ao chão, e toda a gente se levanta', () => {
    const withStrength = (team: Team, strength: number): Team => ({ ...team, roster: team.roster.map(p => ({ ...p, attributes: { ...p.attributes, strength } })) });
    const falls = (strength: number): number => {
      let total = 0;
      for (let i = 0; i < 40; i++) {
        const a = withStrength(generateTeam(i, 'A', 60), strength);
        const b = withStrength(generateTeam(i + 500, 'B', 60), 50);
        const s = simulateMatch(a, b, i + 1);
        total += s.events.filter(e => e.type === 'knockdown' && e.team === 1).length;
        for (const body of s.bodies) expect(body.fallenUntil).toBeLessThanOrEqual(s.tick + 40);
      }
      return total;
    };
    const weak = falls(30);
    expect(weak).toBeGreaterThan(0);
    expect(falls(95)).toBeGreaterThan(weak * 1.5);
  });

  it('em jogo, quase nunca há dois jogadores sobrepostos', () => {
    let samples = 0;
    let overlapped = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = createMatch(home, away, seed);
      while (s.phase !== 'end') {
        step(s);
        if (s.phase !== 'live' && s.phase !== 'rebound') continue;
        samples++;
        const bodies = [...s.court[0], ...s.court[1]];
        let close = false;
        for (let i = 0; i < bodies.length && !close; i++) {
          for (let j = i + 1; j < bodies.length && !close; j++) {
            const dx = bodies[i]!.x - bodies[j]!.x;
            const dy = bodies[i]!.y - bodies[j]!.y;
            close = dx * dx + dy * dy < 0.6 * 0.6;
          }
        }
        if (close) overlapped++;
      }
    }
    expect(samples).toBeGreaterThan(10000);
    expect(overlapped / samples).toBeLessThan(0.01);
  });

  const bumps = (seed: number, a = home, b = away): MatchState => simulateMatch(a, b, seed);

  it('há encontrões, e o mais forte ganha a maior parte', () => {
    let won = 0;
    let lost = 0;
    let visible = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const rival = generateTeam(seed + 500, 'B', 55);
      for (const e of bumps(seed, generateTeam(seed, 'A', 55), rival).events) {
        // Os outros só abrandam um pouco: estes são os que se veem ou vão para o relato.
        if (e.type === 'bump' && (e.hard || e.bump !== 'run')) visible++;
      }
      for (const e of bumps(seed, withBonus(generateTeam(seed, 'A', 55), ['strength'], 25), rival).events) {
        if (e.type !== 'bump') continue;
        if (e.team === 0) won++;
        else lost++;
      }
    }
    expect(visible / 60).toBeGreaterThan(8);
    expect(visible / 60).toBeLessThan(60);
    expect(won / (won + lost)).toBeGreaterThan(0.6);
  });

  it('jogadores mais fortes ganham posição e mais ressaltos', () => {
    let strongRebounds = 0;
    let baseRebounds = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const team = generateTeam(seed, 'A', 55);
      const rival = generateTeam(seed + 500, 'B', 55);
      const strong = simulateMatch(withBonus(team, ['strength'], 25), rival, seed);
      const base = simulateMatch(team, rival, seed);
      strongRebounds += strong.lines[0].offensiveRebounds + strong.lines[0].defensiveRebounds;
      baseRebounds += base.lines[0].offensiveRebounds + base.lines[0].defensiveRebounds;
    }
    // Com mais penetrações e saídas rápidas, a margem de físico nos ressaltos encolheu um pouco; continua a contar.
    expect(strongRebounds).toBeGreaterThan(baseRebounds * 1.03);
  });

  it('jogar de costas: quem é forte ganha terreno, e quem é fraco é aguentado', () => {
    const count = (attacker: number, defender: number): { gained: number; held: number } => {
      let gained = 0;
      let held = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const a = withBonus(withStyles(generateTeam(seed, 'A', 55), { onBall: 'postUp' }), ['strength'], attacker);
        const b = withBonus(generateTeam(seed + 500, 'B', 55), ['strength'], defender);
        for (const e of simulateMatch(a, b, seed).events) {
          if (e.type === 'bump' && e.bump === 'post' && e.team === 0 && e.offensive) gained++;
          if (e.type === 'bump' && e.bump === 'post' && e.team === 1 && e.offensive === false) held++;
        }
      }
      return { gained, held };
    };
    const strong = count(25, 0);
    const weak = count(0, 25);
    expect(strong.gained).toBeGreaterThan(20);
    expect(strong.gained / (strong.gained + strong.held)).toBeGreaterThan(weak.gained / (weak.gained + weak.held) + 0.2);
  });

  it('continua determinista: a mesma semente dá o mesmo jogo', () => {
    expect(simulateMatch(home, away, 9).events).toEqual(simulateMatch(home, away, 9).events);
  });
});

describe('início do jogo', () => {
  it('as equipas entram em campo e o relógio só anda depois da bola ao alto', () => {
    const s = createMatch(home, away, 3);
    expect(s.phase).toBe('intro');
    const clock = s.clock;
    expect(s.court[0].every(b => Math.abs(b.y) > COURT_HALF_WIDTH)).toBe(true);
    while (s.phase === 'intro') {
      step(s);
      expect(s.clock).toBe(clock);
    }
    expect(s.phase).toBe('jump');
    expect(s.events.some(e => e.type === 'tipOff')).toBe(true);
    expect(s.court[0].every(b => Math.abs(b.y) <= COURT_HALF_WIDTH)).toBe(true);
    expect(s.jump!.a.team).toBe(0);
    expect(s.jump!.b.team).toBe(1);
    while (s.phase === 'jump') {
      step(s);
      expect(s.clock).toBe(clock);
    }
    const jump = s.events.find(e => e.type === 'jumpBall')!;
    expect(s.offense).toBe(jump.team);
    expect(s.phase).toBe('pass');
    expect(s.lines[jump.team].possessions).toBe(1);
    expect(s.lines[jump.team === 0 ? 1 : 0].possessions).toBe(0);
  });

  it('a entrada não demora demasiado', () => {
    const s = createMatch(home, away, 4);
    while (s.phase === 'intro') step(s);
    expect(s.tick).toBeLessThan(20 * 6);
  });

  it('salta o mais alto de cada equipa, e quem salta mais ganha mais vezes', () => {
    let wins = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const strong = withBonus(generateTeam(seed, 'A', 55), ['jumping'], 25);
      const s = createMatch(strong, generateTeam(seed + 500, 'B', 55), seed);
      const reach = (b: Body): number => b.player.attributes.jumping + (b.player.heightCm - 195) * 0.6;
      expect(reach(s.jump!.a)).toBe(Math.max(...s.court[0].map(reach)));
      while (!s.events.some(e => e.type === 'jumpBall')) step(s);
      if (s.events.find(e => e.type === 'jumpBall')!.team === 0) wins++;
    }
    expect(wins / 200).toBeGreaterThan(0.6);
    // Saltar melhor ajuda, mas o pior também ganha muitas vezes.
    expect(wins / 200).toBeLessThan(0.8);
  });

  it('nos outros períodos há reposição, com a posse alternada', () => {
    const s = createMatch(home, away, 5);
    const first = (): number => {
      while (!s.events.some(e => e.type === 'jumpBall')) step(s);
      return s.events.find(e => e.type === 'jumpBall')!.team;
    };
    const winner = first();
    while (s.period < 2) step(s);
    expect(s.phase).toBe('dead');
    expect(s.offense).not.toBe(winner);
    expect(s.inbound).not.toBeNull();
    while (s.period < 3) step(s);
    expect(s.offense).toBe(winner);
    expect(s.phase).toBe('dead');
  });

  it('o prolongamento começa com bola ao alto', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const s = simulateMatch(home, away, seed);
      if (s.period <= 4) continue;
      expect(s.events.filter(e => e.type === 'jumpBall').length).toBeGreaterThanOrEqual(2);
      return;
    }
    throw new Error('nenhum jogo foi a prolongamento');
  });
});

describe('reposições', () => {
  /** Corre um jogo e devolve cada reposição, tal como aconteceu. */
  const inbounds = (matches: number, a = home, b = away): { passerOutside: boolean; settled: boolean; receivers: number; receiverIsPasser: boolean; baseline: boolean }[] => {
    const found: { passerOutside: boolean; settled: boolean; receivers: number; receiverIsPasser: boolean; baseline: boolean }[] = [];
    for (let seed = 1; seed <= matches; seed++) {
      const s = createMatch(a, b, seed);
      let last: MatchState['inbound'] = null;
      while (s.phase !== 'end') {
        step(s);
        if (s.inbound) last = s.inbound;
        if (!s.inbound && last) {
          const f = s.flight;
          if (f?.kind === 'pass' && f.restart) {
            const { passer } = last;
            // Bem fora da linha, e não em cima dela.
            const outside = passer.x < -0.3 || passer.x > COURT_LENGTH + 0.3 || Math.abs(passer.y) > COURT_HALF_WIDTH + 0.3;
            found.push({ passerOutside: outside, settled: last.settled >= Math.round(B.inboundSettleSeconds * 20), receivers: last.receivers.length, receiverIsPasser: f.target === passer, baseline: passer.x < 0 || passer.x > COURT_LENGTH });
          }
          last = null;
        }
      }
    }
    return found;
  };

  it('quem repõe fica fora de campo, assenta os pés e passa a outro', () => {
    const all = inbounds(20);
    expect(all.length).toBeGreaterThan(300);
    expect(all.every(i => !i.receiverIsPasser)).toBe(true);
    expect(all.filter(i => i.passerOutside).length / all.length).toBeGreaterThan(0.97);
    expect(all.filter(i => i.settled).length / all.length).toBeGreaterThan(0.97);
    expect(all.some(i => i.baseline)).toBe(true);
    expect(all.some(i => !i.baseline)).toBe(true);
  });

  it('às vezes vêm dois receber, e contra pressão vêm sempre dois', () => {
    const normal = inbounds(10);
    const two = normal.filter(i => i.receivers === 2).length / normal.length;
    expect(two).toBeGreaterThan(0.2);
    expect(two).toBeLessThan(0.6);
    const pressed = inbounds(10, home, withTactics(away, { pressure: 1, spacing: 0, pace: 0 }));
    // A equipa que pressiona também repõe, mas contra quem não pressiona.
    expect(pressed.filter(i => i.receivers === 2).length / pressed.length).toBeGreaterThan(two);
  });

  it('um passe de reposição nunca conta como assistência', () => {
    const s = createMatch(home, away, 11);
    while (s.phase !== 'end') {
      step(s);
      if (s.flight?.kind === 'pass' && s.flight.restart) {
        const passer = s.flight.passer;
        while (s.flight?.kind === 'pass' && s.phase === 'pass') step(s);
        expect(s.lastPasser).not.toBe(passer);
      }
    }
  });
});

describe('papéis no ressalto', () => {
  const crowd = (matches: number): { near: number; samples: number; base: number; rebounds: Record<string, number> } => {
    let near = 0;
    let samples = 0;
    let base = 0;
    for (let seed = 1; seed <= matches; seed++) {
      const s = createMatch(home, away, seed);
      while (s.phase !== 'end') {
        step(s);
        if (s.phase !== 'rebound' || !s.loose || s.timer > 2) continue;
        const { toX, toY } = s.loose;
        samples++;
        for (const b of [...s.court[0], ...s.court[1]]) {
          if (Math.sqrt((b.x - toX) * (b.x - toX) + (b.y - toY) * (b.y - toY)) < 2.5) {
            near++;
            if (b.team === s.offense && b.slot === 0) base++;
          }
        }
      }
    }
    return { near, samples, base, rebounds: {} };
  };

  it('nem toda a gente vai ao ressalto', () => {
    const { near, samples, base } = crowd(30);
    expect(samples).toBeGreaterThan(500);
    expect(near / samples).toBeLessThan(5.5);
    // O base do ataque recua quase sempre.
    expect(base / samples).toBeLessThan(0.2);
  });

  it('quem gosta de ir ao ressalto ganha mais do que quem espera lá fora', () => {
    let crashers = 0;
    let waiters = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const team = generateTeam(seed, 'A', 55);
      const rival = generateTeam(seed + 500, 'B', 55);
      crashers += simulateMatch(withStyles(team, { offBall: 'crasher' }), rival, seed).lines[0].offensiveRebounds;
      waiters += simulateMatch(withStyles(team, { offBall: 'spotUp' }), rival, seed).lines[0].offensiveRebounds;
    }
    expect(crashers).toBeGreaterThan(waiters * 1.2);
  });

  it('sem pressão, a defesa espera o ataque perto do meio-campo', () => {
    const backcourt = (pressure: number): number => {
      let total = 0;
      for (let seed = 1; seed <= 10; seed++) {
        const s = createMatch(withTactics(home, { pressure, spacing: 0, pace: 0 }), withTactics(away, { pressure, spacing: 0, pace: 0 }), seed);
        while (s.phase !== 'end') {
          step(s);
          if (s.phase !== 'live') continue;
          const defense = s.offense === 0 ? 1 : 0;
          for (const b of s.court[defense]) {
            // Atrás do meio-campo do ataque, a defender longe do próprio cesto.
            const hoop = s.offense === 0 ? (s.period >= 3 ? 0 : 28) : (s.period >= 3 ? 28 : 0);
            if (Math.abs(b.x - hoop) > 14.5) total++;
          }
        }
      }
      return total;
    };
    expect(backcourt(0)).toBeLessThan(backcourt(1) * 0.8);
  });
});
