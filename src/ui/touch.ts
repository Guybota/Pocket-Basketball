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
    if ((event.target as HTMLElement).closest('img, canvas, button, .face, .stars')) event.preventDefault();
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
      const box = target.getBoundingClientRect();
      tip.style.left = `${Math.max(4, Math.min(window.innerWidth - tip.offsetWidth - 4, box.left + box.width / 2 - tip.offsetWidth / 2))}px`;
      tip.style.top = `${Math.max(4, box.top - tip.offsetHeight - 6)}px`;
    }, 450);
  });
  for (const type of ['pointerup', 'pointercancel', 'scroll'] as const) document.addEventListener(type, hideTip, true);
}
