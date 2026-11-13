// Guarda imagens das poses e dos movimentos especiais, sem correr o jogo: npm run anim-check
// Usa o Edge instalado. Noutra máquina: BROWSER_CHANNEL=chrome npm run anim-check
import { mkdirSync, writeFileSync } from 'node:fs';
import { withAnimPage } from './anim-browser.ts';

const OUT = 'dist-check';
mkdirSync(OUT, { recursive: true });
const save = (name: string, dataUrl: string): void => {
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(dataUrl.split(',')[1]!, 'base64'));
  console.log(`${OUT}/${name}.png`);
};
let failed = false;
await withAnimPage(async page => {
  // O mundo: pavilhões de clubes diferentes, a cidade em cada divisão, o tempo e as horas, e os momentos de humor (forçados).
  type World = { venueShot(d: number, owner: string | null, week: number): string; rivals(d: number, n: number): string[]; townShot(d: number, week: number): string; humorShot(kind: string): string[] };
  // Semanas de weatherFor: 1 dia normal, 4 sol forte, 5 fim da tarde, 13 noite.
  for (let d = 0; d < 4; d++) {
    const names = await page.evaluate(n => (window as unknown as { __anim: World }).__anim.rivals(n, 3), d);
    for (const [k, name] of names.entries()) save(`pavilhao-${d}-${k + 1}`, await page.evaluate(([n, o]) => (window as unknown as { __anim: World }).__anim.venueShot(n as number, o as string, 1), [d, name]));
    save(`pavilhao-${d}-casa`, await page.evaluate(n => (window as unknown as { __anim: World }).__anim.venueShot(n, null, 1), d));
    save(`cidade-divisao-${d}`, await page.evaluate(n => (window as unknown as { __anim: World }).__anim.townShot(n, 1), d));
  }
  for (const [name, d, week] of [['rua-noite', 0, 13], ['rua-fim-tarde', 0, 5], ['rua-sol', 0, 4], ['pavilhao-noite', 2, 13], ['escola-fim-tarde', 1, 5], ['arena-noite', 3, 13]] as const) {
    save(name, await page.evaluate(([n, w]) => (window as unknown as { __anim: World }).__anim.venueShot(n!, null, w!), [d, week]));
  }
  for (const [name, week] of [['cidade-sol', 4], ['cidade-noite', 13]] as const) save(name, await page.evaluate(w => (window as unknown as { __anim: World }).__anim.townShot(2, w), week));
  for (const kind of ['dog', 'pigeon', 'sleeper']) {
    const images = await page.evaluate(k => (window as unknown as { __anim: World }).__anim.humorShot(k), kind);
    images.forEach((image, k) => save(`humor-${kind}-${k + 1}`, image));
  }
  save('poses', await page.evaluate(() => (window as unknown as { __anim: { poseSheet(): string } }).__anim.poseSheet()));
  const moves = await page.evaluate(() => (window as unknown as { __anim: { moves: readonly string[] } }).__anim.moves);
  for (const move of moves) {
    const result = await page.evaluate(m => (window as unknown as { __anim: { moveStrip(move: string, frames: number): { image: string; floaters: number } | null } }).__anim.moveStrip(m, 8), move);
    if (!result) {
      failed = true;
      console.log(`FALHOU ${move}: não aconteceu em nenhum dos jogos`);
      continue;
    }
    if (result.floaters === 0) {
      failed = true;
      console.log(`FALHOU ${move}: sem o nome por cima do jogador`);
    }
    save(`movimento-${move}`, result.image);
  }
}, message => {
  failed = true;
  console.log('ERRO', message);
});
process.exit(failed ? 1 : 0);
