// Junta uma maqueta numa só página, pronta a publicar: npm run build-mock -- mockups/corpos.html
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { build } from 'vite';

const entry = process.argv[2];
if (!entry) {
  console.error('Uso: npm run build-mock -- mockups/<nome>.html');
  process.exit(1);
}
const outDir = 'dist-mock';
await build({ logLevel: 'warn', build: { outDir, emptyOutDir: true, rollupOptions: { input: entry } } });
const script = readdirSync(`${outDir}/assets`).find(name => name.endsWith('.js'));
if (!script) throw new Error('Não encontrei o programa compilado');
const source = readFileSync(entry, 'utf8');
const start = source.indexOf('<!-- inicio-da-pagina -->');
const headEnd = source.indexOf('<!-- fim-do-cabecalho -->');
const bodyEnd = source.indexOf('<!-- fim-da-pagina -->');
if (start < 0 || headEnd < 0 || bodyEnd < 0) throw new Error('Faltam marcadores na maqueta');
const head = source.slice(start, headEnd);
const main = source.slice(source.indexOf('<main>'), bodyEnd);
const code = readFileSync(`${outDir}/assets/${script}`, 'utf8').replace(/<\/script/g, '<\\/script');
const output = `${outDir}/${basename(entry)}`;
writeFileSync(output, `${head}\n${main}\n<script type="module">${code}</script>\n`);
console.log(`${output}: ${Math.round(readFileSync(output).length / 1024)} KB`);
process.exit(0);
