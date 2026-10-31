import type { Tactics } from '../sim/types.ts';
import { CARDS, type CardId } from '../sim/training.ts';
import { cardImage } from './art/cards.ts';

const card = (id: CardId): string => cardImage(id, CARDS[id].category);

export const TACTIC_ROWS: readonly { key: keyof Tactics; label: string; options: readonly [number, string, string][] }[] = [
  { key: 'pressure', label: 'Pressão', options: [
    [-1, 'Recuada', 'Menos faltas e menos cansaço, mas rouba menos.'],
    [0, 'Normal', 'Defende cada um no seu sítio.'],
    [1, 'Alta', 'Rouba mais, faz mais faltas e cansa mais.'],
  ] },
  { key: 'spacing', label: 'Ataque', options: [
    [-1, 'Por dentro', 'Mais ataques ao cesto, menos lançamentos de 3.'],
    [0, 'Misto', 'Escolhe conforme a jogada.'],
    [1, 'Aberto', 'Abre o campo e lança mais de 3.'],
  ] },
  { key: 'pace', label: 'Ritmo', options: [
    [-1, 'Lento', 'Menos posses de bola e poupa energia.'],
    [0, 'Normal', 'Sem pressa nem demoras.'],
    [1, 'Rápido', 'Mais posses de bola, mas cansa mais.'],
  ] },
];

export function tacticsControls(tactics: Tactics): string {
  return TACTIC_ROWS.map(({ key, label, options }) => {
    const current = options.find(([value]) => value === tactics[key]) ?? options[1]!;
    const buttons = options.map(([value, name]) => `<button type="button" data-tactic="${key}" data-tactic-value="${value}" aria-pressed="${value === tactics[key]}">${name}</button>`).join('');
    return `<div class="tactic"><span class="moves-title">${label}</span><div class="tactic-options" role="group" aria-label="${label}">${buttons}</div><span class="tactic-note">${current[2]}</span></div>`;
  }).join('');
}

export function foundCards(cards: readonly CardId[]): string {
  if (cards.length === 0) return '<p class="hint">Ainda não há cartas neste jogo. Aparecem com as jogadas da tua equipa.</p>';
  return `<div class="found">${cards.map(id => `<div class="found-card"><img src="${card(id)}" alt=""><span>${CARDS[id].name}</span></div>`).join('')}</div>`;
}
