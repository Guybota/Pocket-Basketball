// O quadro de uma eliminatória: as rondas em colunas, os pares ligados por linhas, e o nosso clube a dourado.
import { text, textWidth } from './font.ts';
import { INK } from './palette.ts';

export interface BracketSlot {
  /** O nome curto do clube, ou vazio se ainda não se sabe quem é. */
  short: string;
  mine: boolean;
  /** Vitórias ou pontos deste lado, para escrever ao lado do nome. */
  score: string;
  winner: boolean;
}

export interface BracketRound {
  label: string;
  pairs: [BracketSlot, BracketSlot][];
}

const PAPER = '#f8f0d8';
const GOLD = '#f2c230';
const BOARD = '#17564f';
const LINE = '#a9d3c6';
const SLOT_H = 11;
const SLOT_W = 44;

// A letra do jogo só tem maiúsculas sem acentos.
const plain = (value: string): string => value.toUpperCase();

const unknown = (): BracketSlot => ({ short: '', mine: false, score: '', winner: false });

/** Preenche as rondas que faltam com pares vazios, para o quadro ter sempre a forma inteira. */
export function fullBracket(rounds: readonly BracketRound[], labels: readonly string[], firstRoundPairs: number): BracketRound[] {
  return labels.map((label, n) => {
    const pairs = Math.max(1, firstRoundPairs >> n);
    const known = rounds[n]?.pairs ?? [];
    return { label, pairs: Array.from({ length: pairs }, (_, i) => known[i] ?? [unknown(), unknown()]) };
  });
}

export function drawBracket(canvas: HTMLCanvasElement, rounds: readonly BracketRound[], title: string): void {
  const g = canvas.getContext('2d')!;
  const { width: W, height: H } = canvas;
  g.fillStyle = BOARD;
  g.fillRect(0, 0, W, H);
  // Giz esbatido, como no quadro da Federação.
  g.fillStyle = 'rgba(244,241,228,.06)';
  for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
  text(g, plain(title), Math.round(W / 2 - textWidth(title, 2) / 2), 5, PAPER, 2);
  const columns = rounds.length;
  const left = 8;
  const top = 32;
  const usable = W - left * 2;
  const columnW = Math.floor(usable / columns);
  const slots = rounds[0]!.pairs.length * 2;
  const rowH = Math.max(SLOT_H + 3, Math.floor((H - top - 6) / slots));
  const centres: number[][] = [];
  rounds.forEach((round, r) => {
    const x = left + r * columnW;
    const span = rowH * (1 << r);
    text(g, plain(round.label).slice(0, Math.floor((columnW - 4) / 4)), x, top - 9, LINE, 1);
    centres[r] = [];
    round.pairs.forEach((pair, p) => {
      pair.forEach((slot, side) => {
        const index = p * 2 + side;
        const y = Math.round(top + index * span + span / 2);
        centres[r]!.push(y);
        const boxY = y - Math.floor(SLOT_H / 2);
        g.fillStyle = slot.mine ? GOLD : slot.short ? PAPER : 'rgba(244,241,228,.18)';
        g.fillRect(x, boxY, SLOT_W, SLOT_H);
        g.fillStyle = INK;
        g.fillRect(x, boxY + SLOT_H, SLOT_W, 1);
        if (slot.short) {
          const colour = slot.mine ? INK : slot.winner ? INK : '#5d5a4f';
          text(g, plain(slot.short), x + 3, boxY + 3, colour, 1);
          if (slot.score) text(g, slot.score, x + SLOT_W - textWidth(slot.score, 1) - 3, boxY + 3, slot.winner ? INK : '#8b8577', 1);
          if (slot.winner) {
            g.fillStyle = slot.mine ? INK : GOLD;
            g.fillRect(x - 3, boxY, 2, SLOT_H);
          }
        } else {
          text(g, '-', x + 3, boxY + 3, LINE, 1);
        }
      });
      // A chaveta que leva o par à ronda seguinte.
      if (r < columns - 1) {
        const a = centres[r]![p * 2]!;
        const b = centres[r]![p * 2 + 1]!;
        const mid = Math.round((a + b) / 2);
        const x1 = x + SLOT_W + 2;
        const x2 = x + columnW - 4;
        g.fillStyle = LINE;
        g.fillRect(x1, a, x2 - x1 - 4, 1);
        g.fillRect(x1, b, x2 - x1 - 4, 1);
        g.fillRect(x2 - 4, a, 1, b - a + 1);
        g.fillRect(x2 - 4, mid, 5, 1);
      }
    });
  });
}
