// Grava sons do jogo em WAV, para se ouvirem fora do jogo: cada som seco, com várias variantes seguidas, e dentro da
// sala de cada campo, com o mesmo nível de sala que o jogo usa. Os ficheiros ficam em dist-sounds/.
//
//   npm run sound-wavs                 → lista os sons
//   npm run sound-wavs -- apito rede   → grava esses
//   npm run sound-wavs -- todos        → grava todos
import { mkdirSync, writeFileSync } from 'node:fs';
import { CROWDS } from '../ui/audio.ts';
import {
  ROOMS, SR, applause, babble, backboard, crowdBabble, roar, brass, chains, chirp, chime, clapBeat, crowd, glock, horn, makeRng, rim, roomImpulse, shout, slap,
  snare, squeak, swish, thud, timpani, whistle, type Rng, type Room, type Sample,
} from '../ui/synth.ts';

const OUT = 'dist-sounds';
const ROOM_NAMES: Record<Room, string> = { street: 'rua', school: 'escola', hall: 'pavilhao', arena: 'arena', closed: 'vazio' };

/** Cada som: o gerador e quantas variantes se ouvem seguidas. */
const SOUNDS: Record<string, [(r: Rng, i: number) => Sample, number]> = {
  'bola-e-passe': [r => slap(0, r), 3],
  roubo: [r => slap(0.5, r), 3],
  desarme: [r => slap(1, r), 3],
  encontrao: [thud, 3],
  aro: [rim, 3],
  tabela: [r => backboard(r), 3],
  'tabela-metal': [r => backboard(r, 'metal'), 3],
  rede: [swish, 3],
  'rede-corrente': [chains, 3],
  apito: [r => whistle(0.34, r), 3],
  'buzina-periodo': [r => horn(150, 1, r), 1],
  'buzina-24s': [r => horn(310, 0.55, r), 1],
  'buzina-troca': [r => horn(205, 0.35, r), 1],
  tenis: [squeak, 6],
  claque: [r => clapBeat(8, r), 3],
  passaro: [chirp, 4],
  carta: [(r, i) => chime(i ? 89 : 82, r), 2],
  hey: [r => shout('hey', r), 4],
  uuh: [r => shout('ooh', r), 4],
  oh: [r => shout('oh', r), 4],
  coro: [r => crowd('hey', 10, r), 2],
  aplausos: [r => applause(24, 2.6, r), 1],
  burburinho: [r => babble(8, 2.4, r, 1600), 1],
  'bancada-rumor': [r => crowdBabble(8, 4, r), 3],
  'bancada-festa': [r => roar(14, 5, r, 'good'), 2],
  'bancada-ooooh': [r => roar(14, 5, r, 'miss'), 2],
  'bancada-uuuuh': [r => roar(14, 4, r, 'shame'), 2],
  tarola: [snare, 3],
  metais: [(r, i) => brass([72, 76, 79][i]!, r, 0.6), 3],
  glock: [(r, i) => glock([72, 84][i]!, r), 2],
  timbale: [(r, i) => timpani([38, 46][i]!, r), 2],
};

const stereo = (s: Sample): [Float32Array, Float32Array] => (s instanceof Float32Array ? [s, s] : s);

/** Junta as variantes, com meio segundo de silêncio entre elas. */
function sequence(parts: Sample[]): [Float32Array, Float32Array] {
  const gap = Math.round(0.5 * SR);
  const total = parts.reduce((sum, p) => sum + stereo(p)[0].length + gap, 0);
  const out: [Float32Array, Float32Array] = [new Float32Array(total), new Float32Array(total)];
  let at = 0;
  for (const p of parts) {
    const [l, r] = stereo(p);
    out[0].set(l, at);
    out[1].set(r, at);
    at += l.length + gap;
  }
  return out;
}

/** FFT de raiz 2, no lugar. */
function fft(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = ((inverse ? 2 : -2) * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < size / 2; k++) {
        const wr = Math.cos(angle * k);
        const wi = Math.sin(angle * k);
        const a = start + k;
        const b = a + size / 2;
        const tr = re[b]! * wr - im[b]! * wi;
        const ti = re[b]! * wi + im[b]! * wr;
        re[b] = re[a]! - tr;
        im[b] = im[a]! - ti;
        re[a] = re[a]! + tr;
        im[a] = im[a]! + ti;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) re[i] = re[i]! / n;
}

function convolve(x: Float32Array, h: Float32Array): Float32Array {
  const length = x.length + h.length - 1;
  let n = 1;
  while (n < length) n <<= 1;
  const [ar, ai, br, bi] = [new Float64Array(n), new Float64Array(n), new Float64Array(n), new Float64Array(n)];
  ar.set(x);
  br.set(h);
  fft(ar, ai, false);
  fft(br, bi, false);
  for (let i = 0; i < n; i++) [ar[i], ai[i]] = [ar[i]! * br[i]! - ai[i]! * bi[i]!, ar[i]! * bi[i]! + ai[i]! * br[i]!];
  fft(ar, ai, true);
  return Float32Array.from(ar.subarray(0, length));
}

// A convolução rápida tem de dar o mesmo que a direta.
{
  const x = Float32Array.from([1, -2, 0.5, 3]);
  const h = Float32Array.from([0.5, 0, -1]);
  const fast = convolve(x, h);
  const direct = [0.5, -1, -0.75, 3.5, -0.5, -3];
  if (direct.some((v, i) => Math.abs(v - fast[i]!) > 1e-9)) throw new Error('convolução errada');
}

/**
 * O som dentro de uma sala, perto do que o browser faz: o seco mais a sala ao nível `wet` do pavilhão. O ConvolverNode normaliza
 * a resposta pela energia; aqui faz-se o mesmo, com um fator aproximado (×3), por isso a proporção é só uma aproximação.
 */
function inRoom([l, r]: [Float32Array, Float32Array], room: Room): [Float32Array, Float32Array] {
  const [il, ir] = roomImpulse(room, SR, makeRng(Object.keys(ROOMS).indexOf(room) + 1));
  let energy = 0;
  for (const v of il) energy += v * v;
  const gain = (CROWDS[room].wet * 3) / Math.sqrt(energy);
  const wl = convolve(l, il);
  const wr = convolve(r, ir);
  for (let i = 0; i < wl.length; i++) {
    wl[i] = (l[i] ?? 0) + wl[i]! * gain;
    wr[i] = (r[i] ?? 0) + wr[i]! * gain;
  }
  return [wl, wr];
}

function writeWav(name: string, [l, r]: [Float32Array, Float32Array]): void {
  let peak = 0;
  for (const ch of [l, r]) for (const v of ch) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0.95 ? 0.95 / peak : 1;
  const buffer = Buffer.alloc(44 + l.length * 4);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + l.length * 4, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(SR, 24);
  buffer.writeUInt32LE(SR * 4, 28);
  buffer.writeUInt16LE(4, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(l.length * 4, 40);
  for (let i = 0; i < l.length; i++) {
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l[i]! * g)) * 32767), 44 + i * 4);
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r[i]! * g)) * 32767), 46 + i * 4);
  }
  writeFileSync(`${OUT}/${name}.wav`, buffer);
}

const asked = process.argv.slice(2);
if (asked.length === 0) {
  console.log(`Sons: ${Object.keys(SOUNDS).join(', ')}\nUso: npm run sound-wavs -- apito rede   (ou: todos)`);
  process.exit(0);
}
const names = asked.includes('todos') ? Object.keys(SOUNDS) : asked;
const unknown = names.filter(name => !SOUNDS[name]);
if (unknown.length) {
  console.error(`Não conheço: ${unknown.join(', ')}. Sons: ${Object.keys(SOUNDS).join(', ')}`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
for (const name of names) {
  const [make, count] = SOUNDS[name]!;
  const dry = sequence(Array.from({ length: count }, (_, i) => make(makeRng(i + 1), i)));
  writeWav(name, dry);
  for (const room of Object.keys(ROOMS) as Room[]) writeWav(`${name}-${ROOM_NAMES[room]}`, inRoom(dry, room));
  console.log(`${OUT}/${name}.wav e ${Object.keys(ROOMS).length} salas`);
}
