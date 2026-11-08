// As folhas de sprites e os cenários de teste do agente revisor (skill visual-design), sem abrir o jogo.
//   npm run review -- src/tools/cenas/poses-todas.json [outra.json …]
// Cada descrição grava em dist-check/revisao/<nome>/: a folha (1× e ampliada), os frames numerados de um cenário,
// a folha de contacto, as medidas e os avisos. Formatos em src/ui/review.ts (SheetSpec e SceneSpec).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { SceneSpec, SheetSpec } from '../ui/review.ts';
import { withAnimPage } from './anim-browser.ts';

type Spec = SheetSpec | SceneSpec;
const paths = process.argv.slice(2);
if (!paths.length) {
  console.log('Uso: npm run review -- src/tools/cenas/<descrição>.json [outra.json …]');
  process.exit(1);
}
const png = (path: string, dataUrl: string): void => writeFileSync(path, Buffer.from(dataUrl.split(',')[1]!, 'base64'));
let failed = false;
for (const path of paths) {
  const spec = JSON.parse(readFileSync(path, 'utf8')) as Spec;
  const out = `dist-check/revisao/${spec.name}`;
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  await withAnimPage(async page => {
    type Anim = { __anim: { sheet(s: SheetSpec): { image: string; zoomed: string; cells: unknown[]; warnings: string[] }; scene(s: SceneSpec): { seed: number; tick: number; frames: string[]; sheet: string; timeline: unknown[]; warnings: string[] } | { error: string } } };
    let warnings: string[];
    if (spec.kind === 'sheet') {
      const result = await page.evaluate(s => (window as unknown as Anim).__anim.sheet(s), spec);
      png(`${out}/folha.png`, result.image);
      png(`${out}/folha-ampliada.png`, result.zoomed);
      writeFileSync(`${out}/medidas.json`, JSON.stringify(result.cells, null, 1));
      warnings = result.warnings;
    } else {
      const result = await page.evaluate(s => (window as unknown as Anim).__anim.scene(s), spec);
      if ('error' in result) {
        failed = true;
        console.log(`FALHOU ${spec.name}: ${result.error}`);
        return;
      }
      mkdirSync(`${out}/frames`);
      result.frames.forEach((frame, n) => png(`${out}/frames/frame-${String(n + 1).padStart(4, '0')}.png`, frame));
      png(`${out}/folha.png`, result.sheet);
      writeFileSync(`${out}/medidas.json`, JSON.stringify(result.timeline, null, 1));
      // A descrição com a semente e o tick encontrados: repete-se logo, sem procurar.
      writeFileSync(`${out}/cena.json`, JSON.stringify({ ...spec, seed: result.seed, eventTick: result.tick }, null, 2));
      warnings = result.warnings;
      console.log(`${spec.name}: semente ${result.seed}, evento no tick ${result.tick}, ${result.frames.length} frames`);
    }
    writeFileSync(`${out}/avisos.txt`, warnings.length ? `${warnings.join('\n')}\n` : 'Sem avisos.\n');
    console.log(`${out}/ — ${warnings.length} avisos${warnings.length ? `:\n  ${warnings.slice(0, 12).join('\n  ')}${warnings.length > 12 ? '\n  …' : ''}` : ''}`);
  }, message => {
    failed = true;
    console.log('ERRO', message);
  }, spec.kind === 'scene' && spec.reducedMotion === true);
}
process.exit(failed ? 1 : 0);
