import { reducedMotion } from './settings.ts';
import { DIVISIONS, levelOfHeight, teamRating } from '../sim/teamgen.ts';
import { buildOf } from './art/body.ts';
import { shadeOf, type ClubKit, type Emblem } from './art/kit.ts';
import { BALANCE as B } from '../sim/balance.ts';
import { BENCH_SPACING, BENCH_START_X, BENCH_Y, COURT_HALF_WIDTH, COURT_LENGTH, HUDDLE_CENTRE, huddleSpot, seconds } from '../sim/court.ts';
import { INK } from './art/palette.ts';
import { createMatch, isSprinting, step, type Body, type MatchEvent, type MatchState, type TeamIndex } from '../sim/match.ts';
import type { MoveId, Player, Team } from '../sim/types.ts';
import { placeShotBall } from '../sim/match-ball.ts';
import { MOVE_INFO } from './narrate.ts';
import { courtGpu } from './gpu/loader.ts';
import type { WorldSprite } from './gpu/sprite-layer.ts';
import { CLOSED_GYM, Camera, FAN_SPACING, sideline, tableKind, TABLE_CREW, TABLE_FACES, TABLE_SPAN, type TableRole, endBoards, STAND, STREET_SEATS, TUNNEL, courtTextures, drawBox, drawHoopBack, drawHoopFront, fanRows, seats, type CourtTextures, type Sky } from './art/court.ts';
import { text, textWidth } from './art/font.ts';
import { remember } from './art/cache.ts';
import { crowdLine, type CrowdMood } from './crowd.ts';
import {
  drawBall,
  drawCarrierArrow,
  drawReflection,
  drawShadow,
  drawSprite,
  spriteQuad,
  kitColors,
  lookOf,
  poseFeet,
  spriteHeight,
  spriteBall,
  SPRITE_H,
  type Look,
  type PoseName,
  KITS,
  type KitName,
} from './art/sprites.ts';

/** A letra dos balões de fala: a da interface do jogo, em píxeis da arte (à resolução do ecrã, porque a tela está ampliada). */
const SPEECH_FONT = '12px "Jersey 15"';
let speechFontLoaded = false;
/** Se a letra dos balões já chegou. O `document.fonts.check` diz que sim mesmo sem a folha das letras (sem rede), e aí saía
 * uma letra do sistema; por isso procura-se a letra carregada, e guarda-se quando chega. */
const speechFontReady = (): boolean =>
  (speechFontLoaded ||= typeof document !== 'undefined' && [...document.fonts].some(f => f.family.replace(/"/g, '') === 'Jersey 15' && f.status === 'loaded'));
/** Quantos píxeis da tela há por píxel de arte (o layout escreve-o na tela do jogo; nas outras é 1). */
/** Um ponto do mundo, em metros (z para cima). */
type Vec3 = readonly [number, number, number];
/** Uma caixa no ecrã, em píxeis da arte: esquerda, cima, direita, baixo. */
type Box = readonly [number, number, number, number];
/**
 * Uma coisa do mundo a desenhar por ordem (`y`, os pés no ecrã). Com a placa gráfica, `world` diz onde está no mundo: os
 * bonecos que desenhar vão para lá com essa profundidade, e o resto do que pintar dentro de `box` (sombra, bola, cesto) é
 * copiado para lá, à profundidade de `world` aproximado `bias` metros da câmara.
 */
interface Drawable {
  y: number;
  draw: () => void;
  /** Só na tela 2D: com a placa gráfica, é um modelo 3D do cenário (os cestos, a mesa, os bancos). */
  cpuOnly?: boolean;
  world?: Vec3;
  box?: Box;
  bias?: number;
  /** Um cartão em pé com esta altura em metros (a cara de um objeto), em vez de deitado à profundidade dos pés. */
  tall?: number;
}
/** As cores das coisas da mesa: o papel das folhas, o vermelho das setas e das faltas, os algarismos de luz e a ardósia. */
const PAPER = '#f4efe0';
const TABLE_RED = '#e8402e';
const LED_RED = '#ff5a3c';
const LED_AMBER = '#ffc04a';
/** Quanto quem está no chão se aproxima da câmara, em metros, no mundo da placa gráfica: um nada, à frente da sua sombra. */
const GROUND_BIAS = 0.05;
/** A sombra de raio `r` (píxeis da arte) numa imagem, para a placa gráfica: a mesma de `drawShadow`, guardada por tamanho. */
const shadowImages = new Map<number, HTMLCanvasElement>();
function shadowImage(r: number): HTMLCanvasElement {
  let image = shadowImages.get(r);
  if (!image) {
    image = document.createElement('canvas');
    image.width = 2 * r;
    image.height = 4;
    // `drawShadow` pinta de x - r - 1 a x + r - 1 e de y - 2 a y + 1, com x deslocado um píxel.
    drawShadow(image.getContext('2d')!, r - 1, 2, r);
    shadowImages.set(r, image);
  }
  return image;
}
const artScaleOf = (canvas: HTMLCanvasElement): number => Math.max(1, Math.round(Number(canvas.dataset.artScale ?? 1)));

const HOOP_LEFT = 1.575;
const HOOP_RIGHT = 26.425;
const RUN_FRAMES: readonly PoseName[] = ['run0', 'run1', 'run2', 'run1'];
// A andar: os dois pés no chão, um levantado, os dois no chão, o outro levantado.
const WALK_FRAMES: readonly PoseName[] = ['walk0', 'walk1', 'walk0', 'walk2'];
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
// Ao balneário vai-se a trote, todos pela mesma porta: pelo corredor à frente dos bancos (que fica sempre aquém da
// parede, dos bancos e da mesa), até à frente do túnel, e depois túnel adentro, um de cada vez.
const LOCKER_SPEED = 3.5;
// O corredor à frente da mesa, onde se anda de lado, e o de trás dela, entre quem lá está sentado e a boca do túnel.
const LOCKER_LANE_Y = -7.8;
const LOCKER_BEHIND_Y = -10.9;
const LOCKER_DOOR_X = 14;
// O caminho acaba 5 m túnel adentro: com a placa gráfica, o túnel é fundo e a boca tapa quem lá vai (a partir de uns 4 m,
// com a câmara do jogo). Sem ela, o túnel é pintado e quem passa a boca deixa logo de se ver.
const LOCKER_INSIDE_Y = STAND.y - 5;
/** No túnel 3D, de que fundo a que fundo (m) quem lá vai se desvanece no escuro. */
const TUNNEL_FADE = [0.6, 4.5] as const;
/** Por onde cada um passa no túnel, à esquerda ou à direita do meio (até 0,8 m, longe das paredes, a 1,4 m do meio):
 * sempre pelo meio, iam todos em fila indiana. Uma sequência que espalha bem números seguidos. */
const tunnelLane = (i: number): number => LOCKER_DOOR_X + (((i * 0.618034) % 1) - 0.5) * 1.6;
const LOCKER_GAP_SECONDS = 0.28;
// O passo mais lento de quem vai para o balneário, em m/s.
const LOCKER_SLOWEST = 1.4;
// No fim do jogo sem cerimónia: os vencedores festejam isto antes de ir (em segundos de jogo), e os vencidos vão a passo.
const END_CHEER_SECONDS = 1.2;
const END_WALK_SPEED = 2;
const END_CAMERA_SPEED = 2.5;
// Com a bola a correr: a câmara segue mais devagar (antes 2,2), sem deixar a bola a mais disto do centro.
const CAMERA_CALM_RATE = 1.3;
const CAMERA_BALL_SLACK = 5;
// A partir desta altura da bola (m), quem corta um passe tem de saltar.
const INTERCEPT_JUMP_HEIGHT = 1.9;
const SWISH_TICKS = 10;
const TRAIL_LENGTH = 6;
const HOOP_FRONT_OFFSET = 0.5;
const BALL_IN_HOOP_RANGE = 0.7;
// Uma mudança de direção só se faz passado este tempo, para o boneco não tremer entre frente e costas.
const TURN_LOCK_TICKS = 12;
const BACK_POSES = /^(run|dribRun|holdRun|slide|idle$|leap$|crossover$|grab$|reach$|gather$|dunk$|block$|bump$)/;
const IDLE_TURN_MARGIN = 24;
// Bola ao alto: de início fletem as pernas, e o pico do salto coincide com o toque na bola.
const TIP_RISE = 0.45;
const TIP_HEIGHT = 16;
// A pose de passe dura pouco: depois, quem passou volta a correr ou a esperar, em vez de deslizar de braços esticados.
const PASS_POSE_TICKS = 6;
// A palmada do desarme: 300 ms no ar, e não 600, depois dos 10 ticks de braços no ar a contestar (animacao.md §10).
const SWAT_TICKS = 6;
// O salto ao ressalto: começa estes passos antes de a bola cair, dura isto e sobe até aqui, em píxeis.
const REBOUND_JUMP_AHEAD = 5;
const REBOUND_JUMP_TICKS = 12;
const REBOUND_JUMP_HEIGHT = 12;
// No afundanço, o salto leva a mão até ao aro: a mão da pose fica a 32 px dos pés e o aro a 46, por isso sobe-se 14 px.
const DUNK_LIFT = 14;
// A pose `dunk` desenha os pés 10 px acima do chão (o `jump` dela em sprites.ts).
const DUNK_POSE_FEET = 10;
/** O salto de um lançamento: quanto dura e quanto sobe, em píxeis; a pose de lançar já traz os pés 6 px acima do chão. */
const SHOT_JUMP_TICKS = 10;
const SHOT_JUMP_HEIGHT = 8;
const SHOOT_POSE_FEET = 6;
// O afundanço por fases (animacao.md §10): agacha 150 ms, sobe, fica pendurado no aro 60 ms, cai a acelerar em 150 ms e
// aterra a fletir as pernas 100 ms; só depois festeja. Do aro para baixo conta em tempo real, para a queda se ver
// também a 2× e 4×.
const DUNK_CROUCH_TICKS = 3;
const DUNK_HANG_SECONDS = 0.06;
const DUNK_FALL_SECONDS = 0.15;
const DUNK_LAND_SECONDS = 0.1;
// Um afundanço que não se desenhou apaga-se passado isto, em ticks depois do aro: mais do que o resto do salto a 4×.
const DUNK_STALE_TICKS = 40;
const CHEER_TICKS = 14;
// A corrida muda de pose a cada tanto de caminho: à velocidade típica em campo, 5 a 6 m/s, de 80 em 100 ms. Nenhuma
// pose fica menos de 80 ms reais (2 ticks a 1×), nem a 4×, onde se salta para a pose que o caminho pede.
const STRIDE_METRES = 0.48;
const MIN_POSE_SECONDS = 0.08;
const STRIKE_TICKS = 8;
// O lançamento em suspensão começa por recolher a bola: 150 ms (animacao.md §10).
const GATHER_TICKS = 3;
// As poses de andar: as outras, feitas a andar, levam as pernas da corrida (`legs`), para os pés não deslizarem.
const LOCOMOTION = /^(run|dribRun|holdRun|slide|postStep|layup|fall|stumble|ankle|getup|screen$)/;
// As poses de festejo têm um saltinho fixo; a correr, levam as pernas da corrida na mesma.
const CHEERS: ReadonlySet<PoseName> = new Set(['cheer0', 'cheer1', 'fists']);
// O tremor do afundanço conta em tempo real: 200 ms, a mudar de posição 15 vezes por segundo, 1 píxel de arte para cada lado.
const SHAKE_SECONDS = 0.2;
const SHAKE_HZ = 15;
// Píxeis de boneco por metro de altura da bola: a mão esticada de um jogador de 1,98 m no topo do salto da bola ao alto
// fica a 46 px dos pés (pernas 7, tronco 7, braço 10, salto da pose 6 e TIP_HEIGHT 16), e é aí que a bola tem de estar,
// à altura do aro, quando ele lhe toca.
const BALL_PX_PER_METRE = 46 / 3.05;
/** Quanto dura cada nuvem de poeira atrás de quem sprinta, em passos da simulação. */
const PUFF_TICKS = 14;
// Quem bate num bloqueio trava durante 300 ms (6 ticks), para o choque se ler sem texto.
const BUMP_TICKS = 6;
const REFEREE_STEP = 0.26;
const REFEREE_SIGNAL_TICKS = 22;
// Ao intervalo a imagem escurece enquanto as equipas saem, e clareia quando voltam.
const FADE_IN_TICKS = 20;
// O nome de um movimento fica este espaço, em píxeis, acima do ponto mais alto do boneco; e nunca acima desta linha,
// onde estão a faixa e o marcador.
const FLOATER_GAP = 3;
const FLOATER_MIN_TOP = 40;
// Quanto tempo fica um aviso no ecrã (o mesmo que bannerUntil em main.ts).
export const ANNOUNCE_TICKS = 36;
// A cerimónia do troféu, em tempo real (animacao.md §7 e §10): os vencedores correm para o meio campo e o capitão
// levanta o troféu quando todos lá estão (no mínimo ao fim de CEREMONY_LIFT_SECONDS), a subir e descer a cada
// CEREMONY_PUMP_SECONDS; depois há confetes durante CEREMONY_AFTER_LIFT. Os vencidos saem a passo do enquadramento.
// O momento grande: a imagem parada e o resultado grande a meio do campo, no máximo três vezes por jogo.
const BIG_MOMENTS_MAX = 3;
// Um afundanço com o defensor mais perto do que isto (m) é um poster.
const POSTER_RANGE = 1.5;
// A bola nunca salta: uma mudança de sítio maior do que isto (em píxeis de arte) faz-se em ~0,2 s (BALL_EASE_SECONDS é a
// constante de tempo); maior do que BALL_CUT_PX é um corte.
const BALL_SNAP_PX = 4;
const BALL_CUT_PX = 90;
const BALL_EASE_SECONDS = 0.06;
// A falta: o grande plano dura isto em tempo real, e a faixa com o nome um pouco mais.
const FOUL_ZOOM_SECONDS = 1.2;
const FOUL_STRIP_SECONDS = 2;
const BIG_HOLD_SECONDS = 1.4;
const BIG_SHOW_SECONDS = 2.2;
const CEREMONY_LIFT_SECONDS = 1.6;
const CEREMONY_AFTER_LIFT = 5.9;
const CEREMONY_PUMP_SECONDS = 0.3;
const CEREMONY_RUN_SPEED = 5;
// A passo largo: com o passo de WALK_STRIDE_METRES, 150 ms por pose (animacao.md §10, marcha).
const CEREMONY_WALK_SPEED = 2;
// O corte para 2× espera que os vencidos saiam do enquadramento, mas nunca mais do que isto.
const CEREMONY_LIFT_MAX_SECONDS = 3.5;
// Um passo a andar é mais curto do que a correr (STRIDE_METRES).
const WALK_STRIDE_METRES = 0.3;
const CEREMONY_CENTRE: Point = { x: 14, y: 0.6 };
// À volta do capitão, em metros: os de trás um pouco mais acima, para ele ficar à frente de todos.
const CEREMONY_RING: readonly (readonly [number, number])[] = [[-2.2, -0.2], [-1.1, -1.1], [1.1, -1.1], [2.2, -0.2]];
const CEREMONY_CHEERS: readonly (readonly [PoseName, PoseName])[] = [['cheer0', 'cheer1'], ['fists', 'cheer1'], ['clap0', 'clap1'], ['cheer1', 'cheer0']];
// 40 a 120 confetes, e 10 a 20 % parados com movimento reduzido; caem a 0,3–0,6 px de arte por imagem a 60 fps.
const CONFETTI_COUNT = 90;
const CONFETTI_STILL = 14;
const GOLD: readonly [string, string] = ['#f2c230', '#c99a14'];

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
  /** De costas como se desenha, com o seu próprio bloqueio (`BACK_POSES`). */
  drawnBack: boolean;
  drawnBackLock: number;
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
  /** Até que tick recolhe a bola antes de lançar em suspensão (`peekShot`). */
  gatherUntil?: number;
  /** Quando saltou ao ressalto: o salto começa antes de a bola chegar, e apanha-se em cima. */
  reboundJump?: number;
  /** O afundanço: quando começou e quanto dura até à mão tocar no aro; a pose da fase em curso; até quando fica pendurado
   * (em tempo real, e daí em diante cai e aterra), onde se agachou e onde ficou no aro; e como festeja depois de aterrar. */
  dunkJump?: { start: number; up: number; pose?: PoseName; withBall?: boolean; hangEnd?: number; crouch?: Point; pin?: Point; cheer?: PoseName };
  /** Onde está o suplente, quando sai do banco para a roda do desconto e volta. */
  huddle?: Point;
  /** Até quando o nome fica por cima dele, depois de ser tocado. */
  nameTag?: number;
  /** O ciclo de corrida anda com a distância: quantos passos já deu (`stride`, com a fração), quantos se mostraram
   * (`steps`) e em que tick se mostrou o último. */
  stride: number;
  steps: number;
  stepAt: number;
  /** Se o último frame o desenhou numa pose de andar, ou com as pernas da corrida. */
  striding?: boolean;
  /** O último `screenCooldownUntil` visto, e o tick em que bateu num bloqueio por causa dele. */
  screenHit?: number;
  bumpAt?: number;
}
interface Floater {
  label: string;
  x: number;
  y: number;
  z: number;
  born: number;
  /** Quem fez o movimento: a palavra segue-o, por cima da cabeça. */
  body?: Body;
  /** O movimento acaba num afundanço: a palavra conta logo com a altura do salto. */
  dunk?: boolean;
  /** Ao lado: a linha da cabeça no primeiro frame, de onde a palavra sobe. */
  base?: number;
  /** Sem espaço por cima dele, a palavra fica ao lado, à direita (1) ou à esquerda (-1), até desaparecer. */
  beside?: 1 | -1;
  /** A linha mais alta onde a palavra já esteve: só sobe, para não andar para cima e para baixo com o salto de quem a fez. */
  top?: number;
}

export type Sound = 'swish' | 'rim' | 'whistle' | 'buzzer' | 'shotClockBuzzer' | 'horn' | 'bounce' | 'catch' | 'steal' | 'block' | 'cheer' | 'bigCheer' | 'bigMiss' | 'shame' | 'awayCheer' | 'awayMiss' | 'card' | 'bump';

export interface ViewCallbacks {
  /** Um aviso grande; `cards`, num movimento especial, são as cartas do combo que o ensinou. */
  /** `long`: um movimento especial, que fica até ao fim da jogada. */
  announce(message: string, long?: boolean): void;
  sound(name: Sound): void;
  event(e: MatchEvent): void;
}

/** Um caminho a pé, por troços retos, que começa passado `delay` segundos; os pés mudam de pose a cada `stride` metros. */
interface Walk {
  path: Point[];
  length: number;
  speed: number;
  stride: number;
  delay: number;
  /** As poses dos pés (a correr ou a andar) e a pose de quem espera a vez, parado onde começou. */
  frames: readonly PoseName[];
  wait: PoseName;
}

function makeWalk(path: Point[], speed: number, frames: readonly PoseName[]): Walk {
  let length = 0;
  for (let i = 1; i < path.length; i++) length += Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y);
  return { path, length, speed, stride: frames === WALK_FRAMES ? WALK_STRIDE_METRES : STRIDE_METRES, delay: 0, frames, wait: 'idle' };
}

/** Onde vai o caminho ao fim de `t` segundos: o ponto, a direção do troço, se ainda anda, se já chegou, e a pose dos pés,
 * que segue a distância andada (como a corrida no jogo), para os pés não deslizarem. */
function walkAt(w: Walk, t: number): { x: number; y: number; dx: number; dy: number; moving: boolean; done: boolean; pose: PoseName; wait: PoseName } {
  const d = Math.max(0, Math.min(w.length, (t - w.delay) * w.speed));
  let left = d;
  let at = w.path[0]!;
  let dx = 0;
  let dy = 0;
  for (let i = 1; i < w.path.length; i++) {
    const a = w.path[i - 1]!;
    const b = w.path[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1e-6) continue;
    dx = b.x - a.x;
    dy = b.y - a.y;
    if (left <= len) {
      at = { x: a.x + (dx * left) / len, y: a.y + (dy * left) / len };
      break;
    }
    left -= len;
    at = b;
  }
  return { ...at, dx, dy, moving: t >= w.delay && d < w.length, done: d >= w.length, pose: w.frames[Math.floor(d / w.stride) % w.frames.length]!, wait: w.wait };
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
  readonly drawn: { bodies: Map<Body, { x: number; y: number; lift: number; pose: PoseName; height: number; world: Point; back?: boolean; legs?: PoseName }>; ball: [number, number] | null; labels: [number, number, number, number][] } = { bodies: new Map(), ball: null, labels: [] };
  private readonly textures: CourtTextures;
  private image: ImageData;
  /** O chão e as bancadas da última imagem, sem bonecos, já na memória: o fundo das margens copia-o sem ler a tela.
   * `null` quando o cenário veio da placa gráfica (então está em `gpuFloor`). */
  get floorImage(): ImageData | null {
    return this.gpuFloor ? null : this.image;
  }
  /** O cenário da última imagem, se veio da placa gráfica. */
  gpuFloor: HTMLCanvasElement | null = null;
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
  /** Se houve um frame desenhado desde o último passo da simulação. */
  private drewSinceStep = false;
  /** A decisão do portador que a vista já espreitou (`peekShot`). */
  private peekedDecision = -1;
  private readonly floaters: Floater[] = [];
  /** Quantos píxeis acima dos pés chega cada pose, medido uma vez no próprio desenho: braços no ar e salto incluídos. */
  private readonly poseTops = new Map<string, number>();
  // O que a bancada diz, em balões por cima de um adepto da primeira fila.
  private readonly bubbles: { label: string; fan: number; born: number }[] = [];
  private moveAnnouncedAt = -Infinity;
  private moveTeam: TeamIndex | null = null;
  // Os momentos grandes: um a três cestos por jogo param a imagem um instante, com o resultado grande a meio do campo.
  private bigScore: { team: TeamIndex; start: number; before: [number, number]; after: [number, number]; card: string } | null = null;
  private bigMoments = 0;
  // A falta tem o seu momento: um grande plano curto sobre quem a fez e uma faixa com o nome e as faltas que leva.
  private foulMoment: { body: Body; start: number; label: string } | null = null;
  // Entre os lances livres o grande plano não sai: fica até um pouco depois do último.
  private freeThrowUntil = -Infinity;
  // Quantas frases de cada contexto já se disseram, para a bancada não se repetir.
  private readonly crowdSaid = new Map<CrowdMood, number>();
  private readonly crowdSeed: number;
  // O público, como no original: bonecos em filas na bancada, sentados, que se levantam nos momentos especiais. Os balões saem deles.
  private readonly fans: { x: number; y: number; z: number; look: Look; phase: number; flip: boolean; flag: boolean; front: boolean; zeal: number }[] = [];
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
  private lastRealSeconds = 0;
  // A bola desenhada: o alvo da imagem anterior, onde foi desenhada e quanto ainda falta para chegar ao alvo (ver `placeBall`).
  private ballTarget: [number, number] | null = null;
  private ballDrawnAt: [number, number] | null = null;
  private ballMode: 'free' | 'hand' = 'free';
  private ballStep = 0;
  private ballLag: [number, number] = [0, 0];
  /** O último lançamento: para a bancada saber se a falha foi importante. */
  private lastShot: { dunk: boolean; breaking: boolean } | null = null;
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
  /** Quem está à mesa, que muda com a liga (ver `tableKind`). */
  private tableCrew: { x: number; y: number; z: number; look: Look; role: TableRole }[] = [];
  /** O professor apita (braço no ar) quando há falta; a frente de luzes da arena enche-se da cor da casa num cesto dela. */
  private tableFouls = 0;
  private tableWhistleUntil = 0;
  private tableHomeUntil = 0;
  private tableReady = false;
  /** O nome do clube da casa, no painel de luzes da arena. */
  private tableTitle = '';
  /** As cores da casa e do visitante nas folhas do marcador. */
  private tableColors: [string, string] = ['#2b5fd9', '#cf3a2c'];
  /** O resultado que o marcador de folhas mostra, e a folha a virar (quem, desde quando, o número de antes). */
  private tableScore: [number, number] = [0, 0];
  private tableFlip: { team: number; at: number } | null = null;
  /** O locutor e os comentadores falam depois de um cesto; num grande lance, os comentadores levantam-se. */
  private tableTalkUntil = 0;
  private tableBigUntil = 0;
  private boardCache = new Map<string, HTMLCanvasElement>();
  private swishUntil = 0;
  private swishHoop = HOOP_LEFT;
  private shakeUntil = 0;
  private fadeInUntil = 0;
  /** No fim de um jogo sem título, o ecrã escurece (0 a 1) antes do relatório; quem o conta é o main. */
  endFade = 0;
  /** A cerimónia do troféu, depois do apito final: para onde vai cada um, quem é o capitão e as cores dos confetes. */
  private ceremony: { trophy: 'cup' | 'bigCup'; banner: string; team: TeamIndex; start: number; lift: number; captain: Body; cheered: boolean; walks: Map<Body, Walk>; benched: Set<Body>; colors: (readonly [string, string])[] } | null = null;
  /** A ida para o balneário ao intervalo: o caminho de cada jogador, suplente e treinador (pela equipa), desde `start`
   * (em tempo de animação), e quando entra o último. */
  private locker: { start: number; end: number; walks: Map<Body | TeamIndex, Walk> } | null = null;
  /** A volta do balneário (suplentes e treinadores), ao recomeçar depois do intervalo. */
  private returning: { start: number; end: number; walks: Map<Body | TeamIndex, Walk> } | null = null;
  /** Quando a câmara deixou de olhar para o túnel (para ir ter com a bola a passo). */
  private tunnelLeft = -Infinity;
  /** No fim do jogo sem cerimónia, quando começou a saída para o balneário (`startExit`), em tempo de animação. */
  private exitStart: number | null = null;
  /** O deslocamento da imagem aproximada, em píxeis do ecrã: os confetes alinham-se pela mesma grelha. */
  private zoomShift: [number, number] = [0, 0];
  // A bola ao alto entra num corte seco a 2× e sai num recuo rápido, até a imagem voltar ao normal.
  private jumpZoom = false;
  // Píxeis da tela por píxel de arte: no jogo a tela tem a resolução do ecrã, e a arte amplia-se por este inteiro.
  private art = 1;
  // Só a tela do jogo tem perspetiva nos bonecos; as das ferramentas de revisão medem-nos píxel a píxel, ao tamanho de sempre.
  private perspective = false;
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
    // As texturas e os shaders vão já para a placa gráfica, para o primeiro frame não engasgar.
    courtGpu()?.prepare(this.textures);
    const roll = (salt: number): number => (Math.imul(seed ^ Math.imul(salt, 0x9e3779b9), 2654435761) >>> 0) / 4294967296;
    this.humor = { dogAt: division === 0 && roll(1) < 0.35 ? Math.floor(600 + roll(2) * 3000) : null, pigeon: roll(3) < 0.25, sleeper: roll(4) < 0.6, blowout: 25 };
    this.art = artScaleOf(g.canvas);
    this.perspective = g.canvas.dataset.artScale !== undefined;
    this.image = g.createImageData(g.canvas.width / this.art, g.canvas.height / this.art);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.camera.setViewport(g.canvas.width / this.art, g.canvas.height / this.art);
    for (const b of this.s.bodies) {
      this.views.set(b, {
        look: b.team === 0 ? { ...lookOf(b.player, 'blue'), custom: homeKit } : { ...lookOf(b.player, 'cream'), custom: awayKit },
        prev: { x: b.x, y: b.y },
        motion: { vx: 0, vy: 0, speed: 0, moving: false, back: false, flip: false, backLock: 0, flipLock: 0, lastBackChange: 0, drawnBack: false, drawnBackLock: 0 },
        stride: 0,
        steps: 0,
        stepAt: 0,
      });
    }
    const coachLook = (team: Team): Look => ({ ...lookOf({ ...team.roster[0]!, name: team.name }, 'suit'), style: 0, legs: 6, torso: 6, build: 'athletic' });
    const { theme } = this.textures;
    this.street = division === 0;
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
        [7, STAND.y - 0.8], [17.6, STAND.y - 0.9], [23.2, STAND.y - 0.7], [0.6, STAND.y - 0.8], [11.6, STAND.y - 0.7], [29.4, STAND.y - 0.9], [STAND.nearX - 0.9, -2.2], [STAND.farX + 0.9, 2.4], [5.6, STAND.y - 0.8], [16.6, STAND.y - 0.8]] as const;
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
        // Os lugares da fila (laterais, cantos e topos), já sem as escadas e a frente do túnel.
        for (const spot of seats(theme, row)) {
          // Na sala municipal, o meio da bancada cheio, as pontas meio vazias, e a claque num bloco cheio no canto.
          const claque = theme.local === true && spot.x > 22.5;
          const here = !theme.local ? density : claque ? 0.97 : Math.abs(spot.x - 14) < 7.5 ? Math.min(0.95, density * 1.35) : density * 0.45;
          if (seat(n++) >= here) continue;
          const flip = spot.plane === 'side' ? n % 3 === 0 : spot.far;
          const front = row === 0 && spot.plane === 'side';
          this.fans.push({ x: spot.x, y: spot.y, z: spot.z, look: looks[n % looks.length]!, phase: n, flip, flag: spot.plane === 'side' && seat(n * 7 + 3) < (claque ? 0.4 : 0.05), front, zeal: ((n * 2654435761) >>> 0) / 4294967296 });
        }
      }
    }
    this.coaches = [coachLook(home), coachLook(away)];
    this.tableColors = [homeKit?.jersey ?? KITS.blue.jersey, awayKit?.jersey ?? KITS.cream.jersey];
    this.tableTitle = home.name.toUpperCase();
    const person = (name: string, kit: KitName, extra: Partial<Look> = {}): Look => ({ ...lookOf({ ...home.roster[0]!, name }, kit), legs: 6, torso: 6, build: 'athletic', street: true, ...extra });
    // Quem se senta à mesa (court.ts: TABLE_CREW), vestido conforme o que faz: o voluntário e os alunos de t-shirt, o
    // professor de fato de treino, os oficiais de polo escuro, o locutor e os comentadores de fato (estes de auscultadores).
    const dress: Record<TableRole, [KitName, Partial<Look>]> = { flip: ['fan', {}], clock: ['fan', {}], whistle: ['coach', {}], official: ['fan2', {}], speaker: ['suit', {}], stats: ['fan2', {}], comment: ['suit', { headset: true }] };
    const kind = tableKind(theme);
    this.tableCrew = TABLE_CREW[kind].map((c, i) => {
      const [kit, extra] = kind === 'official' && c.role !== 'speaker' ? (['fan2', {}] as [KitName, Partial<Look>]) : dress[c.role];
      return { ...c, look: person(`Mesa ${kind} ${i}`, kit, extra) };
    });
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
    this.art = artScaleOf(canvas);
    this.perspective = canvas.dataset.artScale !== undefined;
    this.image = this.g.createImageData(canvas.width / this.art, canvas.height / this.art);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.camera.setViewport(canvas.width / this.art, canvas.height / this.art);
    if (this.fence) this.fence = this.fenceLayer();
  }

  private fenceLayer(): { image: ImageData; pixels: Uint32Array; canvas: HTMLCanvasElement } {
    const { width, height } = this.camera;
    const image = this.g.createImageData(width, height);
    const layer = document.createElement('canvas');
    layer.width = width;
    layer.height = height;
    return { image, pixels: new Uint32Array(image.data.buffer), canvas: layer };
  }

  /** Uma paragem com a equipa junta ao banco: desconto, fim de período sem ser o intervalo, e o intervalo na rua. */
  holding(): boolean {
    return this.s.phase === 'timeout' || (this.s.phase === 'break' && (this.s.period !== 2 || this.street));
  }

  /** `ballX` é a bola desenhada, entre dois passos: a da simulação só muda 20 vezes por segundo e a câmara andava aos soluços. */
  private cameraTarget(ballX = this.s.ball.x): [number, number] {
    if (this.ceremony) return [CEREMONY_CENTRE.x, this.camera.tuning.lookY];
    // No fim, a câmara vai para o meio, onde fica o túnel, e para lá: segue a saída sem andar atrás da bola parada.
    if (this.s.phase === 'end') return [LOCKER_DOOR_X, this.camera.tuning.lookY];
    // Na ida para o balneário ao intervalo e na volta, a câmara fica no túnel, para se ver quem entra e quem sai.
    if (this.tunnelShot()) return [LOCKER_DOOR_X, this.camera.tuning.lookY];
    // Na paragem olha-se para o banco da casa, inclinado para baixo.
    if (this.holding()) return [HUDDLE_CENTRE[0][0] + 1.5, -1.5];
    // No início, toda a gente está à volta do círculo: olha-se para o meio do campo.
    if (this.s.phase === 'intro' || this.s.phase === 'jump') return [ballX, this.camera.tuning.lookY];
    // Olhar um pouco à frente da bola, para o cesto atacado ficar sempre à vista. Quando a bola desce para a linha de baixo,
    // a câmara inclina-se, senão quem a tem ficava cortado pelo fundo do ecrã.
    const secondHalf = this.s.period >= 3;
    const attacksRight = (this.s.offense === 0) !== secondHalf;
    const lookY = this.camera.tuning.lookY;
    // Só se olha à frente quando o ataque já passou o meio campo: na transição a câmara segue a bola sem saltar 6 m para o
    // outro lado a cada mudança de posse, que era o que a fazia correr e rodar a cada ataque.
    const settled = attacksRight ? ballX > COURT_LENGTH / 2 + 2 : ballX < COURT_LENGTH / 2 - 2;
    const ahead = settled ? (attacksRight ? 3 : -3) : 0;
    return [Math.max(5.4, Math.min(22.6, ballX + ahead)), lookY];
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
    // Um balão de cada vez: o novo substitui o anterior, que senão ficava tapado por ele.
    this.bubbles.length = 0;
    this.bubbles.push({ label, fan: near[(s.tick * 7919 + this.bubbles.length * 131) % near.length]!, born: this.animTick });
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
          // Para a bancada: um afundanço ou um contra-ataque falhado é uma falha importante.
          this.lastShot = { dunk: e.dunk === true, breaking: s.tick < s.breakUntil };
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
          // Um afundanço falhado, um contra-ataque desperdiçado ou uma falha no fim de um jogo renhido: «Ooooh».
          // A casa lamenta as suas falhas; as do adversário só os adeptos de fora, que são menos.
          if (this.lastShot?.dunk || this.lastShot?.breaking || this.crowdTense) callbacks.sound(e.team === this.crowdTeam ? 'bigMiss' : 'awayMiss');
          if (e.team !== this.crowdTeam && this.crowdChance(3)) this.crowdSay(this.crowdPick('miss'));
          break;
        case 'freeThrowMissed':
          callbacks.sound('rim');
          if (e.team !== this.crowdTeam && this.crowdChance(2)) this.crowdSay(this.crowdPick('miss'));
          if (body) this.view(body).override = { pose: 'slump', until: s.tick + 10 };
          break;
        case 'block':
          if (body) this.view(body).override = { pose: 'swat', until: s.tick + SWAT_TICKS };
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
            this.view(body).override = { pose: high ? 'grab' : 'snatch', until: s.tick + STRIKE_TICKS, withBall: true };
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
          if (body) {
            this.view(body).override = { pose: 'handsHead', until: s.tick + 8 };
            const name = body.player.name.toUpperCase();
            const fouls = body.line.fouls;
            this.foulMoment = { body, start: this.realTime, label: fouls >= B.foulOutAt ? `${name} SAI: ${fouls} FALTAS` : `FALTA DE ${name} - ${fouls} ${fouls === 1 ? 'FALTA' : 'FALTAS'}` };
          }
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
            if (e.move === 'crossover') this.view(body).override = { pose: 'crossover', until: s.tick + STRIKE_TICKS, withBall: true };
            if (e.move === 'pickpocket') this.view(body).override = { pose: 'snatch', until: s.tick + STRIKE_TICKS, withBall: true };
            if (e.move === 'stepBack') {
              this.view(body).slide = { ...this.view(body).prev, start: s.tick };
              this.view(body).stepBack = s.tick;
            }
            // No alley-oop, a palavra vai por cima de quem recebe e afunda, que é quem se vê; o evento é de quem passa.
            const anchor = e.move === 'alleyOop' && s.flight?.kind === 'pass' ? s.flight.target : body;
            this.floaters.push({ label: MOVE_LABELS[e.move!], x: anchor.x, y: anchor.y, z: 2.6, born: s.tick, body: anchor, dunk: e.move === 'alleyOop' || e.move === 'powerDunk' });
          }
          this.excitedUntil = s.tick + 30;
          if (e.team === this.crowdTeam) this.fansReact(true, 24);
          // Um crossover que deita o defensor ao chão é um momento vergonhoso: «Uuuuh».
          callbacks.sound(e.move === 'crossover' && s.events.some(k => k.tick === e.tick && k.type === 'knockdown') ? 'shame' : e.team === this.crowdTeam ? 'bigCheer' : 'awayCheer');
          // Só o nome do movimento: as cartas do combo que o ensina seriam um spoiler.
          callbacks.announce(`${MOVE_INFO[e.move!].name}!`, true);
          this.moveAnnouncedAt = s.tick;
          this.moveTeam = e.team;
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

  /** Avança o ciclo de corrida pelo caminho feito neste passo da simulação, uma pose de cada vez e por ordem. Cada pose
   * fica pelo menos `MIN_POSE_SECONDS` reais; a 2× e 4×, acima desse ritmo as pernas ficam no ritmo máximo, e o caminho
   * a mais não se acumula (saltar poses deixava a corrida presa numa só, por aliasing). */
  private walk(view: BodyView, b: Body): void {
    // Um salto de mais de 1 m é uma mudança de sítio (substituição, intervalo), não caminho.
    view.stride += Math.min(1, Math.hypot(b.x - view.prev.x, b.y - view.prev.y)) / STRIDE_METRES;
    // Parado, ou noutra pose (um salto, um gesto), o relógio do passo recomeça: a primeira pose de uma corrida também dura
    // o tempo mínimo.
    // (A pose desenhada só conta se houve um frame desde o último passo: sem desenhar, a simulação avança sozinha.)
    if (!this.motionOf(b).moving || (this.drewSinceStep && view.striding === false)) view.stepAt = this.s.tick;
    if (view.stride >= view.steps + 1 && this.s.tick - view.stepAt >= Math.ceil(MIN_POSE_SECONDS * 20 * this.simPerReal - 1e-6)) {
      view.steps++;
      view.stepAt = this.s.tick;
    }
    view.stride = Math.min(view.stride, view.steps + 1);
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
    // O agachamento é de pés parados: fica no sítio onde começou, e a subida leva-o daí até onde a simulação o tem.
    const crouch = (jump.crouch ??= { x, y });
    if (t < DUNK_CROUCH_TICKS) {
      jump.pose = 'gather';
      return { lift: 0, ...crouch };
    }
    jump.pose = 'dunk';
    // A pose de afundar já traz os pés DUNK_POSE_FEET acima do chão, e a de agachar 1 abaixo: o salto desconta isso, para
    // os pés saírem do chão e lá voltarem em arco, sem saltar píxeis.
    const ground = -(DUNK_POSE_FEET + 1);
    if (t < jump.up) {
      const u = (t - DUNK_CROUCH_TICKS) / (jump.up - DUNK_CROUCH_TICKS);
      return { lift: ground + (DUNK_LIFT - ground) * (1 - (1 - u) * (1 - u)), x: crouch.x + (x - crouch.x) * u, y: crouch.y + (y - crouch.y) * u };
    }
    const pin = (jump.pin ??= { x, y });
    jump.hangEnd ??= this.realTime + DUNK_HANG_SECONDS;
    if (this.realTime < jump.hangEnd) return { lift: DUNK_LIFT, ...pin };
    const d = (this.realTime - jump.hangEnd) / DUNK_FALL_SECONDS;
    if (d < 1) return { lift: ground + (DUNK_LIFT - ground) * (1 - d * d), x: pin.x + (x - pin.x) * d, y: pin.y + (y - pin.y) * d };
    if (d < 1 + DUNK_LAND_SECONDS / DUNK_FALL_SECONDS) {
      jump.pose = 'gather';
      return { lift: 0, x, y };
    }
    jump.pose = 'gather';
    view.dunkJump = undefined;
    // O festejo depois de aterrar dura 0,7 s reais a qualquer velocidade; a correr, com as pernas da corrida.
    if (jump.cheer) view.override = { pose: jump.cheer, until: this.s.tick + Math.round(CHEER_TICKS * this.simPerReal) };
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
        this.callbacks.sound(e.team === this.crowdTeam ? 'bigCheer' : 'awayCheer');
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
    this.tableTalkUntil = s.tick + 60;
    if (loud) this.tableBigUntil = s.tick + 30;
    const worth = this.basketWorth(e, dunk);
    this.excitement = worth;
    this.excitedUntil = s.tick + Math.round(18 + 40 * worth);
    this.fansReact(e.team === this.crowdTeam, e.team === this.crowdTeam ? Math.round(20 + 50 * worth) : 30, worth);
    if (dunk) this.shakeUntil = this.realTime + SHAKE_SECONDS;
    callbacks.sound('swish');
    // Um poster, um afundanço por cima de quem defende, envergonha-o: a bancada faz «Uuuuh» além de festejar.
    const beaten = dunk && body ? this.nearestOpponent(body) : undefined;
    const poster = beaten !== undefined && Math.hypot(beaten.x - body!.x, beaten.y - body!.y) < POSTER_RANGE;
    // A festa é da casa; quando o adversário marca, só os adeptos de fora festejam, que são menos.
    callbacks.sound(e.team !== this.crowdTeam ? 'awayCheer' : loud && !poster ? 'bigCheer' : 'cheer');
    if (poster) callbacks.sound('shame');
    // Se o aviso de um movimento especial (afundanço de força, alley-oop) ainda está no ecrã, o cesto é dessa jogada.
    if (dunk && s.tick - this.moveAnnouncedAt > ANNOUNCE_TICKS) callbacks.announce('Afundanço!');
    if (s.clock <= 20) {
      callbacks.announce('Sobre o apito!');
      this.excitedUntil = s.tick + 60;
    } else if (s.period >= 4 && s.clock < 600) {
      const lead = s.score[e.team] - s.score[e.team === 0 ? 1 : 0];
      if (lead > 0 && lead <= e.points!) callbacks.announce('Reviravolta!');
    }
    // Um momento grande é um movimento especial que dá cesto, um cesto sobre o apito, ou no fim uma reviravolta ou um triplo
    // que empata. O cesto normal fica como está: o momento vale por ser raro.
    const late = s.period >= 4 && s.clock < 600;
    const lead = s.score[e.team] - s.score[e.team === 0 ? 1 : 0];
    const moved = this.moveTeam === e.team && s.tick - this.moveAnnouncedAt <= ANNOUNCE_TICKS * 2;
    // Um cesto sobre o apito só conta com o jogo por decidir; os movimentos especiais deixam sempre um momento para o fim.
    const close = Math.abs(lead) <= 8;
    const big = (moved && this.bigMoments < BIG_MOMENTS_MAX - 1) || (s.clock <= 20 && close) || (late && lead > 0 && lead <= e.points!) || (late && lead === 0 && e.points === 3);
    if (big && this.bigMoments < BIG_MOMENTS_MAX) {
      this.bigMoments++;
      const before: [number, number] = [s.score[0], s.score[1]];
      before[e.team] -= e.points!;
      // A ficha de quem marcou, por baixo do resultado: o nome, os pontos de hoje e quem passou.
      const card = body ? `${body.player.name.toUpperCase()} - ${body.line.points} PONTOS${e.other ? `, ASSISTE ${e.other.toUpperCase()}` : ''}` : '';
      this.bigScore = { team: e.team, start: this.realTime, before, after: [s.score[0], s.score[1]], card };
    }
  }

  /** O resultado que o marcador deve mostrar: num momento grande, o antigo até o número novo trocar no centro. */
  shownScore(): readonly [number, number] {
    const b = this.bigScore;
    return b && !this.reducedMotion && this.realTime - b.start < 0.33 ? b.before : this.s.score;
  }

  /** Num momento grande, a imagem fica parada um instante: o jogo só volta a andar depois disto. */
  momentHold(): boolean {
    return this.bigScore !== null && this.realTime - this.bigScore.start < BIG_HOLD_SECONDS;
  }

  /**
   * O resultado grande a meio do campo, como no golo do Calciobit: entra com o resultado antigo, o número de quem marcou
   * troca 0,33 s depois, maior e a ouro, e assenta em dois degraus de escala inteira. Some de uma vez.
   */
  private drawBigScore(): void {
    const b = this.bigScore;
    if (!b) return;
    const t = this.realTime - b.start;
    if (t >= BIG_SHOW_SECONDS) {
      this.bigScore = null;
      return;
    }
    const { g, camera } = this;
    const still = this.reducedMotion;
    const swapped = still || t >= 0.33;
    const score = swapped ? b.after : b.before;
    const grow = still || !swapped ? 0 : t < 0.5 ? 2 : t < 0.62 ? 1 : 0;
    const base = 6;
    const parts = [String(score[0]), '-', String(score[1])];
    const gap = base * 2;
    // A linha mede-se à escala base, para os números parados não mexerem; o que cresce cresce à volta do seu centro.
    const widths = parts.map(p => textWidth(p, base));
    const total = widths.reduce((a, w) => a + w, 0) + gap * 2;
    let x = (camera.width - total) >> 1;
    const midY = Math.round(camera.height * 0.4);
    g.save();
    g.setTransform(this.art, 0, 0, this.art, 0, 0);
    parts.forEach((p, i) => {
      const hot = swapped && i === b.team * 2;
      const scale = hot ? base + grow : base;
      const px = x - ((textWidth(p, scale) - widths[i]!) >> 1);
      const y = midY - Math.round((5 * scale) / 2);
      // Contorno de tinta: o mesmo texto deslocado um píxel de arte para cada lado.
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [2, 2]] as const) text(g, p, px + dx, y + dy, INK, scale);
      text(g, p, px, y, hot ? GOLD[0] : '#f8f0d8', scale);
      x += widths[i]! + gap;
    });
    if (swapped && b.card) {
      const w = textWidth(b.card) + 16;
      const cx = (camera.width - w) >> 1;
      const cy = midY + Math.round((5 * base) / 2) + 10;
      g.fillStyle = INK;
      // 24 de altura e a letra 9 abaixo do topo: cabem os acentos por cima e a cedilha por baixo, como na faixa da cerimónia.
      g.fillRect(cx, cy, w, 24);
      text(g, b.card, cx + 8, cy + 9, '#f8f0d8');
    }
    g.restore();
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
    const flightBefore = s.flight;
    step(s);
    // O passe chega às mãos de quem o esperava.
    if (receiver && !s.flight && s.holder === receiver) this.callbacks.sound('catch');
    const target = s.ball;
    // A bola segue a simulação à risca quando voa por um caminho certo: lançamentos, passes, ressaltos, lances livres e bola ao alto.
    if (s.flight || s.loose || s.phase === 'freeThrow' || s.phase === 'jump') {
      this.ball = { ...target };
      // No passo em que sai da mão, a simulação ainda deixa a bola à altura do drible e só no seguinte a põe no ar, já
      // longe: aqui parte do ponto de saída da trajetória, e fica nele esse passo, que é o do gesto de soltar a bola.
      const f = s.flight;
      if (f && f !== flightBefore && !(f.kind === 'shot' && (f.layup || f.dunk) && !f.blockedBy)) {
        if (f.kind === 'shot') {
          const start = { ...s, ball: { ...target } };
          placeShotBall(start, f, 0);
          this.ball = start.ball;
        } else {
          // As alturas de partida de `updateBall`.
          this.ball = { x: f.fromX, y: f.fromY, z: f.fromZ ?? (f.lob ? 1.5 : 1.3) };
        }
        this.ballPrevious = { ...this.ball };
      }
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
    this.peekShot();
    this.drewSinceStep = false;
  }

  /** O lançamento só se sabe quando a bola sai da mão, mas a decisão tem tick marcado (`nextDecision`): uns ticks antes,
   * a vista corre uma cópia do jogo até lá, e se o portador vai lançar em suspensão, recolhe a bola antes (`gather`).
   * A cópia não toca no jogo, e só se faz uma vez por decisão (cerca de 0,3 ms num computador). */
  private peekShot(): void {
    const { s } = this;
    const h = s.holder;
    if (!h || s.phase !== 'live' || s.posting === h || s.nextDecision - s.tick > GATHER_TICKS || this.peekedDecision === s.nextDecision) return;
    this.peekedDecision = s.nextDecision;
    // Os eventos não fazem falta à cópia e são a parte que cresce: ficam de fora, sem tocar no jogo verdadeiro.
    const ahead: MatchState = structuredClone({ ...s, events: [] });
    while (ahead.tick < s.nextDecision && ahead.phase === 'live') step(ahead);
    // Um step-back ou outro movimento no lançamento já tem a sua pose; o lay-up e o afundanço também.
    const shot = ahead.events.find(e => e.type === 'shot' && e.player === h.player.name && e.team === h.team);
    if (shot && !shot.dunk && !shot.layup && !ahead.events.some(e => e.type === 'move')) this.view(h).gatherUntil = shot.tick;
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
    // Um afundanço que não se chegou a desenhar (a simulação andou sem imagens) não fica pendurado para depois.
    for (const view of this.views.values()) {
      const jump = view.dunkJump;
      if (jump && s.tick > jump.start + jump.up + DUNK_STALE_TICKS) view.dunkJump = undefined;
    }
    for (const b of [...s.court[0], ...s.court[1]]) {
      this.walk(this.view(b), b);
      const m = this.motionOf(b);
      // A simulação marca o choque com o bloqueio ao pôr um novo `screenCooldownUntil`: trava, e levanta-se pó entre os dois.
      const view = this.view(b);
      if (b.screenCooldownUntil !== view.screenHit) {
        view.screenHit = b.screenCooldownUntil;
        const by = s.screen?.on === b ? s.screen.by : undefined;
        if (by && b.screenCooldownUntil > s.tick) {
          view.bumpAt = s.tick;
          // Nos pés do defensor, do lado de fora: à frente das pernas dos dois, para se ver.
          this.puffs.push({ x: b.x, y: b.y + (b.y >= by.y ? 0.3 : -0.3), born: s.tick, side: b.x < by.x ? 1 : -1 });
        }
      }
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
    // O que não é andar segue o tempo; as pernas de quem anda seguem o caminho feito (`stride`).
    const frame = Math.floor(s.tick / 2.5);
    const step = this.view(b).steps % 4;
    if (s.phase === 'end') {
      const won = s.score[b.team] > s.score[b.team === 0 ? 1 : 0];
      return { pose: won ? this.endCheer(b) : 'slump', withBall: false };
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
    const bumpAt = this.view(b).bumpAt;
    if (bumpAt !== undefined && s.tick - bumpAt < BUMP_TICKS) return { pose: 'bump', withBall: false };
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
    if (s.phase === 'dead' && s.inbound?.hasBall && s.inbound.passer === b) return { pose: moving ? HOLD_RUN_FRAMES[step]! : 'hold', withBall: true };
    // A pose de passe só no instante do passe; a correr, com as pernas da corrida.
    if (s.flight?.kind === 'pass' && s.flight.passer === b && s.flight.ticks < PASS_POSE_TICKS) return { pose: s.flight.lob ? 'lob' : this.isBouncePass(s.flight) ? 'bouncePass' : 'pass', withBall: false };
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
    // Antes de lançar em suspensão, recolhe a bola ao peito.
    const gather = this.view(b).gatherUntil;
    if (s.holder === b && gather !== undefined && s.tick < gather) return { pose: 'gather', withBall: true };
    // De costas no poste: agachado a proteger a bola, a recuar aos poucos; e o defensor encostado a fazer força.
    if (s.posting === b) return { pose: moving ? (step < 2 ? 'postStep0' : 'postStep1') : frame % 4 < 2 ? 'post0' : 'post1', withBall: true };
    if (s.posting && b.team !== s.offense && this.nearestOpponent(s.posting) === b) return { pose: 'brace', withBall: false };
    if (s.holder === b) {
      // A correr, as pernas acompanham o drible; parado, só a bola mexe.
      // Com o mesmo limite para arrancar e para parar: a abrandar ou a arrancar devagar, as pernas ainda andam.
      if (moving || this.motionOf(b).speed > 0.4) return { pose: DRIBBLE_RUN_FRAMES[step]!, withBall: true };
      return { pose: frame % 4 < 2 ? 'drib0' : 'drib1', withBall: true };
    }
    // Só quem defende o jogador com a bola fica em posição de defesa, a deslizar de lado; os outros andam e correm normalmente.
    const man = b.team !== s.offense && s.phase === 'live' && s.holder && this.nearestOpponent(s.holder) === b ? s.holder : undefined;
    // E só à frente dele, entre ele e o cesto: por trás, corre-se.
    const hoopX = man ? this.attackedHoop(man.team) : 0;
    const inFront = man !== undefined && Math.hypot(b.x - hoopX, b.y) < Math.hypot(man.x - hoopX, man.y);
    const guarding = man !== undefined && inFront && (man.x - b.x) * (man.x - b.x) + (man.y - b.y) * (man.y - b.y) < STANCE_RANGE * STANCE_RANGE;
    if (moving && guarding) return { pose: step < 2 ? 'slide0' : 'slide1', withBall: false };
    // O bloqueio direto: posto, o bloqueador fica plantado; quando o portador arranca, rola a correr.
    const sc = s.screen;
    if (sc?.handler && sc.by === b && sc.handler === s.holder) {
      if (!s.driving && sc.x !== undefined) return { pose: 'screen', withBall: false };
    }
    if (moving) return { pose: RUN_FRAMES[step]!, withBall: false };
    // O bloqueio sem bola mexe-se com o defensor; só se planta quando está parado.
    if (sc && !sc.handler && sc.by === b) return { pose: 'screen', withBall: false };
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
    // Longe do aro, a altura da bola segue os bonecos: os mesmos píxeis por metro, com o tamanho da distância.
    return [wx + (gx - wx) * w, wy + (gy - z * BALL_PX_PER_METRE * this.depth(gy) - wy) * w];
  }

  /** A mesa da liga: quem lá está sentado e o que está em cima dela (o marcador, os monitores, o painel da frente). */
  private addTable(drawables: Drawable[]): void {
    const { g, s, camera } = this;
    const kind = tableKind(this.textures.theme);
    // O marcador de folhas vira a folha de quem marcou: a folha a meio durante 6 ticks, e o braço esticado um pouco mais.
    if (!this.tableReady) {
      // O primeiro desenho (um jogo retomado, ou uma vista que só agora se desenha) começa no resultado que lá está.
      this.tableReady = true;
      this.tableScore = [s.score[0], s.score[1]];
      this.tableFouls = s.teamFouls[0] + s.teamFouls[1];
    }
    for (const team of [0, 1] as const) {
      if (s.score[team] !== this.tableScore[team] && (!this.tableFlip || s.tick - this.tableFlip.at > 12)) {
        this.tableFlip = { team, at: s.tick };
        if (team === this.crowdTeam) this.tableHomeUntil = s.tick + 40;
        this.tableScore[team] = s.score[team];
      }
    }
    const fouls = s.teamFouls[0] + s.teamFouls[1];
    if (fouls > this.tableFouls) this.tableWhistleUntil = s.tick + 24;
    this.tableFouls = fouls;
    const flipping = this.tableFlip && s.tick - this.tableFlip.at < 14 ? this.tableFlip : null;
    const big = s.tick < this.tableBigUntil;
    const talking = s.tick < this.tableTalkUntil;
    const beat = Math.floor(this.animTick / 4);
    const boardX = TABLE_FACES[kind].find(f => f.face === 'flip')?.x ?? 14;
    let commentator = 0;
    this.tableCrew.forEach((p, i) => {
      let pose: PoseName = 'sit';
      if (p.role === 'flip' && flipping) pose = 'reachSit';
      else if (p.role === 'whistle' && s.tick < this.tableWhistleUntil) pose = 'armUp';
      else if (p.role === 'speaker' && talking) pose = beat % 2 ? 'talk0' : 'talk1';
      else if (p.role === 'comment') {
        // Os dois comentadores falam à vez, 3 s cada; num grande lance levantam-se os dois.
        const turn = commentator++;
        if (big) pose = (beat + turn) % 2 ? 'cheer0' : 'cheer1';
        else if (Math.floor(this.animTick / 60) % 2 === turn) pose = (beat + i) % 2 ? 'talk0' : 'talk1';
      }
      // Sentados atrás da mesa, em cadeiras (e no estrado): o boneco sobe, senão o tampo tapava-o até ao pescoço.
      const lift = p.z + 0.4;
      const [px, py] = camera.project(p.x, p.y, lift);
      // Quem vira as folhas estica o braço para o lado do marcador, no ecrã.
      const turn = p.role === 'flip' && camera.project(boardX, -8.5)[0] < px;
      drawables.push({ y: py, world: [p.x, p.y, lift], draw: () => this.sprite(g, pose, p.look, px, py, turn, false, false) });
    });
    // Uma imagem colada na frente da mesa (de x0 a x1, à altura z0–z1, no plano y), coluna a coluna.
    // A imagem desenha-se com o tamanho que a frente tem no ecrã (`paint(colunas, linhas)`): esticada, as letras de 3×5 desfaziam-se.
    const front = (x0: number, x1: number, y: number, z0: number, z1: number, paint: (w: number, h: number) => HTMLCanvasElement, scroll = 0): void => {
      const [ax, ay] = camera.project(x0, y, z1);
      const [cx, cy] = camera.project(x1, y, z1);
      const [, ay2] = camera.project(x0, y, z0);
      const [, cy2] = camera.project(x1, y, z0);
      // Um cartão em pé da altura da cara, com os pés em baixo: a profundidade acompanha a cara, e quem passa à frente da
      // mesa fica à frente dela (com os pés em cima, toda à profundidade do cimo, pintava-se por cima de quem passava).
      drawables.push({ y: camera.project((x0 + x1) / 2, y, 0)[1], world: [(x0 + x1) / 2, y + 0.01, z0], bias: 0.02, tall: z1 - z0, box: [Math.min(ax, cx) - 1, Math.min(ay, cy) - 1, Math.max(ax, cx) + 1, Math.max(ay2, cy2) + 1], draw: () => {
        g.imageSmoothingEnabled = false;
        // A câmara olha para o fundo: o x do mundo cresce para a esquerda do ecrã.
        const cols = Math.max(1, Math.round(Math.abs(cx - ax)));
        const dir = cx < ax ? -1 : 1;
        const picture = paint(cols, Math.max(1, Math.round(Math.max(ay2 - ay, cy2 - cy))));
        for (let c = 0; c < cols; c++) {
          const f = c / cols;
          const top = ay + (cy - ay) * f;
          const bottom = ay2 + (cy2 - ay2) * f;
          const source = Math.floor((dir < 0 ? 1 - f - 1e-6 : f) * cols);
          g.drawImage(picture, (source + scroll) % picture.width, 0, 1, picture.height, Math.round(ax) + dir * c, Math.round(top), 1, Math.max(1, Math.round(bottom - top)));
        }
      } });
    };
    // As caras dos objetos 3D de cima da mesa, pintadas à frente deles.
    for (const f of TABLE_FACES[kind]) {
      const paint = (w: number, h: number): HTMLCanvasElement =>
        f.face === 'flip' ? this.flipFace(w, h, flipping)
        : f.face === 'led' ? this.ledFace(w, h)
        : f.face === 'arrow' ? this.arrowFace(w, h, s.period % 2 === 0)
        : this.foulFace(w, h, s.teamFouls[f.face === 'foul0' ? 0 : 1]);
      // Uma moldura de um palmo: a cara ocupa a frente menos 3 cm à volta.
      front(f.x - f.w / 2 + 0.03, f.x + f.w / 2 - 0.03, f.y + 0.005, f.z0 + 0.03, f.z0 + f.h - 0.03, paint);
    }
    if (kind === 'official') front(11.85, 14.65, -8.14, 0.24, 1.0, (w, h) => this.skirtText(w, h));
    else if (kind === 'broadcast') {
      // A frente de luzes da mesa toda.
      const shift = Math.floor(this.animTick / 2);
      front(11.65, 16.75, -8.09, 0.12, 0.84, (w, h) => this.ledStrip(s.tick < this.tableHomeUntil, w, h), s.tick < this.tableHomeUntil ? 0 : shift);
    }
  }

  /** A cara da seta da posse alternada: a seta vermelha, para a esquerda ou para a direita do ecrã, sobre escuro. */
  private arrowFace(w: number, h: number, left: boolean): HTMLCanvasElement {
    const key = `arrow|${w}|${h}|${left}`;
    const cached = this.boardCache.get(key);
    if (cached) return cached;
    const rows = ['..R.....', '.RR.....', 'RRRRRRR.', '.RR.....', '..R.....'];
    const image = this.faceCanvas(w, h, INK);
    if (h < 5) return image;
    const c = image.getContext('2d')!;
    const [ox, oy] = [(w - 7) >> 1, (h - 5) >> 1];
    c.fillStyle = TABLE_RED;
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch === 'R' && c.fillRect(ox + (left ? x : 6 - x), oy + y, 1, 1)));
    remember(this.boardCache, key, image, 64);
    return image;
  }

  /** A cara do marcador de faltas de uma equipa: o número de faltas em branco; toda vermelha quando já dão lances livres. */
  private foulFace(w: number, h: number, fouls: number): HTMLCanvasElement {
    const full = fouls > B.teamFoulLimit;
    const key = `fouls|${w}|${h}|${full ? 'full' : Math.min(9, fouls)}`;
    const cached = this.boardCache.get(key);
    if (cached) return cached;
    const image = this.faceCanvas(w, h, full ? TABLE_RED : PAPER);
    if (!full && h >= 6) text(image.getContext('2d')!, String(Math.min(9, fouls)), (w - 3) >> 1, (h - 5) >> 1, INK, 1);
    remember(this.boardCache, key, image, 64);
    return image;
  }

  /** Uma tela do tamanho da cara no ecrã, toda de uma cor. */
  private faceCanvas(w: number, h: number, color: string): HTMLCanvasElement {
    const image = document.createElement('canvas');
    image.width = w;
    image.height = h;
    const c = image.getContext('2d')!;
    c.fillStyle = color;
    c.fillRect(0, 0, w, h);
    return image;
  }

  /** O nome da câmara no saiote da mesa oficial, em letra clara ou escura conforme a cor do clube. */
  private skirtText(w: number, h: number): HTMLCanvasElement {
    const paint = this.textures.theme.paint;
    const key = `skirt|${w}|${h}|${paint.join()}`;
    const cached = this.boardCache.get(key);
    if (cached) return cached;
    // Os acentos sobem 3 linhas acima da letra.
    const label = 'MUNICÍPIO';
    const image = document.createElement('canvas');
    image.width = w;
    image.height = h;
    const c = image.getContext('2d')!;
    if (h < 8) {
      remember(this.boardCache, key, image, 64);
      return image;
    }
    const ink = 0.2126 * paint[0] + 0.7152 * paint[1] + 0.0722 * paint[2] > 140 ? INK : PAPER;
    // Assente em baixo, com uma linha de folga: os acentos ficam por cima, dentro da faixa.
    text(c, label, (w - (label.length * 4 - 1)) >> 1, Math.max(3, h - 6), ink, 1);
    remember(this.boardCache, key, image, 64);
    return image;
  }

  /** A cara do marcador de folhas: duas folhas brancas com o resultado e a faixa da cor de cada equipa, presas à barra. */
  private flipFace(w: number, h: number, flipping: { team: number; at: number } | null): HTMLCanvasElement {
    const [a, b] = this.tableScore;
    const half = flipping && this.s.tick - flipping.at < 6 ? flipping.team : -1;
    const key = `flip|${w}|${h}|${a}|${b}|${half}|${this.tableColors.join()}`;
    const cached = this.boardCache.get(key);
    if (cached) return cached;
    const image = this.faceCanvas(w, h, INK);
    const c = image.getContext('2d')!;
    const cw = (w - 3) >> 1;
    for (const team of [0, 1]) {
      const x0 = 1 + team * (cw + 1);
      c.fillStyle = this.tableColors[team]!;
      c.fillRect(x0, 1, cw, 1);
      c.fillStyle = PAPER;
      c.fillRect(x0, 2, cw, h - 3);
      const value = String(this.tableScore[team]);
      if (h >= 8) text(c, value, x0 + ((cw - (value.length * 4 - 1)) >> 1), 2 + ((h - 3 - 5) >> 1), INK, 1);
      if (half === team) {
        // A folha a meio da volta: a metade de cima tapada pelas costas da folha, com a sombra da dobra.
        const fold = 2 + ((h - 3) >> 1);
        c.fillStyle = '#d8d0b8';
        c.fillRect(x0, 2, cw, fold - 2);
        c.fillStyle = '#8a8270';
        c.fillRect(x0, fold, cw, 1);
      }
    }
    remember(this.boardCache, key, image, 64);
    return image;
  }

  /** A cara do marcador eletrónico da mesa oficial: o resultado em vermelho, com um traço âmbar, num ecrã escuro. */
  private ledFace(w: number, h: number): HTMLCanvasElement {
    const [a, b] = this.s.score;
    const key = `led|${w}|${h}|${a}|${b}`;
    const cached = this.boardCache.get(key);
    if (cached) return cached;
    const image = this.faceCanvas(w, h, INK);
    const c = image.getContext('2d')!;
    if (h < 7) return image;
    const label = `${a}-${b}`;
    const x = (w - (label.length * 4 - 1)) >> 1;
    const y = (h - 5) >> 1;
    text(c, String(a), x, y, LED_RED, 1);
    c.fillStyle = LED_AMBER;
    c.fillRect(x + String(a).length * 4, y + 2, 3, 1);
    text(c, String(b), x + (String(a).length + 1) * 4, y, LED_RED, 1);
    remember(this.boardCache, key, image, 64);
    return image;
  }

  /** A frente de luzes da mesa da transmissão: o nome do clube da casa a correr em branco sobre preto (a frente desliza
   * por cima dela, `scroll`); num cesto da casa, toda na cor dela, a piscar. */
  private ledStrip(home: boolean, w: number, h: number): HTMLCanvasElement {
    const blink = home && (this.animTick >> 2) % 2 === 0;
    const key = `strip|${w}|${h}|${home ? `h${blink}` : 'run'}|${this.tableColors[this.crowdTeam]}|${this.tableTitle}`;
    const cached = this.boardCache.get(key);
    if (cached) return cached;
    const club = this.tableColors[this.crowdTeam];
    const row = (h - 5) >> 1;
    // A volta inteira do texto: o nome, um quadrado na cor do clube e «BASQUETEBOL», pelo menos da largura da frente.
    const words = `${this.tableTitle}   `;
    const unit = (words.length + 'BASQUETEBOL'.length + 3) * 4 + 8;
    const loop = home ? w : Math.max(w, unit) + (Math.max(w, unit) % unit === 0 ? 0 : unit - (Math.max(w, unit) % unit));
    const image = document.createElement('canvas');
    image.width = loop;
    image.height = h;
    const c = image.getContext('2d')!;
    c.fillStyle = blink ? club : INK;
    c.fillRect(0, 0, loop, h);
    if (home) {
      for (let x = 4; x < w; x += 32) text(c, 'CESTO!', x, row, blink ? PAPER : club, 1);
    } else {
      for (let x = 0; x < loop; x += unit) {
        text(c, words, x + 4, row, PAPER, 1);
        c.fillStyle = club;
        c.fillRect(x + 4 + words.length * 4, row + 1, 3, 3);
        text(c, 'BASQUETEBOL', x + 12 + words.length * 4, row, PAPER, 1);
      }
    }
    remember(this.boardCache, key, image, 32);
    return image;
  }

  /** Quem está no banco, a mesa de oficiais e os treinadores. */
  private addSideline(drawables: Drawable[], time: number): void {
    const { g, s, camera } = this;
    // Os bancos e as placas desenham-se antes de tudo o resto; a mesa, à sua profundidade.
    // Com a placa gráfica, a mesa e os bancos são modelos 3D do cenário.
    for (const f of [...sideline(this.textures.theme), ...endBoards(this.textures.theme)]) {
      if (f.gpuOnly) continue;
      const box = this.boxDrawable(f.x0, f.x1, f.y0, f.y1, f.height, f.top, f.front);
      // A mesa está no meio do caminho: quem está sentado atrás dela fica tapado, e não por cima dela.
      // O estrado, baixo, ordena-se pela borda de trás: senão o tampo dele pintava-se por cima da mesa e do que está nela.
      drawables.push(f.table ? { ...box, y: camera.project((f.x0 + f.x1) / 2, f.height <= 0.3 ? f.y0 : f.y1, 0)[1] } : box);
    }
    this.addTable(drawables);
    for (const team of [0, 1] as const) {
      const benchers = s.bodies.filter(b => b.team === team && b.slot === -1);
      const startX = team === 0 ? 4.4 : 20.3;
      const leaving = new Set(this.exits.filter(e => e.body.team === team).map(e => e.body));
      const cheering = s.tick < this.benchCheerUntil[team] || (s.phase === 'end' && s.score[team] > s.score[team === 0 ? 1 : 0]);
      const inHuddle = this.holding();
      // Ao intervalo, o banco e o treinador também vão para o balneário, pelo túnel, a passo mais rápido; voltam na segunda parte.
      const toLocker = this.locker !== null;
      const speed = COACH_SPEED;
      benchers.forEach((b, i) => {
        if (this.ceremonyHides(b)) return;
        const held = this.ceremonyPlace(b);
        if (held) {
          const [hx, hy] = camera.project(held.x, held.y);
          this.drawn.bodies.set(b, { x: hx, y: hy, lift: 0, pose: held.pose, height: this.tall(this.view(b).look, hy), world: { x: held.x, y: held.y }, back: held.back, legs: held.legs });
          drawables.push({ y: hy, world: [held.x, held.y, 0], draw: () => this.sprite(g, held.pose, this.view(b).look, hx, hy, held.flip, held.back, false, held.legs) });
          return;
        }
        const locker = toLocker ? this.lockerAt(b) : this.returnAt(b);
        if (locker) {
          if ((locker.done && !this.street) || this.inTunnel(locker.y)) return;
          // À espera da vez, continua sentado.
          const [lx, ly] = camera.project(locker.x, locker.y);
          // Na rua, quem já saiu fica de pé do lado de fora da rede.
          const pose: PoseName = locker.moving ? locker.pose : locker.done ? 'idle' : locker.wait;
          const back = locker.moving && locker.dy < -Math.abs(locker.dx);
          this.drawn.bodies.set(b, { x: lx, y: ly, lift: 0, pose, height: this.tall(this.view(b).look, ly), world: { x: locker.x, y: locker.y }, back });
          drawables.push({ y: ly, world: [locker.x, locker.y, 0], draw: () => this.sprite(g, pose, this.view(b).look, lx, ly, locker.dx < 0, back, false) });
          return;
        }
        if (leaving.has(b)) return;
        const seat: Point = { x: startX + i * 0.95, y: BENCH_Y };
        // Os três primeiros do banco levantam-se para a roda do desconto, entre os titulares, e voltam a sentar-se no fim.
        const ringSpot = inHuddle && i < 3 ? huddleSpot(team, [1, 3, 5][i]!) : null;
        const pos = this.view(b).huddle ?? { ...seat };
        this.view(b).huddle = pos;
        const target = ringSpot ? { x: ringSpot[0], y: ringSpot[1] } : seat;
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
        // Pelo relógio da imagem e não pelo do jogo: depois do apito final o jogo para, e os suplentes continuam a saltar.
        const pose: PoseName = cheering && seated ? (Math.floor(this.animTick / 3) + i) % 2 ? 'cheer0' : 'cheer1' : seated ? 'sit' : walking ? RUN_FRAMES[Math.floor(time * 6) % 4]! : 'idle';
        const flip = walking ? dx < 0 : HUDDLE_CENTRE[team][0] < pos.x;
        this.drawn.bodies.set(b, { x: sx, y: sy, lift: 0, pose, height: this.tall(this.view(b).look, sy), world: { ...pos } });
        // Sentado, fica à frente do banco: no mundo, a face da frente do banco (mais alta) passava por cima das pernas.
        drawables.push({ y: sy, world: [pos.x, pos.y + (seated ? 0.4 : 0), 0], draw: () => this.sprite(g, pose, this.view(b).look, sx, sy, flip, false, false) });
      });
      const coachLocker = toLocker ? this.lockerAt(team) : this.returnAt(team);
      if (coachLocker) {
        if ((coachLocker.done && !this.street) || this.inTunnel(coachLocker.y)) continue;
        const [lx, ly] = camera.project(coachLocker.x, coachLocker.y);
        const pose: PoseName = coachLocker.moving ? coachLocker.pose : coachLocker.wait;
        const back = coachLocker.moving && coachLocker.dy < -Math.abs(coachLocker.dx);
        drawables.push({ y: ly, world: [coachLocker.x, coachLocker.y, 0], draw: () => {
          this.shadow(g, lx, ly);
          this.sprite(g, pose, this.coaches[team], lx, ly, coachLocker.dx < 0, back, false);
        } });
        continue;
      }
      // O treinador anda à frente do seu banco e para nas pontas, a pensar com a mão no queixo ou a apontar para o campo.
      // Nas paragens vai ter com a equipa, e fala-lhes de prancheta na mão.
      const huddle = this.holding();
      const coachBase = team === 0 ? 8 : 23.7;
      // O alvo é a roda da equipa, ou um passeio em frente ao banco; o treinador vai lá a andar, ao seu passo.
      const target: Point = huddle ? { x: HUDDLE_CENTRE[team][0], y: HUDDLE_CENTRE[team][1] } : { x: coachBase + Math.sin(time * 0.5 + team * 2) * 2.2, y: COACH_Y };
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
        world: [pos.x, pos.y, 0],
        draw: () => {
          this.shadow(g, cx, cy);
          this.sprite(g, coachPose, this.coaches[team], cx, cy, walking && dx < 0, false, false);
        },
      });
    }
  }

  /** Quem vai a caminho do banco: a andar da última posição em campo até ao seu lugar, e depois senta-se. */
  private addExits(drawables: Drawable[], alpha: number): void {
    const { g, s, camera } = this;
    for (let i = this.exits.length - 1; i >= 0; i--) {
      const e = this.exits[i]!;
      const look = this.view(e.body).look;
      // Quem é substituído a meio de um afundanço acaba-o primeiro: fica no aro, cai e aterra, e só depois vai para o banco.
      const jump = this.view(e.body).dunkJump;
      if (jump) {
        e.start = s.tick + alpha;
        const dunk = this.dunkLift(e.body, alpha, e.from.x, e.from.y);
        const [dx, dy] = camera.project(dunk.x, dunk.y);
        const pose = jump.pose ?? 'dunk';
        const withBall = jump.withBall === true;
        const flip = this.motionOf(e.body).flip;
        this.drawn.bodies.set(e.body, { x: dx, y: dy, lift: dunk.lift, pose, height: this.tall(look, dy), world: { x: dunk.x, y: dunk.y } });
        drawables.push({ y: dy, world: [dunk.x, dunk.y, 0], draw: () => {
          this.shadow(g, dx, dy);
          this.sprite(g, pose, look, dx, dy - dunk.lift, flip, false, withBall, undefined, dy);
        } });
        continue;
      }
      const t = (s.tick + alpha - e.start) / e.ticks;
      if (t >= 1) {
        this.exits.splice(i, 1);
        continue;
      }
      const world = { x: e.from.x + (e.to.x - e.from.x) * t, y: e.from.y + (e.to.y - e.from.y) * t };
      const [sx, sy] = camera.project(world.x, world.y);
      const pose = RUN_FRAMES[Math.floor(s.tick / 2.5) % 4]!;
      this.drawn.bodies.set(e.body, { x: sx, y: sy, lift: 0, pose, height: this.tall(look, sy), world });
      drawables.push({ y: sy, world: [world.x, world.y, 0], draw: () => this.sprite(g, pose, look, sx, sy, e.to.x < e.from.x, true, false) });
    }
  }

  /** Desenha um frame. `alpha` é a fração entre dois passos da simulação e `simSeconds` o tempo decorrido no jogo. */
  render(alpha: number, simSeconds: number, realSeconds = simSeconds): void {
    const { g, s, camera } = this;
    this.frameSeconds = simSeconds > 0 ? simSeconds : realSeconds;
    this.animTime += this.frameSeconds;
    this.realTime += realSeconds;
    this.lastRealSeconds = realSeconds;
    if (realSeconds > 0 && simSeconds > 0) this.simPerReal = simSeconds / realSeconds;
    this.animTick = Math.floor(this.animTime * 20);
    this.drawn.bodies.clear();
    this.drewSinceStep = true;
    this.drawn.ball = null;
    this.drawn.labels.length = 0;
    const time = this.animTime;
    const { theme } = this.textures;
    this.updateLocker();
    const ballX = this.ballPrevious.x + (this.ball.x - this.ballPrevious.x) * alpha;
    const [lookX, lookY] = this.cameraTarget(ballX);
    // Na cerimónia, quando o troféu sobe, a imagem corta logo para o dobro, sem passar por escalas fracionárias, e a
    // câmara fica parada (com movimento reduzido, desde o início).
    const lifted = this.ceremony !== null && this.realTime - this.ceremony.start >= this.ceremony.lift;
    const ease = lifted || (this.ceremony && this.reducedMotion) ? 1 : 1 - Math.exp(-simSeconds * (s.phase === 'end' ? 3 : 2.2));
    // No fim, perto do sítio, a câmara assenta de vez: senão continuava a rastejar meio píxel de cada vez.
    // Com movimento reduzido, vai logo para lá.
    const settled = s.phase === 'end' && (this.reducedMotion || (Math.abs(lookX - camera.lookX) < 0.02 && Math.abs(lookY - camera.lookY) < 0.02));
    if (settled) {
      if (camera.lookX !== lookX || camera.lookY !== lookY) camera.aim(lookX, lookY);
    } else if (s.phase === 'end') {
      // E vai a passo certo, no máximo END_CAMERA_SPEED m/s de jogo: o salto dos primeiros frames não se vê como um puxão.
      const most = END_CAMERA_SPEED * simSeconds;
      const step = (from: number, to: number): number => from + Math.max(-most, Math.min(most, (to - from) * ease));
      camera.aim(step(camera.lookX, lookX), step(camera.lookY, lookY));
    } else if (s.phase === 'intro' || s.phase === 'jump' || this.holding() || this.ceremony || this.tunnelShot()) {
      if (this.tunnelShot()) this.tunnelLeft = this.animTime;
      camera.aim(camera.lookX + (lookX - camera.lookX) * ease, camera.lookY + (lookY - camera.lookY) * ease);
    } else {
      // Com a bola a correr, a câmara anda mais devagar, como no Calciobit, mas a bola nunca fica a mais de
      // CAMERA_BALL_SLACK metros do centro da imagem.
      const calm = 1 - Math.exp(-simSeconds * CAMERA_CALM_RATE);
      const x = camera.lookX + (lookX - camera.lookX) * calm;
      const held = Math.max(ballX - CAMERA_BALL_SLACK, Math.min(ballX + CAMERA_BALL_SLACK, x));
      // Ao deixar o túnel, a bola pode estar longe: a câmara vai ter com ela a passo (até 8 m/s), sem o esticão do salto.
      const most = 8 * simSeconds;
      const fromTunnel = this.animTime - this.tunnelLeft < 2;
      camera.aim(fromTunnel ? camera.lookX + Math.max(-most, Math.min(most, held - camera.lookX)) : held, camera.lookY + (lookY - camera.lookY) * calm);
    }
    // Na paragem a imagem aproxima-se do banco da casa, e volta ao normal quando o jogo recomeça; a arte continua a ser
    // desenhada ao tamanho de sempre e é a imagem toda que cresce, por isso fica nítida ao dobro.
    // Na bola ao alto, como num grande plano: corte seco para o dobro sobre o círculo, e recuo em ~0,3 s quando a bola é tocada.
    const tipping = s.phase === 'jump';
    // No apito final, até a saída ou a cerimónia começarem, um grande plano de quem está à volta da bola.
    const ending = s.phase === 'end' && this.ceremony === null && this.exitStart === null;
    // Um lance livre com o jogo apertado no fim é o par do penálti: grande plano de quem lança, com o nome e a conta de hoje.
    const shooter = s.phase === 'freeThrow' && s.freeThrow && !s.freeThrow.returning && s.period >= 4 && s.clock < 1200 && Math.abs(s.score[0] - s.score[1]) <= 5 ? s.freeThrow.shooter : null;
    // Enquanto lança, a faixa fica parada a meio do fundido de entrada; quando acaba, sai como a da falta.
    if (shooter) {
      const name = shooter.player.name;
      const tries = s.events.filter(e => (e.type === 'freeThrowMade' || e.type === 'freeThrowMissed') && e.team === shooter.team && e.player === name);
      const made = tries.filter(e => e.type === 'freeThrowMade').length;
      this.freeThrowUntil = this.realTime + 1.5;
      this.foulMoment = { body: shooter, start: this.realTime - 0.3, label: `LANCE LIVRE: ${name.toUpperCase()} - ${made}/${tries.length} HOJE` };
    }
    const fouling = this.foulMoment !== null && (this.realTime - this.foulMoment.start < FOUL_ZOOM_SECONDS || this.realTime < this.freeThrowUntil) && !this.holding();
    if (tipping || fouling || ending) this.jumpZoom = true;
    const wantZoom = this.holding() || lifted || tipping || fouling || ending ? 2 : 1;
    this.zoom += (wantZoom - this.zoom) * (1 - Math.exp(-this.frameSeconds * (this.jumpZoom ? 10 : 4)));
    // O recuo da bola ao alto acaba mais cedo, a 5 % do fim: são ~0,3 s com escalas fracionárias, e não meio segundo.
    if (Math.abs(this.zoom - wantZoom) < (this.jumpZoom ? 0.05 : 0.01) || this.ceremony || tipping || fouling || ending || (this.jumpZoom && this.reducedMotion)) this.zoom = wantZoom;
    if (this.zoom === 1) this.jumpZoom = false;
    // A arte amplia-se sem suavizar; só os bonecos (drawSprite) ligam a suavização, e voltam a desligá-la.
    g.imageSmoothingEnabled = false;
    if (this.zoom > 1.001) {
      // Na cerimónia, o centro é o grupo com o troféu por cima; na bola ao alto, os dois saltadores com a bola por cima.
      const [px, py] = this.ceremony ? this.ceremonyFocus() : this.jumpZoom ? (s.phase === 'end' ? this.ballFocus() : this.foulMoment && this.s.phase !== 'jump' ? this.foulFocus(this.foulMoment.body) : this.jumpFocus()) : camera.project(HUDDLE_CENTRE[0][0], HUDDLE_CENTRE[0][1]);
      const z = this.zoom;
      const tx = Math.max(camera.width * (1 - z), Math.min(0, camera.width / 2 - z * px));
      const ty = Math.max(camera.height * (1 - z), Math.min(0, camera.height / 2 - z * py));
      // Arredondado a píxeis do ecrã, não da arte: um píxel de arte vale até 6 do ecrã e o zoom andava aos saltinhos.
      this.zoomShift = [Math.round(tx * this.art) / this.art, Math.round(ty * this.art) / this.art];
      g.setTransform(z * this.art, 0, 0, z * this.art, this.zoomShift[0] * this.art, this.zoomShift[1] * this.art);
    } else {
      this.zoomShift = [0, 0];
      g.setTransform(this.art, 0, 0, this.art, 0, 0);
    }
    // Num momento grande levantam-se quase todos (imagens 3 e 4, pessoas diferentes a cada batida); num pequeno, poucos (1 e 2).
    const excited = s.tick < this.excitedUntil;
    const beat = (this.animTick >> 2) % 2;
    const crowdFrame = excited ? (this.excitement >= 0.5 ? 3 : 1) + beat : (this.animTick >> 5) % 3 === 0 ? 1 : 0;
    const drawables: Drawable[] = [];
    const swishes: [number, number] = [0, 0];
    this.addSideline(drawables, time);
    this.addExits(drawables, alpha);
    this.addHumor(drawables);
    for (const hoopX of [HOOP_LEFT, HOOP_RIGHT]) {
      const outward = hoopX < 14 ? -1 : 1;
      const swish = hoopX === this.swishHoop && s.tick < this.swishUntil ? (this.swishUntil - s.tick) / SWISH_TICKS : 0;
      const hoopY = camera.project(hoopX + outward * 0.5, 0, 0)[1];
      // Com a placa gráfica, o cesto é um modelo 3D do cenário (a rede abre com `swish`).
      if (hoopX === HOOP_LEFT) swishes[0] = swish;
      else swishes[1] = swish;
      drawables.push({ y: hoopY, cpuOnly: true, draw: () => drawHoopBack(g, camera, theme, hoopX, swish) });
      drawables.push({ y: hoopY + HOOP_FRONT_OFFSET, cpuOnly: true, draw: () => drawHoopFront(g, camera, hoopX, swish) });
    }
    // Quem já entrou no túnel deixa de se ver; nos cenários de teste, só quem `visible` deixar.
    // Na ida para o balneário, quem já passou a porta.
    const inside = (b: Body): boolean => {
      const at = this.lockerAt(b);
      return at ? (at.done && !this.street) || this.inTunnel(at.y) : this.inTunnel(b.y);
    };
    const onCourt = [...s.court[0], ...s.court[1]].filter(b => !inside(b) && !this.ceremonyHides(b) && (!this.visible || this.visible(b)));
    const placed = onCourt.map(b => {
      const held = this.ceremonyPlace(b) ?? this.lockerPlace(b);
      if (held) {
        const look = held.trophy ? { ...this.view(b).look, trophy: held.trophy } : this.view(b).look;
        const [sx, sy] = camera.project(held.x, held.y);
        this.drawn.bodies.set(b, { x: sx, y: sy, lift: 0, pose: held.pose, height: this.tall(look, sy), world: { x: held.x, y: held.y }, back: held.back, legs: held.legs });
        return { body: b as Body | null, x: sx, y: sy, wx: held.x, wy: held.y, lift: 0, pose: held.pose, withBall: false, look, flip: held.flip, back: held.back, legs: held.legs };
      }
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
      // Quem bate no bloqueio fica virado para o bloqueador.
      const bumpFacing = pose === 'bump' && s.screen ? camera.project(s.screen.by.x, s.screen.by.y)[0] < sx : null;
      const flip = falling ? camera.project(b.x + b.fallHead, b.y)[0] < camera.project(b.x, b.y)[0] : postFacing ?? bumpFacing ?? motion.flip;
      // De costas só a andar, a deslizar em defesa, de pé, no crossover, a esticar os braços ou a saltar e agarrar a bola; o que se desenha tem o seu próprio bloqueio, para a troca entre
      // estas poses (do drible para a corrida, do salto para a corrida) não virar o boneco antes do tempo.
      const backable = BACK_POSES.test(pose);
      const wantBack = motion.back && backable;
      // Uma pose sem costas (crossover, passe, lançamento) vira-o de frente já, e isso também conta para o bloqueio.
      if ((wantBack !== motion.drawnBack && s.tick >= motion.drawnBackLock) || (!backable && motion.drawnBack)) {
        motion.drawnBack = wantBack;
        motion.drawnBackLock = s.tick + TURN_LOCK_TICKS;
      }
      const back = falling ? b.fallProne && pose.startsWith('fall') : motion.drawnBack && backable;
      const lift = this.tipLift(b, alpha) + this.reboundLift(b, alpha) + dunk.lift + this.shotLift(b, alpha);
      this.drawn.bodies.set(b, { x: sx, y: sy, lift, pose, height: this.tall(look, sy), world: { x: dunk.x, y: dunk.y }, back });
      // Um gesto de pés no chão feito a andar leva as pernas da corrida: os braços e a bola são do gesto, os pés andam.
      // O agachamento do afundanço não: esse fica preso ao sítio (`dunkLift`).
      const crouching = this.view(b).dunkJump !== undefined && this.view(b).dunkJump!.pin === undefined;
      const legs = motion.moving && lift === 0 && !crouching && !LOCOMOTION.test(pose) && (poseFeet(pose) <= 2 || CHEERS.has(pose)) ? RUN_FRAMES[this.view(b).steps % 4] : undefined;
      this.drawn.bodies.get(b)!.legs = legs;
      this.view(b).striding = legs !== undefined || LOCOMOTION.test(pose);
      return { body: b as Body | null, x: sx, y: sy, wx: dunk.x, wy: dunk.y, lift, pose, withBall, look, flip, back, legs };
    });
    const { referee } = this;
    // Depois do corte para o dobro, o árbitro já não está no plano da cerimónia.
    if (!this.visible && !lifted) {
      const refereeWorld = { x: referee.prevX + (referee.x - referee.prevX) * alpha, y: referee.prevY + (referee.y - referee.prevY) * alpha };
      const [refereeX, refereeY] = camera.project(refereeWorld.x, refereeWorld.y);
      const signalling = s.tick < referee.signalUntil;
      placed.push({
        body: null,
        x: refereeX,
        y: refereeY,
        wx: refereeWorld.x,
        wy: refereeWorld.y,
        lift: 0,
        pose: signalling ? 'cheer0' : referee.moving ? RUN_FRAMES[Math.floor(s.tick / 2.5) % 4]! : 'idle',
        withBall: false,
        look: this.refereeLook,
        flip: referee.flip,
        back: false,
        legs: undefined,
      });
    }
    // A poeira fica no chão, atrás de quem a levantou: sobe, abre e esbate-se.
    for (const q of this.puffs) {
      const age = (s.tick + alpha - q.born) / PUFF_TICKS;
      if (age >= 1) continue;
      const [qx, qy] = camera.project(q.x, q.y);
      drawables.push({
        y: qy - 1,
        world: [q.x, q.y, 0],
        box: [qx - 10, qy - 14, qx + 10, qy + 4],
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
        world: [p.wx, p.wy, 0],
        draw: () => {
          this.shadow(g, p.x, p.y);
          this.sprite(g, p.pose, p.look, p.x, p.y - p.lift, p.flip, p.back, p.withBall, p.legs, p.y);
        },
      });
    }
    const inHands = this.ballInHands();
    const holderOverride = inHands ? this.view(inHands).override : undefined;
    const holderDrawsBall = inHands !== null && (!holderOverride || holderOverride.until <= s.tick || holderOverride.withBall === true);
    // No afundanço, a bola vai na mão de quem afunda até ao aro.
    const dunkerDrawsBall = s.flight?.kind === 'shot' && this.view(s.flight.shooter).dunkJump?.withBall === true && this.drawn.bodies.has(s.flight.shooter);
    const carrierBody = holderDrawsBall ? inHands : dunkerDrawsBall && s.flight?.kind === 'shot' ? s.flight.shooter : null;
    // Quem leva a bola desenha-se sem ela, e a bola desenha-se logo a seguir, no sítio da mão: assim pode vir de onde
    // estava (`placeBall`) em vez de saltar quando muda de mãos. Numa pose sem a bola nas mãos, a bola fica solta.
    const carrier = carrierBody ? placed.find(p => p.body === carrierBody && p.withBall) : undefined;
    const inHand = carrier ? spriteBall(carrier.pose, carrier.look, carrier.legs) : null;
    if (carrier && inHand) {
      carrier.withBall = false;
      const k = this.depth(carrier.y);
      const target: [number, number] = [carrier.x + (carrier.flip ? -(inHand[0] + 1) : inHand[0]) * k, carrier.y - carrier.lift + inHand[1] * k];
      const [bx, by] = this.placeBall(target, 'hand');
      this.trail.length = 0;
      // Na mão, a bola fica à frente de quem a leva.
      drawables.push({ y: carrier.y + 0.001, world: [carrier.wx, carrier.wy, 0], box: [bx - 8 * k - 2, by - 8 * k - 2, bx + 8 * k + 2, by + 8 * k + 2], bias: GROUND_BIAS + 0.05, draw: () => this.drawBallAt(g, bx, by, k) });
    } else if (!lifted) {
      const x = this.ballPrevious.x + (this.ball.x - this.ballPrevious.x) * alpha;
      const y = this.ballPrevious.y + (this.ball.y - this.ballPrevious.y) * alpha;
      let z = this.ballPrevious.z + (this.ball.z - this.ballPrevious.z) * alpha;
      // Num passe picado a bola desce ao chão a meio do caminho e volta a subir até às mãos.
      if (s.flight?.kind === 'pass' && this.isBouncePass(s.flight)) {
        const t = Math.min(1, (s.flight.ticks + alpha) / Math.max(1, s.flight.total));
        z = Math.max(B.ballRestHeight, z - (z - B.ballRestHeight) * Math.sin(Math.PI * t));
      }
      const [gx, gy] = camera.project(x, y);
      const [bx, by] = this.placeBall(this.ballScreen(x, y, z), 'free');
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
      // No mundo, a sombra fica no chão e a bola (com o rasto) no sítio onde está, entre as peças do aro como no mundo.
      drawables.push({ y: ballLayer - 0.001, world: [x, y, 0], draw: () => this.shadow(g, gx, gy, 3) });
      const xs = [bx, ...this.trail.map(t => t[0])];
      const ys = [by, ...this.trail.map(t => t[1])];
      drawables.push({
        y: ballLayer,
        // Como na tela 2D, na ordem do chão por baixo dela, logo à frente de quem está no mesmo sítio (a lançar, a receber);
        // junto ao cesto, no sítio onde está, para passar por dentro do aro.
        world: nearbyHoop === undefined ? [x, y, 0] : [x, y, z],
        bias: nearbyHoop === undefined ? GROUND_BIAS + 0.05 : 0,
        box: [Math.min(...xs) - 8, Math.min(...ys) - 8, Math.max(...xs) + 8, Math.max(...ys) + 8],
        draw: () => {
          this.trail.forEach(([tx, ty], i) => {
            g.fillStyle = `rgba(242,194,48,${(i + 1) / (TRAIL_LENGTH * 2.5)})`;
            g.fillRect((tx | 0) - 1, (ty | 0) - 1, 3, 3);
          });
          drawBall(g, bx, by);
        },
      });
    } else {
      this.ballTarget = null;
      this.ballDrawnAt = null;
    }
    drawables.sort((a, b) => a.y - b.y);
    // Os reflexos vão por baixo de tudo, senão apareciam por cima de outros jogadores.
    const reflections = theme.reflection > 0 ? placed : [];
    // O cenário (chão, linhas, bancadas e paredes, ou o exterior do campo de rua) e tudo o que está no mundo (público,
    // jogadores, bancos, cestos, bola, sombras, reflexos) vão para a placa gráfica, à resolução do ecrã, cada coisa com a sua
    // profundidade. Sem WebGL 2, com WebGL por software, ou com o contexto perdido, fica tudo na tela 2D, como antes.
    const frame = this.reducedMotion ? 0 : crowdFrame;
    // Flashes de fotografia nas bancadas: ao acaso, mas pelo animTick, para duas gravações da mesma cena saírem iguais.
    const flashes: [number, number][] = [];
    if (excited && theme.flashes && !this.reducedMotion) {
      for (let i = 0; i < 6; i++) {
        const h = Math.imul(this.animTick * 6 + i + 1, 2654435761) >>> 0;
        flashes.push([(h >>> 8) % camera.width, h % Math.max(1, Math.floor(camera.height * 0.25))]);
      }
    }
    const gpu = courtGpu();
    let gpuScene: HTMLCanvasElement | null = null;
    if (gpu) {
      // A tela 2D serve de rascunho: os bonecos vão diretos para a placa, e o resto pinta-se aqui e copia-se.
      const world: WorldSprite[] = [];
      this.clearCanvas();
      this.spriteMode = 'collect';
      this.spriteSink = world;
      this.captureUsed = 0;
      // No mundo, cada flash sai da cara de um adepto que se vê.
      const seen = this.fans.map((f, i) => ({ i, p: camera.project(f.x, f.y, f.z + 1.2) })).filter(({ p }) => p[0] >= 0 && p[0] < camera.width && p[1] >= 2 && p[1] < camera.height).map(({ i }) => i);
      this.flashFans = new Set(seen.length > 0 ? flashes.map(([x, y]) => seen[(x * 31 + y) % seen.length]!) : []);
      try {
        this.drawOutsiders();
        this.drawFans();
        for (const p of reflections) world.push(this.reflection(p, theme.reflection));
        for (const d of drawables) {
          if (d.cpuOnly) continue;
          this.spriteWorld = d.world ?? null;
          d.draw();
          this.spriteWorld = null;
          if (d.box && d.world) {
            const copy = this.capture(d.box, d.world, d.bias ?? 0);
            if (copy) world.push(d.tall ? { ...copy, flat: false, tall: d.tall } : copy);
          }
        }
      } finally {
        this.flashFans = null;
        this.spriteWorld = null;
        this.spriteMode = 'draw';
      }
      this.clearCanvas();
      gpuScene = gpu.draw(camera, this.textures, camera.width * this.art, camera.height * this.art, this.zoom > 1.001 ? this.zoom : 1, this.zoomShift, frame, world, swishes);
    }
    this.gpuFloor = gpuScene;
    if (gpuScene) {
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(gpuScene, 0, 0);
      g.restore();
      this.sceneStale = true;
    } else {
      let fresh = camera.drawScene(this.pixels, this.textures, frame, this.fence?.pixels);
      if (flashes.length > 0) {
        // Os flashes sujam os píxeis do cenário, que têm de se refazer na imagem seguinte.
        for (const [x, y] of flashes) this.pixels[y * camera.width + x] = 0xffffffff;
        camera.forgetScene();
        fresh = true;
      }
      // Com a imagem aproximada, ou com a câmara parada, o cenário passa por uma tela à parte: `putImageData` ignora a
      // aproximação, `drawImage` não, e parada a tela já tem a imagem certa. Com a câmara a andar e sem aproximação vai
      // direto, que é uma cópia a menos.
      if (this.zoom > 1.001 || !fresh || this.art > 1) {
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
      for (const p of reflections) drawReflection(g, p.pose, p.look, p.x, p.y, p.flip, p.back, theme.reflection, p.legs, this.depth(p.y));
      for (const d of drawables) {
        // O sítio no mundo, para quem entra no túnel se desvanecer (`tunnelFade`).
        this.spriteWorld = d.world ?? null;
        d.draw();
      }
      this.spriteWorld = null;
    }
    if (this.ballTrace) this.ballTrace.push({ tick: s.tick, mode: this.ballDrawnAt ? this.ballMode : 'none', x: this.ballDrawnAt ? this.ballDrawnAt[0] * this.zoom + this.zoomShift[0] : NaN, y: this.ballDrawnAt ? this.ballDrawnAt[1] * this.zoom + this.zoomShift[1] : NaN, phase: s.phase, zoom: this.zoom, dt: this.frameSeconds });
    this.drawCarrier(alpha);
    this.drawNameTags(alpha);
    this.drawFloaters();
    this.drawBubbles();
    if (this.ownerSpeech) this.speech('ANDA CÁ BOBI!', this.ownerSpeech[0], this.ownerSpeech[1], this.ownerSpeech[2], 21);
    this.ownerSpeech = null;
    this.drawForecast();
    this.drawCeremony();
    this.drawBigScore();
    this.drawFoulStrip();
    const fade = Math.max(this.endFade, s.phase === 'break' && s.period === 2 ? Math.max(0, 1 - (2 * s.timer) / (B.periodBreakSeconds * 20)) : Math.max(0, (this.fadeInUntil - s.tick - alpha) / FADE_IN_TICKS));
    if (fade > 0) {
      g.fillStyle = `rgba(27,34,48,${fade})`;
      g.fillRect(0, 0, camera.width, camera.height);
    }
    // Acima de 2× o tremor seria um zumbido, e com movimento reduzido não há tremor.
    if (!this.reducedMotion && this.simPerReal <= 2 && this.realTime < this.shakeUntil) {
      const phase = Math.floor(this.realTime * SHAKE_HZ);
      // Um píxel de arte em píxeis CSS: a tela está à escala da arte e o CSS amplia-a.
      const art = g.canvas.clientWidth > 0 ? g.canvas.clientWidth / this.camera.width : 1;
      g.canvas.style.transform = `translate(${(phase % 2 ? 1 : -1) * art}px, ${((phase >> 1) % 2 ? 1 : -1) * art}px)`;
    } else if (g.canvas.style.transform) {
      g.canvas.style.transform = '';
    }
    g.setTransform(this.art, 0, 0, this.art, 0, 0);
  }

  /**
   * A cerimónia do troféu, depois do apito final: `team` junta-se no meio campo e o seu melhor marcador, o capitão,
   * levanta o troféu; os outros saem a passo do enquadramento. Acaba CEREMONY_AFTER_LIFT reais depois de o troféu subir
   * (`ceremonyDone`).
   */
  startCeremony(trophy: 'cup' | 'bigCup', banner: string, team: TeamIndex = 0): void {
    const { s } = this;
    const winners = s.court[team];
    const captain = winners.reduce((best, b) => (b.line.points > best.line.points ? b : best));
    const walks = new Map<Body, Walk>();
    const run = (b: Body, to: Point): Walk => makeWalk([{ x: b.x, y: b.y }, to], CEREMONY_RUN_SPEED, RUN_FRAMES);
    walks.set(captain, run(captain, CEREMONY_CENTRE));
    winners.filter(b => b !== captain).forEach((b, i) => walks.set(b, run(b, { x: CEREMONY_CENTRE.x + CEREMONY_RING[i]![0], y: CEREMONY_CENTRE.y + CEREMONY_RING[i]![1] })));
    // Os vencidos afastam-se do meio campo, a direito, até sair do que se vê a 2×: nunca passam pelo grupo.
    const [rx, ry] = this.ceremonyReach();
    const out = (p: Point): Point | null => {
      const dx = (p.x - CEREMONY_CENTRE.x) / rx;
      const dy = (p.y - CEREMONY_CENTRE.y) / ry;
      // A imagem é um retângulo: sai-se pelo lado mais perto, a direito desde o centro.
      const r = Math.max(Math.abs(dx), Math.abs(dy));
      const to = r >= 1 ? null : r < 0.05 ? { x: CEREMONY_CENTRE.x, y: CEREMONY_CENTRE.y - ry } : { x: CEREMONY_CENTRE.x + (dx / r) * rx, y: CEREMONY_CENTRE.y + (dy / r) * ry };
      // Quem sai para o fundo para à frente da mesa, em vez de entrar por ela adentro.
      const span = TABLE_SPAN[tableKind(this.textures.theme)];
      if (to && to.x > span.x0 - 0.5 && to.x < span.x1 + 0.5) to.y = Math.max(to.y, span.front + 0.3);
      return to;
    };
    const other: TeamIndex = team === 0 ? 1 : 0;
    for (const b of s.court[other]) {
      const from = { x: b.x, y: b.y };
      walks.set(b, makeWalk([from, out(from) ?? from], CEREMONY_WALK_SPEED, WALK_FRAMES));
    }
    // Quem foi substituído no apito final ia a caminho do banco ao ritmo da simulação, que parou: vai a passo, por fora
    // do enquadramento, e senta-se.
    const benched = new Set<Body>();
    for (const e of this.exits) {
      const k = Math.max(0, Math.min(1, (s.tick - e.start) / e.ticks));
      const from = { x: e.from.x + (e.to.x - e.from.x) * k, y: e.from.y + (e.to.y - e.from.y) * k };
      const away = out(from);
      walks.set(e.body, makeWalk(away ? [from, away, e.to] : [from, e.to], CEREMONY_WALK_SPEED, WALK_FRAMES));
      benched.add(e.body);
    }
    this.exits.length = 0;
    // O troféu sobe quando os vencedores já chegaram e os outros já saíram do enquadramento; nunca antes de
    // CEREMONY_LIFT_SECONDS nem depois de CEREMONY_LIFT_MAX_SECONDS (quem ainda vai a caminho do banco sai pelo lado).
    const lift = this.reducedMotion ? CEREMONY_LIFT_SECONDS : Math.min(CEREMONY_LIFT_MAX_SECONDS, Math.max(CEREMONY_LIFT_SECONDS, ...[...walks.entries()].map(([b, w]) => (benched.has(b) ? 0 : w.length / w.speed + 0.3))));
    const kit = kitColors(this.view(captain).look);
    this.ceremony = { trophy, banner, team, start: this.realTime, lift, captain, cheered: false, walks, benched, colors: [[kit.jersey, kit.shade], [kit.trim, shadeOf(kit.trim)], GOLD] };
    // A bancada toda de pé, até ao fim.
    this.excitedUntil = s.tick + 100000;
    this.excitement = 1;
    this.fansReact(true, 100000, 1);
  }

  /** A cerimónia já acabou, ou nunca começou: é a hora do relatório. */
  ceremonyDone(): boolean {
    return this.ceremony === null || this.realTime - this.ceremony.start >= this.ceremony.lift + CEREMONY_AFTER_LIFT;
  }

  /** Em grande plano na bola ao alto: o marcador sai, senão tapava a bola lá em cima. */
  closeUp(): boolean {
    return this.jumpZoom && this.s.phase === 'jump';
  }

  /**
   * Para verificar que a bola nunca salta: guarda onde ela foi desenhada em cada imagem, em píxeis de arte já com a
   * aproximação. Liga-se pondo `ballTrace = []` (pela API de depuração, `matchView()`).
   */
  ballTrace: { tick: number; mode: 'free' | 'hand' | 'none'; x: number; y: number; phase: string; zoom: number; dt: number }[] | null = null;

  /**
   * Onde a bola se desenha nesta imagem: no alvo, mais o que ainda falta percorrer. Quando o alvo salta (a bola muda de
   * mãos, passa de solta para a mão ou ao contrário, ou a pose mexe a mão de repente), a bola parte de onde estava
   * desenhada e chega ao alvo em ~0,2 s, em vez de aparecer logo no sítio novo. Um salto enorme (outra ponta do campo)
   * é um corte, e aí vai logo.
   */
  private placeBall(target: [number, number], mode: 'free' | 'hand'): [number, number] {
    const last = this.ballTarget;
    const at = this.ballDrawnAt;
    if (last && at) {
      const jump = Math.hypot(target[0] - last[0], target[1] - last[1]);
      const sudden = mode !== this.ballMode ? jump > BALL_SNAP_PX : jump > BALL_SNAP_PX + 3 * this.ballStep;
      if (jump >= BALL_CUT_PX) this.ballLag = [0, 0];
      else if (sudden) this.ballLag = [at[0] - target[0], at[1] - target[1]];
      else this.ballStep = jump;
    }
    const fade = this.reducedMotion ? 0 : Math.exp(-this.lastRealSeconds / BALL_EASE_SECONDS);
    this.ballLag = [this.ballLag[0] * fade, this.ballLag[1] * fade];
    if (Math.abs(this.ballLag[0]) < 0.3 && Math.abs(this.ballLag[1]) < 0.3) this.ballLag = [0, 0];
    this.ballTarget = target;
    this.ballMode = mode;
    const drawn: [number, number] = [target[0] + this.ballLag[0], target[1] + this.ballLag[1]];
    this.ballDrawnAt = drawn;
    return drawn;
  }

  /** A bola na mão, com o tamanho do boneco que a leva (o mesmo desenho que vinha dentro dele). */
  private drawBallAt(g: CanvasRenderingContext2D, x: number, y: number, k: number): void {
    if (k === 1) return drawBall(g, x, y);
    g.save();
    g.translate(x | 0, y | 0);
    g.scale(k, k);
    drawBall(g, 0, 0);
    g.restore();
  }

  /** O tamanho de um boneco com os pés na linha `y`, na tela do jogo (num ecrã de densidade 1 fica mais suave). */
  private depth(y: number): number {
    if (!this.perspective) return 1;
    // Arredondado a um píxel do ecrã na altura da tela do boneco: entre degraus as bordas ficam paradas, e cada degrau
    // mexe-as no máximo um píxel do ecrã (sem o arredondamento, ondulavam a cada frame de movimento).
    const steps = SPRITE_H * this.art;
    return Math.round(this.camera.depthScale(y) * steps) / steps;
  }

  /** Um boneco no mundo, maior ou mais pequeno com a distância. */
  private sprite(g: CanvasRenderingContext2D, pose: PoseName, look: Look, x: number, y: number, flip: boolean, back: boolean, withBall: boolean, legs?: PoseName, feet = y): void {
    // `feet`: num salto, o tamanho vem do chão, onde está a sombra, e não da altura a que o boneco vai.
    const scale = this.depth(feet);
    // Um boneco com o sítio no mundo (`spriteWorld`) vai para a placa gráfica: guarda-se no `collect`, salta-se no `skip`.
    // Quem entra no túnel desvanece-se no escuro, até deixar de se ver; quem sai aparece do escuro.
    const fade = this.spriteWorld && !this.inStands && !this.outside ? this.tunnelFade(this.spriteWorld[1]) : 1;
    if (fade <= 0) return;
    if (this.spriteWorld && this.spriteMode !== 'draw') {
      // Nas bancadas, um cartão em pé (o degrau de trás cortava os braços no ar); no chão, todo à profundidade dos pés, como
      // na ordem da tela 2D: o cartão em pé ficava à frente da bola que o boneco tem nas mãos e do poste que tem atrás.
      if (this.spriteMode === 'collect') this.spriteSink.push({ ...spriteQuad(pose, look, x, y, flip, back, withBall, legs, scale), feet: this.spriteWorld, ...(this.inStands ? {} : { flat: true, bias: GROUND_BIAS }), ...(fade < 1 ? { alpha: fade } : {}) });
      return;
    }
    if (fade < 1) {
      g.save();
      g.globalAlpha *= fade;
      drawSprite(g, pose, look, x, y, flip, back, withBall, legs, scale);
      g.restore();
    } else drawSprite(g, pose, look, x, y, flip, back, withBall, legs, scale);
  }
  /** Os bonecos para a placa gráfica: `collect` guarda-os em `spriteSink` (com os pés em `spriteWorld`), `draw` desenha-os na
   * tela 2D como sempre. */
  private spriteMode: 'draw' | 'collect' = 'draw';
  private spriteSink: WorldSprite[] = [];
  private spriteWorld: Vec3 | null = null;
  /** Os bonecos que se desenham agora estão do lado de fora da rede da rua. */
  private outside = false;
  /** Os bonecos que se desenham agora estão nas bancadas (os adeptos). */
  private inStands = false;
  /** O balão do dono do cão desta imagem (quem fala, a cabeça e os pés): desenha-se com a interface, por cima do mundo. */
  private ownerSpeech: [number, number, number] | null = null;
  /** Os adeptos que tiram uma fotografia nesta imagem (com a placa gráfica). */
  private flashFans: Set<number> | null = null;
  // As telas para onde se copia o que não é boneco, reaproveitadas de imagem para imagem.
  private readonly capturePool: HTMLCanvasElement[] = [];
  private captureUsed = 0;

  /** Limpa a tela inteira, que com a placa gráfica serve de rascunho. */
  private clearCanvas(): void {
    const { g } = this;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    g.restore();
  }

  /**
   * Copia o que se pintou na tela dentro de `box` (píxeis da arte) para uma imagem do mundo em `world`, e apaga-o da tela.
   * A cópia fica à resolução do ecrã, por isso sai igual ao que a tela teria.
   */
  private capture(box: Box, world: Vec3, bias: number): WorldSprite | null {
    const { g } = this;
    const m = g.getTransform();
    const x0 = Math.max(0, Math.floor(box[0] * m.a + m.e));
    const y0 = Math.max(0, Math.floor(box[1] * m.d + m.f));
    const x1 = Math.min(g.canvas.width, Math.ceil(box[2] * m.a + m.e));
    const y1 = Math.min(g.canvas.height, Math.ceil(box[3] * m.d + m.f));
    if (x1 <= x0 || y1 <= y0) return null;
    const w = x1 - x0;
    const h = y1 - y0;
    // A placa gráfica guarda o tamanho de uma imagem da primeira vez que a recebe: uma tela reaproveitada só cresce, em
    // degraus de 64, e usa-se o canto de baixo à esquerda (o primeiro texel da placa, com as imagens viradas).
    let copy = this.capturePool[this.captureUsed];
    if (!copy || copy.width < w || copy.height < h) {
      if (copy) courtGpu()?.forget(copy);
      copy = document.createElement('canvas');
      copy.width = Math.ceil(w / 64) * 64;
      copy.height = Math.ceil(h / 64) * 64;
      this.capturePool[this.captureUsed] = copy;
    }
    this.captureUsed++;
    const c = copy.getContext('2d')!;
    c.clearRect(0, 0, copy.width, copy.height);
    c.drawImage(g.canvas, x0, y0, w, h, 0, copy.height - h, w, h);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(x0, y0, w, h);
    g.restore();
    // De volta a píxeis da arte, antes da aproximação, como os bonecos.
    return { image: copy, used: [w, h], left: (x0 - m.e) / m.a, top: (y0 - m.f) / m.d, width: w / m.a, height: h / m.d, flip: false, feet: world, alpha: 1, flat: true, bias, dynamic: true };
  }

  /** No passe para a placa gráfica, copia para o mundo o que acabou de se pintar em `box`; fora dele, não faz nada. */
  private toWorld(box: Box, world: Vec3, bias = 0, upright = false): void {
    if (this.spriteMode !== 'collect') return;
    const copy = this.capture(box, world, bias);
    // `upright`: em pé como um boneco (uma bandeira), senão o degrau de trás cortava-a.
    if (copy) this.spriteSink.push(upright ? { ...copy, flat: false } : copy);
  }

  /** A caixa, no ecrã, de uns pontos do mundo. */
  private boxOf(points: readonly Vec3[]): Box {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const [x, y, z] of points) {
      const [sx, sy] = this.camera.project(x, y, z);
      xs.push(sx);
      ys.push(sy);
    }
    return [Math.min(...xs) - 3, Math.min(...ys) - 3, Math.max(...xs) + 3, Math.max(...ys) + 3];
  }

  /** Uma caixa de madeira (a mesa, um banco), só na tela 2D: com a placa gráfica é um modelo 3D do cenário. */
  private boxDrawable(x0: number, x1: number, y0: number, y1: number, height: number, top: string, front: string): Drawable {
    // Encostadas à parede: desenham-se antes de tudo o resto.
    return { y: -Infinity, cpuOnly: true, draw: () => drawBox(this.g, this.camera, x0, x1, y0, y1, height, top, front) };
  }

  /** O reflexo de um jogador no chão polido, para a placa gráfica: o boneco virado ao contrário, quase transparente. */
  private reflection(p: { pose: PoseName; look: Look; x: number; y: number; wx: number; wy: number; flip: boolean; back: boolean; legs?: PoseName }, strength: number): WorldSprite {
    const q = spriteQuad(p.pose, p.look, p.x, p.y, p.flip, p.back, false, p.legs, this.depth(p.y));
    // Como em `drawReflection`: virado à volta da linha dos pés.
    const mirrored = 2 * (p.y | 0) + 1 - (q.top + q.height);
    // Atrás de tudo o que está no chão à volta.
    return { ...q, top: mirrored, mirror: true, feet: [p.wx, p.wy, 0], alpha: strength, flat: true, bias: -0.3 };
  }

  /** A altura de um boneco com os pés na linha `y`, já com o tamanho da distância: para o que fica por cima da cabeça. */
  private tall(look: Look, y: number): number {
    return Math.round(spriteHeight(look) * this.depth(y));
  }

  /** A sombra de um boneco, do tamanho dele. */
  private shadow(g: CanvasRenderingContext2D, x: number, y: number, radius = 7): void {
    const r = Math.max(2, Math.round(radius * this.depth(y)));
    // Com a placa gráfica, uma imagem guardada por tamanho, no chão por baixo de quem a faz: sem a pintar e copiar.
    const fade = this.spriteWorld && !this.inStands && !this.outside ? this.tunnelFade(this.spriteWorld[1]) : 1;
    if (fade <= 0) return;
    if (this.spriteMode === 'collect' && this.spriteWorld) {
      const [wx, wy] = this.spriteWorld;
      this.spriteSink.push({ image: shadowImage(r), left: (x | 0) + 1 - r, top: (y | 0) - 2, width: 2 * r, height: 4, flip: false, feet: [wx, wy, 0], alpha: fade, flat: true, bias: 0 });
      return;
    }
    g.save();
    g.globalAlpha *= fade;
    drawShadow(g, x, y, r);
    g.restore();
  }

  /** O centro do grande plano do apito final: a bola, onde estão os jogadores. */
  private ballFocus(): [number, number] {
    // O meio dos dez em campo: no apito a bola pode estar solta longe deles.
    const on = [...this.s.court[0], ...this.s.court[1]];
    const [x, y] = this.camera.project(on.reduce((a, b) => a + b.x, 0) / on.length, on.reduce((a, b) => a + b.y, 0) / on.length);
    return [x, y - 14];
  }

  /** O centro do grande plano de uma falta: quem a fez, com a cabeça no meio. */
  private foulFocus(body: Body): [number, number] {
    const [x, y] = this.camera.project(body.x, body.y);
    return [x, y - 14];
  }

  /** A faixa da falta: escura e translúcida, em baixo, com o nome; entra e sai num fundido de 0,3 s. */
  private drawFoulStrip(): void {
    const f = this.foulMoment;
    if (!f) return;
    const t = this.realTime - f.start;
    if (t >= FOUL_STRIP_SECONDS) {
      this.foulMoment = null;
      return;
    }
    const { g, camera } = this;
    const fade = this.reducedMotion ? 1 : Math.min(1, t / 0.3, (FOUL_STRIP_SECONDS - t) / 0.3);
    const w = textWidth(f.label) + 24;
    const x = (camera.width - w) >> 1;
    const y = camera.height - 52;
    g.save();
    g.setTransform(this.art, 0, 0, this.art, 0, 0);
    g.globalAlpha = 0.88 * fade;
    g.fillStyle = INK;
    g.fillRect(x, y, w, 24);
    g.globalAlpha = fade;
    g.fillStyle = GOLD[1];
    g.fillRect(x, y, 3, 24);
    text(g, f.label, x + 14, y + 9, '#f8f0d8');
    g.restore();
  }

  /** O centro do grande plano da bola ao alto: o meio campo, um pouco acima, para a bola caber quando sobe. */
  private jumpFocus(): [number, number] {
    const [x, y] = this.camera.project(COURT_LENGTH / 2, 0);
    return [x, y - 16];
  }

  /** O ponto do ecrã no centro da aproximação: o grupo, com o troféu por cima. */
  private ceremonyFocus(): [number, number] {
    const [x, y] = this.camera.project(CEREMONY_CENTRE.x, CEREMONY_CENTRE.y);
    return [x, y - 18];
  }

  /** Quantos metros, para os lados e para cima e baixo, cabem a 2× à volta do grupo, com folga para um boneco. */
  private ceremonyReach(): [number, number] {
    const { camera } = this;
    // Medido com a câmara já no meio campo, onde vai estar no corte (ela roda um pouco ao seguir o jogo).
    const [lookX, lookY] = [camera.lookX, camera.lookY];
    camera.aim(CEREMONY_CENTRE.x, camera.tuning.lookY);
    const [cx, cy] = camera.project(CEREMONY_CENTRE.x, CEREMONY_CENTRE.y);
    const perX = Math.abs(camera.project(CEREMONY_CENTRE.x + 1, CEREMONY_CENTRE.y)[0] - cx);
    const perY = Math.abs(camera.project(CEREMONY_CENTRE.x, CEREMONY_CENTRE.y + 1)[1] - cy);
    camera.aim(lookX, lookY);
    // A folga de um boneco e meio de largura: mais perto da câmara, um metro ocupa mais píxeis.
    return [(camera.width / 4 + 26) / perX, (camera.height / 4 + 18 + 34) / perY];
  }

  /** Onde está e o que faz cada um na cerimónia; null fora dela. Com movimento reduzido, já no sítio e sem saltar. */
  private ceremonyPlace(b: Body): { x: number; y: number; pose: PoseName; flip: boolean; back: boolean; legs?: PoseName; trophy?: 'cup' | 'bigCup' } | null {
    const c = this.ceremony;
    const walk = c?.walks.get(b);
    if (!c || !walk) return null;
    const t = this.realTime - c.start;
    const still = this.reducedMotion;
    const winner = b.team === c.team;
    const at = walkAt(walk, still ? Infinity : t);
    const { x, y } = at;
    // A correr para o grupo; quem perdeu vai a passo, de cabeça baixa. De costas quando se afasta da câmara.
    const back = at.dy < -Math.abs(at.dx);
    if (at.moving) return winner ? { x, y, pose: at.pose, flip: at.dx < 0, back } : { x, y, pose: 'slump', legs: at.pose, flip: at.dx < 0, back };
    const facing = x > CEREMONY_CENTRE.x;
    if (c.benched.has(b)) return { x, y, pose: 'sit', flip: facing, back: false };
    if (!winner) return { x, y, pose: this.s.score[b.team] < this.s.score[c.team] ? 'slump' : 'idle', flip: facing, back: false };
    const lifting = t - c.lift;
    if (b === c.captain) {
      if (lifting < 0) return { x, y, pose: 'idle', flip: false, back: false };
      return { x, y, pose: still || Math.floor(lifting / CEREMONY_PUMP_SECONDS) % 2 ? 'lift1' : 'lift0', flip: false, back: false, trophy: c.trophy };
    }
    const i = this.s.court[c.team].filter(o => o !== c.captain).indexOf(b);
    if (lifting < 0) return { x, y, pose: still || Math.floor(t / 0.2 + i) % 2 ? 'clap0' : 'clap1', flip: facing, back: false };
    // Cada um festeja à sua maneira e no seu compasso: ninguém salta ao mesmo tempo.
    const [first, second] = CEREMONY_CHEERS[i % CEREMONY_CHEERS.length]!;
    return { x, y, pose: still ? 'cheer0' : Math.floor((lifting + i * 0.13) / 0.22) % 2 ? second : first, flip: facing, back: false };
  }

  /** Depois do corte, quem não é do grupo já não está no plano, como o árbitro: quem ainda ia a sair não fica à beira. */
  private ceremonyHides(b: Body): boolean {
    const c = this.ceremony;
    return c !== null && this.realTime - c.start >= c.lift && c.walks.has(b) && (b.team !== c.team || c.benched.has(b));
  }

  /** Os confetes e a faixa da cerimónia, por cima de tudo, na grelha dos píxeis de arte da imagem aproximada. */
  private drawCeremony(): void {
    const c = this.ceremony;
    if (!c) return;
    const { g, camera } = this;
    const t = this.realTime - c.start - c.lift;
    if (t < 0) return;
    if (!c.cheered) {
      c.cheered = true;
      this.callbacks.sound('bigCheer');
    }
    g.save();
    g.setTransform(this.art, 0, 0, this.art, 0, 0);
    const { width: W, height: H } = camera;
    const still = this.reducedMotion;
    const z = Math.round(this.zoom);
    const [ox, oy] = this.zoomShift;
    // As cabeças dos vencedores (e o troféu) ficam sem confetes por cima, para se verem as caras.
    const heads = [...this.drawn.bodies].filter(([b]) => b.team === c.team).map(([b, d]) => {
      const top = d.y - d.lift - d.height - (b === c.captain ? 16 : 2);
      return [ox + z * (d.x - 7), oy + z * top, ox + z * (d.x + 7), oy + z * (top + (b === c.captain ? 26 : 12))] as const;
    });
    // Cada confete tem sítio, atraso, velocidade e cor tirados de um hash do seu número: a mesma cena sai sempre igual.
    for (let i = 0; i < (still ? CONFETTI_STILL : CONFETTI_COUNT); i++) {
      const h = Math.imul(i + 1, 2654435761) >>> 0;
      const age = t - (((h >>> 8) % 64) / 64) * 1.2;
      if (age < 0 && !still) continue;
      const fx = (h % W) + (still ? 0 : Math.round(Math.sin(age * 3 + i) * 2));
      const fy = still ? (h >>> 4) % Math.floor(H * 0.7) : Math.floor((age * (18 + ((h >>> 14) % 18)) * z) % (H + 8)) - 4;
      // O canto do píxel de arte onde cai, na mesma grelha que a imagem aproximada.
      const x = ox + Math.floor((fx - ox) / z) * z;
      const y = oy + Math.floor((fy - oy) / z) * z;
      if (heads.some(([x0, y0, x1, y1]) => x + 2 * z > x0 && x < x1 && y + 2 * z > y0 && y < y1)) continue;
      const [light, dark] = c.colors[i % c.colors.length]!;
      // A volta faz-se a trocar entre 1×2, 1×1, 2×1 e 1×1, com a face clara e a escura.
      const spin = still ? i % 4 : (Math.floor(age * 8) + i) % 4;
      g.fillStyle = spin % 2 ? dark : light;
      g.fillRect(x, y, (spin === 2 ? 2 : 1) * z, (spin === 0 ? 2 : 1) * z);
    }
    // A faixa entra de baixo em 4 degraus; com movimento reduzido, já está no sítio.
    const steps = still ? 4 : Math.min(4, Math.max(0, Math.floor((t - 0.1) / 0.05)));
    if (steps > 0) {
      const w = textWidth(c.banner) + 16;
      const x = (W - w) >> 1;
      const y = H - 30 + (4 - steps) * 8;
      // A letra começa 9 px abaixo do topo: cabem os acentos (3 linhas a 2×) e, por baixo, a cedilha.
      g.fillStyle = INK;
      g.fillRect(x, y, w, 24);
      g.fillStyle = GOLD[1];
      g.fillRect(x + 2, y + 2, w - 4, 1);
      g.fillRect(x + 2, y + 21, w - 4, 1);
      text(g, c.banner, x + 8, y + 9, GOLD[0]);
    }
    g.restore();
  }

  /**
   * Ao intervalo vão todos para o balneário: os dez em campo, os suplentes e os treinadores. Cada um vai pelo corredor
   * à frente dos bancos até à frente do túnel e entra; a porta deixa passar um a cada LOCKER_GAP_SECONDS, por isso quem
   * chegaria ao mesmo tempo sai mais tarde (os do banco ficam sentados à espera da vez) e ninguém se amontoa à porta.
   * Os treinadores são os últimos. A simulação continua a mexer os jogadores à sua maneira; aqui só muda o desenho.
   */
  private updateLocker(): void {
    const { s } = this;
    if (!this.toLocker()) {
      if (this.locker) {
        // De volta: os titulares saem do túnel pela simulação; os suplentes e os treinadores saem do fundo do túnel, um
        // de cada vez, para o banco (no fim do jogo ninguém volta). Na rua, a simulação põe os titulares no lugar durante o
        // ecrã do intervalo, como nos pavilhões.
        this.locker = null;
        if (s.phase !== 'end' && !this.street) this.startReturn();
        for (const b of s.bodies) this.view(b).huddle = undefined;
        this.coachPos[0] = null;
        this.coachPos[1] = null;
      }
      return;
    }
    if (this.locker) return;
    if (this.street) {
      // Na rua não há balneário: ao intervalo, cada equipa junta-se à frente do seu banco, como num desconto. A simulação
      // leva os titulares para a porta da rede; o desenho põe-nos na roda, e os do banco e o treinador ficam onde estão.
      const walks = new Map<Body | TeamIndex, Walk>();
      for (const team of [0, 1] as const) {
        s.court[team].forEach((b, i) => {
          const [hx, hy] = huddleSpot(team, [0, 2, 4, 6, 7][i]!);
          // A trote, para a roda se formar antes do fim do intervalo.
          const walk = makeWalk([{ x: b.x, y: b.y }, { x: hx, y: hy }], LOCKER_SPEED, RUN_FRAMES);
          // No fim do jogo, na roda, quem ganhou festeja e quem perdeu fica de cabeça baixa.
          if (s.phase === 'end') walk.wait = team === (s.score[0] > s.score[1] ? 0 : 1) ? 'cheer0' : 'slump';
          walks.set(b, walk);
        });
      }
      this.locker = { start: this.animTime, end: 0, walks };
      this.returning = null;
      return;
    }
    const starts: { key: Body | TeamIndex; from: Point }[] = [...s.court[0], ...s.court[1]].map(b => ({ key: b, from: { x: b.x, y: b.y } }));
    for (const team of [0, 1] as const) {
      s.bodies.filter(b => b.team === team && b.slot === -1).forEach((b, i) => {
        // Quem ia a caminho do banco parte de onde estava.
        const exit = this.exits.find(e => e.body === b);
        const k = exit ? Math.max(0, Math.min(1, (s.tick - exit.start) / exit.ticks)) : 0;
        const from = exit ? { x: exit.from.x + (exit.to.x - exit.from.x) * k, y: exit.from.y + (exit.to.y - exit.from.y) * k } : this.view(b).huddle ?? { x: BENCH_START_X[team] + i * BENCH_SPACING, y: BENCH_Y };
        starts.push({ key: b, from });
      });
      starts.push({ key: team, from: this.coachPos[team] ?? { x: team === 0 ? 8 : 23.7, y: COACH_Y } });
    }
    this.exits.length = 0;
    // No fim do jogo, quem perdeu vai logo, a passo e de cabeça baixa; quem ganhou festeja primeiro e vai a seguir.
    const end = s.phase === 'end';
    const winner = s.score[0] > s.score[1] ? 0 : 1;
    const walks = starts.map(({ key, from }, i) => {
      const team = typeof key === 'number' ? key : key.team;
      const path = [from];
      if (from.y < LOCKER_LANE_Y) path.push({ x: from.x, y: LOCKER_LANE_Y });
      path.push(...this.aroundTable(team, i), { x: tunnelLane(i), y: LOCKER_INSIDE_Y });
      const lost = end && team !== winner;
      const walk = lost ? makeWalk(path, END_WALK_SPEED, WALK_FRAMES) : makeWalk(path, LOCKER_SPEED, RUN_FRAMES);
      // Quem espera a vez fica como estava: sentado no banco, de pé no campo (a festejar ou cabisbaixo, no fim); o
      // treinador de prancheta.
      const seated = from.y <= BENCH_Y + 0.1;
      walk.wait = typeof key === 'number' ? 'board' : seated ? 'sit' : end ? (lost ? 'slump' : 'cheer0') : 'idle';
      const earliest = end && !lost ? END_CHEER_SECONDS : 0;
      return { key, walk, earliest };
    });
    const arrival = (w: Walk, earliest: number): number => earliest + w.length / w.speed;
    walks.sort((a, b) => (typeof a.key === 'number' ? 1000 : 0) + arrival(a.walk, a.earliest) - (typeof b.key === 'number' ? 1000 : 0) - arrival(b.walk, b.earliest));
    let door = -Infinity;
    for (const { walk, earliest } of walks) {
      door = Math.max(arrival(walk, earliest), door + LOCKER_GAP_SECONDS);
      // Para chegar à porta na sua vez, quem está de pé arranca logo, mais devagar (a andar abaixo de 2,6 m/s); só
      // quando nem a passo lento lá chegaria tão tarde, ou quando está sentado, espera antes de arrancar.
      const speed = walk.length / (door - earliest);
      if (walk.wait !== 'sit' && speed >= LOCKER_SLOWEST && speed < walk.speed) {
        walk.speed = speed;
        if (speed < 2.6) Object.assign(walk, { frames: WALK_FRAMES, stride: WALK_STRIDE_METRES });
      } else if (walk.wait !== 'sit' && speed < LOCKER_SLOWEST) {
        Object.assign(walk, { speed: LOCKER_SLOWEST, frames: WALK_FRAMES, stride: WALK_STRIDE_METRES });
      }
      walk.delay = door - walk.length / walk.speed;
    }
    this.locker = { start: this.animTime, end: door, walks: new Map(walks.map(({ key, walk }) => [key, walk])) };
    this.returning = null;
  }

  /** Da frente da mesa até à boca do túnel: a mesa está à frente dele, e cada equipa contorna-a pela ponta do seu banco
   * (a casa pela esquerda do mundo, o visitante pela direita), por trás de quem lá está sentado. */
  private aroundTable(team: TeamIndex, i: number): Point[] {
    const lane = tunnelLane(i);
    const span = TABLE_SPAN[tableKind(this.textures.theme)];
    const jitter = (((i * 0.381966) % 1) - 0.5) * 0.3;
    // Do lado da casa a passagem entre o banco e a mesa é estreita; do lado do visitante há espaço para se espalharem.
    const side = team === 0 ? span.x0 - 0.35 + jitter : span.x1 + 0.6 + jitter * 2.6;
    return [{ x: side, y: LOCKER_LANE_Y }, { x: side, y: LOCKER_BEHIND_Y }, { x: lane, y: LOCKER_BEHIND_Y }];
  }

  /** A câmara no túnel: na ida para o balneário ao intervalo e na volta, até o último chegar (sem andar atrás da bola). */
  private tunnelShot(): boolean {
    if (this.street) return false;
    return this.locker !== null || (this.returning !== null && this.animTime < this.returning.end);
  }

  /** A volta do balneário ao intervalo: do fundo do túnel até ao banco ou ao passeio do treinador, um de cada vez. */
  private startReturn(): void {
    const { s } = this;
    const keys: { key: Body | TeamIndex; to: Point }[] = [];
    for (const team of [0, 1] as const) s.bodies.filter(b => b.team === team && b.slot === -1).forEach((b, i) => keys.push({ key: b, to: { x: BENCH_START_X[team] + i * BENCH_SPACING, y: BENCH_Y } }));
    // Primeiro os que se sentam mais perto da porta; os treinadores no fim.
    keys.sort((a, b) => Math.abs(a.to.x - LOCKER_DOOR_X) - Math.abs(b.to.x - LOCKER_DOOR_X));
    for (const team of [0, 1] as const) keys.push({ key: team, to: { x: team === 0 ? 8 : 23.7, y: COACH_Y } });
    const walks = new Map<Body | TeamIndex, Walk>();
    keys.forEach(({ key, to }, i) => {
      const team = typeof key === 'number' ? key : key.team;
      const walk = makeWalk([{ x: tunnelLane(i), y: LOCKER_INSIDE_Y }, ...this.aroundTable(team, i).reverse(), { x: to.x, y: LOCKER_LANE_Y }, to], LOCKER_SPEED, RUN_FRAMES);
      walk.delay = i * LOCKER_GAP_SECONDS;
      walks.set(key, walk);
    });
    this.returning = { start: this.animTime, end: this.animTime + Math.max(0, ...[...walks.values()].map(w => w.delay + w.length / w.speed)), walks };
  }

  /** Onde está um suplente ou treinador na volta do balneário; null fora dela ou quando já chegou. */
  private returnAt(key: Body | TeamIndex): ReturnType<typeof walkAt> | null {
    const walk = this.returning?.walks.get(key);
    if (!walk) return null;
    const at = walkAt(walk, this.animTime - this.returning!.start);
    if (!at.done) return at;
    // O treinador segue dali a passear à frente do banco, sem saltar para o sítio onde passearia.
    if (typeof key === 'number') this.coachPos[key] ??= { x: at.x, y: at.y };
    return null;
  }

  /** O túnel é um modelo 3D (com a placa gráfica, nos pavilhões); senão é pintado na parede, ou nem há (na rua, a rede). */
  private tunnel3d(): boolean {
    const { theme } = this.textures;
    return this.gpuFloor !== null && !theme.open && theme.slope > 0;
  }

  /** Se quem está em y já vai tão fundo no túnel que não se vê (na rua, ninguém: ficam à vista do lado de fora). */
  private inTunnel(y: number): boolean {
    if (this.street) return false;
    return y <= STAND.y - (this.tunnel3d() ? TUNNEL_FADE[1] : 0.4);
  }

  /** De 1 a 0, quanto se vê quem está em y: no túnel 3D desvanece-se no escuro lá dentro; sem ele, à boca (a 0,4 m de
   * cada lado da parede), em vez de aparecer ou desaparecer de um frame para o outro. */
  private tunnelFade(y: number): number {
    if (this.street) return 1;
    const [near, far] = this.tunnel3d() ? TUNNEL_FADE : [-0.4, 0.4];
    const depth = STAND.y - y;
    return depth <= near ? 1 : depth >= far ? 0 : 1 - (depth - near) / (far - near);
  }

  /** Onde está um jogador, suplente ou treinador na ida para o balneário; null fora dela. */
  private lockerAt(key: Body | TeamIndex): ReturnType<typeof walkAt> | null {
    const walk = this.locker?.walks.get(key);
    return walk ? walkAt(walk, this.animTime - this.locker!.start) : null;
  }

  /** Um jogador em campo a caminho do balneário: a trote, de costas quando vai para a porta; parado à espera da vez. */
  private lockerPlace(b: Body): { x: number; y: number; pose: PoseName; flip: boolean; back: boolean; legs?: PoseName; trophy?: 'cup' | 'bigCup' } | null {
    const at = this.lockerAt(b);
    if (!at) return null;
    const back = at.moving && at.dy < -Math.abs(at.dx);
    return { x: at.x, y: at.y, pose: at.moving ? at.pose : at.wait === 'cheer0' ? this.endCheer(b) : at.wait, flip: at.dx < 0, back };
  }

  /** A ida para o balneário: ao intervalo, e no fim do jogo sem cerimónia, depois de `startExit`. */
  private toLocker(): boolean {
    const { s } = this;
    return (s.phase === 'break' && s.period === 2) || (s.phase === 'end' && this.exitStart !== null && this.ceremony === null);
  }

  /** No fim do jogo sem cerimónia: os vencedores festejam um pouco e todos vão para o balneário, pelo túnel. */
  startExit(): void {
    this.exitStart ??= this.animTime;
  }

  /** O festejo de um vencedor no fim, ao ritmo da animação, cada um no seu compasso; parado com movimento reduzido. */
  private endCheer(b: Body): PoseName {
    return !this.reducedMotion && (Math.floor(this.animTick / 5) + b.slot) % 4 >= 2 ? 'cheer1' : 'cheer0';
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
      const top = (y | 0) - this.tall(this.view(b).look, y) - 4;
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
    for (const [tx, ty] of [[-9, -5], [-8.5, 6], [5, -15], [21, -16.5], [37, -3], [36.5, 7]] as const) {
      const box = this.drawTree(tx, ty);
      if (box) this.toWorld(box, [tx, ty, 0]);
    }
    const cheering = s.tick < this.fansCheerUntil;
    // Quem está do lado de fora da rede não se desvanece (`tunnelFade` é para quem entra ou sai do campo).
    this.outside = true;
    for (const o of this.outsiders) {
      const [sx, sy] = camera.project(o.x, o.y);
      if (sx < -20 || sx > camera.width + 20) continue;
      const beat = this.reducedMotion ? o.phase : (s.tick >> 2) + o.phase;
      const pose: PoseName = cheering ? (beat % 2 ? 'cheer0' : 'cheer1') : ((s.tick >> 4) + o.phase) % 7 === 0 ? 'cheer0' : 'idle';
      this.spriteWorld = [o.x, o.y, 0];
      this.sprite(g, pose, o.look, sx | 0, sy | 0, o.flip, false, false);
    }
    this.spriteWorld = null;
    this.outside = false;
  }

  /** Uma árvore: tronco e três tufos, do tamanho que a distância lhe dá. Devolve a caixa onde a pintou, ou `null`. */
  private drawTree(x: number, y: number): Box | null {
    const { g, camera } = this;
    const [sx, sy] = camera.project(x, y);
    const [, topY] = camera.project(x, y, 5);
    const h = sy - topY;
    if (sx < -40 || sx > camera.width + 40 || h < 6) return null;
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
    return [sx - r * 1.9 - 3, sy - h * 0.72 - r - 3, sx + r * 1.9 + 3, sy + 3];
  }

  /** O cão do bairro e o pombo do aro: entram na ordem de profundidade como os outros bonecos. Nada disto mexe no jogo. */
  private addHumor(drawables: Drawable[]): void {
    const { g, s, camera } = this;
    const { theme } = this.textures;
    const beat = this.reducedMotion ? 0 : this.animTick >> 2;
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
        // A caixa apanha também o cão ao colo.
        drawables.push({
          y: oy,
          world: [owner.x, owner.y, 0],
          box: [ox - 16, oy - 24, ox + 16, oy + 4],
          draw: () => {
            this.shadow(g, ox, oy);
            this.sprite(g, owner.moving ? RUN_FRAMES[Math.floor(s.tick / 2.5) % 4]! : 'idle', look, ox | 0, oy | 0, owner.dx < 0, owner.dy < 0 && owner.moving, false);
            if (carried) drawDog(g, ox | 0, (oy | 0) - 9, owner.dx < 0, 0, false);
            if (t < DOG_PICKED) this.ownerSpeech = [ox, (oy | 0) - this.tall(look, oy) + 2, oy | 0];
          },
        });
      }
      if (!carried) {
        drawables.push({
          y: dy,
          world: [dog.x, dog.y, 0],
          box: [dx - 14, dy - 16, dx + 14, dy + 4],
          draw: () => {
            this.shadow(g, dx, dy, 4);
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
        drawables.push({ y: layer, world: [hoopX + inward * f * 0.12, 0.28, 3.1 + f * 0.09], box: [px - 12, py - 14, px + 12, py + 4], draw: () => drawPigeon(g, px | 0, py | 0, inward < 0, flying < 0 ? -1 : beat, (this.animTick >> 3) % 5 === 0) });
      }
    }
  }

  /**
   * Um balão de fala para quem tem a cabeça em (`fx`, `head`) e os pés em `foot`. A caixa fica por cima da cabeça, com a seta
   * para baixo; se aí passasse acima de `minTop` (a linha do marcador), fica por baixo dos pés, com a seta para cima, para
   * nunca tapar quem fala. A caixa segue quem fala e fica dentro do ecrã; a seta desliza pela caixa para apontar sempre para
   * essa pessoa. `sink`: quantos píxeis o balão de cima nasce mais perto da cabeça, antes de assentar (o lado escolhe-se sem isso).
   */
  private speech(label: string, fx: number, head: number, foot: number, minTop: number, sink = 0): void {
    const { g, camera } = this;
    // A letra do jogo à resolução do ecrã, com os acentos direitos; enquanto não chegar (ou sem rede), a letra de píxeis a 2×.
    const smooth = speechFontReady();
    if (smooth) g.font = SPEECH_FONT;
    const w = Math.ceil(smooth ? g.measureText(label).width : textWidth(label, 2)) + 10;
    const h = smooth ? 15 : 21;
    const x = Math.max(6, Math.min(camera.width - w - 6, (fx | 0) - (w >> 1)));
    // A ponta da seta fica 6 píxeis acima da cabeça, ou 1 abaixo dos pés; a seta tem 3 de altura.
    const above = head - 9 - h >= minTop;
    // Por baixo não sobe: a seta pisava os pés de quem fala.
    const y = above ? Math.max(minTop, head - 9 - h + sink) : Math.max(minTop, foot + 5);
    const tip = Math.max(x + 5, Math.min(x + w - 6, fx | 0));
    // A seta: um triângulo de píxeis com a ponta para quem fala, contornado a tinta. `edge` é a linha da caixa de onde sai.
    const edge = above ? y + h : y - 1;
    const step = above ? 1 : -1;
    g.fillStyle = '#1b2230';
    g.fillRect(x - 1, y - 1, w + 2, h + 2);
    for (let k = 0; k < 4; k++) g.fillRect(tip - 3 + k, edge + step * k, 7 - 2 * k, 1);
    g.fillStyle = '#fbf6e2';
    g.fillRect(x, y, w, h);
    for (let k = 0; k < 3; k++) g.fillRect(tip - 2 + k, edge + step * k, 5 - 2 * k, 1);
    if (smooth) {
      g.fillStyle = '#1b2230';
      g.textBaseline = 'middle';
      g.fillText(label, x + 5, y + h / 2 + 0.5);
    } else text(g, label, x + 5, y + 8, '#1b2230', 2);
  }

  /** O público: sentado quase sempre, de pé a festejar um cesto da casa, de mãos na cabeça com um da visita. Alguns têm bandeira. */
  private drawFans(): void {
    const { g, s, camera } = this;
    if (this.fans.length === 0) return;
    if (this.street) {
      // Os bancos de pedra atrás dos cestos; com a placa gráfica, são modelos 3D do cenário.
      if (this.spriteMode !== 'collect') for (const f of STREET_SEATS) drawBox(g, camera, f.x0, f.x1, f.y0, f.y1, f.height, f.top, f.front);
    }
    const sad = s.tick < this.fansSadUntil;
    const asleep = this.humor.sleeper && Math.abs(s.score[0] - s.score[1]) >= this.humor.blowout ? this.sleeperFan : -1;
    for (const [i, f] of this.fans.entries()) {
      const [sx, sy] = camera.project(f.x, f.y, f.z);
      if (sx < -20 || sx > camera.width + 20 || sy < -10 || sy > camera.height + 40) continue;
      this.spriteWorld = [f.x, f.y, f.z];
      this.inStands = true;
      if (i === asleep) {
        // Numa goleada, alguém dorme sentado: a cabeça cai de vez em quando e os «Z» sobem.
        const nod = !this.reducedMotion && (this.animTick >> 4) % 3 === 0 ? 1 : 0;
        this.sprite(g, 'sit', f.look, sx | 0, (sy | 0) + nod, f.flip, false, false);
        const top = (sy | 0) - this.tall(f.look, sy);
        for (let k = 0; k < 3; k++) {
          const p = this.reducedMotion ? k / 3 : ((this.animTick + k * 14) % 42) / 42;
          const zx = (sx | 0) + 3 + Math.round(p * 6);
          const zy = top - 4 - Math.round(p * 12);
          text(g, 'Z', zx + 1, zy + 1, '#1b2230', 1);
          text(g, 'Z', zx, zy, '#fbf6e2', 1);
        }
        this.toWorld([sx - 4, top - 22, sx + 16, top + 2], [f.x, f.y, f.z], 0.6);
        continue;
      }
      // Cada adepto tem o seu entusiasmo: só se levanta se o momento valer mais do que ele pede, e os menos entusiastas
      // sentam-se mais cedo; uns saltam, outros batem palmas.
      const cheering = s.tick < this.fansCheerUntil - f.zeal * 0.5 * this.fansCheerTicks && f.zeal < this.fansCheerLevel;
      const beat = this.reducedMotion ? f.phase : (s.tick >> 2) + f.phase;
      const claps = f.phase % 3 === 2;
      // Na entrada, com a confiança alta, muitos trazem bandeira. Quem a tem abana-a: devagar sentado, depressa de pé a
      // festejar (100 e 200 ms por pose), cada um no seu tempo; a bandeira faz parte do boneco, por isso tem o tamanho dele.
      const flag = f.flag || (this.forecast?.confident && s.phase === 'intro' && f.phase % 3 === 0);
      const wave = this.reducedMotion ? 0 : ((cheering ? this.animTick >> 1 : this.animTick >> 2) + f.phase) % 4;
      const pose: PoseName = flag ? (`${cheering ? 'flagUp' : 'flagSit'}${wave}` as PoseName) : cheering ? (claps ? (beat % 2 ? 'clap0' : 'clap1') : beat % 2 ? 'cheer0' : 'cheer1') : sad && f.phase % 2 === 0 ? 'handsHead' : 'sit';
      this.sprite(g, pose, f.look, sx | 0, sy | 0, f.flip, false, false);
      if (this.flashFans?.has(i)) {
        // Uma fotografia: um píxel branco na cara de quem a tira.
        const face = (sy | 0) - this.tall(f.look, sy) + 3;
        g.fillStyle = '#ffffff';
        g.fillRect((sx | 0) + 1, face, 1, 1);
        this.toWorld([sx - 1, face - 1, sx + 3, face + 2], [f.x, f.y, f.z], 0.8, true);
      }
    }
    this.spriteWorld = null;
    this.inStands = false;
  }

  /** Os balões da bancada: por cima de um adepto da primeira fila, e desaparecem passados dois segundos. */
  private drawBubbles(): void {
    // Nos grandes planos, os balões da bancada ficavam a 2× e saíam do ecrã: guardam-se para o plano largo.
    if (this.jumpZoom) return;
    const { g, s, camera } = this;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i]!;
      // Pelo relógio da animação: o do jogo para no apito, e o balão ficava no ar a tapar a saída.
      const age = this.animTick - b.born;
      if (age > 44) {
        this.bubbles.splice(i, 1);
        continue;
      }
      const fan = this.fans[b.fan]!;
      const [fx, fy] = camera.project(fan.x, fan.y, fan.z);
      // Por cima da cabeça do adepto, e nunca acima da linha do marcador, que a tapava. Nasce um pouco mais abaixo e sobe,
      // como quem se levanta da cadeira.
      this.speech(b.label, fx, (fy | 0) - this.tall(fan.look, fy), fy | 0, FLOATER_MIN_TOP, 4 - Math.min(4, age));
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

  /** Onde pôr o nome de um movimento: por cima (undefined), à direita (1) ou à esquerda (-1) de quem o fez. Por cima, nunca
   * acima da faixa do marcador; fica o lugar que cabe no ecrã e tapa menos píxeis dos bonecos: dos outros como estão, e
   * de quem o fez desde o ponto mais alto que vai ter (`peak`, as mãos no aro num afundanço) até aos pés. A empatar, por
   * cima. */
  private floaterSide(actor: Body, x: number, y: number, peak: number, aboveTop: number, sideTop: number, width: number, height: number): 1 | -1 | undefined {
    const covered = (left: number, top: number): number => {
      if (left < 2 || left + width > this.camera.width - 2) return Infinity;
      let area = Math.max(0, Math.min(left + width, x + 7) - Math.max(left, x - 7)) * Math.max(0, Math.min(top + height, y) - Math.max(top, peak));
      for (const [b, d] of this.drawn.bodies) {
        if (b === actor) continue;
        const x0 = Math.max(left, d.x - 7);
        const x1 = Math.min(left + width, d.x + 7);
        const y0 = Math.max(top, d.y - d.lift - d.height - 6);
        const y1 = Math.min(top + height, d.y - d.lift);
        if (x1 > x0 && y1 > y0) area += (x1 - x0) * (y1 - y0);
      }
      return area;
    };
    const options: [1 | -1 | undefined, number][] = [
      [undefined, covered(x - (width >> 1), Math.max(FLOATER_MIN_TOP, aboveTop))],
      [1, covered(x + 9, sideTop)],
      [-1, covered(x - 9 - width, sideTop)],
    ];
    let best = options[0]!;
    for (const option of options) if (option[1] < best[1]) best = option;
    // Sem nenhum que caiba, encosta-se ao lado com mais espaço.
    if (best[1] === Infinity) return x + 9 + width <= this.camera.width - 2 ? 1 : -1;
    return best[0];
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
      // Quem fez o movimento e não se vê (nos cenários de teste, escondido) não leva palavra, em vez de ela aparecer noutro sítio.
      if (f.body && !drawn) continue;
      if (word && drawn) {
        // A palavra segue quem fez o movimento, por cima do ponto mais alto da pose, e sobe devagar. Sem espaço em cima,
        // por baixo da faixa do marcador, encosta-se ao lado dele: nunca por cima do corpo.
        const look = this.view(f.body!).look;
        const k = this.depth(drawn.y);
        const head = (drawn.y | 0) - Math.round(drawn.lift) - Math.round(this.poseTop(drawn.pose, look) * k);
        // Num afundanço conta-se já com o ponto mais alto que aí vem: a pose de afundar no topo do salto, junto ao aro.
        const hoopGround = camera.project(this.attackedHoop(f.body!.team), 0)[1] | 0;
        const peak = f.dunk ? Math.min(head, hoopGround - DUNK_LIFT - Math.round(this.poseTop('dunk', look) * k), (drawn.y | 0) - DUNK_LIFT - Math.round(this.poseTop('dunk', look) * k)) : head;
        // Por cima, à direita ou à esquerda decide-se uma vez, no primeiro frame, onde tapar menos os outros bonecos; e a
        // palavra depois só sobe: nunca salta de sítio.
        if (f.top === undefined) f.beside = this.floaterSide(f.body!, drawn.x | 0, drawn.y | 0, peak, peak - FLOATER_GAP - height, Math.max(FLOATER_MIN_TOP, head), width, height);
        if (f.beside !== undefined) {
          // Ao lado, a altura é a da cabeça no primeiro frame: mudar de pose ou saltar não a faz andar aos saltos.
          f.base ??= head;
          top = Math.max(FLOATER_MIN_TOP, f.base - rise);
          left = f.beside > 0 ? (drawn.x | 0) + 9 : (drawn.x | 0) - 9 - width;
        } else {
          top = Math.max(FLOATER_MIN_TOP, peak - FLOATER_GAP - height - rise);
          left = (drawn.x | 0) - (width >> 1);
        }
        top = f.top = Math.min(f.top ?? top, top);
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
    drawCarrierArrow(g, x, y - this.tall(this.view(holder).look, y) - 3 - bob);
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
      const d = Math.hypot(sx - px, sy - this.tall(this.view(b).look, sy) / 2 - py);
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
      const top = Math.max(1, (y | 0) - this.tall(this.view(b).look, y) - 14);
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

