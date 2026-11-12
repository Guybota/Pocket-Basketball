// O medidor de imagens por segundo, para medir num telemóvel: abre-se com ?fps no endereço. Mostra as imagens por segundo, o
// tempo médio de desenho de cada uma e quem desenha o cenário (a placa gráfica, e qual, ou o traçador de raios).
export interface FpsMeter {
  /** Uma imagem desenhada: `now` do requestAnimationFrame e quanto demorou a desenhar, em ms. */
  frame(now: number, drawMs: number, onGpu: boolean | null): void;
}

export function createFpsMeter(gpuName: () => string | null): FpsMeter {
  const box = document.createElement('div');
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText = 'position:fixed;left:4px;top:4px;z-index:9999;padding:2px 6px;background:rgba(27,34,48,0.85);color:#fff;font:12px/1.4 monospace;pointer-events:none;white-space:pre';
  document.body.appendChild(box);
  let since = 0;
  let frames = 0;
  let drawn = 0;
  let worst = 0;
  return {
    frame(now, drawMs, onGpu) {
      if (since === 0) since = now;
      frames++;
      drawn += drawMs;
      worst = Math.max(worst, drawMs);
      if (now - since < 1000) return;
      const fps = (frames * 1000) / (now - since);
      const scene = onGpu === null ? 'sem jogo' : onGpu ? `placa: ${gpuName() ?? '?'}` : 'traçador de raios';
      box.textContent = `${fps.toFixed(0)} img/s · desenho ${(drawn / frames).toFixed(1)} ms (pior ${worst.toFixed(1)})\n${scene}`;
      since = now;
      frames = 0;
      drawn = 0;
      worst = 0;
    },
  };
}
