import type { Attributes } from '../../sim/types.ts';
import { text } from './font.ts';
import { INK } from './palette.ts';

/* ---------- Ícones, desenhados aqui para serem nossos ---------- */
export function iconFrom(rows: readonly string[], color: string, back: string | null, size = 16): string {
  return iconCanvas(rows, color, back, size).toDataURL();
}

function iconCanvas(rows: readonly string[], color: string, back: string | null, size: number): HTMLCanvasElement {
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
  return canvas;
}

// A estrela das opções de ataque, com contorno: dourada para a primeira, prateada para a segunda.
const OPTION_STAR = ['....x....', '...x#x...', '...x#x...', 'xxxx#xxxx', 'x#######x', '.x#####x.', '..x###x..', '.x##x##x.', '.xx...xx.'];
const optionStars: string[] = [];
export function optionStar(rank: 0 | 1): string {
  return (optionStars[rank] ??= iconFrom(OPTION_STAR, rank === 0 ? '#f2c230' : '#c9d1db', null, 9));
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

// A energia no jogo: uma pilha, verde, para o cabeçalho das trocas, que não tem largura para a palavra.
const ENERGY_PIXELS = ['..##..', '######', '#....#', '#.##.#', '#.##.#', '#....#', '######'];
export function energyIcon(): string {
  let url = iconCache.get('energy');
  if (!url) {
    url = iconFrom(ENERGY_PIXELS, '#ffffff', '#2f7d4a');
    iconCache.set('energy', url);
  }
  return url;
}

// Os botões do treinador durante o jogo, só com ícones: pausa e play, som ligado e desligado, o relógio do desconto
// (o número de descontos vai por cima, em texto), as setas das trocas e a prancheta das táticas.
const CONTROL_PIXELS = {
  pause: ['###..###', '###..###', '###..###', '###..###', '###..###', '###..###', '###..###', '###..###', '###..###'],
  play: ['##.......', '####.....', '######...', '########.', '#########', '########.', '######...', '####.....', '##.......'],
  sound: ['...##......', '..###..#...', '.####...#..', '#####.#..#.', '#####..#.#.', '#####.#..#.', '.####...#..', '..###..#...', '...##......'],
  muted: ['...##......', '..###......', '.####..#.#.', '#####...#..', '#####..#.#.', '#####......', '.####......', '..###......', '...##......'],
  // O relógio é um círculo de 13, ímpar, com a coroa em cima: assim um algarismo de 3 píxeis fica mesmo ao centro.
  clock: ['....#####....', '.....###.....', '....#####....', '..##.....##..', '.#.........#.', '.#.........#.', '#...........#', '#...........#', '#...........#', '#...........#', '#...........#', '.#.........#.', '.#.........#.', '..##.....##..', '....#####....'],
  // A prancheta: 12 de largura e 16 de altura, a ocupar o ícone todo; a mola é um bloco cheio a cavalo da borda de cima (uma asa em arco parecia um saco de compras).
  // Voltar: uma seta para a esquerda; combos: um livro aberto; treinar: um haltere.
  back: ['.....##.', '....##..', '...##...', '..##....', '.##.....', '########', '.##.....', '..##....', '...##...', '....##..', '.....##.'],
  book: ['......#......', '..####.####..', '.#....#....#.', '.#.##.#.##.#.', '.#....#....#.', '.#.##.#.##.#.', '.#....#....#.', '.#.##.#.##.#.', '.#....#....#.', '..####.####..', '......#......'],
  train: ['##.........##', '##.........##', '##.##...##.##', '##.##...##.##', '##.#######.##', '##.##...##.##', '##.##...##.##', '##.........##', '##.........##'],
  // Ecrã inteiro: quatro cantos para fora; e, para sair, quatro cantos para dentro.
  fullscreen: ['####....####', '####....####', '##........##', '##........##', '............', '............', '............', '............', '##........##', '##........##', '####....####', '####....####'],
  windowed: ['..##....##..', '..##....##..', '####....####', '####....####', '............', '............', '............', '............', '####....####', '####....####', '..##....##..', '..##....##..'],
  board: ['....####....', '############', '#...####...#', '#..........#', '#.######...#', '#..........#', '#.########.#', '#..........#', '#.######...#', '#..........#', '#.########.#', '#..........#', '#.######...#', '#..........#', '#..........#', '############'],
} as const;
export type ControlIcon = keyof typeof CONTROL_PIXELS;
export function controlIcon(kind: ControlIcon): string {
  let url = iconCache.get(`control:${kind}`);
  if (!url) {
    url = iconFrom(CONTROL_PIXELS[kind], INK, null, 16);
    iconCache.set(`control:${kind}`, url);
  }
  return url;
}

// As setas das trocas: uma verde a subir e uma vermelha a descer, altas e juntas, num só ícone.
const ARROW_UP = ['..##..', '.####.', '######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..'];
const ARROW_DOWN = [...ARROW_UP].reverse();
export function subsIcon(): string {
  let url = iconCache.get('subs');
  if (!url) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const g = canvas.getContext('2d')!;
    const plot = (rows: readonly string[], color: string, offX: number, offY: number): void => {
      g.fillStyle = color;
      rows.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && g.fillRect(offX + x, offY + y, 1, 1)));
    };
    plot(ARROW_UP, '#2f9b6a', 1, 1);
    plot(ARROW_DOWN, '#cf3a2c', 9, 2);
    url = canvas.toDataURL();
    iconCache.set('subs', url);
  }
  return url;
}

/** O botão da velocidade do jogo: «X1», «X2» ou «X4». */
export function speedIcon(speed: number): string {
  const key = `speed:${speed}`;
  let url = iconCache.get(key);
  if (!url) {
    // «X1», «X2», «X4» na letra do jogo, a 2×: 14 por 10 píxeis, ao centro do ícone de 16.
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    text(canvas.getContext('2d')!, `X${speed}`, 1, 3, INK, 2);
    url = canvas.toDataURL();
    iconCache.set(key, url);
  }
  return url;
}

/** O relógio do desconto com os descontos que restam ao centro do mostrador; com zero, só o relógio. */
export function clockIcon(count: number): string {
  const key = `clock:${count}`;
  let url = iconCache.get(key);
  if (!url) {
    const canvas = iconCanvas(CONTROL_PIXELS.clock, INK, null, 16);
    if (count > 0) text(canvas.getContext('2d')!, String(count), 6, 6, INK, 1);
    url = canvas.toDataURL();
    iconCache.set(key, url);
  }
  return url;
}

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

/** A altura (1 a 3) em três barras que sobem, como as do sinal: cheias a dourado até ao nível, as outras vazias. 16×16, da altura das caixas das notas. */
export function heightIcon(level: number): string {
  const key = `height:${level}`;
  let url = iconCache.get(key);
  if (!url) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const g = canvas.getContext('2d')!;
    [6, 11, 16].forEach((h, i) => {
      const x = 1 + i * 5;
      g.fillStyle = INK;
      g.fillRect(x, 16 - h, 4, h);
      g.fillStyle = i < level ? '#f2c230' : '#efe3c2';
      g.fillRect(x + 1, 17 - h, 2, h - 2);
    });
    url = canvas.toDataURL();
    iconCache.set(key, url);
  }
  return url;
}
