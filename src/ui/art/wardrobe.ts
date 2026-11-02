// O roupeiro dos equipamentos, como no original: os quatro pendurados em cabides, e os bonecos do próximo adversário ao lado.
import type { Player, Team } from '../../sim/types.ts';
import { text } from './font.ts';
import { kitKey, usesSecond, type ClubKit } from './kit.ts';
import { INK } from './palette.ts';
import { drawSprite, lookOf } from './sprites.ts';

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
    kitImages.set(key, url);
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
  text(g, 'ADVERSARIO', 4, 3, '#f2c230', 2);
  rival.roster.slice(0, 2).forEach((p, i) => drawSprite(g, i === 0 ? 'idle' : 'defend', lookOf(p, 'cream'), 96 + i * 14, 18, i === 1, false, false));
}
