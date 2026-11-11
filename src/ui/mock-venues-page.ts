import { CURRENT, render, type Proposal } from './mock-venues.ts';
import { PROPOSALS } from './mock-venues-proposals.ts';

function card(p: Proposal, number?: number): HTMLElement {
  const figure = document.createElement('figure');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${p.title}: ${p.note}`);
  render(canvas, p);
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
  figure.append(canvas, caption);
  return figure;
}

PROPOSALS.forEach((p, i) => document.getElementById('proposals')!.append(card(p, i + 1)));
CURRENT.forEach(p => document.getElementById('current')!.append(card(p)));
