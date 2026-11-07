// Clubes guardados por versões antigas do jogo, gerados com o código de cada versão (ver src/ui/saves/).
// Um save antigo tem de continuar a abrir: perder o clube de alguém é o pior erro que o jogo pode ter.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseClub } from './club.ts';

const dir = new URL('./saves/', import.meta.url);
const files = readdirSync(dir).filter(name => name.endsWith('.json'));

describe('clubes guardados por versões antigas', () => {
  it('há saves de exemplo', () => expect(files.length).toBeGreaterThan(5));
  for (const name of files) {
    it(`${name} abre na versão atual e volta a guardar-se igual`, () => {
      const text = readFileSync(new URL(name, dir), 'utf8');
      const old = JSON.parse(text) as { team: { name: string } };
      const club = parseClub(text);
      expect(club).not.toBeNull();
      expect(club!.team.name).toBe(old.team.name);
      expect(parseClub(JSON.stringify(club))).toEqual(club);
    });
  }
});
