// Os equipamentos desenhados: a camisola de alças e os calções estendidos; o roupeiro do editor, com os quatro pendurados
// em cabides como no original; e o cartaz do jogo com os das duas equipas.
import type { Player, Team } from '../../sim/types.ts';
import { text } from './font.ts';
import { kitKey, usesSecond, type ClubKit } from './kit.ts';
import { INK } from './palette.ts';
import { drawSprite, lookOf } from './sprites.ts';
import { remember } from './cache.ts';

const SHIRT_W = 18;
const KIT_H = 40;

/** A camisola de alças e os calções, píxel a píxel, numa grelha de 18 por 40. */
export function drawKitFlat(g: CanvasRenderingContext2D, kit: ClubKit, x0: number, y0: number, scale: number): void {
  const inside = (x: number, y: number): boolean => {
    if (x < 0 || x >= SHIRT_W || y < 0 || y > 25) return false;
    if (y >= 8) return true;
    if (y >= 6) return x >= 1 && x <= 16 && (x <= 4 || x >= 13 || y === 7);
    return (x >= 1 && x <= 4) || (x >= 13 && x <= 16);
  };
  const px = (x: number, y: number, color: string): void => {
    g.fillStyle = color;
    g.fillRect(x0 + x * scale, y0 + y * scale, scale, scale);
  };
  for (let y = 0; y <= 25; y++) {
    for (let x = 0; x < SHIRT_W; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const trim = y < 2 || (y === 7 && x >= 5 && x <= 12);
      // O desenho da camisola é o mesmo dos bonecos, por isso usa-se a mesma regra, nas coordenadas deles.
      px(x, y, edge ? INK : trim ? kit.trim : usesSecond(kit, x + 8, y + 12) ? kit.second : kit.jersey);
    }
  }
  for (let y = 26; y < KIT_H; y++) {
    for (let x = 1; x <= 16; x++) {
      const split = y > 33 && (x === 8 || x === 9);
      const edge = y === KIT_H - 1 || x === 1 || x === 16 || split || y === 26;
      px(x, y, edge ? INK : y === 27 ? kit.trim : kit.shorts);
    }
  }
}

const kitImages = new Map<string, string>();

/** O equipamento estendido como imagem pequena, para as miniaturas dos desenhos. */
export function kitImage(kit: ClubKit): string {
  const key = kitKey(kit);
  let url = kitImages.get(key);
  if (!url) {
    const canvas = document.createElement('canvas');
    canvas.width = SHIRT_W;
    canvas.height = KIT_H;
    drawKitFlat(canvas.getContext('2d')!, kit, 0, 0, 1);
    url = canvas.toDataURL();
    remember(kitImages, key, url, 300);
  }
  return url;
}

/** O roupeiro: cada equipamento no seu cabide, o escolhido em destaque, com os nossos bonecos por baixo e os do adversário ao lado. */
export function drawWardrobe(canvas: HTMLCanvasElement, kits: readonly ClubKit[], selectedId: string, roster: readonly Player[], rival: Team): void {
  const g = canvas.getContext('2d')!;
  const { width: W, height: H } = canvas;
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#9c7a48';
  g.fillRect(0, 0, W, H);
  const top = 22;
  const panelW = Math.floor((W - 12) / kits.length);
  const scale = Math.max(2, Math.min(Math.floor((panelW - 10) / SHIRT_W), Math.floor((H - top - 54) / KIT_H)));
  kits.forEach((kit, n) => {
    const x = 6 + n * panelW;
    const selected = kit.id === selectedId;
    g.fillStyle = selected ? '#e8eef0' : '#c9d1d6';
    g.fillRect(x + 2, top, panelW - 4, H - top - 4);
    g.fillStyle = INK;
    g.fillRect(x, top - 2, 2, H - top);
    // O varão e o cabide.
    g.fillStyle = '#6b4b24';
    g.fillRect(x + 2, top + 4, panelW - 4, 2);
    const cx = x + Math.floor(panelW / 2);
    const shirtTop = top + 16;
    g.fillStyle = INK;
    g.fillRect(cx, top + 6, 1, 4);
    g.fillRect(cx - 1, top + 10, 3, 2);
    g.fillRect(cx - scale * 7, shirtTop - 2, scale * 14, 2);
    g.fillRect(cx - scale * 7, shirtTop - 5, 2, 4);
    g.fillRect(cx + scale * 7 - 2, shirtTop - 5, 2, 4);
    drawKitFlat(g, kit, cx - scale * (SHIRT_W / 2), shirtTop, scale);
    if (selected) {
      g.strokeStyle = '#f2c230';
      g.lineWidth = 3;
      g.strokeRect(x + 3.5, top + 1.5, panelW - 7, H - top - 7);
    }
  });
  g.fillStyle = INK;
  g.fillRect(6 + kits.length * panelW, top - 2, 2, H - top);
  g.fillRect(6, top - 2, W - 12, 2);
  // Por baixo do escolhido, três dos nossos já vestidos. No canto, o adversário desta semana.
  const chosen = kits.find(kit => kit.id === selectedId) ?? kits[0]!;
  const index = Math.max(0, kits.indexOf(chosen));
  const panelX = 6 + index * panelW;
  g.fillStyle = '#1b2230';
  g.fillRect(panelX + 6, H - 46, panelW - 12, 42);
  roster.slice(0, 3).forEach((p, i) => drawSprite(g, i === 1 ? 'run0' : 'idle', { ...lookOf(p, 'blue'), custom: chosen }, panelX + Math.floor(panelW / 2) + (i - 1) * Math.min(22, Math.floor(panelW / 4)), H - 8, i === 2, false, false));
  g.fillStyle = '#1b2230';
  g.fillRect(0, 0, Math.min(W, 118), 20);
  text(g, 'ADVERSÁRIO', 4, 5, '#f2c230', 2);
  rival.roster.slice(0, 2).forEach((p, i) => drawSprite(g, i === 0 ? 'idle' : 'defend', lookOf(p, 'cream'), 96 + i * 14, 18, i === 1, false, false));
}

export interface PosterSide {
  kit: ClubKit;
  emblem: HTMLCanvasElement;
  roster: readonly Player[];
}

/** O cartaz do jogo, preso num quadro de cortiça: uma fita com o nome do jogo, e cada equipa numa coluna, com o emblema,
 * a camisola pendurada e dois jogadores já equipados. Sem texto por cima dos equipamentos: os nomes ficam no painel. */
export function drawMatchPoster(canvas: HTMLCanvasElement, title: string, ours: PosterSide, theirs: PosterSide): void {
  const g = canvas.getContext('2d')!;
  const { width: W, height: H } = canvas;
  g.imageSmoothingEnabled = false;
  // A cortiça, com pintas fixas (não mudam de um desenho para o outro).
  g.fillStyle = '#b0844f';
  g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 3) {
    for (let x = (y * 7) % 5; x < W; x += 5) {
      const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      if (h % 7 === 0) {
        g.fillStyle = h % 2 ? '#9c7442' : '#c49866';
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  const m = Math.max(6, Math.round(Math.min(W, H) * 0.035));
  const px = m;
  const py = m;
  const pw = W - m * 2;
  const ph = H - m * 2;
  g.fillStyle = '#6d5232';
  g.fillRect(px + 3, py + 4, pw, ph);
  g.fillStyle = '#f6efdc';
  g.fillRect(px, py, pw, ph);
  // Meios-tons ténues no papel, como num cartaz impresso.
  g.fillStyle = '#ece2c6';
  for (let y = py + 2; y < py + ph - 2; y += 4) for (let x = px + 2 + ((y >> 2) % 2) * 2; x < px + pw - 2; x += 4) g.fillRect(x, y, 1, 1);
  g.fillStyle = INK;
  g.fillRect(px, py, pw, 2);
  g.fillRect(px, py + ph - 2, pw, 2);
  g.fillRect(px, py, 2, ph);
  g.fillRect(px + pw - 2, py, 2, ph);
  // Dois pioneses no topo.
  const pin = (x: number, color: string): void => {
    g.fillStyle = INK;
    g.fillRect(x - 3, py - 2, 7, 7);
    g.fillStyle = color;
    g.fillRect(x - 2, py - 1, 5, 5);
    g.fillStyle = '#ffffff';
    g.fillRect(x - 1, py, 1, 1);
  };
  pin(px + 14, '#cf3a2c');
  pin(px + pw - 15, '#2b5fd9');
  // A fita com o nome do jogo, com as pontas cortadas em V.
  const label = title.toUpperCase();
  const scale = label.length * 8 + 40 < pw ? 2 : 1;
  const ribbonH = 7 * scale + 8;
  const ribbonW = Math.min(pw - 24, label.length * 4 * scale + 28);
  const rx = Math.round(W / 2 - ribbonW / 2);
  const ry = py + 8;
  g.fillStyle = '#a93f14';
  g.fillRect(rx - 8, ry + 4, 10, ribbonH);
  g.fillRect(rx + ribbonW - 2, ry + 4, 10, ribbonH);
  g.fillStyle = '#f6efdc';
  for (let k = 0; k < ribbonH / 2; k++) {
    g.fillRect(rx - 8, ry + 4 + k, ribbonH / 2 - k, 1);
    g.fillRect(rx - 8, ry + 4 + ribbonH - 1 - k, ribbonH / 2 - k, 1);
    g.fillRect(rx + ribbonW + 8 - (ribbonH / 2 - k), ry + 4 + k, ribbonH / 2 - k, 1);
    g.fillRect(rx + ribbonW + 8 - (ribbonH / 2 - k), ry + 4 + ribbonH - 1 - k, ribbonH / 2 - k, 1);
  }
  g.fillStyle = INK;
  g.fillRect(rx - 1, ry - 1, ribbonW + 2, ribbonH + 2);
  g.fillStyle = '#e8622a';
  g.fillRect(rx, ry, ribbonW, ribbonH);
  g.fillStyle = '#f08a55';
  g.fillRect(rx, ry, ribbonW, 2);
  text(g, label, Math.round(W / 2 - (label.length * 4 * scale) / 2 + scale), ry + 4 + scale, '#f6efdc', scale);
  // As duas colunas: emblema, camisola no cabide e dois jogadores à frente, num estrado.
  const top = ry + ribbonH + 8;
  const columnW = pw / 2;
  const crest = Math.max(16, Math.min(40, Math.floor((ph - (top - py)) * 0.17)));
  const kitTop = top + crest + 12;
  const sprite = (ph - (kitTop - py)) > 200 ? 2 : 1;
  const room = py + ph - 10 - kitTop - 34 * sprite;
  const kitScale = Math.max(1, Math.min(Math.floor(room / KIT_H), Math.floor((columnW - 40) / SHIRT_W)));
  const columns: [number, PosterSide, boolean][] = [[px + columnW / 2, ours, false], [px + columnW * 1.5, theirs, true]];
  for (const [cx, side, flip] of columns) {
    g.drawImage(side.emblem, Math.round(cx - crest / 2), top, crest, crest);
    const kx = Math.round(cx - (SHIRT_W * kitScale) / 2);
    // O cabide: um gancho e a barra por cima das alças.
    g.fillStyle = INK;
    g.fillRect(Math.round(cx) - 1, kitTop - 8, 2, 6);
    g.fillRect(kx + kitScale, kitTop - 2, (SHIRT_W - 2) * kitScale, 2);
    drawKitFlat(g, side.kit, kx, kitTop, kitScale);
    // O estrado e os dois jogadores, de pé, à frente do equipamento.
    const floor = kitTop + KIT_H * kitScale + 30 * sprite;
    g.fillStyle = '#d9c9a3';
    g.fillRect(Math.round(cx - 34 * sprite), floor - 2 * sprite, 68 * sprite, 4 * sprite);
    const figures = document.createElement('canvas');
    figures.width = 68;
    figures.height = 46;
    const fg = figures.getContext('2d')!;
    side.roster.slice(0, 2).forEach((player, i) => drawSprite(fg, 'idle', { ...lookOf(player, 'cream'), custom: side.kit }, 22 + i * 24, 44, flip, false, false));
    g.drawImage(figures, Math.round(cx - 34 * sprite), floor - 44 * sprite, 68 * sprite, 46 * sprite);
  }
  // O selo do meio, entre as duas camisolas.
  const vx = Math.round(W / 2);
  const vy = Math.round(kitTop + (KIT_H * kitScale) / 2);
  const r = 13;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(r * r - dy * dy));
    g.fillStyle = INK;
    g.fillRect(vx - half, vy + dy, half * 2, 1);
    if (Math.abs(dy) < r - 2) {
      const inner = Math.round(Math.sqrt((r - 2) * (r - 2) - dy * dy));
      g.fillStyle = '#f2c230';
      g.fillRect(vx - inner, vy + dy, inner * 2, 1);
    }
  }
  text(g, 'VS', vx - 7, vy - 5, INK, 2);
}
