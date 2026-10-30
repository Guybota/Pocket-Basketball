// Junta o jogo compilado numa só página HTML, fácil de publicar e de partilhar para testes.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { build } from 'vite';

await build({ logLevel: 'warn' });
const assets = readdirSync('dist/assets');
const read = (extension: string): string => {
  const file = assets.find(name => name.endsWith(extension));
  if (!file) throw new Error(`Falta o ficheiro ${extension} em dist/assets`);
  return readFileSync(`dist/assets/${file}`, 'utf8');
};
const body = readFileSync('dist/index.html', 'utf8').match(/<body>([\s\S]*?)<\/body>/)?.[1];
if (!body) throw new Error('Não encontrei o corpo da página em dist/index.html');

const page = `<title>Pocket Basketball</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jersey+10&family=Jersey+15&family=Jersey+20&display=swap">
<style>${read('.css')}</style>
${body.replace(/<script[\s\S]*?<\/script>/g, '')}
<script type="module">${read('.js').replace(/<\/script/g, '<\\/script')}</script>
`;
writeFileSync('dist/pocket-basketball.html', page);
console.log(`dist/pocket-basketball.html: ${Math.round(page.length / 1024)} KB`);
process.exit(0);
