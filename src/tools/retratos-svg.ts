// Folha dos retratos em SVG (portraitSvgImage, em src/ui/art/figure-svg.ts) ao lado dos retratos em pixel art de hoje:
//   node src/tools/retratos-svg.ts [ronda]
// Grava dist-check/retratos-svg/folha.png (e ronda-N.png). Cada linha é uma pessoa; em cada uma das 4 expressões há o
// retrato pixel (48 px) e o SVG a 84, 48 e 20 px (este com `small`), sobre o fundo azul da ficha. Usa o Edge, como o browser-check.
import { copyFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { generateTeam } from '../sim/teamgen.ts';
import { clubIdentity } from '../ui/art/identity.ts';
import { lookOf, type KitName, type Look } from '../ui/art/sprites.ts';
import { INK } from '../ui/art/palette.ts';
import { portraitGrid, PORTRAIT_SIZE, type Mood } from '../ui/art/portrait.ts';
import { portraitSvgImage } from '../ui/art/figure-svg.ts';
import { STAFF } from '../ui/staff.ts';

const OUT = 'dist-check/retratos-svg';
mkdirSync(OUT, { recursive: true });
const round = process.argv[2];

const team = generateTeam(7, 'Vila Nova', 2);
const club = clubIdentity('Vila Nova').kits[0];
const rival = clubIdentity('Ribeira').kits[0];
const p = (i: number, kit: KitName): Look => lookOf(team.roster[i]!, kit);
const PEOPLE: readonly (readonly [string, Look])[] = [
  ['Jogador (clube)', { ...p(0, 'blue'), custom: club }],
  ['Jogador (riscas)', { ...p(1, 'blue'), custom: rival }],
  ['Jogador (azul)', { ...p(2, 'blue'), skin: 3 }],
  ['Jogador (creme)', { ...p(3, 'cream'), skin: 0 }],
  ['Treinador', p(4, 'coach')],
  ['Adjunto', STAFF.assistant.look],
  ['Secretária', STAFF.secretary.look],
  ['Presidente', STAFF.president.look],
  ['Árbitro', p(5, 'referee')],
  ['Adepto', p(6, 'fan')],
  ['Adepta', { ...p(7, 'fan2'), skin: 2 }],
];
const MOODS: readonly Mood[] = ['neutral', 'happy', 'worried', 'sad'];
const MOOD_NAMES = { neutral: 'neutro', happy: 'contente', worried: 'preocupado', sad: 'triste' } as const;

const rows = PEOPLE.map(([name, look]) => ({ name, cells: MOODS.map(mood => ({ grid: portraitGrid(look, mood), svg: portraitSvgImage(look, mood), small: portraitSvgImage(look, mood, true) })) }));

const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;padding:12px;background:#2a2f3a;color:#f4efe0;font:13px sans-serif;width:1240px}
  table{border-collapse:separate;border-spacing:6px 6px}
  td{vertical-align:middle;text-align:center}
  .bg{background:linear-gradient(#6f97e6,#c6d6f6);border:2px solid #1b2230;display:inline-block;line-height:0}
  canvas{image-rendering:pixelated;width:48px;height:48px}
  .m{border-left:2px solid #555;padding-left:8px}
</style><table><tr><th></th>${MOODS.map(m => `<th colspan="4" class="m">${MOOD_NAMES[m]}: pixel 48 · SVG 84 · 48 · 20</th>`).join('')}</tr>
${rows.map((row, r) => `<tr><td style="text-align:right">${row.name}</td>${row.cells.map((cell, m) => `<td class="m"><span class="bg"><canvas id="c${r}_${m}" width="${PORTRAIT_SIZE}" height="${PORTRAIT_SIZE}"></canvas></span></td>${[84, 48, 20].map(s => `<td><span class="bg"><img src="${s <= 28 ? cell.small : cell.svg}" width="${s}" height="${s}"></span></td>`).join('')}`).join('')}</tr>`).join('')}
</table>
<script>
  // O mesmo contorno automático do paintGrid de portrait.ts.
  const grids = ${JSON.stringify(rows.map(row => row.cells.map(cell => cell.grid)))};
  const S = ${PORTRAIT_SIZE};
  grids.forEach((cells, r) => cells.forEach((grid, m) => {
    const g = document.getElementById('c' + r + '_' + m).getContext('2d');
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const near = (x > 0 && grid[i - 1]) || (x < S - 1 && grid[i + 1]) || (y > 0 && grid[i - S]) || (y < S - 1 && grid[i + S]);
      const color = grid[i] || (near ? '${INK}' : null);
      if (color) { g.fillStyle = color; g.fillRect(x, y, 1, 1); }
    }
  }));
</script>`;

const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL ?? (process.env.BROWSER_PATH || process.platform !== 'win32' ? undefined : 'msedge'),
  executablePath: process.env.BROWSER_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 1264, height: 800 } });
await page.setContent(html);
await page.waitForLoadState('load');
await page.screenshot({ path: `${OUT}/folha.png`, fullPage: true });
await browser.close();
console.log(`${OUT}/folha.png`);
if (round) {
  copyFileSync(`${OUT}/folha.png`, `${OUT}/ronda-${round}.png`);
  console.log(`${OUT}/ronda-${round}.png`);
}
