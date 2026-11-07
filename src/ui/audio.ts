import type { Sound } from './match-view.ts';

import { scheduleSection, songShape, type MusicTheme } from './music.ts';

export type { MusicTheme };

// Todos os sons são sintetizados, por isso não há ficheiros de áudio para carregar.
// Não há som contínuo de fundo: ruído filtrado sem parar soa a mar. O ambiente vem de sons curtos e soltos.
export class GameAudio {
  private context: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  /** De 0 (campo de rua, sem público) a 1 (arena cheia). */
  private crowdLevel = 0.6;
  private nextAmbience = 0;
  private theme: MusicTheme = 'none';
  private musicTimer = 0;
  private musicGain: GainNode | null = null;
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
    this.theme = theme;
    this.stopMusic();
    if (!this.context || theme === 'none') return;
    this.musicGain = this.context.createGain();
    this.musicGain.gain.value = this.muted ? 0 : 1;
    this.musicGain.connect(this.context.destination);
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
    const length = scheduleSection(ctx, this.musicGain!, this.noiseBuffer!, theme, index, start, pass);
    const shape = songShape(theme);
    const end = start + length;
    const wait = Math.max(0, (end - ctx.currentTime - 0.3) * 1000);
    if (index + 1 < shape.parts) this.musicTimer = window.setTimeout(() => this.playSection(theme, index + 1, end, pass), wait);
    else if (shape.loop) this.musicTimer = window.setTimeout(() => this.playSection(theme, shape.loopFrom, end, pass + 1), wait);
    else this.musicTimer = window.setTimeout(() => { this.theme = 'none'; }, wait + 300);
  }

  /** Calar ou destapar tudo, incluindo a música a tocar. */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.musicGain) this.musicGain.gain.value = muted ? 0 : 1;
  }

  setVenue(division: number): void {
    this.crowdLevel = [0, 0.35, 0.7, 1][division] ?? 0.6;
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
    osc.connect(gain).connect(ctx.destination);
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
    source.connect(filter).connect(gain).connect(ctx.destination);
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
    osc.connect(gain).connect(ctx.destination);
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
    gain.connect(ctx.destination);
    for (const detune of [0, 7]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = frequency + detune;
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + seconds);
    }
  }

  /** Palmas: muitos estalos curtos e separados, em vez de um ruído contínuo. */
  private applause(seconds: number, perSecond: number, volume: number): void {
    const claps = Math.round(seconds * perSecond * (0.4 + this.crowdLevel * 0.6));
    for (let i = 0; i < claps; i++) {
      const delay = Math.random() * seconds;
      // As palmas enfraquecem até ao fim, como um aplauso real.
      const fade = 1 - (delay / seconds) * 0.75;
      this.noise(1200 + Math.random() * 2600, 0.03 + Math.random() * 0.02, volume * fade * (0.5 + Math.random() * 0.5), delay);
    }
  }

  play(sound: Sound): void {
    if (!this.context || this.muted) return;
    switch (sound) {
      case 'bounce': this.tone('sine', 130, 70, 0.07, 0.1); break;
      case 'swish': this.noise(5200, 0.14, 0.09); break;
      case 'rim':
        this.tone('square', 520, 380, 0.08, 0.05);
        this.tone('triangle', 1250, 900, 0.1, 0.03);
        break;
      case 'whistle': this.whistle(0.34, 0.09); break;
      case 'buzzer': this.horn(150, 1, 0.08); break;
      case 'shotClockBuzzer': this.horn(310, 0.55, 0.07); break;
      case 'horn': this.horn(205, 0.35, 0.05); break;
      case 'steal': this.tone('triangle', 500, 900, 0.09, 0.07); break;
      case 'bump': this.tone('square', 120, 60, 0.07, 0.05); break;
      case 'card':
        this.tone('square', 660, 660, 0.06, 0.04);
        this.tone('square', 990, 990, 0.1, 0.04, 0.06);
        break;
      case 'block': this.tone('square', 160, 80, 0.13, 0.08); break;
      case 'cheer':
        if (this.crowdLevel > 0) this.applause(0.8, 26, 0.1 * this.crowdLevel);
        break;
      case 'bigCheer':
        if (this.crowdLevel > 0) this.applause(1.8, 38, 0.15 * this.crowdLevel);
        // Um pequeno toque de metais do pavilhão, nos momentos altos.
        this.tone('square', 523, 523, 0.09, 0.025);
        this.tone('square', 659, 659, 0.09, 0.025, 0.09);
        this.tone('square', 784, 784, 0.16, 0.025, 0.18);
        break;
    }
  }

  /** Ambiente de pavilhão: guinchos de sapatilhas e, onde há público, palmas ritmadas de vez em quando. */
  ambience(now: number): void {
    if (!this.context || this.muted || now < this.nextAmbience) return;
    this.nextAmbience = now + 900 + Math.random() * 2600;
    if (Math.random() < 0.12 && this.crowdLevel > 0.3) {
      for (const beat of [0, 0.32, 0.64]) {
        for (let i = 0; i < 8; i++) this.noise(1500 + Math.random() * 2000, 0.03, 0.05 * this.crowdLevel * Math.random(), beat + Math.random() * 0.03);
      }
      return;
    }
    const pitch = 1500 + Math.random() * 1400;
    this.tone('sine', pitch, pitch * 1.4, 0.06 + Math.random() * 0.05, 0.012 + Math.random() * 0.012);
  }
}
