import type { Sound } from './match-view.ts';

import { MUSIC_THEMES, scheduleSection, songShape, type MusicTheme } from './music.ts';

export { MUSIC_THEMES, type MusicTheme };

/** Os pavilhões pela ordem de art/court.ts: as quatro divisões e, no fim, CLOSED_GYM (o do jogo-treino, vazio). */
type Venue = 'street' | 'school' | 'hall' | 'arena' | 'closed';
const VENUES: readonly Venue[] = ['street', 'school', 'hall', 'arena', 'closed'];

// Todos os sons são sintetizados, por isso não há ficheiros de áudio para carregar.
// Não há um ruído fixo de fundo: ruído filtrado sem parar soa a mar. O ambiente vem de sons curtos e soltos, que na arena
// se sobrepõem até formar um burburinho contínuo.
//
// Encaminhamento (criado em unlock):
//   efeitos → room ──────────→ effectsBus ──────────────┐
//              └→ eco (atraso com realimentação) ─┘      │
//   tema    → musicGain → musicBus → duck ──────────────┴→ master → compressor → destination
// O eco depende do pavilhão: nenhum na rua, muito no pavilhão vazio.
export class GameAudio {
  private context: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  /** De 0 (campo de rua, sem público) a 1 (arena cheia). */
  private crowdLevel = 0.6;
  private venue: Venue = 'hall';
  private nextAmbience = 0;
  private theme: MusicTheme = 'none';
  /** O tema a retomar quando acaba uma vinheta com `resume`. */
  private resumeTheme: MusicTheme = 'none';
  private musicTimer = 0;
  /** Ganho de cada tema, só para o desvanecer ao trocar; o volume está em musicBus. */
  private musicGain: GainNode | null = null;
  private master: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private room: GainNode | null = null;
  private echo: DelayNode | null = null;
  private echoReturn: GainNode | null = null;
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
    this.room = ctx.createGain();
    this.room.connect(this.effectsBus);
    // O eco: um atraso que volta a si próprio, cada vez mais baixo e mais abafado.
    this.echo = ctx.createDelay(1);
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2200;
    this.echoReturn = ctx.createGain();
    this.room.connect(this.echo).connect(damp).connect(feedback).connect(this.echo);
    damp.connect(this.echoReturn).connect(this.effectsBus);
    this.applyVenue();
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
    const length = scheduleSection(ctx, this.musicGain!, this.noiseBuffer!, theme, index, start, pass);
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
    this.crowdLevel = { street: 0, school: 0.35, hall: 0.7, arena: 1, closed: 0 }[this.venue];
    this.applyVenue();
  }

  private applyVenue(): void {
    if (!this.echo || !this.echoReturn) return;
    // Atraso em segundos e volume do eco: paredes perto no pavilhão pequeno, longe e abafadas pela multidão na arena.
    const [delay, wet] = ({ street: [0.05, 0], school: [0.12, 0.3], hall: [0.17, 0.18], arena: [0.24, 0.1], closed: [0.13, 0.42] } as const)[this.venue];
    this.echo.delayTime.value = delay;
    this.echoReturn.gain.value = wet;
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

  /** Uma voz ao longe: um dente de serra grave, abafado, que sobe ou desce um pouco, como um «ei!» ou um «boa!». */
  private voice(volume: number, delay = 0): void {
    const ctx = this.context!;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const start = ctx.currentTime + delay;
    const seconds = 0.18 + Math.random() * 0.3;
    const pitch = 130 + Math.random() * 150;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, start);
    osc.frequency.exponentialRampToValueAtTime(pitch * (Math.random() < 0.5 ? 0.8 : 1.25), start + seconds);
    filter.type = 'bandpass';
    filter.frequency.value = 600 + Math.random() * 600;
    filter.Q.value = 3;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(filter).connect(gain).connect(this.room!);
    osc.start(start);
    osc.stop(start + seconds + 0.01);
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
        else if (roll < 0.78) this.voice(0.012);
        else this.squeak(0.012);
        return;
      case 'school':
      case 'closed':
        this.nextAmbience = now + 600 + Math.random() * 1600;
        if (this.venue === 'school' && roll < 0.1) this.rhythmicClaps();
        else if (roll < 0.25) this.voice(this.venue === 'closed' ? 0.016 : 0.01);
        else this.squeak(0.024);
        return;
      case 'hall':
        this.nextAmbience = now + 700 + Math.random() * 1800;
        if (roll < 0.12) this.rhythmicClaps();
        else if (roll < 0.45) for (let i = 0; i < 4; i++) this.voice(0.006, Math.random() * 0.6);
        else this.squeak(0.02);
        return;
      case 'arena':
        // Pouco espaço entre vagas, e cada uma dura mais do que o espaço: o burburinho nunca tem buracos.
        this.nextAmbience = now + 250 + Math.random() * 200;
        for (let i = 0; i < 3; i++) this.swell('bandpass', 450 + Math.random() * 500, 500 + Math.random() * 600, 0.6 + Math.random() * 0.6, 0.012 * crowd, 2, Math.random() * 0.25);
        if (roll < 0.5) this.voice(0.005, Math.random() * 0.3);
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
