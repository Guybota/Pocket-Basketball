import { fillPolygon, pixelLine } from './court.ts';
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
// Até onde o mapa vai, em ladrilhos, medido na diagonal.
const MAP_DEPTH = 76;

type Pixels = CanvasRenderingContext2D;
type Point = [number, number];

interface Grid {
  th: number;
  tw: number;
  ox: number;
  oy: number;
}

/** Os ladrilhos crescem com a janela até um limite, e o mapa fica centrado na altura que sobra. */
function gridFor(width: number, height: number): Grid {
  const th = Math.max(4, Math.min(6, Math.floor((height - 30) / MAP_DEPTH)));
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

function buildTown(width: number, height: number, division: number): Town {
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
  /** Telhado de quatro águas: só se veem as duas da frente. */
  const hipRoof = (i: number, j: number, a: number, b: number, k: number, rise: number, left: string, right: string): Point => {
    const apex = P(i + a / 2, j + b / 2, k + rise);
    poly([P(i, j + b, k), P(i + a, j + b, k), apex], left);
    poly([P(i + a, j, k), P(i + a, j + b, k), apex], right);
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
      // No telhado, o campo: é assim que se reconhece de longe.
      flat(i + 1.1, j + 1.1, a - 2.2, b - 2.2, '#a44b22', h);
      flat(i + 1.4, j + 1.4, a - 2.8, b - 2.8, '#dca35c', h);
      const inner = a - 2.8;
      const c = i + a / 2;
      const m = j + b / 2;
      line(P(c, j + 1.4, h), P(c, j + 1.4 + inner, h), WHITE);
      disc(c, m, 0.9, '#17737a', h);
      flat(i + 1.4, m - 0.9, 1.5, 1.8, '#17737a', h);
      flat(i + 1.4 + inner - 1.5, m - 0.9, 1.5, 1.8, '#17737a', h);
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
  ([[22, 8], [25.5, 9.5], [23, 4], [27, 5.5], [31, 11], [34, 14], [31, 15.5], [22, 21.5], [25, 22.5], [22, 25], [25, 25.5], [31, 2], [7, 22], [9, 25], [14, 31], [17, 33.5], [12, 34.5]] as const).forEach(([i, j], n) => {
    add(i + j + 2.2, () => house(i, j, n));
  });
  // Árvores à volta, e bosque onde o mapa acaba.
  ([[3, 4], [18, 3], [4, 18], [17.6, 12], [7, 18], [17.8, 17.8], [27, 12], [27, 16], [21, 19 + 2], [27, 20.5], [20.8, 28], [27, 27.5], [18, 28], [11, 28], [18, 30.5], [26.5, 33], [26, 36], [21, 36.5], [29.5, 31], [29.5, 36], [39, 34], [39, 37], [36, 22], [31, 27.5], [33.5, 19]] as const).forEach(([i, j], n) => {
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

let cached: { key: string; town: Town } | null = null;

/** O chão só se refaz quando muda o tamanho ou a divisão. Os edifícios e as árvores desenham-se por ordem de profundidade, misturados com os jogadores, para eles poderem passar por trás. */
export function drawTown(g: Pixels, width: number, height: number, division: number, walkers: readonly Look[], now: number): void {
  const key = `${width}x${height}x${division}`;
  if (cached?.key !== key) cached = { key, town: buildTown(width, height, division) };
  const { town } = cached;
  g.drawImage(town.ground, 0, 0);
  town.target(g);
  const grid = gridFor(width, height);
  // Um percurso só um pouco maior do que a janela, para os bonecos estarem quase sempre à vista.
  const span = Math.ceil(width / grid.tw) + 8;
  const placed = walkers.slice(0, 4).map((look, n) => {
    const travelled = (now / 1000 * WALK_TILES_PER_SECOND + n * 13) % span - span / 2;
    const forward = n % 2 === 0;
    const along = PLAZA + (forward ? travelled : -travelled);
    const onRoadJ = n < 2;
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
}
