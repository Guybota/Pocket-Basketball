import type { Tactics } from '../sim/types.ts';
import { CARDS, type CardId } from '../sim/training.ts';
import { cardImage } from './art/cards.ts';

const card = (id: CardId): string => cardImage(id, CARDS[id].category);

export type TacticValue = number | string;
export const TACTIC_ROWS: readonly { key: keyof Tactics; label: string; fallback: TacticValue; options: readonly [TacticValue, string, string][] }[] = [
  { key: 'pressure', label: 'Pressão', fallback: 0, options: [
    [-1, 'Normal', 'Espera o ataque no seu meio-campo. Menos faltas e menos cansaço.'],
    [0, 'Meio campo', 'Vai buscar o ataque à linha do meio.'],
    [1, 'Campo inteiro', 'Pressiona desde a reposição. Rouba mais, faz mais faltas e cansa mais.'],
  ] },
  { key: 'defense', label: 'Defesa', fallback: 'man', options: [
    ['man', 'Homem a homem', 'Cada um marca o seu, por todo o campo.'],
    ['zone', 'Zona', 'Cada um guarda um sítio: fecha o garrafão, mas deixa mais espaço para lançar de 3.'],
  ] },
  { key: 'spacing', label: 'Ataque', fallback: 0, options: [
    [-1, '2 pontos', 'Ataca o cesto: o poste bloqueia e rola, há mais penetrações e menos lançamentos de 3.'],
    [0, 'Livre', 'Cada um joga pelo seu comportamento, com jogadas à vez.'],
    [1, '3 pontos', 'Abre o campo: bloqueios para os lançadores e mais lançamentos de 3.'],
  ] },
  { key: 'pace', label: 'Ritmo', fallback: 0, options: [
    [-1, 'Lento', 'Menos posses de bola e poupa energia.'],
    [0, 'Normal', 'Sem pressa nem demoras.'],
    [1, 'Rápido', 'Mais posses de bola, mas cansa mais.'],
  ] },
];

/** O valor de uma tática vindo de um botão: as três primeiras são números, as outras nomes. */
export const tacticValue = (key: string, raw: string): TacticValue => (key === 'defense' ? raw : Number(raw));

export function tacticsControls(tactics: Tactics): string {
  return TACTIC_ROWS.map(({ key, label, fallback, options }) => {
    const current = options.find(([value]) => value === (tactics[key] ?? fallback)) ?? options[0]!;
    const buttons = options.map(([value, name]) => `<button type="button" data-tactic="${key}" data-tactic-value="${value}" aria-pressed="${value === (tactics[key] ?? fallback)}">${name}</button>`).join('');
    return `<div class="tactic"><span class="moves-title">${label}</span><div class="tactic-options" role="group" aria-label="${label}">${buttons}</div><span class="tactic-note">${current[2]}</span></div>`;
  }).join('');
}

export function foundCards(cards: readonly CardId[]): string {
  if (cards.length === 0) return '<p class="hint">Ainda não há cartas neste jogo. Aparecem com as jogadas da tua equipa.</p>';
  return `<div class="found">${cards.map(id => `<div class="found-card"><img src="${card(id)}" alt=""><span>${CARDS[id].name}</span></div>`).join('')}</div>`;
}
