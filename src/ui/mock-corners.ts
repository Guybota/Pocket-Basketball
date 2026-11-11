// Maqueta: cinco maneiras de fechar os cantos da bancada da arena, para escolher antes de mexer no jogo. Não entra no jogo.
import { SCENES, type SceneDef } from './mock-scenes.ts';
import { shade, stand, type CamSpec, type Rgb, type Scene, type Stand, type V3 } from './mock-scenes-engine.ts';

const ARENA = SCENES.find(def => def.id === 'anel')!;
const SEAT: Rgb = [40, 62, 140];
const BASE = 1.2;
const ROWS = 6;
// As filas com a altura das do jogo: uma fila de público por degrau.
const LOWER: Omit<Stand, 'axis' | 'from' | 'to' | 'front' | 'out'> = {
  rows: ROWS, depth: 1.04, rise: 1.3, base: BASE, seat: SEAT, seat2: shade(SEAT, 0.9), riser: [26, 30, 52], aisle: [96, 100, 118], fill: 0.9, fade: 0.45, shirts: ['#2b5fd9', '#2b5fd9', '#f4efe0'],
};
const TOP = BASE + ROWS * 1.3;
const SIDE_Y = -11;
const END_X0 = -4;
const END_X1 = 32;

const GAME: CamSpec = { w: 480, h: 270, pos: [13.02, 11.8, 11], target: [8, -1.1, 0], focal: 290 };
const CORNER: CamSpec = { w: 720, h: 400, pos: [7, 5, 10], target: [-3, -9.5, 3], focal: 330 };
const HIGH: CamSpec = { w: 720, h: 440, pos: [14, 22, 24], target: [14, -4, 1], focal: 300 };
const VIEWS = [
  { label: 'Jogo', spec: GAME },
  { label: 'Canto de perto', spec: CORNER },
  { label: 'Alto', spec: HIGH },
] as const;

/** O muro de 1,2 m à frente da bancada, numa reta entre dois pontos do chão. */
function wall(s: Scene, a: readonly [number, number], b: readonly [number, number], color: Rgb = [18, 20, 32]): void {
  s.poly([[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], BASE], [a[0], a[1], BASE]], color);
  s.poly([[a[0], a[1], BASE - 0.12], [b[0], b[1], BASE - 0.12], [b[0], b[1], BASE], [a[0], a[1], BASE]], [150, 150, 156], 0.01);
}

const side = (from: number, to: number, grow = 0): Stand => ({ ...LOWER, axis: 'x', from, to, front: SIDE_Y, out: -1, aisleEvery: 7, grow });
const end = (front: number, out: 1 | -1, from: number, grow = 0): Stand => ({ ...LOWER, axis: 'y', from, to: 9, front, out, grow });

/** Uma bancada reta entre dois pontos da frente, a subir para fora (o lado de lá da reta, visto do campo). */
function segment(p0: readonly [number, number], p1: readonly [number, number], grow: number, extra: Partial<Stand> = {}): Stand {
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  const u: [number, number] = [dx / len, dy / len];
  // A normal que se afasta do meio do campo.
  let n: [number, number] = [u[1], -u[0]];
  const mid = [(p0[0] + p1[0]) / 2 - 14, (p0[1] + p1[1]) / 2];
  if (n[0] * mid[0]! + n[1] * mid[1]! < 0) n = [-n[0], -n[1]];
  return { ...LOWER, axis: 'x', from: 0, to: len, front: 0, out: 1, basis: { o: p0, u, n }, grow, ...extra };
}

function corners(name: string, title: string, note: string, build: string, dress: (s: Scene) => void): SceneDef {
  return {
    ...ARENA,
    id: `canto-${name}`,
    title,
    division: 'Cantos da bancada',
    build,
    note,
    views: VIEWS,
    dress: s => {
      dress(s);
      s.box(11.5, 16.5, -10.2, -9.4, 0, 0.8, [26, 26, 34], [60, 60, 70]);
    },
  };
}

// 1. Hoje: as duas bancadas dobram-se no canto num vinco a 45°, com a escada em cima da dobra.
const today = corners('hoje', 'Hoje: vinco', 'Como está no jogo: a bancada lateral e a do topo encontram-se numa dobra em V, com a escada do canto em cima da dobra.', 'as duas bancadas cortadas a 45° até se tocarem', s => {
  stand(s, side(END_X0, END_X1, 1), 1);
  stand(s, end(END_X0, -1, SIDE_Y, 1), 2);
  stand(s, end(END_X1, 1, SIDE_Y, 1), 3);
  wall(s, [END_X0, SIDE_Y], [END_X1, SIDE_Y]);
  wall(s, [END_X0, SIDE_Y], [END_X0, 9]);
  wall(s, [END_X1, SIDE_Y], [END_X1, 9]);
});

// 2. Aberto: as bancadas param antes do canto, que fecha com um bloco de betão, o túnel e a escada (como nos estádios do Calciobit).
const open = corners('aberto', 'Canto aberto', 'As bancadas param antes do canto e cada uma fecha com uma parede lisa. No canto fica um bloco de betão com a boca do túnel e uma escada por cima: as duas bancadas nunca se tocam.', 'bancadas retas que param antes do canto, e um bloco no canto', s => {
  stand(s, side(0, 28), 1);
  stand(s, end(END_X0, -1, -7), 2);
  stand(s, end(END_X1, 1, -7), 3);
  wall(s, [0, SIDE_Y], [28, SIDE_Y]);
  wall(s, [END_X0, -7], [END_X0, 9]);
  wall(s, [END_X1, -7], [END_X1, 9]);
  const depth = ROWS * 1.04;
  for (const [x0, x1, sx] of [[END_X0 - depth, 0, 0], [28, END_X1 + depth, 28]] as const) {
    // As paredes que fecham as pontas das bancadas.
    s.box(sx - 0.25, sx, SIDE_Y - depth, SIDE_Y, 0, TOP, [70, 74, 90]);
    s.box(x0, x1, -7.25, -7, 0, TOP, [70, 74, 90]);
    // O bloco do canto: betão até meia altura, a boca do túnel e a escada.
    s.box(x0, x1, SIDE_Y - depth, -7.25, 0, 3, [96, 100, 112], [120, 124, 136]);
    const mx = x0 < 0 ? x1 - 0.01 : x0 + 0.01;
    s.poly([[mx, -9.8, 0], [mx, -8, 0], [mx, -8, 2.4], [mx, -9.8, 2.4]], [10, 10, 16], 0.02, [mx, -9, 1]);
    for (let k = 0; k < 6; k++) s.box(x0 + 0.6, x1 - 0.6, SIDE_Y - 1.6 - k * 0.7, SIDE_Y - 1.6 - (k + 1) * 0.7, 3, 3 + (k + 1) * 0.5, [120, 124, 136]);
  }
});

// 3. Chanfro: um terceiro bloco de bancada a 45° no canto, e as filas alargam ao subir (como em muitas arenas da NBA).
const T22 = Math.tan(Math.PI / 8);
const chamfer = corners('chanfro', 'Canto em chanfro', 'Um terceiro bloco de bancada, a 45°, fecha o canto. As filas das três bancadas alargam ao subir e encontram-se sem dobra, como nas arenas da NBA e na de Belgrado.', 'três bancadas retas: lateral, diagonal e topo', s => {
  stand(s, side(0, 28, T22), 1);
  stand(s, end(END_X0, -1, -7, T22), 2);
  stand(s, end(END_X1, 1, -7, T22), 3);
  stand(s, segment([0, SIDE_Y], [END_X0, -7], T22), 4);
  stand(s, segment([28, SIDE_Y], [END_X1, -7], T22), 5);
  wall(s, [0, SIDE_Y], [28, SIDE_Y]);
  wall(s, [END_X0, -7], [END_X0, 9]);
  wall(s, [END_X1, -7], [END_X1, 9]);
  wall(s, [0, SIDE_Y], [END_X0, -7]);
  wall(s, [28, SIDE_Y], [END_X1, -7]);
});

// 4. Curvo: três segmentos de 30° dão a volta ao canto, e as filas seguem a curva (como no OAKA).
const T15 = Math.tan(Math.PI / 12);
const arc = (cx: number, cy: number, from: number, to: number): [number, number][] => Array.from({ length: 4 }, (_, i) => {
  const a = ((from + ((to - from) * i) / 3) * Math.PI) / 180;
  return [cx + Math.cos(a) * 4, cy + Math.sin(a) * 4];
});
const round = corners('curvo', 'Canto curvo', 'A bancada dá a volta ao canto em curva, em três segmentos, e as filas seguem-na sem dobras: um anel contínuo, como no OAKA de Atenas.', 'a lateral, o topo e três segmentos curtos em arco entre eles', s => {
  stand(s, side(0, 28, T15), 1);
  stand(s, end(END_X0, -1, -7, T15), 2);
  stand(s, end(END_X1, 1, -7, T15), 3);
  wall(s, [0, SIDE_Y], [28, SIDE_Y]);
  wall(s, [END_X0, -7], [END_X0, 9]);
  wall(s, [END_X1, -7], [END_X1, 9]);
  for (const pts of [arc(0, -7, 270, 180), arc(28, -7, 270, 360)]) {
    for (let i = 0; i < 3; i++) {
      stand(s, segment(pts[i]!, pts[i + 1]!, T15), 10 + i + (pts[0]![0] > 14 ? 3 : 0));
      wall(s, pts[i]!, pts[i + 1]!);
    }
  }
});

// 5. Chanfro com túnel: o bloco diagonal começa mais acima e por baixo dele abre-se a boca do túnel (vomitório).
const vomitory = corners('tunel', 'Chanfro com túnel', 'O canto em diagonal, mas as duas primeiras filas dão lugar à boca de um túnel, como os vomitórios das arenas a sério: é por ali que as equipas entram e saem.', 'como o chanfro, com o bloco diagonal mais alto e um túnel por baixo', s => {
  stand(s, side(0, 28, T22), 1);
  stand(s, end(END_X0, -1, -7, T22), 2);
  stand(s, end(END_X1, 1, -7, T22), 3);
  wall(s, [0, SIDE_Y], [28, SIDE_Y]);
  wall(s, [END_X0, -7], [END_X0, 9]);
  wall(s, [END_X1, -7], [END_X1, 9]);
  for (const [p0, p1, salt] of [[[0, SIDE_Y], [END_X0, -7], 4], [[28, SIDE_Y], [END_X1, -7], 5]] as const) {
    const st = segment(p0, p1, T22, { rows: ROWS - 2, base: BASE + 2 * 1.3 });
    // A frente do bloco recua duas filas, para assentar por cima do túnel.
    const b = st.basis!;
    const o: [number, number] = [b.o[0] + b.n[0] * 2.08, b.o[1] + b.n[1] * 2.08];
    stand(s, { ...st, from: -2.08 * T22, to: 5.657 + 2.08 * T22, basis: { ...b, o } }, salt);
    const q = (along: number, across: number, z: number): V3 => [b.o[0] + b.u[0] * along + b.n[0] * across, b.o[1] + b.u[1] * along + b.n[1] * across, z];
    // A boca do túnel, com moldura, e o lintel de betão por cima.
    s.poly([q(0.6, 0.02, 0), q(5.05, 0.02, 0), q(5.05, 0.02, 3.6), q(0.6, 0.02, 3.6)], [96, 100, 112], 0, q(2.8, 0.1, 1));
    s.poly([q(1.3, 0.01, 0), q(4.35, 0.01, 0), q(4.35, 0.01, 2.8), q(1.3, 0.01, 2.8)], [10, 10, 16], 0.02, q(2.8, 0.1, 1));
    s.poly([q(0, 2.08, BASE + 2.6), q(5.657, 2.08, BASE + 2.6), q(5.657, 0, 3.6), q(0, 0, 3.6)], [120, 124, 136], -0.5);
  }
});

export const CORNERS: readonly SceneDef[] = [today, open, chamfer, round, vomitory];
