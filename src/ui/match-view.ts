import { createMatch, step, type Body, type MatchEvent, type MatchState } from '../sim/match.ts';
import type { Team } from '../sim/types.ts';
import { Camera, VIEW_H, VIEW_W, courtTextures, drawHoop, type CourtTextures } from './art/court.ts';
import { text, textWidth } from './art/font.ts';
import {
  drawBall,
  drawCarrierArrow,
  drawShadow,
  drawSprite,
  lookOf,
  spriteHeight,
  type Look,
  type PoseName,
} from './art/sprites.ts';
import { clockText } from './narrate.ts';

const HOOP_LEFT = 1.575;
const HOOP_RIGHT = 26.425;
const RUN_FRAMES: readonly PoseName[] = ['run0', 'run1', 'run2', 'run1'];
const DUNK_MAX_DISTANCE = 1.7;
const DUNK_MIN_JUMPING = 45;
const RUN_BANNERS = [8, 12, 16];

interface Point {
  x: number;
  y: number;
}
interface Floater {
  label: string;
  x: number;
  y: number;
  z: number;
  born: number;
}

export type Sound = 'swish' | 'rim' | 'whistle' | 'buzzer' | 'bounce' | 'steal' | 'block' | 'cheer' | 'bigCheer';

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
  private readonly image: ImageData;
  private readonly pixels: Uint32Array;
  private readonly looks = new Map<Body, Look>();
  private readonly previous = new Map<Body, Point>();
  private readonly facing = new Map<Body, boolean>();
  private readonly backs = new Map<Body, boolean>();
  private readonly overrides = new Map<Body, { pose: PoseName; until: number }>();
  private readonly floaters: Floater[] = [];
  private ball = { x: 14, y: 0, z: 1 };
  private ballPrevious = { x: 14, y: 0, z: 1 };
  private seenEvents = 0;
  private run = { team: 0 as 0 | 1, points: 0 };
  private nextDribbleTick = 0;
  private readonly g: CanvasRenderingContext2D;
  private readonly callbacks: ViewCallbacks;

  constructor(g: CanvasRenderingContext2D, home: Team, away: Team, seed: number, division: number, callbacks: ViewCallbacks) {
    this.g = g;
    this.callbacks = callbacks;
    this.s = createMatch(home, away, seed);
    this.textures = courtTextures(division);
    this.image = g.createImageData(VIEW_W, VIEW_H);
    this.pixels = new Uint32Array(this.image.data.buffer);
    for (const b of this.s.bodies) {
      this.looks.set(b, lookOf(b.player, b.team === 0 ? 'blue' : 'cream'));
      this.previous.set(b, { x: b.x, y: b.y });
    }
    this.camera.aim(this.cameraTarget());
    this.processEvents();
  }

  private cameraTarget(): number {
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
          const dunk = e.points === 2 && e.distance! <= DUNK_MAX_DISTANCE && body.player.attributes.jumping >= DUNK_MIN_JUMPING;
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
          callbacks.sound('swish');
          break;
        case 'missed':
        case 'freeThrowMissed':
          callbacks.sound('rim');
          break;
        case 'block':
          if (body) this.overrides.set(body, { pose: 'block', until: s.tick + 12 });
          callbacks.sound('block');
          callbacks.announce('Desarme!');
          break;
        case 'rebound':
          if (body) this.overrides.set(body, { pose: 'block', until: s.tick + 8 });
          break;
        case 'steal':
          callbacks.sound('steal');
          break;
        case 'foul':
          callbacks.sound('whistle');
          break;
        case 'end':
          callbacks.sound('buzzer');
          break;
        case 'turnover':
        case 'substitution':
          break;
      }
    }
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
    const dunk = this.overrides.get(body!)?.pose === 'dunk';
    const loud = e.points === 3 || dunk;
    callbacks.sound('swish');
    callbacks.sound(loud ? 'bigCheer' : 'cheer');
    if (dunk) callbacks.announce('Afundanço!');
    if (s.clock <= 20) callbacks.announce('Sobre o apito!');
    else if (s.period >= 4 && s.clock < 600) {
      const lead = s.score[e.team] - s.score[e.team === 0 ? 1 : 0];
      if (lead > 0 && lead <= e.points!) callbacks.announce('Reviravolta!');
    }
  }

  private attackedHoop(team: 0 | 1): number {
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
    if (s.flight) {
      this.ball = { ...target };
    } else {
      // Quando a bola muda de sítio de repente, como no ressalto, desliza em vez de saltar.
      this.ball.x += (target.x - this.ball.x) * 0.45;
      this.ball.y += (target.y - this.ball.y) * 0.45;
      this.ball.z += (target.z - this.ball.z) * 0.45;
    }
    if (s.holder && s.tick >= this.nextDribbleTick) {
      this.nextDribbleTick = s.tick + 8;
      this.callbacks.sound('bounce');
    }
    this.processEvents();
  }

  private poseOf(b: Body, speed: number): { pose: PoseName; withBall: boolean } {
    const { s } = this;
    const frame = Math.floor(s.tick / 2.5);
    if (s.phase === 'end') {
      const won = s.score[b.team] > s.score[b.team === 0 ? 1 : 0];
      return { pose: won ? ((frame + b.slot) % 4 < 2 ? 'cheer0' : 'cheer1') : 'idle', withBall: false };
    }
    const override = this.overrides.get(b);
    if (override && override.until > s.tick) return { pose: override.pose, withBall: false };
    if (s.phase === 'freeThrow') {
      const shooting = s.freeThrow?.shooter === b && s.timer < 12;
      return { pose: shooting ? 'shoot' : 'idle', withBall: false };
    }
    if (s.flight?.kind === 'pass' && s.flight.passer === b) return { pose: 'pass', withBall: false };
    if (s.holder === b) return { pose: frame % 4 < 2 ? 'drib0' : 'drib1', withBall: true };
    if (speed > 0.6) return { pose: RUN_FRAMES[frame % 4]!, withBall: false };
    return { pose: b.team === s.offense ? 'idle' : 'defend', withBall: false };
  }

  /** Desenha um frame. `alpha` é a fração entre dois passos da simulação e `simSeconds` o tempo decorrido no jogo. */
  render(alpha: number, simSeconds: number): void {
    const { g, s, camera } = this;
    camera.aim(camera.lookX + (this.cameraTarget() - camera.lookX) * (1 - Math.exp(-simSeconds * 2.2)));
    camera.drawScene(this.pixels, this.textures);
    g.putImageData(this.image, 0, 0);
    const { theme } = this.textures;
    const drawables: { y: number; draw: () => void }[] = [];
    for (const hoopX of [HOOP_LEFT, HOOP_RIGHT]) {
      const outward = hoopX < 14 ? -1 : 1;
      drawables.push({ y: camera.project(hoopX + outward * 0.5, 0, 0)[1], draw: () => drawHoop(g, camera, theme, hoopX) });
    }
    const s0 = s.court[0];
    const s1 = s.court[1];
    for (const b of [...s0, ...s1]) {
      const prev = this.previous.get(b)!;
      const x = prev.x + (b.x - prev.x) * alpha;
      const y = prev.y + (b.y - prev.y) * alpha;
      const [sx, sy] = camera.project(x, y);
      const [px, py] = camera.project(prev.x, prev.y);
      const speed = Math.sqrt((b.x - prev.x) * (b.x - prev.x) + (b.y - prev.y) * (b.y - prev.y)) * 20;
      const look = this.looks.get(b)!;
      const { pose, withBall } = this.poseOf(b, speed);
      if (speed > 0.6) {
        if (Math.abs(sx - px) > 0.05) this.facing.set(b, sx < px);
        this.backs.set(b, sy < py - 0.2);
      } else {
        this.facing.set(b, camera.project(this.ball.x, this.ball.y)[0] < sx);
        this.backs.set(b, false);
      }
      const flip = this.facing.get(b) ?? false;
      const back = (this.backs.get(b) ?? false) && pose.startsWith('run');
      drawables.push({
        y: sy,
        draw: () => {
          drawShadow(g, sx, sy);
          drawSprite(g, pose, look, sx, sy, flip, back, withBall);
        },
      });
    }
    const holderDrawsBall = s.holder !== null && !(this.overrides.get(s.holder)?.until! > s.tick);
    if (!holderDrawsBall) {
      const x = this.ballPrevious.x + (this.ball.x - this.ballPrevious.x) * alpha;
      const y = this.ballPrevious.y + (this.ball.y - this.ballPrevious.y) * alpha;
      const z = this.ballPrevious.z + (this.ball.z - this.ballPrevious.z) * alpha;
      const [gx, gy] = camera.project(x, y);
      const [bx, by] = camera.project(x, y, z);
      drawables.push({
        y: gy,
        draw: () => {
          drawShadow(g, gx, gy, 3);
          drawBall(g, bx, by);
        },
      });
    }
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();
    this.drawHud(alpha);
    this.drawFloaters();
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
      // À frente do aro e com um limite no topo, para o marcador nunca tapar o número.
      const rise = Math.min(10, age);
      const top = Math.max(30, (y | 0) - 14 - rise);
      const left = (x | 0) + (x < VIEW_W / 2 ? 14 : -38);
      text(g, f.label, left + 1, top + 1, '#1b2230', 3);
      text(g, f.label, left, top, '#f2c230', 3);
    }
  }

  private drawHud(alpha: number): void {
    const { g, s, camera } = this;
    const holder = s.holder ?? (s.flight?.kind === 'pass' ? s.flight.target : null);
    if (holder) {
      const prev = this.previous.get(holder)!;
      const [x, y] = camera.project(prev.x + (holder.x - prev.x) * alpha, prev.y + (holder.y - prev.y) * alpha);
      drawCarrierArrow(g, x, y - spriteHeight(this.looks.get(holder)!.height) - 3);
      const name = holder.player.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
      g.fillStyle = 'rgba(27,34,48,.88)';
      g.fillRect(6, VIEW_H - 24, textWidth(name) + 8, 18);
      text(g, name, 10, VIEW_H - 20, '#fbf6e2');
    }
    const [home, away] = s.teams;
    g.fillStyle = 'rgba(27,34,48,.88)';
    g.fillRect(6, 6, 174, 20);
    g.fillStyle = '#2b5fd9';
    g.fillRect(9, 9, 8, 14);
    text(g, home.short, 21, 11, '#fbf6e2');
    const score = `${String(s.score[0]).padStart(2, '0')}-${String(s.score[1]).padStart(2, '0')}`;
    text(g, score, 58, 11, '#fbf6e2');
    text(g, away.short, 124, 11, '#fbf6e2');
    g.fillStyle = '#f4efe0';
    g.fillRect(164, 9, 8, 14);
    g.fillStyle = '#cf3a2c';
    g.fillRect(164, 16, 8, 2);
    const period = s.period <= 4 ? `P${s.period}` : 'PR';
    const clock = `${period} ${clockText(s.clock)}`;
    const width = textWidth(clock) + 8;
    g.fillStyle = 'rgba(27,34,48,.88)';
    g.fillRect(VIEW_W - width - 6, 6, width, 20);
    text(g, clock, VIEW_W - width - 2, 11, '#fbf6e2');
  }
}
