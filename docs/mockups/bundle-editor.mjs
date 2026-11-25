// Junta o mockup dos editores numa só página: CSS e programa dentro do HTML.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { build } from 'vite';

const root = 'C:/Users/andre/Documents/Pocket Basketball';
process.chdir(root);
const outDir = 'dist-mock';
await build({ logLevel: 'warn', build: { outDir, emptyOutDir: true, rollupOptions: { input: 'docs/mockups/editor-v2.html' } } });
const script = readdirSync(`${outDir}/assets`).find(name => name.endsWith('.js'));
if (!script) throw new Error('Não encontrei o programa compilado');
const code = readFileSync(`${outDir}/assets/${script}`, 'utf8').replace(/<\/script/g, '<\\/script');
const css = readFileSync('docs/mockups/menus-v2.css', 'utf8') + '\n' + readFileSync('docs/mockups/editor-v2.css', 'utf8');
const source = readFileSync('docs/mockups/editor-v2.html', 'utf8');
const body = source.match(/<body>([\s\S]*?)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '');
const page = `<!doctype html>
<html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Editores de emblema e equipamento</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jersey+10&family=Jersey+15&family=Jersey+20&display=swap">
<style>${css}</style></head><body>${body}<script type="module">${code}</script></body></html>
`;
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/editor-v2.html`, page);
console.log(`${outDir}/editor-v2.html: ${Math.round(page.length / 1024)} KB`);
process.exit(0);
