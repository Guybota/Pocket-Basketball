// Os sons calculados de uma vez para Float32Array, depois tocados como AudioBuffers (audio.ts) e notas (music.ts).
// Funções puras, sem Web Audio, para se poderem testar e ouvir fora do browser.
// Síntese modal (senos que decaem, um por modo de vibração), voz fonte-filtro com formantes, palmas uma a uma,
// metais aditivos, e respostas ao impulso de ruído que decai com os agudos a morrer primeiro.

/** Taxa dos sons gerados: chega para tudo o que tocam e custa um terço do que 96 kHz custaria. O browser converte. */
export const SR = 32000;

export type Mono = Float32Array;
export type Stereo = [Float32Array, Float32Array];
export type Sample = Mono | Stereo;
export type Rng = () => number;

/** Gerador com semente (mulberry32): o mesmo som sai sempre igual, e cada variante tem a sua semente. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = 2 * Math.PI;
const between = (r: Rng, lo: number, hi: number): number => lo + (hi - lo) * r();
const white = (r: Rng): number => r() * 2 - 1;
const samples = (seconds: number, sr = SR): number => Math.round(seconds * sr);
const midiHz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

/** Filtro de segunda ordem (receitas RBJ). O passa-banda tem 0 dB no pico. */
class Biquad {
  private b0 = 0; private b1 = 0; private b2 = 0; private a1 = 0; private a2 = 0;
  private x1 = 0; private x2 = 0; private y1 = 0; private y2 = 0;
  constructor(kind: 'lowpass' | 'highpass' | 'bandpass', f: number, q = 0.707, sr = SR) { this.set(kind, f, q, sr); }
  set(kind: 'lowpass' | 'highpass' | 'bandpass', f: number, q = 0.707, sr = SR): this {
    const w = (TAU * Math.min(f, sr * 0.45)) / sr;
    const c = Math.cos(w);
    const al = Math.sin(w) / (2 * q);
    const a0 = 1 + al;
    const [b0, b1, b2] = kind === 'lowpass' ? [(1 - c) / 2, 1 - c, (1 - c) / 2] : kind === 'highpass' ? [(1 + c) / 2, -(1 + c), (1 + c) / 2] : [al, 0, -al];
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * c) / a0; this.a2 = (1 - al) / a0;
    return this;
  }
  reset(): this { this.x1 = this.x2 = this.y1 = this.y2 = 0; return this; }
  run(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

/** Modo de vibração: frequência, amplitude e tempo de decaimento (s). */
type Mode = readonly [number, number, number];

/** Soma senos que decaem, por recorrência (um ressoador amortecido por modo, sem senos por amostra). */
export function addModes(out: Float32Array, modes: readonly Mode[], r: Rng, start = 0, sr = SR): void {
  for (const [f, amp, tau] of modes) {
    if (f >= sr * 0.45) continue;
    const w = (TAU * f) / sr;
    const d = Math.exp(-1 / (tau * sr));
    const ph = r() * TAU;
    const k1 = 2 * d * Math.cos(w);
    const k2 = d * d;
    let y1 = (amp * Math.sin(ph - w)) / d;
    let y2 = (amp * Math.sin(ph - 2 * w)) / k2;
    // Até -80 dB: depois disso já não se ouve.
    const end = Math.min(out.length, start + Math.ceil(tau * sr * 9.2));
    for (let n = start; n < end; n++) {
      const y = k1 * y1 - k2 * y2;
      out[n]! += y;
      y2 = y1;
      y1 = y;
    }
  }
}

/** Um estalo de ruído filtrado que decai, somado a partir de `start`. */
function addBurst(out: Float32Array, r: Rng, amp: number, tau: number, filter: Biquad | null, start = 0): void {
  const k = Math.exp(-1 / (tau * SR));
  let e = amp;
  for (let n = start; n < out.length && e > 1e-5; n++, e *= k) out[n]! += e * (filter ? filter.run(white(r)) : white(r));
}

/** Tira o desvio DC, põe o pico em `peak` e desvanece as últimas amostras, para não estalar no fim. */
export function normalize<T extends Sample>(s: T, peak = 0.9): T {
  const channels: Float32Array[] = s instanceof Float32Array ? [s] : [...(s as Stereo)];
  // Um passa-alto de uma ordem a ~20 Hz: os modos graves que começam numa fase ao acaso deixam o som desviado do zero.
  for (const ch of channels) {
    let x1 = 0;
    let y1 = 0;
    for (let i = 0; i < ch.length; i++) {
      const x = ch[i]!;
      y1 = x - x1 + 0.996 * y1;
      x1 = x;
      ch[i] = y1;
    }
  }
  let max = 0;
  for (const ch of channels) for (let i = 0; i < ch.length; i++) max = Math.max(max, Math.abs(ch[i]!));
  const g = max > 0 ? peak / max : 0;
  for (const ch of channels) {
    const fade = Math.min(ch.length, samples(0.008));
    for (let i = 0; i < ch.length; i++) ch[i]! *= g * Math.min(1, (ch.length - i) / fade);
  }
  return s;
}

/** Desvanece a última fração do som, para quem soa mais do que o buffer (glockenspiel, timbale) acabar sem corte. */
function fadeOut(x: Float32Array, fraction: number): Float32Array {
  const n = Math.floor(x.length * fraction);
  for (let i = 0; i < n; i++) x[x.length - n + i]! *= 0.5 + 0.5 * Math.cos((Math.PI * i) / n);
  return x;
}

/** Ganhos esquerda/direita de potência constante, de -1 (esquerda) a 1. */
function panGains(p: number): [number, number] {
  const th = ((Math.max(-1, Math.min(1, p)) + 1) * Math.PI) / 4;
  return [Math.cos(th) * Math.SQRT2, Math.sin(th) * Math.SQRT2];
}

function addPanned(out: Stereo, x: Float32Array, at: number, gain: number, p: number): void {
  const [gl, gr] = panGains(p);
  const [l, rr] = out;
  for (let i = 0; i < x.length && at + i < l.length; i++) {
    l[at + i]! += x[i]! * gain * gl;
    rr[at + i]! += x[i]! * gain * gr;
  }
}

// ---------------------------------------------------------------- bola, aro, tabela, rede

/** O aro: um anel de aço com modos inarmónicos que tocam muito, o baque do suporte e o estalo do impacto. */
export function rim(r: Rng): Mono {
  // Um aro é aço grosso aparafusado à tabela e abafado pela rede: um «clank» curto e baixo, não um sino. Notas
  // inarmónicas e graves que morrem em centésimas de segundo, o baque da borracha da bola, e um segundo toque
  // mais fraco logo a seguir, da bola a saltitar no aro.
  const out = new Float32Array(samples(0.35));
  const f0 = between(r, 260, 330);
  const ratios = [1, 1.47, 2.09, 2.56, 3.24, 4.1];
  const amps = [1, 0.7, 0.55, 0.4, 0.25, 0.15];
  const taus = [0.06, 0.045, 0.035, 0.025, 0.018, 0.012];
  const hit = (start: number, gain: number): void => {
    addModes(out, ratios.map((k, i) => [f0 * k, amps[i]! * gain, taus[i]! * between(r, 0.8, 1.2)] as const), r, start);
    addModes(out, [[between(r, 95, 120), 0.7 * gain, 0.035], [210, 0.3 * gain, 0.02]], r, start);
    addBurst(out, r, 0.6 * gain, 0.006, new Biquad('bandpass', 1800, 1), start);
  };
  hit(0, 1);
  hit(samples(between(r, 0.04, 0.07)), between(r, 0.25, 0.4));
  return normalize(out);
}

/**
 * A tabela. A de vidro do pavilhão é uma placa grossa com moldura: um baque cheio e um brilho curto. A de metal da rua
 * é uma chapa: muitos modos juntos, curtos para não soar a gongo, e os parafusos soltos a chocalhar.
 */
export function backboard(r: Rng, kind: 'glass' | 'metal' = 'glass'): Mono {
  const out = new Float32Array(samples(0.4));
  const v = between(r, 0.95, 1.05);
  const a = (): number => between(r, 0.7, 1.4);
  if (kind === 'glass') {
    addModes(out, [[148 * v, a(), 0.05], [310 * v, 0.6 * a(), 0.04], [690 * v, 0.32 * a(), 0.03], [1620 * v, 0.22 * a(), 0.09], [2380 * v, 0.14 * a(), 0.07], [3900 * v, 0.06 * a(), 0.04]], r);
    addBurst(out, r, 1, 0.004, new Biquad('lowpass', 900));
    return normalize(out);
  }
  const modes: Mode[] = [];
  for (let i = 0; i < 14; i++) {
    const f = 180 * v * Math.pow(19, (i + between(r, 0, 0.8)) / 14);
    modes.push([f, a() / (1 + i * 0.25), between(r, 0.03, 0.09) * (1 - i / 20)]);
  }
  addModes(out, modes, r);
  addBurst(out, r, 0.8, 0.005, new Biquad('bandpass', 1200, 0.8));
  for (let t = between(r, 0.02, 0.035), g = 0.3; g > 0.04; t += between(r, 0.025, 0.045), g *= 0.6) addBurst(out, r, g, 0.003, new Biquad('bandpass', between(r, 2000, 3200), 2), samples(t));
  return normalize(out);
}

/**
 * A rede: um «chhff» de ruído agudo que entra a descer de tom e um segundo sopro mais fraco quando a rede volta ao
 * sítio. Sem cliques nem graves, que soavam a soco.
 */
export function swish(r: Rng): Mono {
  const out = new Float32Array(samples(0.42));
  const band = new Biquad('bandpass', 5000, 0.9);
  const low = new Biquad('highpass', 500);
  const rise = between(r, 0.03, 0.045);
  const tail = between(r, 0.08, 0.11);
  const back = between(r, 0.1, 0.14);
  const backGain = between(r, 0.35, 0.55);
  let flutter = 0;
  for (let n = 0; n < out.length; n++) {
    const t = n / SR;
    if (n % 32 === 0) band.set('bandpass', 2600 + 2600 * Math.exp(-t / 0.09), 0.9);
    const k = Math.min(1, t / rise);
    const entry = t < rise ? k * k * (3 - 2 * k) : Math.exp(-(t - rise) / tail);
    const j = Math.min(1, Math.max(0, (t - back) / 0.02));
    const snap = t < back ? 0 : backGain * j * j * (3 - 2 * j) * Math.exp(-(t - back - 0.02) / 0.06);
    flutter += 0.01 * (white(r) - flutter);
    out[n] = low.run(band.run(white(r))) * (entry + Math.min(snap, backGain)) * (1 + 1.2 * flutter);
  }
  return normalize(out, 0.7);
}

/** A rede de corrente do campo de rua: os elos a bater uns nos outros, um «tchling» feito de muitos toques curtos. */
export function chains(r: Rng): Mono {
  const out = new Float32Array(samples(0.6));
  const total = between(r, 0.35, 0.5);
  addBurst(out, r, 0.5, 0.004, new Biquad('bandpass', 3000, 0.8));
  for (let t = 0; t < total; t += -Math.log(1 - r() * 0.999) / (450 * Math.exp(-t / 0.15) + 60)) {
    const f = between(r, 2500, 7000);
    const g = between(r, 0.3, 1) * Math.exp(-t / 0.18);
    const tau = between(r, 0.003, 0.009);
    addModes(out, [[f, g, tau], [f * 1.53, g * 0.5, tau * 0.7], [f * 2.31, g * 0.25, tau * 0.5]], r, samples(t));
  }
  return normalize(out, 0.75);
}

// ---------------------------------------------------------------- árbitro, buzinas, ténis, mãos e corpos

/**
 * O apito de ervilha: um tom perto dos 3 kHz que a ervilha, a rodar lá dentro, faz tremer de forma irregular
 * (30 a 60 vezes por segundo), com sopro por baixo e o tom a subir no início e a cair no fim.
 */
export function whistle(seconds: number, r: Rng): Mono {
  const out = new Float32Array(samples(seconds));
  const f0 = between(r, 2900, 3500);
  const breath = new Biquad('bandpass', f0, 2.5);
  const attack = between(r, 0.02, 0.035);
  const release = between(r, 0.03, 0.05);
  let phase = 0;
  let pea = r() * TAU;
  let rate = between(r, 30, 60);
  let wobble = 0;
  for (let n = 0; n < out.length; n++) {
    const t = n / SR;
    if (n % 64 === 0) rate += 0.2 * (between(r, 30, 60) - rate);
    pea += (TAU * rate) / SR;
    wobble += 0.03 * (white(r) - wobble);
    const m = Math.max(-1, Math.min(1, Math.sin(pea) + 2 * wobble));
    const end = Math.max(0, (t - (seconds - release)) / release);
    const glide = 1 - 0.06 * Math.exp(-t / 0.02) - 0.05 * end;
    phase += (TAU * f0 * glide * (1 + 0.02 * m)) / SR;
    const k = Math.min(1, t / attack);
    const env = k * k * (3 - 2 * k) * (1 - end * end);
    const am = 1 - 0.25 * (1 + m);
    out[n] = env * (am * (Math.sin(phase) + 0.12 * Math.sin(2 * phase)) + 0.35 * breath.run(white(r)));
  }
  return normalize(out);
}

/** Soma de harmónicos `1/k` (um dente de serra sem dobras) pela recorrência de Chebyshev, até `top` Hz. */
function sawAt(phase: number, f: number, top: number): number {
  const K = Math.max(1, Math.floor(Math.min(top, SR * 0.45) / f));
  const s1 = Math.sin(phase);
  const c2 = 2 * Math.cos(phase);
  let prev = 0;
  let sk = s1;
  let sum = s1;
  for (let k = 2; k <= K; k++) {
    const next = c2 * sk - prev;
    prev = sk;
    sk = next;
    sum += sk / k;
  }
  return sum;
}

/**
 * A buzina do pavilhão: duas notas de palheta a uma terça maior, a zumbir uma contra a outra, com a corneta a dar
 * corpo entre 600 e 1200 Hz. Grave e comprida para o fim do período, aguda e curta para os 24 segundos.
 */
export function horn(frequency: number, seconds: number, r: Rng): Mono {
  const out = new Float32Array(samples(seconds));
  const bell = new Biquad('bandpass', between(r, 750, 950), 1.1);
  const body = new Biquad('lowpass', 3200);
  const voices = [frequency, frequency * 1.004, frequency * 1.26].map(f => ({ f, phase: r() * TAU }));
  const attack = 0.025;
  const release = 0.05;
  for (let n = 0; n < out.length; n++) {
    const t = n / SR;
    let s = 0;
    for (const v of voices) {
      v.phase += (TAU * v.f) / SR;
      s += sawAt(v.phase, v.f, 5000);
    }
    const k = Math.min(1, t / attack);
    const env = k * k * (3 - 2 * k) * Math.min(1, (seconds - t) / release);
    out[n] = env * (0.55 * bell.run(s) + 0.45 * body.run(s));
  }
  return normalize(out);
}

/**
 * Ténis a chiar no soalho: a borracha agarra e solta milhares de vezes por segundo (um trem de pulsos, não um seno),
 * com o tom a deslizar e os pulsos nunca certinhos.
 */
export function squeak(r: Rng): Mono {
  const seconds = between(r, 0.08, 0.22);
  const out = new Float32Array(samples(seconds + 0.03));
  const f0 = between(r, 2400, 4200);
  const slide = between(r, -0.15, 0.2);
  const first = new Biquad('bandpass', f0, 6);
  const second = new Biquad('bandpass', f0 * 2, 8);
  let next = 0;
  let grip = 1;
  for (let n = 0; n < out.length; n++) {
    const t = n / SR;
    const f = f0 * (1 + (slide * Math.min(t, seconds)) / seconds);
    if (n % 64 === 0) {
      first.set('bandpass', f, 6);
      second.set('bandpass', f * 2, 8);
      grip += 0.3 * (between(r, 0.5, 1) - grip);
    }
    const k = Math.min(1, t / 0.005);
    const env = t < seconds ? k * grip * Math.min(1, (seconds - t) / 0.02 + 0.05) : 0;
    let x = 0.04 * white(r) * env;
    if (n >= next && env > 0) {
      x += env * between(r, 0.7, 1);
      next = n + (SR / f) * (1 + 0.04 * white(r));
    }
    out[n] = first.run(x) + 0.35 * second.run(x);
  }
  return normalize(out, 0.8);
}

/**
 * A palmada na bola: a pele da mão contra a borracha e um baque curto do ar lá dentro. `force` vai de 0 (receber um
 * passe, e também a bola a bater no chão, que soa igual) a 1 (um desarme de lançamento): mais força, mais forte,
 * mais claro e com mais corpo. O que muda de campo para campo é a sala, não o som da bola.
 */
export function slap(force: number, r: Rng): Mono {
  const out = new Float32Array(samples(0.14));
  addBurst(out, r, 1, between(r, 0.004, 0.007) * (1 + force * 0.4), new Biquad('bandpass', between(r, 900, 1500) * (1 + force * 0.3), 1.2 - force * 0.4));
  addModes(out, [[between(r, 140, 190), 0.4 + 0.6 * force, 0.012 + 0.02 * force], [between(r, 960, 1010), 0.12 + 0.1 * force, 0.01]], r);
  return normalize(out);
}

/** Um encontrão: dois corpos a chocar, um baque surdo e o roçar das camisolas. */
export function thud(r: Rng): Mono {
  const out = new Float32Array(samples(0.2));
  addModes(out, [[between(r, 70, 90), 1, 0.03], [between(r, 120, 150), 0.6, 0.025], [between(r, 200, 260), 0.3, 0.015]], r);
  addBurst(out, r, 0.4, 0.004, new Biquad('lowpass', 1200));
  addBurst(out, r, 0.35, 0.025, new Biquad('bandpass', between(r, 1200, 2000), 0.7));
  return normalize(out);
}

/** Um toque de recompensa: uma nota curta de sino com um pouco de onda quadrada, para lembrar as consolas de bolso. */
export function chime(midi: number, r: Rng): Mono {
  const out = new Float32Array(samples(0.5));
  const f = midiHz(midi);
  addModes(out, [[f, 1, 0.16], [f * 3, 0.3, 0.07], [f * 5, 0.15, 0.04], [f * 2.756, 0.12, 0.05]], r);
  addBurst(out, r, 0.15, 0.0007, new Biquad('highpass', 3000));
  return normalize(out, 0.8);
}

/** Uma batida da claque: um grupo a bater palmas quase ao mesmo tempo. */
export function clapBeat(people: number, r: Rng): Stereo {
  const out: Stereo = [new Float32Array(samples(0.2)), new Float32Array(samples(0.2))];
  const hand = new Biquad('bandpass', 1000, 1.4);
  const cup = new Biquad('bandpass', 500, 4);
  for (let p = 0; p < people; p++) addClap(out, samples(between(r, 0, 0.025)), between(r, 0.6, 1), hand, cup, between(r, 900, 2600), between(r, 400, 700), between(r, 0, 0.6), panGains(between(r, -0.9, 0.9)), r);
  return normalize(out);
}

// ---------------------------------------------------------------- a rua

/**
 * Um carro a passar ao longe, de um lado para o outro: o motor (um zumbido grave com harmónicos) e o rolar dos pneus,
 * que crescem quando ele chega e descem de tom quando passa (Doppler). É o tom do motor que o distingue do mar: ruído
 * filtrado a crescer e a desfazer-se, sozinho, soava a ondas.
 */
export function carPass(r: Rng): Stereo {
  const seconds = between(r, 2.2, 3);
  const n = samples(seconds);
  const out: Stereo = [new Float32Array(n), new Float32Array(n)];
  const f0 = between(r, 55, 80);
  const shift = between(r, 0.05, 0.08);
  const side = r() < 0.5 ? -1 : 1;
  const tyres = new Biquad('bandpass', between(r, 500, 800), 0.8);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const x = ((i / n) - 0.5) * 2;
    const near = 1 / (1 + 16 * x * x);
    const f = f0 * (1 - (shift * x) / Math.sqrt(x * x + 0.04));
    phase += (TAU * f) / SR;
    const y = (0.6 * sawAt(phase, f, 1500) + 0.5 * tyres.run(white(r))) * near;
    const [gl, gr] = panGains(side * x * 0.8);
    out[0][i] = y * gl;
    out[1][i] = y * gr;
  }
  return normalize(out, 0.8);
}

/** Um pássaro: dois a cinco piados curtos e agudos, que sobem ou descem. */
export function chirp(r: Rng): Mono {
  const out = new Float32Array(samples(0.8));
  const base = between(r, 3000, 4500);
  const bend = r() < 0.5 ? between(r, 1.15, 1.35) : between(r, 0.7, 0.85);
  let at = 0;
  for (let k = Math.floor(between(r, 2, 6)); k > 0; k--) {
    const length = samples(between(r, 0.05, 0.09));
    const f = base * between(r, 0.95, 1.05);
    let phase = 0;
    for (let i = 0; i < length && at + i < out.length; i++) {
      const u = i / length;
      phase += (TAU * f * (1 + (bend - 1) * u)) / SR;
      out[at + i] = Math.sin(phase) * Math.sin(Math.PI * u);
    }
    at += length + samples(between(r, 0.05, 0.12));
  }
  return normalize(out, 0.7);
}

// ---------------------------------------------------------------- vozes da bancada

/** Formantes (Hz) das vogais. */
const VOWELS = {
  a: [730, 1090, 2440, 3400], o: [570, 840, 2410, 3400], u: [300, 870, 2240, 3300], U: [440, 1020, 2240, 3300],
  A: [640, 1190, 2390, 3400], E: [580, 1700, 2500, 3500], ei: [400, 2000, 2550, 3500], i: [270, 2290, 3010, 3600],
  er: [490, 1350, 1690, 3300], e: [530, 1840, 2480, 3500],
} as const;
type Vowel = keyof typeof VOWELS;
const VOWEL_NAMES = Object.keys(VOWELS) as Vowel[];
const BANDWIDTHS = [85, 110, 160, 220];

/** Uma curva por pontos (tempo em s, valor), lida amostra a amostra. */
type Track = readonly (readonly [number, number])[];

/** Lê a curva por tempos sempre a crescer, sem criar listas. */
function reader(track: Track): (t: number) => number {
  const last = track.length - 1;
  let k = 0;
  return t => {
    while (k < last - 1 && track[k + 1]![0] <= t) k++;
    const p0 = track[k]!;
    const p1 = track[Math.min(k + 1, last)]!;
    return t <= p0[0] ? p0[1] : t >= p1[0] ? p1[1] : p0[1] + ((p1[1] - p0[1]) * (t - p0[0])) / (p1[0] - p0[0]);
  };
}

/** Quem grita: homem, mulher ou criança, com a voz mais aguda e as formantes mais altas. */
interface Person { base: number; scale: number }
function person(r: Rng): Person {
  const roll = r();
  return roll < 0.6 ? { base: between(r, 95, 150), scale: between(r, 0.95, 1.05) }
    : roll < 0.9 ? { base: between(r, 175, 250), scale: between(r, 1.1, 1.18) }
    : { base: between(r, 250, 320), scale: between(r, 1.2, 1.3) };
}

/**
 * Voz fonte-filtro: um dente de serra sem dobras (polyBLEP) com um pouco de sopro, por quatro ressoadores em cascata
 * (as formantes). `pitch` em Hz, `amp` de 0 a 1, `breath` a parte de ar.
 */
function vox(seconds: number, pitch: Track, vowels: readonly (readonly [number, Vowel])[], amp: Track, breath: Track, scale: number, r: Rng): Mono {
  const n = samples(seconds);
  const out = new Float32Array(n);
  const f0 = reader(pitch);
  const a = reader(amp);
  const air = reader(breath);
  const formants = BANDWIDTHS.map((_, i) => reader(vowels.map(([t, v]) => [t, VOWELS[v][i]! * scale] as const)));
  const A = new Float64Array(4), B = new Float64Array(4), C = new Float64Array(4), y1 = new Float64Array(4), y2 = new Float64Array(4);
  let phase = r();
  let drift = 0;
  let f = 0, gain = 0, noise = 0;
  for (let i = 0; i < n; i++) {
    if (i % 16 === 0) {
      const t = i / SR;
      f = f0(t);
      gain = a(t);
      noise = air(t) * 2;
      if (i % 64 === 0) {
        // Ressoador de Klatt, com ganho 1 em 0 Hz: a cascata dá às formantes a altura certa sozinha.
        for (let k = 0; k < 4; k++) {
          const d = Math.exp((-Math.PI * BANDWIDTHS[k]! * (1 + 0.3 * (scale - 1))) / SR);
          B[k] = 2 * d * Math.cos((TAU * formants[k]!(t)) / SR);
          C[k] = -d * d;
          A[k] = 1 - B[k]! - C[k]!;
        }
      }
    }
    drift += 0.002 * (white(r) - drift);
    const dt = (f * (1 + 0.6 * drift)) / SR;
    phase += dt;
    if (phase >= 1) phase -= 1;
    let saw = 2 * phase - 1;
    if (phase < dt) { const x = phase / dt; saw -= x + x - x * x - 1; }
    else if (phase > 1 - dt) { const x = (phase - 1) / dt; saw -= x * x + x + x + 1; }
    let x = (saw + noise * white(r)) * gain;
    for (let k = 0; k < 4; k++) {
      const y = A[k]! * x + B[k]! * y1[k]! + C[k]! * y2[k]!;
      y2[k] = y1[k]!;
      y1[k] = y;
      x = y;
    }
    out[i] = x;
  }
  return normalize(out);
}

export type Shout = 'hey' | 'ooh' | 'oh';

/** Um grito: «hey!» a subir, «uuuh» a cair (falhou), «ohhh» de espanto. */
export function shout(kind: Shout, r: Rng, who: Person = person(r)): Mono {
  const b = who.base;
  if (kind === 'hey') {
    const d = between(r, 0.28, 0.42);
    return vox(d, [[0, 1.5 * b], [0.08, 1.75 * b], [d, 1.35 * b]], [[0, 'E'], [0.7 * d, 'ei'], [d, 'i']], [[0, 0], [0.03, 1], [d - 0.1, 0.85], [d, 0]], [[0, 0.9], [0.05, 0.12]], who.scale, r);
  }
  if (kind === 'ooh') {
    const d = between(r, 0.55, 0.85);
    return vox(d, [[0, 1.3 * b], [0.12, 1.42 * b], [d, 0.92 * b]], [[0, 'u'], [0.4 * d, 'U'], [d, 'u']], [[0, 0], [0.08, 1], [0.6 * d, 0.8], [d, 0]], [[0, 0.15]], who.scale, r);
  }
  const d = between(r, 0.5, 0.8);
  return vox(d, [[0, 1.15 * b], [0.35 * d, 1.6 * b], [d, 1.25 * b]], [[0, 'o'], [0.45 * d, 'A'], [d, 'o']], [[0, 0], [0.06, 1], [0.7 * d, 0.9], [d, 0]], [[0, 0.3], [0.08, 0.12]], who.scale, r);
}

/** Muitos a gritar o mesmo, cada um com a sua voz, um pouco desencontrados e espalhados pela bancada. */
export function crowd(kind: Shout, people: number, r: Rng): Stereo {
  const n = samples(1.3);
  const out: Stereo = [new Float32Array(n), new Float32Array(n)];
  const spread = kind === 'hey' ? 0.15 : 0.25;
  for (let p = 0; p < people; p++) addPanned(out, shout(kind, r), samples(between(r, 0, spread)), between(r, 0.5, 1), between(r, -0.85, 0.85));
  return normalize(out);
}

/** Burburinho: vários a conversar ao longe, sílabas ao acaso e pausas. Entra e sai devagar, para se encadear. */
export function babble(people: number, seconds: number, r: Rng): Stereo {
  const n = samples(seconds);
  const out: Stereo = [new Float32Array(n), new Float32Array(n)];
  for (let p = 0; p < people; p++) {
    const who = person(r);
    const pitch: [number, number][] = [[0, who.base]];
    const amp: [number, number][] = [[0, 0]];
    const vowels: [number, Vowel][] = [];
    for (let t = between(r, 0, 0.4); t < seconds - 0.3;) {
      if (r() > 0.75) {
        t += between(r, 0.25, 0.8);
        amp.push([t - 0.01, 0]);
        continue;
      }
      const L = between(r, 0.6, 1.4) / 4.2;
      vowels.push([t + L * 0.5, VOWEL_NAMES[Math.floor(r() * VOWEL_NAMES.length)]!]);
      pitch.push([t, who.base * between(r, 0.9, 1.2)], [t + L, who.base * between(r, 0.8, 1.1)]);
      amp.push([t, 0.05], [t + L * 0.25, between(r, 0.6, 1)], [t + L * 0.8, between(r, 0.4, 0.8)], [t + L, 0.05]);
      t += L;
    }
    if (vowels.length < 2) continue;
    amp.push([seconds, 0]);
    const voice = vox(seconds, pitch, [[0, vowels[0]![1]], ...vowels], amp, [[0, 0.2]], who.scale, r);
    addPanned(out, voice, 0, between(r, 0.5, 1), between(r, -0.9, 0.9));
  }
  const fade = samples(Math.min(0.6, seconds / 3));
  for (const ch of out) for (let i = 0; i < fade; i++) {
    const w = 0.5 - 0.5 * Math.cos((Math.PI * i) / fade);
    ch[i]! *= w;
    ch[n - 1 - i]! *= w;
  }
  return normalize(out, 0.8);
}

/** Uma palmada: ruído pela ressonância da mão (mais aguda) e da concha das mãos (mais grave), em 50 ms. */
function addClap(out: Stereo, at: number, gain: number, hand: Biquad, cup: Biquad, fc: number, cupF: number, cupped: number, [gl, gr]: [number, number], r: Rng): void {
  const [l, rr] = out;
  hand.reset().set('bandpass', fc * between(r, 0.9, 1.1), 1.4);
  cup.reset().set('bandpass', cupF, 4);
  const d1 = Math.exp(-1 / (between(r, 0.005, 0.009) * SR));
  const d2 = Math.exp(-1 / (0.012 * SR));
  let e1 = gain;
  let e2 = gain * cupped;
  for (let i = 0; i < samples(0.05) && at + i < l.length; i++, e1 *= d1, e2 *= d2) {
    const w = white(r);
    const y = hand.run(w) * e1 + cup.run(w) * e2;
    l[at + i]! += y * gl;
    rr[at + i]! += y * gr;
  }
}

/** Aplausos: cada pessoa bate palmas ao seu ritmo, com as mãos mais ou menos em concha, e pára quando lhe apetece. */
export function applause(people: number, seconds: number, r: Rng): Stereo {
  const n = samples(seconds);
  const out: Stereo = [new Float32Array(n), new Float32Array(n)];
  const hand = new Biquad('bandpass', 1000, 1.4);
  const cup = new Biquad('bandpass', 500, 4);
  for (let p = 0; p < people; p++) {
    const rate = between(r, 3.6, 5.6);
    const fc = between(r, 900, 2600);
    const cupped = between(r, 0, 0.6);
    const cupF = between(r, 400, 700);
    const pan = panGains(between(r, -0.9, 0.9));
    const stop = seconds * between(r, 0.55, 1);
    for (let t = between(r, 0, 0.25); t < stop; t += (1 / rate) * between(r, 0.9, 1.1)) addClap(out, samples(t), between(r, 0.6, 1) * (1 - (0.5 * t) / seconds), hand, cup, fc, cupF, cupped, pan, r);
  }
  return normalize(out);
}

// ---------------------------------------------------------------- instrumentos da música

/** Tarola: modos da pele (com a tensão a baixar o tom no ataque), arames e o clique da baqueta. */
export function snare(r: Rng): Mono {
  const n = samples(0.3);
  const out = new Float32Array(n);
  const tune = between(r, 0.97, 1.03);
  const ratios = [1, 1.593, 2.136, 2.296, 2.653];
  const amps = [0.9, 0.5, 0.3, 0.22, 0.14];
  const taus = [0.05, 0.035, 0.028, 0.022, 0.018];
  const hp = new Biquad('highpass', 1700);
  const lp = new Biquad('lowpass', 10500);
  const click = new Biquad('highpass', 2500);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * 196 * tune * (1 + 0.07 * Math.exp(-t / 0.01))) / SR;
    let body = 0;
    for (let k = 0; k < 5; k++) body += amps[k]! * Math.exp(-t / taus[k]!) * Math.sin(ratios[k]! * ph + k);
    const wires = lp.run(hp.run(white(r))) * Math.exp(-t / 0.125) * (1 - Math.exp(-t / 0.0012));
    out[i] = 0.55 * body + 0.85 * wires + 0.3 * click.run(white(r)) * Math.exp(-t / 0.0007);
  }
  return normalize(out);
}

/**
 * Metais aditivos: harmónicos que abrem com a força da nota (o «blat» do ataque), uma formante de trompa e o lábio a
 * entrar por baixo do tom («scoop»). Uma nota longa; quem toca corta-a com o envelope.
 */
export function brass(midi: number, r: Rng, seconds = 2.6): Mono {
  const n = samples(seconds);
  const out = new Float32Array(n);
  const f = midiHz(midi);
  const K = Math.max(1, Math.floor(Math.min(40, 5000 / f, (SR * 0.42) / f)));
  const base = new Float32Array(K + 1);
  for (let k = 1; k <= K; k++) base[k] = Math.pow(k, -0.75) * (1 + 1.2 * Math.exp(-(((k * f - 900) / 450) ** 2)));
  const weights = new Float32Array(K + 1);
  const att = 0.025;
  const breath = new Biquad('bandpass', 1000, 0.6);
  let ph = 0;
  let drift = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let env = t < att ? Math.pow(t / att, 1.5) : 1;
    env *= (1 + 0.14 * Math.exp(-(((t - att) / 0.035) ** 2))) * (0.85 + 0.15 * Math.exp(-t / 0.16));
    env *= Math.min(1, (seconds - t) / 0.15);
    if (i % 16 === 0) {
      const bc = 1.8 + 6.5 * 0.8 * Math.pow(Math.max(0, env), 1.4);
      for (let k = 1; k <= K; k++) weights[k] = base[k]! / (1 + (k / bc) ** 3);
    }
    drift += 0.001 * (white(r) - drift);
    const cents = -22 * Math.exp(-t / 0.03) + 120 * drift;
    ph += (TAU * f * (1 + cents * 0.000577623)) / SR;
    // sin(kφ) pela recorrência de Chebyshev: um seno e um cosseno por amostra, em vez de um por harmónico.
    const s1 = Math.sin(ph);
    const c2 = 2 * Math.cos(ph);
    let sPrev = 0;
    let sk = s1;
    let sum = weights[1]! * s1;
    for (let k = 2; k <= K; k++) {
      const next = c2 * sk - sPrev;
      sPrev = sk;
      sk = next;
      sum += weights[k]! * sk;
    }
    out[i] = sum * env + breath.run(white(r)) * Math.exp(-t / 0.02) * 0.15;
  }
  return normalize(out);
}

/** Glockenspiel: barra de metal com parciais 1 : 2,756 : 5,404 : 8,933 e o toque da baqueta. */
export function glock(midi: number, r: Rng): Mono {
  const out = new Float32Array(samples(1.8));
  const f = midiHz(midi);
  const k = Math.pow(880 / f, 0.35);
  addModes(out, [[f, 1, 1.25 * k], [f * 2.756, 0.3, 0.22 * k], [f * 5.404, 0.12, 0.07], [f * 8.933, 0.05, 0.025]], r);
  addBurst(out, r, 0.25, 0.0007, new Biquad('highpass', 3000));
  return normalize(fadeOut(out, 0.4));
}

/** Timbale: modos da pele que descem um pouco de tom logo a seguir ao golpe, e o baque da maceta. */
export function timpani(midi: number, r: Rng): Mono {
  const n = samples(2);
  const out = new Float32Array(n);
  const f = midiHz(midi);
  const modes: readonly Mode[] = [[1, 1, 1.5], [1.504, 0.55, 0.9], [1.742, 0.3, 0.6], [2, 0.35, 0.5], [2.245, 0.18, 0.4], [2.494, 0.12, 0.3]];
  const glideDecay = Math.exp(-1 / (0.06 * SR));
  modes.forEach(([ratio, amp, tau]) => {
    const decay = Math.exp(-1 / (tau * SR));
    let ph = r() * TAU;
    let e = amp;
    let glide = 0.02;
    for (let i = 0; i < n && e > 1e-4; i++, e *= decay, glide *= glideDecay) {
      ph += (TAU * f * ratio * (1 + glide)) / SR;
      out[i]! += e * Math.sin(ph);
    }
  });
  addBurst(out, r, 0.9, 0.018, new Biquad('lowpass', 400));
  return normalize(fadeOut(out, 0.4));
}

// ---------------------------------------------------------------- salas

export type Room = 'street' | 'school' | 'hall' | 'arena' | 'closed';

/**
 * Cada sala: tempo de reverberação (s), o brilho inicial (Hz) e quão depressa os agudos morrem (s), o atraso antes de a
 * cauda chegar, e reflexões soltas (tempo, ganho). A rua só tem as fachadas ali perto; o pavilhão vazio, paredes
 * paralelas que devolvem o som várias vezes.
 */
export const ROOMS: Record<Room, { rt60: number; bright: number; damp: number; pre: number; early: readonly (readonly [number, number])[] }> = {
  street: { rt60: 0.3, bright: 5000, damp: 0.08, pre: 0.004, early: [[0.045, 0.5], [0.09, 0.2]] },
  school: { rt60: 0.9, bright: 9000, damp: 0.6, pre: 0.008, early: [[0.017, 0.4], [0.031, 0.3]] },
  hall: { rt60: 1.5, bright: 7000, damp: 0.5, pre: 0.012, early: [[0.024, 0.3], [0.047, 0.2]] },
  arena: { rt60: 2.6, bright: 5000, damp: 0.6, pre: 0.03, early: [[0.05, 0.2], [0.09, 0.15]] },
  closed: { rt60: 2.4, bright: 8000, damp: 1.2, pre: 0.01, early: [[0.13, 0.55], [0.26, 0.38], [0.39, 0.25], [0.52, 0.14]] },
};

/** Resposta ao impulso estéreo: ruído diferente em cada lado que decai, por um passa-baixo que vai fechando. */
export function roomImpulse(room: Room, sr: number, r: Rng): Stereo {
  const { rt60, bright, damp, pre, early } = ROOMS[room];
  const start = samples(pre, sr);
  const n = start + samples(rt60 * 1.1, sr);
  const out: Stereo = [new Float32Array(n), new Float32Array(n)];
  const decay = Math.exp(-6.91 / (rt60 * sr));
  const rise = samples(0.01, sr);
  out.forEach((ch, side) => {
    let e = 1;
    let low = 0;
    let a = 1;
    for (let i = start; i < n; i++, e *= decay) {
      const t = (i - start) / sr;
      if ((i - start) % 64 === 0) a = 1 - Math.exp((-TAU * Math.max(500, bright * Math.exp(-t / damp))) / sr);
      low += a * (white(r) * e - low);
      ch[i] = low * Math.min(1, (i - start) / rise);
    }
    // Cada reflexão é um estalo de 2 ms, um pouco mais forte de um lado.
    early.forEach(([t, g], k) => {
      const at = start + samples(t, sr);
      const gain = g * ((k + side) % 2 === 0 ? 1 : 0.6);
      for (let i = 0; i < samples(0.002, sr) && at + i < n; i++) ch[at + i]! += white(r) * gain * (1 - i / samples(0.002, sr));
    });
  });
  return normalize(out);
}
