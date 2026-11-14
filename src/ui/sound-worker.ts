// Calcula os sons à parte do jogo: os da bancada levam dezenas de milissegundos cada, e no fio do jogo prendiam frames
// nos primeiros segundos (sobretudo no Safari, sem `requestIdleCallback`). Recebe uma receita e devolve as amostras.
import { cook, type Recipe } from './sound-recipes.ts';

self.onmessage = (event: MessageEvent<{ key: string; count: number; recipe: Recipe }>) => {
  const { key, count, recipe } = event.data;
  const samples = cook(key, count, recipe);
  const transfer = samples.flatMap(s => (s instanceof Float32Array ? [s.buffer] : s.map(c => c.buffer)));
  self.postMessage({ key, samples }, { transfer });
};
