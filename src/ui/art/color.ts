// Matemática de cor para decidir se duas camisolas se confundem: Oklab (Ottosson) e simulação de daltonismo
// (Machado 2009, severidade 1,0, em RGB linear). Ver `cor.md` §11.2 e §11.6.
type Vec3 = [number, number, number];

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearRgb = (hex: string): Vec3 => [1, 3, 5].map(i => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255)) as Vec3;

function oklab([r, g, b]: Vec3): Vec3 {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const VISIONS = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
} as const;
export type Vision = keyof typeof VISIONS;
export const VISION_LIST = Object.keys(VISIONS) as Vision[];

/** A cor em Oklab, como a vê quem tem visão normal ou o tipo de daltonismo indicado. */
export function oklabOf(hex: string, vision?: Vision): Vec3 {
  const c = linearRgb(hex);
  if (!vision) return oklab(c);
  return oklab(VISIONS[vision].map(row => Math.min(1, Math.max(0, row[0] * c[0] + row[1] * c[1] + row[2] * c[2]))) as Vec3);
}

/** Distância perceptual ΔE em Oklab. */
export function deltaE(x: string, y: string, vision?: Vision): number {
  const p = oklabOf(x, vision);
  const q = oklabOf(y, vision);
  return Math.sqrt((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2);
}

/** Limiares de `cor.md` §11.6: claro contra escuro chega; senão a cor tem de se ver com e sem daltonismo. */
export const CLASH = { lightness: 0.25, normal: 0.15, simulated: 0.12 } as const;

/** As duas cores confundem-se em campo, com visão normal ou com algum dos três tipos de daltonismo. */
export function teamsClash(x: string, y: string): boolean {
  if (Math.abs(oklabOf(x)[0] - oklabOf(y)[0]) >= CLASH.lightness) return false;
  if (deltaE(x, y) < CLASH.normal) return true;
  return VISION_LIST.some(v => deltaE(x, y, v) < CLASH.simulated);
}
