// A música do jogo, sintetizada. Cada tema tem secções (A, B, C...) que se repetem fora de ordem, como nos temas de Koji Kondo:
// o mesmo material volta noutro contexto e não cansa. Dentro de cada secção, uma frase curta repete-se com o fim mudado.
// Quatro vozes, como numa consola antiga: melodia (pulso), arpejo (pulso fino), baixo (triângulo) e bateria (ruído).

export type MusicTheme = 'none' | 'town' | 'win' | 'loss' | 'farewell' | 'locker' | 'entrance' | 'combo' | 'anthem';

/** Uma nota: o semitom MIDI (0 é pausa) e a duração em colcheias. */
type Note = readonly [number, number];
type Lead = 'pulse25' | 'pulse50' | 'triangle';
type BassStyle = 'bounce' | 'walk' | 'long';
type Drums = 'full' | 'groove' | 'light' | 'none';

interface Part {
  /** Notas como texto: `e5`, `g#4`, `c6:3` (três colcheias), `r:2` (pausa), `|` só separa compassos. */
  melody: string;
  /** Um acorde por compasso (`C Am F G`), ou dois separados por vírgula (`Dm,G`). */
  chords: string;
  lead?: Lead;
  bass?: BassStyle;
  /** Notas de baixo escritas à mão, em vez de as tirar dos acordes. */
  bassNotes?: string;
  arp?: boolean;
  drums?: Drums;
  /** Viragem de tarola no último compasso, a anunciar a secção seguinte. */
  fill?: boolean;
  /** Em semitons: uma secção pode subir de tom para soar fresca. */
  transpose?: number;
}

interface Song {
  bpm: number;
  /** Quanto as colcheias fracas se atrasam, de 0 (direito) a 0,3 (shuffle). */
  swing: number;
  volume: number;
  parts: Record<string, Part>;
  order: readonly string[];
  loop: boolean;
  /** Ao dar a volta, recomeça aqui, para não repetir a introdução. */
  loopFrom?: number;
  /** Uma vinheta que, ao acabar, devolve o tema que tocava antes dela. */
  resume?: boolean;
}

const BAR = 8;

// O hino toca a mesma frase em três sítios: em si bemol, com arpejo, e um tom acima.
const ANTHEM_A = 'bb4:3 bb4 d5:2 f5:2 | g5:3 f5 eb5:2 g5:2 | f5:3 d5 bb4:2 d5:2 | c5:6 r:2 | d5:3 d5 g5:2 bb5:2 | bb5:3 g5 eb5:2 g5:2 | f5:2 eb5:2 d5:2 c5:2 | bb4:6 r:2';
const ANTHEM_CHORDS = 'Bb Eb Bb F Gm Eb Cm,F Bb';
const LOCKER_A = 'd5 r d5 r f5 r e5 r | d5 r d5 r bb4:2 r:2 | g4 r bb4 r d5:2 c#5:2';

const SONGS: Record<Exclude<MusicTheme, 'none'>, Song> = {
  // A cidade: alegre e saltitante, em dó maior. Introdução, A, B, B', C (ponte calma), A com arpejo, D (A a subir para fá), C.
  town: {
    bpm: 108,
    swing: 0.12,
    volume: 0.75,
    loop: true,
    loopFrom: 1,
    order: ['intro', 'A', 'B', 'B2', 'C', 'A2', 'D', 'D2', 'C'],
    parts: {
      intro: { chords: 'C G', melody: 'g5 e5 c5 e5 g5:2 r:2 | f5 d5 b4 d5 g5:2 r:2', lead: 'pulse25', bass: 'long', drums: 'light', fill: true },
      A: {
        chords: 'C Am F G C Am Dm,G C',
        melody: 'e5 r g5 c6:2 b5 a5 g5 | a5:2 e5 c5:2 e5 a5 g5 | f5 r a5 c6:2 a5 f5 a5 | g5:3 f5 e5 d5:3 | e5 r g5 c6:2 b5 a5 g5 | a5:2 c6 e6:2 d6 c6 a5 | f5 a5 d6:2 b5 g5 f5 d5 | c6:4 r g5 e5 g5',
        lead: 'pulse25', bass: 'bounce', drums: 'full', fill: true,
      },
      B: {
        chords: 'F G Em Am F G E7 Am',
        melody: 'a5 a5 r c6 r a5 g5:2 | g5 g5 r b5 r g5 f5:2 | e5 g5 b5 e6:2 d6 b5 g5 | a5:4 r:2 e5 g5 | a5 a5 r c6 r a5 g5:2 | b5 b5 r d6 r b5 a5:2 | g#5 b5 e6:2 d6 b5 g#5 e5 | a5:6 r:2',
        lead: 'pulse50', bass: 'walk', drums: 'groove',
      },
      B2: {
        chords: 'F G Em Am F G G7 C',
        melody: 'a5 a5 r c6 r a5 g5:2 | g5 g5 r b5 r g5 f5:2 | e5 g5 b5 e6:2 d6 b5 g5 | a5:4 r:2 e5 g5 | a5 a5 r c6 r a5 g5:2 | b5 b5 r d6 r b5 a5:2 | g5 b5 d6:2 f6 e6 d6 b5 | c6:6 r:2',
        lead: 'pulse50', bass: 'walk', drums: 'groove', arp: true, fill: true,
      },
      C: {
        chords: 'Dm G Em Am Dm G C C',
        melody: 'd5:3 f5 a5:2 g5 f5 | g5:3 b5 d6:2 c6 b5 | e5:3 g5 b5:2 a5 g5 | a5:6 r:2 | d6:3 c6 a5:2 g5 f5 | g5:3 a5 b5:2 d6 b5 | c6:2 g5 e5 c5:2 e5 g5 | c6:4 r:4',
        lead: 'triangle', bass: 'long', drums: 'light', arp: true, fill: true,
      },
      A2: {
        chords: 'C Am F G C Am Dm,G C',
        melody: 'e5 r g5 c6:2 b5 a5 g5 | a5:2 e5 c5:2 e5 a5 g5 | f5 r a5 c6:2 a5 f5 a5 | g5:3 f5 e5 d5:3 | e5 r g5 c6:2 b5 a5 g5 | a5:2 c6 e6:2 d6 c6 a5 | f5 a5 d6:2 b5 g5 f5 d5 | c6:4 r g5 e5 g5',
        lead: 'pulse50', bass: 'bounce', drums: 'full', arp: true,
      },
      D: {
        chords: 'C Am F G C Am Dm,G C',
        melody: 'e5 r g5 c6:2 b5 a5 g5 | a5:2 e5 c5:2 e5 a5 g5 | f5 r a5 c6:2 a5 f5 a5 | g5:3 f5 e5 d5:3 | e5 r g5 c6:2 b5 a5 g5 | a5:2 c6 e6:2 d6 c6 a5 | f5 a5 d6:2 b5 g5 f5 d5 | c6:4 r g5 e5 g5',
        lead: 'pulse25', bass: 'bounce', drums: 'groove', arp: true, transpose: 5,
      },
      D2: {
        chords: 'C Am F G C Am Dm,G C',
        melody: 'e5 r g5 c6:2 b5 a5 g5 | a5:2 e5 c5:2 e5 a5 g5 | f5 r a5 c6:2 a5 f5 a5 | g5:3 f5 e5 d5:3 | e6 r d6 c6:2 b5 a5 g5 | a5:2 c6 e6:2 d6 c6 a5 | f5 a5 d6:2 b5 g5 f5 d5 | c6:6 r:2',
        lead: 'pulse50', bass: 'bounce', drums: 'full', transpose: 5, fill: true,
      },
    },
  },
  // A despedida: lenta, em lá menor, sem bateria. A, B, A com arpejo, B com outro fim.
  farewell: {
    bpm: 66,
    swing: 0,
    volume: 0.9,
    loop: true,
    order: ['A', 'B', 'A2', 'B2'],
    parts: {
      A: { chords: 'Am F C G Am F Dm,E Am', melody: 'e5:4 a5:2 c6:2 | c6:3 b5 a5:4 | g5:4 e5:2 g5:2 | d5:6 r:2 | e5:4 a5:2 c6:2 | f6:3 e6 c6:4 | d6:2 c6:2 b5:2 g#5:2 | a5:8', lead: 'triangle', bass: 'long' },
      B: { chords: 'F G Em Am F G E E', melody: 'a5:3 c6 f6:4 | g6:3 f6 d6:4 | e6:3 d6 b5:4 | c6:2 b5:2 a5:4 | a5:3 c6 f6:4 | g6:3 f6 e6:2 d6:2 | e6:4 d6:2 b5:2 | g#5:6 r:2', lead: 'pulse25', bass: 'long' },
      A2: { chords: 'Am F C G Am F Dm,E Am', melody: 'e5:4 a5:2 c6:2 | c6:3 b5 a5:4 | g5:4 e5:2 g5:2 | d5:6 r:2 | e5:4 a5:2 c6:2 | f6:3 e6 c6:4 | d6:2 c6:2 b5:2 g#5:2 | a5:8', lead: 'triangle', bass: 'walk', arp: true },
      B2: { chords: 'F G Em Am F G Am Am', melody: 'a5:3 c6 f6:4 | g6:3 f6 d6:4 | e6:3 d6 b5:4 | c6:2 b5:2 a5:4 | a5:3 c6 f6:4 | g6:3 f6 e6:2 d6:2 | c6:4 b5:2 g#5:2 | a5:6 r:2', lead: 'pulse25', bass: 'long', arp: true },
    },
  },
  // O balneário, antes do jogo e ao intervalo: tenso, em ré menor, sem balanço. Notas soltas e repetidas por cima de um baixo
  // a martelar oitavas e palmas no 2 e no 4; a ponte (B) abre num triângulo mais longo, com arpejo, e volta à tensão.
  locker: {
    bpm: 96,
    swing: 0,
    volume: 0.8,
    loop: true,
    order: ['A', 'A2', 'B', 'A2'],
    parts: {
      A: { chords: 'Dm Bb Gm A', melody: `${LOCKER_A} | e5:3 c#5 a4:4`, lead: 'pulse25', bass: 'bounce', drums: 'groove' },
      A2: { chords: 'Dm Bb Gm A', melody: `${LOCKER_A} | e5:2 f5:2 g5:2 a5:2`, lead: 'pulse25', bass: 'bounce', drums: 'groove', fill: true },
      B: { chords: 'Gm Dm Eb A7', melody: 'g5:4 f5:2 d5:2 | f5:4 e5:2 d5:2 | eb5:4 d5:2 c5:2 | c#5:6 r:2', lead: 'triangle', bass: 'walk', drums: 'light', arp: true, fill: true },
    },
  },
  // A entrada das equipas: três compassos de chamada de metais, em ré maior, rápida, com rufo de tarola no acorde final.
  entrance: {
    bpm: 150, swing: 0, volume: 1, loop: false, order: ['A'],
    parts: { A: { chords: 'D G,A D', melody: 'd5 d5 r d5 f#5:2 a5:2 | g5 g5 r b5 a5:2 c#6:2 | d6:6 r:2', lead: 'pulse50', bass: 'bounce', arp: true, drums: 'full', fill: true } },
  },
  // O combo descoberto: um arpejo de sol maior a subir duas oitavas até um sol agudo, com rufo; depois volta o tema de antes.
  combo: {
    bpm: 160, swing: 0, volume: 1.1, loop: false, resume: true, order: ['A'],
    parts: { A: { chords: 'G D,G', melody: 'd4 g4 b4 d5 g5 b5 d6:2 | a5 c6 d6 f#6 g6:4', bassNotes: 'g2:2 b2:2 d3:2 g3:2 d3:4 g2:4', lead: 'pulse25', arp: true, drums: 'light', fill: true } },
  },
  // O título e o fim de época com troféu: uma marcha em si bemol, direita, com ritmo pontuado. Chamada, A, B (sobe pelo
  // relativo menor até um fá com sétima), A com arpejo e A um tom acima, a fechar em glória; dá a volta a partir do A.
  anthem: {
    bpm: 92,
    swing: 0,
    volume: 0.8,
    loop: true,
    loopFrom: 1,
    order: ['intro', 'A', 'B', 'A2', 'A3'],
    parts: {
      intro: { chords: 'Bb F', melody: 'f4 f4 bb4:2 f4 bb4 d5:2 | c5:3 d5 c5:2 a4:2', lead: 'pulse50', bass: 'long', drums: 'light', fill: true },
      A: { chords: ANTHEM_CHORDS, melody: ANTHEM_A, lead: 'pulse50', bass: 'walk', drums: 'full', fill: true },
      B: { chords: 'Eb F Dm Gm Eb F Cm F7', melody: 'g5:4 bb5:4 | a5:4 c6:4 | f5:3 a5 d6:4 | bb5:6 r:2 | g5:3 bb5 eb6:4 | f6:3 eb6 d6:2 c6:2 | eb6:2 d6:2 c6:2 bb5:2 | a5:4 c6:2 eb6:2', lead: 'pulse25', bass: 'long', drums: 'groove', arp: true, fill: true },
      A2: { chords: ANTHEM_CHORDS, melody: ANTHEM_A, lead: 'pulse25', bass: 'walk', drums: 'full', arp: true },
      A3: { chords: ANTHEM_CHORDS, melody: ANTHEM_A, lead: 'pulse50', bass: 'bounce', drums: 'full', arp: true, transpose: 2, fill: true },
    },
  },
  // As vinhetas da vitória e da derrota: curtas e sem volta.
  win: { bpm: 140, swing: 0, volume: 1.2, loop: false, order: ['A'], parts: { A: { chords: 'C C', melody: 'c5 e5 g5 c6:2 g5 c6:4', bassNotes: 'c3:2 e3:2 g3:2 c4:4', lead: 'pulse50', drums: 'none' } } },
  loss: { bpm: 80, swing: 0, volume: 1.2, loop: false, order: ['A'], parts: { A: { chords: 'Am Am', melody: 'e4:2 d#4:2 d4:2 c#4:4', bassNotes: 'a2:4 g#2:6', lead: 'triangle', drums: 'none' } } },
};

const LETTERS: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

function parseNotes(text: string): Note[] {
  return text.split(/\s+/).filter(t => t && t !== '|').map(token => {
    const [name, length] = token.split(':');
    const duration = length ? Number(length) : 1;
    if (name === 'r') return [0, duration];
    const m = /^([a-g])([#b]?)(\d)$/.exec(name!)!;
    return [12 * (Number(m[3]) + 1) + LETTERS[m[1]!]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0), duration];
  });
}

/** Um acorde: a fundamental (no dó 3) e os intervalos. */
function parseChord(name: string): { root: number; tones: number[] } {
  const m = /^([A-G])([#b]?)(.*)$/.exec(name)!;
  const root = 48 + LETTERS[m[1]!.toLowerCase()]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const quality = m[3];
  const tones = quality === 'm' ? [0, 3, 7] : quality === '7' ? [0, 4, 7, 10] : quality === 'm7' ? [0, 3, 7, 10] : [0, 4, 7];
  return { root, tones };
}

/** Os acordes da secção, cada um com o seu início e duração em colcheias. */
function chordTimeline(text: string): { at: number; length: number; root: number; tones: number[] }[] {
  const out: { at: number; length: number; root: number; tones: number[] }[] = [];
  text.split(/\s+/).filter(Boolean).forEach((bar, n) => {
    const names = bar.split(',');
    names.forEach((name, k) => out.push({ at: n * BAR + (k * BAR) / names.length, length: BAR / names.length, ...parseChord(name) }));
  });
  return out;
}

const pitch = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

// O som de pulso das consolas antigas: uma onda quadrada com a parte de cima mais estreita (25 % ou 12,5 %).
const pulseCache = new WeakMap<BaseAudioContext, Map<number, PeriodicWave>>();
function pulse(ctx: BaseAudioContext, duty: number): PeriodicWave {
  let map = pulseCache.get(ctx);
  if (!map) pulseCache.set(ctx, (map = new Map()));
  let wave = map.get(duty);
  if (!wave) {
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    wave = ctx.createPeriodicWave(real, imag);
    map.set(duty, wave);
  }
  return wave;
}

/** Agenda uma secção a partir de `start` e diz quanto dura, em segundos. `pass` conta as voltas, para variar o arranjo. */
export function scheduleSection(ctx: BaseAudioContext, out: AudioNode, noise: AudioBuffer, theme: Exclude<MusicTheme, 'none'>, index: number, start: number, pass: number): number {
  const song = SONGS[theme];
  const part = song.parts[song.order[index]!]!;
  const eighth = 60 / song.bpm / 2;
  const shift = part.transpose ?? 0;
  // As colcheias fracas atrasam-se um pouco: o balanço que faz os temas saltitar.
  const time = (k: number): number => start + k * eighth + (k % 2 === 1 ? song.swing * eighth : 0);
  const v = song.volume;
  const tone = (midi: number, from: number, to: number, kind: Lead | 'bass' | 'arp', volume: number): void => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (kind === 'triangle' || kind === 'bass') osc.type = 'triangle';
    else osc.setPeriodicWave(pulse(ctx, kind === 'pulse50' ? 0.5 : kind === 'arp' ? 0.125 : 0.25));
    osc.frequency.value = pitch(midi);
    const t0 = time(from);
    const t1 = Math.max(t0 + 0.04, time(to) - 0.01);
    // Ataque rápido, cai para metade e corta no fim da nota, como um chip.
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(volume * 0.55, t0 + Math.min(0.12, (t1 - t0) * 0.5));
    gain.gain.setValueAtTime(volume * 0.55, t1 - 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.connect(gain).connect(out);
    osc.start(t0);
    osc.stop(t1 + 0.01);
  };
  // Na segunda volta, a melodia troca de timbre: o mesmo tema com outra cor.
  const lead: Lead = part.lead === 'triangle' ? 'triangle' : (pass % 2 === 1) !== (part.lead === 'pulse50') ? 'pulse50' : 'pulse25';
  let at = 0;
  for (const [midi, length] of parseNotes(part.melody)) {
    if (midi > 0) tone(midi + shift, at, at + length, lead, (lead === 'triangle' ? 0.05 : 0.026) * v);
    at += length;
  }
  const total = at;
  const chords = chordTimeline(part.chords);
  if (part.bassNotes) {
    let b = 0;
    for (const [midi, length] of parseNotes(part.bassNotes)) {
      if (midi > 0) tone(midi + shift, b, b + length, 'bass', 0.06 * v);
      b += length;
    }
  } else {
    for (const c of chords) {
      const root = c.root - 12 + shift;
      const fifth = root + 7;
      if (part.bass === 'long') tone(root, c.at, c.at + c.length, 'bass', 0.06 * v);
      else if (part.bass === 'walk') for (let k = 0; k < c.length; k += 2) tone(k % 4 === 0 ? root : fifth, c.at + k, c.at + k + 2, 'bass', 0.06 * v);
      else for (let k = 0; k < c.length; k++) tone(k % 2 === 0 ? root : root + 12, c.at + k, c.at + k + 1, 'bass', 0.055 * v);
    }
  }
  if (part.arp) {
    // O arpejo sobe e desce pelas notas do acorde; nas voltas ímpares, uma oitava acima.
    const lift = pass % 2 === 1 ? 24 : 12;
    for (const c of chords) {
      const order = [0, 1, 2, 1];
      for (let k = 0; k < c.length; k++) tone(c.root + lift + shift + c.tones[order[k % 4]! % c.tones.length]!, c.at + k, c.at + k + 1, 'arp', 0.011 * v);
    }
  }
  const drum = (kind: 'kick' | 'snare' | 'hat', k: number, volume: number): void => {
    const t = time(k);
    if (kind === 'kick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + 0.15);
      return;
    }
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = kind === 'hat' ? 'highpass' : 'bandpass';
    filter.frequency.value = kind === 'hat' ? 7000 : 1900;
    const gain = ctx.createGain();
    const length = kind === 'hat' ? 0.03 : 0.11;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    source.connect(filter).connect(gain).connect(out);
    source.start(t, (k * 0.137) % 0.8);
    source.stop(t + length + 0.01);
  };
  const style = part.drums ?? 'none';
  const bars = Math.ceil(total / BAR);
  for (let bar = 0; bar < bars && style !== 'none'; bar++) {
    const base = bar * BAR;
    const filling = part.fill && bar === bars - 1;
    const kicks = style === 'full' ? [0, 4] : style === 'groove' ? [0, 3, 4] : [0];
    const snares = filling ? [2, 4, 5, 6, 7] : style === 'light' ? [] : [2, 6];
    const hats = style === 'light' ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6, 7];
    for (const k of kicks) if (!(filling && k >= 4)) drum('kick', base + k, 0.09 * v);
    for (const k of snares) drum('snare', base + k, (filling && k >= 4 ? 0.035 + (k - 4) * 0.008 : 0.045) * v);
    for (const k of hats) drum('hat', base + k, (k % 2 === 0 ? 0.02 : 0.012) * v);
  }
  return total * eighth;
}

/** Quantas secções o tema tem, se dá a volta, onde recomeça, e se devolve o tema de antes. */
export function songShape(theme: Exclude<MusicTheme, 'none'>): { parts: number; loop: boolean; loopFrom: number; resume: boolean } {
  const song = SONGS[theme];
  return { parts: song.order.length, loop: song.loop, loopFrom: song.loopFrom ?? 0, resume: song.resume ?? false };
}

export const MUSIC_THEMES = Object.keys(SONGS) as Exclude<MusicTheme, 'none'>[];

/** Para os testes: quantas colcheias tem a melodia e quantas os acordes, em cada secção pela ordem do tema. */
export function sectionLengths(theme: Exclude<MusicTheme, 'none'>): { melody: number; chords: number }[] {
  const song = SONGS[theme];
  return song.order.map(name => {
    const part = song.parts[name]!;
    return { melody: parseNotes(part.melody).reduce((sum, [, n]) => sum + n, 0), chords: part.chords.split(/\s+/).filter(Boolean).length * BAR };
  });
}
