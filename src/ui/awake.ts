// Durante os jogos o ecrã não se apaga: pede-se ao browser que o mantenha ligado (Screen Wake Lock).
// Onde não há essa função, ou ela é recusada, toca-se um vídeo mudo e invisível, que também mantém o ecrã aceso.

let wanted = false;
let lock: WakeLockSentinel | null = null;
let video: HTMLVideoElement | null = null;

/** Liga ou desliga o ecrã sempre aceso. Chamar a partir de um toque do jogador, para o vídeo de recurso poder tocar. */
export function keepAwake(on: boolean): void {
  wanted = on;
  if (on) void acquire();
  else release();
}

async function acquire(): Promise<void> {
  if (!wanted || lock || document.visibilityState !== 'visible') return;
  try {
    if (!('wakeLock' in navigator)) throw new Error('sem wake lock');
    const sentinel = await navigator.wakeLock.request('screen');
    // Se o jogador já saiu do jogo enquanto o pedido estava a caminho, larga-se logo.
    if (!wanted) {
      void sentinel.release();
      return;
    }
    lock = sentinel;
    sentinel.addEventListener('release', () => {
      if (lock === sentinel) lock = null;
    });
  } catch {
    playVideo();
  }
}

function release(): void {
  const current = lock;
  lock = null;
  if (current) void current.release().catch(() => {});
  if (video) {
    video.pause();
    video.remove();
    video = null;
  }
}

/** O recurso: um vídeo de um píxel, feito a partir de um canvas, a tocar sem som e fora da vista. */
function playVideo(): void {
  if (video || !wanted) return;
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const g = canvas.getContext('2d');
  if (!g || typeof canvas.captureStream !== 'function') return;
  g.fillRect(0, 0, 2, 2);
  const element = document.createElement('video');
  element.muted = true;
  element.playsInline = true;
  element.loop = true;
  element.setAttribute('playsinline', '');
  element.setAttribute('aria-hidden', 'true');
  element.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:0;top:0';
  element.srcObject = canvas.captureStream(1);
  document.body.append(element);
  video = element;
  void element.play().catch(() => {});
}

// O browser larga o pedido quando a página fica escondida; ao voltar, pede-se de novo.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wanted) void acquire();
});
