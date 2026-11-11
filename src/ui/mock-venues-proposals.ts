import { THEMES } from './art/court.ts';
import type { Proposal } from './mock-venues.ts';

export const PROPOSALS: readonly Proposal[] = [
  { id: 'teste', title: 'Teste', division: 'Pro Liga 1', note: 'Só para ver a maqueta.', theme: { ...THEMES[3]!, name: 'teste' } },
];
