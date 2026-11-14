// Compara o interior dos pavilhões desenhado pela placa gráfica (src/ui/gpu/venue-shader.ts) com o traçador de raios
// (Camera.drawScene), píxel a píxel a 360×216, em vários pavilhões (e no campo de rua, com a rede à parte), enquadramentos
// e imagens do público. Os dois fazem as
// mesmas contas e não podem divergir: corre isto sempre que mudares um deles.  npm run gpu-check
import { withAnimPage } from './anim-browser.ts';

const failures: string[] = [];
await withAnimPage(async page => {
  const rows = await page.evaluate(async () => {
    const C = await import('/src/ui/art/court.ts' as string);
    const G = await import('/src/ui/gpu/court-gpu.ts' as string);
    G.useCourtGpu('force');
    const gpu = G.courtGpu();
    if (!gpu) return [{ name: 'sem WebGL 2', bad: 1, floorMismatch: 0, diff: 0, maxCh: 0, fenceDiff: 0 }];
    const W = 360;
    const H = 216;
    const read = document.createElement('canvas');
    read.width = W;
    read.height = H;
    const rg = read.getContext('2d', { willReadFrequently: true })!;
    const out: { name: string; bad: number; floorMismatch: number; diff: number; maxCh: number; fenceDiff: number }[] = [];
    const cases: [number, number, number, number, Record<string, number> | null][] = [];
    for (const div of [0, 1, 2, 3, C.CLOSED_GYM]) {
      for (const [lx, ly] of [[14, C.LOOK_Y], [0, C.LOOK_Y], [28, C.LOOK_Y], [4, -3], [24, 1.5]]) for (const frame of [0, 3]) cases.push([div, lx!, ly!, frame, null]);
      // Outra câmara: mais alta e mais perto.
      cases.push([div, 14, C.LOOK_Y, 0, { cy: 9, cz: 6 }]);
    }
    for (const [div, lx, ly, frame, tune] of cases) {
      const t = C.courtTextures(div);
      const cam = new C.Camera();
      if (tune) cam.tune(tune);
      cam.aim(lx, ly);
      // Sem as linhas do campo, que no traçador ficam por cima e na placa gráfica são uma malha à parte.
      (cam as unknown as { drawCourtLines: () => void }).drawCourtLines = () => {};
      const cpu = new Uint32Array(W * H);
      // No campo de rua, a rede vai para a sua camada, como no jogo.
      const cpuFence = t.theme.open ? new Uint32Array(W * H) : undefined;
      cam.drawScene(cpu, t, frame, cpuFence);
      const shot = gpu.debugStands(cam, t, W, H, frame);
      rg.clearRect(0, 0, W, H);
      if (shot) rg.drawImage(shot, 0, 0);
      const g = new Uint32Array(rg.getImageData(0, 0, W, H).data.buffer);
      // A rede, à parte: onde há rede no traçador tem de haver na placa, com a mesma cor e a mesma transparência.
      let fenceDiff = 0;
      if (cpuFence) {
        const f = gpu.drawFence(t, true);
        rg.clearRect(0, 0, W, H);
        if (f) rg.drawImage(f, 0, 0);
        const fd = rg.getImageData(0, 0, W, H).data;
        for (let i = 0; i < W * H; i++) {
          const c = cpuFence[i]!;
          const a = fd[i * 4 + 3]!;
          if (c === 0 || a === 0) {
            if ((c === 0) !== (a === 0)) fenceDiff++;
            continue;
          }
          let m = Math.abs(((c >>> 24) & 255) - a);
          for (let k = 0; k < 3; k++) m = Math.max(m, Math.abs(((c >>> (8 * k)) & 255) - fd[i * 4 + k]!));
          if (m > 6) fenceDiff++;
        }
      }
      const { position: [cx, cy, cz], fwd, right, up, focal } = cam.pose();
      const { x0, x1, y0, chamfer: cut } = C.FLOOR_AREA;
      const chamfer = t.steps !== null && t.theme.chamfer === true;
      let floorMismatch = 0;
      let diff = 0;
      let maxCh = 0;
      let big = 0;
      for (let sy = 0; sy < H; sy++) {
        for (let sx = 0; sx < W; sx++) {
          const i = sy * W + sx;
          // O chão, com a mesma conta do traçador (o raio pelo centro do píxel).
          const vy = H / 2 - sy - 0.5;
          const vx = sx + 0.5 - W / 2;
          const rz = fwd[2] * focal + up[2] * vy;
          let isFloor = false;
          if (rz < 0) {
            const T = -cz / rz;
            const hx = cx + (fwd[0] * focal + up[0] * vy + right[0] * vx) * T;
            const hy = cy + (fwd[1] * focal + up[1] * vy + right[1] * vx) * T;
            isFloor = hx > x0 && hx < x1 && hy > y0 && (!chamfer || (hx - x0 + hy - y0 > cut && x1 - hx + hy - y0 > cut));
          }
          const magenta = (g[i]! & 0xffffff) === 0xff00ff;
          if (isFloor !== magenta) {
            floorMismatch++;
            continue;
          }
          if (isFloor) continue;
          const a = cpu[i]!;
          const b = g[i]!;
          if ((a & 0xffffff) === (b & 0xffffff)) continue;
          let m = 0;
          for (let s = 0; s < 24; s += 8) m = Math.max(m, Math.abs(((a >>> s) & 255) - ((b >>> s) & 255)));
          maxCh = Math.max(maxCh, m);
          // Um tom da fila vizinha (até 6/255, como na rede) é arredondamento; só conta o que vai além disso.
          if (m > 6) diff++;
          if (m > 12) big++;
        }
      }
      // Um píxel ou outro difere em float32 contra float64: na fronteira de uma fila, pela cor da fila vizinha, e raramente
      // numa aresta, onde o raio passa rente e cai na face do lado. Mais do que isso é uma diferença nas contas.
      const bad = floorMismatch > 0 || diff > W * H * 0.002 || big > 4 || fenceDiff > 4 ? 1 : 0;
      out.push({ name: `divisão ${div}, câmara em ${lx}, ${ly.toFixed(1)}${tune ? ' (outra câmara)' : ''}, público ${frame}`, bad, floorMismatch, diff, maxCh, fenceDiff });
    }
    return out;
  });
  for (const r of rows) {
    console.log(`${r.bad ? 'FALHOU' : 'OK    '} ${r.name}: chão diferente ${r.floorMismatch}, cor diferente ${r.diff} (máx. ${r.maxCh}/255), rede diferente ${r.fenceDiff}`);
    if (r.bad) failures.push(r.name);
  }
}, e => {
  console.log('ERRO', e);
  failures.push(e);
});
console.log(failures.length ? `\n${failures.length} caso(s) falharam.` : '\nA placa gráfica e o traçador dão o mesmo pavilhão.');
process.exitCode = failures.length ? 1 : 0;
