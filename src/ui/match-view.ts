import { reducedMotion } from './settings.ts';
import { DIVISIONS, levelOfHeight, teamRating } from '../sim/teamgen.ts';
import { buildOf } from './art/body.ts';
import type { ClubKit, Emblem } from './art/kit.ts';
import { BALANCE as B } from '../sim/balance.ts';
import { BENCH_SPACING, BENCH_START_X, BENCH_Y, COURT_HALF_WIDTH, HUDDLE_CENTRE, huddleSpot, seconds } from '../sim/court.ts';
import { createMatch, isSprinting, step, type Body, type MatchEvent, type MatchState, type TeamIndex } from '../sim/match.ts';
import type { MoveId, Player, Team } from '../sim/types.ts';
import { MOVE_INFO } from './narrate.ts';
import { CLOSED_GYM, Camera, FAN_SPACING, STAND, TUNNEL, courtTextures, drawBox, drawHoopBack, drawHoopFront, endFanSpot, fanRows, sideFanSpot, type CourtTextures, type Sky } from './art/court.ts';
import { text, textWidth } from './art/font.ts';
import { crowdLine, type CrowdMood } from './crowd.ts';
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
const HOLD_RUN_FRAMES: readonly PoseName[] = ['holdRun0', 'holdRun1', 'holdRun2', 'holdRun3'];
// A letra do jogo só tem maiúsculas sem acentos.
const MOVE_LABELS: Record<MoveId, string> = { crossover: 'CROSSOVER', stepBack: 'STEP-BACK', alleyOop: 'ALLEY-OOP', powerDunk: 'AFUNDANÇO', pickpocket: 'MÃO RÁPIDA' };
const STEP_BACK_TICKS = 5;
// Uma substituição demora isto a andar entre o banco e a linha.
const RUN_BANNERS = [8, 12, 16];
// Os bancos ficam afastados da linha, com espaço para o treinador andar à frente deles.
const COACH_Y = -8.6;
// A que distância o defensor salta para contestar o lançamento, e a que distância do seu homem fica em posição de defesa.
const CONTEST_RANGE = 1.8;
const STANCE_RANGE = 2.5;
// O treinador anda a passo, em metros por segundo.
const COACH_SPEED = 2.5;
const LOCKER_SPEED = 4.5;
// A partir desta altura da bola (m), quem corta um passe tem de saltar.
const INTERCEPT_JUMP_HEIGHT = 1.9;
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
// A pose de passe dura pouco: depois, quem passou volta a correr ou a esperar, em vez de deslizar de braços esticados.
const PASS_POSE_TICKS = 6;
// O salto ao ressalto: começa estes passos antes de a bola cair, dura isto e sobe até aqui, em píxeis.
const REBOUND_JUMP_AHEAD = 5;
const REBOUND_JUMP_TICKS = 12;
const REBOUND_JUMP_HEIGHT = 12;
// No afundanço, o salto leva a mão até ao aro: a mão da pose fica a 32 px dos pés e o aro a 46, por isso sobe-se 14 px.
const DUNK_LIFT = 14;
/** O salto de um lançamento: quanto dura e quanto sobe, em píxeis; a pose de lançar já traz os pés 6 px acima do chão. */
const SHOT_JUMP_TICKS = 10;
const SHOT_JUMP_HEIGHT = 8;
const SHOOT_POSE_FEET = 6;
const DUNK_FALL_TICKS = 3;
// O afundanço por fases (animacao.md §10): agacha 150 ms, sobe, fica pendurado no aro 60 ms reais, cai a acelerar em
// 150 ms e aterra a fletir as pernas 100 ms; só depois festeja.
const DUNK_CROUCH_TICKS = 3;
const DUNK_HANG_SECONDS = 0.06;
const DUNK_LAND_TICKS = 2;
const CHEER_TICKS = 14;
// Píxeis de boneco por metro de altura da bola: a mão esticada de um jogador de 1,98 m no topo do salto da bola ao alto
// fica a 46 px dos pés (pernas 7, tronco 7, braço 10, salto da pose 6 e TIP_HEIGHT 16), e é aí que a bola tem de estar,
// à altura do aro, quando ele lhe toca.
const BALL_PX_PER_METRE = 46 / 3.05;
/** Quanto dura cada nuvem de poeira atrás de quem sprinta, em passos da simulação. */
const PUFF_TICKS = 14;
const REFEREE_STEP = 0.26;
const REFEREE_SIGNAL_TICKS = 22;
// Ao intervalo a imagem escurece enquanto as equipas saem, e clareia quando voltam.
const FADE_IN_TICKS = 20;
// O nome de um movimento fica este espaço, em píxeis, acima do ponto mais alto do boneco; e nunca acima desta linha,
// onde estão a faixa e o marcador.
const FLOATER_GAP = 3;
const FLOATER_MIN_TOP = 40;

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
/** O estado de desenho de cada jogador, num só sítio. Os campos opcionais só existem enquanto dura o que descrevem. */
interface BodyView {
  look: Look;
  /** Onde estava no passo anterior, para interpolar entre passos. */
  prev: Point;
  motion: Motion;
  override?: { pose: PoseName; until: number; withBall?: boolean };
  // Quem recua num step-back muda de sítio num só passo da simulação; aqui desliza até lá.
  slide?: { x: number; y: number; start: number; ticks?: number };
  routine?: { dribbles: number; tempo: number; pause: number; spin: boolean };
  /** Quem lançou e ainda está no ar: o passo em que saltou. */
  shotJump?: number;
  /** O passo em que fez o último step-back: o lançamento a seguir é a cair para trás. */
  stepBack?: number;
  /** Quando saltou ao ressalto: o salto começa antes de a bola chegar, e apanha-se em cima. */
  reboundJump?: number;
  /** O afundanço: quando começou e quanto dura até à mão tocar no aro; a pose da fase em curso; até quando fica pendurado
   * (em tempo real), onde, e desde quando cai; e como festeja depois de aterrar. */
  dunkJump?: { start: number; up: number; pose?: PoseName; withBall?: boolean; hangEnd?: number; pin?: Point; fallFrom?: number; cheer?: PoseName };
  /** Onde está o suplente, quando sai do banco para a roda do desconto e volta. */
  huddle?: Point;
  /** Até quando o nome fica por cima dele, depois de ser tocado. */
  nameTag?: number;
}
interface Floater {
  label: string;
  x: number;
  y: number;
  z: number;
  born: number;
  /** Quem fez o movimento: a palavra segue-o, por cima da cabeça. */
  body?: Body;
  /** Sem espaço por cima dele, a palavra fica ao lado, à direita (1) ou à esquerda (-1), até desaparecer. */
  beside?: 1 | -1;
  /** A linha mais alta onde a palavra já esteve: só sobe, para não andar para cima e para baixo com o salto de quem a fez. */
  top?: number;
}

export type Sound = 'swish' | 'rim' | 'whistle' | 'buzzer' | 'shotClockBuzzer' | 'horn' | 'bounce' | 'catch' | 'steal' | 'block' | 'cheer' | 'bigCheer' | 'card' | 'bump';

export interface ViewCallbacks {
  announce(message: string): void;
  sound(name: Sound): void;
  event(e: MatchEvent): void;
}

/** Liga a simulação ao ecrã. A simulação não sabe que esta classe existe. */
// O lado da câmara nunca se vê, mas também tem gente: conta como mais 40 % de quem se vê.
const HIDDEN_SIDE = 1.4;

export class MatchView {
  readonly s: MatchState;
  readonly periodScores: [number[], number[]] = [[], []];
  /** Os períodos do tempo regulamentar: o jogo-treino, à porta fechada, só tem dois. */
  readonly periods: number;
  private readonly camera = new Camera();
  /** Nos cenários de teste do revisor, quem se desenha em campo; sem isto, todos, e o árbitro. */
  visible: ((b: Body) => boolean) | null = null;
  /** O que o último frame desenhou, para os cenários de teste do revisor medirem: cada boneco, a bola e os rótulos. */
  readonly drawn: { bodies: Map<Body, { x: number; y: number; lift: number; pose: PoseName; height: number }>; ball: [number, number] | null; labels: [number, number, number, number][] } = { bodies: new Map(), ball: null, labels: [] };
  private readonly textures: CourtTextures;
  private image: ImageData;
  private pixels: Uint32Array;
  private readonly views = new Map<Body, BodyView>();
  private readonly coaches: [Look, Look];
  private backChanges = 0;
  private shortestBackInterval = Infinity;
  // Quem sai do jogo vai a andar sentar-se no banco; quem entra vem de lá a andar.
  private readonly exits: { body: Body; from: Point; to: Point; start: number; ticks: number }[] = [];
  /** Numa paragem a imagem aproxima-se do banco da casa: 1 é a vista normal, 2 o dobro. */
  private zoom = 1;
  private scene: HTMLCanvasElement | null = null;
  /** A tela `scene` ficou para trás: a última imagem foi direta para o ecrã. */
  private sceneStale = true;
  /** Nuvens de poeira deixadas pelos pés de quem sprinta: onde estavam, e em que passo. */
  private readonly puffs: { x: number; y: number; born: number; side: number }[] = [];
  /** Se um passe é picado decide-se uma vez por passe: com um defensor perto da linha do passe, a bola vai pelo chão. */
  private readonly bounces = new WeakMap<object, boolean>();
  private lastFreeThrowPose: PoseName | null = null;
  private readonly floaters: Floater[] = [];
  /** Quantos píxeis acima dos pés chega cada pose, medido uma vez no próprio desenho: braços no ar e salto incluídos. */
  private readonly poseTops = new Map<string, number>();
  // O que a bancada diz, em balões por cima de um adepto da primeira fila.
  private readonly bubbles: { label: string; fan: number; born: number }[] = [];
  // Quantas frases de cada contexto já se disseram, para a bancada não se repetir.
  private readonly crowdSaid = new Map<CrowdMood, number>();
  private readonly crowdSeed: number;
  // O público, como no original: bonecos em filas na bancada, sentados, que se levantam nos momentos especiais. Os balões saem deles.
  private readonly fans: { x: number; y: number; z: number; look: Look; phase: number; flip: boolean; flag: boolean; front: boolean; zeal: number }[] = [];
  private readonly flagColor: string;
  // No campo de rua não há bancada: há dois bancos de dois degraus, com uns quantos a ver.
  private readonly street: boolean;
  // A rede do campo de rua, numa camada à parte: quem vê o jogo do lado de fora fica atrás dela.
  private fence: { image: ImageData; pixels: Uint32Array; canvas: HTMLCanvasElement } | null = null;
  private readonly outsiders: { x: number; y: number; look: Look; phase: number; flip: boolean }[] = [];
  /** Momentos de humor, raros e só na vista, escolhidos pela semente do jogo: o tick em que um cão entra no campo de rua,
   * um pombo no aro no primeiro lance livre, um adepto que adormece quando a diferença chega a `blowout`. A verificação força-os aqui. */
  readonly humor: { dogAt: number | null; pigeon: boolean; sleeper: boolean; blowout: number };
  private pigeon: { hoopX: number; flew: number } | null = null;
  private readonly sleeperFan: number;
  private readonly ownerLook: Look;
  private readonly mascotLook: Look | null;
  private fansCheerUntil = 0;
  private fansSadUntil = 0;
  // O prognóstico, mostrado durante a entrada das equipas; com a confiança alta, os adeptos festejam de bandeira na mão.
  private forecast: { ours: number; confident: boolean } | null = null;
  /** Quantas pessoas vieram ver o jogo: as que se veem nas bancadas, mais as do lado da câmara, que nunca aparece. */
  get spectators(): number {
    return Math.round((this.fans.length + this.outsiders.length) * HIDDEN_SIDE);
  }
  /** O emblema do nosso clube, para os painéis. Os outros têm o emblema fixo. */
  readonly ownEmblem?: Emblem;
  /** O emblema do adversário quando não é o que o nome dá: o da equipa de fora, no Aeroporto. */
  readonly rivalEmblem?: Emblem;
  private coachUpsetUntil: [number, number] = [0, 0];
  // Onde cada treinador está: segue o alvo a andar, e nunca salta de sítio.
  private readonly coachPos: (Point | null)[] = [null, null];
  // O relógio das animações: anda com a simulação e, com ela parada, com o tempo real, para ninguém ficar hirto numa pausa.
  private animTime = 0;
  /** O tempo real, que para na pausa mas não acelera a 2× e 4×: para os efeitos de sensação, como a paragem no aro. */
  private realTime = 0;
  /** Quantos segundos de jogo passam por segundo real: 1, 2 ou 4. */
  private simPerReal = 1;
  private animTick = 0;
  private frameSeconds = 0;
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
  /** Quanto vale o momento, de 0 a 1: decide quanta gente se levanta na bancada e por quanto tempo. */
  private excitement = 0.5;
  private fansCheerTicks = 0;
  private fansCheerLevel = 0.6;
  private benchCheerUntil: [number, number] = [0, 0];
  private swishUntil = 0;
  private swishHoop = HOOP_LEFT;
  private shakeUntil = 0;
  private fadeInUntil = 0;
  private readonly g: CanvasRenderingContext2D;
  private readonly callbacks: ViewCallbacks;
  private get reducedMotion(): boolean { return reducedMotion(); }

  constructor(g: CanvasRenderingContext2D, home: Team, away: Team, seed: number, division: number, callbacks: ViewCallbacks, controlled: [boolean, boolean] = [true, false], visitor: TeamIndex = 1, homeKit?: ClubKit, state?: MatchState, venue?: string, attendance = 0.7, awayKit?: ClubKit, centreEmblem?: Emblem, ownEmblem?: Emblem, rivalEmblem?: Emblem, weather?: Sky) {
    this.ownEmblem = ownEmblem;
    this.rivalEmblem = rivalEmblem;
    this.crowdSeed = seed;
    this.periods = division === CLOSED_GYM ? 2 : 4;
    this.g = g;
    this.callbacks = callbacks;
    this.s = state ?? createMatch(home, away, seed, controlled, visitor);
    this.textures = courtTextures(division, venue, centreEmblem, weather);
    const roll = (salt: number): number => (Math.imul(seed ^ Math.imul(salt, 0x9e3779b9), 2654435761) >>> 0) / 4294967296;
    this.humor = { dogAt: division === 0 && roll(1) < 0.35 ? Math.floor(600 + roll(2) * 3000) : null, pigeon: roll(3) < 0.25, sleeper: roll(4) < 0.6, blowout: 25 };
    this.image = g.createImageData(g.canvas.width, g.canvas.height);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.camera.setViewport(g.canvas.width, g.canvas.height);
    for (const b of this.s.bodies) {
      this.views.set(b, {
        look: b.team === 0 ? { ...lookOf(b.player, 'blue'), custom: homeKit } : { ...lookOf(b.player, 'cream'), custom: awayKit },
        prev: { x: b.x, y: b.y },
        motion: { vx: 0, vy: 0, speed: 0, moving: false, back: false, flip: false, backLock: 0, flipLock: 0, lastBackChange: 0 },
      });
    }
    const coachLook = (team: Team): Look => ({ ...lookOf({ ...team.roster[0]!, name: team.name }, 'suit'), style: 0, legs: 6, torso: 6, build: 'athletic' });
    const { theme } = this.textures;
    this.street = division === 0;
    const shirt = theme.crowd?.shirts[0] ?? [60, 60, 60];
    this.flagColor = `rgb(${shirt[0] | 0},${shirt[1] | 0},${shirt[2] | 0})`;
    // Doze caras diferentes chegam para uma bancada: dois terços vestem a cor da casa, o resto roupa de rua.
    const crowdKit = this.crowdTeam === 0 ? 'blue' : 'cream';
    const looks: Look[] = [];
    for (let i = 0; i < 12; i++) {
      const fan: Player = { name: `Adepto ${i * 7919}`, attributes: { shooting: 50, speed: 50, stamina: 50, technique: 50, strength: 40 + ((i * 37) % 40), jumping: 50, willpower: 50 }, height: levelOfHeight(168 + ((i * 53) % 24)), moves: [], offBall: 'balanced', onBall: 'balanced', potential: 50, fatigue: 0 };
      // Metade veste a camisola do clube; os outros, roupa de rua. Ninguém usa fita na cabeça, que é coisa de jogador.
      const look: Look = i % 2 === 1 ? lookOf(fan, i % 4 === 1 ? 'fan' : 'fan2') : { ...lookOf(fan, crowdKit), custom: this.crowdTeam === 0 ? homeKit : awayKit };
      // Nas bancadas há de tudo: magros, fortes e gordos.
      look.build = buildOf(168 + ((i * 53) % 24), 66 + ((i * 29) % 30), fan.attributes.strength);
      looks.push({ ...look, style: (i * 5) % 4, street: true });
    }
    this.ownerLook = looks[3]!;
    // A mascote veste as cores do clube dono do pavilhão; a cabeça grande desenha-se por cima.
    const css = (c: readonly number[]): string => `#${c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
    const banner = theme.banner;
    this.mascotLook = theme.mascot === undefined || !banner ? null : { ...looks[0]!, custom: { id: 'mascot', name: '', jersey: css(banner[0]), second: css(banner[1]), pattern: 'plain', trim: css(banner[1]), shorts: css(banner[0]) } };
    // A enchente cresce com a confiança na direção: a um terço, só os fiéis; perto de cem, casa cheia.
    // E um adversário forte para a divisão traz mais gente, um fraco menos (uma divisão de diferença vale ±50 %).
    const draw = division >= DIVISIONS.length ? 1 : Math.max(0.75, Math.min(1.3, 1 + (teamRating(away) - DIVISIONS[division]!.level) / 22));
    const fill = (0.3 + 0.9 * Math.max(0, Math.min(1, attendance))) * draw;
    if (this.street) {
      // Dois bancos de dois degraus atrás de cada cesto, longe dos bancos das equipas, com pouca gente: o degrau alto fica atrás.
      let n = 1;
      // Um banco de cada lado do cesto, para não ficarem atrás da tabela.
      for (const far of [false, true]) {
        for (const side of [-1, 1]) {
          for (const [row, dx, z] of [[1, 1.9, 0.9], [0, 2.9, 0.45]] as const) {
            for (let k = 0; k < 2; k++) {
              n++;
              const x = far ? STAND.farX - dx : STAND.nearX + dx;
              if (((n * 2654435761) >>> 0) / 4294967296 < 0.6 * fill) this.fans.push({ x, y: side * (4.4 + k * 1.6) + row * 0.5, z, look: looks[n % looks.length]!, phase: n, flip: far, flag: false, front: row === 0, zeal: ((n * 2654435761) >>> 0) / 4294967296 });
            }
          }
        }
      }
      // E quem vê do lado de fora da rede, encostado a ela.
      // Pela ordem em que chegam: com pouca gente só os primeiros, com casa cheia todos.
      const spots = [[2.2, STAND.y - 0.9], [3.4, STAND.y - 0.7], [9.5, STAND.y - 0.8], [18.8, STAND.y - 0.9], [20.1, STAND.y - 0.7], [26, STAND.y - 0.8], [STAND.nearX - 0.9, 1.2], [STAND.farX + 0.9, -0.6],
        [7, STAND.y - 0.8], [14.2, STAND.y - 0.9], [23.2, STAND.y - 0.7], [0.6, STAND.y - 0.8], [11.6, STAND.y - 0.7], [29.4, STAND.y - 0.9], [STAND.nearX - 0.9, -2.2], [STAND.farX + 0.9, 2.4], [5.6, STAND.y - 0.8], [16.6, STAND.y - 0.8]] as const;
      for (const [k, [x, y]] of spots.entries()) {
        const i = k + 3;
        if (k / spots.length > fill - 0.3) continue;
        this.outsiders.push({ x, y, look: looks[i % looks.length]!, phase: i, flip: x > 14 });
      }
      this.fence = this.fenceLayer();
    }
    if (theme.crowd) {
      // Quanta mais confiança na direção, mais gente vem ver: de um terço da bancada a casa cheia.
      const density = Math.min(0.98, theme.crowd.density * fill);
      const seat = (n: number): number => ((n * 2654435761) >>> 0) / 4294967296;
      let n = 1;
      // De trás para a frente, para quem está à frente tapar quem está atrás.
      for (let row = fanRows(theme) - 1; row >= 0; row--) {
        const side = sideFanSpot(theme, row);
        // Cada fila vai de canto a canto da bancada, que recua ao subir; à frente do túnel ninguém se senta.
        for (let x = endFanSpot(theme, false, row).x + 0.7 + (row % 2) * (FAN_SPACING / 2); x < endFanSpot(theme, true, row).x - 0.5; x += FAN_SPACING) {
          if (side.z < TUNNEL.height + 0.3 && x > TUNNEL.x0 - 0.5 && x < TUNNEL.x1 + 0.5) continue;
          if (seat(n++) < density) this.fans.push({ x, y: side.y, z: side.z, look: looks[n % looks.length]!, phase: n, flip: n % 3 === 0, flag: seat(n * 7 + 3) < 0.05, front: row === 0, zeal: ((n * 2654435761) >>> 0) / 4294967296 });
        }
        for (const far of [false, true]) {
          const end = endFanSpot(theme, far, row);
          for (let y = side.y + 0.7 + (row % 2) * (FAN_SPACING / 2); y < 9; y += FAN_SPACING) {
            if (seat(n++) < density) this.fans.push({ x: end.x, y, z: end.z, look: looks[n % looks.length]!, phase: n, flip: far, flag: false, front: false, zeal: ((n * 2654435761) >>> 0) / 4294967296 });
          }
        }
      }
    }
    this.coaches = [coachLook(home), coachLook(away)];
    // Quem adormece numa goleada: um da primeira fila perto do meio da bancada, onde a câmara passa mais.
    const front = this.fans.map((f, i) => ({ f, i })).filter(({ f }) => f.front);
    const spot = 8 + roll(5) * 12;
    this.sleeperFan = front.reduce((best, c) => (best < 0 || Math.abs(c.f.x - spot) < Math.abs(this.fans[best]!.x - spot) ? c.i : best), -1);
    // Uma repetição começa a meio do jogo: o pombo já lá não está.
    if (state) this.humor.pigeon = false;
    this.refereeLook = { ...lookOf({ ...home.roster[0]!, name: 'Árbitro' }, 'referee'), style: 0, legs: 7, torso: 7, build: 'athletic' };
    this.camera.aim(...this.cameraTarget());
    // Num jogo já a meio, o que aconteceu antes não se mostra: nem balões, nem poses, nem sons.
    this.seenEvents = state ? state.events.length : 0;
    if (state) for (let p = 0; p < state.period; p++) this.periodScores.forEach(scores => scores.push(0));
    this.processEvents();
  }

  /** Chamado quando a janela muda de tamanho. */
  resize(): void {
    const { canvas } = this.g;
    this.image = this.g.createImageData(canvas.width, canvas.height);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.camera.setViewport(canvas.width, canvas.height);
    if (this.fence) this.fence = this.fenceLayer();
  }

  private fenceLayer(): { image: ImageData; pixels: Uint32Array; canvas: HTMLCanvasElement } {
    const { canvas } = this.g;
    const image = this.g.createImageData(canvas.width, canvas.height);
    const layer = document.createElement('canvas');
    layer.width = canvas.width;
    layer.height = canvas.height;
    return { image, pixels: new Uint32Array(image.data.buffer), canvas: layer };
  }

  /** Uma paragem com a equipa junta ao banco: desconto, ou fim de período sem ser o intervalo. */
  holding(): boolean {
    return this.s.phase === 'timeout' || (this.s.phase === 'break' && this.s.period !== 2);
  }

  private cameraTarget(): [number, number] {
    const { ball } = this.s;
    // Na paragem olha-se para o banco da casa, inclinado para baixo.
    if (this.holding()) return [HUDDLE_CENTRE[0][0] + 1.5, -1.5];
    // No início, toda a gente está à volta do círculo: olha-se para o meio do campo.
    if (this.s.phase === 'intro' || this.s.phase === 'jump') return [ball.x, this.camera.tuning.lookY];
    // Olhar um pouco à frente da bola, para o cesto atacado ficar sempre à vista. Quando a bola desce para a linha de baixo,
    // a câmara inclina-se, senão quem a tem ficava cortado pelo fundo do ecrã.
    const secondHalf = this.s.period >= 3;
    const attacksRight = (this.s.offense === 0) !== secondHalf;
    const lookY = this.camera.tuning.lookY;
    return [Math.max(5.4, Math.min(22.6, ball.x + (attacksRight ? 3 : -3))), lookY];
  }

  private findBody(e: MatchEvent): Body | undefined {
    return this.s.bodies.find(b => b.team === e.team && b.player.name === e.player);
  }

  /** A equipa da casa, por quem a bancada torce. */
  private get crowdTeam(): TeamIndex {
    return this.s.visitor === 0 ? 1 : 0;
  }

  /** Um adepto à vista diz qualquer coisa. Num pavilhão sem público, ninguém diz nada. */
  private crowdSay(label: string): void {
    const { s, camera } = this;
    const near = this.fans.map((f, i) => i).filter(i => this.fans[i]!.front && Math.abs(this.fans[i]!.x - camera.lookX) < 5.5);
    if (near.length === 0) return;
    this.bubbles.push({ label, fan: near[(s.tick * 7919 + this.bubbles.length * 131) % near.length]!, born: s.tick });
  }

  /** A próxima frase de um contexto, sem repetir até se esgotarem. */
  private crowdPick(mood: CrowdMood): string {
    const n = this.crowdSaid.get(mood) ?? 0;
    this.crowdSaid.set(mood, n + 1);
    return crowdLine(mood, this.crowdSeed, n);
  }

  /** Pontos de avanço da casa: a bancada muda de tom quando o jogo está decidido ou por um fio. */
  private get crowdLead(): number {
    return this.s.score[this.crowdTeam] - this.s.score[this.crowdTeam === 0 ? 1 : 0];
  }

  private get crowdTense(): boolean {
    return this.s.period >= 4 && this.s.clock <= seconds(60) && Math.abs(this.crowdLead) <= 3;
  }

  /** Uma vez em cada `every` momentos parecidos, para os balões não taparem o jogo. Depende só do tempo de jogo. */
  private crowdChance(every: number): boolean {
    return (this.s.tick * 2654435761 >>> 0) % every === 0;
  }

  /** Os adeptos festejam ou baixam a cabeça durante uns instantes. `level` diz quantos se levantam: 0,3 é um cesto
   * qualquer, 1 é toda a gente. */
  private fansReact(happy: boolean, ticks: number, level = 0.6): void {
    if (happy) {
      this.fansCheerUntil = this.s.tick + ticks;
      this.fansCheerTicks = ticks;
      this.fansCheerLevel = level;
    } else this.fansSadUntil = this.s.tick + ticks;
  }

  /** Quanto vale um cesto para a bancada: mais num triplo ou afundanço, muito mais se for decisivo, no fim de um jogo
   * equilibrado, ou sobre o apito. */
  private basketWorth(e: MatchEvent, dunk: boolean): number {
    const { s } = this;
    let worth = e.points === 3 || dunk ? 0.6 : 0.35;
    const lead = s.score[e.team] - s.score[e.team === 0 ? 1 : 0];
    const late = s.period >= 4 && s.clock <= seconds(60);
    if (late && Math.abs(lead) <= 6) worth += 0.35;
    if (s.clock <= 20) worth += 0.25;
    if (Math.abs(lead) >= 20) worth -= 0.15;
    return Math.max(0.25, Math.min(1, worth));
  }

  private nearestOpponent(body: Body): Body | undefined {
    const others = this.s.court[body.team === 0 ? 1 : 0];
    const d2 = (o: Body): number => (o.x - body.x) * (o.x - body.x) + (o.y - body.y) * (o.y - body.y);
    return [...others].sort((a, b) => d2(a) - d2(b))[0];
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
          if (s.period === 3) this.fadeInUntil = s.tick + FADE_IN_TICKS;
          break;
        case 'shot': {
          if (!body) break;
          const dunk = e.dunk === true;
          // No lay-up e no step-back não há pose fixa: `poseOf` segue o voo. De costas no poste, lança-se de gancho.
          // Quem afunda salta até à mão tocar no aro, no fim do lance, e as poses seguem as fases do salto (`dunkLift`).
          if (dunk && s.flight?.kind === 'shot') this.view(body).dunkJump = { start: s.tick, up: Math.max(DUNK_CROUCH_TICKS + 2, s.flight.total) };
          else if (!e.layup && this.view(body).stepBack !== s.tick) this.view(body).override = { pose: dunk ? 'dunk' : s.posting === body ? 'hook' : 'shoot', until: s.tick + (dunk ? 12 : SHOT_JUMP_TICKS) };
          // O lançador sobe e desce num arco e só se mexe quando aterra; a pose dura exatamente o salto.
          if (!e.layup && !dunk && body) this.view(body).shotJump = s.tick;
          // Quem está em cima do lançador salta de braços no ar para o tentar abafar.
          const contester = this.nearestOpponent(body);
          if (contester && (contester.x - body.x) * (contester.x - body.x) + (contester.y - body.y) * (contester.y - body.y) < CONTEST_RANGE * CONTEST_RANGE) this.view(contester).override = { pose: 'block', until: s.tick + 10 };
          break;
        }
        case 'made': {
          this.addPoints(e, e.points!);
          const dunk = body ? this.dunking(body) : false;
          this.announceMade(e, body);
          const decisive = s.clock <= 20 || (s.period >= 4 && s.clock < 600 && s.score[e.team] - s.score[e.team === 0 ? 1 : 0] <= e.points! && s.score[e.team] > s.score[e.team === 0 ? 1 : 0]);
          // Quem afunda só festeja depois de aterrar.
          const jump = body && this.view(body).dunkJump;
          if (jump) jump.cheer = decisive ? 'fists' : 'cheer1';
          else if (body) this.view(body).override = { pose: decisive ? 'fists' : 'cheer1', until: s.tick + CHEER_TICKS };
          if (dunk && body) {
            const beaten = this.nearestOpponent(body);
            if (beaten) this.view(beaten).override = { pose: 'handsHead', until: s.tick + 12 };
            this.coachUpsetUntil[e.team === 0 ? 1 : 0] = s.tick + 16;
          }
          if (e.team === this.crowdTeam) {
            if (dunk) this.crowdSay(this.crowdPick('dunk'));
            else if (decisive || this.crowdTense) this.crowdSay(this.crowdPick('close'));
            else if (e.points === 3) this.crowdSay(this.crowdPick('three'));
            else if (this.crowdLead >= 15 && this.crowdChance(2)) this.crowdSay(this.crowdPick('bigLead'));
          } else if (this.crowdTense) this.crowdSay(this.crowdPick('close'));
          else if (this.crowdLead <= -15 && (e.points === 3 || dunk || this.crowdChance(2))) this.crowdSay(this.crowdPick('bigDeficit'));
          else if (e.points === 3 || dunk) this.crowdSay(this.crowdPick('rivalBig'));
          break;
        }
        case 'freeThrowMade':
          this.addPoints(e, 1);
          this.floaters.push({ label: '+1', x: this.attackedHoop(e.team), y: 0, z: 3.05, born: s.tick });
          this.swishUntil = s.tick + SWISH_TICKS;
          this.swishHoop = this.attackedHoop(e.team);
          callbacks.sound('swish');
          break;
        case 'missed':
          callbacks.sound('rim');
          if (e.team !== this.crowdTeam && this.crowdChance(3)) this.crowdSay(this.crowdPick('miss'));
          break;
        case 'freeThrowMissed':
          callbacks.sound('rim');
          if (e.team !== this.crowdTeam && this.crowdChance(2)) this.crowdSay(this.crowdPick('miss'));
          if (body) this.view(body).override = { pose: 'slump', until: s.tick + 10 };
          break;
        case 'block':
          if (body) this.view(body).override = { pose: 'swat', until: s.tick + 12 };
          this.excitedUntil = s.tick + 24;
          if (e.team === this.crowdTeam) this.fansReact(true, 16);
          callbacks.sound('block');
          callbacks.announce('Desarme!');
          if (e.team === this.crowdTeam) this.crowdSay(this.crowdPick('miss'));
          break;
        case 'rebound':
          // Apanhada no ar, de braços no ar; do chão, baixa-se a agarrá-la.
          if (body) {
            const high = s.ball.z >= 1;
            // Apanhada em cima, a duas mãos, no meio do salto; quem chega sem ter saltado salta agora.
            if (high && this.view(body).reboundJump === undefined) this.view(body).reboundJump = s.tick - 4;
            this.view(body).override = high ? { pose: 'grab', until: s.tick + 8, withBall: true } : { pose: 'gather', until: s.tick + 8, withBall: true };
          }
          break;
        case 'steal':
          callbacks.sound('steal');
          if (e.team === this.crowdTeam) this.fansReact(true, 16);
          // O braço estendido a cortar a bola, tanto num roubo como numa interceção.
          if (body) {
            // Um passe comprido cortado a meio chega alto: o intercetador salta e apanha-o lá em cima, como num ressalto.
            const high = s.ball.z > INTERCEPT_JUMP_HEIGHT;
            if (high && this.view(body).reboundJump === undefined) this.view(body).reboundJump = s.tick - 4;
            this.view(body).override = { pose: high ? 'grab' : 'snatch', until: s.tick + 8, withBall: true };
          }
          break;
        case 'tipOff':
          callbacks.sound('whistle');
          this.tip = { a: s.jump!.a, b: s.jump!.b, start: s.tick, total: s.jump!.total };
          this.refereeSignal(null, 8);
          this.crowdSay(this.crowdPick(this.street ? 'street' : this.s.visitor === 0 ? 'away' : 'home'));
          break;
        case 'bump':
          if (e.hard) {
            callbacks.sound('bump');
            // Quem empurra abre os braços; quem perde já cambaleia, porque fica atordoado.
            if (body && body !== s.holder) this.view(body).override = { pose: 'shove', until: s.tick + 6 };
          }
          break;
        case 'foul':
          callbacks.sound('whistle');
          this.refereeSignal('FALTA');
          // Quem fez a falta protesta, e o treinador dele também.
          if (body) this.view(body).override = { pose: 'handsHead', until: s.tick + 8 };
          this.coachUpsetUntil[e.team] = s.tick + 12;
          if (e.team === this.crowdTeam) this.crowdSay(this.crowdPick('foul'));
          break;
        case 'periodEnd':
          callbacks.sound('buzzer');
          this.refereeSignal(null);
          // No fim do último período quem fala é o apito final.
          if (s.period < 4) this.crowdSay(this.crowdPick(this.street ? 'street' : this.crowdLead >= 15 ? 'bigLead' : this.crowdLead <= -15 ? 'bigDeficit' : this.s.visitor === 0 ? 'away' : 'home'));
          break;
        case 'end':
          this.excitedUntil = s.tick + 100000;
          this.fansReact(s.score[this.crowdTeam] > s.score[this.crowdTeam === 0 ? 1 : 0], 100000);
          this.crowdSay(this.crowdPick(this.crowdLead > 0 ? 'endWin' : 'endLoss'));
          break;
        case 'timeout':
          callbacks.sound('whistle');
          callbacks.sound('horn');
          callbacks.announce(`Desconto: ${s.teams[e.team].short}`);
          this.refereeSignal(null);
          if (e.team !== this.crowdTeam) this.crowdSay(this.crowdPick('timeout'));
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
            if (e.move === 'crossover') this.view(body).override = { pose: 'crossover', until: s.tick + 8, withBall: true };
            if (e.move === 'pickpocket') this.view(body).override = { pose: 'snatch', until: s.tick + 8, withBall: true };
            if (e.move === 'stepBack') {
              this.view(body).slide = { ...this.view(body).prev, start: s.tick };
              this.view(body).stepBack = s.tick;
            }
            this.floaters.push({ label: MOVE_LABELS[e.move!], x: body.x, y: body.y, z: 2.6, born: s.tick, body });
          }
          this.excitedUntil = s.tick + 30;
          if (e.team === this.crowdTeam) this.fansReact(true, 24);
          callbacks.sound('bigCheer');
          callbacks.announce(`${MOVE_INFO[e.move!].name}!`);
          break;
        case 'knockdown':
          callbacks.sound('bump');
          this.excitedUntil = s.tick + 15;
          break;
        case 'turnover':
          callbacks.sound('whistle');
          this.refereeSignal('FORA');
          // Quem deixou a bola escapar ainda se estica atrás dela.
          if (body) this.view(body).override = { pose: 'fumble', until: s.tick + 8 };
          break;
        case 'substitution': {
          // Quem entra já sai do seu lugar no banco, na simulação; quem sai vai a correr sentar-se, no tempo que a simulação lhe dá.
          const outgoing = s.bodies.find(b => b.team === e.team && b.player.name === e.other);
          if (body && outgoing) {
            const seat = this.seatOf(outgoing);
            // Do lugar sentado até à beira do banco, onde a simulação o põe, à velocidade de quem corre.
            this.view(body).slide = { x: body.x, y: BENCH_Y, start: s.tick, ticks: Math.max(1, seconds((body.y - BENCH_Y) / B.baseSpeed)) };
            this.exits.push({ body: outgoing, from: { ...this.view(outgoing).prev }, to: seat, start: s.tick, ticks: e.ticks ?? 1 });
          }
          // Várias trocas na mesma paragem só dão um toque de buzzer.
          if (this.lastHornTick !== s.tick) {
            callbacks.sound('horn');
            if (e.team === this.crowdTeam) this.crowdSay(this.crowdPick('sub'));
          }
          this.lastHornTick = s.tick;
          break;
        }
      }
    }
  }

  /** O lugar de um jogador no banco, por ordem do plantel. */
  private seatOf(b: Body): Point {
    const benchers = this.s.bodies.filter(x => x.team === b.team && x.slot === -1);
    return { x: BENCH_START_X[b.team] + Math.max(0, benchers.indexOf(b)) * BENCH_SPACING, y: BENCH_Y };
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
    } else if (s.phase === 'freeThrow' && s.freeThrow && (s.freeThrow.returning || s.timer <= B.freeThrowSeconds * 20)) {
      // Nos lances livres fica debaixo do cesto, um pouco ao lado, para apanhar a bola e a passar ao lançador.
      const hoop = this.attackedHoop(s.freeThrow.shooter.team);
      targetX = hoop > 14 ? 28 - B.freeThrowRefereeU : B.freeThrowRefereeU;
      targetY = B.freeThrowRefereeV;
    } else if (s.phase === 'freeThrow' && s.ball.z < 1.9 && s.freeThrow && Math.hypot(s.ball.x - s.freeThrow.shooter.x, s.ball.y - s.freeThrow.shooter.y) > 0.4) {
      // Antes do primeiro lance, é o árbitro que vai buscar a bola e a leva ao lançador.
      targetX = s.ball.x;
      targetY = s.ball.y + 0.3;
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

  /** O salto do afundanço, em píxeis: sobe durante o lance até a mão chegar ao aro, e cai logo a seguir. */
  /** O arco do salto de quem lança: começa com os pés no chão (a pose já os traz 6 px acima), sobe e volta ao chão
   * no instante em que a pose acaba, para não dar um salto de píxeis ao aterrar. */
  private shotLift(b: Body, alpha: number): number {
    const start = this.view(b).shotJump;
    if (start === undefined) return 0;
    const t = (this.s.tick + alpha - start) / SHOT_JUMP_TICKS;
    if (t >= 1) {
      this.view(b).shotJump = undefined;
      return 0;
    }
    return -SHOOT_POSE_FEET + 4 * (SHOOT_POSE_FEET + SHOT_JUMP_HEIGHT) * t * (1 - t);
  }

  /** Se o lance em curso deste jogador é um afundanço. */
  private dunking(b: Body): boolean {
    const view = this.view(b);
    return view.dunkJump !== undefined || view.override?.pose === 'dunk';
  }

  /** O salto do afundanço, em píxeis, e onde se desenha quem afunda (`x`, `y`, no campo). Agacha-se com a bola, sobe a
   * abrandar até a mão chegar ao aro no fim do lance, fica pendurado no aro um instante, em tempo real para se ver a
   * qualquer velocidade e preso ao sítio onde chegou, cai a acelerar e aterra a fletir as pernas. Só então festeja. */
  private dunkLift(b: Body, alpha: number, x: number, y: number): { lift: number; x: number; y: number } {
    const view = this.view(b);
    const jump = view.dunkJump;
    if (!jump) return { lift: 0, x, y };
    const now = this.s.tick + alpha;
    const t = now - jump.start;
    jump.withBall = t < jump.up;
    if (t < DUNK_CROUCH_TICKS) {
      jump.pose = 'gather';
      return { lift: 0, x, y };
    }
    jump.pose = 'dunk';
    if (t < jump.up) {
      const u = (t - DUNK_CROUCH_TICKS) / (jump.up - DUNK_CROUCH_TICKS);
      return { lift: DUNK_LIFT * (1 - (1 - u) * (1 - u)), x, y };
    }
    const pin = (jump.pin ??= { x, y });
    jump.hangEnd ??= this.realTime + DUNK_HANG_SECONDS;
    if (this.realTime < jump.hangEnd) return { lift: DUNK_LIFT, ...pin };
    // A queda começa quando a paragem acabou, e não no frame em que se deu por isso.
    jump.fallFrom ??= now - (this.realTime - jump.hangEnd) * this.simPerReal * 20;
    const d = (now - jump.fallFrom) / DUNK_FALL_TICKS;
    if (d < 1) return { lift: DUNK_LIFT * (1 - d * d), x: pin.x + (x - pin.x) * d, y: pin.y + (y - pin.y) * d };
    if (d < 1 + DUNK_LAND_TICKS / DUNK_FALL_TICKS) {
      jump.pose = 'gather';
      return { lift: 0, x, y };
    }
    jump.pose = 'gather';
    view.dunkJump = undefined;
    if (jump.cheer) view.override = { pose: jump.cheer, until: this.s.tick + CHEER_TICKS };
    return { lift: 0, x, y };
  }

  /** O salto ao ressalto, em píxeis acima do chão: um arco que começa antes de a bola chegar. */
  private reboundLift(b: Body, alpha: number): number {
    const start = this.view(b).reboundJump;
    if (start === undefined) return 0;
    const t = (this.s.tick + alpha - start) / REBOUND_JUMP_TICKS;
    if (t >= 1) {
      this.view(b).reboundJump = undefined;
      return 0;
    }
    return t > 0 ? 4 * REBOUND_JUMP_HEIGHT * t * (1 - t) : 0;
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
        if (e.team === this.crowdTeam) this.crowdSay(this.crowdPick('run'));
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
    const dunk = this.dunking(body!);
    const loud = e.points === 3 || dunk;
    const worth = this.basketWorth(e, dunk);
    this.excitement = worth;
    this.excitedUntil = s.tick + Math.round(18 + 40 * worth);
    this.fansReact(e.team === this.crowdTeam, e.team === this.crowdTeam ? Math.round(20 + 50 * worth) : 30, worth);
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

  /** Antes da bola ao alto: a hipótese de ganharmos, e a bancada já a festejar se a confiança estiver alta. */
  showForecast(ours: number, confident: boolean): void {
    this.forecast = { ours, confident };
    if (confident) this.fansReact(true, 120);
  }

  /** O prognóstico por cima do campo, com as barras a crescer. */
  private drawForecast(): void {
    const { g, s, camera, forecast } = this;
    if (!forecast || s.phase !== 'intro' || s.period !== 1) return;
    // A barra começa dividida ao meio e a fronteira desliza, a abrandar, até ao prognóstico; os números acompanham-na.
    const t = Math.min(1, (s.tick + 4) / 30);
    const eased = 1 - (1 - t) * (1 - t);
    const share = 50 + (forecast.ours - 50) * eased;
    const w = Math.min(camera.width - 16, 300);
    const x = (camera.width - w) >> 1;
    // No fundo do campo: no meio tapava o círculo central e o emblema, que são o que a entrada das equipas mostra.
    const y = camera.height - 58;
    g.fillStyle = 'rgba(27,34,48,0.88)';
    g.fillRect(x, y, w, 52);
    g.fillStyle = '#f2c230';
    g.fillRect(x, y, w, 2);
    text(g, 'PROGNÓSTICO', x + ((w - textWidth('PROGNÓSTICO', 1)) >> 1), y + 6, '#f2c230', 1);
    const ours = Math.round(share);
    text(g, `${s.teams[0].short} ${ours}%`, x + 6, y + 14, '#fbf6e2', 2);
    const right = `${100 - ours}% ${s.teams[1].short}`;
    text(g, right, x + w - 6 - textWidth(right, 2), y + 14, '#fbf6e2', 2);
    const barY = y + 32;
    const inner = w - 12;
    const split = Math.round((inner * share) / 100);
    g.fillStyle = '#2b5fd9';
    g.fillRect(x + 6, barY, split, 6);
    g.fillStyle = '#cf3a2c';
    g.fillRect(x + 6 + split, barY, inner - split, 6);
    if (this.spectators > 0) {
      const crowd = `${String(this.spectators).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ESPECTADORES`;
      text(g, crowd, x + ((w - textWidth(crowd, 1)) >> 1), y + 44, '#c8c2b0', 1);
    }
  }

  /** Afina a câmara e salta logo para o enquadramento novo. Serve para experimentar posições. */
  tuneCamera(t: Partial<Camera['tuning']>): void {
    this.camera.tune(t);
    this.snapCamera();
  }

  /** Põe a câmara logo no sítio certo, sem o movimento suave. */
  snapCamera(): void {
    this.camera.aim(...this.cameraTarget());
  }

  /** Avança um passo da simulação. */
  /** Quantas nuvens de poeira há no chão: a verificação confirma que quem sprinta as deixa. */
  puffCount(): number {
    return this.puffs.length;
  }

  stepSim(): void {
    const { s } = this;
    for (const b of s.bodies) {
      const point = this.view(b).prev;
      point.x = b.x;
      point.y = b.y;
    }
    this.ballPrevious = { ...this.ball };
    const receiver = s.flight?.kind === 'pass' ? s.flight.target : null;
    step(s);
    // O passe chega às mãos de quem o esperava.
    if (receiver && !s.flight && s.holder === receiver) this.callbacks.sound('catch');
    const target = s.ball;
    // A bola segue a simulação à risca quando voa por um caminho certo: lançamentos, passes, ressaltos, lances livres e bola ao alto.
    if (s.flight || s.loose || s.phase === 'freeThrow' || s.phase === 'jump') {
      this.ball = { ...target };
    } else {
      // Quando a bola muda de sítio de repente, como no ressalto, desliza em vez de saltar.
      this.ball.x += (target.x - this.ball.x) * 0.45;
      this.ball.y += (target.y - this.ball.y) * 0.45;
      this.ball.z += (target.z - this.ball.z) * 0.45;
    }
    this.updateMotion();
    this.updateReferee();
    // Quem está debaixo de um ressalto alto salta antes de a bola chegar, de braços no ar; se ela já caiu, apanha-se em baixo.
    const loose = s.loose;
    if (loose && loose.chasers.length > 0 && s.timer > 0 && s.timer <= REBOUND_JUMP_AHEAD && B.reboundCatchHeight >= 1) {
      for (const c of loose.chasers) {
        if (this.view(c).reboundJump === undefined && Math.hypot(c.x - loose.toX, c.y - loose.toY) < 1.3) this.view(c).reboundJump = s.tick;
      }
    }
    // Os dribles da rotina do lance livre também se ouvem.
    const shooter = s.phase === 'freeThrow' ? this.ballInHands() : null;
    const routinePose = shooter ? this.freeThrowPose(shooter) : null;
    if (routinePose === 'drib0' && this.lastFreeThrowPose !== 'drib0') this.callbacks.sound('bounce');
    this.lastFreeThrowPose = routinePose;
    if (s.holder && s.tick >= this.nextDribbleTick) {
      this.nextDribbleTick = s.tick + 8;
      this.callbacks.sound('bounce');
    }
    this.processEvents();
  }

  private view(b: Body): BodyView {
    return this.views.get(b)!;
  }

  private motionOf(b: Body): Motion {
    return this.view(b).motion;
  }

  /** Corre uma vez por passo da simulação, e não por imagem desenhada. */
  private updateMotion(): void {
    const { s, camera } = this;
    const ballX = camera.project(this.ball.x, this.ball.y)[0];
    const inHands = this.ballInHands();
    // A poeira some ao fim do seu tempo; a sprintar, cada passo largo deixa uma nuvem atrás dos pés.
    while (this.puffs.length > 0 && s.tick - this.puffs[0]!.born >= PUFF_TICKS) this.puffs.shift();
    for (const b of [...s.court[0], ...s.court[1]]) {
      const m = this.motionOf(b);
      if (m.moving && s.tick % 4 === b.slot % 4 && isSprinting(s, b)) {
        const prev = this.view(b).prev;
        this.puffs.push({ x: prev.x, y: prev.y, born: s.tick, side: (s.tick >> 2) % 2 ? 1 : -1 });
      }
      // Quem tem a bola nas mãos olha para onde a vai mandar: o lançador de livres e o portador para o cesto,
      // quem repõe para quem vem receber. Assim não se viram de repente no momento de passar ou lançar.
      let faceX = ballX;
      // Na roda do desconto, toda a gente olha para o treinador.
      if (this.holding()) faceX = camera.project(HUDDLE_CENTRE[b.team][0], HUDDLE_CENTRE[b.team][1])[0];
      if (b === inHands) {
        const receiver = s.phase === 'dead' && s.inbound ? s.inbound.receivers[0]?.body : undefined;
        faceX = receiver ? camera.project(receiver.x, receiver.y)[0] : camera.project(this.attackedHoop(b.team), 0)[0];
      }
      const prev = this.view(b).prev;
      const [sx, sy] = camera.project(b.x, b.y);
      const [px, py] = camera.project(prev.x, prev.y);
      const speed = Math.sqrt((b.x - prev.x) * (b.x - prev.x) + (b.y - prev.y) * (b.y - prev.y)) * 20;
      m.vx = m.vx * 0.75 + (sx - px) * 0.25;
      m.vy = m.vy * 0.75 + (sy - py) * 0.25;
      m.speed = m.speed * 0.7 + speed * 0.3;
      // Limites diferentes para arrancar e para parar, para não alternar entre correr e estar parado.
      m.moving = m.moving ? m.speed > 0.4 : m.speed > 1;
      // Parado, só se vira quando a bola passa claramente para o outro lado.
      const idleFlip = faceX < sx - IDLE_TURN_MARGIN ? true : faceX > sx + IDLE_TURN_MARGIN ? false : m.flip;
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
    // A sprintar, as pernas mexem-se mais depressa.
    const frame = Math.floor(s.tick / (moving && isSprinting(s, b) ? 1.6 : 2.5));
    if (s.phase === 'end') {
      const won = s.score[b.team] > s.score[b.team === 0 ? 1 : 0];
      return { pose: won ? ((frame + b.slot) % 4 < 2 ? 'cheer0' : 'cheer1') : 'slump', withBall: false };
    }
    const override = this.view(b).override;
    // A bola ao alto: primeiro fletem as pernas, e depois saltam de braços no ar.
    const { tip } = this;
    if (tip && (tip.a === b || tip.b === b)) {
      const risesAt = tip.start + tip.total * TIP_RISE;
      if (s.tick < risesAt) return { pose: 'defend', withBall: false };
      if (s.tick < risesAt + tip.total * (1 - TIP_RISE) * 2) return { pose: 'tip', withBall: false };
    }
    if (b.fallenUntil > s.tick) {
      // Tropeça, fica no chão, e os últimos instantes são a levantar-se.
      const since = s.tick - b.fallenFrom;
      const left = b.fallenUntil - s.tick;
      const pose: PoseName = since < 2 ? 'stumble' : since < 4 ? 'fallA' : since < 6 ? 'fallB' : left > 10 ? 'fallen' : left > 5 ? 'getup1' : 'getup2';
      return { pose, withBall: false };
    }
    if (b.stunnedUntil > s.tick) return { pose: b.stunKind === 'ankle' ? (frame % 2 ? 'ankle1' : 'ankle0') : 'stumble', withBall: false };
    const dunk = this.view(b).dunkJump;
    if (dunk?.pose) return { pose: dunk.pose, withBall: dunk.withBall === true };
    if (override && override.until > s.tick) return { pose: override.pose, withBall: override.withBall === true };
    // O lay-up acompanha o voo: o passo de chamada, o impulso a uma perna e o braço esticado em cima. A bola vai pela simulação.
    const flight = s.flight;
    if (flight?.kind === 'shot' && flight.layup && !flight.blockedBy && flight.shooter === b) {
      const t = flight.ticks / Math.max(1, flight.total);
      return { pose: t < 0.3 ? 'layupStep' : t < 0.6 ? 'layupRise' : 'layupTop', withBall: false };
    }
    if (s.phase === 'freeThrow') {
      if (this.ballInHands() === b) return { pose: this.freeThrowPose(b), withBall: true };
      const shooting = s.freeThrow?.shooter === b && s.timer < seconds(B.freeThrowFlightSeconds);
      return { pose: shooting ? 'shoot' : 'idle', withBall: false };
    }
    // Quem vai repor leva a bola nas mãos até à linha.
    if (s.phase === 'dead' && s.inbound?.hasBall && s.inbound.passer === b) return { pose: moving ? HOLD_RUN_FRAMES[frame % 4]! : 'hold', withBall: true };
    // A pose de passe só no instante do passe, e só parado: a correr, as pernas continuam a mexer.
    if (s.flight?.kind === 'pass' && s.flight.passer === b && s.flight.ticks < PASS_POSE_TICKS && !moving) return { pose: s.flight.lob ? 'lob' : this.isBouncePass(s.flight) ? 'bouncePass' : 'pass', withBall: false };
    // No ar à espera do ressalto, de braços esticados.
    const leap = this.view(b).reboundJump;
    if (leap !== undefined && s.tick - leap < REBOUND_JUMP_TICKS) return { pose: 'leap', withBall: false };
    // Quem recebe um alley-oop salta de braços esticados quando a bola se aproxima.
    if (s.flight?.kind === 'pass' && s.flight.lob && s.flight.target === b && s.flight.ticks / Math.max(1, s.flight.total) > 0.5) return { pose: 'reach', withBall: false };
    // Depois de um step-back, o lançador recua a driblar e lança a cair para trás.
    const stepBack = this.view(b).stepBack;
    if (stepBack !== undefined && s.flight?.kind === 'shot' && s.flight.shooter === b && stepBack >= s.tick - s.flight.ticks - 1) {
      return s.tick - stepBack < STEP_BACK_TICKS / 2 ? { pose: 'stepBack', withBall: false } : { pose: 'fadeaway', withBall: false };
    }
    // De costas no poste: agachado a proteger a bola, a recuar aos poucos; e o defensor encostado a fazer força.
    if (s.posting === b) return { pose: moving ? (frame % 4 < 2 ? 'postStep0' : 'postStep1') : frame % 4 < 2 ? 'post0' : 'post1', withBall: true };
    if (s.posting && b.team !== s.offense && this.nearestOpponent(s.posting) === b) return { pose: 'brace', withBall: false };
    if (s.holder === b) {
      // A correr, as pernas acompanham o drible; parado, só a bola mexe.
      if (moving) return { pose: DRIBBLE_RUN_FRAMES[frame % 4]!, withBall: true };
      return { pose: frame % 4 < 2 ? 'drib0' : 'drib1', withBall: true };
    }
    // Só quem defende o jogador com a bola fica em posição de defesa, a deslizar de lado; os outros andam e correm normalmente.
    const man = b.team !== s.offense && s.phase === 'live' && s.holder && this.nearestOpponent(s.holder) === b ? s.holder : undefined;
    // E só à frente dele, entre ele e o cesto: por trás, corre-se.
    const hoopX = man ? this.attackedHoop(man.team) : 0;
    const inFront = man !== undefined && Math.hypot(b.x - hoopX, b.y) < Math.hypot(man.x - hoopX, man.y);
    const guarding = man !== undefined && inFront && (man.x - b.x) * (man.x - b.x) + (man.y - b.y) * (man.y - b.y) < STANCE_RANGE * STANCE_RANGE;
    if (moving && guarding) return { pose: frame % 4 < 2 ? 'slide0' : 'slide1', withBall: false };
    if (moving) return { pose: RUN_FRAMES[frame % 4]!, withBall: false };
    if (s.screen?.by === b) return { pose: 'screen', withBall: false };
    // Na paragem, junto ao banco, bebe-se água à vez.
    if (s.phase === 'break' || s.phase === 'timeout') return { pose: ((this.animTick >> 5) + b.slot) % 3 === 0 ? 'drink' : 'idle', withBall: false };
    return { pose: guarding ? 'defend' : 'idle', withBall: false };
  }

  /** Um passe é picado quando um defensor está perto da linha do passe e a bola não vem de um ressalto. */
  private isBouncePass(f: { fromX: number; fromY: number; fromZ: number | null; lob: boolean; target: Body; passer: Body }): boolean {
    let bounce = this.bounces.get(f);
    if (bounce === undefined) {
      const dx = f.target.x - f.fromX;
      const dy = f.target.y - f.fromY;
      const len = dx * dx + dy * dy || 1;
      // Só num passe curto, com um defensor a meio da linha: o marcador de quem recebe, colado a ele, não conta, senão quase
      // todos os passes eram picados, mesmo de longe.
      bounce = !f.lob && f.fromZ === null && len <= 6 * 6 && this.s.court[f.passer.team === 0 ? 1 : 0].some(d => {
        const t = ((d.x - f.fromX) * dx + (d.y - f.fromY) * dy) / len;
        return t > 0.15 && t < 0.8 && Math.hypot(d.x - (f.fromX + dx * t), d.y - (f.fromY + dy * t)) < 0.75;
      });
      this.bounces.set(f, bounce);
    }
    return bounce;
  }

  /** Quem tem a bola nas mãos: o portador, quem vai repor, ou o lançador do lance livre, antes de lançar. */
  private ballInHands(): Body | null {
    const { s } = this;
    if (s.holder) return s.holder;
    if (s.phase === 'dead' && s.inbound?.hasBall) return s.inbound.passer;
    const free = s.freeThrow;
    if (s.phase !== 'freeThrow' || !free || free.returning || s.timer < seconds(B.freeThrowFlightSeconds)) return null;
    return Math.hypot(s.ball.x - free.shooter.x, s.ball.y - free.shooter.y) < 0.4 ? free.shooter : null;
  }

  /** Cada jogador tem a sua rotina no lance livre: quantos dribles, a que ritmo, quanto tempo para, e se roda a bola. */
  private freeThrowPose(b: Body): PoseName {
    let routine = this.view(b).routine;
    if (!routine) {
      let h = 7;
      for (const c of b.player.name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      routine = { dribbles: h % 4, tempo: 4 + ((h >>> 3) % 3), pause: 2 + ((h >>> 6) % 5), spin: (h >>> 9) % 3 === 0 };
      this.view(b).routine = routine;
    }
    // Conta-se para trás a partir do lançamento: subir, fletir, a pausa, os dribles, e antes disso segura a bola.
    let left = this.s.timer - seconds(B.freeThrowFlightSeconds);
    if (left < 3) return 'gather';
    left -= 3;
    if (left < 3) return 'ftDip';
    left -= 3;
    if (left < routine.pause) return routine.spin && left % 2 === 1 ? 'holdSpin' : 'hold';
    left -= routine.pause;
    if (left < routine.dribbles * routine.tempo) return left % routine.tempo < routine.tempo / 2 ? 'drib0' : 'drib1';
    return 'hold';
  }

  /** Onde se desenha a bola no ar. Os bonecos têm sempre o mesmo tamanho em píxeis, seja qual for o ecrã ou a distância:
   * longe do aro, a altura da bola conta-se em píxeis de boneco, para chegar às mãos deles; junto ao aro, conta a câmara,
   * para a bola entrar no cesto. */
  private ballScreen(x: number, y: number, z: number): [number, number] {
    const [gx, gy] = this.camera.project(x, y);
    const [wx, wy] = this.camera.project(x, y, z);
    const hoopX = x < 14 ? HOOP_LEFT : HOOP_RIGHT;
    const dz = z - B.rimHeight;
    const d = Math.sqrt((x - hoopX) * (x - hoopX) + y * y + dz * dz);
    const w = Math.max(0, Math.min(1, (d - 0.5) / 1.5));
    return [wx + (gx - wx) * w, wy + (gy - z * BALL_PX_PER_METRE - wy) * w];
  }

  /** Quem está no banco, a mesa de oficiais e os treinadores. */
  private addSideline(drawables: { y: number; draw: () => void }[], time: number): void {
    const { g, s, camera } = this;
    // A mesa e os bancos estão encostados à parede, por isso desenham-se antes de tudo o resto.
    drawables.push({
      y: -Infinity,
      draw: () => {
        // O túnel fica no centro, por isso a mesa está à direita dele e o banco visitante mais para a ponta.
        drawBox(g, camera, 16.2, 19.4, -10.15, -9.55, 0.75, '#efe3c2', '#2a3040');
        drawBox(g, camera, 4, 11.4, -10.05, -9.8, 0.4, '#3a4252', '#1b2230');
        drawBox(g, camera, 20, 27.4, -10.05, -9.8, 0.4, '#3a4252', '#1b2230');
      },
    });
    for (const team of [0, 1] as const) {
      const benchers = s.bodies.filter(b => b.team === team && b.slot === -1);
      const startX = team === 0 ? 4.4 : 20.3;
      const leaving = new Set(this.exits.filter(e => e.body.team === team).map(e => e.body));
      const cheering = s.tick < this.benchCheerUntil[team] || (s.phase === 'end' && s.score[team] > s.score[team === 0 ? 1 : 0]);
      const inHuddle = s.phase === 'timeout' || (s.phase === 'break' && s.period !== 2);
      // Ao intervalo, o banco e o treinador também vão para o balneário, pelo túnel, a passo mais rápido; voltam na segunda parte.
      const toLocker = s.phase === 'break' && s.period === 2;
      const tunnel = (k: number): Point => ({ x: (team === 0 ? 13.4 : 14.6) + (k % 2) * 0.2, y: -COURT_HALF_WIDTH - 3.8 - k * 0.4 });
      const speed = toLocker ? LOCKER_SPEED : COACH_SPEED;
      benchers.forEach((b, i) => {
        if (leaving.has(b)) return;
        const seat: Point = { x: startX + i * 0.95, y: BENCH_Y };
        // Os três primeiros do banco levantam-se para a roda do desconto, entre os titulares, e voltam a sentar-se no fim.
        const ringSpot = inHuddle && i < 3 ? huddleSpot(team, [1, 3, 5][i]!) : null;
        const pos = this.view(b).huddle ?? { ...seat };
        this.view(b).huddle = pos;
        const target = toLocker ? tunnel(i + 1) : ringSpot ? { x: ringSpot[0], y: ringSpot[1] } : seat;
        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        const dist = Math.hypot(dx, dy);
        const step = Math.min(dist, speed * this.frameSeconds);
        if (dist > 0.001) {
          pos.x += (dx / dist) * step;
          pos.y += (dy / dist) * step;
        }
        const walking = step > 0.006;
        const seated = !ringSpot && dist < 0.01;
        const [sx, sy] = camera.project(pos.x, pos.y);
        const pose: PoseName = cheering && seated ? (Math.floor(s.tick / 3) + i) % 2 ? 'cheer0' : 'cheer1' : seated ? 'sit' : walking ? RUN_FRAMES[Math.floor(time * 6) % 4]! : 'idle';
        const flip = walking ? dx < 0 : HUDDLE_CENTRE[team][0] < pos.x;
        drawables.push({ y: sy, draw: () => drawSprite(g, pose, this.view(b).look, sx, sy, flip, false, false) });
      });
      // O treinador anda à frente do seu banco e para nas pontas, a pensar com a mão no queixo ou a apontar para o campo.
      // Nas paragens vai ter com a equipa, e fala-lhes de prancheta na mão.
      const huddle = s.phase === 'timeout' || (s.phase === 'break' && s.period !== 2);
      const coachBase = team === 0 ? 8 : 23.7;
      // O alvo é a roda da equipa, ou um passeio em frente ao banco; o treinador vai lá a andar, ao seu passo.
      const target: Point = toLocker ? tunnel(0) : huddle ? { x: HUDDLE_CENTRE[team][0], y: HUDDLE_CENTRE[team][1] } : { x: coachBase + Math.sin(time * 0.5 + team * 2) * 2.2, y: COACH_Y };
      const pos = this.coachPos[team] ?? (this.coachPos[team] = { ...target });
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      const dist = Math.hypot(dx, dy);
      const step = Math.min(dist, speed * this.frameSeconds);
      if (dist > 0.001) {
        pos.x += (dx / dist) * step;
        pos.y += (dy / dist) * step;
      }
      const walking = step > 0.006;
      const [cx, cy] = camera.project(pos.x, pos.y);
      const coachFrame = Math.floor(time * 6) % 4;
      const standing: PoseName = (Math.floor(time / 6.3) + team) % 3 === 0 ? 'think' : (Math.floor(time / 6.3) + team) % 3 === 1 ? 'point' : 'idle';
      // Festeja com o banco, protesta nas faltas, fica de mãos na cabeça quando leva um afundanço, e dá instruções no desconto.
      const coachPose: PoseName = s.tick < this.coachUpsetUntil[team] ? 'handsHead' : cheering ? (Math.floor(this.animTick / 3) % 2 ? 'cheer0' : 'fists') : walking ? RUN_FRAMES[coachFrame]! : huddle ? ((this.animTick >> 5) % 3 === 2 ? 'point' : 'board') : standing;
      drawables.push({
        y: cy,
        draw: () => {
          drawShadow(g, cx, cy);
          drawSprite(g, coachPose, this.coaches[team], cx, cy, walking && dx < 0, false, false);
        },
      });
    }
  }

  /** Quem vai a caminho do banco: a andar da última posição em campo até ao seu lugar, e depois senta-se. */
  private addExits(drawables: { y: number; draw: () => void }[], alpha: number): void {
    const { g, s, camera } = this;
    for (let i = this.exits.length - 1; i >= 0; i--) {
      const e = this.exits[i]!;
      const look = this.view(e.body).look;
      const t = (s.tick + alpha - e.start) / e.ticks;
      if (t >= 1) {
        this.exits.splice(i, 1);
        continue;
      }
      const [sx, sy] = camera.project(e.from.x + (e.to.x - e.from.x) * t, e.from.y + (e.to.y - e.from.y) * t);
      const pose = RUN_FRAMES[Math.floor(s.tick / 2.5) % 4]!;
      this.drawn.bodies.set(e.body, { x: sx, y: sy, lift: 0, pose, height: spriteHeight(look) });
      drawables.push({ y: sy, draw: () => drawSprite(g, pose, look, sx, sy, e.to.x < e.from.x, true, false) });
    }
  }

  /** Desenha um frame. `alpha` é a fração entre dois passos da simulação e `simSeconds` o tempo decorrido no jogo. */
  render(alpha: number, simSeconds: number, realSeconds = simSeconds): void {
    const { g, s, camera } = this;
    this.frameSeconds = simSeconds > 0 ? simSeconds : realSeconds;
    this.animTime += this.frameSeconds;
    this.realTime += realSeconds;
    if (realSeconds > 0 && simSeconds > 0) this.simPerReal = simSeconds / realSeconds;
    this.animTick = Math.floor(this.animTime * 20);
    this.drawn.bodies.clear();
    this.drawn.ball = null;
    this.drawn.labels.length = 0;
    const time = this.animTime;
    const { theme } = this.textures;
    const [lookX, lookY] = this.cameraTarget();
    const ease = 1 - Math.exp(-simSeconds * 2.2);
    camera.aim(camera.lookX + (lookX - camera.lookX) * ease, camera.lookY + (lookY - camera.lookY) * ease);
    // Na paragem a imagem aproxima-se do banco da casa, e volta ao normal quando o jogo recomeça; a arte continua a ser
    // desenhada ao tamanho de sempre e é a imagem toda que cresce, por isso fica nítida ao dobro.
    const wantZoom = this.holding() ? 2 : 1;
    this.zoom += (wantZoom - this.zoom) * (1 - Math.exp(-this.frameSeconds * 4));
    if (Math.abs(this.zoom - wantZoom) < 0.01) this.zoom = wantZoom;
    if (this.zoom > 1.001) {
      g.imageSmoothingEnabled = false;
      const [px, py] = camera.project(HUDDLE_CENTRE[0][0], HUDDLE_CENTRE[0][1]);
      const z = this.zoom;
      const tx = Math.max(camera.width * (1 - z), Math.min(0, camera.width / 2 - z * px));
      const ty = Math.max(camera.height * (1 - z), Math.min(0, camera.height / 2 - z * py));
      g.setTransform(z, 0, 0, z, Math.round(tx), Math.round(ty));
    } else {
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
    // Num momento grande levantam-se quase todos (imagens 3 e 4, pessoas diferentes a cada batida); num pequeno, poucos (1 e 2).
    const excited = s.tick < this.excitedUntil;
    const beat = (this.animTick >> 2) % 2;
    const crowdFrame = excited ? (this.excitement >= 0.5 ? 3 : 1) + beat : (this.animTick >> 5) % 3 === 0 ? 1 : 0;
    let fresh = camera.drawScene(this.pixels, this.textures, this.reducedMotion ? 0 : crowdFrame, this.fence?.pixels);
    if (excited && theme.flashes && !this.reducedMotion) {
      // Flashes de fotografia nas bancadas: sujam os píxeis do chão, que têm de se refazer na imagem seguinte.
      const { width, height } = camera;
      // Ao acaso, mas pelo animTick: duas gravações da mesma cena saem iguais.
      for (let i = 0; i < 6; i++) {
        const h = Math.imul(this.animTick * 6 + i + 1, 2654435761) >>> 0;
        const y = h % Math.max(1, Math.floor(height * 0.25));
        const x = (h >>> 8) % width;
        this.pixels[y * width + x] = 0xffffffff;
      }
      camera.forgetScene();
      fresh = true;
    }
    // Com a imagem aproximada, ou com a câmara parada, o chão passa por uma tela à parte: `putImageData` ignora a aproximação,
    // `drawImage` não, e parada a tela já tem a imagem certa. Com a câmara a andar e sem aproximação vai direto, que é uma cópia a menos.
    if (this.zoom > 1.001 || !fresh) {
      if (!this.scene || this.scene.width !== camera.width || this.scene.height !== camera.height) {
        this.scene = document.createElement('canvas');
        this.scene.width = camera.width;
        this.scene.height = camera.height;
        this.sceneStale = true;
      }
      if (fresh || this.sceneStale) {
        this.scene.getContext('2d')!.putImageData(this.image, 0, 0);
        if (this.fence) this.fence.canvas.getContext('2d')!.putImageData(this.fence.image, 0, 0);
      }
      this.sceneStale = false;
      g.drawImage(this.scene, 0, 0);
    } else {
      g.putImageData(this.image, 0, 0);
      if (this.fence) this.fence.canvas.getContext('2d')!.putImageData(this.fence.image, 0, 0);
      this.sceneStale = true;
    }
    this.drawOutsiders();
    if (this.fence) g.drawImage(this.fence.canvas, 0, 0);
    this.drawFans();
    const drawables: { y: number; draw: () => void }[] = [];
    this.addSideline(drawables, time);
    this.addExits(drawables, alpha);
    this.addHumor(drawables);
    for (const hoopX of [HOOP_LEFT, HOOP_RIGHT]) {
      const outward = hoopX < 14 ? -1 : 1;
      const swish = hoopX === this.swishHoop && s.tick < this.swishUntil ? (this.swishUntil - s.tick) / SWISH_TICKS : 0;
      const hoopY = camera.project(hoopX + outward * 0.5, 0, 0)[1];
      drawables.push({ y: hoopY, draw: () => drawHoopBack(g, camera, theme, hoopX, swish) });
      drawables.push({ y: hoopY + HOOP_FRONT_OFFSET, draw: () => drawHoopFront(g, camera, hoopX, swish) });
    }
    // Quem já entrou no túnel deixa de se ver; nos cenários de teste, só quem `visible` deixar.
    const onCourt = [...s.court[0], ...s.court[1]].filter(b => b.y > STAND.y - 0.4 && (!this.visible || this.visible(b)));
    const placed = onCourt.map(b => {
      const prev = this.view(b).prev;
      let x = prev.x + (b.x - prev.x) * alpha;
      let y = prev.y + (b.y - prev.y) * alpha;
      const slide = this.view(b).slide;
      if (slide) {
        const t = (s.tick + alpha - slide.start) / (slide.ticks ?? STEP_BACK_TICKS);
        if (t >= 1) this.view(b).slide = undefined;
        else {
          x = slide.x + (b.x - slide.x) * t;
          y = slide.y + (b.y - slide.y) * t;
        }
      }
      const dunk = this.dunkLift(b, alpha, x, y);
      const [sx, sy] = camera.project(dunk.x, dunk.y);
      const motion = this.motionOf(b);
      const look = this.view(b).look;
      const { pose, withBall } = this.poseOf(b, motion.moving);
      const falling = b.fallenUntil > s.tick;
      // A cabeça fica para o lado da queda; quem cai de barriga para baixo mostra as costas.
      // No poste, os dois ficam virados para fora do cesto: o atacante de costas para ele, o defensor de frente para o atacante.
      const postFacing = pose.startsWith('post') || pose === 'brace' ? camera.project(this.attackedHoop(s.offense), 0)[0] > sx : null;
      const flip = falling ? camera.project(b.x + b.fallHead, b.y)[0] < camera.project(b.x, b.y)[0] : postFacing ?? motion.flip;
      const back = falling ? b.fallProne && pose.startsWith('fall') : motion.back && pose.startsWith('run');
      const lift = this.tipLift(b, alpha) + this.reboundLift(b, alpha) + dunk.lift + this.shotLift(b, alpha);
      this.drawn.bodies.set(b, { x: sx, y: sy, lift, pose, height: spriteHeight(look) });
      return { x: sx, y: sy, lift, pose, withBall, look, flip, back };
    });
    const { referee } = this;
    if (!this.visible) {
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
    }
    // Os reflexos vão por baixo de tudo, senão apareciam por cima de outros jogadores.
    if (theme.reflection > 0) {
      for (const p of placed) drawReflection(g, p.pose, p.look, p.x, p.y, p.flip, p.back, theme.reflection);
    }
    // A poeira fica no chão, atrás de quem a levantou: sobe, abre e esbate-se.
    for (const q of this.puffs) {
      const age = (s.tick + alpha - q.born) / PUFF_TICKS;
      if (age >= 1) continue;
      const [qx, qy] = camera.project(q.x, q.y);
      drawables.push({
        y: qy - 1,
        draw: () => {
          g.globalAlpha = 0.9 * (1 - age);
          g.fillStyle = '#fff6e4';
          const spread = 1 + age * 4;
          const rise = age * 5;
          const size = age < 0.4 ? 3 : 2;
          g.fillRect(Math.round(qx - spread) - 1, Math.round(qy - rise) - 1, size, size);
          g.fillRect(Math.round(qx + spread * q.side), Math.round(qy - rise * 1.5) - 2, size, size);
          g.fillRect(Math.round(qx), Math.round(qy - rise * 0.5), 2, 1);
          g.globalAlpha = 1;
        },
      });
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
    const inHands = this.ballInHands();
    const holderOverride = inHands ? this.view(inHands).override : undefined;
    const holderDrawsBall = inHands !== null && (!holderOverride || holderOverride.until <= s.tick || holderOverride.withBall === true);
    // No afundanço, a bola vai na mão de quem afunda até ao aro.
    const dunkerDrawsBall = s.flight?.kind === 'shot' && this.view(s.flight.shooter).dunkJump?.withBall === true && this.drawn.bodies.has(s.flight.shooter);
    if (!holderDrawsBall && !dunkerDrawsBall) {
      const x = this.ballPrevious.x + (this.ball.x - this.ballPrevious.x) * alpha;
      const y = this.ballPrevious.y + (this.ball.y - this.ballPrevious.y) * alpha;
      let z = this.ballPrevious.z + (this.ball.z - this.ballPrevious.z) * alpha;
      // Num passe picado a bola desce ao chão a meio do caminho e volta a subir até às mãos.
      if (s.flight?.kind === 'pass' && this.isBouncePass(s.flight)) {
        const t = Math.min(1, (s.flight.ticks + alpha) / Math.max(1, s.flight.total));
        z = Math.max(B.ballRestHeight, z - (z - B.ballRestHeight) * Math.sin(Math.PI * t));
      }
      const [gx, gy] = camera.project(x, y);
      const [bx, by] = this.ballScreen(x, y, z);
      this.drawn.ball = [bx, by];
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
    this.drawRain();
    this.drawCarrier(alpha);
    this.drawNameTags(alpha);
    this.drawFloaters();
    this.drawBubbles();
    this.drawForecast();
    const fade = s.phase === 'break' && s.period === 2 ? Math.max(0, 1 - (2 * s.timer) / (B.periodBreakSeconds * 20)) : Math.max(0, (this.fadeInUntil - s.tick - alpha) / FADE_IN_TICKS);
    if (fade > 0) {
      g.fillStyle = `rgba(27,34,48,${fade})`;
      g.fillRect(0, 0, camera.width, camera.height);
    }
    if (!this.reducedMotion && s.tick < this.shakeUntil) {
      const dx = s.tick % 2 ? 2 : -2;
      g.canvas.style.transform = `translate(${dx}px, ${s.tick % 3 === 0 ? 1 : -1}px)`;
    } else if (g.canvas.style.transform) {
      g.canvas.style.transform = '';
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** Uma marca vermelha por cima de cada adversário a marcar de perto. */
  private drawTargets(alpha: number): void {
    const { g, s, camera } = this;
    const focus = s.tactics[0].focus ?? [];
    if (focus.length === 0) return;
    for (const b of s.court[1]) {
      if (!focus.includes(s.teams[1].roster.indexOf(b.player))) continue;
      const prev = this.view(b).prev;
      const [x, y] = camera.project(prev.x + (b.x - prev.x) * alpha, prev.y + (b.y - prev.y) * alpha);
      const top = (y | 0) - spriteHeight(this.view(b).look) - 4;
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

  /** Do lado de fora da rede: as árvores e quem parou a ver, de pé, encostado à rede. Desenham-se antes da rede, para ficarem atrás dela. */
  private drawOutsiders(): void {
    const { g, s, camera } = this;
    if (!this.street) return;
    for (const [tx, ty] of [[-9, -5], [-8.5, 6], [5, -15], [21, -16.5], [37, -3], [36.5, 7]] as const) this.drawTree(tx, ty);
    const cheering = s.tick < this.fansCheerUntil;
    for (const o of this.outsiders) {
      const [sx, sy] = camera.project(o.x, o.y);
      if (sx < -20 || sx > camera.width + 20) continue;
      const beat = this.reducedMotion ? o.phase : (s.tick >> 2) + o.phase;
      const pose: PoseName = cheering ? (beat % 2 ? 'cheer0' : 'cheer1') : ((s.tick >> 4) + o.phase) % 7 === 0 ? 'cheer0' : 'idle';
      drawSprite(g, pose, o.look, sx | 0, sy | 0, o.flip, false, false);
    }
  }

  /** Uma árvore: tronco e três tufos, do tamanho que a distância lhe dá. */
  private drawTree(x: number, y: number): void {
    const { g, camera } = this;
    const [sx, sy] = camera.project(x, y);
    const [, topY] = camera.project(x, y, 5);
    const h = sy - topY;
    if (sx < -40 || sx > camera.width + 40 || h < 6) return;
    const trunk = Math.max(2, Math.round(h * 0.12));
    g.fillStyle = '#5a4632';
    g.fillRect(Math.round(sx - trunk / 2), Math.round(sy - h * 0.45), trunk, Math.round(h * 0.45));
    const r = h * 0.3;
    for (const [ox, oy, k] of [[0, -h * 0.72, 1], [-r * 0.9, -h * 0.5, 0.85], [r * 0.9, -h * 0.5, 0.85]] as const) {
      g.fillStyle = k === 1 ? '#4f9e4a' : '#3f8a3c';
      const rr = r * k;
      for (let dy = -rr; dy <= rr; dy += 1) {
        const half = Math.sqrt(Math.max(0, rr * rr - dy * dy));
        g.fillRect(Math.round(sx + ox - half), Math.round(sy + oy + dy), Math.round(half * 2), 1);
      }
    }
  }

  /** A mascote, o cão do bairro e o pombo do aro: entram na ordem de profundidade como os outros bonecos. Nada disto mexe no jogo. */
  private addHumor(drawables: { y: number; draw: () => void }[]): void {
    const { g, s, camera } = this;
    const { theme } = this.textures;
    const beat = this.reducedMotion ? 0 : this.animTick >> 2;
    const mascot = this.mascotLook;
    if (mascot && theme.mascot !== undefined) {
      // Encostada à ponta do banco da casa, a festejar os cestos do clube; num desconto vem para o campo dançar.
      const dancing = s.phase === 'timeout';
      const [sx, sy] = camera.project(dancing ? 9.8 : 2.4, dancing ? -4.4 : -9);
      const pose: PoseName = dancing ? (['cheer0', 'clap0', 'cheer1', 'clap1'] as const)[beat % 4]! : s.tick < this.benchCheerUntil[this.crowdTeam] ? (beat % 2 ? 'cheer0' : 'cheer1') : 'idle';
      const y = (sy | 0) - (dancing && beat % 2 === 0 ? 2 : 0);
      const kind = theme.mascot;
      drawables.push({
        y: sy,
        draw: () => {
          drawShadow(g, sx, sy);
          drawSprite(g, pose, mascot, sx | 0, y, dancing && beat % 8 >= 4, false, false);
          drawMascotHead(g, kind, mascot.custom!, sx | 0, y - spriteHeight(mascot));
        },
      });
    }
    const dogAt = this.humor.dogAt;
    if (dogAt !== null && s.tick >= dogAt && s.tick < dogAt + DOG_TICKS) {
      // Um cão entra pelo portão, corre pelo campo e senta-se; o dono vem buscá-lo e leva-o ao colo.
      const t = s.tick - dogAt;
      const owner = along(OWNER_PATH, t);
      const carried = t >= DOG_PICKED;
      const dog = carried ? owner : along(DOG_PATH, t);
      const [dx, dy] = camera.project(dog.x, dog.y);
      const [ox, oy] = camera.project(owner.x, owner.y);
      const look = this.ownerLook;
      if (t >= OWNER_PATH[1]![0]) {
        drawables.push({
          y: oy,
          draw: () => {
            drawShadow(g, ox, oy);
            drawSprite(g, owner.moving ? RUN_FRAMES[Math.floor(s.tick / 2.5) % 4]! : 'idle', look, ox | 0, oy | 0, owner.dx < 0, owner.dy < 0 && owner.moving, false);
            if (carried) drawDog(g, ox | 0, (oy | 0) - 9, owner.dx < 0, 0, false);
            if (t < DOG_PICKED) this.speech('ANDA CÁ BOBI!', ox, Math.max(28, (oy | 0) - spriteHeight(look) - 22));
          },
        });
      }
      if (!carried) {
        drawables.push({
          y: dy,
          draw: () => {
            drawShadow(g, dx, dy, 4);
            drawDog(g, dx | 0, dy | 0, dog.dx < 0, dog.moving ? beat : this.animTick >> 3, !dog.moving);
          },
        });
      }
    }
    if (this.humor.pigeon) {
      // No primeiro lance livre do jogo há um pombo pousado no aro; quando a bola sai das mãos, voa para o teto.
      if (!this.pigeon && s.phase === 'freeThrow') this.pigeon = { hoopX: this.attackedHoop(s.offense), flew: -1 };
      const pigeon = this.pigeon;
      if (pigeon && pigeon.flew < 0 && s.phase !== 'freeThrow') pigeon.flew = s.tick;
      const flying = !pigeon ? Infinity : pigeon.flew < 0 ? -1 : s.tick - pigeon.flew;
      if (pigeon && flying < 50) {
        const { hoopX } = pigeon;
        const inward = hoopX < 14 ? 1 : -1;
        const f = Math.max(0, flying);
        const [px, py] = camera.project(hoopX + inward * f * 0.12, 0.28, 3.1 + f * 0.09);
        const layer = camera.project(hoopX - inward * 0.5, 0, 0)[1] + HOOP_FRONT_OFFSET + 0.1;
        drawables.push({ y: layer, draw: () => drawPigeon(g, px | 0, py | 0, inward < 0, flying < 0 ? -1 : beat, (this.animTick >> 3) % 5 === 0) });
      }
    }
  }

  /** A chuva no campo de rua: riscas inclinadas por cima de tudo, e salpicos no chão. */
  private drawRain(): void {
    if (!this.textures.theme.rain) return;
    const { g, camera } = this;
    const { width: w, height: h } = camera;
    const t = this.reducedMotion ? 0 : this.animTime;
    g.fillStyle = 'rgba(206,220,240,0.55)';
    for (let n = 0; n < 90; n++) {
      const y = ((n * 53) % h + t * 260 + n * 11) % h;
      const x = ((n * 97) % w - y * 0.25 + w * 2) % w;
      g.fillRect(x | 0, y | 0, 1, 4);
    }
    g.fillStyle = 'rgba(226,236,250,0.8)';
    for (let n = 0; n < 16; n++) {
      if ((this.animTick + n * 5) % 14 > 1) continue;
      g.fillRect(((n * 131 + (this.animTick >> 4) * 37) % w) | 0, (h * 0.45 + ((n * 71) % (h * 0.55))) | 0, 2, 1);
    }
  }

  /** Um balão de fala, igual aos da bancada, com a ponta em `fx`. */
  private speech(label: string, fx: number, top: number): void {
    const { g, camera } = this;
    const w = textWidth(label, 2) + 8;
    const x = Math.max(6, Math.min(camera.width - w - 6, (fx | 0) - (w >> 1)));
    const y = top;
    g.fillStyle = '#1b2230';
    // A caixa sobe 6 píxeis acima do texto para caberem os acentos.
    g.fillRect(x - 1, y - 7, w + 2, 22);
    g.fillRect(x + (w >> 1) - 2, y + 15, 5, 3);
    g.fillStyle = '#fbf6e2';
    g.fillRect(x, y - 6, w, 20);
    g.fillRect(x + (w >> 1) - 1, y + 14, 3, 3);
    text(g, label, x + 4, y + 2, '#1b2230', 2);
  }

  /** O público: sentado quase sempre, de pé a festejar um cesto da casa, de mãos na cabeça com um da visita. Alguns têm bandeira. */
  private drawFans(): void {
    const { g, s, camera } = this;
    if (this.fans.length === 0) return;
    if (this.street) {
      // Os bancos atrás dos cestos: o degrau alto atrás, o baixo à frente, virados para o campo.
      for (const far of [false, true]) {
        for (const [y0, y1] of [[-7.2, -3.4], [3.4, 7.2]] as const) {
          const high = far ? STAND.farX - 2.4 : STAND.nearX + 1.4;
          drawBox(g, camera, high, high + 1, y0, y1, 0.9, '#8a8f96', '#5d636c');
          const low = far ? STAND.farX - 3.4 : STAND.nearX + 2.4;
          drawBox(g, camera, low, low + 1, y0, y1, 0.45, '#8a8f96', '#5d636c');
        }
      }
    }
    const sad = s.tick < this.fansSadUntil;
    const asleep = this.humor.sleeper && Math.abs(s.score[0] - s.score[1]) >= this.humor.blowout ? this.sleeperFan : -1;
    for (const [i, f] of this.fans.entries()) {
      const [sx, sy] = camera.project(f.x, f.y, f.z);
      if (sx < -20 || sx > camera.width + 20 || sy < -10 || sy > camera.height + 40) continue;
      if (i === asleep) {
        // Numa goleada, alguém dorme sentado: a cabeça cai de vez em quando e os «Z» sobem.
        const nod = !this.reducedMotion && (this.animTick >> 4) % 3 === 0 ? 1 : 0;
        drawSprite(g, 'sit', f.look, sx | 0, (sy | 0) + nod, f.flip, false, false);
        const top = (sy | 0) - spriteHeight(f.look);
        for (let k = 0; k < 3; k++) {
          const p = this.reducedMotion ? k / 3 : ((this.animTick + k * 14) % 42) / 42;
          const zx = (sx | 0) + 3 + Math.round(p * 6);
          const zy = top - 4 - Math.round(p * 12);
          text(g, 'Z', zx + 1, zy + 1, '#1b2230', 1);
          text(g, 'Z', zx, zy, '#fbf6e2', 1);
        }
        continue;
      }
      // Cada adepto tem o seu entusiasmo: só se levanta se o momento valer mais do que ele pede, e os menos entusiastas
      // sentam-se mais cedo; uns saltam, outros batem palmas.
      const cheering = s.tick < this.fansCheerUntil - f.zeal * 0.5 * this.fansCheerTicks && f.zeal < this.fansCheerLevel;
      const beat = this.reducedMotion ? f.phase : (s.tick >> 2) + f.phase;
      const claps = f.phase % 3 === 2;
      const pose: PoseName = cheering ? (claps ? (beat % 2 ? 'clap0' : 'clap1') : beat % 2 ? 'cheer0' : 'cheer1') : sad && f.phase % 2 === 0 ? 'handsHead' : 'sit';
      drawSprite(g, pose, f.look, sx | 0, sy | 0, f.flip, false, false);
      // Na entrada, com a confiança alta, muitos trazem bandeira.
      if (f.flag || (this.forecast?.confident && s.phase === 'intro' && f.phase % 3 === 0)) {
        const top = (sy | 0) - spriteHeight(f.look) - (pose === 'sit' ? 2 : 10);
        g.fillStyle = '#5a4632';
        g.fillRect((sx | 0) + 5, top, 1, 18);
        g.fillStyle = this.flagColor;
        g.fillRect((sx | 0) + 6, top, 9, 6);
      }
    }
  }

  /** Os balões da bancada: por cima de um adepto da primeira fila, e desaparecem passados dois segundos. */
  private drawBubbles(): void {
    const { g, s, camera } = this;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i]!;
      const age = s.tick - b.born;
      if (age > 44) {
        this.bubbles.splice(i, 1);
        continue;
      }
      const fan = this.fans[b.fan]!;
      const [fx, fy] = camera.project(fan.x, fan.y, fan.z);
      // Por cima da cabeça do adepto. Nasce um pouco mais abaixo e sobe, como quem se levanta da cadeira.
      this.speech(b.label, fx, Math.max(28, (fy | 0) - spriteHeight(fan.look) - 24 - (i % 3) * 6) - Math.min(4, age));
    }
  }

  /** O ponto mais alto de uma pose, em píxeis acima dos pés, com bola e com os braços. */
  private poseTop(pose: PoseName, look: Look): number {
    const key = `${pose}|${look.legs}|${look.torso}`;
    let top = this.poseTops.get(key);
    if (top === undefined) {
      const c = document.createElement('canvas');
      c.width = 48;
      c.height = 96;
      const g = c.getContext('2d', { willReadFrequently: true })!;
      drawSprite(g, pose, look, 24, 80, false, false, true);
      const { data } = g.getImageData(0, 0, c.width, c.height);
      let row = 0;
      while (row < c.height && !data.slice(row * c.width * 4, (row + 1) * c.width * 4).some((v, i) => i % 4 === 3 && v > 0)) row++;
      top = row < c.height ? 80 - row : spriteHeight(look);
      this.poseTops.set(key, top);
    }
    return top;
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
      const scale = word ? 2 : 3;
      const width = textWidth(f.label, scale);
      // A altura da palavra: 5 linhas, a sombra e a cedilha.
      const height = 6 * scale + 1;
      let left: number;
      let top: number;
      const drawn = f.body && this.drawn.bodies.get(f.body);
      if (word && drawn) {
        // A palavra segue quem fez o movimento, por cima do ponto mais alto da pose, e sobe devagar. Sem espaço em cima,
        // por baixo da faixa do marcador, encosta-se ao lado dele: nunca por cima do corpo.
        const head = (drawn.y | 0) - Math.round(drawn.lift) - this.poseTop(drawn.pose, this.view(f.body!).look);
        top = head - FLOATER_GAP - height - rise;
        left = (drawn.x | 0) - (width >> 1);
        // O lado decide-se uma vez, logo no início e a contar com o salto do afundanço que aí vem; senão a palavra saltava
        // de cima para o lado a meio do salto.
        if (f.top === undefined && f.beside === undefined && top - (this.view(f.body!).dunkJump ? DUNK_LIFT : 0) < FLOATER_MIN_TOP) f.beside = (drawn.x | 0) + 9 + width <= camera.width - 2 ? 1 : -1;
        if (f.beside !== undefined) {
          top = Math.max(FLOATER_MIN_TOP, head);
          left = f.beside > 0 ? (drawn.x | 0) + 9 : (drawn.x | 0) - 9 - width;
        } else top = f.top = Math.max(2, Math.min(f.top ?? top, top));
        left = Math.max(2, Math.min(camera.width - width - 2, left));
      } else {
        // No topo do ecrã, a faixa e o marcador tapariam a palavra: aí, fica aos pés de quem a disse.
        const below = word && y < camera.height * 0.38;
        top = Math.min(camera.height - 12, below ? (y | 0) + 8 + rise : Math.max(FLOATER_MIN_TOP, (y | 0) - 14 - rise));
        // Num canto, a palavra encosta à margem em vez de sair do ecrã.
        left = word ? Math.max(2, Math.min(camera.width - width - 2, (x | 0) - (width >> 1))) : (x | 0) + (x < camera.width / 2 ? 14 : -38);
      }
      // A caixa ocupada: os acentos sobem 3 linhas, a cedilha desce 1 e a sombra mais 1 píxel.
      const accent = /[ÁÀÂÃÉÊÍÓÔÕÚ]/.test(f.label) ? 3 * scale : 0;
      this.drawn.labels.push([left, top - accent, width + 1, accent + height]);
      text(g, f.label, left + 1, top + 1, '#1b2230', scale);
      text(g, f.label, left, top, '#f2c230', scale);
    }
  }

  private drawCarrier(alpha: number): void {
    const { g, s, camera } = this;
    const holder = this.carrier();
    if (!holder) return;
    const prev = this.view(holder).prev;
    const [x, y] = camera.project(prev.x + (holder.x - prev.x) * alpha, prev.y + (holder.y - prev.y) * alpha);
    const bob = (s.tick >> 3) % 2;
    drawCarrierArrow(g, x, y - spriteHeight(this.view(holder).look) - 3 - bob);
    this.drawTargets(alpha);
  }

  /** A pose de um jogador neste instante, para os cenários de teste do revisor. */
  bodyPose(b: Body): PoseName {
    return this.poseOf(b, this.motionOf(b).moving).pose;
  }

  /** A pose do portador da bola neste instante. Serve para a verificação no browser. */
  carrierPose(): { pose: PoseName; moving: boolean } | null {
    const b = this.s.holder;
    if (!b) return null;
    const { moving } = this.motionOf(b);
    return { pose: this.poseOf(b, moving).pose, moving };
  }

  /** O jogador com a bola, ou para quem ela vai a caminho. */
  /** Toca-se num jogador e o nome fica uns segundos por cima dele. Devolve se acertou em alguém. */
  tapAt(px: number, py: number): boolean {
    const { camera, s } = this;
    let best: Body | null = null;
    let bestDistance = 18;
    for (const b of [...s.court[0], ...s.court[1]]) {
      const [sx, sy] = camera.project(b.x, b.y);
      const d = Math.hypot(sx - px, sy - spriteHeight(this.view(b).look) / 2 - py);
      if (d < bestDistance) {
        bestDistance = d;
        best = b;
      }
    }
    if (!best) return false;
    this.view(best).nameTag = s.tick + 50;
    return true;
  }

  /** Os nomes por cima de quem foi tocado. */
  private drawNameTags(alpha: number): void {
    const { g, s, camera } = this;
    for (const [b, view] of this.views) {
      const until = view.nameTag;
      if (until === undefined) continue;
      if (s.tick >= until || b.slot < 0) {
        this.view(b).nameTag = undefined;
        continue;
      }
      const prev = this.view(b).prev;
      const [x, y] = camera.project(prev.x + (b.x - prev.x) * alpha, prev.y + (b.y - prev.y) * alpha);
      const label = b.player.name.toUpperCase();
      const w = textWidth(label, 1) + 4;
      const left = Math.max(1, Math.min(camera.width - w - 1, (x | 0) - (w >> 1)));
      // A caixa tem espaço por cima das letras para os acentos (Simão, Gonçalves) e por baixo para a cedilha.
      const top = Math.max(1, (y | 0) - spriteHeight(this.view(b).look) - 14);
      g.fillStyle = b.team === 0 ? '#2b5fd9' : '#cf3a2c';
      g.fillRect(left, top, w, 11);
      g.fillStyle = '#1b2230';
      g.fillRect(left, top + 11, w, 1);
      text(g, label, left + 2, top + 4, '#fbf6e2', 1);
    }
  }

  carrier(): Body | null {
    const { s } = this;
    return s.holder ?? (s.flight?.kind === 'pass' ? s.flight.target : null);
  }

  lookFor(b: Body): Look {
    return this.view(b).look;
  }
}

// O cão do bairro: [tick, x, y]. Entra pelo portão, dá uma volta pelo meio-campo de lá e senta-se; o dono chega e leva-o ao colo.
const DOG_PATH: readonly (readonly [number, number, number])[] = [[0, 14, -12.6], [40, 11, -8], [90, 6, -5.4], [130, 8.6, -3], [165, 10.2, -5.8], [400, 10.2, -5.8]];
const OWNER_PATH: readonly (readonly [number, number, number])[] = [[0, 14.6, -13], [110, 14.6, -13], [200, 10.8, -6], [225, 10.8, -6], [330, 14.6, -13.2]];
const DOG_PICKED = 220;
const DOG_TICKS = 330;

/** Onde está quem segue um caminho, ao tick `t`, para onde anda e se está a andar. */
function along(path: readonly (readonly [number, number, number])[], t: number): { x: number; y: number; dx: number; dy: number; moving: boolean } {
  const next = path.findIndex(p => p[0] > t);
  const k = next < 0 ? path.length - 1 : Math.max(0, next - 1);
  const [t0, x0, y0] = path[k]!;
  const [t1, x1, y1] = path[Math.min(path.length - 1, k + 1)]!;
  const f = t1 > t0 ? Math.min(1, (t - t0) / (t1 - t0)) : 1;
  return { x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f, dx: x1 - x0, dy: y1 - y0, moving: f < 1 && (x1 !== x0 || y1 !== y0) };
}

/** Um cão pequeno e castanho, de perfil: corre com as patas a alternar, ou senta-se a abanar a cauda. */
function drawDog(g: CanvasRenderingContext2D, x: number, y: number, flip: boolean, frame: number, sitting: boolean): void {
  const r = (dx: number, dy: number, w: number, h: number, color: string): void => {
    g.fillStyle = color;
    g.fillRect(flip ? x - dx - w : x + dx, y + dy, w, h);
  };
  const body = '#9a6438';
  const dark = '#5a3a22';
  if (sitting) {
    r(-3, -5, 5, 4, body);
    r(1, -8, 3, 3, body);
    r(4, -7, 1, 1, dark);
    r(1, -9, 1, 2, dark);
    r(-1, -1, 1, 1, dark);
    r(1, -1, 1, 1, dark);
    r(-4 - (frame % 2), -3, 1, 2, body);
    return;
  }
  r(-4, -5, 8, 3, body);
  r(3, -7, 3, 3, body);
  r(6, -6, 1, 1, dark);
  r(3, -8, 1, 2, dark);
  r(-5, -7 + (frame % 2), 1, 2, body);
  const step = frame % 2;
  r(-3 + step, -2, 1, 2, dark);
  r(2 - step, -2, 1, 2, dark);
}

/** Um pombo cinzento: pousado a mexer a cabeça, ou a voar de asas a bater (`frame` ≥ 0). */
function drawPigeon(g: CanvasRenderingContext2D, x: number, y: number, flip: boolean, frame: number, peck: boolean): void {
  const r = (dx: number, dy: number, w: number, h: number, color: string): void => {
    g.fillStyle = color;
    g.fillRect(flip ? x - dx - w : x + dx, y + dy, w, h);
  };
  r(-3, -5, 7, 6, '#1b2230');
  r(-2, -4, 5, 4, '#9aa0ab');
  r(-4, -3, 2, 2, '#6d7380');
  const head = peck ? 1 : 0;
  r(2, -7 + head, 4, 4, '#1b2230');
  r(3, -6 + head, 2, 2, '#5d636c');
  r(3, -4 + head, 1, 1, '#3bb08a');
  r(5, -5 + head, 1, 1, '#e8a030');
  if (frame < 0) {
    r(-1, 0, 1, 1, '#e8a030');
    r(1, 0, 1, 1, '#e8a030');
  } else {
    const up = frame % 2 === 0;
    r(-3, up ? -6 : -1, 3, up ? 3 : 2, '#b4bac4');
  }
}

/** A cabeça grande da mascote, por cima do boneco: galo (0), urso (1) ou gato (2), nas cores do clube. */
function drawMascotHead(g: CanvasRenderingContext2D, kind: number, kit: ClubKit, x: number, top: number): void {
  const r = (dx: number, dy: number, w: number, h: number, color: string): void => {
    g.fillStyle = color;
    g.fillRect(x + dx, top + dy, w, h);
  };
  const ink = '#1b2230';
  if (kind === 1) {
    r(-6, -6, 4, 4, ink);
    r(3, -6, 4, 4, ink);
    r(-5, -5, 2, 2, kit.jersey);
    r(4, -5, 2, 2, kit.jersey);
  } else if (kind === 2) {
    r(-5, -7, 3, 3, ink);
    r(3, -7, 3, 3, ink);
    r(-4, -6, 1, 2, kit.jersey);
    r(4, -6, 1, 2, kit.jersey);
  } else {
    r(-2, -8, 2, 3, '#cf3a2c');
    r(0, -9, 2, 4, '#cf3a2c');
    r(2, -8, 2, 3, '#cf3a2c');
  }
  r(-5, -5, 11, 10, ink);
  r(-4, -4, 9, 8, kit.jersey);
  r(-3, -2, 2, 2, '#ffffff');
  r(2, -2, 2, 2, '#ffffff');
  r(-2, -1, 1, 1, ink);
  r(2, -1, 1, 1, ink);
  if (kind === 0) {
    r(-1, 1, 3, 2, '#f2c230');
    r(0, 3, 1, 2, '#cf3a2c');
  } else {
    r(-2, 1, 5, 3, kit.second);
    r(0, 1, 1, 1, kind === 2 ? '#e88aa0' : ink);
    if (kind === 2) {
      r(-7, 2, 3, 1, ink);
      r(5, 2, 3, 1, ink);
    }
  }
}
