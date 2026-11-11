// Maqueta: cenários novos desenhados com o motor verdadeiro do campo, para o utilizador escolher. Não entra no jogo.
import { Camera, THEMES, courtTextures, drawHoop, fanRows, sideFanSpot, endFanSpot, FAN_SPACING, type CourtTheme, type Sky } from './art/court.ts';
import { buildOf, pixelsForHeight } from './art/body.ts';
import { drawReflection, drawShadow, drawSprite, type KitName, type Look, type PoseName } from './art/sprites.ts';

export interface Proposal {
  id: string;
  title: string;
  division: string;
  note: string;
  theme: CourtTheme;
  sky?: Sky;
  aim?: number;
  /** Desenhado por cima dos adeptos e por baixo dos jogadores (faixas, ecrãs, mesa). */
  back?: (g: CanvasRenderingContext2D, cam: Camera) => void;
  /** Desenhado por cima de tudo (luz, vinheta). */
  front?: (g: CanvasRenderingContext2D, cam: Camera) => void;
  fans?: number;
  /** Cor que escurece os adeptos, para a bancada cair para o escuro. */
  fanTint?: string;
  /** Outra câmara: mais alta, mais baixa, mais longe. */
  tune?: Partial<Camera['tuning']>;
  /** As cores das camisolas dos adeptos (uma em cada três veste roupa de rua). */
  fanShirts?: readonly string[];
}

/** As vistas: a do jogo, a da demonstração do título (o ecrã inteiro, apontada ao meio-campo) e outras para ver o cenário todo. */
export interface View {
  id: string;
  label: string;
  w: number;
  h: number;
  aim?: number;
  tune?: Partial<Camera['tuning']>;
}
export const VIEWS: readonly View[] = [
  { id: 'jogo', label: 'Jogo', w: 480, h: 270 },
  { id: 'demo', label: 'Demonstração', w: 640, h: 440, aim: 14, tune: {} },
  { id: 'alto', label: 'Alto', w: 640, h: 360, aim: 14, tune: { cy: 4, cz: 26, focal: 260 } },
  { id: 'lado', label: 'Lado', w: 640, h: 360, aim: 3, tune: { cy: 13, cz: 9 } },
  { id: 'afastado', label: 'Afastado', w: 640, h: 360, aim: 14, tune: { cy: 17, cz: 15, focal: 220 } },
];

const look = (i: number, kit: KitName): Look => {
  const height = 172 + ((i * 53) % 40);
  return { kit, skin: (i * 7) % 4, hair: (i * 5) % 6, style: (i * 3) % 5, build: buildOf(height, 70 + ((i * 29) % 30), 50), face: i * 131, ...pixelsForHeight(height) };
};

const fanLook = (n: number, p: Proposal): Look => {
  const base = look(n, n % 2 ? 'fan' : 'fan2');
  if (!p.fanShirts) return n % 3 ? base : look(n, 'blue');
  if (n % 3 === 0) return base;
  const jersey = p.fanShirts[n % p.fanShirts.length]!;
  return { ...base, custom: { id: jersey, name: jersey, jersey, second: jersey, pattern: 'plain', trim: jersey, shorts: '#2c3345' } };
};

// Uma jogada parada à frente do cesto da esquerda: cinco de cada lado e o árbitro.
const PLAYERS: readonly (readonly [number, number, PoseName, KitName])[] = [
  [8.6, 0.6, 'drib0', 'blue'], [5.2, -5, 'idle', 'blue'], [4.4, 4.6, 'run0', 'blue'], [3.2, 2.4, 'idle', 'blue'], [2.4, -1.8, 'idle', 'blue'],
  [7.4, 0.2, 'defend', 'cream'], [4.4, -4, 'defend', 'cream'], [3.8, 3.8, 'defend', 'cream'], [2.8, 1.6, 'defend', 'cream'], [1.9, -1, 'defend', 'cream'],
  [10.6, 4.4, 'idle', 'referee'],
];

export function render(canvas: HTMLCanvasElement, p: Proposal, view: View = VIEWS[0]!): void {
  const W = view.w;
  const H = view.h;
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const cam = new Camera();
  cam.setViewport(W, H);
  // A vista do jogo usa a câmara de cada proposta; as outras são iguais para todas, para se compararem.
  const tune = view.tune ?? p.tune;
  if (tune) cam.tune(tune);
  cam.aim(view.aim ?? p.aim ?? 8);
  const t = courtTextures(p.theme, undefined, undefined, p.sky);
  const image = g.createImageData(W, H);
  cam.drawScene(new Uint32Array(image.data.buffer), t, 0);
  g.putImageData(image, 0, 0);
  const theme = t.theme;
  const sprites: { x: number; y: number; pose: PoseName; look: Look; flip: boolean; floor: boolean }[] = [];
  if (theme.crowd) {
    let n = 1;
    const seat = (k: number): number => ((k * 2654435761) >>> 0) / 4294967296;
    const density = p.fans ?? theme.crowd.density;
    for (let row = fanRows(theme) - 1; row >= 0; row--) {
      const side = sideFanSpot(theme, row);
      for (let x = endFanSpot(theme, false, row).x + 0.7 + (row % 2) * (FAN_SPACING / 2); x < endFanSpot(theme, true, row).x - 0.5; x += FAN_SPACING) {
        if (seat(n++) >= density) continue;
        const [sx, sy] = cam.project(x, side.y, side.z);
        sprites.push({ x: sx, y: sy, pose: 'sit', look: fanLook(n, p), flip: n % 3 === 0, floor: false });
      }
      for (const far of [false, true]) {
        const end = endFanSpot(theme, far, row);
        for (let y = side.y + 0.7 + (row % 2) * (FAN_SPACING / 2); y < 9; y += FAN_SPACING) {
          if (seat(n++) >= density) continue;
          const [sx, sy] = cam.project(end.x, y, end.z);
          sprites.push({ x: sx, y: sy, pose: 'sit', look: fanLook(n, p), flip: far, floor: false });
        }
      }
    }
  }
  // Os adeptos numa camada à parte, para se poderem escurecer sem tocar no resto.
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const lg = layer.getContext('2d')!;
  lg.imageSmoothingEnabled = false;
  // Os mais longe primeiro, para os de perto taparem os de trás.
  sprites.sort((a, b) => a.y - b.y);
  for (const s of sprites) drawSprite(lg, s.pose, s.look, s.x | 0, s.y | 0, s.flip, false, false, undefined, cam.depthScale(s.y));
  if (p.fanTint) {
    lg.globalCompositeOperation = 'multiply';
    lg.fillStyle = p.fanTint;
    lg.fillRect(0, 0, W, H);
    lg.globalCompositeOperation = 'destination-in';
    for (const s of sprites) drawSprite(lg, s.pose, s.look, s.x | 0, s.y | 0, s.flip, false, false, undefined, cam.depthScale(s.y));
  }
  g.drawImage(layer, 0, 0);
  p.back?.(g, cam);
  drawHoop(g, cam, theme, 1.575, 0);
  drawHoop(g, cam, theme, 26.425, 0);
  const players = PLAYERS.map(([x, y, pose, kit], i) => {
    const [sx, sy] = cam.project(x, y);
    return { sx, sy, pose, look: look(i + 40, kit) };
  }).sort((a, b) => a.sy - b.sy);
  for (const q of players) drawReflection(g, q.pose, q.look, q.sx | 0, q.sy | 0, false, false, theme.reflection, undefined, cam.depthScale(q.sy));
  for (const q of players) {
    const k = cam.depthScale(q.sy);
    drawShadow(g, q.sx | 0, q.sy | 0, Math.round(7 * k));
    drawSprite(g, q.pose, q.look, q.sx | 0, q.sy | 0, false, false, q.pose === 'drib0', undefined, k);
  }
  p.front?.(g, cam);
}

/** Os quatro de hoje, para comparar. */
export const CURRENT: readonly Proposal[] = THEMES.map((theme, i) => ({ id: `atual-${i}`, title: theme.name, division: ['Liga Iniciados', 'Liga Avançada', 'Pro Liga 2', 'Pro Liga 1'][i]!, note: theme.note, theme }));
