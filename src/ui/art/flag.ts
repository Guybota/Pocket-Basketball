// A bandeira do clube a ondear sobre as colinas, como no original: é onde o emblema se vê em grande.
import { emblemCanvas, type Emblem } from './kit.ts';
import { INK } from './palette.ts';

/** Elipse cheia, linha a linha, para nuvens e colinas em píxeis. */
function blob(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string): void {
  g.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    g.fillRect(cx - half, cy + y, half * 2, 1);
  }
}

/** Desenha um frame. `now` em milissegundos faz a bandeira ondear; com zero, fica parada. */
export function drawFlagScene(canvas: HTMLCanvasElement, emblem: Emblem, now: number): void {
  const g = canvas.getContext('2d')!;
  const { width: W, height: H } = canvas;
  g.imageSmoothingEnabled = false;
  // Céu em três faixas, mais claro para o horizonte.
  g.fillStyle = '#5fb8d8';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#7ec8e0';
  g.fillRect(0, Math.floor(H * 0.35), W, H);
  g.fillStyle = '#a6dcec';
  g.fillRect(0, Math.floor(H * 0.6), W, H);
  const drift = Math.floor(now / 160) % (W + 120);
  blob(g, ((W * 0.2 + drift) % (W + 120)) - 60, Math.floor(H * 0.16), 44, 10, '#f8f6ee');
  blob(g, ((W * 0.78 + drift * 0.6) % (W + 120)) - 60, Math.floor(H * 0.3), 36, 8, '#f8f6ee');
  // Colinas, da mais longe para a mais perto.
  blob(g, Math.floor(W * 0.12), H + 10, Math.floor(W * 0.3), Math.floor(H * 0.42), '#6cb860');
  blob(g, Math.floor(W * 0.88), H + 14, Math.floor(W * 0.34), Math.floor(H * 0.38), '#6cb860');
  blob(g, Math.floor(W * 0.5), H + 30, Math.floor(W * 0.5), Math.floor(H * 0.36), '#4f9e4a');
  g.fillStyle = '#3f8a3c';
  g.fillRect(0, H - 6, W, 6);
  // O mastro.
  const poleX = Math.floor(W * 0.36);
  const poleTop = Math.floor(H * 0.1);
  g.fillStyle = INK;
  g.fillRect(poleX - 2, poleTop - 2, 5, H - poleTop + 2);
  g.fillStyle = '#d8d8d0';
  g.fillRect(poleX - 1, poleTop, 3, H - poleTop);
  g.fillStyle = '#f2c230';
  g.fillRect(poleX - 3, poleTop - 5, 7, 5);
  // O pano, coluna a coluna, com a onda a crescer para a ponta solta.
  const fw = Math.floor(W * 0.46);
  const fh = Math.floor(fw * 0.68);
  const fx = poleX + 3;
  const fy = poleTop + 2;
  const wave = (c: number): number => (now === 0 ? 0 : Math.round(Math.sin(now / 260 + c / 14) * 5 * (c / fw)));
  for (let c = 0; c < fw; c++) {
    const dy = wave(c);
    g.fillStyle = INK;
    g.fillRect(fx + c, fy + dy, 1, fh);
    g.fillStyle = c % 9 === 0 ? '#e9e6da' : '#f6f3e8';
    g.fillRect(fx + c, fy + dy + 1, 1, fh - 2);
  }
  // O emblema no meio do pano, a ondear com ele.
  const art = emblemCanvas(emblem);
  const scale = Math.max(2, Math.floor((fh - 12) / art.height));
  const ex = fx + Math.floor((fw - art.width * scale) / 2);
  const ey = fy + Math.floor((fh - art.height * scale) / 2);
  for (let c = 0; c < art.width; c++) {
    g.drawImage(art, c, 0, 1, art.height, ex + c * scale, ey + wave(ex + c * scale - fx), scale, art.height * scale);
  }
}
