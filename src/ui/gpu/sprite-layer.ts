// O que se mexe no mundo, na placa gráfica: bonecos, bola, sombras, reflexos, cestos, bandeiras. Cada coisa é um retângulo no
// sítio e com o tamanho que a tela 2D lhe daria (`spriteQuad`, ou a caixa de um desenho copiado), mas com a profundidade do
// sítio onde está no mundo. Assim fica à frente ou atrás das peças 3D do cenário (bancadas, guarda-corpos) como no mundo, e
// entre si ganha o mais perto da câmara. A imagem é a mesma do jogo, lida com os texels nítidos.
import { BufferAttribute, BufferGeometry, CanvasTexture, LinearFilter, Matrix4, Mesh, Scene, ShaderMaterial, Vector2, Vector3, Vector4 } from 'three';
import type { SpriteQuad } from '../art/sprites.ts';

/** Uma coisa para a placa gráfica: o retângulo da tela 2D (em píxeis da arte, antes da aproximação) e o sítio no mundo. */
export interface WorldSprite extends SpriteQuad {
  /** Onde assenta no mundo (os pés de um boneco, o centro da bola, a base de um cesto). */
  feet: readonly [number, number, number];
  /** Meio transparente (sombras, reflexos, pó): esta opacidade, por cima do que estiver atrás e sem tapar o que vem depois.
   * Sem isto, é recortado: cada texel fica ou sai, e tapa o que estiver mais longe. */
  alpha?: number;
  /** Virado de cima para baixo (o reflexo no chão). */
  mirror?: boolean;
  /** Toda à profundidade de `feet`; sem isto, é um cartão em pé, com a de cima `TOP` metros acima. */
  flat?: boolean;
  /** A altura do cartão em pé, em metros, em vez de `TOP` (a cara de um objeto, que só sobe o que ele tem). */
  tall?: number;
  /** Quanto se aproxima da câmara, em metros, em vez de `FEET_BIAS` (as sombras e os reflexos ficam atrás de quem os faz). */
  bias?: number;
  /** A imagem muda de imagem para imagem (um desenho copiado): volta a ir para a placa gráfica. */
  dynamic?: boolean;
  /** Só o canto de baixo à esquerda da imagem, com esta largura e altura em texels (uma tela reaproveitada maior). */
  used?: readonly [number, number];
}

/**
 * Quanto o boneco se aproxima da câmara, em metros. O boneco é um cartão em pé: em baixo à profundidade dos pés, em cima à
 * de um ponto TOP metros acima deles. O espelho do degrau logo atrás, visto de lado, chegava a ficar mais perto do que o
 * cartão e cortava-o na diagonal (as mãos no ar). Fica bem abaixo da profundidade de uma fila (~0,9 m num degrau de 1,3 m),
 * para a fila da frente e o que estiver à frente dos pés (um guarda-corpos) continuarem à frente.
 */
const FEET_BIAS = 0.6;
const TOP = 1.8;
/** Quantas imagens ficam na placa gráfica; as que há mais tempo não se usam saem. */
const TEXTURES = 1500;

const SPRITE_VERTEX = /* glsl */ `
uniform vec4 rect;
uniform vec3 feet;
uniform mat4 vp;
uniform float flip;
uniform float mirror;
uniform float upright;
uniform float tall;
varying vec2 vUv;
void main() {
  vec4 low = vp * vec4(feet, 1.0);
  vec4 high = vp * vec4(feet + vec3(0.0, 0.0, tall), 1.0);
  vec2 p = mix(rect.xy, rect.zw, position.xy);
  float z = mix(low.z / low.w, high.z / high.w, position.y * upright);
  gl_Position = vec4(p, clamp(z, -1.0, 1.0), 1.0);
  vUv = vec2(flip > 0.5 ? 1.0 - position.x : position.x, mirror > 0.5 ? 1.0 - position.y : position.y);
}`;

// Texels nítidos (a borda entre dois num só píxel do ecrã). Recortado, o que fica e o que sai decide-se pelo texel em que o
// píxel cai, como na tela 2D: com o alfa filtrado, o contorno ficava um píxel mais fino de um lado.
const SPRITE_FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform vec2 size;
uniform vec2 used;
uniform float alpha;
varying vec2 vUv;
void main() {
  vec2 t = vUv * used;
  vec2 fw = clamp(fwidth(t), vec2(1e-4), vec2(1.0));
  vec2 seam = floor(t + 0.5);
  vec2 sharp = seam + clamp((t - seam) / fw, -0.5, 0.5);
  vec4 c = texture2D(map, sharp / size);
  if (alpha < 0.0) {
    ivec2 texel = clamp(ivec2(floor(t)), ivec2(0), ivec2(used) - 1);
    if (texelFetch(map, texel, 0).a < 0.5) discard;
    gl_FragColor = vec4(c.rgb, 1.0);
  } else {
    float a = c.a * alpha;
    if (a < 0.004) discard;
    // A cor guardada na tela vem dividida pelo alfa; aqui junta-se outra vez com ele.
    gl_FragColor = vec4(c.rgb, a);
  }
}`;

type SpriteMesh = Mesh<BufferGeometry, ShaderMaterial>;

export class SpriteLayer {
  readonly scene = new Scene();
  private readonly geometry = new BufferGeometry();
  // Os recortados escrevem a profundidade; os meio transparentes não, e desenham-se depois, do mais longe para o mais perto.
  private readonly solid: SpriteMesh[] = [];
  private readonly clear: SpriteMesh[] = [];
  private readonly textures = new Map<HTMLCanvasElement, CanvasTexture>();
  private readonly vp = new Matrix4();
  private readonly toEye = new Vector3();

  constructor() {
    // Dois triângulos, de (0, 0) a (1, 1).
    this.geometry.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0]), 3));
  }

  private texture(image: HTMLCanvasElement, dynamic: boolean): CanvasTexture {
    let texture = this.textures.get(image);
    if (texture) {
      this.textures.delete(image);
      if (dynamic) texture.needsUpdate = true;
    } else {
      texture = new CanvasTexture(image);
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearFilter;
      texture.generateMipmaps = false;
      if (this.textures.size >= TEXTURES) {
        const [oldest, old] = this.textures.entries().next().value!;
        old.dispose();
        this.textures.delete(oldest);
      }
    }
    // O mais usado fica no fim: sai primeiro o que há mais tempo não se vê.
    this.textures.set(image, texture);
    return texture;
  }

  private mesh(pool: SpriteMesh[], i: number, transparent: boolean): SpriteMesh {
    let mesh = pool[i];
    if (!mesh) {
      const material = new ShaderMaterial({
        vertexShader: SPRITE_VERTEX,
        fragmentShader: SPRITE_FRAGMENT,
        uniforms: {
          rect: { value: new Vector4() },
          feet: { value: new Vector3() },
          vp: { value: this.vp },
          flip: { value: 0 },
          mirror: { value: 0 },
          upright: { value: 1 },
          tall: { value: 1.8 },
          map: { value: null },
          size: { value: new Vector2() },
          used: { value: new Vector2() },
          alpha: { value: -1 },
        },
        transparent,
        depthTest: true,
        depthWrite: !transparent,
      });
      mesh = new Mesh(this.geometry, material);
      mesh.frustumCulled = false;
      pool.push(mesh);
      this.scene.add(mesh);
    }
    return mesh;
  }

  /**
   * Põe o que se desenha nesta imagem. `artW`×`artH` é a tela em píxeis da arte; `zoom` e `shift` a aproximação, como na
   * tela 2D; `vp` a projeção da câmara three.js, e `eye` onde ela está.
   */
  set(list: readonly WorldSprite[], artW: number, artH: number, zoom: number, shift: readonly [number, number], vp: Matrix4, eye: Vector3): void {
    this.vp.copy(vp);
    const ndcX = (x: number): number => ((x * zoom + shift[0]) / artW) * 2 - 1;
    const ndcY = (y: number): number => 1 - ((y * zoom + shift[1]) / artH) * 2;
    const distance = (s: WorldSprite): number => (eye.x - s.feet[0]) ** 2 + (eye.y - s.feet[1]) ** 2 + (eye.z - s.feet[2]) ** 2;
    const solid = list.filter(s => s.alpha === undefined);
    // Do mais longe para o mais perto; a empatar, pela ordem em que vieram (a da tela 2D).
    const clear = list.map((s, i) => ({ s, i })).filter(({ s }) => s.alpha !== undefined).sort((a, b) => distance(b.s) - distance(a.s) || a.i - b.i).map(({ s }) => s);
    const place = (mesh: SpriteMesh, s: WorldSprite, order: number): void => {
      mesh.visible = true;
      mesh.renderOrder = order;
      const u = mesh.material.uniforms;
      (u.rect!.value as Vector4).set(ndcX(s.left), ndcY(s.top + s.height), ndcX(s.left + s.width), ndcY(s.top));
      // Um pouco mais perto da câmara: o degrau onde o boneco assenta não o corta.
      this.toEye.set(eye.x - s.feet[0], eye.y - s.feet[1], eye.z - s.feet[2]).normalize().multiplyScalar(s.bias ?? FEET_BIAS);
      (u.feet!.value as Vector3).set(s.feet[0] + this.toEye.x, s.feet[1] + this.toEye.y, s.feet[2] + this.toEye.z);
      u.flip!.value = s.flip ? 1 : 0;
      u.mirror!.value = s.mirror ? 1 : 0;
      u.upright!.value = s.flat ? 0 : 1;
      u.tall!.value = s.tall ?? TOP;
      u.alpha!.value = s.alpha ?? -1;
      u.map!.value = this.texture(s.image, s.dynamic === true);
      (u.size!.value as Vector2).set(s.image.width, s.image.height);
      (u.used!.value as Vector2).set(s.used?.[0] ?? s.image.width, s.used?.[1] ?? s.image.height);
    };
    solid.forEach((s, i) => place(this.mesh(this.solid, i, false), s, 0));
    clear.forEach((s, i) => place(this.mesh(this.clear, i, true), s, 1 + i));
    for (let i = solid.length; i < this.solid.length; i++) this.solid[i]!.visible = false;
    for (let i = clear.length; i < this.clear.length; i++) this.clear[i]!.visible = false;
  }

  /** Esquece a textura de uma imagem que já não se vai usar (uma tela trocada por outra maior). */
  forget(image: HTMLCanvasElement): void {
    this.textures.get(image)?.dispose();
    this.textures.delete(image);
  }

  dispose(): void {
    this.geometry.dispose();
    for (const mesh of [...this.solid, ...this.clear]) mesh.material.dispose();
    for (const texture of this.textures.values()) texture.dispose();
  }
}
