// O cenário do campo na placa gráfica (three.js), à resolução do ecrã. Fase 1: o chão e as linhas; o resto continua no
// traçador de raios (`Camera.drawScene`), que deixa o chão transparente por cima desta imagem. Ver docs/08-plano-gpu.md.
import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  DoubleSide,
  LinearMipmapLinearFilter,
  LinearFilter,
  LinearSRGBColorSpace,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector3,
  WebGLRenderer,
} from 'three';
import { FLOOR_AREA, courtLinePaths, type Camera, type CourtTextures } from '../art/court.ts';

/** A largura verdadeira das linhas (5 cm) e o mínimo no ecrã, em píxeis: ao longe nunca ficam mais finas do que isto. */
const LINE_HALF = 0.025;
const LINE_MIN_PX = 1.5;

/** O que a placa gráfica guarda para cada pavilhão: a textura do chão e as malhas. */
interface Venue {
  scene: Scene;
  floorTexture: DataTexture;
  lines: Mesh<BufferGeometry, ShaderMaterial>;
  dispose(): void;
}

const FLOOR_VERTEX = /* glsl */ `
varying vec2 vWorld;
void main() {
  vWorld = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Texels nítidos quando a textura fica maior do que o ecrã (a borda entre dois texels faz-se num só píxel), e média dos
// mipmaps quando fica mais pequena, ao longe, para o soalho não cintilar com a câmara.
const FLOOR_FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform vec2 size;
uniform vec2 origin;
uniform float scale;
varying vec2 vWorld;
void main() {
  vec2 t = (vWorld - origin) * scale;
  vec2 dx = dFdx(t);
  vec2 dy = dFdy(t);
  // Até 1: ao longe, com a textura reduzida, a borda nítida já não faz sentido e só deslocava a textura.
  vec2 fw = clamp(abs(dx) + abs(dy), vec2(1e-4), vec2(1.0));
  vec2 seam = floor(t + 0.5);
  vec2 sharp = seam + clamp((t - seam) / fw, -0.5, 0.5);
  gl_FragColor = vec4(textureGrad(map, sharp / size, dx / size, dy / size).rgb, 1.0);
}`;

// Cada linha é uma faixa deitada no chão: a meia-largura é a das linhas a sério, mas nunca menos de LINE_MIN_PX/2 píxeis do
// ecrã à distância a que o vértice está. As pontas avançam meia largura. A borda suaviza-se aqui, num píxel do ecrã (a faixa
// cresce meio píxel para cada lado e a cor esbate-se nele): é mais barato do que o antisserrilhado da tela inteira (MSAA),
// que num telemóvel ou sem placa gráfica pesava.
const LINE_VERTEX = /* glsl */ `
attribute vec2 miter;
attribute vec2 tangent;
attribute vec2 corner;
attribute vec3 lineColor;
uniform vec3 eye;
uniform vec3 fwd;
uniform float pixelsPerUnit;
varying vec3 vColor;
varying float vAcross;
varying float vHalf;
void main() {
  vec2 side = normalize(miter);
  float depth = dot(position - eye, fwd);
  // Ao longe, o chão inclina-se para a câmara e a largura no ecrã encolhe com a inclinação: conta-se com ela.
  vec3 s3 = vec3(side, 0.0);
  float fore = sqrt(max(1.0 - dot(s3, fwd) * dot(s3, fwd), 0.05));
  float perPx = depth / (pixelsPerUnit * fore);
  float w = max(${LINE_HALF.toFixed(4)}, ${(LINE_MIN_PX / 2).toFixed(4)} * perPx);
  vec2 p = position.xy + miter * corner.y * (w + 0.5 * perPx) + tangent * corner.x * w;
  vHalf = w / perPx;
  vAcross = corner.y * (vHalf + 0.5);
  vColor = lineColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
}`;

const LINE_FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vAcross;
varying float vHalf;
void main() { gl_FragColor = vec4(vColor, clamp(vHalf + 0.5 - abs(vAcross), 0.0, 1.0)); }`;

function buildVenue(t: CourtTextures): Venue {
  const scene = new Scene();
  const { x0, x1, y0, y1, scale } = FLOOR_AREA;
  // O chão: um retângulo no plano z = 0 que passa 2 m para lá das paredes (e para trás da câmara). O traçador de raios decide
  // o que é chão pelo centro de cada bloco de píxeis e tapa o resto: se o polígono acabasse na parede, ficavam fios da cor de
  // fundo nos píxeis do bloco que caem para lá dela. Fora da textura repete-se a cor da borda.
  const outline: [number, number][] = [[x0 - 2, y1 + 8], [x0 - 2, y0 - 2], [x1 + 2, y0 - 2], [x1 + 2, y1 + 8]];
  const floorGeometry = new BufferGeometry();
  const verts: number[] = [];
  for (let i = 1; i + 1 < outline.length; i++) for (const p of [outline[0]!, outline[i]!, outline[i + 1]!]) verts.push(p[0], p[1], 0);
  floorGeometry.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3));
  // A textura é a mesma do traçador de raios (cada texel um Uint32 com r, g, b, a em bytes).
  const floorTexture = new DataTexture(new Uint8Array(t.floor.buffer, t.floor.byteOffset, t.floor.byteLength), t.floorW, t.floorH, RGBAFormat, UnsignedByteType);
  floorTexture.magFilter = LinearFilter;
  floorTexture.minFilter = LinearMipmapLinearFilter;
  floorTexture.generateMipmaps = true;
  floorTexture.anisotropy = 8;
  floorTexture.colorSpace = LinearSRGBColorSpace;
  floorTexture.needsUpdate = true;
  const floorMaterial = new ShaderMaterial({
    vertexShader: FLOOR_VERTEX,
    fragmentShader: FLOOR_FRAGMENT,
    uniforms: { map: { value: floorTexture }, size: { value: [t.floorW, t.floorH] }, origin: { value: [x0, y0] }, scale: { value: scale } },
    depthTest: false,
    depthWrite: false,
  });
  const floor = new Mesh(floorGeometry, floorMaterial);
  floor.renderOrder = 0;
  floor.frustumCulled = false;
  scene.add(floor);

  // As linhas: cada uma é uma faixa contínua, com dois vértices por ponto (um de cada lado) e juntas em esquadria. Sem
  // troços sobrepostos, a borda suavizada não se soma nas juntas (nos arcos fazia um entrançado).
  const paths = courtLinePaths(t.theme);
  const total = paths.reduce((sum, path) => sum + path.points.length, 0);
  const position = new Float32Array(total * 2 * 3);
  const miter = new Float32Array(total * 2 * 2);
  const tangent = new Float32Array(total * 2 * 2);
  const corner = new Float32Array(total * 2 * 2);
  const color = new Float32Array(total * 2 * 3);
  const index: number[] = [];
  let base = 0;
  for (const { points, colors } of paths) {
    const n = points.length;
    const first = points[0]!;
    const last = points[n - 1]!;
    // O círculo do meio acaba onde começa: aí a junta também é em esquadria, e não há pontas.
    const closed = Math.abs(first[0] - last[0]) < 1e-6 && Math.abs(first[1] - last[1]) < 1e-6;
    const dirTo = (p: readonly [number, number], q: readonly [number, number]): [number, number] => {
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      return [dx / len, dy / len];
    };
    for (let i = 0; i < n; i++) {
      const p = points[i]!;
      const prev = i > 0 ? points[i - 1]! : closed ? points[n - 2]! : null;
      const next = i < n - 1 ? points[i + 1]! : closed ? points[1]! : null;
      const dIn = prev ? dirTo(prev, p) : dirTo(p, next!);
      const dOut = next ? dirTo(p, next) : dIn;
      // A normal da esquadria: a média das duas normais, esticada para a faixa manter a largura (até 3×, nos bicos).
      let mx = -(dIn[1] + dOut[1]);
      let my = dIn[0] + dOut[0];
      const ml = Math.sqrt(mx * mx + my * my) || 1;
      mx /= ml;
      my /= ml;
      const stretch = Math.min(3, 1 / Math.max(1e-3, mx * -dOut[1] + my * dOut[0]));
      const cap = !prev ? -1 : !next ? 1 : 0;
      const tan = cap < 0 ? dOut : dIn;
      const c = colors[Math.min(i, colors.length - 1)]!;
      for (const side of [1, -1]) {
        const v = base + i * 2 + (side > 0 ? 0 : 1);
        position.set([p[0], p[1], 0], v * 3);
        miter.set([mx * stretch, my * stretch], v * 2);
        tangent.set(tan, v * 2);
        corner.set([cap, side], v * 2);
        color.set([(c & 255) / 255, ((c >> 8) & 255) / 255, ((c >> 16) & 255) / 255], v * 3);
      }
      if (i < n - 1) {
        const v = base + i * 2;
        index.push(v, v + 1, v + 3, v, v + 3, v + 2);
      }
    }
    base += n * 2;
  }
  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute('position', new BufferAttribute(position, 3));
  lineGeometry.setAttribute('miter', new BufferAttribute(miter, 2));
  lineGeometry.setAttribute('tangent', new BufferAttribute(tangent, 2));
  lineGeometry.setAttribute('corner', new BufferAttribute(corner, 2));
  lineGeometry.setAttribute('lineColor', new BufferAttribute(color, 3));
  lineGeometry.setIndex(index);
  const lineMaterial = new ShaderMaterial({
    vertexShader: LINE_VERTEX,
    fragmentShader: LINE_FRAGMENT,
    uniforms: { eye: { value: new Vector3() }, fwd: { value: new Vector3() }, pixelsPerUnit: { value: 1 } },
    transparent: true,
    side: DoubleSide,
    depthTest: false,
    depthWrite: false,
  });
  const lines = new Mesh(lineGeometry, lineMaterial);
  lines.renderOrder = 1;
  lines.frustumCulled = false;
  scene.add(lines);
  return {
    scene,
    floorTexture,
    lines,
    dispose() {
      floorGeometry.dispose();
      floorMaterial.dispose();
      floorTexture.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
    },
  };
}

/** Uma só placa gráfica para todas as vistas do jogo (o browser só dá umas poucas dezenas de contextos WebGL). */
export class CourtGpu {
  private readonly renderer: WebGLRenderer;
  private readonly camera = new PerspectiveCamera();
  private readonly venues = new Map<CourtTextures, Venue>();
  private lost = false;
  // O que se desenhou da última vez: com a câmara parada, a imagem já está na tela e não se refaz.
  private last: unknown[] = [];
  private readonly basis = new Matrix4();
  private readonly axes = [new Vector3(), new Vector3(), new Vector3()] as const;
  readonly canvas: HTMLCanvasElement;

  private constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true });
    this.renderer.outputColorSpace = LinearSRGBColorSpace;
    this.renderer.autoClear = true;
    this.camera.matrixAutoUpdate = false;
    // Ao voltar à aplicação no telemóvel, o contexto pode perder-se: até voltar, o jogo desenha o chão no traçador de raios.
    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      this.lost = true;
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
      this.last = [];
    });
  }

  /** A placa gráfica, se o browser tiver WebGL 2; senão `null`, e o jogo fica todo no traçador de raios. */
  static create(): CourtGpu | null {
    if (typeof document === 'undefined') return null;
    try {
      // O three.js só usa WebGL 2: sem ele, o construtor falha.
      return new CourtGpu(document.createElement('canvas'));
    } catch {
      return null;
    }
  }

  /** Prepara um pavilhão (texturas e shaders na placa gráfica) antes do primeiro frame, para o jogo não engasgar ao começar. */
  prepare(t: CourtTextures): void {
    if (this.lost || this.renderer.getContext().isContextLost()) return;
    this.renderer.compile(this.venue(t).scene, this.camera);
  }

  private venue(t: CourtTextures): Venue {
    let venue = this.venues.get(t);
    if (venue) {
      // O mais usado fica no fim: sai primeiro o que há mais tempo não se vê.
      this.venues.delete(t);
      this.venues.set(t, venue);
      return venue;
    }
    venue = buildVenue(t);
    this.venues.set(t, venue);
    // Só ficam os últimos pavilhões, como as texturas (cada um ocupa uns 4 MB na placa gráfica).
    if (this.venues.size > 3) {
      const [oldest, old] = this.venues.entries().next().value!;
      old.dispose();
      this.venues.delete(oldest);
    }
    return venue;
  }

  /**
   * Desenha o chão e as linhas com a câmara do jogo, `width`×`height` píxeis. Com a imagem aproximada (`zoom` e `shift`, em
   * píxeis da arte, como a transformação da tela 2D), mostra só essa parte, à resolução toda. Devolve a tela, ou `null`.
   */
  draw(view: Camera, t: CourtTextures, width: number, height: number, zoom = 1, shift: readonly [number, number] = [0, 0]): HTMLCanvasElement | null {
    // O evento da perda só chega depois: no próprio frame, pergunta-se ao contexto.
    if (this.lost || this.renderer.getContext().isContextLost()) return null;
    const venue = this.venue(t);
    const pose = view.pose();
    const key = [venue, width, height, zoom, shift[0], shift[1], ...pose.position, pose.focal, pose.width, pose.height, ...pose.fwd];
    if (key.length === this.last.length && key.every((v, i) => v === this.last[i])) return this.canvas;
    this.last = key;
    if (this.canvas.width !== width || this.canvas.height !== height) this.renderer.setSize(width, height, false);
    const unit = height / pose.height;
    // A mesma lente: `focal` píxeis da arte para uma unidade à distância 1, por isso o ângulo vertical sai da altura da tela.
    this.camera.fov = (2 * Math.atan(pose.height / 2 / pose.focal) * 180) / Math.PI;
    this.camera.aspect = pose.width / pose.height;
    this.camera.near = 0.1;
    this.camera.far = 400;
    // A aproximação: a imagem inteira fica `zoom` vezes maior e só se vê a janela que começa em -shift.
    if (zoom !== 1) this.camera.setViewOffset(pose.width * zoom, pose.height * zoom, -shift[0], -shift[1], pose.width, pose.height);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    const [px, py, pz] = pose.position;
    const [right, up, back] = this.axes;
    this.basis.makeBasis(right.set(...pose.right), up.set(...pose.up), back.set(-pose.fwd[0], -pose.fwd[1], -pose.fwd[2]));
    this.camera.matrix.copy(this.basis).setPosition(px, py, pz);
    this.camera.matrixWorld.copy(this.camera.matrix);
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
    const u = venue.lines.material.uniforms;
    (u.eye!.value as Vector3).set(px, py, pz);
    (u.fwd!.value as Vector3).set(...pose.fwd);
    u.pixelsPerUnit!.value = pose.focal * unit;
    this.renderer.render(venue.scene, this.camera);
    return this.canvas;
  }
}

let shared: CourtGpu | null | undefined;
let enabled = true;
/** A placa gráfica partilhada, criada à primeira vez; `null` sem WebGL 2 ou desligada. */
export function courtGpu(): CourtGpu | null {
  if (!enabled) return null;
  if (shared === undefined) shared = CourtGpu.create();
  return shared;
}

/** Liga ou desliga a placa gráfica: desligada, o cenário fica todo no traçador de raios (para comparar e como reserva). */
export function useCourtGpu(on: boolean): void {
  enabled = on;
}
