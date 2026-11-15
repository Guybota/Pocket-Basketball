import { describe, expect, it } from 'vitest';
import { figureImage, figureSvg, portraitSvgImage } from './figure-svg.ts';
import { DEFAULT_KITS } from './kit.ts';
import { KITS, type KitName, type Look } from './sprites.ts';

const base: Look = { kit: 'blue', custom: DEFAULT_KITS[2], skin: 1, hair: 2, style: 0, legs: 6, torso: 6, build: 'athletic', face: 123456 };

describe('figureSvg', () => {
  it('é determinista e não tem números estragados', () => {
    for (let style = 0; style < 5; style++) {
      for (const build of ['slim', 'athletic', 'muscular', 'heavy'] as const) {
        const look = { ...base, style, build, face: 1000 + style * 77 };
        const svg = figureSvg(look);
        expect(svg).toBe(figureSvg(look));
        expect(svg).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  it('muda com a altura, o escurecido e o número', () => {
    const svg = figureSvg(base);
    expect(figureSvg(base, { height: 1 })).not.toBe(figureSvg(base, { height: 3 }));
    expect(figureSvg(base, { trained: true })).not.toBe(svg);
    expect(figureSvg(base, { number: 7 })).not.toBe(figureSvg(base, { number: 8 }));
  });

  it('dá uma imagem em data URL, guardada em cache', () => {
    const url = figureImage(base);
    expect(url.startsWith('data:image/svg+xml')).toBe(true);
    expect(figureImage(base)).toBe(url);
  });
});

describe('portraitSvgImage', () => {
  it('cobre todos os equipamentos e as quatro expressões, sem números estragados', () => {
    for (const kit of Object.keys(KITS) as KitName[]) {
      const look: Look = { ...base, kit, custom: undefined };
      const urls = (['neutral', 'happy', 'worried', 'sad'] as const).map(mood => portraitSvgImage(look, mood));
      expect(new Set(urls).size).toBe(4);
      for (const url of [...urls, portraitSvgImage(look, 'neutral', true)]) {
        expect(url.startsWith('data:image/svg+xml')).toBe(true);
        expect(url).not.toMatch(/NaN|undefined|Infinity|"/);
      }
    }
  });
});
