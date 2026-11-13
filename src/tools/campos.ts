// Fotografa os campos para os ver e comparar depressa: cada um de longe e de cima, com o pavilhão inteiro, e com a câmara
// do jogo nas duas pontas e ao meio. O cenário vem da placa gráfica, como no jogo; os bonecos encolhem com a distância da
// câmara (`Camera.depthScale`).
// npm run campos [-- divisões, ex.: 2 3]  →  dist-check/campos/
import { mkdirSync, writeFileSync } from 'node:fs';
import { withAnimPage } from './anim-browser.ts';

const OUT = 'dist-check/campos';
mkdirSync(OUT, { recursive: true });
const divisions = process.argv.slice(2).map(Number).filter(n => Number.isInteger(n));
const list = divisions.length > 0 ? divisions : [0, 1, 2, 3, 4];

await withAnimPage(async page => {
  for (const division of list) {
    const shots = await page.evaluate(async division => {
      const MV = await import('/src/ui/match-view.ts' as string);
      const CL = await import('/src/ui/club.ts' as string);
      const TW = await import('/src/ui/art/town.ts' as string);
      const G = await import('/src/ui/gpu/loader.ts' as string);
      G.useCourtGpu('force');
      await G.loadCourtGpu();
      const out: Record<string, string> = {};
      const make = (art: number, w: number, h: number): { view: any; canvas: HTMLCanvasElement } => {
        // A divisão 4 é o pavilhão fechado dos jogos-treino: o clube é o do escolar.
        const club = CL.newClub(5, Math.min(division, 3));
        const canvas = document.createElement('canvas');
        canvas.width = w * art;
        canvas.height = h * art;
        canvas.dataset.artScale = String(art);
        const view: any = new MV.MatchView(canvas.getContext('2d')!, CL.clubTeam(club), CL.opponentOf(club), CL.weekSeed(club), division, { announce: () => {}, event: () => {}, sound: () => {} },
          [true, false], 1, undefined, undefined, club.kits[0].jersey, 1, undefined, club.emblem, club.emblem, undefined, TW.weatherFor(1));
        for (let i = 0; i < 200; i++) view.stepSim();
        return { view, canvas };
      };
      // De longe e de cima: o pavilhão inteiro, sem os balões nem os nomes, que são da câmara do jogo.
      {
        const { view, canvas } = make(3, 640, 360);
        for (const hide of ['drawBubbles', 'drawFloaters', 'drawNameTags', 'drawCarrier']) view[hide] = () => {};
        const cam = view.camera;
        cam.tune({ cy: 30, cz: 26, lookY: -1, focal: 260 });
        const aim = cam.aim.bind(cam);
        cam.aim = () => aim(14, -1);
        view.render(0, 0);
        out.inteiro = canvas.toDataURL();
      }
      // A câmara do jogo nas duas pontas (até onde ela vai) e ao meio.
      for (const x of [4.4, 14, 23.6]) {
        const { view, canvas } = make(4, 360, 216);
        const cam = view.camera;
        const aim = cam.aim.bind(cam);
        cam.aim = (_x: number, y?: number) => aim(x, y);
        view.render(0, 0);
        out[`jogo-x${x}`] = canvas.toDataURL();
      }
      return out;
    }, division);
    for (const [k, png] of Object.entries(shots)) writeFileSync(`${OUT}/d${division}-${k}.png`, Buffer.from(png.split(',')[1]!, 'base64'));
    console.log(`divisão ${division}: ${Object.keys(shots).length} imagens`);
  }
}, e => console.log('ERRO', e), true);
