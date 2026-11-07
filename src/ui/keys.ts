// Atalhos de teclado no computador. Cada atalho carrega no botão que já existe no ecrã, por isso faz o mesmo que o rato,
// com as mesmas confirmações (o desconto pede dois toques) e os mesmos comandos registados.

/** O que cada tecla faz, na lista do «?» e nas dicas dos botões. */
export const KEY_HELP: readonly (readonly [string, readonly (readonly [string, string])[]])[] = [
  ['No jogo', [['Espaço', 'Pausa / continuar'], ['D', 'Desconto (duas vezes)'], ['T', 'Trocas'], ['A', 'Táticas'], ['S', 'Som'], ['1–5', 'Separadores do painel'], ['Esc', 'Fechar o painel aberto']]],
  ['Na cidade', [['P', 'Pavilhão'], ['E', 'Escritório'], ['T', 'Treino'], ['F', 'Federação'], ['R', 'Torre'], ['A', 'Aeroporto'], ['Enter', 'Passar a semana']]],
  ['Nos menus', [['Esc', 'Voltar'], ['Enter', 'Botão principal'], ['↑ ↓', 'Mudar de linha numa lista']]],
  ['Sempre', [['?', 'Esta lista']]],
];

const MATCH_KEYS: Record<string, string> = { ' ': '#pauseBtn', d: '#timeoutBtn', t: '#subsBtn', a: '#matchTacticsBtn', s: '#muteBtn' };
const TOWN_KEYS: Record<string, string> = { p: '#arenaChip', e: '#officeBtn', t: '#trainBtn', f: '#federationBtn', r: '#towerChip', a: '#airportChip', enter: '#skipWeekBtn' };
// Por ordem: a ficha, as trocas e as táticas do jogo, a repetição, e o Voltar dos menus.
const CLOSE = '[data-card="close"], [data-subs-close], #matchTacticsClose, #replayBack, .back';
const PRIMARY = '.primary, .mbar.go';
const ROWS = '.prow, .trow';
const LABELS: Record<string, string> = { ' ': 'Espaço', enter: 'Enter', escape: 'Esc' };

const shown = (el: Element | null): el is HTMLElement => el instanceof HTMLElement && el.getClientRects().length > 0 && !(el as HTMLButtonElement).disabled;
const first = (selector: string): HTMLElement | undefined => [...document.querySelectorAll(selector)].find(shown);
const editing = (el: Element | null): boolean => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el instanceof HTMLElement && el.isContentEditable);
const desktop = (): boolean => matchMedia('(pointer: fine)').matches;

/** A lista dos atalhos, numa janela como a das Definições: o Esc e o foco são os do próprio browser. */
function openHelp(): void {
  const dialog = document.createElement('dialog');
  dialog.id = 'keysHelp';
  dialog.setAttribute('aria-labelledby', 'keysTitle');
  dialog.innerHTML = `<form method="dialog"><h2 id="keysTitle">Atalhos</h2>${KEY_HELP.map(([group, rows]) => `<table><caption>${group}</caption>${rows.map(([key, what]) => `<tr><th scope="row"><kbd>${key}</kbd></th><td>${what}</td></tr>`).join('')}</table>`).join('')}<button type="submit" class="primary">Fechar</button></form>`;
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

/** Junta a tecla à dica de cada botão que tem atalho, sem mudar o que está escrito nele. */
function annotate(): void {
  const hint = (el: Element, key: string): void => {
    const label = LABELS[key] ?? key.toUpperCase();
    const base = el.getAttribute('title') || el.getAttribute('aria-label') || (el.textContent ?? '').trim();
    if (!base.endsWith(`(${label})`)) el.setAttribute('title', `${base} (${label})`);
  };
  for (const map of [MATCH_KEYS, TOWN_KEYS]) for (const [key, selector] of Object.entries(map)) document.querySelectorAll(selector).forEach(el => hint(el, key));
  document.querySelectorAll('#panel [data-tab]').forEach((el, i) => hint(el, String(i + 1)));
  document.querySelectorAll('.back').forEach(el => hint(el, 'escape'));
}

function onKey(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.key === 'Tab') return;
  const active = document.activeElement;
  // Nunca a escrever, nem por cima de uma janela aberta (as Definições, esta lista): aí as teclas são do campo ou da janela.
  if (editing(active) || document.querySelector('dialog[open]')) return;
  if (event.key === '?') {
    if (!desktop()) return;
    event.preventDefault();
    openHelp();
    return;
  }
  if (event.shiftKey) return;
  const key = event.key.toLowerCase();
  // Num botão com o foco, o Espaço e o Enter carregam nesse botão, como sempre.
  const onControl = active instanceof HTMLElement && active !== document.body && active.matches('button, a[href], [role="tab"], [tabindex]');
  if (onControl && (key === ' ' || key === 'enter')) return;
  const go = (target: HTMLElement | undefined): void => {
    if (!target) return;
    event.preventDefault();
    if (!event.repeat) target.click();
  };
  if ((key === 'arrowdown' || key === 'arrowup') && active instanceof HTMLElement && active.matches(ROWS)) {
    const rows = [...active.parentElement!.querySelectorAll<HTMLElement>(ROWS)].filter(shown);
    const next = rows[rows.indexOf(active) + (key === 'arrowdown' ? 1 : -1)];
    event.preventDefault();
    next?.focus();
    return;
  }
  if (shown(document.getElementById('pauseBtn'))) {
    if (MATCH_KEYS[key]) return go(first(MATCH_KEYS[key]));
    if (key >= '1' && key <= '5') return go([...document.querySelectorAll<HTMLElement>('#panel [data-tab]')][Number(key) - 1]);
  } else if (shown(document.getElementById('arenaChip'))) {
    if (TOWN_KEYS[key]) return go(first(TOWN_KEYS[key]));
  }
  if (key === 'escape') return go(first(CLOSE));
  if (key === 'enter') return go(first(PRIMARY));
}

export function initKeys(root: HTMLElement): void {
  addEventListener('keydown', onKey);
  // As dicas com a tecla só no computador: no telemóvel, o dedo pousado mostra o title, e lá não há teclas.
  if (!desktop()) return;
  annotate();
  new MutationObserver(annotate).observe(root, { childList: true, subtree: true });
}
