// As falas das pessoas do clube escrevem-se letra a letra, como no género; um toque na fala mostra logo a frase toda.
import { reducedMotion } from './settings.ts';

const CHARS_PER_SECOND = 45;
// As frases já escritas não se voltam a escrever quando o ecrã se redesenha com a mesma fala.
const seen = new Set<string>();
const busy = new WeakSet<Element>();

function type(el: HTMLElement): void {
  const full = el.textContent ?? '';
  if (!full || seen.has(full) || busy.has(el)) return;
  seen.add(full);
  // Só uma frase nova entra com o fundido: um painel que se reescreve (as trocas no desconto, a cada 250 ms) recria a
  // fala com o mesmo texto, e ela piscava.
  el.closest('.say')?.classList.add('say-new');
  if (seen.size > 200) seen.delete(seen.values().next().value!);
  if (reducedMotion()) return;
  busy.add(el);
  // O texto fica todo no sítio (o leitor de ecrã e a caixa não mudam); a parte por escrever fica só invisível.
  const shownPart = document.createElement('span');
  const rest = document.createElement('span');
  rest.style.visibility = 'hidden';
  rest.textContent = full;
  el.replaceChildren(shownPart, rest);
  const start = performance.now();
  let done = false;
  const finish = (): void => {
    if (done) return;
    done = true;
    // Se entretanto alguém trocou a fala, fica a nova.
    if (shownPart.isConnected) el.textContent = full;
    busy.delete(el);
  };
  el.closest('.say')?.addEventListener('pointerdown', finish, { once: true });
  const step = (now: number): void => {
    if (done) return;
    if (!shownPart.isConnected) return finish();
    const shown = Math.floor(((now - start) / 1000) * CHARS_PER_SECOND);
    if (shown >= full.length) return finish();
    shownPart.textContent = full.slice(0, shown);
    rest.textContent = full.slice(shown);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Observa a página: cada fala nova (`.say .t`) escreve-se letra a letra. */
export function initSpeech(): void {
  new MutationObserver(records => {
    for (const record of records) {
      const target = record.target instanceof HTMLElement ? record.target : record.target.parentElement;
      if (target?.matches('.say .t')) {
        if (!busy.has(target)) type(target);
        continue;
      }
      for (const node of record.addedNodes) {
        if (node instanceof HTMLElement) node.querySelectorAll<HTMLElement>('.say .t').forEach(type);
      }
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
