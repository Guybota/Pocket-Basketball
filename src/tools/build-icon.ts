// Gera o ícone do ecrã principal (iPhone e iPad) a partir da bola do título: npm run build-icon
import { writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import { BALL_SIZE, drawBall } from '../ui/art/ball.ts';

const SIZE = 180;
const SCALE = 16; // múltiplo inteiro, para os píxeis da bola ficarem nítidos
const PAPER = '#f8f0d8';

const grid: string[] = Array(BALL_SIZE * BALL_SIZE).fill(PAPER);
const pen = {
  fillStyle: PAPER as string,
  fillRect(x: number, y: number, w: number, h: number) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j * BALL_SIZE + i] = this.fillStyle;
  },
};
drawBall(pen);

const margin = (SIZE - BALL_SIZE * SCALE) / 2;
const rgb = (hex: string): number[] => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const raw = Buffer.alloc(SIZE * (1 + SIZE * 3));
for (let y = 0; y < SIZE; y++) {
  raw[y * (1 + SIZE * 3)] = 0;
  for (let x = 0; x < SIZE; x++) {
    const gx = Math.floor((x - margin) / SCALE);
    const gy = Math.floor((y - margin) / SCALE);
    const color = gx >= 0 && gx < BALL_SIZE && gy >= 0 && gy < BALL_SIZE ? grid[gy * BALL_SIZE + gx]! : PAPER;
    raw.set(rgb(color), y * (1 + SIZE * 3) + 1 + x * 3);
  }
}

const chunk = (type: string, data: Buffer): Buffer => {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
};
const header = Buffer.alloc(13);
header.writeUInt32BE(SIZE, 0);
header.writeUInt32BE(SIZE, 4);
header[8] = 8; // 8 bits por canal
header[9] = 2; // RGB, sem transparência: o iOS pinta de preto as partes transparentes
writeFileSync('public/apple-touch-icon.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('public/apple-touch-icon.png');
