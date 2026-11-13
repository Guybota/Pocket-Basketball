// Os modelos 3D à volta do campo: os dois cestos (base, poste, braço, tabela com o quadrado, aro e rede), a mesa de oficiais,
// os bancos das equipas e, no bairro, os bancos de pedra. Têm as medidas e as cores do desenho da tela 2D (art/court.ts:
// `HOOP_SHAPE`, `SIDELINE`, `STREET_SEATS`), mas são peças a sério: com faces de lado, e cada peça à sua profundidade.
import { BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, ShaderMaterial } from 'three';
import { HOOP_SHAPE, SIDELINE, STREET_SEATS, type CourtTheme, type Fixture } from '../art/court.ts';
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

export function buildFixtures(theme: CourtTheme): Fixtures {
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
  const boxes: readonly Fixture[] = theme.open ? [...SIDELINE, ...STREET_SEATS] : SIDELINE;
  for (const f of boxes) b.box(f.x0, f.x1, f.y0, f.y1, 0, f.height, rgb(f.top), rgb(f.front));
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
