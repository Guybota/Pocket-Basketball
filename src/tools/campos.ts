// Fotografa os campos para os ver e comparar depressa: cada um de longe e de cima, com o pavilhão inteiro, e com a câmara
// do jogo nas duas pontas e ao meio. O cenário vem da placa gráfica, como no jogo; os bonecos encolhem com a distância da
// câmara (`Camera.depthScale`).
// npm run campos [-- divisões, ex.: 2 3] [--cor=#e8622a, a cor do clube da casa] [--cam=cy,cz,lookY,focal, para experimentar
// outra câmara do jogo; um campo vazio fica como está]  →  dist-check/campos/
import { mkdirSync, writeFileSync } from 'node:fs';
import { withAnimPage } from './anim-browser.ts';

const OUT = 'dist-check/campos';
mkdirSync(OUT, { recursive: true });
const divisions = process.argv.slice(2).filter(a => !a.startsWith('--')).map(Number).filter(n => Number.isInteger(n));
const color = process.argv.find(a => a.startsWith('--cor='))?.slice(6);
const camArg = process.argv.find(a => a.startsWith('--cam='))?.slice(6);
const tune = camArg ? Object.fromEntries(camArg.split(',').flatMap((v, i) => (v === '' ? [] : [[['cy', 'cz', 'lookY', 'focal'][i], Number(v)]]))) : null;
if (tune && Object.values(tune).some(v => !Number.isFinite(v))) throw new Error(`--cam=${camArg}: números separados por vírgulas (cy,cz,lookY,focal)`);
const tag = camArg ? `-cam${camArg.replace(/,/g, '_')}` : '';
const list = divisions.length > 0 ? divisions : [0, 1, 2, 3, 4];

await withAnimPage(async page => {
  for (const division of list) {
    const shots = await page.evaluate(async ({ division, color, tune }) => {
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
          [true, false], 1, undefined, undefined, color ?? club.kits[0].jersey, 1, undefined, club.emblem, club.emblem, undefined, TW.weatherFor(1));
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
        // Sem balões: tapavam a mesa e os bancos, que é o que se quer ver.
        view.drawBubbles = () => {};
        const cam = view.camera;
        if (tune) cam.tune(tune);
        const aim = cam.aim.bind(cam);
        // Em repouso: um só desenho não chega para a câmara ir de um olhar ao outro.
        cam.aim = () => aim(x, cam.tuning.lookY);
        view.render(0, 0);
        out[`jogo-x${x}`] = canvas.toDataURL();
      }
      return out;
    }, { division, color, tune });
    for (const [k, png] of Object.entries(shots)) writeFileSync(`${OUT}/d${division}${color ? `-${color.slice(1)}` : ''}${tag}-${k}.png`, Buffer.from(png.split(',')[1]!, 'base64'));
    console.log(`divisão ${division}: ${Object.keys(shots).length} imagens`);
  }
}, e => console.log('ERRO', e), true);
