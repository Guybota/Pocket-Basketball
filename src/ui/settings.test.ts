import { describe, expect, it } from 'vitest';
import { parseSettings } from './settings.ts';

describe('definições', () => {
  it('sem nada guardado, ou com lixo, ficam as de origem', () => {
    const defaults = parseSettings(null);
    expect(defaults).toEqual({ master: 1, effects: 1, music: 1, muted: false, bigText: false, highContrast: false, motion: 'auto' });
    expect(parseSettings('não é json')).toEqual(defaults);
    expect(parseSettings('[1,2]')).toEqual(defaults);
  });

  it('guarda o que é válido e ignora o resto', () => {
    const saved = parseSettings(JSON.stringify({ master: 0.5, effects: 7, music: '0.2', muted: true, bigText: true, highContrast: 1, motion: 'reduce' }));
    expect(saved).toEqual({ master: 0.5, effects: 1, music: 1, muted: true, bigText: true, highContrast: false, motion: 'reduce' });
    expect(parseSettings(JSON.stringify({ motion: 'rápido' })).motion).toBe('auto');
  });
});
