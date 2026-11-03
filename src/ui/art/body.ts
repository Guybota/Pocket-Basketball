import type { Build } from './sprites.ts';

export const BUILD_NAMES: Record<Build, string> = { slim: 'Magro', athletic: 'Atlético', muscular: 'Musculado', heavy: 'Pesado' };

/** Regra proposta para o tipo de corpo. Usa o índice de massa corporal, corrigido pela força. */
export function buildOf(heightCm: number, weightKg: number, strength: number): Build {
  const meters = heightCm / 100;
  const bmi = weightKg / (meters * meters);
  if (bmi >= 28) return strength >= 65 ? 'muscular' : 'heavy';
  if (bmi < 21.5) return 'slim';
  return strength >= 72 ? 'muscular' : 'athletic';
}

/** Cada 7,5 cm valem um píxel: 170 cm são 22 px, 200 cm são 26 px. As pernas crescem primeiro. */
export function pixelsForHeight(heightCm: number): { legs: number; torso: number } {
  const total = Math.max(20, Math.min(30, Math.round(22 + (heightCm - 170) / 7.5)));
  const body = total - 12;
  return { legs: Math.ceil(body / 2), torso: Math.floor(body / 2) };
}
