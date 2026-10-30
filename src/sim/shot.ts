import { BALANCE as B } from './balance.ts';
import type { Attributes } from './types.ts';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Probabilidade base de cesto, só pela distância ao cesto. */
export function baseChance(distanceToHoop: number, three: boolean): number {
  if (three) return B.threeChance - Math.max(0, distanceToHoop - 6.75) * B.threeFalloffPerMeter;
  if (distanceToHoop <= B.rimDistance) return B.rimChance;
  if (distanceToHoop <= B.midDistance) {
    return lerp(B.rimChance, B.midChance, (distanceToHoop - B.rimDistance) / (B.midDistance - B.rimDistance));
  }
  return lerp(B.midChance, B.longChance, clamp((distanceToHoop - B.midDistance) / (6.75 - B.midDistance), 0, 1));
}

export interface ShotContext {
  distanceToHoop: number;
  three: boolean;
  pressure: number;
  fatigue: number;
  clutch: boolean;
  away: boolean;
}

/** Perto do cesto conta a força, o salto e a técnica. Longe conta o lançamento. */
export function shotChance(attributes: Attributes, context: ShotContext): number {
  const close = context.distanceToHoop <= B.midDistance;
  const skill = close
    ? attributes.technique * 0.2 + attributes.strength * 0.4 + attributes.jumping * 0.4
    : attributes.shooting;
  const will = attributes.willpower / 20 - B.skillPivot;
  let chance = baseChance(context.distanceToHoop, context.three);
  chance += (close ? B.closeSkillSlope : B.farSkillSlope) * (skill / 20 - B.skillPivot);
  chance -= B.pressurePenalty * context.pressure * (1 - B.composureSlope * will);
  chance -= B.fatiguePenalty * context.fatigue;
  if (context.clutch) chance += B.clutchSlope * will;
  if (context.away) chance += B.awaySlope * will;
  return clamp(chance, B.minChance, B.maxChance);
}

export function freeThrowChance(attributes: Attributes): number {
  const skill = (attributes.shooting * 0.4 + attributes.willpower * 0.6) / 20;
  return clamp(B.freeThrowBase + B.freeThrowSlope * skill, B.minChance, B.maxChance);
}
