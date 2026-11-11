// Maqueta: seis cenários construídos de raiz, cada um de maneira diferente. Não entra no jogo.
import { add, courtLines, hash, hoop, fan, look, frac, mix, overlaps, paintGround, players, shade, stand, zone, Cam, Scene, type CamSpec, type Rgb, type V3 } from './mock-scenes-engine.ts';

export interface SceneDef {
  id: string;
  title: string;
  division: string;
  build: string;
  note: string;
  views: readonly { label: string; spec: CamSpec }[];
  floor: (x: number, y: number, dist: number) => Rgb;
  sky: (up: number, sx: number, sy: number, w: number) => Rgb;
  lines: string;
  dress: (s: Scene) => void;
}

/** A câmara do jogo, e a da demonstração do título (o mesmo sítio, apontada ao meio-campo, num ecrã grande). */
const GAME: CamSpec = { w: 480, h: 270, pos: [13.02, 11.8, 11], target: [8, -1.1, 0], focal: 290 };
const DEMO: CamSpec = { w: 720, h: 480, pos: [14, 11.8, 11], target: [14, -1.1, 0], focal: 290 };
/** De perto, de frente para os bancos e a mesa, para ver quem está sentado. */
const BENCH: CamSpec = { w: 720, h: 300, pos: [14, 3, 4.2], target: [14, -9.9, 0.7], focal: 330 };
const WIDE: CamSpec = { w: 720, h: 440, pos: [14, 27, 17], target: [14, -4, 1], focal: 330 };

const planks = (x: number, y: number, light: number, warm: Rgb, spread = 16): Rgb => {
  const row = Math.floor(y / 0.5);
  const p = hash(row, Math.floor((x + hash(row, 3) * 4) / 3)) - 0.5;
  const c = add(warm, p * spread);
  return frac(y / 0.5) < 0.06 ? shade(c, 0.9 * light) : shade(c, light);
};

/** Janelas numa fachada virada para +y (para a câmara), umas acesas e outras não. */
function windows(s: Scene, x0: number, x1: number, y: number, z0: number, z1: number, lit: Rgb, dark: Rgb, chance: number, salt: number, cw = 1.2, ch = 1.5): void {
  for (let x = x0 + 0.5; x + 0.7 < x1; x += cw * 1.6) {
    for (let z = z0 + 0.6; z + ch * 0.6 < z1; z += ch * 1.4) {
      const on = hash(Math.floor(x * 10), Math.floor(z * 10) + salt) < chance;
      s.poly([[x, y, z], [x + cw, y, z], [x + cw, y, z + ch * 0.7], [x, y, z + ch * 0.7]], on ? lit : dark, 0.01, [x, y, z]);
    }
  }
}

/** Uma fiada de lâmpadas pendurada entre dois pontos, a cair a meio. */
function stringLights(s: Scene, a: V3, b: V3, sag: number, bulb: string): void {
  const n = 24;
  let prev: V3 = a;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const p: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)];
    s.line(prev, p, '#2a2420');
    const q = s.cam.project(p);
    if (q && i < n) s.overlay(q[2] - 0.01, g => {
      g.fillStyle = bulb;
      g.fillRect((q[0] | 0) - 1, q[1] | 0, 2, 2);
    });
    prev = p;
  }
}

/** Uma árvore de blocos: tronco e duas copas em prisma. */
function tree(s: Scene, x: number, y: number, h: number, leaf: Rgb): void {
  s.box(x - 0.18, x + 0.18, y - 0.18, y + 0.18, 0, h * 0.45, [110, 76, 50]);
  s.prism(x, y, h * 0.36, h * 0.35, h * 0.75, 8, leaf, add(leaf, 22), h * 0.3);
  s.prism(x, y, h * 0.26, h * 0.75, h, 8, add(leaf, 10), add(leaf, 30), h * 0.12);
}

/** Uma vedação de rede: postes e a malha translúcida. */
function fence(s: Scene, x0: number, y0: number, x1: number, y1: number, h: number): void {
  const len = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
  const posts = Math.max(1, Math.round(len / 3));
  for (let i = 0; i <= posts; i++) {
    const t = i / posts;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    s.box(x - 0.05, x + 0.05, y - 0.05, y + 0.05, 0, h, [110, 116, 124]);
  }
  s.poly([[x0, y0, 0], [x1, y1, 0], [x1, y1, h], [x0, y0, h]], 'rgba(150,160,170,0.28)');
  s.line([x0, y0, h], [x1, y1, h], '#7a828c');
}

/**
 * Os bancos das duas equipas, sempre do lado de lá do campo, de cada lado do meio-campo: cadeiras com costas,
 * suplentes sentados e o treinador de pé no espaço livre entre o banco e a linha do meio.
 */
function benches(s: Scene, seat: Rgb, back: Rgb): void {
  const before = s.tag;
  // A 2,1 m da linha lateral, com o treinador a 1,5 m: espaço para andar entre o banco e o campo.
  const y = -9.9;
  for (const [x0, x1, kit, salt] of [[3.6, 9.4, 'blue', 60], [18.6, 24.4, 'cream', 80]] as const) {
    s.tag = 'banco';
    s.box(x0, x1, y - 0.3, y + 0.3, 0, 0.45, seat, add(seat, 18));
    s.box(x0, x1, y - 0.3, y - 0.2, 0.45, 1.05, back);
    // Um lugar sim, um não: quatro suplentes e o adjunto.
    for (let k = 0; k < 5; k++) {
      const x = x0 + 0.6 + k * 1.15;
      // Ordenado pela frente do assento, para ficar por cima dele e das costas.
      s.tag = 'suplente';
      s.sprite([x, y, 0.45], 'sit', look(salt + k, k === 4 ? 'coach' : kit), false, false, false, 0.01, [x, y + 0.31, 0.2]);
    }
    const cx = x1 < 14 ? x1 + 1.2 : x0 - 1.2;
    s.tag = 'treinador';
    s.sprite([cx, y + 0.9, 0], 'idle', { ...look(salt + 9, 'suit'), build: 'athletic' }, x1 > 14);
  }
  s.tag = before;
}

/** A boca de um túnel: duas paredes, o teto e o escuro lá dentro. */
function tunnel(s: Scene, x0: number, x1: number, y0: number, y1: number, h: number, wall: Rgb): void {
  s.box(x0 - 0.4, x0, y0, y1, 0, h, wall);
  s.box(x1, x1 + 0.4, y0, y1, 0, h, wall);
  s.box(x0 - 0.4, x1 + 0.4, y0, y1, h, h + 0.5, wall);
  const mouth = Math.abs(y0) < Math.abs(y1) ? y0 : y1;
  s.poly([[x0, mouth, 0], [x1, mouth, 0], [x1, mouth, h], [x0, mouth, h]], [14, 14, 20], 0, [(x0 + x1) / 2, mouth + (mouth < 0 ? -0.5 : 0.5), 1]);
}

/* ---------- 1. Telhado ao pôr do sol ---------- */

const rooftop: SceneDef = {
  id: 'telhado',
  title: 'Telhado',
  division: 'Liga Iniciados · rua',
  build: 'Volumes num telhado, com a cidade em blocos à volta',
  note: 'Um campo pintado no telhado de um prédio: parapeito, depósito de água, a casa das escadas, lâmpadas penduradas por cima do campo e a cidade a acender as luzes ao pôr do sol.',
  views: [
    { label: 'Jogo', spec: GAME },
    { label: 'Demonstração', spec: DEMO },
    { label: 'Larga', spec: WIDE },
    { label: 'Bancos', spec: BENCH },
  ],
  floor: (x, y) => {
    const warm = (c: Rgb): Rgb => [c[0] * 1.08, c[1] * 0.97, c[2] * 0.86];
    if (x < -7 || x > 35 || y < -14 || y > 11) {
      // A rua lá em baixo: escura, com as luzes dos carros e das janelas.
      const lit = hash(Math.floor(x * 0.7), Math.floor(y * 0.7)) < 0.05;
      return lit ? [240, 196, 120] : [52, 44, 68];
    }
    const z = zone(x, y, 1.2);
    if (z === 'key' || z === 'centre') return warm([214, 104, 66]);
    if (z === 'court') return warm(add([56, 126, 116], hash(Math.floor(x * 2), Math.floor(y * 2)) * 4));
    if (z === 'apron') return warm([42, 92, 86]);
    return warm(add([98, 92, 98], hash(Math.floor(x * 3), Math.floor(y * 3)) * 10));
  },
  sky: (up, sx, sy, w) => {
    const sun = (sx - w * 0.7) ** 2 + ((up - 0.05) * 900) ** 2 < 20 * 20;
    if (sun) return [255, 226, 160];
    return up < 0.03 ? [250, 176, 106] : mix([246, 150, 100], [92, 66, 124], Math.min(1, (up - 0.03) / 0.35));
  },
  lines: '#f6efe0',
  dress: s => {
    const concrete: Rgb = [196, 178, 160];
    s.box(-7, 35, -14, -13.6, 0, 1, concrete, add(concrete, 16));
    s.box(-7, -6.6, -13.6, 11, 0, 1, concrete, add(concrete, 16));
    s.box(34.6, 35, -13.6, 11, 0, 1, concrete, add(concrete, 16));
    s.box(-7, 35, 10.6, 11, 0, 0.6, concrete, add(concrete, 16));
    // A casa das escadas, com porta.
    s.box(-6, -1.5, -13.4, -9.6, 0, 3.2, [200, 150, 118], [150, 138, 132]);
    s.poly([[-4.4, -9.59, 0], [-3, -9.59, 0], [-3, -9.59, 2.2], [-4.4, -9.59, 2.2]], '#3a2c2a', 0.01, [-3.7, -9.6, 1]);
    // O depósito de água de madeira, em pernas.
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) s.box(30.5 + dx - 0.08, 30.5 + dx + 0.08, -11 + dy - 0.08, -11 + dy + 0.08, 0, 3.3, [70, 60, 56]);
    s.prism(30.5, -11, 1.6, 3.3, 6.6, 12, [136, 92, 64], [110, 76, 54]);
    s.prism(30.5, -11, 1.7, 6.6, 7.6, 12, [96, 66, 50], [96, 66, 50], 0.05);
    // Máquinas de ar condicionado.
    for (const x of [20, 23]) s.box(x, x + 2.2, -13.4, -11.8, 0, 1.3, [206, 208, 210]);
    // Os prédios do outro lado da rua e a silhueta da cidade ao longe.
    const blocks: [number, number, number, number, number, Rgb][] = [
      [-30, -10, -44, -20, 16, [176, 110, 86]], [-8, 6, -38, -22, 8, [148, 136, 168]], [8, 20, -46, -24, 22, [196, 156, 120]],
      [22, 34, -36, -22, 5, [128, 118, 140]], [36, 56, -44, -20, 13, [170, 100, 80]], [-44, -30, -40, -24, 10, [150, 120, 120]], [60, 76, -40, -24, 12, [120, 110, 140]],
    ];
    blocks.forEach(([x0, x1, y0, y1, h, c], i) => {
      s.box(x0, x1, y0, y1, 0, h, c, shade(c, 0.8));
      windows(s, x0, x1, y1 + 0.01, 0, h, [255, 214, 140], shade(c, 0.6), 0.45, i);
    });
    for (let x = -80; x < 110; x += 9) {
      const h = 10 + hash(x, 9) * 34;
      s.box(x, x + 7 + hash(x, 2) * 4, -110, -96, 0, h, [92, 66, 116]);
    }
    fence(s, -4.5, -10, -4.5, 8, 3.4);
    fence(s, 32.5, -10, 32.5, 8, 3.4);
    // As lâmpadas, presas em dois postes de cada lado.
    for (const x of [-2.5, 30.5]) {
      s.box(x - 0.07, x + 0.07, -9.9, -9.7, 0, 4.4, [60, 54, 50]);
      s.box(x - 0.07, x + 0.07, 8.7, 8.9, 0, 4.4, [60, 54, 50]);
    }
    stringLights(s, [-2.5, -9.8, 4.4], [30.5, -9.8, 4.4], 0.8, '#ffe6a0');
    stringLights(s, [-2.5, 8.8, 4.4], [30.5, 8.8, 4.4], 0.8, '#ffe6a0');
    benches(s, [150, 104, 70], [120, 80, 54]);
    // Quem vê: sentado no parapeito, encostado à casa das escadas, em cima das máquinas.
    [[2, -13.8, 1], [3.1, -13.8, 1], [9, -13.8, 1], [15.5, -13.8, 1], [16.6, -13.8, 1], [26, -13.8, 1], [20.8, -12.6, 1.3], [23.9, -12.6, 1.3]].forEach(([x, y, z], i) => s.sprite([x!, y!, z!], 'sit', fan(i * 5 + 1, ['#e8622a', '#2ec4d6'])));
    [[-1, -9, 0], [-0.2, -8.4, 0], [33, 2, 0]].forEach(([x, y, z], i) => s.sprite([x!, y!, z!], 'idle', fan(i * 7 + 3, ['#e8622a'])));
  },
};

/* ---------- 2. Debaixo do viaduto ---------- */

const viaduct: SceneDef = {
  id: 'viaduto',
  title: 'Debaixo do Viaduto',
  division: 'Liga Iniciados · rua',
  build: 'Pilares e tabuleiro em volumes; a sombra do viaduto pintada no chão',
  note: 'Um campo de alcatrão meio coberto por uma autoestrada: pilares grafitados, a sombra do tabuleiro em cima do meio-campo do fundo, poças, e quem vê sentado nos separadores de betão.',
  views: [
    { label: 'Jogo', spec: GAME },
    { label: 'Demonstração', spec: DEMO },
    { label: 'Larga', spec: WIDE },
    { label: 'Bancos', spec: BENCH },
  ],
  floor: (x, y) => {
    const shadow = y < -4.6 ? 0.58 : y < -3.8 ? 0.78 : 1;
    const cx = Math.floor(x / 2.6);
    const cy = Math.floor(y / 1.8);
    const px = (x - (cx + 0.5) * 2.6) / 0.9;
    const py = (y - (cy + 0.5) * 1.8) / 0.38;
    if (hash(cx + 7, cy) > 0.93 && px * px + py * py < 0.6) return shade([150, 160, 172], shadow);
    const z = zone(x, y, 1.4);
    const n = hash(Math.floor(x * 1.5), Math.floor(y * 1.5)) * 8;
    let c: Rgb;
    if (z === 'key' || z === 'centre') c = [150, 84, 66];
    else if (z === 'court') c = [76, 96, 118];
    else if (z === 'apron') c = [66, 70, 76];
    else c = y > 11 ? [96, 124, 76] : [118, 116, 110];
    return shade(add(c, n), shadow);
  },
  sky: up => mix([196, 200, 204], [150, 160, 172], Math.min(1, up * 3)),
  lines: '#e6e2d4',
  dress: s => {
    const concrete: Rgb = [168, 164, 156];
    s.box(-60, 90, -17, -4.6, 7, 8.4, concrete, [120, 120, 118]);
    s.box(-60, 90, -5, -4.6, 8.4, 9.3, add(concrete, 10));
    for (let x = -58; x < 90; x += 8) s.box(x - 0.4, x + 0.4, -17, -4.6, 6.3, 7, shade(concrete, 0.9));
    // Pilares com grafitos virados para o campo.
    const tags = ['#e63b2e', '#f5c518', '#2ec4d6', '#e0388a', '#7ac74f'];
    for (const [i, x] of [-8, 4, 16, 28, 40].entries()) {
      for (const y of [-11.6, -16.4]) s.box(x - 0.8, x + 0.8, y - 0.8, y + 0.8, 0, 6.3, concrete);
      const c = tags[i % tags.length]!;
      s.poly([[x - 0.7, -10.79, 0.4], [x + 0.6, -10.79, 0.7], [x + 0.7, -10.79, 2.3], [x - 0.5, -10.79, 2]], c, 0.02, [x, -10.8, 1]);
      s.poly([[x - 0.4, -10.78, 1.1], [x + 0.3, -10.78, 1.2], [x + 0.2, -10.78, 1.7], [x - 0.3, -10.78, 1.6]], '#1b2230', 0.03, [x, -10.8, 1]);
    }
    // Carros no tabuleiro e a cidade atrás.
    ([[-20, [192, 48, 42]], [6, [42, 82, 190]], [30, [242, 194, 48]], [52, [230, 230, 230]]] as const).forEach(([x, c]) => s.box(x, x + 3.6, -12, -10.4, 8.4, 9.4, c));
    for (let x = -60; x < 100; x += 11) {
      const h = 9 + hash(x, 4) * 22;
      const c: Rgb = hash(x, 5) < 0.5 ? [140, 130, 126] : [118, 124, 138];
      s.box(x, x + 9, -46, -30, 0, h, c);
      windows(s, x, x + 9, -29.99, 0, h, [210, 214, 200], shade(c, 0.7), 0.3, x);
    }
    // Separadores de betão onde se senta quem vê.
    // Entre os pilares e fora de trás dos bancos, para o público não se misturar com os suplentes.
    for (const [x0, x1] of [[-6.6, -3.2], [10.6, 14]] as const) s.box(x0, x1, -12.2, -11.5, 0, 0.8, [190, 186, 176]);
    let n = 3;
    for (const x of [-6, -4.8, 11.2, 12.4, 13.4]) s.sprite([x, -11.85, 0.8], 'sit', fan(n++ * 3 + 1, ['#f5c518', '#e63b2e']), false, false, false, 0.01, [x, -11.5, 0.8]);
    for (const [x, y] of [[-5.6, -10.6], [1.8, -9.8], [26.4, -9.6]] as const) s.sprite([x, y, 0], 'idle', fan(n++ * 3 + 2, ['#2ec4d6']));
    fence(s, -4.2, -8, -4.2, 9, 3.6);
    fence(s, 32.2, -8, 32.2, 9, 3.6);
    // Os bancos do lado de lá; do lado de cá, o portão na rede, por onde se entra e sai.
    benches(s, [200, 196, 186], [170, 166, 156]);
    fence(s, -4.2, 10.6, 12.4, 10.6, 3.6);
    fence(s, 15.6, 10.6, 32.2, 10.6, 3.6);
    s.box(12.3, 12.5, 10.5, 10.7, 0, 3.8, [90, 96, 104]);
    s.box(15.5, 15.7, 10.5, 10.7, 0, 3.8, [90, 96, 104]);
  },
};

/* ---------- 3. Ginásio de treliça ---------- */

const gym: SceneDef = {
  id: 'ginasio',
  title: 'Ginásio de Treliça',
  division: 'Liga Avançada · escola',
  build: 'Uma sala por dentro: paredes, varanda, teto em arco, a parede da frente cortada',
  note: 'O ginásio da escola por dentro: janelões em arco com o sol a entrar às faixas, uma varanda corrida com gente encostada ao varão, espaldares, cordas, teto de madeira em arco e uma bancada de tábuas que se recolhe.',
  views: [
    { label: 'Jogo', spec: GAME },
    { label: 'Demonstração', spec: DEMO },
    { label: 'Larga', spec: WIDE },
    { label: 'Bancos', spec: BENCH },
  ],
  floor: (x, y) => {
    if (x < -6.6 || x > 34.6 || y < -12.6 || y > 11) return Math.floor((x + y) / 3) % 2 ? [150, 146, 136] : [140, 136, 128];
    const sun = y > -12 && y < -3 && frac((x - (y + 12) * 0.5) / 4.5) < 0.32 ? 1.14 : 1;
    const z = zone(x, y, 1.6);
    if (z === 'key' || z === 'centre') return shade([52, 84, 140], sun);
    return planks(x, y, sun * (z === 'out' || z === 'apron' ? 0.9 : 1), [214, 150, 84]);
  },
  sky: () => [236, 226, 200],
  lines: '#f8efd8',
  dress: s => {
    const wall: Rgb = [238, 228, 202];
    s.box(-6, 34, -12.6, -12, 0, 9.5, wall);
    s.box(-6.6, -6, -12.6, 11, 0, 9.5, shade(wall, 0.96));
    s.box(34, 34.6, -12.6, 11, 0, 9.5, shade(wall, 0.96));
    // Lambrim de madeira e janelões em arco, com caixilhos.
    s.poly([[-6, -11.99, 0], [34, -11.99, 0], [34, -11.99, 1.4], [-6, -11.99, 1.4]], [124, 78, 38], 0.01, [14, -12, 1]);
    for (let x = -3.5; x < 33; x += 4.5) {
      const arch: V3[] = [[x - 1.2, -11.98, 4.4], [x + 1.2, -11.98, 4.4]];
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI;
        arch.push([x + Math.cos(a) * 1.2, -11.98, 8 + Math.sin(a) * 0.8]);
      }
      s.poly([arch[0]!, arch[1]!, ...arch.slice(2)], [196, 228, 244], 0.02, [x, -12, 6]);
      s.line([x, -11.97, 4.4], [x, -11.97, 8.8], '#e8dcc0', 1, 0.03);
      for (const z of [5.6, 6.8]) s.line([x - 1.2, -11.97, z], [x + 1.2, -11.97, z], '#e8dcc0', 1, 0.03);
      // O sol a entrar: um prisma de luz da janela até ao chão.
      s.poly([[x - 1.2, -11.9, 8], [x + 1.2, -11.9, 8], [x + 1.2 + 4.5 * 0.5, -3, 0], [x - 1.2 + 4.5 * 0.5, -3, 0]], 'rgba(255,240,200,0.10)', 0, [x, -9, 3]);
    }
    // A varanda corrida, com o varão e gente encostada.
    s.box(-6, 34, -12, -10.2, 3, 3.3, [150, 100, 60]);
    for (let x = -6; x <= 34; x += 1.6) s.box(x - 0.04, x + 0.04, -10.3, -10.22, 3.3, 4.2, [90, 60, 40]);
    s.box(-6, 34, -10.32, -10.2, 4.1, 4.22, [110, 74, 48]);
    let n = 1;
    for (let x = -5; x < 33; x += 0.9) {
      // Atrás do varão: ordenados pela própria posição, para o varão lhes passar à frente.
      if (hash(n++, 31) < 0.5) s.sprite([x, -10.9, 3.3], hash(n, 2) < 0.6 ? 'idle' : 'cheer0', { ...fan(n, ['#2a52be', '#f4efe0']) }, false, false, false);
    }
    // Espaldares na parede da esquerda e cordas penduradas.
    for (let y = -11; y < -2; y += 0.5) s.box(-6, -5.9, y, y + 0.08, 0, 3.4, [170, 120, 70]);
    for (let z = 0.4; z < 3.4; z += 0.4) s.line([-5.9, -11, z], [-5.9, -2.5, z], '#a87040');
    for (const y of [3, 4.2]) s.line([-4, y, 12.2], [-4, y, 0.8], '#c8a878', 1);
    // O teto em arco: asnas e tábuas entre elas.
    const roof = (x: number, t: number): V3 => [x, -12 + t * 23, 9.5 + Math.sin(t * Math.PI) * 3.5];
    // Só a metade do fundo: a da frente ficava por cima da câmara e tapava a sala.
    for (let x = -6; x < 34; x += 5) {
      for (let i = 0; i < 5; i++) {
        const a = roof(x, i / 12);
        const b = roof(x, (i + 1) / 12);
        const c = roof(x + 5, (i + 1) / 12);
        const d = roof(x + 5, i / 12);
        s.poly([a, d, c, b], i % 2 ? [176, 128, 82] : [164, 118, 74]);
        s.line(a, b, '#5a3a22', 2, 0.05);
      }
    }
    // Candeeiros pendurados.
    for (let x = 2; x < 28; x += 6) {
      s.line([x, -1, 12.4], [x, -1, 8.6], '#3a2c22');
      s.prism(x, -1, 0.5, 8.2, 8.6, 6, [60, 60, 56], [255, 236, 180], 0.15);
    }
    // A bancada de tábuas, recolhível, no topo do lado direito.
    stand(s, { axis: 'y', from: -9, to: 8, front: 30.6, out: 1, rows: 4, depth: 0.8, rise: 0.45, seat: [52, 86, 134], riser: [40, 66, 104], fill: 0.45, shirts: ['#2a52be', '#f4efe0'] }, 3);
    // O marcador de abas.
    s.box(12, 16, -11.99, -11.8, 5.4, 7, [30, 64, 46]);
    s.label([14, -11.7, 6.2], 'CASA 12 08', '#f4efe0');
    // A porta dupla do balneário, por baixo da varanda.
    s.poly([[12.6, -11.98, 0], [15.4, -11.98, 0], [15.4, -11.98, 2.5], [12.6, -11.98, 2.5]], [92, 56, 30], 0.03, [14, -12, 1]);
    s.line([14, -11.97, 0], [14, -11.97, 2.5], '#3a2416', 1, 0.04);
    s.poly([[12.8, -11.97, 1.6], [15.2, -11.97, 1.6], [15.2, -11.97, 2.3], [12.8, -11.97, 2.3]], [196, 228, 244], 0.04, [14, -12, 1]);
    benches(s, [150, 100, 60], [110, 74, 48]);
  },
};

/* ---------- 4. Arena em anel ---------- */

const RED: Rgb = [176, 34, 44];
const bowl: SceneDef = {
  id: 'anel',
  title: 'Arena em Anel',
  division: 'Pro Liga 1 · arena',
  build: 'Bancadas em degraus dos quatro lados, camarotes, cubo de ecrãs e focos',
  note: 'Uma arena de verdade: bancadas em degraus a toda a volta, partidas por escadas, um anel de camarotes com LED, o anel de cima a perder-se no escuro, o cubo de ecrãs, os focos e as faixas dos títulos. A luz cai só no campo.',
  views: [
    { label: 'Jogo', spec: GAME },
    { label: 'Demonstração', spec: DEMO },
    { label: 'Alto', spec: { w: 720, h: 480, pos: [14, 30, 30], target: [14, -2, 0], focal: 330 } },
    { label: 'Bancos', spec: BENCH },
  ],
  floor: (x, y) => {
    const dx = (x - 14) / 17;
    const dy = y / 10;
    const light = 0.45 + 0.65 * Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
    const z = zone(x, y, 1.8);
    if (z === 'key' || z === 'centre') return shade(RED, light);
    if (z === 'apron') return shade([30, 26, 36], light);
    if (z === 'out') return [22, 20, 28];
    return planks(x, y, light, [222, 162, 96], 12);
  },
  sky: () => [10, 10, 16],
  lines: '#fbf4e4',
  dress: s => {
    const shirts = ['#b0222c', '#b0222c', '#f4efe0'];
    const lower = { rows: 12, depth: 0.85, rise: 0.42, seat: RED, seat2: shade(RED, 0.88), riser: [40, 26, 32] as Rgb, aisle: [120, 116, 120] as Rgb, aisleEvery: 6.5, fill: 0.92, fade: 0.55, shirts };
    stand(s, { ...lower, axis: 'x', from: -4, to: 32, front: -11.4, out: -1 }, 1);
    // Do lado da câmara, a bancada abre-se para o túnel dos balneários.
    stand(s, { ...lower, axis: 'x', from: -4, to: 11.6, front: 10.8, out: 1 }, 2);
    stand(s, { ...lower, axis: 'x', from: 16.4, to: 32, front: 10.8, out: 1 }, 6);
    tunnel(s, 12, 16, 10.8, 21, 2.6, [40, 26, 32]);
    stand(s, { ...lower, axis: 'y', from: -11.4, to: 10.8, front: -4, out: -1 }, 3);
    stand(s, { ...lower, axis: 'y', from: -11.4, to: 10.8, front: 32, out: 1 }, 4);
    // O anel dos camarotes, com a faixa de LED à frente.
    const top = 12 * 0.42;
    s.box(-15, 43, -23.8, -21.6, top, top + 1.6, [26, 24, 32]);
    windows(s, -14, 42, -21.59, top, top + 1.6, [255, 220, 150], [40, 38, 50], 0.6, 5, 1.4, 1);
    s.poly([[-15, -21.58, top + 1.6], [43, -21.58, top + 1.6], [43, -21.58, top + 2.1], [-15, -21.58, top + 2.1]], RED, 0.02, [14, -21.6, top + 1.8]);
    s.label([14, -21.5, top + 1.85], 'POCKET LIGA', '#fbf4e4', 0.03);
    stand(s, { ...lower, rows: 9, depth: 0.9, rise: 0.6, base: top + 2.1, fade: 0.8, fill: 0.85, axis: 'x', from: -15, to: 43, front: -23.8, out: -1 }, 5);
    // A mesa, os bancos, as placas de LED e quem se senta à beira do campo.
    s.box(11.5, 16.5, -10.2, -9.4, 0, 0.8, [26, 26, 34], [60, 60, 70]);
    s.poly([[11.5, -9.39, 0.1], [16.5, -9.39, 0.1], [16.5, -9.39, 0.7], [11.5, -9.39, 0.7]], RED, 0.01, [14, -9.4, 0.4]);
    s.label([14, -9.3, 0.42], 'PB ARENA', '#fbf4e4', 0.02);
    benches(s, [40, 40, 52], [176, 34, 44]);
    for (const [x0, x1, y0, y1] of [[-3, 31, -11.1, -10.8], [-3.4, -3.1, -10.7, 10], [31.1, 31.4, -10.7, 10]] as const) {
      s.box(x0, x1, y0, y1, 0, 0.9, [16, 16, 22]);
    }
    s.poly([[-3, -10.79, 0.1], [31, -10.79, 0.1], [31, -10.79, 0.8], [-3, -10.79, 0.8]], 'rgba(255,90,80,0.9)', 0.01, [14, -10.8, 0.4]);
    for (const x of [1, 27]) s.label([x, -10.75, 0.45], 'SOPA DA AVO', '#fbf4e4', 0.02);
    for (const [x, y] of [[-1.4, -4.2], [-1.4, 4.4], [29.4, -3.8]] as const) s.sprite([x, y, 0], 'idle', fan(Math.round(x * 7 + y), ['#1b2230']));
    // O cubo de ecrãs e os cabos.
    const [cx, cy, h0, h1, r] = [14, -1, 9.4, 12, 2];
    s.box(cx - r, cx + r, cy - r, cy + r, h0, h1, [18, 18, 26]);
    s.poly([[cx - r + 0.2, cy + r + 0.01, h0 + 0.5], [cx + r - 0.2, cy + r + 0.01, h0 + 0.5], [cx + r - 0.2, cy + r + 0.01, h1 - 0.2], [cx - r + 0.2, cy + r + 0.01, h1 - 0.2]], [30, 70, 150], 0.02, [cx, cy + r, h0 + 1]);
    s.poly([[cx - r, cy + r + 0.02, h0 + 0.1], [cx + r, cy + r + 0.02, h0 + 0.1], [cx + r, cy + r + 0.02, h0 + 0.4], [cx - r, cy + r + 0.02, h0 + 0.4]], RED, 0.03, [cx, cy + r, h0 + 1]);
    s.label([cx, cy + r + 0.05, h0 + 1.4], '54-48', '#fbf4e4', 0.04);
    for (const dx of [-1.6, 1.6]) s.line([cx + dx, cy - 1.6, h1], [cx + dx, cy - 1.6, h1 + 8], '#2a2f3c');
    // As faixas dos títulos, penduradas por cima do anel de cima.
    [2, 7, 12, 17, 22, 27].forEach((x, i) => {
      s.poly([[x - 0.9, -18, 10.6], [x + 0.9, -18, 10.6], [x + 0.9, -18, 13], [x - 0.9, -18, 13]], RED, 0, [x, -18, 11]);
      s.label([x, -17.9, 11.8], String(1990 + i * 6), '#f2c230', 0.01);
    });
    // Os focos: cones de luz suaves somados por cima de tudo.
    const cones: [number, number][] = [[6, -2], [6, 3], [22, -2], [22, 3], [14, 0]];
    s.overlay(-1, g => {
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (const [x, y] of cones) {
        const t = s.cam.project([x, y, 15]);
        const l = s.cam.project([x - 2.6, y, 0]);
        const rr = s.cam.project([x + 2.6, y, 0]);
        if (!t || !l || !rr) continue;
        g.fillStyle = 'rgba(255,236,200,0.035)';
        g.beginPath();
        g.moveTo(t[0], t[1]);
        g.lineTo(l[0], l[1]);
        g.lineTo(rr[0], rr[1]);
        g.fill();
      }
      g.restore();
    });
  },
};

/* ---------- 5. Diorama isométrico ---------- */

const diorama: SceneDef = {
  id: 'diorama',
  title: 'Diorama Municipal',
  division: 'Pro Liga 2 · municipal',
  build: 'O pavilhão inteiro como uma maqueta de blocos, sem teto, visto quase em isométrico',
  note: 'O pavilhão municipal como uma maqueta: paredes cortadas à altura do joelho do lado da câmara, a bancada de betão, o marcador, a entrada com pala, o parque de estacionamento, árvores e gente a chegar. Pode crescer peça a peça, como numa Kairosoft.',
  views: [
    { label: 'Isométrica', spec: { w: 720, h: 480, pos: [-46, 70, 70], target: [14, -1, 0], focal: 1150 } },
    { label: 'Jogo', spec: GAME },
    { label: 'Demonstração', spec: DEMO },
    { label: 'Bancos', spec: BENCH },
  ],
  floor: (x, y) => {
    if (x > -7 && x < 35 && y > -13 && y < 11) {
      const z = zone(x, y, 1.4);
      if (z === 'key' || z === 'centre') return [198, 62, 52];
      if (z === 'court') return add([56, 124, 88], hash(Math.floor(x * 2), Math.floor(y * 2)) * 4);
      if (z === 'apron') return [44, 98, 70];
      return [160, 158, 150];
    }
    if (x > 11 && x < 17 && y >= 11 && y < 34) return frac(y / 1.2) < 0.08 || frac(x / 1.5) < 0.06 ? [170, 164, 150] : [204, 196, 180];
    if (x > 38 && x < 62 && y > -12 && y < 22) return frac(x / 3) < 0.05 && y > -8 && y < 2 ? [236, 236, 230] : [84, 86, 92];
    return Math.floor((x + y) / 3) % 2 ? [108, 162, 86] : [100, 152, 80];
  },
  sky: () => [168, 210, 236],
  lines: '#f4f0e6',
  dress: s => {
    const wall: Rgb = [228, 222, 206];
    const cut: Rgb = [120, 74, 60];
    s.box(-7, 35, -13.6, -13, 0, 7, wall, cut);
    s.box(-7.6, -7, -13.6, 11.6, 0, 7, wall, cut);
    s.box(35, 35.6, -13.6, 11.6, 0, 0.8, wall, cut);
    s.box(-7.6, 11, 11, 11.6, 0, 0.8, wall, cut);
    s.box(17, 35.6, 11, 11.6, 0, 0.8, wall, cut);
    // As janelas em fita no alto da parede do fundo.
    s.poly([[-6.8, -12.99, 5.2], [34.8, -12.99, 5.2], [34.8, -12.99, 6.2], [-6.8, -12.99, 6.2]], [176, 214, 232], 0.01, [14, -13, 5.6]);
    for (let x = -6; x < 35; x += 2) s.line([x, -12.98, 5.2], [x, -12.98, 6.2], '#e8e4da', 1, 0.02);
    stand(s, { axis: 'x', from: -5.5, to: 33.5, front: -10.6, out: -1, rows: 3, depth: 0.74, rise: 0.48, seat: [176, 176, 168], riser: [140, 140, 134], aisle: [196, 196, 190], aisleEvery: 6.5, fill: 0.7, shirts: ['#c7362f', '#f0ede4'] }, 7);
    // O marcador na parede da esquerda e a faixa da claque.
    s.box(-7, -6.8, -3, 3, 4, 5.6, [28, 28, 34]);
    s.label([-6.7, 0, 4.8], '54 48', '#f2b33d');
    s.poly([[-5, -10.59, 0.2], [3, -10.59, 0.2], [3, -10.59, 0.9], [-5, -10.59, 0.9]], [199, 54, 47], 0.01, [-1, -10.6, 0.5]);
    // A entrada com pala, o mastro e quem chega.
    s.box(11, 17, 11.6, 15, 2.6, 2.9, [199, 54, 47]);
    for (const x of [11.2, 16.8]) s.box(x - 0.1, x + 0.1, 14.7, 14.9, 0, 2.6, [80, 80, 86]);
    s.label([14, 15.05, 2.75], 'PAVILHAO MUNICIPAL', '#fbf6e2', 0.02);
    // Os bancos à frente da bancada; as equipas entram e saem pela porta da frente, do lado de cá.
    benches(s, [176, 176, 168], [199, 54, 47]);
    s.line([20, 16, 0], [20, 16, 7], '#c8c8c8');
    s.poly([[20, 16, 6], [21.8, 16, 6], [21.8, 16, 7], [20, 16, 7]], [44, 120, 70]);
    [[12.6, 19, 0], [13.6, 22, 0], [15.4, 25.5, 0], [14, 28, 0]].forEach(([x, y, z], i) => s.sprite([x!, y!, z!], 'run0', fan(i * 11 + 2, ['#c7362f']), i % 2 === 0));
    // O parque de estacionamento.
    ([[40, -9, [192, 48, 42]], [43, -9, [42, 82, 190]], [49, -9, [230, 230, 230]], [52, -9, [242, 194, 48]], [40, 6, [58, 122, 74]], [46, 6, [230, 230, 230]]] as const).forEach(([x, y, c]) => {
      s.box(x, x + 1.9, y, y + 4.2, 0, 0.9, c);
      s.box(x + 0.2, x + 1.7, y + 1, y + 3, 0.9, 1.5, shade(c, 0.9), [150, 190, 210]);
    });
    // As árvores à volta.
    [[-12, -6], [-12, 3], [-11, 12], [4, 17], [24, 18], [30, 16], [36, 14], [-14, -16], [6, -18], [22, -18], [38, -18]].forEach(([x, y], i) => tree(s, x!, y!, 4.2 + hash(i, 4) * 2, hash(i, 3) < 0.5 ? [70, 140, 74] : [60, 124, 70]));
  },
};

/* ---------- 6. Transmissão lateral ---------- */

const NAVY: Rgb = [36, 56, 116];
const broadcast: SceneDef = {
  id: 'lateral',
  title: 'Nave de Transmissão',
  division: 'Pro Liga 1 · arena',
  build: 'Uma parede enorme de público ao fundo, vista de lado e baixo, como na televisão',
  note: 'Câmara baixa ao lado do campo, como numa transmissão: uma bancada que sobe até ao teto, as faixas dos números retirados, o ecrã gigante, fotógrafos na linha de fundo e as cabeças da primeira fila à frente da câmara. O mais vistoso, mas a jogada lê-se pior.',
  views: [
    { label: 'Transmissão', spec: { w: 720, h: 400, pos: [14, 19, 4.4], target: [12, -2, 2.4], focal: 330 } },
    { label: 'Jogo', spec: GAME },
    { label: 'Demonstração', spec: DEMO },
    { label: 'Bancos', spec: BENCH },
  ],
  floor: (x, y) => {
    const z = zone(x, y, 1.8);
    if (z === 'key' || z === 'centre') return [30, 50, 112];
    if (z === 'apron') return NAVY;
    if (z === 'out') return [20, 24, 40];
    return planks(x, y, 1, [232, 204, 154], 10);
  },
  sky: () => [8, 10, 20],
  lines: '#fbf6e8',
  dress: s => {
    const shirts = ['#f2c230', '#24387a', '#f4efe0'];
    stand(s, { axis: 'x', from: -3, to: 37, front: -11.1, out: -1, rows: 20, depth: 0.8, rise: 0.56, seat: NAVY, seat2: shade(NAVY, 0.88), riser: [20, 26, 50], aisle: [90, 96, 120], aisleEvery: 7.5, fill: 0.94, fade: 0.6, shirts }, 11);
    stand(s, { axis: 'y', from: -10, to: 10, front: -4, out: -1, rows: 10, depth: 0.8, rise: 0.5, seat: NAVY, riser: [20, 26, 50], fill: 0.9, fade: 0.5, shirts }, 12);
    stand(s, { axis: 'y', from: -10, to: 10, front: 32, out: 1, rows: 10, depth: 0.8, rise: 0.5, seat: NAVY, riser: [20, 26, 50], fill: 0.9, fade: 0.5, shirts }, 13);
    // A placa de LED começa depois do túnel do canto, para não tapar a saída.
    s.box(-3, 34, -11.05, -10.75, 0, 0.9, [12, 14, 26]);
    s.poly([[-3, -10.74, 0.1], [34, -10.74, 0.1], [34, -10.74, 0.8], [-3, -10.74, 0.8]], [242, 194, 48], 0.01, [14, -10.7, 0.4]);
    for (const x of [1, 9, 19, 27]) s.label([x, -10.7, 0.45], 'BICA BOA', '#1b2230', 0.02);
    s.box(11.5, 16.5, -10.3, -9.5, 0, 0.8, [16, 20, 36], [60, 64, 80]);
    benches(s, [40, 44, 64], [242, 194, 48]);
    // O túnel no canto, entre a bancada do fundo e a do topo.
    tunnel(s, -8.6, -3.4, -26, -11.1, 2.8, [20, 26, 50]);
    // O ecrã gigante no alto da bancada e os números retirados.
    s.box(6, 22, -27.6, -27, 11.6, 16, [14, 14, 22]);
    s.poly([[6.4, -26.99, 12], [21.6, -26.99, 12], [21.6, -26.99, 15.6], [6.4, -26.99, 15.6]], [24, 60, 140], 0.01, [14, -27, 13]);
    s.label([14, -26.9, 13.8], 'CASA 54   FORA 48', '#fbf6e2', 0.02);
    [-2, 2, 26, 30].forEach((x, i) => {
      s.poly([[x - 0.9, -20, 12.4], [x + 0.9, -20, 12.4], [x + 0.9, -20, 15], [x - 0.9, -20, 15]], [242, 194, 48], 0, [x, -20, 13]);
      s.label([x, -19.9, 13.6], String([7, 11, 23, 33][i]), '#24387a', 0.01);
    });
    for (const [x, y] of [[-1.2, -4.6], [-1.2, 4.2], [29.2, -4], [29.2, 4.6]] as const) s.sprite([x, y, 0], 'idle', fan(Math.round(x * 13 + y), ['#1b2230']));
    // As cabeças da primeira fila, entre a câmara e o campo.
    s.overlay(-2, g => {
      g.fillStyle = '#0c0e18';
      for (let i = 0; i < 26; i++) {
        const x = Math.round(i * 29 + hash(i, 4) * 12 - 6);
        const r = 9 + Math.round(hash(i, 9) * 4);
        const y = s.cam.h - 2 + Math.round(hash(i, 2) * 4);
        for (let dy = -r; dy <= r; dy++) {
          const w = Math.round(Math.sqrt(r * r - dy * dy));
          g.fillRect(x - w, y - r + dy, w * 2, 1);
        }
        g.fillRect(x - r - 6, y + 2, (r + 6) * 2, 14);
      }
    });
  },
};

export const SCENES: readonly SceneDef[] = [rooftop, viaduct, gym, bowl, diorama, broadcast];

/** As sobreposições de um cenário (ver `overlaps`): a geometria é igual em todas as vistas. */
export function checkScene(def: SceneDef): string[] {
  const s = new Scene(new Cam(GAME));
  def.dress(s);
  s.tag = 'cesto';
  hoop(s, 1.575, [70, 78, 90]);
  hoop(s, 26.425, [70, 78, 90]);
  s.tag = 'jogador';
  players(s);
  return overlaps(s);
}

export function renderScene(canvas: HTMLCanvasElement, def: SceneDef, view: number): void {
  const spec = def.views[Math.min(view, def.views.length - 1)]!.spec;
  canvas.width = spec.w;
  canvas.height = spec.h;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const cam = new Cam(spec);
  paintGround(g, cam, def.floor, (up, sx, sy) => def.sky(up, sx, sy, spec.w));
  courtLines(g, cam, def.lines);
  const s = new Scene(cam);
  def.dress(s);
  s.tag = 'cesto';
  hoop(s, 1.575, [70, 78, 90]);
  hoop(s, 26.425, [70, 78, 90]);
  s.tag = 'jogador';
  players(s);
  s.flush(g);
}

