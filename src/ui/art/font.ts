// Fonte bitmap 3x5: cada dígito é uma linha em binário. Os acentos sobem 2 linhas acima de y e a cedilha desce 1. O nome do portador e o marcador usam-na a 2x.
const FONT: Record<string, string> = {
  0: '75557', 1: '26227', 2: '71747', 3: '71317', 4: '55711', 5: '74717', 6: '74757', 7: '71222', 8: '75757', 9: '75717',
  A: '25755', B: '65656', C: '34443', D: '65556', E: '74647', F: '74644', G: '34553', H: '55755', I: '72227', J: '11152',
  K: '55655', L: '44447', M: '57755', N: '65555', O: '25552', P: '65644', Q: '25563', R: '65655', S: '34216', T: '72222',
  U: '55557', V: '55552', W: '55775', X: '55255', Y: '55222', Z: '71247',
  // Com acento, mais duas linhas por cima (o acento e um espaço); a cedilha é uma linha por baixo.
  Á: '1025755', À: '4025755', Â: '5025755', Ã: '7025755', É: '1074647', Ê: '5074647', Í: '1072227',
  Ó: '1025552', Ô: '5025552', Õ: '7025552', Ú: '1055557', Ç: '344436', '%': '54125',
  ':': '02020', '-': '00700', '+': '02720', '.': '00002', ' ': '00000', '!': '22202', '?': '71202',
};

export function text(g: CanvasRenderingContext2D, value: string, x: number, y: number, color: string, scale = 2): void {
  g.fillStyle = color;
  for (const ch of value) {
    // Uma letra com um acento que a fonte não tem sai sem ele.
    const glyph = FONT[ch] ?? FONT[ch.normalize('NFD')[0]!] ?? FONT[' ']!;
    const first = glyph.length === 7 ? -2 : 0;
    for (let row = 0; row < glyph.length; row++) {
      const bits = Number(glyph[row]);
      for (let col = 0; col < 3; col++) {
        if ((bits >> (2 - col)) & 1) g.fillRect(x + col * scale, y + (first + row) * scale, scale, scale);
      }
    }
    x += 4 * scale;
  }
}

export const textWidth = (value: string, scale = 2): number => value.length * 4 * scale - scale;
