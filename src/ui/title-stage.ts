// O palco do título, depois da cerimónia: um clarão, o placar do pavilhão a acender linha a linha, e a foto de equipa.
import { text, textWidth } from './art/font.ts';
import { emblemCanvas, type Emblem } from './art/kit.ts';
import { INK } from './art/palette.ts';
import { drawShadow, drawSprite, type Look } from './art/sprites.ts';
import { drawTrophy } from './trophies.ts';

export interface TitleStageInfo {
  /** A prova, em maiúsculas (a letra do jogo só as tem). */
  competition: string;
  club: string;
  emblem: Emblem;
  trophy: 'cup' | 'bigCup';
  season: number;
  /** O plantel, com o capitão primeiro: é ele que segura o troféu na foto. */
  squad: readonly Look[];
}

/** Quando cada linha do placar acende, em segundos desde o clarão. */
const LINE_AT = [0.35, 1.05, 1.75, 2.45] as const;
/** O placar fica até aqui; depois o flash da máquina e a foto. */
export const TITLE_BOARD_SECONDS = 3.6;
/** Ao fim disto, o relatório. Um toque salta antes. */
export const TITLE_STAGE_SECONDS = 9;
const FLASH_SECONDS = 0.3;
const GOLD = '#f2c230';
const GOLD_DIM = '#6e5410';
const PAPER = '#f8f0d8';

/**
 * Desenha o palco `t` segundos depois de começar, na tela inteira do campo. O corte da cerimónia clara para o placar
 * escuro já marca a entrada; só a foto tem um flash, dentro da moldura e a meia força. Com movimento reduzido, nem esse.
 */
export function drawTitleStage(g: CanvasRenderingContext2D, W: number, H: number, t: number, info: TitleStageInfo, still: boolean): void {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = false;
  if (t < TITLE_BOARD_SECONDS) drawBoard(g, W, H, t, info, still);
  else drawPhoto(g, W, H, info, still ? FLASH_SECONDS : t - TITLE_BOARD_SECONDS);
  g.restore();
}

/** Uma linha do placar acende com um só piscar: acesa, apagada um instante, acesa de vez. */
const lit = (t: number, at: number, still: boolean): boolean => still || (t >= at && !(t >= at + 0.06 && t < at + 0.12));

/** O texto do placar, em ouro, com uma sombra de lâmpadas meio acesas por baixo. */
function boardText(g: CanvasRenderingContext2D, value: string, cx: number, y: number): void {
  const x = cx - (textWidth(value) >> 1);
  text(g, value, x + 1, y + 1, GOLD_DIM);
  text(g, value, x, y, GOLD);
}

function drawBoard(g: CanvasRenderingContext2D, W: number, H: number, t: number, info: TitleStageInfo, still: boolean): void {
  // O pavilhão às escuras, com a fila de holofotes lá em cima.
  g.fillStyle = INK;
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#2a3347';
  for (let x = 6; x < W; x += 14) g.fillRect(x, 5, 3, 1);
  const bw = Math.min(W - 24, 252);
  const bh = Math.min(H - 20, 136);
  const bx = (W - bw) >> 1;
  const by = (H - bh) >> 1;
  // A caixa do placar: aro de metal com o cimo mais claro, e o painel de lâmpadas apagadas, uma a cada 3 píxeis.
  g.fillStyle = '#4a5368';
  g.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
  g.fillStyle = '#6b7590';
  g.fillRect(bx - 3, by - 3, bw + 6, 1);
  g.fillStyle = '#0c1018';
  g.fillRect(bx, by, bw, bh);
  g.fillStyle = '#1a2130';
  for (let y = by + 1; y < by + bh - 1; y += 3) for (let x = bx + 1; x < bx + bw - 1; x += 3) g.fillRect(x, y, 1, 1);
  const cx = W >> 1;
  let y = by + 9;
  // 1: a prova.
  if (lit(t, LINE_AT[0], still)) boardText(g, info.competition, cx, y);
  y += 20;
  // 2: o emblema e o nome do clube, lado a lado.
  if (lit(t, LINE_AT[1], still)) {
    const name = info.club.toUpperCase();
    const w = 32 + 6 + textWidth(name);
    const x = cx - (w >> 1);
    g.drawImage(emblemCanvas(info.emblem), x, y);
    text(g, name, x + 39, y + 12, GOLD_DIM);
    text(g, name, x + 38, y + 11, PAPER);
  }
  y += 38 + 36;
  // 3: o troféu, com a base aqui.
  if (lit(t, LINE_AT[2], still)) drawTrophy(g, cx, y, info.trophy, true);
  y += 8;
  // 4: campeões, e a época.
  if (lit(t, LINE_AT[3], still)) boardText(g, `CAMPEÕES - ÉPOCA ${info.season}`, cx, y);
}

/** A foto inteira desenha-se a 1× numa tela de metade do tamanho e mostra-se a 2×: tudo na mesma grelha de píxeis. */
function drawPhoto(g: CanvasRenderingContext2D, W: number, H: number, info: TitleStageInfo, since: number): void {
  g.fillStyle = INK;
  g.fillRect(0, 0, W, H);
  const w = W >> 1;
  const h = H >> 1;
  photoCanvas ??= document.createElement('canvas');
  photoCanvas.width = w;
  photoCanvas.height = h;
  const p = photoCanvas.getContext('2d')!;
  // Moldura de papel; lá dentro, a parede do pavilhão às riscas, o estrado para a fila de trás e o soalho.
  p.fillStyle = PAPER;
  p.fillRect(0, 0, w, h);
  const fx = 3;
  const fy = 3;
  const fw = w - 6;
  const fh = h - 6;
  const floorY = fy + fh - 14;
  p.fillStyle = '#26304a';
  p.fillRect(fx, fy, fw, floorY - fy);
  p.fillStyle = '#2f3b5a';
  for (let x = fx + 2; x < fx + fw; x += 8) p.fillRect(x, fy, 4, floorY - fy);
  p.fillStyle = '#b8783a';
  p.fillRect(fx, floorY, fw, fy + fh - floorY);
  p.fillStyle = '#a0662e';
  for (let x = fx; x < fx + fw; x += 7) p.fillRect(x, floorY + 2 + ((x / 7) % 3) * 4, 4, 1);
  // O título por cima, e a prova e a época por baixo (a letra do jogo não tem o ponto do meio: o traço separa).
  const head = 'CAMPEÕES!';
  text(p, head, (w - textWidth(head)) >> 1, fy + 7, GOLD);
  const sub = `${info.competition} - ÉPOCA ${info.season}`;
  text(p, sub, (w - textWidth(sub, 1)) >> 1, fy + 21, PAPER, 1);
  drawTeam(p, w, floorY + 12, info);
  // O flash da máquina: só dentro da moldura, a meia força, a apagar-se.
  if (since < FLASH_SECONDS) {
    p.globalAlpha = 0.5 * (1 - since / FLASH_SECONDS);
    p.fillStyle = PAPER;
    p.fillRect(fx, fy, fw, fh);
    p.globalAlpha = 1;
  }
  p.fillStyle = INK;
  p.fillRect(fx, fy, fw, 1);
  p.fillRect(fx, fy + fh - 1, fw, 1);
  p.fillRect(fx, fy, 1, fh);
  p.fillRect(fx + fw - 1, fy, 1, fh);
  g.drawImage(photoCanvas, (W - 2 * w) >> 1, (H - 2 * h) >> 1, 2 * w, 2 * h);
}

let photoCanvas: HTMLCanvasElement | null = null;

/**
 * A equipa em duas filas: a de trás em cima do estrado, de braços no ar; a da frente de punhos fechados, com o capitão
 * e o troféu ao meio, com os pés em `frontY`. Quem está à direita do meio vira-se para ele.
 */
function drawTeam(g: CanvasRenderingContext2D, w: number, frontY: number, info: TitleStageInfo): void {
  const [captain, ...rest] = info.squad;
  if (!captain) return;
  const frontCount = Math.min(rest.length, Math.max(2, Math.floor(rest.length / 2)) & ~1);
  const front = rest.slice(0, frontCount);
  const back = rest.slice(frontCount);
  const backY = frontY - 12;
  const cx = w >> 1;
  const step = Math.max(12, Math.min(20, Math.floor((w - 16) / Math.max(1, back.length))));
  if (back.length) {
    const x = cx - ((back.length * step) >> 1) - 4;
    g.fillStyle = '#5a3a1e';
    g.fillRect(x, backY - 1, back.length * step + 8, 5);
    g.fillStyle = INK;
    g.fillRect(x, backY + 4, back.length * step + 8, 1);
  }
  back.forEach((look, i) => {
    const x = cx + Math.round((i - (back.length - 1) / 2) * step);
    drawSprite(g, 'cheer0', look, x, backY, x > cx, false, false);
  });
  const half = front.length >> 1;
  const frontStep = Math.max(14, Math.min(20, Math.floor((w - 16) / (front.length + 1))));
  [...front.slice(0, half).reverse(), ...front.slice(half)].forEach((look, i) => {
    const side = i < half ? -(i + 1) : i - half + 1;
    const x = cx + side * frontStep;
    drawShadow(g, x, frontY);
    drawSprite(g, 'fists', look, x, frontY, side > 0, false, false);
  });
  drawShadow(g, cx, frontY);
  drawSprite(g, 'lift0', { ...captain, trophy: info.trophy }, cx, frontY, false, false, false);
}
