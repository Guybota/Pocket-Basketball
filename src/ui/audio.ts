import type { Sound } from './match-view.ts';

// Todos os sons são sintetizados, por isso não há ficheiros de áudio para carregar.
export class GameAudio {
  private context: AudioContext | null = null;
  private crowd: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
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
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 700;
    filter.Q.value = 0.4;
    this.crowd = ctx.createGain();
    this.crowd.gain.value = 0;
    source.connect(filter).connect(this.crowd).connect(ctx.destination);
    source.start();
  }

  setCrowd(on: boolean): void {
    if (this.crowd && this.context) this.crowd.gain.setTargetAtTime(on && !this.muted ? 0.02 : 0, this.context.currentTime, 0.3);
  }

  private tone(type: OscillatorType, from: number, to: number, seconds: number, volume: number): void {
    const ctx = this.context!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + seconds);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + seconds);
  }

  private noise(frequency: number, seconds: number, volume: number): void {
    const ctx = this.context!;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(now, Math.random());
    source.stop(now + seconds);
  }

  play(sound: Sound): void {
    if (!this.context || this.muted) return;
    switch (sound) {
      case 'bounce': this.tone('sine', 130, 70, 0.07, 0.1); break;
      case 'swish': this.noise(4200, 0.18, 0.13); break;
      case 'rim': this.tone('square', 420, 300, 0.09, 0.05); break;
      case 'whistle': this.tone('square', 2300, 2200, 0.16, 0.025); break;
      case 'buzzer': this.tone('sawtooth', 170, 160, 0.7, 0.06); break;
      case 'steal': this.tone('triangle', 500, 900, 0.09, 0.07); break;
      case 'block': this.tone('square', 160, 80, 0.13, 0.08); break;
      case 'cheer': this.noise(900, 0.55, 0.05); break;
      case 'bigCheer': this.noise(1000, 1.3, 0.1); break;
    }
  }
}
