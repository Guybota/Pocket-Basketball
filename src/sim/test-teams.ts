// As equipas dos testes da simulação, num só sítio. Os testes de equilíbrio dependem delas: não as mudes.
import { generateTeam } from './teamgen.ts';
import type { Attributes } from './types.ts';

export const home = generateTeam(1, 'Vilar BC', 55);
export const away = generateTeam(2, 'Ribeirinha BC', 55);
export const flat = (value: number): Attributes => ({
  shooting: value, speed: value, stamina: value, technique: value, strength: value, jumping: value, willpower: value,
});
