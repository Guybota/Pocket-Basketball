// Os modelos 3D à volta do campo: os dois cestos (base, poste, braço, tabela com o quadrado, aro e rede), a mesa de oficiais,
// os bancos das equipas e, no bairro, os bancos de pedra. Têm as medidas e as cores do desenho da tela 2D (art/court.ts:
// `HOOP_SHAPE`, `SIDELINE`, `STREET_SEATS`), mas são peças a sério: com faces de lado, e cada peça à sua profundidade.
import { BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, ShaderMaterial } from 'three';
import { FAN_SPACING, FLOOR_AREA, HOOP_SHAPE, endBoards, TUNNEL, inAisle, SIDELINE, STREET_SEATS, seats, type CourtTheme, type Fixture, type Seat, type StepColours } from '../art/court.ts';
import { INK } from '../art/sprites.ts';
import { HOOP_U } from '../../sim/court.ts';

const HOOPS = [HOOP_U, 28 - HOOP_U] as const;
const ORANGE = '#e8622a';
const NET = '#f8f6ee';

// Cores lisas, sem luz do motor: a cor de cada face vai no vértice, tal como na tela.
const FLAT_VERTEX = /* glsl */ `
attribute vec3 tint;
varying vec3 vTint;
void main() {
  vTint = tint;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FLAT_FRAGMENT = /* glsl */ `
varying vec3 vTint;
void main() { gl_FragColor = vec4(vTint, 1.0); }`;

type V3 = [number, number, number];
const rgb = (hex: string): V3 => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];
const shade = (c: V3, k: number): V3 => [c[0] * k, c[1] * k, c[2] * k];

/** Triângulos com uma cor por face. */
class Builder {
  readonly pos: number[] = [];
  readonly tint: number[] = [];
  quad(a: V3, b: V3, c: V3, d: V3, color: V3): void {
    for (const p of [a, b, c, a, c, d]) {
      this.pos.push(...p);
      this.tint.push(...color);
    }
  }
  /** Uma caixa alinhada com os eixos: o tampo na cor de cima, as faces de frente e de trás na da frente, os lados mais escuros. */
  box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, top: V3, front: V3): void {
    const side = shade(front, 0.8);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], top);
    this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], front);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], front);
    this.quad([x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], side);
    this.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], side);
  }
  /** Um quadrilátero com uma cor por canto: a placa mistura-as pelo meio (o túnel escurece para o fundo). */
  blend(a: V3, b: V3, c: V3, d: V3, ca: V3, cb: V3, cc: V3, cd: V3): void {
    for (const [p, col] of [[a, ca], [b, cb], [c, cc], [a, ca], [c, cc], [d, cd]] as [V3, V3][]) {
      this.pos.push(...p);
      this.tint.push(...col);
    }
  }
  /** Uma caixa virada para `n` (para o campo), com `a` ao longo da fila: medidas em metros a partir de `o`. */
  turned(o: V3, a: [number, number], n: [number, number], a0: number, a1: number, n0: number, n1: number, z0: number, z1: number, top: V3, front: V3): void {
    const at = (u: number, v: number, z: number): V3 => [o[0] + a[0] * u + n[0] * v, o[1] + a[1] * u + n[1] * v, o[2] + z];
    const side = shade(front, 0.8);
    this.quad(at(a0, n0, z1), at(a1, n0, z1), at(a1, n1, z1), at(a0, n1, z1), top);
    this.quad(at(a0, n1, z0), at(a1, n1, z0), at(a1, n1, z1), at(a0, n1, z1), front);
    this.quad(at(a0, n0, z0), at(a1, n0, z0), at(a1, n0, z1), at(a0, n0, z1), shade(front, 0.7));
    this.quad(at(a0, n0, z0), at(a0, n1, z0), at(a0, n1, z1), at(a0, n0, z1), side);
    this.quad(at(a1, n0, z0), at(a1, n1, z0), at(a1, n1, z1), at(a1, n0, z1), side);
  }
  /** Uma barra de secção quadrada de `w` metros, de `p` a `q`, com os lados à sombra. */
  beam(p: V3, q: V3, w: number, color: V3): void {
    const d: V3 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
    const len = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]) || 1;
    const u: V3 = [d[0] / len, d[1] / len, d[2] / len];
    // Dois eixos perpendiculares à barra.
    const ref: V3 = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    let a: V3 = [u[1] * ref[2] - u[2] * ref[1], u[2] * ref[0] - u[0] * ref[2], u[0] * ref[1] - u[1] * ref[0]];
    const al = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    a = [(a[0] / al) * (w / 2), (a[1] / al) * (w / 2), (a[2] / al) * (w / 2)];
    let b: V3 = [u[1] * a[2] - u[2] * a[1], u[2] * a[0] - u[0] * a[2], u[0] * a[1] - u[1] * a[0]];
    const bl = Math.sqrt(b[0] * b[0] + b[1] * b[1] + b[2] * b[2]) || 1;
    b = [(b[0] / bl) * (w / 2), (b[1] / bl) * (w / 2), (b[2] / bl) * (w / 2)];
    const at = (o: V3, sa: number, sb: number): V3 => [o[0] + a[0] * sa + b[0] * sb, o[1] + a[1] * sa + b[1] * sb, o[2] + a[2] * sa + b[2] * sb];
    const corners: [number, number][] = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    corners.forEach(([sa, sb], i) => {
      const [ta, tb] = corners[(i + 1) % 4]!;
      this.quad(at(p, sa, sb), at(p, ta, tb), at(q, ta, tb), at(q, sa, sb), i % 2 === 0 ? color : shade(color, 0.75));
    });
  }
  geometry(geometry = new BufferGeometry()): BufferGeometry {
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.pos), 3));
    geometry.setAttribute('tint', new BufferAttribute(new Float32Array(this.tint), 3));
    geometry.computeBoundingSphere();
    return geometry;
  }
}

/** A rede de um cesto, aberta por `swish` (0 parada, 1 a bola a passar): seis fios do aro até em baixo, como na tela. */
function addNet(b: Builder, hoopX: number, swish: number): void {
  const { rimRadius, rimZ } = HOOP_SHAPE;
  const radius = 0.16 + swish * 0.1;
  const bottom = 2.62 - swish * 0.28;
  for (let i = 0; i < 12; i += 2) {
    const an = (i / 12) * Math.PI * 2;
    b.beam([hoopX + Math.cos(an) * rimRadius, Math.sin(an) * rimRadius, rimZ], [hoopX + Math.cos(an) * radius, Math.sin(an) * radius, bottom], 0.045, rgb(NET));
  }
}

export interface Fixtures {
  group: Group;
  /** Abre a rede de cada cesto (o da esquerda e o da direita). */
  setSwish(left: number, right: number): void;
  dispose(): void;
}

const unpack = (c: number): V3 => [(c & 255) / 255, ((c >>> 8) & 255) / 255, ((c >>> 16) & 255) / 255];
/** Para o campo e ao longo da fila, em cada bancada (a lateral, os topos e as diagonais dos cantos). */
function frame(s: Seat): { n: [number, number]; a: [number, number] } {
  const h = Math.SQRT1_2;
  if (s.plane === 'side') return { n: [0, 1], a: [1, 0] };
  if (s.plane === 'end') return { n: [s.far ? -1 : 1, 0], a: [0, 1] };
  return s.far ? { n: [-h, h], a: [-h, -h] } : { n: [h, h], a: [h, -h] };
}
/** Altura do assento e do encosto, em metros a partir do degrau. */
const SEAT_Z = 0.44;
const BACK_Z = 0.86;
/** Meia largura de uma cadeira: 0,9 m, um pouco mais larga do que um adepto com os braços. */
const CHAIR_HALF = 0.45;

/**
 * As cadeiras da bancada, uma por lugar e da largura de um adepto: encostadas ao espelho de trás de cada piso, com o assento,
 * o encosto e o pé. Fila a fila até ao cimo; quem está sentado fica na cadeira do seu lugar.
 */
function addChairs(b: Builder, theme: CourtTheme, steps: StepColours): void {
  const top = theme.crowd?.to ?? 0;
  for (let r = 0; r < steps.rows - 1; r++) {
    const row = seats(theme, r);
    if (row.length === 0 || row[0]!.z + BACK_Z > top) break;
    const k = Math.min(steps.rows - 1, r + 1);
    const chair = unpack(steps.chair[k]!);
    const lit = unpack(steps.chairTop[k]!);
    const foot = unpack(steps.gap[k]!);
    const place = (o: V3, s: Seat): void => {
      const { n, a } = frame(s);
      b.turned(o, a, n, -CHAIR_HALF, CHAIR_HALF, 0.04, 0.46, SEAT_Z - 0.06, SEAT_Z, lit, chair);
      b.turned(o, a, n, -CHAIR_HALF, CHAIR_HALF, 0.02, 0.09, SEAT_Z, BACK_Z, lit, chair);
      b.turned(o, a, n, -0.05, 0.05, 0.12, 0.3, 0, SEAT_Z - 0.06, foot, foot);
    };
    for (const s of row) place([s.x, s.y, s.z], s);
    // Nos topos, os adeptos só se sentam até a meio (y < 9): as cadeiras continuam vazias até ao fim da bancada.
    for (const far of [false, true]) {
      const end = row.filter(s => s.plane === 'end' && s.far === far);
      const lastSeat = end[end.length - 1];
      if (!lastSeat) continue;
      for (let y = lastSeat.y + FAN_SPACING; y < FLOOR_AREA.y1 - 0.5; y += FAN_SPACING) if (!inAisle(theme, 'end', y)) place([lastSeat.x, y, lastSeat.z], { ...lastSeat, y, along: y });
    }
  }
}

/** O guarda-corpos à frente do corredor, no cimo do muro: postes e dois tubos, a toda a volta, menos na boca do túnel. */
function addRail(b: Builder, theme: CourtTheme, steps: StepColours): void {
  const { x0, x1, y0, y1, chamfer } = FLOOR_AREA;
  const back = 0.08;
  const c = theme.chamfer ? chamfer : 0;
  const line: [number, number][] = [[x0 - back, y1], [x0 - back, y0 + c], [x0 + c, y0 - back], [x1 - c, y0 - back], [x1 + back, y0 + c], [x1 + back, y1]];
  const k = theme.crowd?.dim ?? 1;
  const metal = shade(rgb('#aab2bc'), k);
  const z = steps.zs;
  const run = (p: [number, number], q: [number, number]): void => {
    const len = Math.sqrt((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2);
    const n = Math.max(1, Math.ceil(len / 2));
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const x = p[0] + (q[0] - p[0]) * s;
      const y = p[1] + (q[1] - p[1]) * s;
      b.beam([x, y, z], [x, y, z + 0.9], 0.06, metal);
    }
    b.beam([p[0], p[1], z + 0.9], [q[0], q[1], z + 0.9], 0.07, metal);
    b.beam([p[0], p[1], z + 0.45], [q[0], q[1], z + 0.45], 0.04, metal);
  };
  for (let i = 0; i + 1 < line.length; i++) {
    const p = line[i]!;
    const q = line[i + 1]!;
    // A lateral do fundo abre-se na boca do túnel.
    if (p[1] === q[1]) {
      run(p, [TUNNEL.x0 - 0.2, p[1]]);
      run([TUNNEL.x1 + 0.2, p[1]], q);
    } else run(p, q);
  }
}

/**
 * O túnel por baixo da bancada da lateral: a boca em betão (as ombreiras e o lintel, com o tampo até à bancada) e, lá
 * dentro, um corredor de 8 m com chão, teto e paredes a escurecer até ao escuro do fundo.
 */
function addTunnel(b: Builder, theme: CourtTheme): void {
  const { x0, x1, height: h } = TUNNEL;
  const y = FLOOR_AREA.y0;
  const back = y - 8;
  const deep = theme.slope * (h + 0.2) + 0.05;
  const lit = (c: V3): V3 => (theme.tint ? [c[0] * theme.tint[0], c[1] * theme.tint[1], c[2] * theme.tint[2]] : c);
  const c = (r: number, g: number, bl: number, k = 1): V3 => lit([(r / 255) * k, (g / 255) * k, (bl / 255) * k]);
  const frame = c(150, 152, 150);
  const frameTop = c(170, 172, 168);
  b.box(x0 - 0.2, x0, y - deep, y, 0, h, frameTop, frame);
  b.box(x1, x1 + 0.2, y - deep, y, 0, h, frameTop, frame);
  b.box(x0 - 0.2, x1 + 0.2, y - deep, y, h, h + 0.2, frameTop, frame);
  // Por dentro, um nada para dentro da boca, para não se misturar com as ombreiras.
  const i0 = x0 + 0.01;
  const i1 = x1 - 0.01;
  const top = h - 0.01;
  const floorNear = c(66, 62, 64);
  const floorFar = c(66, 62, 64, 0.2);
  b.blend([i0, y, 0.01], [i1, y, 0.01], [i1, back, 0.01], [i0, back, 0.01], floorNear, floorNear, floorFar, floorFar);
  const ceilNear = c(40, 42, 54);
  const ceilFar = c(40, 42, 54, 0.25);
  b.blend([i0, y, top], [i1, y, top], [i1, back, top], [i0, back, top], ceilNear, ceilNear, ceilFar, ceilFar);
  for (const [x, k] of [[i0, 1], [i1, 0.82]] as const) {
    const near = c(70, 72, 88, k);
    const far = c(70, 72, 88, k * 0.2);
    b.blend([x, y, 0], [x, y, top], [x, back, top], [x, back, 0], near, near, far, far);
  }
  // O fundo, às escuras.
  const end = c(14, 15, 20);
  b.quad([i0, back, 0], [i1, back, 0], [i1, back, top], [i0, back, top], end);
}

/**
 * As balizas de andebol do ginásio da escola, arrumadas contra a parede de cada topo, ao lado do cesto (atrás dele, o poste
 * ficava a meio da baliza): 3 × 2 m, com os postes e a barra às riscas, em tons calmos para não competirem com o aro, e a
 * rede de fios grossos o bastante para não cintilarem, até à parede, 1 m atrás.
 */
function addGoals(b: Builder, theme: CourtTheme): void {
  const lit = (c: V3): V3 => (theme.tint ? [c[0] * theme.tint[0], c[1] * theme.tint[1], c[2] * theme.tint[2]] : c);
  const red = lit(rgb('#b0645a'));
  const white = lit(rgb('#e2ded4'));
  const net = lit(rgb('#a4a8ae'));
  const striped = (p: V3, q: V3): void => {
    const len = Math.sqrt((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2);
    const n = Math.max(1, Math.round(len / 0.2));
    for (let i = 0; i < n; i++) {
      const a = i / n;
      const c = (i + 1) / n;
      b.beam([p[0] + (q[0] - p[0]) * a, p[1] + (q[1] - p[1]) * a, p[2] + (q[2] - p[2]) * a], [p[0] + (q[0] - p[0]) * c, p[1] + (q[1] - p[1]) * c, p[2] + (q[2] - p[2]) * c], 0.08, i % 2 === 0 ? red : white);
    }
  };
  for (const far of [false, true]) {
    const wall = far ? FLOOR_AREA.x1 : FLOOR_AREA.x0;
    const out = far ? 1 : -1;
    const front = wall - out * 1;
    const back = wall - out * 0.05;
    const y0 = 2.6;
    const y1 = 5.6;
    // Os postes e a barra, às riscas.
    striped([front, y0, 0], [front, y0, 2]);
    striped([front, y1, 0], [front, y1, 2]);
    striped([front, y0, 2], [front, y1, 2]);
    // A rede: só a de trás, encostada à parede, em fios de 4 cm a cada 0,75 m, e os bordos de cima e dos lados até ela.
    // Com as três faces cheias de fios grossos, lia-se como uma grade de ferro.
    for (let y = y0; y <= y1 + 0.001; y += 0.75) b.beam([back, y, 0], [back, y, 2], 0.04, net);
    for (let z = 0.5; z <= 2.001; z += 0.75) b.beam([back, y0, z], [back, y1, z], 0.04, net);
    for (const y of [y0, y1]) {
      b.beam([front, y, 2], [back, y, 2], 0.04, net);
      b.beam([front, y, 0.02], [back, y, 0.02], 0.04, net);
    }
  }
}

export function buildFixtures(theme: CourtTheme, steps: StepColours | null = null): Fixtures {
  // Dos dois lados: assim a ordem dos cantos de cada face não importa (com um só lado, metade das faces sumia).
  const material = new ShaderMaterial({ vertexShader: FLAT_VERTEX, fragmentShader: FLAT_FRAGMENT, side: DoubleSide });
  const b = new Builder();
  const pole = rgb(theme.pole);
  const ink = rgb(INK);
  const { rimRadius, rimZ, board, pole: poleOut, arm, boardBottom, boardTop, boardHalf } = HOOP_SHAPE;
  for (const hoopX of HOOPS) {
    const outward = hoopX < 14 ? -1 : 1;
    const boardX = hoopX + outward * board;
    const poleX = hoopX + outward * poleOut;
    // A base almofadada, o poste e o braço até à tabela.
    b.box(poleX - 0.4, poleX + 0.4, -0.5, 0.5, 0, 0.06, pole, shade(pole, 0.8));
    b.box(poleX - 0.09, poleX + 0.09, -0.09, 0.09, 0, arm, pole, pole);
    b.beam([poleX, 0, arm], [boardX, 0, arm], 0.1, pole);
    // A tabela: uma moldura a tinta e, à frente dela (para o lado do campo), o painel e o quadrado laranja.
    const face = boardX - outward * 0.03;
    b.box(Math.min(boardX, face), Math.max(boardX, face), -boardHalf, boardHalf, boardBottom, boardTop, ink, ink);
    const front = boardX - outward * 0.04;
    const inset = 0.05;
    const panel = (x: number): void => {
      const y0 = -boardHalf * (1 - inset);
      const y1 = boardHalf * (1 - inset);
      const z0 = boardBottom + (boardTop - boardBottom) * inset;
      const z1 = boardTop - (boardTop - boardBottom) * inset;
      b.quad([x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1], rgb(theme.board));
    };
    panel(front);
    const sq = boardX - outward * 0.05;
    for (const [p, q] of [[[sq, -0.3, 3.05], [sq, 0.3, 3.05]], [[sq, 0.3, 3.05], [sq, 0.3, 3.5]], [[sq, 0.3, 3.5], [sq, -0.3, 3.5]], [[sq, -0.3, 3.5], [sq, -0.3, 3.05]]] as [V3, V3][]) b.beam(p, q, 0.035, rgb(ORANGE));
    // O aro: 28 troços à volta do centro.
    for (let i = 0; i < 28; i++) {
      const a0 = (i / 28) * Math.PI * 2;
      const a1 = ((i + 1) / 28) * Math.PI * 2;
      b.beam([hoopX + Math.cos(a0) * rimRadius, Math.sin(a0) * rimRadius, rimZ], [hoopX + Math.cos(a1) * rimRadius, Math.sin(a1) * rimRadius, rimZ], 0.07, rgb(ORANGE));
    }
  }
  // A mesa, os bancos e, no bairro, os bancos de pedra.
  const boxes: readonly Fixture[] = theme.open ? [...SIDELINE, ...STREET_SEATS] : [...SIDELINE, ...endBoards(theme)];
  for (const f of boxes) b.box(f.x0, f.x1, f.y0, f.y1, 0, f.height, rgb(f.top), rgb(f.front));
  if (!theme.open && theme.slope > 0) addTunnel(b, theme);
  if (theme.windows) addGoals(b, theme);
  if (steps && !steps.wood) {
    addChairs(b, theme, steps);
    addRail(b, theme, steps);
  }
  const solid = new Mesh(b.geometry(), material);
  solid.frustumCulled = false;
  // A rede muda quando a bola entra: tem a sua malha, refeita só quando mexe.
  const netGeometry = new BufferGeometry();
  const nets = new Mesh(netGeometry, material);
  nets.frustumCulled = false;
  let last = '';
  const setSwish = (left: number, right: number): void => {
    const key = `${left.toFixed(3)}|${right.toFixed(3)}`;
    if (key === last) return;
    last = key;
    const n = new Builder();
    addNet(n, HOOPS[0], left);
    addNet(n, HOOPS[1], right);
    n.geometry(netGeometry);
  };
  setSwish(0, 0);
  const group = new Group();
  group.add(solid, nets);
  return {
    group,
    setSwish,
    dispose() {
      solid.geometry.dispose();
      netGeometry.dispose();
      material.dispose();
    },
  };
}
