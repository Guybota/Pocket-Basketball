import type { Sound } from './match-view.ts';

import { scheduleSection, songShape, type MusicTheme } from './music.ts';

export type { MusicTheme };

// Todos os sons são sintetizados, por isso não há ficheiros de áudio para carregar.
// Não há som contínuo de fundo: ruído filtrado sem parar soa a mar. O ambiente vem de sons curtos e soltos.
//
// Encaminhamento (criado em unlock):
//   efeitos → effectsBus ───────────────────────────┐
//   tema    → musicGain → musicBus → duck ───────────┴→ master → compressor → destination
// Os temas novos (H3) entregam as notas a scheduleSection, que já escreve em musicGain.
// O ambiente por pavilhão (H4) liga-se a effectsBus, pelo mesmo caminho de tone() e noise().
export class GameAudio {
  private context: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  /** De 0 (campo de rua, sem público) a 1 (arena cheia). */
  private crowdLevel = 0.6;
  private nextAmbience = 0;
  private theme: MusicTheme = 'none';
  private musicTimer = 0;
  /** Ganho de cada tema, só para o desvanecer ao trocar; o volume está em musicBus. */
  private musicGain: GainNode | null = null;
  private master: GainNode | null = null;
  private effectsBus: GainNode | null = null;
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
    this.master.connect(compressor).connect(ctx.destination);
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
    osc.connect(gain).connect(this.effectsBus!);
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
    source.connect(filter).connect(gain).connect(this.effectsBus!);
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
    osc.connect(gain).connect(this.effectsBus!);
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
    gain.connect(this.effectsBus!);
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
      case 'swish': this.duckMusic(); this.noise(5200, 0.14, 0.09); break;
      case 'rim':
        this.tone('square', 520, 380, 0.08, 0.05);
        this.tone('triangle', 1250, 900, 0.1, 0.03);
        break;
      case 'whistle': this.duckMusic(); this.whistle(0.34, 0.09); break;
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
        this.duckMusic();
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

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 1));
}
