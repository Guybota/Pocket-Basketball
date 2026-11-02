import type { Attributes } from '../../sim/types.ts';
import { INK } from './palette.ts';

/* ---------- Ícones, desenhados aqui para serem nossos ---------- */
export function iconFrom(rows: readonly string[], color: string, back: string | null, size = 16): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d')!;
  if (back) {
    g.fillStyle = back;
    g.fillRect(0, 0, size, size);
  }
  const offX = Math.floor((size - rows[0]!.length) / 2);
  const offY = Math.floor((size - rows.length) / 2);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = ch === '#' ? color : ch === 'o' ? '#e8622a' : INK;
      g.fillRect(offX + x, offY + y, 1, 1);
    });
  });
  return canvas.toDataURL();
}

const ATTRIBUTE_PIXELS: Record<keyof Attributes, readonly [readonly string[], string, string]> = {
  shooting: [['..oo.###', '.oooo#.#', '.oooo###', '..oo..#.', '.....#..', '...##...', '.##.....'], '#ffffff', '#7246c4'],
  speed: [['#..#....', '##.##...', '.##.##..', '..##.##.', '.##.##..', '##.##...', '#..#....'], '#ffffff', '#2f9b6a'],
  stamina: [['...##...', '.######.', '.#....#.', '.#.##.#.', '.#.##.#.', '.#.##.#.', '.#.##.#.', '.######.'], '#ffffff', '#d9772b'],
  technique: [['..####..', '.#.##.#.', '#..##..#', '########', '#..##..#', '.#.##.#.', '..####..'], '#ffffff', '#3a4252'],
  strength: [['##....##', '##....##', '########', '########', '##....##', '##....##'], '#1b2230', '#f2c230'],
  jumping: [['...##...', '..####..', '.######.', '...##...', '...##...', '...##...', '########'], '#ffffff', '#2b8fd0'],
  willpower: [['.##..##.', '########', '########', '.######.', '..####..', '...##...'], '#cf3a2c', '#f4e0d8'],
};
const iconCache = new Map<string, string>();

/** O ícone de um atributo, desenhado na primeira vez que é pedido: assim os testes sem browser podem importar quem o usa. */
export function attributeIcon(key: keyof Attributes): string {
  let url = iconCache.get(key);
  if (!url) {
    const [rows, color, back] = ATTRIBUTE_PIXELS[key];
    url = iconFrom(rows, color, back);
    iconCache.set(key, url);
  }
  return url;
}
