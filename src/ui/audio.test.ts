import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameAudio } from './audio.ts';
import { MUSIC_THEMES, scheduleSection, sectionLengths, songShape, type Instrument, type MusicKit } from './music.ts';
import {
  ROOMS, SR, applause, babble, backboard, bounce, brass, chains, chime, clapBeat, crowd, glock, horn, makeRng, rim, roomImpulse, shout, slap,
  snare, squeak, swish, thud, timpani, whistle,
  type Sample,
} from './synth.ts';

// Um AudioContext falso que só regista que nó liga a que nó.
class FakeParam {
  value = 1;
  setValueAtTime(v: number) { this.value = v; return this; }
  setTargetAtTime(v: number) { this.value = v; return this; }
  linearRampToValueAtTime(v: number) { this.value = v; return this; }
  exponentialRampToValueAtTime(v: number) { this.value = v; return this; }
  cancelScheduledValues() { return this; }
}

class FakeNode {
  outputs: FakeNode[] = [];
  gain = new FakeParam(); frequency = new FakeParam(); Q = new FakeParam(); delayTime = new FakeParam();
  threshold = new FakeParam(); knee = new FakeParam(); ratio = new FakeParam(); attack = new FakeParam(); release = new FakeParam();
  playbackRate = new FakeParam(); pan = new FakeParam();
  type = ''; buffer: FakeBuffer | null = null; loop = false; onended: (() => void) | null = null;
  readonly kind: string;
  constructor(kind: string, ctx: FakeContext) { this.kind = kind; ctx.nodes.push(this); }
  connect<T>(target: T): T { if (target instanceof FakeNode) this.outputs.push(target); return target; }
  disconnect(target?: FakeNode) { this.outputs = target ? this.outputs.filter(n => n !== target) : []; }
  // Os sons acabam logo, para o limite de vozes não encher nos testes.
  start() { this.onended?.(); } stop() {} setPeriodicWave() {}
}

class FakeBuffer {
  readonly channels: Float32Array[];
  readonly length: number;
  readonly sampleRate: number;
  constructor(count: number, length: number, sampleRate: number) {
    this.channels = Array.from({ length: count }, () => new Float32Array(length));
    this.length = length;
    this.sampleRate = sampleRate;
  }
  get duration() { return this.length / this.sampleRate; }
  get numberOfChannels() { return this.channels.length; }
  getChannelData(i: number) { return this.channels[i]!; }
}

class FakeContext {
  nodes: FakeNode[] = [];
  buffers: FakeBuffer[] = [];
  currentTime = 0;
  sampleRate = 100;
  destination = new FakeNode('destination', this);
  createGain() { return new FakeNode('gain', this); }
  createDynamicsCompressor() { return new FakeNode('compressor', this); }
  createOscillator() { return new FakeNode('osc', this); }
  createBufferSource() { return new FakeNode('source', this); }
  createBiquadFilter() { return new FakeNode('filter', this); }
  createConvolver() { return new FakeNode('convolver', this); }
  createStereoPanner() { return new FakeNode('panner', this); }
  createPeriodicWave() { return {}; }
  createBuffer(count: number, length: number, rate: number) {
    const buffer = new FakeBuffer(count, length, rate);
    this.buffers.push(buffer);
    return buffer;
  }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
}

/** O caminho de um nó até ao fim, pelo primeiro destino de cada um. */
function path(node: FakeNode): string[] {
  const kinds: string[] = [];
  for (let n: FakeNode | undefined = node; n; n = n.outputs[0]) kinds.push(n.kind);
  return kinds;
}

function setup() {
  let ctx!: FakeContext;
  vi.stubGlobal('window', { AudioContext: class { constructor() { ctx = new FakeContext(); return ctx; } }, setTimeout: () => 0 });
  const audio = new GameAudio();
  audio.setMusicVolume(0.5);
  audio.unlock();
  return { audio, ctx };
}

afterEach(() => vi.unstubAllGlobals());

describe('o encaminhamento do som', () => {
  it('tudo passa por um só ganho geral, um compressor e um limitador antes da saída', () => {
    const { audio, ctx } = setup();
    audio.music('town');
    const before = ctx.nodes.length;
    audio.play('whistle');
    const effect = ctx.nodes.slice(before).find(n => n.kind === 'source')!;
    // som → volume → sala → efeitos → geral → compressor → limitador → saída
    expect(path(effect).slice(-7)).toEqual(['gain', 'gain', 'gain', 'gain', 'compressor', 'compressor', 'destination']);
    // Os sons calculados de antemão seguem o mesmo caminho.
    for (const sound of ['rim', 'bounce', 'catch', 'swish', 'bigCheer', 'buzzer', 'horn', 'steal', 'bump', 'card', 'block'] as const) {
      const from = ctx.nodes.length;
      audio.play(sound);
      const sources = ctx.nodes.slice(from).filter(n => n.kind === 'source');
      expect(sources.length, sound).toBeGreaterThan(0);
      for (const source of sources) expect(path(source).slice(-5), sound).toEqual(path(effect).slice(-5));
    }
    // Nada além do limitador liga direto à saída.
    expect(ctx.nodes.filter(n => n.outputs.includes(ctx.destination)).map(n => n.kind)).toEqual(['compressor']);
    const musicNote = ctx.nodes.slice(0, before).find(n => n.kind === 'osc')!;
    // nota → envelope → tema → música → ducking → geral → compressor → limitador → saída
    expect(path(musicNote)).toHaveLength(9);
    expect(path(musicNote).slice(-4)).toEqual(path(effect).slice(-4));
  });

  it('os volumes ficam entre 0 e 1 e mute cala o geral sem perder o volume escolhido', () => {
    const { audio, ctx } = setup();
    audio.setMasterVolume(2);
    audio.setEffectsVolume(-1);
    expect(audio.getVolumes()).toEqual({ master: 1, effects: 0, music: 0.5 });
    const compressor = ctx.nodes.find(n => n.kind === 'compressor')!;
    const master = ctx.nodes.find(n => n.outputs.includes(compressor))!;
    audio.setMuted(true);
    expect(master.gain.value).toBe(0);
    audio.setMuted(false);
    expect(master.gain.value).toBe(1);
  });
});

describe('os temas', () => {
  it('cada secção tem notas válidas, e nos temas que dão a volta a melodia enche os compassos dos acordes', () => {
    expect(MUSIC_THEMES).toEqual(expect.arrayContaining(['town', 'locker', 'entrance', 'combo', 'anthem']));
    for (const theme of MUSIC_THEMES) {
      const shape = songShape(theme);
      expect(shape.parts).toBeGreaterThan(0);
      for (let i = 0; i < shape.parts; i++) {
        const ctx = new FakeContext();
        const asked: [Instrument, number][] = [];
        const kit: MusicKit = { noise: {} as AudioBuffer, note: (instrument, midi) => (asked.push([instrument, midi]), { buffer: { duration: 1 } as AudioBuffer, rate: 1 }) };
        const seconds = scheduleSection(ctx as unknown as BaseAudioContext, ctx.destination as unknown as AudioNode, kit, theme, i, 0, 0);
        expect(seconds, `${theme} ${i}`).toBeGreaterThan(0);
        const notes = ctx.nodes.filter(n => n.kind === 'osc').map(n => n.frequency.value);
        expect(notes.length).toBeGreaterThan(0);
        // Entre um baixo grave e um apito agudo: nada de notas mal escritas a sair do ouvido.
        for (const f of notes) expect(f).toBeGreaterThan(40), expect(f).toBeLessThan(3000);
        for (const [instrument, midi] of asked) if (instrument !== 'snare') expect(midi, `${theme} ${instrument}`).toBeGreaterThan(30), expect(midi).toBeLessThan(100);
      }
      if (shape.loop) for (const { melody, chords } of sectionLengths(theme)) expect(melody, theme).toBe(chords);
    }
  });

  it('a vinheta do combo devolve o tema que tocava antes', () => {
    const timers: (() => void)[] = [];
    let ctx!: FakeContext;
    vi.stubGlobal('window', { AudioContext: class { constructor() { ctx = new FakeContext(); return ctx; } }, setTimeout: (f: () => void) => timers.push(f) });
    const audio = new GameAudio();
    audio.unlock();
    audio.music('town');
    audio.music('combo');
    const before = ctx.nodes.length;
    timers.at(-1)!();
    expect(ctx.nodes.length).toBeGreaterThan(before);
    // A cidade voltou: pedir 'town' outra vez não recomeça nada.
    const after = ctx.nodes.length;
    audio.music('town');
    expect(ctx.nodes.length).toBe(after);
  });

  it('cada pavilhão tem a sua sala: seca na rua, longa na arena, a mais molhada no jogo-treino; e o ambiente toca em todos', () => {
    const { audio, ctx } = setup();
    const room = ctx.nodes.find(n => n.outputs.some(o => o.kind === 'convolver'))!;
    const lengths: number[] = [];
    const wets: number[] = [];
    for (let venue = 0; venue <= 4; venue++) {
      audio.setVenue(venue);
      // Só uma sala ligada de cada vez.
      const rooms = room.outputs.filter(n => n.kind === 'convolver');
      expect(rooms).toHaveLength(1);
      const wet = rooms[0]!.outputs[0]!;
      expect(path(wet).slice(-4)).toEqual(['gain', 'compressor', 'compressor', 'destination']);
      lengths.push(rooms[0]!.buffer!.length);
      wets.push(wet.gain.value);
      const before = ctx.nodes.length;
      for (let i = 0; i < 20; i++) audio.ambience(1e12 + (venue * 20 + i) * 1e5);
      expect(ctx.nodes.length).toBeGreaterThan(before);
    }
    expect(Math.min(...lengths)).toBe(lengths[0]);
    expect(lengths[3]).toBe(Math.max(...lengths));
    expect(Math.min(...wets)).toBe(wets[0]);
    expect(wets[4]).toBe(Math.max(...wets));
  });

  it('cada som calcula-se uma vez: tocá-lo outra vez não cria buffers novos', () => {
    const { audio, ctx } = setup();
    audio.setVenue(3);
    // Os sons escolhem ao acaso (a tabela, o «uuuh»), por isso tocam-se muitas vezes até aparecerem todos.
    const sounds = ['bounce', 'catch', 'rim', 'swish', 'cheer', 'bigCheer', 'block', 'buzzer', 'shotClockBuzzer', 'horn', 'whistle', 'steal', 'bump', 'card'] as const;
    for (let i = 0; i < 40; i++, ctx.currentTime += 0.1) for (const sound of sounds) audio.play(sound);
    const made = ctx.buffers.length;
    for (let i = 0; i < 5; i++, ctx.currentTime += 0.1) for (const sound of sounds) audio.play(sound);
    expect(ctx.buffers.length).toBe(made);
    // Calado, não toca nada.
    audio.setMuted(true);
    const nodes = ctx.nodes.length;
    audio.play('bigCheer');
    audio.ambience(1e15);
    expect(ctx.nodes.length).toBe(nodes);
  });
});

describe('os sons calculados', () => {
  const r = () => makeRng(7);
  const channels = (s: Sample): Float32Array[] => (s instanceof Float32Array ? [s] : s);
  /** Energia de uma fatia do som, de `from` a `to` (frações da duração). */
  const energy = (x: Float32Array, from: number, to: number): number => {
    let sum = 0;
    for (let i = Math.floor(from * x.length); i < Math.floor(to * x.length); i++) sum += x[i]! * x[i]!;
    return sum;
  };
  const cases: [string, Sample, number][] = [
    ['bola na madeira', bounce('wood', r()), 0.3], ['bola no alcatrão', bounce('asphalt', r()), 0.3], ['aro', rim(r()), 0.35],
    ['tabela', backboard(r()), 0.4], ['rede', swish(r()), 0.42], ['hey', shout('hey', r()), 0], ['uuuh', shout('ooh', r()), 0],
    ['ohhh', shout('oh', r()), 0], ['coro', crowd('hey', 6, r()), 1.3], ['burburinho', babble(3, 1.5, r()), 1.5],
    ['aplausos', applause(10, 1.5, r()), 1.5], ['tarola', snare(r()), 0.3], ['metais', brass(72, r()), 2.6],
    ['glockenspiel', glock(84, r()), 1.8], ['timbale', timpani(42, r()), 2], ['tabela de metal', backboard(r(), 'metal'), 0.4],
    ['rede de corrente', chains(r()), 0.6], ['apito', whistle(0.34, r()), 0.34], ['buzina', horn(150, 1, r()), 1],
    ['ténis', squeak(r()), 0], ['passe recebido', slap(0, r()), 0.14], ['desarme', slap(1, r()), 0.14], ['encontrão', thud(r()), 0.2],
    ['toque', chime(82, r()), 0.5], ['claque', clapBeat(6, r()), 0.2],
  ];

  it.each(cases)('%s: tamanho certo, sem NaN e com o pico abaixo de 1', (_, sample, seconds) => {
    for (const ch of channels(sample)) {
      if (seconds) expect(ch.length).toBe(Math.round(seconds * SR));
      else expect(ch.length).toBeGreaterThan(SR * 0.1);
      let peak = 0;
      for (const v of ch) {
        expect(Number.isFinite(v)).toBe(true);
        peak = Math.max(peak, Math.abs(v));
      }
      expect(peak).toBeGreaterThan(0.3);
      expect(peak).toBeLessThan(1);
      // Sem desvio do zero, e a acabar em silêncio.
      expect(Math.abs(ch.reduce((sum, v) => sum + v, 0) / ch.length)).toBeLessThan(0.001);
      expect(Math.abs(ch[ch.length - 1]!)).toBeLessThan(0.001);
    }
  });

  it('os sons de pancada decaem, e o alcatrão é mais seco do que a madeira', () => {
    for (const x of [bounce('wood', r()), rim(r()), backboard(r()), backboard(r(), 'metal'), chains(r()), slap(1, r()), thud(r()), snare(r()), glock(72, r()), timpani(40, r())]) {
      expect(energy(x, 0.8, 1)).toBeLessThan(energy(x, 0, 0.2) / 50);
    }
    const tail = (x: Float32Array) => energy(x, 0.15, 1) / energy(x, 0, 1);
    expect(tail(bounce('asphalt', r()))).toBeLessThan(tail(bounce('wood', r())));
  });

  it('a bancada espalha-se em estéreo, e a mesma semente dá o mesmo som', () => {
    const [left, right] = applause(8, 1, r());
    expect(left.some((v, i) => Math.abs(v - right[i]!) > 0.05)).toBe(true);
    expect(crowd('oh', 4, makeRng(3))[0]).toEqual(crowd('oh', 4, makeRng(3))[0]);
  });

  it('as salas: a cauda dura o tempo da sala e decai', () => {
    for (const room of Object.keys(ROOMS) as (keyof typeof ROOMS)[]) {
      const [left] = roomImpulse(room, 8000, r());
      const { rt60, pre } = ROOMS[room];
      expect(left.length).toBe(Math.round(pre * 8000) + Math.round(rt60 * 1.1 * 8000));
      expect(energy(left, 0.7, 1)).toBeLessThan(energy(left, 0, 0.3) / 50);
    }
  });
});
