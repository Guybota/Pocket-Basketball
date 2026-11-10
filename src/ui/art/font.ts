// Fonte bitmap 3x5: cada dígito é uma linha em binário. Os acentos sobem 3 linhas acima de y e a cedilha desce 1. O nome do portador e o marcador usam-na a 2x.
export const FONT: Record<string, string> = {
  0: '75557', 1: '26227', 2: '71747', 3: '71317', 4: '55711', 5: '74717', 6: '74757', 7: '71222', 8: '75757', 9: '75717',
  A: '25755', B: '65656', C: '34443', D: '65556', E: '74647', F: '74644', G: '34553', H: '55755', I: '72227', J: '11152',
  K: '55655', L: '44447', M: '57755', N: '65555', O: '25552', P: '65644', Q: '25563', R: '65655', S: '34216', T: '72222',
  U: '55557', V: '55552', W: '55775', X: '55255', Y: '55222', Z: '71247',
  // Com acento, mais três linhas por cima (o acento, inclinado, em duas, e um espaço); a cedilha é uma linha por baixo.
  Á: '12025755', À: '42025755', Â: '25025755', Ã: '07025755', É: '12074647', Ê: '25074647', Í: '12072227',
  Ó: '12025552', Ô: '25025552', Õ: '07025552', Ú: '12055557', Ç: '344436',
  ':': '02020', '-': '00700', '+': '02720', '.': '00002', ' ': '00000', '!': '22202', '?': '71202', '/': '11244', ',': '00024',
};

// Letras mais largas do que 3 píxeis: em 3×5 o «%» não tem espaço para os dois pontos e a barra, e lia-se como um X.
const WIDE: Record<string, readonly number[]> = { '%': [0b11001, 0b11010, 0b00100, 0b01011, 0b10011] };
const advance = (ch: string): number => (WIDE[ch] ? 6 : 4);

export function text(g: CanvasRenderingContext2D, value: string, x: number, y: number, color: string, scale = 2): void {
  g.fillStyle = color;
  for (const ch of value) {
    const wide = WIDE[ch];
    if (wide) {
      wide.forEach((bits, row) => {
        for (let col = 0; col < 5; col++) if ((bits >> (4 - col)) & 1) g.fillRect(x + col * scale, y + row * scale, scale, scale);
      });
      x += advance(ch) * scale;
      continue;
    }
    // Uma letra com um acento que a fonte não tem sai sem ele.
    const glyph = FONT[ch] ?? FONT[ch.normalize('NFD')[0]!] ?? FONT[' ']!;
    // Com acento: 2 linhas de acento e 1 vazia por cima da letra.
    const first = glyph.length === 8 ? -3 : 0;
    for (let row = 0; row < glyph.length; row++) {
      const bits = Number(glyph[row]);
      for (let col = 0; col < 3; col++) {
        if ((bits >> (2 - col)) & 1) g.fillRect(x + col * scale, y + (first + row) * scale, scale, scale);
      }
    }
    x += 4 * scale;
  }
}

export const textWidth = (value: string, scale = 2): number => [...value].reduce((sum, ch) => sum + advance(ch), 0) * scale - scale;
