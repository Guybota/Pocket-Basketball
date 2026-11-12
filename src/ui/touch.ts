import { gameRect } from './layout.ts';

// Os toques no telemóvel e no tablet: segurar o dedo mostra o nome do que se está a tocar.

export function initTouch(): void {
  // Num tablet, segurar o dedo numa imagem abria o menu do sistema. Aqui segura-se para ler o que é.
  const tip = document.createElement('div');
  tip.id = 'tip';
  tip.hidden = true;
  document.body.append(tip);
  let tipTimer = 0;
  const hideTip = (): void => {
    clearTimeout(tipTimer);
    tip.hidden = true;
  };
  // Sem zoom de dois dedos (decisão do utilizador). O Safari do iPhone e do iPad ignora o user-scalable: os gestos têm de ser travados aqui.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, event => event.preventDefault(), { passive: false });
  document.addEventListener('touchmove', event => {
    if (event.touches.length > 1) event.preventDefault();
  }, { passive: false });
  document.addEventListener('contextmenu', event => {
    if ((event.target as HTMLElement).closest('img, canvas, button, .face, .hstar')) event.preventDefault();
  });
  document.addEventListener('pointerdown', event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[title], img[alt], [aria-label]');
    hideTip();
    if (!target) return;
    const label = target.getAttribute('title') || target.getAttribute('aria-label') || (target as HTMLImageElement).alt;
    if (!label) return;
    tipTimer = window.setTimeout(() => {
      tip.textContent = label;
      tip.hidden = false;
      const box = gameRect(target);
      tip.style.left = `${Math.max(4, Math.min(box.viewWidth - tip.offsetWidth - 4, box.left + box.width / 2 - tip.offsetWidth / 2))}px`;
      tip.style.top = `${Math.max(4, box.top - tip.offsetHeight - 6)}px`;
    }, 450);
  });
  for (const type of ['pointerup', 'pointercancel', 'scroll'] as const) document.addEventListener(type, hideTip, true);
  // Resposta ao toque: no instante em que o dedo chega, o botão fica a tinta, e assim fica pelo menos TAP_MS, mesmo num toque rápido.
  document.addEventListener('pointerdown', event => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('button:not(:disabled), [role="tab"]');
    if (button) holdTap(button);
  }, true);
}

/** Marca um elemento como tocado até o dedo sair, e pelo menos TAP_MS; `released` corre quando a marca sai. */
export function holdTap(element: HTMLElement, released: () => void = () => {}): void {
  const since = performance.now();
  element.classList.add('tap');
  const release = (): void => {
    document.removeEventListener('pointerup', release, true);
    document.removeEventListener('pointercancel', release, true);
    window.setTimeout(() => {
      element.classList.remove('tap');
      released();
    }, Math.max(0, TAP_MS - (performance.now() - since)));
  };
  document.addEventListener('pointerup', release, true);
  document.addEventListener('pointercancel', release, true);
}

/** Quanto tempo, no mínimo, um botão tocado fica marcado. */
export const TAP_MS = 120;
