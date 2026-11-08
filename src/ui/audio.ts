import type { Sound } from './match-view.ts';

import { MUSIC_THEMES, scheduleSection, songShape, type Instrument, type MusicKit, type MusicTheme } from './music.ts';
import {
  SR, applause, babble, backboard, bounce, brass, crowd, glock, makeRng, rim, roomImpulse, shout, snare, swish, timpani,
  type Rng, type Room, type Sample, type Shout,
} from './synth.ts';

export { MUSIC_THEMES, type MusicTheme };

/** Os pavilhões pela ordem de art/court.ts: as quatro divisões e, no fim, CLOSED_GYM (o do jogo-treino, vazio). */
type Venue = Room;
const VENUES: readonly Venue[] = ['street', 'school', 'hall', 'arena', 'closed'];

/**
 * A gente de cada pavilhão: o volume da bancada (0 a 1), quantas vozes gritam juntas, quantas pessoas batem palmas e
 * quantas conversam no burburinho; e quanto se ouve da sala. Poucos no bairro, ninguém no jogo-treino.
 */
const CROWDS: Record<Venue, { level: number; voices: number; claps: number; talkers: number; wet: number }> = {
  street: { level: 0.25, voices: 3, claps: 5, talkers: 0, wet: 0.1 },
  school: { level: 0.4, voices: 6, claps: 12, talkers: 0, wet: 0.25 },
  hall: { level: 0.7, voices: 10, claps: 24, talkers: 5, wet: 0.2 },
  arena: { level: 1, voices: 16, claps: 44, talkers: 8, wet: 0.2 },
  closed: { level: 0, voices: 0, claps: 0, talkers: 0, wet: 0.4 },
};

// Todos os sons são sintetizados, por isso não há ficheiros de áudio para carregar. Os da bola, da bancada e dos
// instrumentos calculam-se uma vez (synth.ts) para AudioBuffers, com algumas variantes, e depois só se tocam: os do
// pavilhão quando se escolhe o pavilhão, os outros ao destrancar o som, nos momentos livres do browser.
// Não há um ruído fixo de fundo: ruído filtrado sem parar soa a mar. O ambiente vem de sons curtos e soltos, e na arena
// de pedaços de burburinho encadeados.
//
// Encaminhamento (criado em unlock):
//   efeitos → room ─────────────────────────→ effectsBus ──────┐
//              └→ sala (ConvolverNode) → wet ┘                 │
//   tema    → musicGain → musicBus → duck ─────────────────────┴→ master → compressor → destination
// A sala depende do pavilhão: seca na rua, grande na arena, muito ecoante no pavilhão vazio.
export class GameAudio {
  private context: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private kit: MusicKit | null = null;
  /** As amostras já calculadas, por nome. */
  private sets = new Map<string, AudioBuffer[]>();
  private impulses = new Map<Venue, AudioBuffer>();
  /** Amostras por calcular nos momentos livres. */
  private queue: (() => unknown)[] = [];
  /** De 0 (sem público) a 1 (arena cheia). */
  private crowdLevel = 0.6;
  private venue: Venue = 'hall';
  private nextAmbience = 0;
  private nextMurmur = 0;
  private theme: MusicTheme = 'none';
  /** O tema a retomar quando acaba uma vinheta com `resume`. */
  private resumeTheme: MusicTheme = 'none';
  private musicTimer = 0;
  /** Ganho de cada tema, só para o desvanecer ao trocar; o volume está em musicBus. */
  private musicGain: GainNode | null = null;
  private master: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private room: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private wet: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private duck: GainNode | null = null;
  private volumes = { master: 1, effects: 1, music: 1 };
  muted = false;

  /** Os browsers só deixam tocar som depois de um gesto do jogador. */
  unlock(): void {
    if (this.context) {
      void this.context.resume();
      return;
    }
    const AudioCtor = window.AudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    this.context = ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    this.kit = { noise: buffer, note: (instrument, midi) => this.note(instrument, midi) };
    // Valores suaves: só apanha os picos de vários sons ao mesmo tempo, sem esmagar a dinâmica.
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.2;
    this.master = ctx.createGain();
    this.master.gain.value = this.masterLevel();
    this.effectsBus = ctx.createGain();
    this.effectsBus.gain.value = this.volumes.effects;
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.volumes.music;
    this.duck = ctx.createGain();
    this.musicBus.connect(this.duck).connect(this.master);
    this.effectsBus.connect(this.master);
    this.room = ctx.createGain();
    this.room.connect(this.effectsBus);
    this.wet = ctx.createGain();
    this.wet.connect(this.effectsBus);
    this.applyVenue();
    this.master.connect(compressor).connect(ctx.destination);
    // Os sons de todos os jogos e as notas dos metais da festa e da entrada.
    this.warm(() => this.floor('wood'), () => this.floor('asphalt'), () => this.rims(), () => this.boards(), () => this.nets(),
      () => this.note('snare', 0), ...[72, 78, 84].map(m => () => this.note('brass', m)), () => this.voices('hey'), () => this.voices('oh'));
    // A música pedida antes do primeiro toque começa agora.
    const pending = this.theme;
    this.theme = 'none';
    this.music(pending);
  }

  /** Com a página escondida, o som pára todo, para não gastar bateria; volta ao regressar. */
  setHidden(hidden: boolean): void {
    if (!this.context) return;
    void (hidden ? this.context.suspend() : this.context.resume());
  }

  /** Muda de tema. O mesmo tema não recomeça; 'none' cala tudo. */
  music(theme: MusicTheme): void {
    if (theme === this.theme) return;
    if (theme !== 'none' && songShape(theme).resume) this.resumeTheme = this.theme;
    this.theme = theme;
    this.stopMusic();
    if (!this.context || theme === 'none') return;
    this.musicGain = this.context.createGain();
    this.musicGain.connect(this.musicBus!);
    this.playSection(theme, 0, this.context.currentTime + 0.05, 0);
  }

  private stopMusic(): void {
    clearTimeout(this.musicTimer);
    if (this.musicGain) {
      // Desvanece em vez de cortar.
      const ctx = this.context!;
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, ctx.currentTime);
      this.musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
      const old = this.musicGain;
      setTimeout(() => old.disconnect(), 400);
      this.musicGain = null;
    }
  }

  /** Agenda uma secção do tema e marca a seguinte para pouco antes de esta acabar, sem buracos entre elas. */
  private playSection(theme: Exclude<MusicTheme, 'none'>, index: number, start: number, pass: number): void {
    const ctx = this.context!;
    // Com o separador em segundo plano, o temporizador pode chegar tarde: aí recomeça-se agora, em vez de no passado.
    start = Math.max(start, ctx.currentTime + 0.02);
    const length = scheduleSection(ctx, this.musicGain!, this.kit!, theme, index, start, pass);
    const shape = songShape(theme);
    const end = start + length;
    const wait = Math.max(0, (end - ctx.currentTime - 0.3) * 1000);
    if (index + 1 < shape.parts) this.musicTimer = window.setTimeout(() => this.playSection(theme, index + 1, end, pass), wait);
    else if (shape.loop) this.musicTimer = window.setTimeout(() => this.playSection(theme, shape.loopFrom, end, pass + 1), wait);
    else this.musicTimer = window.setTimeout(() => {
      this.theme = 'none';
      if (shape.resume) this.music(this.resumeTheme);
    }, wait + 300);
  }

  /** Calar ou destapar tudo, incluindo a música a tocar. */
  setMuted(muted: boolean): void {
    this.muted = muted;
    this.glide(this.master, this.masterLevel());
  }

  /** Volume geral, de 0 a 1. Pode ser chamado antes de unlock. */
  setMasterVolume(volume: number): void {
    this.volumes.master = clamp01(volume);
    this.glide(this.master, this.masterLevel());
  }

  /** Volume dos efeitos e do ambiente, de 0 a 1. */
  setEffectsVolume(volume: number): void {
    this.volumes.effects = clamp01(volume);
    this.glide(this.effectsBus, this.volumes.effects);
  }

  /** Volume da música, de 0 a 1. */
  setMusicVolume(volume: number): void {
    this.volumes.music = clamp01(volume);
    this.glide(this.musicBus, this.volumes.music);
  }

  /** Os volumes atuais, para o ecrã de Definições. */
  getVolumes(): { master: number; effects: number; music: number } {
    return { ...this.volumes };
  }

  private masterLevel(): number {
    return this.muted ? 0 : this.volumes.master;
  }

  /** Muda um ganho em poucos milissegundos, para não estalar. */
  private glide(node: GainNode | null, value: number): void {
    if (!node || !this.context) return;
    node.gain.cancelScheduledValues(this.context.currentTime);
    node.gain.setTargetAtTime(value, this.context.currentTime, 0.02);
  }

  /** Baixa a música um instante para um efeito forte se ouvir, e devolve-a devagar. */
  private duckMusic(): void {
    const gain = this.duck!.gain;
    const now = this.context!.currentTime;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(0.45, now, 0.03);
    gain.setTargetAtTime(1, now + 0.45, 0.25);
  }

  /** O pavilhão do jogo: a divisão, ou CLOSED_GYM no jogo-treino. */
  setVenue(venue: number): void {
    this.venue = VENUES[venue] ?? 'hall';
    this.crowdLevel = CROWDS[this.venue].level;
    this.applyVenue();
  }

  private applyVenue(): void {
    const ctx = this.context;
    if (!ctx || !this.room || !this.wet) return;
    let impulse = this.impulses.get(this.venue);
    if (!impulse) this.impulses.set(this.venue, (impulse = this.toBuffer(roomImpulse(this.venue, ctx.sampleRate, makeRng(VENUES.indexOf(this.venue) + 1)), ctx.sampleRate)));
    if (this.convolver?.buffer !== impulse) {
      // Uma sala nova em vez de trocar a resposta da que já toca, que alguns browsers não deixam.
      if (this.convolver) {
        this.room.disconnect(this.convolver);
        this.convolver.disconnect();
      }
      this.convolver = ctx.createConvolver();
      this.convolver.buffer = impulse;
      this.room.connect(this.convolver).connect(this.wet);
    }
    this.wet.gain.value = CROWDS[this.venue].wet;
    const { voices, talkers } = CROWDS[this.venue];
    if (voices) this.warm(() => this.cheers('hey'), () => this.clapping(), () => this.cheers('ooh'), () => this.cheers('oh'));
    if (talkers) this.warm(() => this.murmur());
  }

  /** Calcula as amostras uma de cada vez, quando o browser está livre, para não prender nenhum frame muito tempo. */
  private warm(...jobs: (() => unknown)[]): void {
    const idle = this.queue.length === 0;
    this.queue.push(...jobs);
    if (idle) this.pump();
  }

  private pump(): void {
    const next = (): void => {
      this.queue.shift()?.();
      if (this.queue.length) this.pump();
    };
    if (window.requestIdleCallback) window.requestIdleCallback(next, { timeout: 1000 });
    else window.setTimeout(next, 20);
  }

  /** As variantes de um som, calculadas da primeira vez que são precisas. A semente vem do nome: saem sempre iguais. */
  private set(key: string, count: number, make: (r: Rng) => Sample): AudioBuffer[] {
    let list = this.sets.get(key);
    if (!list) {
      let seed = 0;
      for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) | 0;
      list = Array.from({ length: count }, (_, i) => this.toBuffer(make(makeRng(seed + i * 7919)), SR));
      this.sets.set(key, list);
    }
    return list;
  }

  private toBuffer(sample: Sample, rate: number): AudioBuffer {
    const channels = sample instanceof Float32Array ? [sample] : sample;
    const buffer = this.context!.createBuffer(channels.length, channels[0]!.length, rate);
    channels.forEach((data, i) => buffer.getChannelData(i).set(data));
    return buffer;
  }

  private floor(surface: 'wood' | 'asphalt' = this.venue === 'street' ? 'asphalt' : 'wood'): AudioBuffer[] {
    return this.set(`bounce:${surface}`, 3, r => bounce(surface, r));
  }
  private rims(): AudioBuffer[] { return this.set('rim', 3, rim); }
  private boards(): AudioBuffer[] { return this.set('board', 2, backboard); }
  private nets(): AudioBuffer[] { return this.set('swish', 3, swish); }
  private voices(kind: Shout): AudioBuffer[] { return this.set(`voice:${kind}`, 4, r => shout(kind, r)); }
  private cheers(kind: Shout): AudioBuffer[] {
    const { voices } = CROWDS[this.venue];
    return this.set(`crowd:${kind}:${voices}`, 2, r => crowd(kind, voices, r));
  }
  private clapping(): AudioBuffer[] {
    const { claps } = CROWDS[this.venue];
    return this.set(`claps:${claps}`, 2, r => applause(claps, 2.6, r));
  }
  private murmur(): AudioBuffer[] {
    const { talkers } = CROWDS[this.venue];
    return this.set(`babble:${talkers}`, 2, r => babble(talkers, 2.4, r));
  }

  /** Uma nota de um instrumento: a amostra mais perto e a velocidade que a põe no tom. */
  private note(instrument: Instrument, midi: number): { buffer: AudioBuffer; rate: number } {
    if (instrument === 'snare') return { buffer: this.set('snare', 3, snare)[Math.abs(midi) % 3]!, rate: 1 };
    // Uma amostra por meia oitava (por oitava no glockenspiel): o timbre quase não muda dentro dela.
    const step = instrument === 'glock' ? 12 : 6;
    const root = Math.round(midi / step) * step;
    const make = { brass, glock, timpani }[instrument];
    return { buffer: this.set(`${instrument}:${root}`, 1, r => make(root, r))[0]!, rate: Math.pow(2, (midi - root) / 12) };
  }

  /** Toca uma das variantes, com um pouco de tom ao acaso; `seconds` corta-a mais cedo, a desvanecer. */
  private shot(list: AudioBuffer[], volume: number, { delay = 0, pan, seconds, rate = 1 }: { delay?: number; pan?: number; seconds?: number; rate?: number } = {}): void {
    const ctx = this.context!;
    const source = ctx.createBufferSource();
    source.buffer = list[Math.floor(Math.random() * list.length)]!;
    source.playbackRate.value = rate * (0.97 + Math.random() * 0.06);
    const gain = ctx.createGain();
    const start = ctx.currentTime + delay;
    gain.gain.value = volume;
    let tail: AudioNode = source.connect(gain);
    if (pan !== undefined) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      tail = gain.connect(panner);
    }
    tail.connect(this.room!);
    source.start(start);
    if (seconds !== undefined) {
      gain.gain.setValueAtTime(volume, start + seconds * 0.6);
      gain.gain.linearRampToValueAtTime(0.0001, start + seconds);
      source.stop(start + seconds);
    }
  }

  /** A bancada reage em coro; no jogo-treino não há ninguém. */
  private react(kind: Shout, strength: number, delay = 0): void {
    if (CROWDS[this.venue].voices) this.shot(this.cheers(kind), 0.2 * this.crowdLevel * strength, { delay });
  }

  /** Palmas da bancada, inteiras (2,6 s) ou cortadas mais cedo. */
  private clap(strength: number, seconds?: number): void {
    if (CROWDS[this.venue].claps) this.shot(this.clapping(), 0.3 * this.crowdLevel * strength, { seconds });
  }

  /** Um grito solto, de um lado qualquer. */
  private shoutOnce(volume: number, delay = 0): void {
    this.shot(this.voices(Math.random() < 0.6 ? 'hey' : 'oh'), volume, { delay, pan: Math.random() * 1.6 - 0.8 });
  }

  /** Os metais do pavilhão a tocar dó-mi-sol. */
  private fanfare(): void {
    const ctx = this.context!;
    [72, 76, 79].forEach((midi, k) => {
      const { buffer, rate } = this.note('brass', midi);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      const gain = ctx.createGain();
      const start = ctx.currentTime + k * 0.09;
      const end = start + (k === 2 ? 0.22 : 0.09);
      gain.gain.setValueAtTime(0.05, start);
      gain.gain.setTargetAtTime(0, end, 0.03);
      source.connect(gain).connect(this.room!);
      source.start(start);
      source.stop(end + 0.2);
    });
  }

  private tone(type: OscillatorType, from: number, to: number, seconds: number, volume: number, delay = 0): void {
    const ctx = this.context!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain).connect(this.room!);
    osc.start(start);
    osc.stop(start + seconds);
  }

  private noise(frequency: number, seconds: number, volume: number, delay = 0): void {
    const ctx = this.context!;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 1.4;
    const gain = ctx.createGain();
    const start = ctx.currentTime + delay;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(filter).connect(gain).connect(this.room!);
    source.start(start, Math.random() * 0.8);
    source.stop(start + seconds);
  }

  /** Apito de árbitro: um tom agudo que treme depressa, com um pouco de sopro. */
  private whistle(seconds: number, volume: number): void {
    const ctx = this.context!;
    const start = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const trill = ctx.createOscillator();
    const trillDepth = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 2900;
    trill.frequency.value = 42;
    trillDepth.gain.value = 170;
    trill.connect(trillDepth).connect(osc.frequency);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.setValueAtTime(volume, start + seconds - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain).connect(this.room!);
    osc.start(start);
    trill.start(start);
    osc.stop(start + seconds);
    trill.stop(start + seconds);
    this.noise(3400, seconds, volume * 0.25);
  }

  /** Buzzer de pavilhão: duas notas graves ligeiramente desafinadas, com volume constante. */
  private horn(frequency: number, seconds: number, volume: number): void {
    const ctx = this.context!;
    const start = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.setValueAtTime(volume, start + seconds - 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    gain.connect(this.room!);
    for (const detune of [0, 7]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = frequency + detune;
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + seconds);
    }
  }

  play(sound: Sound): void {
    if (!this.context || this.muted) return;
    switch (sound) {
      case 'bounce': this.shot(this.floor(), 0.13); break;
      case 'swish': this.duckMusic(); this.shot(this.nets(), 0.14); break;
      case 'rim':
        // Às vezes bate primeiro na tabela.
        if (Math.random() < 0.35) {
          this.shot(this.boards(), 0.12);
          this.shot(this.rims(), 0.05, { delay: 0.07 });
        } else this.shot(this.rims(), 0.1);
        if (Math.random() < 0.5) this.react('ooh', 0.7, 0.15);
        break;
      case 'whistle': this.duckMusic(); this.whistle(0.34, 0.09); break;
      case 'buzzer':
        this.horn(150, 1, 0.08);
        this.clap(0.8);
        break;
      case 'shotClockBuzzer': this.horn(310, 0.55, 0.07); break;
      case 'horn': this.horn(205, 0.35, 0.05); break;
      case 'steal': this.tone('triangle', 500, 900, 0.09, 0.07); break;
      case 'bump': this.tone('square', 120, 60, 0.07, 0.05); break;
      case 'card':
        this.tone('square', 660, 660, 0.06, 0.04);
        this.tone('square', 990, 990, 0.1, 0.04, 0.06);
        break;
      case 'block':
        this.tone('square', 160, 80, 0.13, 0.08);
        this.react('oh', 0.8);
        break;
      case 'cheer':
        this.clap(0.7, 0.9);
        this.react('hey', 0.6);
        break;
      case 'bigCheer':
        this.duckMusic();
        this.clap(1);
        this.react(Math.random() < 0.5 ? 'hey' : 'oh', 1);
        // Um pequeno toque de metais do pavilhão, nos momentos altos.
        this.fanfare();
        break;
    }
  }

  /** Um sopro de ruído que cresce e se desfaz devagar, com o filtro a deslizar: vento, trânsito, burburinho. */
  private swell(type: BiquadFilterType, from: number, to: number, seconds: number, volume: number, q = 0.8, delay = 0): void {
    const ctx = this.context!;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    const start = ctx.currentTime + delay;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(to, start + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + seconds * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(filter).connect(gain).connect(this.room!);
    source.start(start, Math.random() * 0.8);
    source.stop(start + seconds);
  }

  /** O chiar de uma sapatilha a travar. */
  private squeak(volume: number): void {
    const pitch = 1500 + Math.random() * 1400;
    this.tone('sine', pitch, pitch * 1.4, 0.06 + Math.random() * 0.05, volume * (0.5 + Math.random() * 0.5));
  }

  /** Ambiente do pavilhão, chamado a cada frame com o relógio em ms. Cada sítio soa diferente:
   * a rua tem vento, trânsito ao longe e uma voz de vez em quando; o pavilhão pequeno e o vazio têm eco e ténis a chiar;
   * a arena tem um burburinho que nunca pára. */
  ambience(now: number): void {
    if (!this.context || this.muted || now < this.nextAmbience) return;
    const crowd = this.crowdLevel;
    const roll = Math.random();
    switch (this.venue) {
      case 'street':
        this.nextAmbience = now + 700 + Math.random() * 1500;
        if (roll < 0.35) this.swell('bandpass', 300 + Math.random() * 300, 700 + Math.random() * 500, 2 + Math.random() * 2.5, 0.025, 0.6);
        else if (roll < 0.6) this.swell('lowpass', 160, 260, 2.5 + Math.random() * 2, 0.04);
        else if (roll < 0.64) for (const [k, f] of [[0, 392], [0.28, 330]] as const) this.tone('square', f, f, 0.22, 0.005, k);
        else if (roll < 0.78) this.shoutOnce(0.012);
        else this.squeak(0.012);
        return;
      case 'school':
      case 'closed':
        this.nextAmbience = now + 600 + Math.random() * 1600;
        if (this.venue === 'school' && roll < 0.1) this.rhythmicClaps();
        else if (roll < 0.25) this.shoutOnce(this.venue === 'closed' ? 0.016 : 0.01);
        else this.squeak(0.024);
        return;
      case 'hall':
        this.nextAmbience = now + 700 + Math.random() * 1800;
        if (roll < 0.12) this.rhythmicClaps();
        else if (roll < 0.45) this.shot(this.murmur(), 0.05 * crowd);
        else if (roll < 0.55) this.shoutOnce(0.008, Math.random() * 0.6);
        else this.squeak(0.02);
        return;
      case 'arena':
        this.nextAmbience = now + 250 + Math.random() * 200;
        // Cada pedaço de burburinho entra antes de o anterior acabar, por isso nunca há buracos.
        if (now >= this.nextMurmur) {
          this.shot(this.murmur(), 0.1 * crowd);
          this.nextMurmur = now + 1500 + Math.random() * 200;
        }
        if (roll < 0.25) this.shoutOnce(0.007, Math.random() * 0.3);
        if (roll < 0.04) this.rhythmicClaps();
        else if (roll < 0.2) this.squeak(0.014);
        return;
    }
  }

  /** Três batidas de palmas certas, como uma claque a puxar pela equipa. */
  private rhythmicClaps(): void {
    for (const beat of [0, 0.32, 0.64]) {
      for (let i = 0; i < 8; i++) this.noise(1500 + Math.random() * 2000, 0.03, 0.05 * this.crowdLevel * Math.random() + 0.0002, beat + Math.random() * 0.03);
    }
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 1));
}
