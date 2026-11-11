import type { Sound } from './match-view.ts';

import { MUSIC_THEMES, scheduleSection, songShape, type Instrument, type MusicKit, type MusicTheme } from './music.ts';
import {
  SR, applause, babble, backboard, brass, chains, chirp, chime, clapBeat, crowd, glock, horn, makeRng, rim, roomImpulse, shout, slap, snare,
  squeak, swish, thud, timpani, whistle,
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
export const CROWDS: Record<Venue, { level: number; voices: number; claps: number; talkers: number; wet: number }> = {
  street: { level: 0.25, voices: 3, claps: 5, talkers: 0, wet: 0.1 },
  school: { level: 0.4, voices: 6, claps: 12, talkers: 0, wet: 0.25 },
  hall: { level: 0.7, voices: 10, claps: 24, talkers: 5, wet: 0.2 },
  arena: { level: 1, voices: 16, claps: 44, talkers: 8, wet: 0.2 },
  closed: { level: 0, voices: 0, claps: 0, talkers: 0, wet: 0.4 },
};

/** Quantos sons tocam ao mesmo tempo, no máximo; acima disto, os sons de pouca importância ficam por tocar. */
const VOICE_LIMIT = 24;
/** Os sons que podem faltar sem o jogador perder informação: o apito, as buzinas e o cesto tocam sempre. */
const LOW_PRIORITY: ReadonlySet<Sound> = new Set(['bounce', 'catch', 'bump', 'steal']);
/** O mesmo som dentro deste tempo (s) toca uma vez só: a 4× há eventos colados que soavam a metralhadora. */
const REPEAT_GAP = 0.045;
/** O burburinho da bancada passa por um passa-baixo aqui (Hz): de longe, as vozes não se percebem. */
const MURMUR_CUTOFF = 1600;

// Todos os sons são sintetizados, por isso não há ficheiros de áudio para carregar. Os da bola, da bancada e dos
// instrumentos calculam-se uma vez (synth.ts) para AudioBuffers, com algumas variantes, e depois só se tocam: os do
// pavilhão quando se escolhe o pavilhão, os outros ao destrancar o som, nos momentos livres do browser.
// Não há um ruído fixo de fundo: ruído filtrado sem parar soa a mar. O ambiente vem de sons curtos e soltos, e no pavilhão
// e na arena de pedaços de burburinho encadeados, abafados como gente ao longe.
//
// Encaminhamento (criado em unlock):
//   efeitos → room ─────────────────────────→ effectsBus ──────┐
//              └→ sala (ConvolverNode) → wet ┘                 │
//   tema    → musicGain → musicBus → duck ─────────────────────┴→ master → compressor → limitador → destination
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
  /** Quando entra o próximo pedaço de cada corrente de burburinho (ver `keepMurmur`). */
  private murmurAt = [0, 0];
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
  /** Sons a tocar agora, para o limite de vozes. */
  private active = 0;
  private lastPlayed = new Map<Sound, number>();
  /** A velocidade do jogo: a 4× as reações da bancada encurtam, nunca sobem de tom. */
  private speed = 1;
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
    // Um limitador a sério no fim: o compressor sozinho deixa passar picos acima de 0 dB quando tudo toca junto.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.08;
    this.master.connect(compressor).connect(limiter).connect(ctx.destination);
    // Os sons de todos os jogos e as notas dos metais da festa e da entrada.
    this.warm(() => this.rims(), () => this.boards(), () => this.nets(),
      () => this.whistles(), () => this.horns(205, 0.35), () => this.horns(150, 1), () => this.horns(310, 0.55), () => this.slaps(0),
      () => this.slaps(0.5), () => this.slaps(1), () => this.thuds(), () => this.squeaks(),
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

  private rims(): AudioBuffer[] { return this.set('rim', 3, rim); }
  /** Na rua a tabela é de metal e a rede de corrente; nos pavilhões, vidro e nylon. */
  private boards(): AudioBuffer[] {
    return this.venue === 'street' ? this.set('board:metal', 3, r => backboard(r, 'metal')) : this.set('board', 3, backboard);
  }
  private nets(): AudioBuffer[] { return this.venue === 'street' ? this.set('chains', 3, chains) : this.set('swish', 3, swish); }
  private whistles(): AudioBuffer[] { return this.set('whistle', 3, r => whistle(0.34, r)); }
  private horns(frequency: number, seconds: number): AudioBuffer[] {
    return this.set(`horn:${frequency}:${seconds}`, 1, r => horn(frequency, seconds, r));
  }
  private squeaks(): AudioBuffer[] { return this.set('squeak', 6, squeak); }
  private slaps(force: 0 | 0.5 | 1): AudioBuffer[] { return this.set(`slap:${force}`, 3, r => slap(force, r)); }
  private thuds(): AudioBuffer[] { return this.set('thud', 3, thud); }
  private chimes(midi: number): AudioBuffer[] { return this.set(`chime:${midi}`, 1, r => chime(midi, r)); }
  private clapBeats(): AudioBuffer[] {
    const people = Math.max(4, Math.round(CROWDS[this.venue].claps / 3));
    return this.set(`clapBeat:${people}`, 3, r => clapBeat(people, r));
  }
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
    return this.set(`babble:${talkers}:far`, 3, r => babble(talkers, 2.4, r, MURMUR_CUTOFF));
  }

  /** O rumor dos pavilhões grandes nunca pára: cada corrente encadeia pedaços de burburinho que se sobrepõem, e a arena tem
   * duas, desfasadas, para soar a muita gente e não a meia dúzia de vozes soltas. */
  private keepMurmur(now: number): void {
    const streams = this.venue === 'arena' ? 2 : this.venue === 'hall' ? 1 : 0;
    for (let i = 0; i < streams; i++) {
      // Quem esteve parado (pausa, menus) recomeça já, com a segunda corrente a meio da primeira.
      if (now - this.murmurAt[i]! > 3000) this.murmurAt[i] = now + i * 800;
      if (now < this.murmurAt[i]!) continue;
      this.shot(this.murmur(), (this.venue === 'arena' ? 0.08 : 0.06) * this.crowdLevel);
      this.murmurAt[i] = now + 1500 + Math.random() * 300;
    }
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
    this.active++;
    source.onended = () => this.active--;
    source.start(start);
    if (seconds !== undefined) {
      gain.gain.setValueAtTime(volume, start + seconds * 0.6);
      gain.gain.linearRampToValueAtTime(0.0001, start + seconds);
      source.stop(start + seconds);
    }
  }

  /** A bancada reage em coro; no jogo-treino não há ninguém. */
  private react(kind: Shout, strength: number, delay = 0): void {
    if (CROWDS[this.venue].voices) this.shot(this.cheers(kind), 0.2 * this.crowdLevel * strength, { delay, seconds: this.speed > 2 ? 0.7 : undefined });
  }

  /** Palmas da bancada, inteiras (2,6 s) ou cortadas mais cedo. */
  private clap(strength: number, seconds?: number): void {
    const cut = this.speed > 2 ? 1 : undefined;
    if (CROWDS[this.venue].claps) this.shot(this.clapping(), 0.3 * this.crowdLevel * strength, { seconds: seconds === undefined ? cut : Math.min(seconds, cut ?? seconds) });
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

  /** A velocidade do jogo (1, 2 ou 4). */
  setSpeed(speed: number): void {
    this.speed = speed;
  }

  play(sound: Sound): void {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    if (now - (this.lastPlayed.get(sound) ?? -1) < REPEAT_GAP) return;
    if (this.active >= VOICE_LIMIT && LOW_PRIORITY.has(sound)) return;
    this.lastPlayed.set(sound, now);
    switch (sound) {
      // A bola no chão soa como nas mãos; cada campo muda-a pela sala (seca na rua, eco no pavilhão vazio).
      case 'bounce': this.shot(this.slaps(0), 0.13); break;
      case 'catch': this.shot(this.slaps(0), 0.08); break;
      case 'swish': this.duckMusic(); this.shot(this.nets(), this.venue === 'street' ? 0.2 : 0.14); break;
      case 'rim':
        // Às vezes bate primeiro na tabela.
        if (Math.random() < 0.35) {
          this.shot(this.boards(), 0.12);
          this.shot(this.rims(), 0.05, { delay: 0.07 });
        } else this.shot(this.rims(), 0.1);
        if (Math.random() < 0.5) this.react('ooh', 0.7, 0.15);
        break;
      case 'whistle': this.duckMusic(); this.shot(this.whistles(), 0.15); break;
      case 'buzzer':
        this.duckMusic();
        this.shot(this.horns(150, 1), 0.33);
        this.clap(0.8);
        break;
      case 'shotClockBuzzer': this.duckMusic(); this.shot(this.horns(310, 0.55), 0.27); break;
      case 'horn': this.shot(this.horns(205, 0.35), 0.17); break;
      case 'steal':
        // A palmada na bola, e duas notas a subir: a bola mudou de dono.
        this.shot(this.slaps(0.5), 0.15);
        this.shot(this.chimes(77), 0.04, { delay: 0.03 });
        this.shot(this.chimes(82), 0.04, { delay: 0.09 });
        break;
      case 'bump': this.shot(this.thuds(), 0.16); break;
      case 'card':
        // Si bemol e fá, a quinta do hino.
        this.shot(this.chimes(82), 0.11);
        this.shot(this.chimes(89), 0.11, { delay: 0.07 });
        break;
      case 'block':
        this.duckMusic();
        this.shot(this.slaps(1), 0.22);
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

  /** O chiar de uma sapatilha a travar, de um lado qualquer do campo. */
  private squeak(volume: number): void {
    this.shot(this.squeaks(), 1.5 * volume * (0.5 + Math.random() * 0.5), { pan: Math.random() * 1.2 - 0.6 });
  }

  /** Ambiente do pavilhão, chamado a cada frame com o relógio em ms. Cada sítio soa diferente:
   * a rua tem vento, trânsito ao longe e uma voz de vez em quando; o pavilhão pequeno e o vazio têm eco e ténis a chiar;
   * a arena tem um burburinho que nunca pára. */
  ambience(now: number): void {
    if (!this.context || this.muted || this.active >= VOICE_LIMIT - 4) return;
    this.keepMurmur(now);
    if (now < this.nextAmbience) return;
    const roll = Math.random();
    switch (this.venue) {
      case 'street':
        this.nextAmbience = now + 700 + Math.random() * 1500;
        // Pássaros: o vento e o trânsito, como ruído a crescer e a desfazer-se, soavam a mar.
        if (roll < 0.35) this.shot(this.set('chirp', 4, chirp), 0.012, { pan: Math.random() * 1.6 - 0.8 });
        else if (roll < 0.44) for (const [k, f] of [[0, 392], [0.28, 330]] as const) this.tone('square', f, f, 0.22, 0.005, k);
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
        if (roll < 0.05) this.rhythmicClaps();
        else if (roll < 0.15) this.shoutOnce(0.008, Math.random() * 0.6);
        else this.squeak(0.02);
        return;
      case 'arena':
        this.nextAmbience = now + 600 + Math.random() * 1200;
        if (roll < 0.03) this.rhythmicClaps();
        else if (roll < 0.15) this.shoutOnce(0.007, Math.random() * 0.3);
        else if (roll < 0.45) this.squeak(0.014);
        return;
    }
  }

  /** Três batidas de palmas certas, como uma claque a puxar pela equipa. */
  private rhythmicClaps(): void {
    for (const beat of [0, 0.32, 0.64]) this.shot(this.clapBeats(), 0.3 * this.crowdLevel, { delay: beat + Math.random() * 0.02 });
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 1));
}
