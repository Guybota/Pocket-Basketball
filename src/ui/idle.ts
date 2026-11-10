// Num desconto ou ao intervalo, sem ninguém tocar em nada durante 30 s, o jogo continua sozinho.
const IDLE_RESUME_MS = 30_000;

export interface IdleResume {
  /** Recomeça o jogo com `resume` se ninguém tocar durante 30 s. */
  start: (resume: () => void) => void;
  clear: () => void;
  /** Quanto falta, em ms, para o jogo recomeçar sozinho; null se não está a contar. */
  left: () => number | null;
}

export function createIdleResume(): IdleResume {
  let timer = 0;
  let pending: (() => void) | null = null;
  let due = 0;
  const start = (resume: () => void): void => {
    clearTimeout(timer);
    pending = resume;
    due = performance.now() + IDLE_RESUME_MS;
    timer = window.setTimeout(() => {
      pending = null;
      resume();
    }, IDLE_RESUME_MS);
  };
  // Cada toque volta a contar os 30 s.
  document.addEventListener('pointerdown', () => {
    if (pending) start(pending);
  });
  return {
    start,
    clear: () => {
      clearTimeout(timer);
      pending = null;
    },
    left: () => (pending ? Math.max(0, due - performance.now()) : null),
  };
}
