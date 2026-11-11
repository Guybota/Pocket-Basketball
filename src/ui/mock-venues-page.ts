import { CURRENT, VIEWS, render, type Proposal, type View } from './mock-venues.ts';
import { PROPOSALS } from './mock-venues-proposals.ts';

const redraws: ((view: View) => void)[] = [];

function card(p: Proposal, number?: number): HTMLElement {
  const figure = document.createElement('figure');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${p.title}: ${p.note}`);
  canvas.dataset.name = p.title;
  const bar = document.createElement('div');
  bar.className = 'views';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', `Vista de ${p.title}`);
  const buttons = VIEWS.map(view => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = view.label;
    b.addEventListener('click', () => show(view));
    bar.append(b);
    return b;
  });
  function show(view: View): void {
    render(canvas, p, view);
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(VIEWS[i] === view)));
  }
  show(VIEWS[0]!);
  redraws.push(show);
  const caption = document.createElement('figcaption');
  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = p.division;
  const title = document.createElement('h3');
  if (number !== undefined) {
    const n = document.createElement('span');
    n.className = 'num';
    n.textContent = String(number);
    title.append(n);
  }
  title.append(p.title);
  const note = document.createElement('p');
  note.textContent = p.note;
  caption.append(tag, title, note);
  figure.append(canvas, bar, caption);
  return figure;
}

// A vista de todos de uma vez, no topo da página.
const all = document.getElementById('all-views')!;
const allButtons = VIEWS.map(view => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = view.label;
  b.addEventListener('click', () => setAll(view.id));
  all.append(b);
  return b;
});
function setAll(id: string): void {
  const view = VIEWS.find(v => v.id === id) ?? VIEWS[0]!;
  redraws.forEach(redraw => redraw(view));
  allButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(VIEWS[i] === view)));
}

PROPOSALS.forEach((p, i) => document.getElementById('proposals')!.append(card(p, i + 1)));
CURRENT.forEach(p => document.getElementById('current')!.append(card(p)));
allButtons[0]!.setAttribute('aria-pressed', 'true');
(window as unknown as { setAllViews: (id: string) => void; viewIds: string[] }).setAllViews = setAll;
(window as unknown as { viewIds: string[] }).viewIds = VIEWS.map(v => v.id);
