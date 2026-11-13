// Os bonecos na placa gráfica: cada um é um retângulo no sítio e com o tamanho que a tela 2D lhe daria (`spriteQuad`), mas
// com a profundidade dos pés no mundo. Assim fica à frente ou atrás das peças 3D do cenário (bancadas, guarda-corpos) como
// no mundo, e entre bonecos ganha o mais perto da câmara. A imagem é a mesma do jogo, lida com os texels nítidos.
import { BufferAttribute, BufferGeometry, CanvasTexture, LinearFilter, Matrix4, Mesh, Scene, ShaderMaterial, Vector2, Vector3, Vector4 } from 'three';
import type { SpriteQuad } from '../art/sprites.ts';

/** Um boneco para a placa gráfica: o retângulo da tela 2D (em píxeis da arte, antes da aproximação) e os pés no mundo. */
export interface WorldSprite extends SpriteQuad {
  feet: readonly [number, number, number];
}

/**
 * Quanto o boneco se aproxima da câmara, em metros. O boneco é um cartão em pé: em baixo à profundidade dos pés, em cima à
 * de um ponto TOP metros acima deles. O espelho do degrau logo atrás, visto de lado, chegava a ficar mais perto do que o
 * cartão e cortava-o na diagonal (as mãos no ar). Fica bem abaixo da profundidade de uma fila (~0,9 m num degrau de 1,3 m),
 * para a fila da frente e o que estiver à frente dos pés (um guarda-corpos) continuarem à frente.
 */
const FEET_BIAS = 0.6;
const TOP = 1.8;
/** Quantas imagens de bonecos ficam na placa gráfica; as que há mais tempo não se usam saem. */
const TEXTURES = 1500;

const SPRITE_VERTEX = /* glsl */ `
uniform vec4 rect;
uniform vec3 feet;
uniform mat4 vp;
uniform float flip;
varying vec2 vUv;
void main() {
  vec4 low = vp * vec4(feet, 1.0);
  vec4 high = vp * vec4(feet + vec3(0.0, 0.0, ${TOP.toFixed(2)}), 1.0);
  vec2 p = mix(rect.xy, rect.zw, position.xy);
  gl_Position = vec4(p, clamp(mix(low.z / low.w, high.z / high.w, position.y), -1.0, 1.0), 1.0);
  vUv = vec2(flip > 0.5 ? 1.0 - position.x : position.x, position.y);
}`;

// Texels nítidos (a borda entre dois num só píxel do ecrã). O que fica e o que sai decide-se pelo texel em que o píxel cai,
// como na tela 2D: com o alfa filtrado, o contorno ficava um píxel mais fino de um lado.
const SPRITE_FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform vec2 size;
varying vec2 vUv;
void main() {
  vec2 t = vUv * size;
  ivec2 texel = clamp(ivec2(floor(t)), ivec2(0), ivec2(size) - 1);
  if (texelFetch(map, texel, 0).a < 0.5) discard;
  vec2 fw = clamp(fwidth(t), vec2(1e-4), vec2(1.0));
  vec2 seam = floor(t + 0.5);
  vec2 sharp = seam + clamp((t - seam) / fw, -0.5, 0.5);
  gl_FragColor = vec4(texture2D(map, sharp / size).rgb, 1.0);
}`;

export class SpriteLayer {
  readonly scene = new Scene();
  private readonly geometry = new BufferGeometry();
  private readonly meshes: Mesh<BufferGeometry, ShaderMaterial>[] = [];
  private readonly textures = new Map<HTMLCanvasElement, CanvasTexture>();
  private readonly vp = new Matrix4();
  private readonly toEye = new Vector3();

  constructor() {
    // Dois triângulos, de (0, 0) a (1, 1).
    this.geometry.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0]), 3));
  }

  private texture(image: HTMLCanvasElement): CanvasTexture {
    let texture = this.textures.get(image);
    if (texture) {
      this.textures.delete(image);
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

  /**
   * Põe os bonecos desta imagem. `artW`×`artH` é a tela em píxeis da arte; `zoom` e `shift` a aproximação, como na tela 2D;
   * `vp` a projeção da câmara three.js, e `eye` onde ela está.
   */
  set(list: readonly WorldSprite[], artW: number, artH: number, zoom: number, shift: readonly [number, number], vp: Matrix4, eye: Vector3): void {
    this.vp.copy(vp);
    while (this.meshes.length < list.length) {
      const material = new ShaderMaterial({
        vertexShader: SPRITE_VERTEX,
        fragmentShader: SPRITE_FRAGMENT,
        uniforms: { rect: { value: new Vector4() }, feet: { value: new Vector3() }, vp: { value: this.vp }, flip: { value: 0 }, map: { value: null }, size: { value: new Vector2() } },
        depthTest: true,
        depthWrite: true,
      });
      const mesh = new Mesh(this.geometry, material);
      mesh.frustumCulled = false;
      this.meshes.push(mesh);
      this.scene.add(mesh);
    }
    const ndcX = (x: number): number => ((x * zoom + shift[0]) / artW) * 2 - 1;
    const ndcY = (y: number): number => 1 - ((y * zoom + shift[1]) / artH) * 2;
    this.meshes.forEach((mesh, i) => {
      const s = list[i];
      mesh.visible = s !== undefined;
      if (!s) return;
      const u = mesh.material.uniforms;
      (u.rect!.value as Vector4).set(ndcX(s.left), ndcY(s.top + s.height), ndcX(s.left + s.width), ndcY(s.top));
      // Os pés um pouco mais perto da câmara: o boneco fica todo à profundidade dos pés, e o degrau onde assenta não o corta.
      this.toEye.set(eye.x - s.feet[0], eye.y - s.feet[1], eye.z - s.feet[2]).normalize().multiplyScalar(FEET_BIAS);
      (u.feet!.value as Vector3).set(s.feet[0] + this.toEye.x, s.feet[1] + this.toEye.y, s.feet[2] + this.toEye.z);
      u.flip!.value = s.flip ? 1 : 0;
      u.map!.value = this.texture(s.image);
      (u.size!.value as Vector2).set(s.image.width, s.image.height);
    });
  }

  dispose(): void {
    this.geometry.dispose();
    for (const mesh of this.meshes) mesh.material.dispose();
    for (const texture of this.textures.values()) texture.dispose();
  }
}
