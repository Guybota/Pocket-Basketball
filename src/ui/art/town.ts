import { fillPolygon, pixelLine } from './court.ts';
import { drawBall, drawShadow, drawSprite, INK, type Look, type PoseName } from './sprites.ts';

// A cidade do estudo visual: um mapa isométrico em que cada edifício é uma função.
const GROUND = ['#1a7f77', '#17737a'];
const ROAD = '#d9c79a';
const YARD = '#c9b482';
const TARMAC = '#6d7a86';
const WALK_FRAMES: readonly PoseName[] = ['run0', 'run1', 'run2', 'run1'];
const WALK_FRAME_MS = 170;
const WALK_TILES_PER_SECOND = 1.1;
const ROAD_J = 18.2;
const ROAD_I = 20.8;

type Pixels = CanvasRenderingContext2D;
type Point = [number, number];

interface Grid {
  th: number;
  tw: number;
  ox: number;
  oy: number;
}

/** O mapa tem de caber na altura, por isso os ladrilhos encolhem em janelas mais baixas. */
function gridFor(width: number, height: number): Grid {
  const th = height >= 560 ? 6 : height >= 430 ? 5 : 4;
  return { th, tw: th * 2, ox: Math.round(width / 2), oy: th === 6 ? 40 : 28 };
}

const project = ({ tw, th, ox, oy }: Grid, i: number, j: number, k = 0): Point => [ox + (i - j) * tw, oy + (i + j) * th - k * th * 2];

/** O pavilhão vai ficando mais alto à medida que o clube sobe de divisão. */
const arenaHeight = (division: number): number => 3.2 + division * 0.5;

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
  const plot = (i: number, j: number, a: number, b: number, color: string): void => poly([P(i, j), P(i + a, j), P(i + a, j + b), P(i, j + b)], color);
  const prism = (i: number, j: number, a: number, b: number, h: number, top: string, left: string, right: string): void => {
    poly([P(i, j + b), P(i + a, j + b), P(i + a, j + b, h), P(i, j + b, h)], left);
    poly([P(i + a, j), P(i + a, j + b), P(i + a, j + b, h), P(i + a, j, h)], right);
    poly([P(i, j, h), P(i + a, j, h), P(i + a, j + b, h), P(i, j + b, h)], top);
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
  const windows = (i: number, j: number, a: number, h: number, color: string): void => {
    g.fillStyle = color;
    for (let k = 0.5; k < h - 0.3; k += 0.8) {
      for (let u = 0.3; u < a - 0.2; u += 0.8) {
        const [x, y] = P(i + u, j, k).map(Math.round) as Point;
        g.fillRect(x, y, 3, 3);
      }
    }
  };

  // O chão aos quadrados vai até onde a janela chegar.
  const reach = Math.ceil((width + height) / grid.th / 2) + 8;
  for (let i = -reach; i < reach; i++) {
    for (let j = -reach; j < reach; j++) {
      const a = P(i, j);
      const c = P(i + 1, j + 1);
      const b = P(i + 1, j);
      const d = P(i, j + 1);
      if (a[1] > height + 2 || c[1] < -2 || b[0] < -2 || d[0] > width + 2) continue;
      poly([a, b, c, d], GROUND[Math.abs(i + j) % 2]!);
    }
  }
  // As estradas saem do mapa em todas as direções.
  plot(-reach, 17.5, reach * 2, 1.5, ROAD);
  plot(-reach, 30, reach * 2, 1.5, ROAD);
  plot(20, -reach, 1.5, reach * 2, ROAD);
  plot(30.5, -reach, 1.5, reach * 2, ROAD);

  const operations: [number, () => void][] = [];
  const add = (depth: number, draw: () => void): void => {
    operations.push([depth, draw]);
  };

  // Pavilhão
  const arena = arenaHeight(division);
  plot(4, 4, 11, 11, YARD);
  add(19.5, () => {
    prism(5, 5, 9, 9, arena, '#e8622a', '#c9622f', '#a44b22');
    poly([P(6.5, 6.5, arena), P(12.5, 6.5, arena), P(12.5, 12.5, arena), P(6.5, 12.5, arena)], '#dca35c');
    poly([P(6.5, 8.3, arena), P(8.5, 8.3, arena), P(8.5, 10.7, arena), P(6.5, 10.7, arena)], '#17737a');
    poly([P(10.5, 8.3, arena), P(12.5, 8.3, arena), P(12.5, 10.7, arena), P(10.5, 10.7, arena)], '#17737a');
    const a = P(9.5, 6.5, arena);
    const b = P(9.5, 12.5, arena);
    pixelLine(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), '#f8f0d8');
  });
  // Escritório
  plot(22, 11, 6, 6, YARD);
  add(39, () => {
    prism(23, 12, 4, 4, 5, '#f4efe0', '#c4c9d4', '#8f97ab');
    windows(23, 16, 4, 5, '#2d6fa8');
    const [x, y] = P(25, 14, 5.6).map(Math.round) as Point;
    drawBall(g, x, y);
  });
  // Treino
  plot(11, 20, 8, 8, YARD);
  poly([P(12, 21), P(18, 21), P(18, 27), P(12, 27)], TARMAC);
  poly([P(13, 22), P(17, 22), P(17, 26), P(13, 26)], '#dca35c');
  add(35, () => {
    prism(11.5, 20.2, 2, 1.2, 1.2, '#cf4436', '#efe3c2', '#d0c096');
    const a = P(15, 22);
    const b = P(15, 26);
    pixelLine(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), '#f8f0d8');
  });
  // Federação
  plot(32.5, 23, 7, 6.5, YARD);
  add(62, () => {
    prism(33.5, 24, 5, 5, 0.5, '#f4efe0', '#c4bea6', '#a39d84');
    prism(34, 24.5, 4, 4, 2.4, '#d9d3bf', '#b0a98e', '#918a6f');
    windows(34, 28.5, 4, 2.2, '#efe3c2');
    poly([P(33.5, 24, 3), P(38.5, 24, 3), P(38.5, 29, 3), P(33.5, 29, 3)], '#e8622a');
  });
  // Torre do relógio
  plot(23.5, 32, 5, 5, YARD);
  add(60.5, () => {
    prism(25, 33.5, 2, 2, 6.5, '#f8f0d8', '#dad3bc', '#b6ae93');
    poly([P(25, 33.5, 6.5), P(27, 33.5, 6.5), P(27, 35.5, 6.5), P(25, 35.5, 6.5)], '#cf4436');
    const [x, y] = P(26, 35.5, 5).map(Math.round) as Point;
    g.fillStyle = INK;
    g.fillRect(x - 6, y - 5, 11, 11);
    g.fillStyle = '#f2c230';
    g.fillRect(x - 5, y - 4, 9, 9);
    g.fillStyle = INK;
    g.fillRect(x - 1, y - 3, 1, 4);
    g.fillRect(x - 1, y, 3, 1);
  });
  // Aeroporto
  plot(34, 33, 9, 9, TARMAC);
  poly([P(34, 40), P(43, 40), P(43, 41.5), P(34, 41.5)], '#4b5564');
  add(73, () => {
    prism(35, 34.5, 4, 3, 1.4, '#f4efe0', '#c4c9d4', '#8f97ab');
    prism(40, 34.5, 1.2, 1.2, 4.6, '#2d6fa8', '#dfe2ea', '#a9aebc');
  });
  // Casas e árvores nos espaços livres
  ([[1, 8], [2, 13], [17, 2], [23, 4], [27, 6], [2, 22], [7, 24], [23, 20], [26, 23], [22, 25], [3, 34], [14, 33], [17, 37], [34, 11], [37, 15], [34, 16], [11, 34], [8, 38]] as const).forEach(([i, j], n) => {
    const color = ['#efe3c2', '#e6d7ad', '#f4ebd0'][n % 3]!;
    add(i + j + 3, () => prism(i, j, 2.4, 2.4, 1.2, n % 4 === 3 ? '#b55d3a' : '#c9622f', color, '#b8a981'));
  });
  ([[16, 9], [17, 13], [1, 3], [8, 16.6], [12, 15], [16, 16.5], [28, 16.5], [23, 28], [27, 28], [17, 29], [30, 27], [30, 22], [25, 39], [22, 42], [31, 33], [33, 44], [40, 28], [42, 24], [11, 42], [15, 43]] as const).forEach(([i, j], n) => add(i + j, () => tree(i, j, n % 2 === 1)));
  // Numa janela larga, o mapa continua em arvoredo para os lados.
  for (let i = -reach; i < reach; i += 3) {
    for (let j = -reach; j < reach; j += 3) {
      if (i >= -2 && i <= 46 && j >= -2 && j <= 46) continue;
      if ((i >= 18 && i <= 22) || (i >= 29 && i <= 33) || (j >= 16 && j <= 20) || (j >= 29 && j <= 32)) continue;
      if (((i * 7 + j * 13) & 3) === 0) add(i + j, () => tree(i, j, ((i + j) & 4) === 0));
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

/** Onde fica a etiqueta de cada edifício, em frações da janela, para as etiquetas tocáveis ficarem por cima dele. */
export function townPlaces(width: number, height: number, division: number): Record<TownPlace, { x: number; y: number }> {
  const grid = gridFor(width, height);
  const at = (i: number, j: number, k: number): { x: number; y: number } => {
    const [x, y] = project(grid, i, j, k);
    return { x: x / width, y: y / height };
  };
  return {
    arena: at(9.5, 9.5, arenaHeight(division)),
    office: at(25, 14, 6.4),
    training: at(15, 24, 1.2),
    federation: at(36, 26.5, 3),
    tower: at(26, 34.5, 6.5),
    airport: at(40.6, 35, 4.6),
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
    const along = 20 + (forward ? travelled : -travelled);
    const onRoadJ = n < 2;
    const i = onRoadJ ? along : ROAD_I + n * 0.2;
    const j = onRoadJ ? ROAD_J + n * 0.4 : along;
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
