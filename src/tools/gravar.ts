// Grava um momento do jogo em movimento, como o jogo o mostra (a câmara do jogo, a placa gráfica, os bonecos com perspetiva),
// a 30 imagens por segundo: para ver cintilação, saltos e passeios que as fotografias paradas não mostram.
// node src/tools/gravar.ts <divisão> <momento> [segundos antes] [segundos depois]  →  dist-check/gravar/<divisão>-<momento>/
// Momentos: ressalto (a transição a seguir), afundanco (um que entra), inicio (a bola ao alto), intervalo; varrimento: a câmara a andar
// devagar a partir de x = <antes>, durante <depois> segundos, com tudo parado (para medir cintilação).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { withAnimPage } from './anim-browser.ts';

const [division = 3, moment = 'ressalto', before = 0.5, after = 3.5] = process.argv.slice(2).map((a, i) => (i === 1 ? a : Number(a))) as [number, string, number, number];
const OUT = `dist-check/gravar/${division}-${moment}`;
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const FPS = 30;

await withAnimPage(async page => {
  // Primeiro, sem desenhar, o passo em que o momento acontece; depois, o mesmo jogo outra vez, desenhado à volta dele.
  const frames = await page.evaluate(async ({ division, moment, before, after, FPS }) => {
    const MV = await import('/src/ui/match-view.ts' as string);
    const CL = await import('/src/ui/club.ts' as string);
    const G = await import('/src/ui/gpu/loader.ts' as string);
    G.useCourtGpu('force');
    await G.loadCourtGpu();
    const club = CL.newClub(5, Math.min(division, 3));
    let hit = -1;
    // Um afundanço que entra: o cesto (`made`) de um lançamento que foi afundanço.
    let dunking = false;
    let tick = 0;
    const make = (canvas: HTMLCanvasElement): any => new MV.MatchView(canvas.getContext('2d')!, CL.clubTeam(club), CL.opponentOf(club), CL.weekSeed(club), division, {
      announce: () => {},
      sound: () => {},
      event: (e: any) => {
        if (hit >= 0) return;
        if (e.type === 'shot') dunking = e.dunk === true;
        const found = moment === 'ressalto' ? e.type === 'rebound' && tick > 400
          : moment === 'afundanco' ? e.type === 'made' && dunking
          : moment === 'intervalo' ? e.type === 'periodEnd' && e.period === 2
          : e.type === 'jumpBall';
        if (found) hit = tick;
      },
    }, [true, false], 1, undefined, undefined, club.kits[0].jersey, 1);
    if (moment === 'varrimento') {
      // A câmara a andar 1 cm por imagem (menos de meio píxel), com o jogo e o público parados: o que muda muito de uma
      // imagem para a seguinte é cintilação (linhas finas, texels que saltam), e não movimento.
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 432;
      canvas.dataset.artScale = '2';
      const view = make(canvas);
      view.drawBubbles = () => {};
      for (let i = 0; i < 200; i++) view.stepSim();
      const cam = view.camera;
      const aim = cam.aim.bind(cam);
      let x = before;
      cam.aim = () => aim(x, cam.tuning.lookY);
      const out: string[] = [];
      for (let f = 0; f < after * FPS; f++) {
        x = before + f * 0.01;
        view.render(0, 0, 0);
        out.push(canvas.toDataURL());
      }
      return { frames: out, hit: 200 };
    }
    const probe = make(document.createElement('canvas'));
    while (hit < 0 && tick < 30000) {
      probe.stepSim();
      tick++;
    }
    if (hit < 0) return { error: `sem ${moment} em ${tick} passos` };
    const canvas = document.createElement('canvas');
    const art = 2;
    canvas.width = 360 * art;
    canvas.height = 216 * art;
    canvas.dataset.artScale = String(art);
    const view = make(canvas);
    view.drawBubbles = () => {};
    const start = Math.max(0, hit - Math.round(before * 20));
    for (tick = 0; tick < start; tick++) view.stepSim();
    // Uns segundos desenhados antes de gravar, para a câmara chegar ao sítio dela.
    for (let i = 0; i < 30; i++) view.render(0, 0, 1 / FPS);
    const out: string[] = [];
    const total = Math.round((before + after) * FPS);
    let simTime = 0;
    for (let f = 0; f < total; f++) {
      simTime += 20 / FPS;
      while (tick < start + Math.floor(simTime)) {
        view.stepSim();
        tick++;
      }
      view.render(simTime - Math.floor(simTime), 1 / FPS);
      out.push(canvas.toDataURL());
    }
    return { frames: out, hit };
  }, { division, moment, before, after, FPS });
  if ('error' in frames) {
    console.log(frames.error);
    return;
  }
  frames.frames.forEach((png: string, i: number) => writeFileSync(`${OUT}/frame-${String(i + 1).padStart(4, '0')}.png`, Buffer.from(png.split(',')[1]!, 'base64')));
  console.log(`${OUT}: ${frames.frames.length} imagens (o momento no passo ${frames.hit})`);
}, e => console.log('ERRO', e), false);
