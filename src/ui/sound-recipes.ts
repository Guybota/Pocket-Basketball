// As receitas dos sons calculados (synth.ts) pelo nome, para se poderem pedir ao Worker (sound-worker.ts) com dados simples
// em vez de funções. O jogo e o Worker usam as mesmas receitas e as mesmas sementes: o som sai igual nos dois.
import {
  applause, babble, backboard, brass, chains, chime, chirp, clapBeat, crowd, crowdBabble, glock, horn, makeRng, rim, roar, shout,
  slap, snare, squeak, swish, thud, timpani, whistle,
  type Mood, type Rng, type Sample, type Shout,
} from './synth.ts';

const RECIPES = {
  rim: (r: Rng) => rim(r),
  board: (r: Rng, kind: 'glass' | 'metal') => backboard(r, kind),
  swish: (r: Rng) => swish(r),
  chains: (r: Rng) => chains(r),
  whistle: (r: Rng, seconds: number) => whistle(seconds, r),
  horn: (r: Rng, frequency: number, seconds: number) => horn(frequency, seconds, r),
  squeak: (r: Rng) => squeak(r),
  slap: (r: Rng, force: number) => slap(force, r),
  thud: (r: Rng) => thud(r),
  chime: (r: Rng, midi: number) => chime(midi, r),
  chirp: (r: Rng) => chirp(r),
  clapBeat: (r: Rng, people: number) => clapBeat(people, r),
  shout: (r: Rng, kind: Shout) => shout(kind, r),
  crowd: (r: Rng, kind: Shout, people: number) => crowd(kind, people, r),
  applause: (r: Rng, people: number, seconds: number) => applause(people, seconds, r),
  babble: (r: Rng, people: number, seconds: number, far: number) => babble(people, seconds, r, far),
  crowdBabble: (r: Rng, people: number, seconds: number) => crowdBabble(people, seconds, r),
  roar: (r: Rng, people: number, seconds: number, mood: Mood) => roar(people, seconds, r, mood),
  snare: (r: Rng) => snare(r),
  brass: (r: Rng, midi: number) => brass(midi, r),
  glock: (r: Rng, midi: number) => glock(midi, r),
  timpani: (r: Rng, midi: number) => timpani(midi, r),
};
type Recipes = typeof RECIPES;
/** Uma receita: o nome e os argumentos depois do gerador. */
export type Recipe = { [K in keyof Recipes]: [K, ...(Parameters<Recipes[K]> extends [Rng, ...infer A] ? A : never)] }[keyof Recipes];

/** As `count` variantes de um som; a semente vem do nome (`key`), por isso saem sempre iguais. */
export function cook(key: string, count: number, [name, ...args]: Recipe): Sample[] {
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) | 0;
  const make = RECIPES[name] as (r: Rng, ...rest: unknown[]) => Sample;
  return Array.from({ length: count }, (_, i) => make(makeRng(seed + i * 7919), ...args));
}
