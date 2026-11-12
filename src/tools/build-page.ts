// Junta o jogo compilado numa só página HTML, fácil de publicar e de partilhar para testes.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { build } from 'vite';

// Constrói numa pasta própria: o browser-check esvazia `dist/` ao começar, e apagava a página publicada.
// O three.js, que no jogo publicado chega à parte, vai aqui para dentro do mesmo ficheiro: a página tem de ser uma só.
await build({ logLevel: 'warn', build: { outDir: 'dist-page', emptyOutDir: true, rollupOptions: { output: { inlineDynamicImports: true } } } });
const assets = readdirSync('dist-page/assets');
const read = (extension: string): string => {
  const file = assets.find(name => name.endsWith(extension));
  if (!file) throw new Error(`Falta o ficheiro ${extension} em dist-page/assets`);
  return readFileSync(`dist-page/assets/${file}`, 'utf8');
};
const body = readFileSync('dist-page/index.html', 'utf8').match(/<body>([\s\S]*?)<\/body>/)?.[1];
if (!body) throw new Error('Não encontrei o corpo da página em dist-page/index.html');

const page = `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>Pocket Basketball</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jersey+10&family=Jersey+15&family=Jersey+20&display=swap" media="print" onload="this.media='all'">
<style>${read('.css')}</style>
${body.replace(/<script[\s\S]*?<\/script>/g, '')}
<script type="module">${read('.js').replace(/<\/script/g, '<\\/script')}</script>
`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/pocket-basketball.html', page);
console.log(`dist/pocket-basketball.html: ${Math.round(page.length / 1024)} KB`);
process.exit(0);
