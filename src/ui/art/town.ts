import { fillPolygon, pixelLine } from './court.ts';
import { text } from './font.ts';
import { drawShadow, drawSprite, INK, type Look, type PoseName } from './sprites.ts';

// A cidade do estudo visual: um mapa isométrico em que cada edifício é uma função.
// Quatro quarteirões à volta de uma rotunda, tudo perto do centro para caber num telemóvel.
const GROUND = ['#1a7f77', '#17737a'];
const ROAD = '#d9c79a';
const ROAD_LINE = '#efe3c2';
const YARD = '#c9b482';
const TARMAC = '#6d7a86';
const TARMAC_DARK = '#4b5564';
const WHITE = '#f8f0d8';
const WALK_FRAMES: readonly PoseName[] = ['run0', 'run1', 'run2', 'run1'];
const WALK_FRAME_MS = 170;
const WALK_TILES_PER_SECOND = 1.1;

const ROAD_A = 19;
const ROAD_B_I = 28.2;
const ROAD_B_J = 28.5;
const ROAD_WIDTH = 1.5;
const PLAZA = ROAD_A + ROAD_WIDTH / 2;

const PAVILION = { i: 6.5, j: 6.5, a: 10, b: 10 };
const OFFICE = { i: 22, j: 14, a: 3.8, b: 3.8, h: 5 };
const TRAINING = { i: 13.5, j: 21.5, a: 4.8, b: 4.8 };
const FEDERATION = { i: 30.6, j: 21.5, a: 3.8, b: 3.8, h: 2.2, roof: 1.1 };
const TOWER = { i: 22.5, j: 32, a: 2, b: 2, h: 5 };
const AIRPORT = { i: 30.5, j: 31, a: 7, b: 7 };
// Tudo afastado das estradas o suficiente para nem o telhado as tapar.
export const TOWN_ROADS = [{ along: 'i', at: ROAD_A }, { along: 'i', at: ROAD_B_J }, { along: 'j', at: ROAD_A }, { along: 'j', at: ROAD_B_I }] as const;
export const ROAD_SIZE = ROAD_WIDTH;
export const HOUSE_SIZE = 2.2;
export const TOWN_HOUSES: readonly (readonly [number, number])[] = [
  [22, 8], [25.5, 9.5], [23, 4], [25.5, 5], [31.4, 11], [34.4, 14], [31.4, 15.2], [31.4, 2],
  [22.4, 22.4], [25.4, 22.4], [22.4, 25.4], [25.4, 25.4],
  [7, 22.2], [9, 25.2], [14.4, 31.8], [16.4, 34.2], [12, 34.5],
];
export const TOWN_TREES: readonly (readonly [number, number])[] = [
  [3, 4], [17.8, 3], [4, 17.8], [17.8, 12], [7, 17.9], [27.4, 12], [27.4, 16],
  [21.4, 28], [27.6, 21.2], [18.4, 27.6], [11, 27.8], [18.4, 31], [27.4, 33], [26.4, 36], [21.4, 37],
  [30.4, 31], [30.4, 36], [39, 34], [39, 37], [36.4, 22], [31, 27.6], [33.5, 18.4],
];
// Até onde o mapa vai, em ladrilhos, medido na diagonal.
const MAP_DEPTH = 76;

type Pixels = CanvasRenderingContext2D;
type Point = [number, number];

/** A mesma cor, misturada com branco. */
function lighten(color: string, amount: number): string {
  const value = parseInt(color.slice(1), 16);
  const mix = (channel: number): number => Math.round(channel + (255 - channel) * amount);
  return `rgb(${mix((value >> 16) & 255)},${mix((value >> 8) & 255)},${mix(value & 255)})`;
}

interface Grid {
  th: number;
  tw: number;
  ox: number;
  oy: number;
}

/** Os ladrilhos crescem com a janela até um limite, e o mapa fica centrado na altura que sobra. */
function gridFor(width: number, height: number): Grid {
  // Num telemóvel ao alto a janela é estreita: os ladrilhos não crescem tanto, senão o mapa saía ainda mais pelos lados.
  const th = Math.max(4, Math.min(width < 480 ? 5 : 6, Math.floor((height - 30) / MAP_DEPTH)));
  return { th, tw: th * 2, ox: Math.round(width / 2), oy: Math.max(26, Math.round((height - MAP_DEPTH * th) / 2) + 12) };
}

const project = ({ tw, th, ox, oy }: Grid, i: number, j: number, k = 0): Point => [ox + (i - j) * tw, oy + (i + j) * th - k * th * 2];

/** O pavilhão vai ficando mais alto à medida que o clube sobe de divisão. */
const arenaHeight = (division: number): number => 2.6 + division * 0.5;

interface Town {
  ground: HTMLCanvasElement;
  /** Cada objeto com a sua profundidade, do fundo para a frente. */
  objects: [number, () => void][];
  target(g: Pixels): void;
}

/** O que a cidade mostra do clube: as cores no pavilhão e nas bandeiras, o cartaz do próximo jogo, e faixas depois de um título. */
export interface TownDress {
  jersey: string;
  trim: string;
  poster: string;
  festive: boolean;
}

/** Quando acontece a semana: manhã clara, tarde dourada, anoitecer, noite, e neve em certas semanas do inverno. Não chove. Em dezembro, luzes de Natal nas casas e no pavilhão. */
export type Weather = { tint: string | null; snow: boolean; night: boolean; lights: boolean };
export function weatherFor(week: number): Weather {
  // 29 semanas, de setembro a março: a luz muda com os meses, e o tempo com a semana.
  const month = Math.floor((week - 1) / 4);
  if (month <= 0) return { tint: null, snow: false, night: false, lights: false };
  if (month === 1) return { tint: 'rgba(255,190,110,0.16)', snow: false, night: false, lights: false };
  if (month === 2) return { tint: 'rgba(255,150,90,0.22)', snow: false, night: false, lights: false };
  if (month === 3) return { tint: 'rgba(40,50,110,0.42)', snow: false, night: true, lights: true };
  if (month === 4) return { tint: 'rgba(150,170,220,0.2)', snow: true, night: false, lights: false };
  if (month === 5) return { tint: 'rgba(170,190,230,0.14)', snow: week % 2 === 0, night: false, lights: false };
  return { tint: 'rgba(255,230,160,0.1)', snow: false, night: false, lights: false };
}

function buildTown(width: number, height: number, division: number, dress: TownDress): Town {
  const ground = document.createElement('canvas');
  ground.width = width;
  ground.height = height;
  // O chão pinta-se uma vez aqui. Os objetos pintam-se em cada imagem, no destino que for indicado.
  let g: Pixels = ground.getContext('2d')!;
  const grid = gridFor(width, height);
  const P = (i: number, j: number, k = 0): Point => project(grid, i, j, k);
  const poly = (points: Point[], color: string): void => fillPolygon(g, points, color);
  const flat = (i: number, j: number, a: number, b: number, color: string, k = 0): void => poly([P(i, j, k), P(i + a, j, k), P(i + a, j + b, k), P(i, j + b, k)], color);
  const line = (a: Point, b: Point, color: string): void => pixelLine(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), color);
  const prism = (i: number, j: number, a: number, b: number, h: number, top: string, left: string, right: string): void => {
    poly([P(i, j + b), P(i + a, j + b), P(i + a, j + b, h), P(i, j + b, h)], left);
    poly([P(i + a, j), P(i + a, j + b), P(i + a, j + b, h), P(i + a, j, h)], right);
    flat(i, j, a, b, top, h);
  };
  // Um retângulo deitado numa das duas faces visíveis, para seguir a perspetiva do edifício.
  const onLeft = (i: number, j: number, width_: number, k: number, height_: number, color: string): void =>
    poly([P(i, j, k), P(i + width_, j, k), P(i + width_, j, k + height_), P(i, j, k + height_)], color);
  const onRight = (i: number, j: number, width_: number, k: number, height_: number, color: string): void =>
    poly([P(i, j, k), P(i, j + width_, k), P(i, j + width_, k + height_), P(i, j, k + height_)], color);
  /** Telhado de quatro águas. A câmara vê as quatro, porque o telhado é baixo: as de trás, mais claras, apanham o sol. */
  const hipRoof = (i: number, j: number, a: number, b: number, k: number, rise: number, left: string, right: string): Point => {
    const apex = P(i + a / 2, j + b / 2, k + rise);
    const back = P(i, j, k);
    const west = P(i, j + b, k);
    const east = P(i + a, j, k);
    const front = P(i + a, j + b, k);
    poly([back, east, apex], lighten(right, 0.34));
    poly([back, west, apex], lighten(left, 0.2));
    poly([west, front, apex], left);
    poly([east, front, apex], right);
    // Os cantos das águas, para o telhado se ler como um volume.
    for (const corner of [west, east, front]) line(corner, apex, lighten(left, 0.42));
    return apex;
  };
  const disc = (ci: number, cj: number, radius: number, color: string, k = 0): void => {
    const points: Point[] = [];
    for (let n = 0; n < 20; n++) {
      const angle = (n / 20) * Math.PI * 2;
      points.push(P(ci + Math.cos(angle) * radius, cj + Math.sin(angle) * radius, k));
    }
    poly(points, color);
  };
  const tree = (i: number, j: number, big: boolean): void => {
    const [x, y] = P(i, j).map(Math.round) as Point;
    g.fillStyle = 'rgba(10,40,44,.4)';
    g.fillRect(x - 6, y - 1, 12, 3);
    g.fillStyle = '#5a3a22';
    g.fillRect(x - 1, y - 5, 3, 5);
    const colors = big ? ['#2f8f5b', '#3ca86c', '#58c084'] : ['#35805a', '#459b6a', '#62b483'];
    ([[7, 11], [5, 15], [3, 18]] as const).forEach(([w, top], n) => {
      g.fillStyle = colors[n]!;
      g.fillRect(x - w, y - top, w * 2 + 1, 6);
    });
  };
  const house = (i: number, j: number, n: number): void => {
    const wall = ['#efe3c2', '#e6d7ad', '#f4ebd0'][n % 3]!;
    prism(i, j, 2.2, 2.2, 1, wall, wall, '#b8a981');
    onLeft(i + 0.85, j + 2.2, 0.5, 0, 0.7, '#5a3a22');
    onRight(i + 2.2, j + 0.8, 0.6, 0.4, 0.4, '#2d6fa8');
    hipRoof(i - 0.1, j - 0.1, 2.4, 2.4, 1, 0.8, n % 4 === 3 ? '#b55d3a' : '#c9622f', n % 4 === 3 ? '#8f4629' : '#a44b22');
  };

  // O chão aos quadrados vai até onde a janela chegar.
  const reach = Math.ceil((width + height) / grid.th / 2) + 10;
  for (let i = -reach; i < reach * 2; i++) {
    for (let j = -reach; j < reach * 2; j++) {
      const a = P(i, j);
      const c = P(i + 1, j + 1);
      const b = P(i + 1, j);
      const d = P(i, j + 1);
      if (a[1] > height + 2 || c[1] < -2 || b[0] < -2 || d[0] > width + 2) continue;
      poly([a, b, c, d], GROUND[Math.abs(i + j) % 2]!);
    }
  }
  // As estradas saem do mapa em todas as direções, com um traço ao meio.
  const roadAlongI = (j: number): void => {
    flat(-reach, j, reach * 3, ROAD_WIDTH, ROAD);
    for (let i = -reach; i < reach * 2; i += 2) flat(i, j + ROAD_WIDTH / 2 - 0.05, 0.9, 0.1, ROAD_LINE);
  };
  const roadAlongJ = (i: number): void => {
    flat(i, -reach, ROAD_WIDTH, reach * 3, ROAD);
    for (let j = -reach; j < reach * 2; j += 2) flat(i + ROAD_WIDTH / 2 - 0.05, j, 0.1, 0.9, ROAD_LINE);
  };
  roadAlongI(ROAD_A);
  roadAlongI(ROAD_B_J);
  roadAlongJ(ROAD_A);
  roadAlongJ(ROAD_B_I);
  // A rotunda no meio de tudo.
  disc(PLAZA, PLAZA, 2.1, ROAD);
  disc(PLAZA, PLAZA, 1.15, '#2f8f5b');
  disc(PLAZA, PLAZA, 0.75, '#3ca86c');

  const operations: [number, () => void][] = [];
  const add = (depth: number, draw: () => void): void => {
    operations.push([depth, draw]);
  };

  // Pavilhão: paredes com faixa branca, entrada na frente e o campo à vista no telhado.
  {
    const { i, j, a, b } = PAVILION;
    const h = arenaHeight(division);
    flat(i - 1.2, j - 1.2, a + 2.4, b + 2.4, YARD);
    add(i + j + (a + b) / 2, () => {
      prism(i, j, a, b, h, '#e8622a', '#c9622f', '#a44b22');
      onLeft(i, j + b, a, h - 0.55, 0.28, WHITE);
      onRight(i + a, j, b, h - 0.55, 0.28, '#d9cfb4');
      // Janelas altas a toda a volta.
      for (let n = 0; n < 7; n++) {
        const step = (a - 1) / 7;
        // Na frente, as três do meio dão lugar à entrada.
        if (n < 2 || n > 4) onLeft(i + 0.75 + n * step, j + b, 0.6, 0.75, h - 1.5, '#8fd0e6');
        onRight(i + a, j + 0.75 + n * step, 0.6, 0.75, h - 1.5, '#6fb2c9');
      }
      // A entrada, com portas duplas e uma pala.
      onLeft(i + a / 2 - 1.1, j + b, 2.2, 0, 1.15, INK);
      onLeft(i + a / 2 - 1, j + b, 0.95, 0, 1.05, '#3d5a78');
      onLeft(i + a / 2 + 0.05, j + b, 0.95, 0, 1.05, '#3d5a78');
      onLeft(i + a / 2 - 1.5, j + b + 0.01, 3, 1.15, 0.22, '#f4efe0');
      // O emblema do clube na frente, com as cores do equipamento, e o cartaz do próximo jogo ao lado da entrada.
      onLeft(i + a / 2 - 0.55, j + b + 0.02, 1.1, 1.55, 1.1, INK);
      onLeft(i + a / 2 - 0.45, j + b + 0.02, 0.9, 1.65, 0.9, dress.jersey);
      onLeft(i + a / 2 - 0.2, j + b + 0.02, 0.4, 1.9, 0.4, dress.trim);
      if (dress.poster) {
        const [px, py] = P(i + a - 2.4, j + b, 1.55);
        const w = Math.max(30, dress.poster.length * 6 + 6);
        g.fillStyle = INK;
        g.fillRect(Math.round(px) - 1, Math.round(py) - 1, w + 2, 11);
        g.fillStyle = '#f2c230';
        g.fillRect(Math.round(px), Math.round(py), w, 9);
        text(g, dress.poster, Math.round(px) + 3, Math.round(py) + 2, INK, 1);
      }
      // O telhado: chapa com nervuras, rebordo e uma lanterna envidraçada, que dá luz ao campo lá dentro.
      for (let n = 0; n < a - 0.8; n += 0.9) flat(i + 0.5 + n, j + 0.4, 0.14, b - 0.8, '#c25024', h);
      flat(i, j, a, 0.3, '#f07238', h);
      flat(i, j, 0.3, b, '#f07238', h);
      flat(i, j + b - 0.3, a, 0.3, '#d9592a', h);
      flat(i + a - 0.3, j, 0.3, b, '#d9592a', h);
      const lantern = { i: i + 2.4, j: j + 3.4, a: a - 4.8, b: b - 6.8, k: h, h: 0.9 };
      poly([P(lantern.i, lantern.j + lantern.b, lantern.k), P(lantern.i + lantern.a, lantern.j + lantern.b, lantern.k), P(lantern.i + lantern.a, lantern.j + lantern.b, lantern.k + lantern.h), P(lantern.i, lantern.j + lantern.b, lantern.k + lantern.h)], '#8fd0e6');
      poly([P(lantern.i + lantern.a, lantern.j, lantern.k), P(lantern.i + lantern.a, lantern.j + lantern.b, lantern.k), P(lantern.i + lantern.a, lantern.j + lantern.b, lantern.k + lantern.h), P(lantern.i + lantern.a, lantern.j, lantern.k + lantern.h)], '#6fb2c9');
      for (let n = 0.7; n < lantern.a; n += 0.9) onLeft(lantern.i + n, lantern.j + lantern.b, 0.1, lantern.k, lantern.h, '#3d5a78');
      for (let n = 0.7; n < lantern.b; n += 0.9) onRight(lantern.i + lantern.a, lantern.j + n, 0.1, lantern.k, lantern.h, '#2d4a68');
      hipRoof(lantern.i - 0.25, lantern.j - 0.25, lantern.a + 0.5, lantern.b + 0.5, lantern.k + lantern.h, 0.8, '#e8622a', '#b84a1e');
    });
  }

  // Escritório: um bloco moderno, com janelas nas duas faces e o emblema do clube no terraço.
  {
    const { i, j, a, b, h } = OFFICE;
    flat(i - 0.8, j - 0.8, a + 1.6, b + 1.1, YARD);
    add(i + j + (a + b) / 2, () => {
      prism(i, j, a, b, h, '#f4efe0', '#c4c9d4', '#8f97ab');
      for (let floor = 0; floor < 4; floor++) {
        const k = 1.05 + floor * 0.95;
        for (let col = 0; col < 3; col++) {
          const step = (a - 0.7) / 3;
          onLeft(i + 0.35 + col * step, j + b, step - 0.3, k, 0.55, '#2d6fa8');
          onRight(i + a, j + 0.35 + col * step, step - 0.3, k, 0.55, '#24598a');
        }
      }
      onLeft(i + a / 2 - 0.5, j + b, 1, 0, 0.85, '#3d5a78');
      flat(i + 0.3, j + 0.3, a - 0.6, b - 0.6, '#dcd6c4', h);
      const c = i + a / 2;
      const m = j + b / 2;
      disc(c, m, 1.15, INK, h);
      disc(c, m, 0.98, '#e8622a', h);
      line(P(c - 0.98, m, h), P(c + 0.98, m, h), INK);
      line(P(c, m - 0.98, h), P(c, m + 0.98, h), INK);
    });
  }

  // Treino: um campo ao ar livre com dois cestos, uma arrecadação e um banco.
  {
    const { i, j, a, b } = TRAINING;
    flat(i - 0.6, j - 0.6, a + 1.2, b + 1.2, YARD);
    flat(i, j, a, b, TARMAC);
    flat(i + 0.4, j + 0.4, a - 0.8, b - 0.8, '#dca35c');
    const c = i + a / 2;
    const m = j + b / 2;
    line(P(c, j + 0.4), P(c, j + b - 0.4), WHITE);
    disc(c, m, 0.65, WHITE);
    disc(c, m, 0.5, '#dca35c');
    const hoop = (ci: number, side: number): void => {
      const [x, y] = P(ci, m).map(Math.round) as Point;
      g.fillStyle = INK;
      g.fillRect(x, y - 15, 2, 15);
      g.fillRect(x - 5, y - 21, 12, 8);
      g.fillStyle = WHITE;
      g.fillRect(x - 4, y - 20, 10, 6);
      g.fillStyle = '#e8622a';
      g.fillRect(x - 2 + side * 3, y - 14, 5, 1);
    };
    add(i + m + 0.1, () => hoop(i + 0.5, 1));
    add(i + a + m - 0.5, () => hoop(i + a - 0.5, -1));
    add(i + j + 1, () => {
      prism(i + 0.1, j - 0.5, 1.5, 1, 0.9, '#efe3c2', '#efe3c2', '#c4b890');
      hipRoof(i, j - 0.6, 1.7, 1.2, 0.9, 0.5, '#cf4436', '#a7372c');
    });
  }

  // Federação: um edifício clássico, com degraus, colunas e um telhado a sério.
  {
    const { i, j, a, b, h, roof } = FEDERATION;
    flat(i - 0.8, j - 0.8, a + 1.6, b + 1.6, YARD);
    add(i + j + (a + b) / 2, () => {
      prism(i - 0.45, j - 0.45, a + 0.9, b + 0.9, 0.18, '#f4efe0', '#c4bea6', '#a39d84');
      prism(i - 0.2, j - 0.2, a + 0.4, b + 0.4, 0.36, '#f8f4e6', '#d4cdb6', '#b0a98e');
      prism(i + 0.2, j + 0.2, a - 0.4, b - 0.4, h, '#d9d3bf', '#a39c82', '#8a8369');
      onLeft(i + a / 2 - 0.45, j + b - 0.2, 0.9, 0.36, 1.2, '#5a3a22');
      // Colunas nas duas faces, sem tapar a porta.
      for (let n = 0; n < 6; n++) {
        const step = (a - 0.9) / 5;
        const u = i + 0.35 + n * step;
        if (n !== 2 && n !== 3) onLeft(u, j + b - 0.2, 0.22, 0.36, h - 0.36, '#f4efe0');
        onRight(i + a - 0.2, j + 0.35 + n * step, 0.22, 0.36, h - 0.36, '#e4dcc6');
      }
      const eave = h + 0.22;
      onLeft(i - 0.1, j + b + 0.1, a + 0.2, h, 0.22, '#f4efe0');
      onRight(i + a + 0.1, j - 0.1, b + 0.2, h, 0.22, '#d4cdb6');
      const apex = hipRoof(i - 0.1, j - 0.1, a + 0.2, b + 0.2, eave, roof, '#e8622a', '#b84a1e');
      const [x, y] = apex.map(Math.round) as Point;
      g.fillStyle = INK;
      g.fillRect(x, y - 15, 1, 15);
      g.fillStyle = '#cf3a2c';
      g.fillRect(x + 1, y - 15, 9, 6);
    });
  }

  // Torre do relógio: esguia, com o relógio virado para a cidade.
  {
    const { i, j, a, b, h } = TOWER;
    flat(i - 1, j - 0.8, a + 2, b + 1.6, YARD);
    add(i + j + (a + b) / 2, () => {
      prism(i - 0.2, j - 0.2, a + 0.4, b + 0.4, 0.5, '#efe3c2', '#c9bea0', '#a79c7e');
      prism(i, j, a, b, h, WHITE, '#dad3bc', '#b6ae93');
      onLeft(i, j + b, a, h - 0.35, 0.35, '#c9bea0');
      onRight(i + a, j, b, h - 0.35, 0.35, '#a79c7e');
      onLeft(i + a / 2 - 0.35, j + b, 0.7, 0, 0.95, '#5a3a22');
      // Um relógio em perspetiva, com os ponteiros.
      onLeft(i + 0.3, j + b, a - 0.6, h - 1.75, 1.2, INK);
      onLeft(i + 0.4, j + b, a - 0.8, h - 1.65, 1, '#f2c230');
      line(P(i + a / 2, j + b, h - 1.15), P(i + a / 2, j + b, h - 0.8), INK);
      line(P(i + a / 2, j + b, h - 1.15), P(i + a / 2 + 0.45, j + b, h - 1.15), INK);
      onRight(i + a, j + 0.3, b - 0.6, h - 1.75, 1.2, INK);
      onRight(i + a, j + 0.4, b - 0.8, h - 1.65, 1, '#d9a400');
      hipRoof(i - 0.15, j - 0.15, a + 0.3, b + 0.3, h, 0.9, '#cf4436', '#a7372c');
    });
  }

  // Aeroporto: pista, placa de estacionamento, terminal envidraçado, torre de controlo e um avião.
  {
    const { i, j, a, b } = AIRPORT;
    flat(i, j, a, b, TARMAC);
    flat(i, j + b - 1.7, a, 1.4, TARMAC_DARK);
    for (let n = 0; n < 5; n++) flat(i + 0.5 + n * 1.3, j + b - 1.05, 0.8, 0.1, WHITE);
    add(i + j + 4, () => {
      prism(i + 0.7, j + 0.6, 3.6, 2, 1.2, '#f4efe0', '#c4c9d4', '#8f97ab');
      onLeft(i + 1, j + 2.6, 3, 0.35, 0.55, '#2d6fa8');
      onRight(i + 4.3, j + 0.9, 1.4, 0.35, 0.55, '#24598a');
    });
    add(i + j + 6, () => {
      prism(i + 5.2, j + 0.8, 0.8, 0.8, 3.4, '#dfe2ea', '#dfe2ea', '#a9aebc');
      prism(i + 4.95, j + 0.55, 1.3, 1.3, 0.5, '#2d6fa8', '#2d6fa8', '#24598a');
      const k = 3.4;
      poly([P(i + 4.95, j + 1.85, k), P(i + 6.25, j + 1.85, k), P(i + 6.25, j + 1.85, k + 0.6), P(i + 4.95, j + 1.85, k + 0.6)], '#7ec8e0');
      poly([P(i + 6.25, j + 0.55, k), P(i + 6.25, j + 1.85, k), P(i + 6.25, j + 1.85, k + 0.6), P(i + 6.25, j + 0.55, k + 0.6)], '#5aa6bf');
      flat(i + 4.85, j + 0.45, 1.5, 1.5, '#2d6fa8', k + 0.6);
    });
    add(i + j + 8.5, () => {
      // O avião: fuselagem, asas e cauda, parado na placa.
      const pi = i + 4.6;
      const pj = j + 4.1;
      flat(pi - 0.15, pj - 2, 0.3, 4, 'rgba(10,40,44,.35)');
      flat(pi - 1.9, pj - 0.2, 3.8, 0.6, '#c4c9d4', 0.25);
      flat(pi - 0.9, pj + 1.5, 1.8, 0.35, '#c4c9d4', 0.25);
      flat(pi - 0.3, pj - 2, 0.6, 4, WHITE, 0.3);
      flat(pi - 0.3, pj - 2, 0.6, 0.5, '#2d6fa8', 0.3);
      flat(pi - 0.3, pj + 1.2, 0.6, 0.8, '#cf3a2c', 0.3);
    });
  }

  // Casas nos quarteirões livres.
  TOWN_HOUSES.forEach(([i, j], n) => {
    add(i + j + 2.2, () => house(i, j, n));
  });
  // Árvores à volta, e bosque onde o mapa acaba.
  TOWN_TREES.forEach(([i, j], n) => {
    add(i + j, () => tree(i, j, n % 2 === 1));
  });
  for (let i = -reach; i < reach * 2; i += 2) {
    for (let j = -reach; j < reach * 2; j += 2) {
      const hash = (i * 73 + j * 37) & 255;
      if (hash % 3 !== 0) continue;
      const ti = i + (hash % 5) * 0.3;
      const tj = j + ((hash >> 2) % 5) * 0.3;
      if (ti > -1 && ti < 41 && tj > -1 && tj < 40) continue;
      const onRoad = (v: number, start: number): boolean => v > start - 0.8 && v < start + ROAD_WIDTH + 0.8;
      if (onRoad(ti, ROAD_A) || onRoad(tj, ROAD_A) || onRoad(ti, ROAD_B_I) || onRoad(tj, ROAD_B_J)) continue;
      const [x, y] = P(ti, tj);
      if (x < -12 || x > width + 12 || y < -4 || y > height + 22) continue;
      add(ti + tj, () => tree(ti, tj, hash % 2 === 1));
    }
  }
  // Bandeiras na rotunda com as cores do clube; depois de um título, faixas de festa à volta dela.
  for (const [fi, fj] of [[PLAZA - 1.3, PLAZA - 1.3], [PLAZA + 1.1, PLAZA - 1.3], [PLAZA - 1.3, PLAZA + 1.1], [PLAZA + 1.1, PLAZA + 1.1]] as const) {
    add(fi + fj + 0.2, () => {
      const [x, y] = P(fi, fj).map(Math.round) as Point;
      g.fillStyle = INK;
      g.fillRect(x, y - 14, 1, 14);
      g.fillStyle = fi < PLAZA ? dress.jersey : dress.trim;
      g.fillRect(x + 1, y - 14, 5, 4);
      if (dress.festive) {
        g.fillStyle = '#f2c230';
        for (let n = 0; n < 5; n++) g.fillRect(x + 2 + n * 3, y - 9 + (n % 2), 2, 2);
      }
    });
  }
  operations.sort((a, b) => a[0] - b[0]);
  return {
    ground,
    objects: operations,
    target: next => {
      g = next;
    },
  };
}

export type TownPlace = 'arena' | 'office' | 'training' | 'federation' | 'tower' | 'airport';

/** Onde fica a etiqueta de cada edifício, em frações da janela. Ficam à frente de cada um, para não o taparem. */
export function townPlaces(width: number, height: number): Record<TownPlace, { x: number; y: number }> {
  const grid = gridFor(width, height);
  const at = (i: number, j: number): { x: number; y: number } => {
    const [x, y] = project(grid, i, j);
    return { x: x / width, y: y / height };
  };
  return {
    arena: at(PAVILION.i + PAVILION.a + 0.6, PAVILION.j + PAVILION.b + 0.6),
    office: at(OFFICE.i + OFFICE.a + 1, OFFICE.j + OFFICE.b + 1),
    // À esquerda do campo, porque à frente fica a torre.
    training: at(TRAINING.i - 0.2, TRAINING.j + TRAINING.b + 0.2),
    federation: at(FEDERATION.i + FEDERATION.a + 1, FEDERATION.j + FEDERATION.b + 1),
    tower: at(TOWER.i + TOWER.a + 0.8, TOWER.j + TOWER.b + 0.8),
    airport: at(AIRPORT.i + AIRPORT.a, AIRPORT.j + AIRPORT.b),
  };
}

/** A caixa de cada edifício no ecrã, em frações da janela, para se poder tocar nele e não só na etiqueta. */
export function townBoxes(width: number, height: number, division: number): Record<TownPlace, { x0: number; y0: number; x1: number; y1: number }> {
  const grid = gridFor(width, height);
  const box = (i: number, j: number, a: number, b: number, h: number): { x0: number; y0: number; x1: number; y1: number } => {
    const corners = [project(grid, i, j, 0), project(grid, i + a, j, 0), project(grid, i, j + b, 0), project(grid, i + a, j + b, 0), project(grid, i, j, h), project(grid, i + a, j, h), project(grid, i, j + b, h), project(grid, i + a, j + b, h)];
    const xs = corners.map(c => c[0] / width);
    const ys = corners.map(c => c[1] / height);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  };
  return {
    arena: box(PAVILION.i, PAVILION.j, PAVILION.a, PAVILION.b, arenaHeight(division) + 1.4),
    office: box(OFFICE.i, OFFICE.j, OFFICE.a, OFFICE.b, OFFICE.h + 0.4),
    training: box(TRAINING.i, TRAINING.j, TRAINING.a, TRAINING.b, 1),
    federation: box(FEDERATION.i, FEDERATION.j, FEDERATION.a, FEDERATION.b, FEDERATION.h + FEDERATION.roof + 0.4),
    tower: box(TOWER.i, TOWER.j, TOWER.a, TOWER.b, TOWER.h + 1.2),
    airport: box(AIRPORT.i, AIRPORT.j, AIRPORT.a, AIRPORT.b, 4),
  };
}

/** Qual o edifício debaixo do dedo. Os da frente ganham aos de trás quando as caixas se cruzam. */
export function townHit(width: number, height: number, division: number, fx: number, fy: number): TownPlace | null {
  const boxes = townBoxes(width, height, division);
  const order: TownPlace[] = ['airport', 'tower', 'federation', 'training', 'office', 'arena'];
  return order.find(place => {
    const b = boxes[place];
    return fx >= b.x0 && fx <= b.x1 && fy >= b.y0 && fy <= b.y1;
  }) ?? null;
}

let cached: { key: string; town: Town } | null = null;

/** O chão só se refaz quando muda o tamanho ou a divisão. Os edifícios e as árvores desenham-se por ordem de profundidade, misturados com os jogadores, para eles poderem passar por trás. */
export function drawTown(g: Pixels, width: number, height: number, division: number, walkers: readonly Look[], now: number, dress: TownDress, weather: Weather): void {
  const key = `${width}x${height}x${division}|${dress.jersey}|${dress.trim}|${dress.poster}|${dress.festive}`;
  if (cached?.key !== key) cached = { key, town: buildTown(width, height, division, dress) };
  const { town } = cached;
  g.drawImage(town.ground, 0, 0);
  town.target(g);
  const grid = gridFor(width, height);
  // Um percurso só um pouco maior do que a janela, para os bonecos estarem quase sempre à vista.
  const span = Math.ceil(width / grid.tw) + 8;
  const placed = walkers.slice(0, 6).map((look, n) => {
    const travelled = (now / 1000 * WALK_TILES_PER_SECOND + n * 13) % span - span / 2;
    const forward = n % 2 === 0;
    const along = PLAZA + (forward ? travelled : -travelled);
    const onRoadJ = n < 3;
    const lane = ROAD_A + 0.45 + (n % 2) * 0.6;
    const i = onRoadJ ? along : lane;
    const j = onRoadJ ? lane : along;
    const [x, y] = project(grid, i, j);
    // Andar para a frente numa estrada é ir para a direita; na outra, é ir para a esquerda.
    const right = onRoadJ ? forward : !forward;
    return { look, depth: i + j, x: Math.round(x), y: Math.round(y), right, frame: Math.floor((now + n * 90) / WALK_FRAME_MS) % WALK_FRAMES.length };
  }).sort((a, b) => a.depth - b.depth);
  let next = 0;
  const walkersUpTo = (depth: number): void => {
    while (next < placed.length && placed[next]!.depth < depth) {
      const { look, x, y, right, frame } = placed[next++]!;
      drawShadow(g, x, y, 6);
      drawSprite(g, WALK_FRAMES[frame]!, look, x, y, !right, false, false);
    }
  };
  for (const [depth, draw] of town.objects) {
    walkersUpTo(depth);
    draw();
  }
  walkersUpTo(Infinity);
  // A luz do dia e o tempo, por cima de tudo.
  if (weather.tint) {
    g.fillStyle = weather.tint;
    g.fillRect(0, 0, width, height);
  }
  if (weather.night) {
    // Janelas acesas: pontos quentes por cima das casas.
    g.fillStyle = 'rgba(255,220,140,0.9)';
    for (const [hi, hj] of TOWN_HOUSES) {
      const [x, y] = project(grid, hi + HOUSE_SIZE / 2, hj + HOUSE_SIZE).map(Math.round) as Point;
      g.fillRect(x - 3, y - 6, 2, 2);
      g.fillRect(x + 2, y - 6, 2, 2);
    }
  }
  if (weather.lights) {
    // Luzes de Natal: fios de lâmpadas coloridas ao longo dos beirais das casas e do pavilhão, a piscar à vez.
    const colors = ['#ff4d3a', '#3bd05a', '#ffd23b', '#3b8bff'];
    const string = (i0: number, j0: number, i1: number, j1: number, k: number, count: number, phase: number): void => {
      for (let n = 0; n <= count; n++) {
        const t = n / count;
        const [x, y] = project(grid, i0 + (i1 - i0) * t, j0 + (j1 - j0) * t, k).map(Math.round) as Point;
        const lit = Math.floor(now / 450 + n + phase) % 4 !== 0;
        g.fillStyle = lit ? colors[(n + phase) % 4]! : '#4a4a5a';
        g.fillRect(x, y, 2, 2);
      }
    };
    TOWN_HOUSES.forEach(([hi, hj], n) => {
      const a = HOUSE_SIZE + 0.2;
      string(hi + a - 0.1, hj - 0.1, hi + a - 0.1, hj + a - 0.1, 1, 6, n);
      string(hi - 0.1, hj + a - 0.1, hi + a - 0.1, hj + a - 0.1, 1, 6, n + 2);
    });
    const h = arenaHeight(division);
    string(PAVILION.i + PAVILION.a, PAVILION.j, PAVILION.i + PAVILION.a, PAVILION.j + PAVILION.b, h, 24, 1);
    string(PAVILION.i, PAVILION.j + PAVILION.b, PAVILION.i + PAVILION.a, PAVILION.j + PAVILION.b, h, 24, 3);
  }
  if (weather.snow) {
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (let n = 0; n < 60; n++) {
      const x = ((n * 97) % width + Math.sin(now / 900 + n) * 6 + width) % width;
      const y = ((n * 61) % height + (now / 1000) * 22 + n * 3) % height;
      g.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  }
}
