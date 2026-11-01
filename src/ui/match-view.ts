import type { ClubKit } from './art/kit.ts';
import { createMatch, step, type Body, type MatchEvent, type MatchState, type TeamIndex } from '../sim/match.ts';
import type { MoveId, Team } from '../sim/types.ts';
import { MOVE_INFO } from './narrate.ts';
import { Camera, courtTextures, drawBox, drawHoopBack, drawHoopFront, type CourtTextures } from './art/court.ts';
import { text, textWidth } from './art/font.ts';
import {
  drawBall,
  drawCarrierArrow,
  drawReflection,
  drawShadow,
  drawSprite,
  lookOf,
  spriteHeight,
  type Look,
  type PoseName,
} from './art/sprites.ts';

const HOOP_LEFT = 1.575;
const HOOP_RIGHT = 26.425;
const RUN_FRAMES: readonly PoseName[] = ['run0', 'run1', 'run2', 'run1'];
const DRIBBLE_RUN_FRAMES: readonly PoseName[] = ['dribRun0', 'dribRun1', 'dribRun2', 'dribRun3'];
const DUNK_MAX_DISTANCE = 1.7;
const DUNK_MIN_JUMPING = 45;
// A letra do jogo só tem maiúsculas sem acentos.
const MOVE_LABELS: Record<MoveId, string> = { crossover: 'CROSSOVER', stepBack: 'STEP-BACK', alleyOop: 'ALLEY-OOP', powerDunk: 'AFUNDANCO', pickpocket: 'MAO RAPIDA' };
const STEP_BACK_TICKS = 5;
const RUN_BANNERS = [8, 12, 16];
const BENCH_Y = -8.5;
const COACH_Y = -7.9;
const SWISH_TICKS = 10;
const TRAIL_LENGTH = 6;
const HOOP_FRONT_OFFSET = 0.5;
const BALL_IN_HOOP_RANGE = 0.7;
// Uma mudança de direção só se faz passado este tempo, para o boneco não tremer entre frente e costas.
const TURN_LOCK_TICKS = 12;
const IDLE_TURN_MARGIN = 24;
// Bola ao alto: de início fletem as pernas, e o pico do salto coincide com o toque na bola.
const TIP_RISE = 0.45;
const TIP_HEIGHT = 16;
const REFEREE_STEP = 0.26;
const REFEREE_SIGNAL_TICKS = 22;

interface Point {
  x: number;
  y: number;
}
/** Direção estável de um jogador: um movimento médio, e não o de um único instante. */
interface Motion {
  vx: number;
  vy: number;
  speed: number;
  moving: boolean;
  back: boolean;
  flip: boolean;
  backLock: number;
  flipLock: number;
  lastBackChange: number;
}
interface Floater {
  label: string;
  x: number;
  y: number;
  z: number;
  born: number;
}

export type Sound = 'swish' | 'rim' | 'whistle' | 'buzzer' | 'shotClockBuzzer' | 'horn' | 'bounce' | 'steal' | 'block' | 'cheer' | 'bigCheer' | 'card' | 'bump';

export interface ViewCallbacks {
  announce(message: string): void;
  sound(name: Sound): void;
  event(e: MatchEvent): void;
}

/** Liga a simulação ao ecrã. A simulação não sabe que esta classe existe. */
export class MatchView {
  readonly s: MatchState;
  readonly periodScores: [number[], number[]] = [[], []];
  private readonly camera = new Camera();
  private readonly textures: CourtTextures;
  private image: ImageData;
  private pixels: Uint32Array;
  private readonly looks = new Map<Body, Look>();
  private readonly coaches: [Look, Look];
  private readonly previous = new Map<Body, Point>();
  private readonly motions = new Map<Body, Motion>();
  private backChanges = 0;
  private shortestBackInterval = Infinity;
  private readonly overrides = new Map<Body, { pose: PoseName; until: number; withBall?: boolean }>();
  // Quem recua num step-back muda de sítio num só passo da simulação; aqui desliza até lá.
  private readonly slides = new Map<Body, { x: number; y: number; start: number }>();
  private readonly floaters: Floater[] = [];
  private tip: { a: Body; b: Body; start: number; total: number } | null = null;
  // shortcut: o árbitro só existe na vista e não choca com ninguém, para não mudar o jogo; passa para a simulação se precisar de influenciar jogadas.
  private readonly referee = { x: 14, y: -1, prevX: 14, prevY: -1, flip: false, moving: false, signalUntil: 0 };
  private readonly refereeLook: Look;
  private readonly trail: [number, number][] = [];
  private ball = { x: 14, y: 0, z: 1 };
  private ballPrevious = { x: 14, y: 0, z: 1 };
  private seenEvents = 0;
  private run = { team: 0 as 0 | 1, points: 0 };
  private nextDribbleTick = 0;
  private lastHornTick = -1;
  private excitedUntil = 0;
  private benchCheerUntil: [number, number] = [0, 0];
  private swishUntil = 0;
  private swishHoop = HOOP_LEFT;
  private shakeUntil = 0;
  private readonly g: CanvasRenderingContext2D;
  private readonly callbacks: ViewCallbacks;
  private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(g: CanvasRenderingContext2D, home: Team, away: Team, seed: number, division: number, callbacks: ViewCallbacks, controlled: [boolean, boolean] = [true, false], visitor: TeamIndex = 1, homeKit?: ClubKit) {
    this.g = g;
    this.callbacks = callbacks;
    this.s = createMatch(home, away, seed, controlled, visitor);
    this.textures = courtTextures(division);
    this.image = g.createImageData(g.canvas.width, g.canvas.height);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.camera.setViewport(g.canvas.width, g.canvas.height);
    for (const b of this.s.bodies) {
      this.looks.set(b, b.team === 0 ? { ...lookOf(b.player, 'blue'), custom: homeKit } : lookOf(b.player, 'cream'));
      this.previous.set(b, { x: b.x, y: b.y });
    }
    const coachLook = (team: Team): Look => ({ ...lookOf({ ...team.roster[0]!, name: team.name }, 'coach'), style: 0, legs: 6, torso: 6, build: 'athletic' });
    this.coaches = [coachLook(home), coachLook(away)];
    this.refereeLook = { ...lookOf({ ...home.roster[0]!, name: 'Árbitro' }, 'referee'), style: 0, legs: 7, torso: 7, build: 'athletic' };
    this.camera.aim(this.cameraTarget());
    this.processEvents();
  }

  /** Chamado quando a janela muda de tamanho. */
  resize(): void {
    const { canvas } = this.g;
    this.image = this.g.createImageData(canvas.width, canvas.height);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.camera.setViewport(canvas.width, canvas.height);
  }

  private cameraTarget(): number {
    // No início, toda a gente está à volta do círculo: olha-se para o meio do campo.
    if (this.s.phase === 'intro' || this.s.phase === 'jump') return this.s.ball.x;
    // Olhar um pouco à frente da bola, para o cesto atacado ficar sempre à vista.
    const secondHalf = this.s.period >= 3;
    const attacksRight = (this.s.offense === 0) !== secondHalf;
    return Math.max(5.4, Math.min(22.6, this.s.ball.x + (attacksRight ? 3 : -3)));
  }

  private findBody(e: MatchEvent): Body | undefined {
    return this.s.bodies.find(b => b.team === e.team && b.player.name === e.player);
  }

  private processEvents(): void {
    const { s, callbacks } = this;
    for (; this.seenEvents < s.events.length; this.seenEvents++) {
      const e = s.events[this.seenEvents]!;
      callbacks.event(e);
      const body = this.findBody(e);
      switch (e.type) {
        case 'period':
          this.periodScores[0].push(0);
          this.periodScores[1].push(0);
          callbacks.sound('whistle');
          break;
        case 'shot': {
          if (!body) break;
          const dunk = e.dunk === true || (e.points === 2 && e.distance! <= DUNK_MAX_DISTANCE && body.player.attributes.jumping >= DUNK_MIN_JUMPING);
          this.overrides.set(body, { pose: dunk ? 'dunk' : 'shoot', until: s.tick + (dunk ? 12 : 16) });
          break;
        }
        case 'made':
          this.addPoints(e, e.points!);
          this.announceMade(e, body);
          if (body) this.overrides.set(body, { pose: 'cheer1', until: s.tick + 14 });
          break;
        case 'freeThrowMade':
          this.addPoints(e, 1);
          this.swishUntil = s.tick + SWISH_TICKS;
          this.swishHoop = this.attackedHoop(e.team);
          callbacks.sound('swish');
          break;
        case 'missed':
        case 'freeThrowMissed':
          callbacks.sound('rim');
          break;
        case 'block':
          if (body) this.overrides.set(body, { pose: 'block', until: s.tick + 12 });
          this.excitedUntil = s.tick + 24;
          callbacks.sound('block');
          callbacks.announce('Desarme!');
          break;
        case 'rebound':
          if (body) this.overrides.set(body, { pose: 'block', until: s.tick + 8 });
          break;
        case 'steal':
          callbacks.sound('steal');
          if (body && !this.overrides.has(body)) this.overrides.set(body, { pose: 'gather', until: s.tick + 6, withBall: true });
          break;
        case 'tipOff':
          callbacks.sound('whistle');
          this.tip = { a: s.jump!.a, b: s.jump!.b, start: s.tick, total: s.jump!.total };
          this.refereeSignal(null, 8);
          break;
        case 'bump':
          if (e.hard) {
            callbacks.sound('bump');
            // Quem empurra abre os braços; quem perde já cambaleia, porque fica atordoado.
            if (body && body !== s.holder) this.overrides.set(body, { pose: 'defend', until: s.tick + 6 });
          }
          break;
        case 'foul':
          callbacks.sound('whistle');
          this.refereeSignal('FALTA');
          break;
        case 'periodEnd':
          callbacks.sound('buzzer');
          this.refereeSignal(null);
          break;
        case 'end':
          this.excitedUntil = s.tick + 100000;
          break;
        case 'timeout':
          callbacks.sound('whistle');
          callbacks.sound('horn');
          callbacks.announce(`Desconto: ${s.teams[e.team].short}`);
          this.refereeSignal(null);
          break;
        case 'shotClockViolation':
          callbacks.sound('shotClockBuzzer');
          callbacks.sound('whistle');
          callbacks.announce('Tempo de posse!');
          this.refereeSignal(null);
          break;
        case 'move':
          if (body) {
            // Cada movimento tem a sua pose e o nome por cima de quem o fez. O afundanço e o alley-oop acabam na pose de afundar, com o lançamento.
            if (e.move === 'crossover') this.overrides.set(body, { pose: 'crossover', until: s.tick + 8, withBall: true });
            if (e.move === 'pickpocket') this.overrides.set(body, { pose: 'gather', until: s.tick + 8, withBall: true });
            if (e.move === 'stepBack') this.slides.set(body, { ...this.previous.get(body)!, start: s.tick });
            this.floaters.push({ label: MOVE_LABELS[e.move!], x: body.x, y: body.y, z: 2.6, born: s.tick });
          }
          this.excitedUntil = s.tick + 30;
          callbacks.sound('bigCheer');
          callbacks.announce(`${MOVE_INFO[e.move!].name}!`);
          break;
        case 'turnover':
          callbacks.sound('whistle');
          this.refereeSignal('FORA');
          break;
        case 'substitution':
          // Várias trocas na mesma paragem só dão um toque de buzzer.
          if (this.lastHornTick !== s.tick) callbacks.sound('horn');
          this.lastHornTick = s.tick;
          break;
      }
    }
  }

  /** O árbitro para e levanta os braços, com o que marcou escrito por cima. */
  private refereeSignal(label: string | null, ticks = REFEREE_SIGNAL_TICKS): void {
    const { referee, s } = this;
    referee.signalUntil = s.tick + ticks;
    if (label) this.floaters.push({ label, x: referee.x, y: referee.y, z: 2.4, born: s.tick });
  }

  /** Atira a bola no início e depois acompanha o jogo, por trás da bola e do lado de fora. */
  private updateReferee(): void {
    const { referee, s } = this;
    referee.prevX = referee.x;
    referee.prevY = referee.y;
    let targetX = 14;
    let targetY = -1;
    if (s.phase === 'jump') {
      // Sai para o lado, para se ver o salto.
      targetX = 16.2;
    } else if (s.phase !== 'intro' && s.phase !== 'timeout' && s.phase !== 'break') {
      const secondHalf = s.period >= 3;
      const attack = (s.offense === 0) !== secondHalf ? 1 : -1;
      targetX = Math.max(1, Math.min(27, s.ball.x - attack * 2.5));
      targetY = Math.max(2.5, Math.min(5.5, s.ball.y + 3));
    }
    const dx = targetX - referee.x;
    const dy = targetY - referee.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Enquanto assinala, fica parado. Abaixo de meio metro não vale a pena mexer-se.
    referee.moving = s.tick >= referee.signalUntil && dist > (referee.moving ? 0.1 : 0.5);
    if (referee.moving) {
      const stepLength = Math.min(dist, REFEREE_STEP);
      referee.x += (dx / dist) * stepLength;
      referee.y += (dy / dist) * stepLength;
      if (Math.abs(dx) > 0.3) referee.flip = dx < 0;
    }
  }

  /** Quanto o saltador está acima do chão, em píxeis. */
  private tipLift(b: Body, alpha: number): number {
    const { tip, s } = this;
    if (!tip || (tip.a !== b && tip.b !== b)) return 0;
    const air = tip.total * (1 - TIP_RISE);
    const t = (s.tick + alpha - (tip.start + tip.total * TIP_RISE)) / (air * 2);
    return t > 0 && t < 1 ? 4 * TIP_HEIGHT * t * (1 - t) : 0;
  }

  private addPoints(e: MatchEvent, points: number): void {
    const period = this.periodScores[e.team];
    period[period.length - 1]! += points;
    const previousRun = this.run.points;
    if (this.run.team === e.team) {
      this.run.points += points;
    } else {
      this.run = { team: e.team, points };
    }
    for (const threshold of RUN_BANNERS) {
      if (previousRun < threshold && this.run.points >= threshold) {
        this.callbacks.announce(`Parcial de ${this.run.points}-0!`);
        this.callbacks.sound('bigCheer');
      }
    }
  }

  private announceMade(e: MatchEvent, body: Body | undefined): void {
    const { s, callbacks } = this;
    const hoopX = this.attackedHoop(e.team);
    this.floaters.push({ label: `+${e.points}`, x: hoopX, y: 0, z: 3.05, born: s.tick });
    this.swishUntil = s.tick + SWISH_TICKS;
    this.swishHoop = hoopX;
    this.benchCheerUntil[e.team] = s.tick + 24;
    const dunk = this.overrides.get(body!)?.pose === 'dunk';
    const loud = e.points === 3 || dunk;
    this.excitedUntil = s.tick + (loud ? 44 : 18);
    if (dunk) this.shakeUntil = s.tick + 8;
    callbacks.sound('swish');
    callbacks.sound(loud ? 'bigCheer' : 'cheer');
    if (dunk) callbacks.announce('Afundanço!');
    if (s.clock <= 20) {
      callbacks.announce('Sobre o apito!');
      this.excitedUntil = s.tick + 60;
    } else if (s.period >= 4 && s.clock < 600) {
      const lead = s.score[e.team] - s.score[e.team === 0 ? 1 : 0];
      if (lead > 0 && lead <= e.points!) callbacks.announce('Reviravolta!');
    }
  }

  private attackedHoop(team: TeamIndex): number {
    return (team === 0) !== this.s.period >= 3 ? HOOP_RIGHT : HOOP_LEFT;
  }

  /** Põe a câmara logo no sítio certo, sem o movimento suave. */
  snapCamera(): void {
    this.camera.aim(this.cameraTarget());
  }

  /** Avança um passo da simulação. */
  stepSim(): void {
    const { s } = this;
    for (const b of s.bodies) {
      const point = this.previous.get(b)!;
      point.x = b.x;
      point.y = b.y;
    }
    this.ballPrevious = { ...this.ball };
    step(s);
    const target = s.ball;
    if (s.flight || s.loose) {
      this.ball = { ...target };
    } else {
      // Quando a bola muda de sítio de repente, como no ressalto, desliza em vez de saltar.
      this.ball.x += (target.x - this.ball.x) * 0.45;
      this.ball.y += (target.y - this.ball.y) * 0.45;
      this.ball.z += (target.z - this.ball.z) * 0.45;
    }
    this.updateMotion();
    this.updateReferee();
    if (s.holder && s.tick >= this.nextDribbleTick) {
      this.nextDribbleTick = s.tick + 8;
      this.callbacks.sound('bounce');
    }
    this.processEvents();
  }

  private motionOf(b: Body): Motion {
    let motion = this.motions.get(b);
    if (!motion) {
      motion = { vx: 0, vy: 0, speed: 0, moving: false, back: false, flip: false, backLock: 0, flipLock: 0, lastBackChange: 0 };
      this.motions.set(b, motion);
    }
    return motion;
  }

  /** Corre uma vez por passo da simulação, e não por imagem desenhada. */
  private updateMotion(): void {
    const { s, camera } = this;
    const ballX = camera.project(this.ball.x, this.ball.y)[0];
    for (const b of [...s.court[0], ...s.court[1]]) {
      const m = this.motionOf(b);
      const prev = this.previous.get(b)!;
      const [sx, sy] = camera.project(b.x, b.y);
      const [px, py] = camera.project(prev.x, prev.y);
      const speed = Math.sqrt((b.x - prev.x) * (b.x - prev.x) + (b.y - prev.y) * (b.y - prev.y)) * 20;
      m.vx = m.vx * 0.75 + (sx - px) * 0.25;
      m.vy = m.vy * 0.75 + (sy - py) * 0.25;
      m.speed = m.speed * 0.7 + speed * 0.3;
      // Limites diferentes para arrancar e para parar, para não alternar entre correr e estar parado.
      m.moving = m.moving ? m.speed > 0.4 : m.speed > 1;
      // Parado, só se vira quando a bola passa claramente para o outro lado.
      const idleFlip = ballX < sx - IDLE_TURN_MARGIN ? true : ballX > sx + IDLE_TURN_MARGIN ? false : m.flip;
      const wantFlip = m.moving ? (m.vx < -0.8 ? true : m.vx > 0.8 ? false : m.flip) : idleFlip;
      const wantBack = m.moving && (m.back ? m.vy < -0.4 : m.vy < -1.4);
      if (wantFlip !== m.flip && s.tick >= m.flipLock) {
        m.flip = wantFlip;
        m.flipLock = s.tick + TURN_LOCK_TICKS;
      }
      if (wantBack !== m.back && s.tick >= m.backLock) {
        if (m.lastBackChange > 0) this.shortestBackInterval = Math.min(this.shortestBackInterval, s.tick - m.lastBackChange);
        m.lastBackChange = s.tick;
        m.back = wantBack;
        m.backLock = s.tick + TURN_LOCK_TICKS;
        this.backChanges++;
      }
    }
  }

  /** Trocas entre frente e costas. Serve para a verificação no browser. */
  backChangeStats(): { changes: number; shortestTicks: number } {
    return { changes: this.backChanges, shortestTicks: this.shortestBackInterval };
  }

  private poseOf(b: Body, moving: boolean): { pose: PoseName; withBall: boolean } {
    const { s } = this;
    const frame = Math.floor(s.tick / 2.5);
    if (s.phase === 'end') {
      const won = s.score[b.team] > s.score[b.team === 0 ? 1 : 0];
      return { pose: won ? ((frame + b.slot) % 4 < 2 ? 'cheer0' : 'cheer1') : 'idle', withBall: false };
    }
    const override = this.overrides.get(b);
    // A bola ao alto: primeiro fletem as pernas, e depois saltam de braços no ar.
    const { tip } = this;
    if (tip && (tip.a === b || tip.b === b)) {
      const risesAt = tip.start + tip.total * TIP_RISE;
      if (s.tick < risesAt) return { pose: 'defend', withBall: false };
      if (s.tick < risesAt + tip.total * (1 - TIP_RISE) * 2) return { pose: 'block', withBall: false };
    }
    if (b.stunnedUntil > s.tick) return { pose: 'stumble', withBall: false };
    if (override && override.until > s.tick) return { pose: override.pose, withBall: override.withBall === true };
    if (s.phase === 'freeThrow') {
      const shooting = s.freeThrow?.shooter === b && s.timer < 12;
      return { pose: shooting ? 'shoot' : 'idle', withBall: false };
    }
    if (s.flight?.kind === 'pass' && s.flight.passer === b) return { pose: 'pass', withBall: false };
    if (s.holder === b) {
      // A correr, as pernas acompanham o drible; parado, só a bola mexe.
      if (moving) return { pose: DRIBBLE_RUN_FRAMES[frame % 4]!, withBall: true };
      return { pose: frame % 4 < 2 ? 'drib0' : 'drib1', withBall: true };
    }
    if (moving) return { pose: RUN_FRAMES[frame % 4]!, withBall: false };
    return { pose: b.team === s.offense ? 'idle' : 'defend', withBall: false };
  }

  /** Quem está no banco, a mesa de oficiais e os treinadores. */
  private addSideline(drawables: { y: number; draw: () => void }[], time: number): void {
    const { g, s, camera } = this;
    // A mesa e os bancos estão encostados à parede, por isso desenham-se antes de tudo o resto.
    drawables.push({
      y: -Infinity,
      draw: () => {
        drawBox(g, camera, 12.4, 15.6, -9.05, -8.45, 0.75, '#efe3c2', '#2a3040');
        drawBox(g, camera, 4, 11.4, -8.95, -8.7, 0.4, '#3a4252', '#1b2230');
        drawBox(g, camera, 16.6, 24, -8.95, -8.7, 0.4, '#3a4252', '#1b2230');
      },
    });
    for (const team of [0, 1] as const) {
      const benchers = s.bodies.filter(b => b.team === team && b.slot === -1);
      const startX = team === 0 ? 4.4 : 16.9;
      const cheering = s.tick < this.benchCheerUntil[team] || (s.phase === 'end' && s.score[team] > s.score[team === 0 ? 1 : 0]);
      benchers.forEach((b, i) => {
        const x = startX + i * 0.95;
        const [sx, sy] = camera.project(x, BENCH_Y);
        const pose: PoseName = cheering ? (Math.floor(s.tick / 3) + i) % 2 ? 'cheer0' : 'cheer1' : 'sit';
        drawables.push({ y: sy, draw: () => drawSprite(g, pose, this.looks.get(b)!, sx, sy, false, false, false) });
      });
      // O treinador anda de um lado para o outro à frente do banco.
      const coachBase = team === 0 ? 8 : 20;
      const [cx, cy] = camera.project(coachBase + Math.sin(time * 0.5 + team * 2) * 2.2, COACH_Y);
      const walking = Math.abs(Math.cos(time * 0.5 + team * 2)) > 0.3;
      const coachFrame = Math.floor(time * 6) % 4;
      drawables.push({
        y: cy,
        draw: () => {
          drawShadow(g, cx, cy);
          drawSprite(g, walking ? RUN_FRAMES[coachFrame]! : 'idle', this.coaches[team], cx, cy, Math.cos(time * 0.5 + team * 2) < 0, false, false);
        },
      });
    }
  }

  /** Desenha um frame. `alpha` é a fração entre dois passos da simulação e `simSeconds` o tempo decorrido no jogo. */
  render(alpha: number, simSeconds: number): void {
    const { g, s, camera } = this;
    const time = s.tick / 20;
    const { theme } = this.textures;
    camera.aim(camera.lookX + (this.cameraTarget() - camera.lookX) * (1 - Math.exp(-simSeconds * 2.2)));
    const excited = s.tick < this.excitedUntil;
    const crowdFrame = excited ? (s.tick >> 2) % 2 ? 2 : 1 : (s.tick >> 5) % 3 === 0 ? 1 : 0;
    camera.drawScene(this.pixels, this.textures, this.reducedMotion ? 0 : crowdFrame);
    if (excited && theme.flashes && !this.reducedMotion) {
      // Flashes de fotografia nas bancadas.
      const { width, height } = camera;
      for (let i = 0; i < 6; i++) {
        const y = Math.floor(Math.random() * height * 0.25);
        const x = Math.floor(Math.random() * width);
        this.pixels[y * width + x] = 0xffffffff;
      }
    }
    g.putImageData(this.image, 0, 0);
    const drawables: { y: number; draw: () => void }[] = [];
    this.addSideline(drawables, time);
    for (const hoopX of [HOOP_LEFT, HOOP_RIGHT]) {
      const outward = hoopX < 14 ? -1 : 1;
      const swish = hoopX === this.swishHoop && s.tick < this.swishUntil ? (this.swishUntil - s.tick) / SWISH_TICKS : 0;
      const hoopY = camera.project(hoopX + outward * 0.5, 0, 0)[1];
      drawables.push({ y: hoopY, draw: () => drawHoopBack(g, camera, theme, hoopX, swish) });
      drawables.push({ y: hoopY + HOOP_FRONT_OFFSET, draw: () => drawHoopFront(g, camera, hoopX, swish) });
    }
    const onCourt = [...s.court[0], ...s.court[1]];
    const placed = onCourt.map(b => {
      const prev = this.previous.get(b)!;
      let x = prev.x + (b.x - prev.x) * alpha;
      let y = prev.y + (b.y - prev.y) * alpha;
      const slide = this.slides.get(b);
      if (slide) {
        const t = (s.tick + alpha - slide.start) / STEP_BACK_TICKS;
        if (t >= 1) this.slides.delete(b);
        else {
          x = slide.x + (b.x - slide.x) * t;
          y = slide.y + (b.y - slide.y) * t;
        }
      }
      const [sx, sy] = camera.project(x, y);
      const motion = this.motionOf(b);
      const look = this.looks.get(b)!;
      const { pose, withBall } = this.poseOf(b, motion.moving);
      const flip = motion.flip;
      const back = motion.back && pose.startsWith('run');
      return { x: sx, y: sy, lift: this.tipLift(b, alpha), pose, withBall, look, flip, back };
    });
    const { referee } = this;
    const [refereeX, refereeY] = camera.project(referee.prevX + (referee.x - referee.prevX) * alpha, referee.prevY + (referee.y - referee.prevY) * alpha);
    const signalling = s.tick < referee.signalUntil;
    placed.push({
      x: refereeX,
      y: refereeY,
      lift: 0,
      pose: signalling ? 'cheer0' : referee.moving ? RUN_FRAMES[Math.floor(s.tick / 2.5) % 4]! : 'idle',
      withBall: false,
      look: this.refereeLook,
      flip: referee.flip,
      back: false,
    });
    // Os reflexos vão por baixo de tudo, senão apareciam por cima de outros jogadores.
    if (theme.reflection > 0) {
      for (const p of placed) drawReflection(g, p.pose, p.look, p.x, p.y, p.flip, p.back, theme.reflection);
    }
    for (const p of placed) {
      drawables.push({
        y: p.y,
        draw: () => {
          drawShadow(g, p.x, p.y);
          drawSprite(g, p.pose, p.look, p.x, p.y - p.lift, p.flip, p.back, p.withBall);
        },
      });
    }
    const holderOverride = s.holder ? this.overrides.get(s.holder) : undefined;
    const holderDrawsBall = s.holder !== null && (!holderOverride || holderOverride.until <= s.tick || holderOverride.withBall === true);
    if (!holderDrawsBall) {
      const x = this.ballPrevious.x + (this.ball.x - this.ballPrevious.x) * alpha;
      const y = this.ballPrevious.y + (this.ball.y - this.ballPrevious.y) * alpha;
      const z = this.ballPrevious.z + (this.ball.z - this.ballPrevious.z) * alpha;
      const [gx, gy] = camera.project(x, y);
      const [bx, by] = camera.project(x, y, z);
      if (s.flight?.kind === 'shot') {
        this.trail.push([bx, by]);
        if (this.trail.length > TRAIL_LENGTH) this.trail.shift();
      } else {
        this.trail.length = 0;
      }
      // Junto ao cesto, a bola fica entre a parte de trás e a da frente, para atravessar o aro.
      const nearbyHoop = [HOOP_LEFT, HOOP_RIGHT].find(hoopX => Math.abs(x - hoopX) < BALL_IN_HOOP_RANGE && Math.abs(y) < BALL_IN_HOOP_RANGE);
      const ballLayer = nearbyHoop === undefined ? gy : camera.project(nearbyHoop + (nearbyHoop < 14 ? -0.5 : 0.5), 0, 0)[1] + HOOP_FRONT_OFFSET / 2;
      drawables.push({
        y: ballLayer,
        draw: () => {
          drawShadow(g, gx, gy, 3);
          this.trail.forEach(([tx, ty], i) => {
            g.fillStyle = `rgba(242,194,48,${(i + 1) / (TRAIL_LENGTH * 2.5)})`;
            g.fillRect((tx | 0) - 1, (ty | 0) - 1, 3, 3);
          });
          drawBall(g, bx, by);
        },
      });
    }
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();
    this.drawCarrier(alpha);
    this.drawFloaters();
    if (!this.reducedMotion && s.tick < this.shakeUntil) {
      const dx = s.tick % 2 ? 2 : -2;
      g.canvas.style.transform = `translate(${dx}px, ${s.tick % 3 === 0 ? 1 : -1}px)`;
    } else if (g.canvas.style.transform) {
      g.canvas.style.transform = '';
    }
  }

  /** Uma marca vermelha por cima de cada adversário a marcar de perto. */
  private drawTargets(alpha: number): void {
    const { g, s, camera } = this;
    const focus = s.tactics[0].focus ?? [];
    if (focus.length === 0) return;
    for (const b of s.court[1]) {
      if (!focus.includes(s.teams[1].roster.indexOf(b.player))) continue;
      const prev = this.previous.get(b)!;
      const [x, y] = camera.project(prev.x + (b.x - prev.x) * alpha, prev.y + (b.y - prev.y) * alpha);
      const top = (y | 0) - spriteHeight(this.looks.get(b)!) - 4;
      g.fillStyle = '#1b2230';
      g.fillRect((x | 0) - 4, top - 5, 9, 2);
      g.fillRect((x | 0) - 3, top - 3, 7, 2);
      g.fillRect((x | 0) - 2, top - 1, 5, 2);
      g.fillRect((x | 0) - 1, top + 1, 3, 1);
      g.fillStyle = '#cf3a2c';
      g.fillRect((x | 0) - 3, top - 4, 7, 2);
      g.fillRect((x | 0) - 2, top - 2, 5, 2);
      g.fillRect((x | 0) - 1, top, 3, 1);
    }
  }

  private drawFloaters(): void {
    const { g, s, camera } = this;
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i]!;
      const age = s.tick - f.born;
      if (age > 30) {
        this.floaters.splice(i, 1);
        continue;
      }
      const [x, y] = camera.project(f.x, f.y, f.z);
      const rise = Math.min(10, age);
      // Os pontos são grandes e ficam ao lado do aro; as palavras, mais pequenas e por cima de quem as fez.
      const word = f.label.length > 3;
      // No topo do ecrã, a faixa e o marcador tapariam a palavra: aí, fica aos pés do jogador.
      const below = word && y < camera.height * 0.38;
      const top = Math.min(camera.height - 12, below ? (y | 0) + 8 + rise : Math.max(40, (y | 0) - 14 - rise));
      const scale = word ? 2 : 3;
      // Num canto, a palavra encosta à margem em vez de sair do ecrã.
      const left = word ? Math.max(2, Math.min(camera.width - textWidth(f.label, scale) - 2, (x | 0) - (textWidth(f.label, scale) >> 1))) : (x | 0) + (x < camera.width / 2 ? 14 : -38);
      text(g, f.label, left + 1, top + 1, '#1b2230', scale);
      text(g, f.label, left, top, '#f2c230', scale);
    }
  }

  private drawCarrier(alpha: number): void {
    const { g, s, camera } = this;
    const holder = this.carrier();
    if (!holder) return;
    const prev = this.previous.get(holder)!;
    const [x, y] = camera.project(prev.x + (holder.x - prev.x) * alpha, prev.y + (holder.y - prev.y) * alpha);
    const bob = (s.tick >> 3) % 2;
    drawCarrierArrow(g, x, y - spriteHeight(this.looks.get(holder)!) - 3 - bob);
    this.drawTargets(alpha);
  }

  /** A pose do portador da bola neste instante. Serve para a verificação no browser. */
  carrierPose(): { pose: PoseName; moving: boolean } | null {
    const b = this.s.holder;
    if (!b) return null;
    const { moving } = this.motionOf(b);
    return { pose: this.poseOf(b, moving).pose, moving };
  }

  /** O jogador com a bola, ou para quem ela vai a caminho. */
  carrier(): Body | null {
    const { s } = this;
    return s.holder ?? (s.flight?.kind === 'pass' ? s.flight.target : null);
  }

  lookFor(b: Body): Look {
    return this.looks.get(b)!;
  }
}
