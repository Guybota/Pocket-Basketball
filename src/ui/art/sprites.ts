import { heightCmOf } from '../../sim/teamgen.ts';
import type { Player } from '../../sim/types.ts';
import { pixelsForHeight } from './body.ts';
import { kitKey, shadeOf, usesSecondOnBody, type ClubKit } from './kit.ts';
import { oklabOf } from './color.ts';
import { INK } from './palette.ts';
import { remember } from './cache.ts';

export { INK };

const SKINS = [['#f2c7a0', '#d9a57c'], ['#c98d5e', '#a9713f'], ['#8d5a36', '#6f4326'], ['#5c3a24', '#472a18']] as const;
// Cada cabelo fica a pelo menos 0,06 de L (OKLab) de todas as peles e da tinta, para não desaparecer na cabeça nem no contorno.
const HAIRS = ['#372e3d', '#6e4d34', '#b26d34', '#d9b248', '#2c3345', '#814030'] as const;
export const KITS = {
  blue: { jersey: '#2b5fd9', shade: '#1d43a3', trim: '#ffffff', shorts: '#f4f4f4' },
  cream: { jersey: '#f4efe0', shade: '#cfc7ae', trim: '#cf3a2c', shorts: '#cf3a2c' },
  // O treinador: fato de treino com fecho claro e calças escuras, para não se confundir com a equipa.
  coach: { jersey: '#2f7f8c', shade: '#235f69', trim: '#f4efe0', shorts: '#1b2230' },
  // Roupa de rua do público que não veste a cor do clube.
  fan: { jersey: '#e2d3a8', shade: '#bfae84', trim: '#e2d3a8', shorts: '#2c3345' },
  fan2: { jersey: '#5a6b8c', shade: '#44526d', trim: '#5a6b8c', shorts: '#2c3345' },
  referee: { jersey: '#f4f4f4', shade: '#c9c9c9', trim: '#1b2230', shorts: '#1b2230' },
  // Roupa de rua: o fato do presidente e do treinador, a blusa da secretária. Tapa os braços, e o fato tem calças.
  suit: { jersey: '#2c3345', shade: '#1b2230', trim: '#f4efe0', shorts: '#2c3345' },
  blouse: { jersey: '#7246c4', shade: '#56349a', trim: '#f4efe0', shorts: '#1b2230' },
} as const;
export type KitName = keyof typeof KITS;

type Offset = readonly [number, number];
interface PoseShape {
  a: Offset;
  b: Offset;
  f: Offset;
  g: Offset;
  jump?: number;
  ball?: Offset;
  /** Um objeto na mão direita: a garrafa de água do descanso, ou a prancheta do treinador; ou o troféu nas duas mãos. */
  prop?: 'bottle' | 'board' | 'trophy';
}

const POSES = {
  idle: (L: number): PoseShape => ({ a: [-1, 5], b: [1, 5], f: [-2, L], g: [2, L] }),
  run0: (L: number): PoseShape => ({ a: [-3, 2], b: [3, 4], f: [-3, L - 1], g: [3, L], jump: 1 }),
  run1: (L: number): PoseShape => ({ a: [-1, 4], b: [2, 3], f: [-1, L], g: [1, L - 1] }),
  run2: (L: number): PoseShape => ({ a: [-3, 4], b: [3, 2], f: [3, L - 1], g: [-3, L], jump: 1 }),
  drib0: (L: number): PoseShape => ({ a: [-2, 4], b: [4, 3], f: [-2, L], g: [3, L], ball: [7, L - 2] }),
  drib1: (L: number): PoseShape => ({ a: [-2, 4], b: [4, 2], f: [-2, L], g: [3, L], ball: [7, L - 6] }),
  dribRun0: (L: number): PoseShape => ({ a: [-3, 2], b: [4, 3], f: [-3, L - 1], g: [3, L], jump: 1, ball: [7, L - 2] }),
  dribRun1: (L: number): PoseShape => ({ a: [-1, 4], b: [4, 2], f: [-1, L], g: [1, L - 1], ball: [7, L - 6] }),
  dribRun2: (L: number): PoseShape => ({ a: [2, 3], b: [4, 3], f: [3, L - 1], g: [-3, L], jump: 1, ball: [7, L - 2] }),
  dribRun3: (L: number): PoseShape => ({ a: [-1, 4], b: [4, 2], f: [1, L], g: [-1, L - 1], ball: [7, L - 6] }),
  crossover: (L: number): PoseShape => ({ a: [-4, 3], b: [3, 4], f: [-4, L], g: [4, L], ball: [-5, L - 3] }),
  stumble: (L: number): PoseShape => ({ a: [-5, 0], b: [4, 5], f: [-1, L], g: [5, L - 1] }),
  // Os tornozelos partidos: de pernas trocadas, a tentar não cair, dum lado para o outro.
  ankle0: (L: number): PoseShape => ({ a: [-6, -1], b: [5, 2], f: [-5, L], g: [2, L - 1] }),
  ankle1: (L: number): PoseShape => ({ a: [-3, 3], b: [6, -1], f: [-2, L - 1], g: [5, L] }),
  // De costas para o cesto: agachado, pés abertos, o braço de fora a afastar o defensor e a bola a driblar baixo do outro lado.
  post0: (L: number): PoseShape => ({ a: [-6, 0], b: [5, 4], f: [-4, L - 2], g: [4, L - 2], jump: -2, ball: [8, L - 3] }),
  post1: (L: number): PoseShape => ({ a: [-6, 1], b: [5, 3], f: [-4, L - 2], g: [4, L - 2], jump: -2, ball: [8, L - 5] }),
  // A recuar de costas, passo curto a passo curto, sempre agachado.
  postStep0: (L: number): PoseShape => ({ a: [-6, 0], b: [5, 4], f: [-5, L - 2], g: [2, L - 3], jump: -2, ball: [8, L - 3] }),
  postStep1: (L: number): PoseShape => ({ a: [-6, 1], b: [5, 3], f: [-2, L - 3], g: [5, L - 2], jump: -2, ball: [8, L - 5] }),
  // Quem defende o poste: agachado, encostado, com os braços para a frente a fazer força.
  brace: (L: number): PoseShape => ({ a: [4, 0], b: [6, 1], f: [-4, L - 2], g: [3, L - 2], jump: -2 }),
  // O bloqueio: pés bem abertos e braços junto ao peito.
  screen: (L: number): PoseShape => ({ a: [-2, 1], b: [2, 1], f: [-4, L], g: [4, L] }),
  // A queda: duas fases a ir abaixo e o corpo no chão, de braços abertos e uma perna dobrada. Estas três desenham-se inclinadas (ver LEAN).
  fallA: (L: number): PoseShape => ({ a: [-5, -3], b: [5, -2], f: [-2, L], g: [3, L - 2] }),
  fallB: (L: number): PoseShape => ({ a: [-6, -5], b: [6, -4], f: [-1, L - 1], g: [4, L - 3] }),
  fallen: (L: number): PoseShape => ({ a: [-6, -8], b: [7, 1], f: [-3, L], g: [3, L - 3] }),
  // A levantar-se: primeiro sentado de mãos no chão, depois de joelhos.
  getup1: (L: number): PoseShape => ({ a: [-5, 5], b: [5, 5], f: [-5, 3], g: [5, 3], jump: 3 - L }),
  getup2: (L: number): PoseShape => ({ a: [-4, 3], b: [4, 1], f: [-3, 5], g: [3, 5], jump: 5 - L }),
  // A bola segura com as duas mãos à frente da barriga: na reposição e no lance livre; a rodar a bola, e a correr com ela na mão.
  hold: (L: number): PoseShape => ({ a: [2, 3], b: [4, 3], f: [-2, L], g: [2, L], ball: [5, -3] }),
  holdSpin: (L: number): PoseShape => ({ a: [3, 1], b: [5, 3], f: [-2, L], g: [2, L], ball: [5, -5] }),
  holdRun0: (L: number): PoseShape => ({ a: [2, 2], b: [4, 2], f: [-3, L - 1], g: [3, L], jump: 1, ball: [5, -4] }),
  holdRun1: (L: number): PoseShape => ({ a: [2, 3], b: [4, 3], f: [-1, L], g: [1, L - 1], ball: [5, -3] }),
  holdRun2: (L: number): PoseShape => ({ a: [2, 2], b: [4, 2], f: [3, L - 1], g: [-3, L], jump: 1, ball: [5, -4] }),
  holdRun3: (L: number): PoseShape => ({ a: [2, 3], b: [4, 3], f: [1, L], g: [-1, L - 1], ball: [5, -3] }),
  // Antes do lance livre: fletir os joelhos com a bola em baixo, e depois subir.
  ftDip: (L: number): PoseShape => ({ a: [2, 4], b: [4, 4], f: [-3, L - 2], g: [3, L - 2], jump: -2, ball: [5, -2] }),
  gather: (L: number): PoseShape => ({ a: [3, -2], b: [4, -3], f: [-2, L - 1], g: [2, L - 1], jump: -1, ball: [5, -9] }),
  shoot: (L: number): PoseShape => ({ a: [1, -7], b: [3, -8], f: [-1, L - 1], g: [2, L - 2], jump: 6, ball: [3, -18] }),
  // O lay-up, em três tempos: o passo de chamada com a bola ao peito e o joelho a subir, o impulso a uma perna com a bola
  // a passar o ombro, e lá em cima o braço esticado a largá-la, com o joelho de fora levantado.
  layupStep: (L: number): PoseShape => ({ a: [2, -2], b: [4, -3], f: [-2, L - 4], g: [2, L], jump: 1 }),
  layupRise: (L: number): PoseShape => ({ a: [-2, 0], b: [4, -10], f: [-1, L - 5], g: [1, L - 1], jump: 5 }),
  layupTop: (L: number): PoseShape => ({ a: [-3, 2], b: [3, -11], f: [-2, L - 5], g: [1, L - 1], jump: 8 }),
  dunk: (L: number): PoseShape => ({ a: [-4, 2], b: [4, -9], f: [-3, L - 2], g: [-4, L - 3], jump: 10, ball: [6, -19] }),
  // A abafar: os dois braços bem acima da cabeça, à vista.
  block: (L: number): PoseShape => ({ a: [-3, -10], b: [3, -10], f: [-2, L - 1], g: [2, L - 1], jump: 6 }),
  // Na bola ao alto: um braço esticado bem acima da cabeça para tocar a bola, o outro dobrado.
  tip: (L: number): PoseShape => ({ a: [-4, -2], b: [2, -11], f: [-2, L - 1], g: [2, L - 1], jump: 6 }),
  // Em defesa: agachado, braços abertos para os lados e um pouco para cima; a deslizar de lado, os pés afastam-se e juntam-se.
  defend: (L: number): PoseShape => ({ a: [-7, -3], b: [7, -3], f: [-4, L - 1], g: [4, L - 1], jump: -1 }),
  slide0: (L: number): PoseShape => ({ a: [-7, -3], b: [7, -3], f: [-5, L - 1], g: [5, L - 1], jump: -1 }),
  slide1: (L: number): PoseShape => ({ a: [-7, -2], b: [7, -3], f: [-2, L - 1], g: [2, L - 1], jump: -1 }),
  pass: (L: number): PoseShape => ({ a: [4, 3], b: [5, 0], f: [-2, L], g: [3, L], ball: [8, -6] }),
  // O passe picado, de braços para baixo; o lob, de braços no ar; e quem o recebe estica os braços, ainda no chão: o salto
  // é o do afundanço que vem a seguir, e um salto fixo aqui ligava-se e desligava-se num frame.
  bouncePass: (L: number): PoseShape => ({ a: [-1, 4], b: [4, 4], f: [-2, L], g: [4, L - 1] }),
  lob: (L: number): PoseShape => ({ a: [-2, -9], b: [4, -10], f: [-2, L], g: [3, L], jump: 1 }),
  reach: (L: number): PoseShape => ({ a: [-3, -11], b: [3, -11], f: [-2, L - 1], g: [2, L - 1], jump: 1 }),
  // O salto ao ressalto: a mesma pose, mas a altura vem da vista, que o faz subir e descer em arco.
  leap: (L: number): PoseShape => ({ a: [-3, -11], b: [3, -11], f: [-2, L - 2], g: [2, L - 2], jump: 1 }),
  // O step-back: recua a driblar, inclinado para trás, e lança a cair para trás.
  stepBack: (L: number): PoseShape => ({ a: [-5, 2], b: [5, 3], f: [-5, L], g: [3, L - 1], jump: 1, ball: [8, L - 3] }),
  fadeaway: (L: number): PoseShape => ({ a: [-4, -8], b: [2, -10], f: [-6, L - 1], g: [-2, L - 2], jump: 5, ball: [3, -18] }),
  // O gancho: de lado, o braço de fora a passar por cima da cabeça.
  hook: (L: number): PoseShape => ({ a: [-6, -5], b: [6, -11], f: [-3, L - 1], g: [3, L - 2], jump: 4, ball: [8, -17] }),
  // O roubo: o braço estendido a cortar a bola; o desarme: a palmada, com o braço todo esticado; o ressalto: as duas mãos a agarrar.
  snatch: (L: number): PoseShape => ({ a: [-2, 3], b: [8, -2], f: [-3, L], g: [4, L - 1], jump: 1, ball: [10, -2] }),
  swat: (L: number): PoseShape => ({ a: [-3, 4], b: [5, -11], f: [-2, L - 2], g: [2, L - 1], jump: 9 }),
  grab: (L: number): PoseShape => ({ a: [-3, -10], b: [3, -10], f: [-2, L - 1], g: [2, L - 1], jump: 1, ball: [0, -17] }),
  // O encontrão, de ombro e braços para a frente; e quem deixa a bola escapar, a tentar apanhá-la.
  shove: (L: number): PoseShape => ({ a: [7, 0], b: [8, -2], f: [-5, L], g: [2, L - 1] }),
  fumble: (L: number): PoseShape => ({ a: [6, 5], b: [8, 3], f: [-3, L], g: [3, L - 1] }),
  cheer0: (L: number): PoseShape => ({ a: [-3, -6], b: [3, -6], f: [-2, L], g: [2, L] }),
  // A bater palmas, de pé: mãos afastadas e mãos juntas à frente do peito.
  clap0: (L: number): PoseShape => ({ a: [-4, -3], b: [4, -3], f: [-2, L], g: [2, L] }),
  clap1: (L: number): PoseShape => ({ a: [3, 1], b: [-3, 1], f: [-2, L], g: [2, L] }),
  cheer1: (L: number): PoseShape => ({ a: [-4, -5], b: [4, -5], f: [-1, L - 1], g: [1, L - 1], jump: 4 }),
  sit: (L: number): PoseShape => ({ a: [-2, 3], b: [2, 3], f: [-3, 3], g: [3, 3], jump: 3 - L }),
  // Reações: punhos no ar depois de um cesto decisivo, mãos na cabeça depois de um erro ou de uma falta, cabisbaixo a perder.
  fists: (L: number): PoseShape => ({ a: [-5, -7], b: [5, -7], f: [-2, L], g: [2, L], jump: 2 }),
  handsHead: (L: number): PoseShape => ({ a: [-2, -9], b: [2, -9], f: [-2, L], g: [2, L] }),
  // Os braços caídos não passam dos pés num tronco curto.
  slump: (L: number, T = 9): PoseShape => ({ a: [-1, Math.min(8, T + 3)], b: [1, Math.min(8, T + 3)], f: [-2, L], g: [2, L] }),
  // O treinador: a pensar com a mão no queixo, e a apontar para o campo.
  think: (L: number): PoseShape => ({ a: [-2, 5], b: [3, -4], f: [-2, L], g: [2, L] }),
  point: (L: number): PoseShape => ({ a: [-1, 5], b: [8, 0], f: [-2, L], g: [2, L] }),
  // No descanso: a beber água, e o treinador de prancheta na mão a explicar.
  drink: (L: number): PoseShape => ({ a: [-2, 5], b: [3, -4], f: [-2, L], g: [2, L], prop: 'bottle' }),
  board: (L: number): PoseShape => ({ a: [-3, 2], b: [5, -3], f: [-2, L], g: [2, L], prop: 'board' }),
  // O capitão a levantar o troféu (`Look.trophy`): as duas mãos a segurá-lo por cima da cabeça, e depois esticadas, em bicos de pés.
  // A base do troféu fica 1 px acima do cabelo em `lift0`, para não se ler como um chapéu.
  lift0: (L: number): PoseShape => ({ a: [-3, -12], b: [3, -12], f: [-2, L], g: [2, L], prop: 'trophy' }),
  lift1: (L: number): PoseShape => ({ a: [-3, -13], b: [3, -13], f: [-2, L], g: [2, L], jump: 1, prop: 'trophy' }),
  // A andar, sem saltar: os dois pés no chão, e depois um de cada vez levantado na passagem, com os braços a balançar
  // pouco. Usam-se sozinhas, ou como pernas de outra pose (os vencidos de cabeça baixa, `slump+walk1`).
  walk0: (L: number): PoseShape => ({ a: [-1, 5], b: [1, 5], f: [-2, L], g: [2, L] }),
  // Na passagem o corpo sobe 1 px (animacao.md §10): a perna de apoio estica até ao chão e a outra fica no ar.
  walk1: (L: number): PoseShape => ({ a: [-2, 4], b: [1, 5], f: [-1, L], g: [1, L + 1], jump: 1 }),
  walk2: (L: number): PoseShape => ({ a: [-1, 5], b: [2, 4], f: [-1, L + 1], g: [1, L], jump: 1 }),
};

// Os troféus nas mãos, de cima para baixo, centrados entre as mãos: l, m e d são o claro, o meio e o escuro do metal.
// A mesma taça e a mesma taça grande da vitrina (trophies.ts), à escala do boneco; o contorno é o automático.
const TROPHY_ROWS = {
  cup: ['..lmmmmmdd..', 'mmlmmmmmddmm', 'm.lmmmmmdd.m', 'm.lmmmmmdd.m', 'mmlmmmmmddmm', '...lmmmmd...', '.....md.....', '....mmmd....', '.lmmmmmmmdd.', '.dddddddddd.'],
  bigCup: ['..lmmmmmmmdd..', 'mmlmmmmmmmddmm', 'm.lmmmmmmmdd.m', 'm.lmmmmmmmdd.m', 'mmlmmmmmmmddmm', '...lmmmmmmd...', '....lmmmmd....', '......md......', '......md......', '.....mmmd.....', '..lmmmmmmmdd..', '..dddddddddd..'],
} as const;
// Prata para a taça e ouro para a taça grande, como na vitrina.
const TROPHY_METALS = { cup: { l: '#ffffff', m: '#c9ccd4', d: '#8f93a0' }, bigCup: { l: '#ffffff', m: '#f2c230', d: '#c99a14' } } as const;
export type PoseName = keyof typeof POSES;
/** Todas as poses, pela ordem em que estão escritas. */
export const ALL_POSES = Object.keys(POSES) as PoseName[];
/** Quantos píxeis acima do chão a pose desenha os pés (o `jump` dela). */
export const poseFeet = (pose: PoseName): number => POSES[pose](7, 7).jump ?? 0;

/** Proporções do corpo, em píxeis. `shoulder` e `waist` são larguras do tronco; `arm` e `leg` são espessuras. */
export const BUILDS = {
  slim: { shoulder: 5, waist: 4, hips: 5, arm: 1, leg: 1, jaw: 0 },
  athletic: { shoulder: 6, waist: 6, hips: 6, arm: 2, leg: 2, jaw: 0 },
  muscular: { shoulder: 8, waist: 6, hips: 6, arm: 3, leg: 3, jaw: 0 },
  heavy: { shoulder: 7, waist: 8, hips: 8, arm: 3, leg: 3, jaw: 1 },
} as const;
export type Build = keyof typeof BUILDS;

export interface Look {
  kit: KitName;
  /** O equipamento do nosso clube, feito pelo jogador. Quando existe, manda mais do que `kit`. */
  custom?: ClubKit;
  skin: number;
  hair: number;
  style: number;
  legs: number;
  torso: number;
  build: Build;
  /** Escolhe os traços do retrato: forma da cara, sobrancelhas, barba. */
  face: number;
  /** Público: calças e sapatos escuros em vez de calções e ténis. */
  street?: boolean;
  /** O troféu das poses de levantar (`lift0`, `lift1`); por omissão, a taça. */
  trophy?: 'cup' | 'bigCup';
}

/** A aparência vem do nome: o mesmo jogador tem sempre a mesma cara. */
export function lookOf(player: Player, kit: KitName): Look {
  let hash = 7;
  for (let i = 0; i < player.name.length; i++) hash = (hash * 31 + player.name.charCodeAt(i)) >>> 0;
  return {
    kit,
    skin: hash % SKINS.length,
    // Com >>> o resultado nunca é negativo, o que daria uma cor de cabelo inexistente.
    hair: (hash >>> 3) % HAIRS.length,
    style: (hash >>> 6) % 5,
    ...pixelsForHeight(heightCmOf(player)),
    // Os jogadores têm todos o mesmo corpo; os adeptos e os outros bonecos escolhem o seu.
    build: 'athletic',
    // Os jogadores nunca têm óculos; o presidente e outras caras fixas continuam a poder ter.
    face: ((hash >>> 9) >>> 20) % 5 === 0 ? (hash >>> 9) + (1 << 20) : hash >>> 9,
  };
}

/** As cores que um boneco ou um retrato vestem. */
export function kitColors(look: Look): { jersey: string; shade: string; trim: string; shorts: string } {
  const { custom } = look;
  return custom ? { jersey: custom.jersey, shade: shadeOf(custom.jersey), trim: custom.trim, shorts: custom.shorts } : KITS[look.kit];
}

/** Para as caches: dois bonecos só são iguais se tiverem a mesma roupa. */
export const kitId = (look: Look): string => (look.custom ? kitKey(look.custom) : look.kit);

export const skinColors = (look: Look): readonly [string, string] => SKINS[look.skin]!;
export const hairColor = (look: Look): string => HAIRS[look.hair]!;

export const spriteHeight = (look: Look): number => look.legs + look.torso + 12;

const SPRITE_W = 34;
const SPRITE_H = 46;
const ANCHOR_X = 17;
const ANCHOR_Y = 43;
const JERSEY_MARK = 'camisola';
const SHADE_MARK = 'sombra';
const cache = new Map<string, HTMLCanvasElement>();

function buildSprite(pose: PoseName, look: Look, back: boolean, withBall: boolean, legs?: PoseName): HTMLCanvasElement {
  const grid: (string | null)[] = new Array<string | null>(SPRITE_W * SPRITE_H).fill(null);
  const put = (x: number, y: number, color: string | null): void => {
    x |= 0;
    y |= 0;
    if (x >= 0 && y >= 0 && x < SPRITE_W && y < SPRITE_H) grid[y * SPRITE_W + x] = color;
  };
  const rect = (x: number, y: number, w: number, h: number, color: string): void => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, color);
  };
  const limb = (x0: number, y0: number, x1: number, y1: number, thickness: number, colorAt: (k: number) => string): void => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    // Um membro deitado é tão grosso na vertical como um de pé é na horizontal; um em diagonal, como os braços a correr, fica fino.
    const flat = Math.abs(x1 - x0) >= 2 * Math.abs(y1 - y0);
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      rect(Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k), flat ? 2 : thickness, flat ? Math.max(2, thickness) : 2, colorAt(k));
    }
  };
  const L = look.legs;
  const T = look.torso;
  const body = BUILDS[look.build];
  // Com `legs`, as pernas (e a altura dos pés) vêm dessa pose, e o resto, braços, tronco e bola, de `pose`: um gesto
  // feito a correr, sem os pés a deslizar.
  const own = POSES[pose](L, T);
  const stride = legs ? POSES[legs](L, T) : own;
  const shape: PoseShape = { ...own, f: stride.f, g: stride.g, jump: stride.jump };
  // Camisola marcada com estes dois nomes: o desenho dela só se resolve no fim, quando já se sabe cada píxel.
  // Uma peça da cor da tinta fundia-se com o contorno: fica num azul-noite. As riscas do árbitro são tinta de propósito.
  const fill = (c: string): string => (c === INK ? '#2c3345' : c);
  const plain = look.custom ? kitColors(look) : KITS[look.kit];
  const colors = look.custom ? { ...plain, jersey: JERSEY_MARK, shade: SHADE_MARK } : plain;
  const kit = { ...colors, shade: fill(colors.shade), trim: fill(colors.trim), shorts: fill(colors.shorts) };
  const [skin, skinShade] = SKINS[look.skin]!;
  const hair = HAIRS[look.hair]!;
  // De fato ou de fato de treino, as mangas tapam os braços até às mãos e as calças tapam as pernas. O público veste calças.
  const suit = look.kit === 'suit';
  const sleeves = suit || look.kit === 'coach';
  const trousers = sleeves || look.street === true;
  const trouserColor = look.street ? '#2c3345' : kit.shorts;
  const hipY = ANCHOR_Y - L - (shape.jump ?? 0);
  const hx = ANCHOR_X;
  const hipLeft = hx - (body.hips >> 1);
  const leg = ([dx, dy]: Offset, x0: number, shaded: boolean): void => {
    const x1 = hx + dx - 1;
    const y1 = hipY + dy - 2;
    limb(x0, hipY, x1, y1, body.leg, k => (trousers ? trouserColor : k < 0.5 ? kit.shorts : shaded ? skinShade : skin));
    rect(x1 - 1, y1 + 2, body.leg + 2, 2, look.street ? '#5a4632' : '#f4f4f4');
    // Na cor lisa da camisola: com riscas, o padrão partia este detalhe em píxeis soltos.
    if (!look.street) rect(x1 - 1, y1 + 3, 2, 1, fill(plain.jersey));
  };
  leg(shape.f, hipLeft + 1, true);
  leg(shape.g, hipLeft + body.hips - body.leg - 1, false);
  rect(hipLeft, hipY - 1, body.hips, 4, trouserColor);
  rect(hipLeft, hipY + 2, 2, 1, kit.trim);
  rect(hipLeft + body.hips - 2, hipY + 2, 2, 1, kit.trim);
  const top = hipY - T;
  const shoulderLeft = hx - (body.shoulder >> 1);
  const shoulderRight = shoulderLeft + body.shoulder - 1;
  const overlap = body.arm > 1 ? 1 : 0;
  const leftArm = shoulderLeft - body.arm + overlap;
  const rightArm = shoulderRight + 1 - overlap;
  // O braço de trás é sombreado, salvo quando atravessa o peito, à luz; numa pele escura a sombra confundia-se com o contorno.
  const drawLeftArm = (): void => limb(leftArm, top + 1, leftArm + shape.a[0], top + 1 + shape.a[1], body.arm, k => (sleeves && k < 0.7 ? kit.shade : shape.a[0] > 0 ? skin : skinShade));
  const drawRightArm = (): void => limb(rightArm, top + 1, rightArm + shape.b[0], top + 1 + shape.b[1], body.arm, k => (sleeves && k < 0.7 ? kit.jersey : skin));
  // Um braço deitado que atravessa o peito fica à frente da camisola; de costas, escondido atrás do tronco.
  const leftCrosses = shape.a[0] > Math.abs(shape.a[1]);
  const rightCrosses = -shape.b[0] > Math.abs(shape.b[1]);
  if (back && leftCrosses) drawLeftArm();
  if (back && rightCrosses) drawRightArm();
  // O tronco é desenhado linha a linha, dos ombros à cintura.
  for (let row = 0; row < T; row++) {
    const width = Math.round(body.shoulder + ((body.waist - body.shoulder) * row) / Math.max(1, T - 1));
    const left = hx - (width >> 1);
    rect(left, top + row, width, 1, kit.jersey);
    if (row > 0) put(left + width - 1, top + row, kit.shade);
    // A camisola às riscas é o que faz reconhecer o árbitro no meio dos jogadores.
    if (look.kit === 'referee') for (let c = left; c < left + width; c += 2) put(c, top + row, INK);
  }
  if (back) rect(hx - 1, top + 1, 2, 3, kit.trim);
  else rect(hx - 1, top, 2, 1, skin);
  // O fecho do fato de treino.
  if (look.kit === 'coach') for (let row = 1; row < T; row++) put(hx, top + row, kit.trim);
  // A cabeça tem o topo e o queixo arredondados: linhas de 6, 8, 8, ... 8 e 6 píxeis.
  const headX = hx - 4;
  const headY = top - 7;
  const bald = look.style === 3;
  rect(headX + 1, headY - 1, 6, 1, bald ? skin : hair);
  rect(headX, headY, 8, 6, skin);
  rect(headX + 1, headY + 6, 6, 1, skinShade);
  if (body.jaw > 0) {
    rect(headX - body.jaw, headY + 3, 8 + body.jaw * 2, 3, skin);
    rect(headX - body.jaw + 1, headY + 6, 6 + body.jaw * 2 - 2, 1, skinShade);
  }
  if (look.style === 2) {
    rect(headX + 1, headY - 3, 6, 1, hair);
    rect(headX, headY - 2, 8, 1, hair);
    rect(headX - 1, headY - 1, 10, 3, hair);
    rect(headX - 1, headY + 2, 2, 2, hair);
    rect(headX + 7, headY + 2, 2, 2, hair);
  } else if (look.style === 1) {
    rect(headX + 2, headY - 3, 4, 1, hair);
    rect(headX + 1, headY - 2, 6, 1, hair);
  }
  if (!bald && look.style !== 2) {
    rect(headX, headY, 8, 2, hair);
    // Debaixo da fita, estes dois píxeis ficavam soltos.
    if (look.style !== 4) {
      put(headX, headY + 2, hair);
      put(headX + 7, headY + 2, hair);
    }
  }
  // A fita na cor do debrum; se ficar com o valor do cabelo, desaparecia, e passa a branca.
  if (look.style === 4) rect(headX, headY + 1, 8, 1, Math.abs(oklabOf(kit.trim)[0] - oklabOf(hair)[0]) < 0.06 ? '#f4f4f4' : kit.trim);
  if (back) {
    if (!bald) rect(headX, headY, 8, 5, hair);
  } else {
    rect(headX + 3, headY + 3, 1, 2, INK);
    rect(headX + 6, headY + 3, 1, 2, INK);
  }
  if (!leftCrosses) drawLeftArm();
  if (!rightCrosses) drawRightArm();
  if (shape.prop === 'bottle') {
    const bx = rightArm + shape.b[0] + 1;
    const by = top + 1 + shape.b[1] - 3;
    rect(bx, by, 2, 5, '#7ec8e0');
    put(bx, by - 1, '#2b5fd9');
  } else if (shape.prop === 'board') {
    const bx = rightArm + shape.b[0];
    const by = top + 1 + shape.b[1] - 6;
    rect(bx, by, 6, 8, '#f4efe0');
    rect(bx + 1, by + 2, 4, 1, INK);
    rect(bx + 1, by + 4, 3, 1, INK);
    rect(bx + 2, by - 1, 2, 1, INK);
  } else if (shape.prop === 'trophy') {
    // A base fica entre as duas mãos, com a linha de baixo à altura da de baixo das mãos.
    const rows = TROPHY_ROWS[look.trophy ?? 'cup'];
    const metal = TROPHY_METALS[look.trophy ?? 'cup'];
    const x0 = hx - (rows[0]!.length >> 1);
    const y0 = top + 2 + shape.a[1] - (rows.length - 1);
    rows.forEach((row, j) => [...row].forEach((c, i) => c !== '.' && put(x0 + i, y0 + j, metal[c as 'l' | 'm' | 'd'])));
  }
  // A camisola tapa os ombros: o braço só aparece a partir da cava.
  rect(shoulderLeft - 1, top, body.shoulder + 2, 1, kit.jersey);
  rect(shoulderLeft, top + 1, body.shoulder, 1, kit.jersey);
  // Com braços grossos, o braço tapa a coluna de sombra e este píxel ficava solto.
  if (body.arm === 1) put(shoulderRight, top + 1, kit.shade);
  if (!back) rect(hx - 1, top, 2, 1, skin);
  if (!back && leftCrosses) drawLeftArm();
  if (!back && rightCrosses) drawRightArm();
  if (withBall && shape.ball) {
    const bx = hx + shape.ball[0];
    const by = hipY + shape.ball[1];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue;
        put(bx + dx, by + dy, dx === 0 || dy === 0 ? '#a93f14' : '#e8622a');
      }
    }
    put(bx - 1, by - 1, '#ffb27a');
  }

  // Contorno automático: qualquer píxel vazio ao lado de um cheio fica na cor tinta.
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H;
  const g = canvas.getContext('2d')!;
  for (let y = 0; y < SPRITE_H; y++) {
    for (let x = 0; x < SPRITE_W; x++) {
      const i = y * SPRITE_W + x;
      const near = (x > 0 && grid[i - 1]) || (x < SPRITE_W - 1 && grid[i + 1]) || (y > 0 && grid[i - SPRITE_W]) || (y < SPRITE_H - 1 && grid[i + SPRITE_W]);
      let color = grid[i] ?? (near ? INK : null);
      if (look.custom && (color === JERSEY_MARK || color === SHADE_MARK)) {
        const base = fill(usesSecondOnBody(look.custom, x, y, x - shoulderLeft, y - top, body.shoulder, T) ? look.custom.second : look.custom.jersey);
        color = color === JERSEY_MARK ? base : shadeOf(base);
      }
      if (color) {
        g.fillStyle = color;
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  return canvas;
}

/** As poses da queda e quanto o corpo já está inclinado, em graus, com a cabeça para a direita. */
const LEAN: Partial<Record<PoseName, number>> = { fallA: 30, fallB: 60, fallen: 90 };

/** Inclina um boneco sobre os pés, sem suavizar, para continuar a ser pixel art. */
function leaned(source: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_W + SPRITE_H;
  canvas.height = canvas.width;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.translate(canvas.width >> 1, canvas.width >> 1);
  g.rotate((degrees * Math.PI) / 180);
  g.drawImage(source, -ANCHOR_X, -ANCHOR_Y);
  return canvas;
}

/** Desenha um boneco. Com `legs`, as pernas vêm dessa pose (um passo da corrida) e o resto de `pose`. */
export function drawSprite(g: CanvasRenderingContext2D, pose: PoseName, look: Look, x: number, y: number, flip: boolean, back: boolean, withBall: boolean, legs?: PoseName): void {
  if (legs === pose) legs = undefined;
  const key = `${pose}|${legs ?? ''}|${kitId(look)}|${look.skin}|${look.hair}|${look.style}|${look.legs}|${look.torso}|${look.build}|${back}|${withBall}|${look.street === true}|${look.trophy ?? ''}`;
  const lean = legs ? undefined : LEAN[pose];
  let sprite = cache.get(key);
  if (!sprite) {
    const built = buildSprite(pose, look, back, withBall, legs);
    sprite = lean === undefined ? built : leaned(built, lean);
    remember(cache, key, sprite, 3000);
  }
  if (lean !== undefined) {
    // À medida que cai, o corpo fica centrado onde estava e encostado ao chão.
    const half = sprite.width >> 1;
    g.save();
    g.translate(x | 0, (y | 0) - Math.round((lean / 90) * 3));
    if (flip) g.scale(-1, 1);
    g.drawImage(sprite, -half - Math.round((lean / 90) * 12), -half);
    g.restore();
    return;
  }
  if (flip) {
    g.save();
    g.translate(x | 0, 0);
    g.scale(-1, 1);
    g.drawImage(sprite, -ANCHOR_X, (y | 0) - ANCHOR_Y);
    g.restore();
  } else {
    g.drawImage(sprite, (x | 0) - ANCHOR_X, (y | 0) - ANCHOR_Y);
  }
}

/** A sombra é uma oval por degraus, ligeiramente deslocada, como se a luz viesse de cima e da frente. */
export function drawShadow(g: CanvasRenderingContext2D, x: number, y: number, radius = 7): void {
  x = (x | 0) + 1;
  y |= 0;
  g.fillStyle = 'rgba(20,16,30,.34)';
  g.fillRect(x - radius, y - 1, radius * 2, 2);
  g.fillRect(x - radius + 2, y - 2, radius * 2 - 4, 1);
  g.fillRect(x - radius + 2, y + 1, radius * 2 - 4, 1);
}

/** O reflexo no chão polido é o próprio boneco, virado ao contrário e quase transparente. */
export function drawReflection(g: CanvasRenderingContext2D, pose: PoseName, look: Look, x: number, y: number, flip: boolean, back: boolean, strength: number, legs?: PoseName): void {
  g.save();
  g.globalAlpha = strength;
  g.translate(0, (y | 0) * 2 + 1);
  g.scale(1, -1);
  drawSprite(g, pose, look, x, y, flip, back, false, legs);
  g.restore();
}

const faceCache = new Map<string, string>();

/** Retrato do jogador para o painel, recortado do próprio boneco. */
const spriteCache = new Map<string, string>();

/** Um boneco inteiro, parado, como imagem: para as pranchetas em HTML, onde não há canvas por boneco. */
export function spriteImage(look: Look, pose: PoseName = 'idle'): string {
  const key = `${pose}|${kitId(look)}|${look.skin}|${look.hair}|${look.style}|${look.legs}|${look.torso}|${look.build}`;
  let url = spriteCache.get(key);
  if (!url) {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = spriteHeight(look) + 4;
    const g = canvas.getContext('2d')!;
    drawSprite(g, pose, look, 12, canvas.height - 2, false, false, false);
    url = canvas.toDataURL();
    remember(spriteCache, key, url, 600);
  }
  return url;
}

export function faceImage(look: Look): string {
  const key = `${kitId(look)}|${look.skin}|${look.hair}|${look.style}|${look.legs}|${look.torso}|${look.build}`;
  let url = faceCache.get(key);
  if (!url) {
    const canvas = document.createElement('canvas');
    canvas.width = 14;
    canvas.height = 14;
    const g = canvas.getContext('2d')!;
    drawSprite(g, 'idle', look, 7, look.legs + look.torso + 11, false, false, false);
    url = canvas.toDataURL();
    remember(faceCache, key, url, 600);
  }
  return url;
}

export function drawBall(g: CanvasRenderingContext2D, x: number, y: number): void {
  x |= 0;
  y |= 0;
  // O mesmo desenho da bola nas mãos dos bonecos: 5×5 sem os cantos, costuras em cruz e um brilho, com o contorno que o
  // desenho automático dos bonecos lhe dá (só os vizinhos de lado, por isso os cantos ficam cortados).
  g.fillStyle = INK;
  g.fillRect(x - 1, y - 3, 3, 7);
  g.fillRect(x - 3, y - 1, 7, 3);
  g.fillRect(x - 2, y - 2, 5, 5);
  g.fillStyle = '#e8622a';
  g.fillRect(x - 2, y - 1, 5, 3);
  g.fillRect(x - 1, y - 2, 3, 5);
  g.fillStyle = '#a93f14';
  g.fillRect(x, y - 2, 1, 5);
  g.fillRect(x - 2, y, 5, 1);
  g.fillStyle = '#ffb27a';
  g.fillRect(x - 1, y - 1, 1, 1);
}

export function drawCarrierArrow(g: CanvasRenderingContext2D, x: number, y: number): void {
  x |= 0;
  y |= 0;
  g.fillStyle = INK;
  g.fillRect(x - 4, y - 5, 9, 2);
  g.fillRect(x - 3, y - 3, 7, 2);
  g.fillRect(x - 2, y - 1, 5, 2);
  g.fillRect(x - 1, y + 1, 3, 1);
  g.fillStyle = '#f2c230';
  g.fillRect(x - 3, y - 4, 7, 2);
  g.fillRect(x - 2, y - 2, 5, 2);
  g.fillRect(x - 1, y, 3, 1);
}
