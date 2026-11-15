// Folha de amostras dos jogadores de corpo inteiro em SVG (src/ui/art/figure-svg.ts), para a revisão:
//   node src/tools/figuras-svg.ts [ronda]
// Grava em dist-check/figuras-svg/: folha.png (1280×720), folha-844.png (844×390), comparacao.png (lado a lado com
// recortes do Calciobit das referências) e, com o número da ronda, ronda-N.png e ronda-N-comparacao.png.
// Usa o Edge instalado; noutra máquina o Chromium do Playwright, ou BROWSER_PATH / BROWSER_CHANNEL, como o browser-check.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { generateTeam } from '../sim/teamgen.ts';
import { clubIdentity } from '../ui/art/identity.ts';
import { pixelsForHeight } from '../ui/art/body.ts';
import { lookOf, type Build, type Look } from '../ui/art/sprites.ts';
import { figureSvg, FIGURE_VIEW, type FigureOptions } from '../ui/art/figure-svg.ts';

const OUT = 'dist-check/figuras-svg';
mkdirSync(OUT, { recursive: true });
const round = process.argv[2];

// Quatro clubes, quatro jogadores de cada. O cabelo e a cara vêm do nome, como no jogo; só a pele, o corpo e a altura se
// forçam a variar (forçar o cabelo criava gémeos que o jogo não fazia).
const CLUBS = ['Vila Nova', 'Porto Alto', 'Ribeira', 'Monte Claro'];
const BUILDS: readonly Build[] = ['athletic', 'slim', 'muscular', 'heavy'];
const HEIGHTS = [178, 192, 205, 186, 199, 172, 210, 183, 195, 188, 207, 176, 201, 190, 182, 214];
interface Sample { look: Look; options: FigureOptions; label: string }
const samples: Sample[] = [];
CLUBS.forEach((club, k) => {
  const team = generateTeam(100 + k, club, 2);
  const kit = clubIdentity(club).kits[0];
  for (let j = 0; j < 4; j++) {
    const i = k * 4 + j;
    const base = lookOf(team.roster[j]!, 'blue');
    const cm = HEIGHTS[i]!;
    const look: Look = { ...base, custom: kit, skin: (i + k) % 4, build: BUILDS[(i + (i >> 2)) % 4]!, ...pixelsForHeight(cm) };
    samples.push({ look, options: { trained: i === 3 || i === 10, number: 4 + ((i * 7) % 45) }, label: `${i + 1} · ${cm} cm${i === 3 || i === 10 ? ' · treinado' : ''}` });
  }
});

const dataUrl = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const ref = (path: string): string => `data:image/jpeg;base64,${readFileSync(path).toString('base64')}`;
const aspect = FIGURE_VIEW.width / FIGURE_VIEW.height;

/** A fila: duas linhas de oito, com a altura do boneco a 39 % do ecrã, como a fila do treino no Calciobit. */
function sheet(width: number, height: number): string {
  // O boneco médio ocupa ~215 das unidades da caixa: é essa parte que fica com 39 % do ecrã.
  const gap = Math.round(width / 160);
  // Cabem oito por linha com margem de 16 px de cada lado.
  const fh = Math.round(Math.min((height * 0.39 * FIGURE_VIEW.height) / 215, (width - 32 - 7 * gap) / 8 / aspect));
  const fw = Math.round(fh * aspect);
  const cell = (s: Sample): string => `<figure><img src="${dataUrl(figureSvg(s.look, s.options))}" width="${fw}" height="${fh}"><figcaption>${s.label}</figcaption></figure>`;
  return `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;width:${width}px;height:${height}px;background:#c98f55;font:${Math.max(9, Math.round(height / 60))}px sans-serif;color:#1b2230;overflow:hidden}
    .row{display:flex;justify-content:center;gap:${gap}px;height:${Math.round(height / 2)}px;align-items:center}
    figure{margin:0;text-align:center}img{display:block}figcaption{white-space:nowrap;margin-top:2px;font-size:0.85em}
  </style><div class="row">${samples.slice(0, 8).map(cell).join('')}</div><div class="row">${samples.slice(8).map(cell).join('')}</div>`;
}

/** Lado a lado: recortes do Calciobit à esquerda e em cima, os nossos com a mesma altura de boneco. */
function compare(): string {
  const t10 = ref('docs/referencias/calciobit/menu/treino/treino-10.jpg');
  const t11 = ref('docs/referencias/calciobit/menu/treino/treino-11.jpg');
  const c08 = ref('docs/referencias/calciobit/menu/cartas-habilidades/cartas-habilidades-08.jpg');
  // Um recorte de uma imagem de 800×450, ampliado k vezes.
  const crop = (src: string, x: number, y: number, w: number, h: number, k: number): string =>
    `<div style="width:${w * k}px;height:${h * k}px;background:url(${src}) -${x * k}px -${y * k}px/${800 * k}px ${450 * k}px"></div>`;
  // Os bonecos da fila no Calciobit medem ~177 px num ecrã de 450: com k = 1,6 ficam com 283 px.
  const k = 1.6;
  const rowH = Math.round(177 * k * (FIGURE_VIEW.height / 215));
  const ours = (from: number, count: number, h: number): string =>
    samples.slice(from, from + count).map(s => `<img src="${dataUrl(figureSvg(s.look, s.options))}" height="${h}" width="${Math.round(h * aspect)}">`).join('');
  const bigH = 700;
  return `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;width:1900px;background:#2a2f3a;color:#f4efe0;font:16px sans-serif;padding:12px;box-sizing:border-box}
    .flex{display:flex;gap:12px;align-items:flex-end;margin-bottom:12px;flex-wrap:wrap}
    .ours{background:#c98f55;display:flex;align-items:flex-end;gap:6px;padding:0 8px}
    h2{font-size:15px;margin:6px 0}
  </style>
  <h2>Calciobit A (referência, recortes) · Pocket Basketball (figure-svg.ts), à mesma altura de boneco</h2>
  <div class="flex">${crop(t10, 60, 85, 145, 330, 2)}<div class="ours" style="height:660px">${ours(0, 1, bigH)}${ours(5, 1, bigH)}${ours(2, 1, Math.round(bigH * 0.92))}</div></div>
  <div class="flex">${crop(t10, 370, 180, 430, 228, k)}<div class="ours">${ours(1, 5, rowH)}</div></div>
  <div class="flex">${crop(t11, 330, 210, 470, 190, k)}<div class="ours">${ours(8, 5, rowH)}</div></div>
  <div class="flex">${crop(c08, 90, 90, 300, 320, k)}<div class="ours">${ours(12, 4, rowH)}</div></div>`;
}

const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL ?? (process.env.BROWSER_PATH || process.platform !== 'win32' ? undefined : 'msedge'),
  executablePath: process.env.BROWSER_PATH || undefined,
});
const shoot = async (html: string, width: number, height: number, file: string, fullPage = false): Promise<void> => {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(html);
  await page.waitForLoadState('load');
  await page.screenshot({ path: `${OUT}/${file}`, fullPage });
  await page.close();
  console.log(`${OUT}/${file}`);
};
await shoot(sheet(1280, 720), 1280, 720, 'folha.png');
await shoot(sheet(844, 390), 844, 390, 'folha-844.png');
await shoot(compare(), 1900, 1000, 'comparacao.png', true);
// Nada pode sair da caixa do desenho: 400 caras ao acaso, com os cinco cabelos e os quatro corpos, na altura máxima.
{
  const page = await browser.newPage();
  const svgs: string[] = [];
  for (let i = 0; i < 400; i++) {
    const base = samples[i % samples.length]!.look;
    const face = Math.imul(i + 1, 2654435761) >>> 9;
    svgs.push(figureSvg({ ...base, face, style: i % 5, build: BUILDS[(i >> 2) % 4]! }, { height: 3 }));
  }
  const worst = await page.evaluate(([list, view]) => {
    let top = Infinity;
    let left = Infinity;
    let right = -Infinity;
    for (const svg of list as string[]) {
      document.body.innerHTML = svg;
      const box = (document.body.firstElementChild as SVGSVGElement).getBBox();
      top = Math.min(top, box.y);
      left = Math.min(left, box.x);
      right = Math.max(right, box.x + box.width);
    }
    const v = view as { y: number; width: number };
    // O getBBox conta as cores recortadas da camisola (que passam para a direita), por isso só a esquerda e o topo
    // valem: o boneco é simétrico, e a direita fica a v.width - left.
    return { top, left, right, ok: top >= v.y + 3 && left >= 3 };
  }, [svgs, FIGURE_VIEW] as const);
  console.log(`caixa: topo ${worst.top.toFixed(1)}, esquerda ${worst.left.toFixed(1)}, direita (com os recortes) ${worst.right.toFixed(1)} → ${worst.ok ? 'cabe' : 'FALHA: sai da caixa'}`);
  await page.close();
  if (!worst.ok) process.exitCode = 1;
}
await browser.close();
if (round) {
  copyFileSync(`${OUT}/folha.png`, `${OUT}/ronda-${round}.png`);
  copyFileSync(`${OUT}/comparacao.png`, `${OUT}/ronda-${round}-comparacao.png`);
  console.log(`${OUT}/ronda-${round}.png`);
}
