import { SCENES, checkScene, renderScene, type SceneDef } from './mock-scenes.ts';
import { CORNERS } from './mock-corners.ts';

// A mesma página serve as maquetas de cenários e a dos cantos (<main data-scenes="cantos">).
const LIST = document.querySelector('main')?.dataset.scenes === 'cantos' ? CORNERS : SCENES;

const redraws: ((view: number) => void)[] = [];

function card(def: SceneDef, number: number): HTMLElement {
  const figure = document.createElement('figure');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${def.title}: ${def.note}`);
  canvas.dataset.name = def.title;
  const bar = document.createElement('div');
  bar.className = 'views';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', `Vista de ${def.title}`);
  const buttons = def.views.map((view, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = view.label;
    b.addEventListener('click', () => show(i));
    bar.append(b);
    return b;
  });
  function show(i: number): void {
    const view = Math.min(i, def.views.length - 1);
    renderScene(canvas, def, view);
    buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === view)));
  }
  show(0);
  redraws.push(show);
  const caption = document.createElement('figcaption');
  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = def.division;
  const title = document.createElement('h3');
  const n = document.createElement('span');
  n.className = 'num';
  n.textContent = String(number);
  title.append(n, def.title);
  const how = document.createElement('p');
  how.className = 'how';
  how.textContent = `Como é feito: ${def.build}.`;
  const note = document.createElement('p');
  note.textContent = def.note;
  caption.append(tag, title, how, note);
  figure.append(canvas, bar, caption);
  return figure;
}

const LABELS = LIST === CORNERS ? ['Jogo', 'Canto de perto', 'Alto'] : ['Primeira vista', 'Segunda vista', 'Terceira vista', 'Bancos'];
const all = document.getElementById('all-views')!;
const allButtons = LABELS.map((label, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', () => setAll(String(i)));
  all.append(b);
  return b;
});
function setAll(id: string): void {
  const i = Number(id);
  redraws.forEach(redraw => redraw(i));
  allButtons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
}

LIST.forEach((def, i) => document.getElementById('proposals')!.append(card(def, i + 1)));
allButtons[0]!.setAttribute('aria-pressed', 'true');
(window as unknown as { setAllViews: (id: string) => void }).setAllViews = setAll;
(window as unknown as { overlaps: Record<string, string[]> }).overlaps = Object.fromEntries(LIST.map(def => [def.title, checkScene(def)]));
(window as unknown as { viewIds: string[] }).viewIds = LABELS.map((_, i) => String(i));
