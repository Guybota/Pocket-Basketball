import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameAudio } from './audio.ts';
import { MUSIC_THEMES, scheduleSection, sectionLengths, songShape } from './music.ts';

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
  type = ''; buffer: unknown = null; loop = false;
  readonly kind: string;
  constructor(kind: string, ctx: FakeContext) { this.kind = kind; ctx.nodes.push(this); }
  connect<T>(target: T): T { if (target instanceof FakeNode) this.outputs.push(target); return target; }
  disconnect() { this.outputs = []; }
  start() {} stop() {} setPeriodicWave() {}
}

class FakeContext {
  nodes: FakeNode[] = [];
  currentTime = 0;
  sampleRate = 100;
  destination = new FakeNode('destination', this);
  createGain() { return new FakeNode('gain', this); }
  createDynamicsCompressor() { return new FakeNode('compressor', this); }
  createOscillator() { return new FakeNode('osc', this); }
  createBufferSource() { return new FakeNode('source', this); }
  createBiquadFilter() { return new FakeNode('filter', this); }
  createDelay() { return new FakeNode('delay', this); }
  createPeriodicWave() { return {}; }
  createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
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
  it('tudo passa por um só ganho geral e um compressor antes da saída', () => {
    const { audio, ctx } = setup();
    audio.music('town');
    const before = ctx.nodes.length;
    audio.play('rim');
    const effect = ctx.nodes.slice(before).find(n => n.kind === 'osc')!;
    expect(path(effect).slice(-5)).toEqual(['gain', 'gain', 'gain', 'compressor', 'destination']);
    // Nada além do compressor liga direto à saída.
    expect(ctx.nodes.filter(n => n.outputs.includes(ctx.destination)).map(n => n.kind)).toEqual(['compressor']);
    const master = path(effect).length - 3;
    const musicNote = ctx.nodes.slice(0, before).find(n => n.kind === 'osc')!;
    // nota → envelope → tema → música → ducking → geral → compressor → saída
    expect(path(musicNote)).toHaveLength(8);
    expect(path(musicNote).slice(-3)).toEqual(path(effect).slice(master));
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
        const seconds = scheduleSection(ctx as unknown as BaseAudioContext, ctx.destination as unknown as AudioNode, {} as AudioBuffer, theme, i, 0, 0);
        expect(seconds, `${theme} ${i}`).toBeGreaterThan(0);
        const notes = ctx.nodes.filter(n => n.kind === 'osc').map(n => n.frequency.value);
        expect(notes.length).toBeGreaterThan(0);
        // Entre um baixo grave e um apito agudo: nada de notas mal escritas a sair do ouvido.
        for (const f of notes) expect(f).toBeGreaterThan(40), expect(f).toBeLessThan(3000);
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

  it('o ambiente toca em todos os pavilhões, e o eco só existe dentro de portas', () => {
    const { audio, ctx } = setup();
    const echo = ctx.nodes.find(n => n.kind === 'delay')!;
    // atraso → filtro → (realimentação, retorno do eco)
    const wet = echo.outputs[0]!.outputs[1]!;
    for (let venue = 0; venue <= 4; venue++) {
      audio.setVenue(venue);
      expect(echo.delayTime.value).toBeGreaterThan(0);
      if (venue === 0) expect(wet.gain.value).toBe(0);
      else expect(wet.gain.value).toBeGreaterThan(0);
      const before = ctx.nodes.length;
      for (let i = 0; i < 20; i++) audio.ambience(1e12 + (venue * 20 + i) * 1e5);
      expect(ctx.nodes.length).toBeGreaterThan(before);
    }
  });
});
