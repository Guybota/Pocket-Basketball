import { between, chance, makeRng, next, type Rng } from './rng.ts';
import type { MatchEvent, TeamIndex } from './match.ts';
import { ATTRIBUTE_KEYS, type Attributes, type MoveId, type OffBallStyle, type OnBallStyle, type Player } from './types.ts';

// As cartas e os combos são dados: acrescentar um não obriga a mexer no código.
export type CardCategory = 'tactic' | 'technique' | 'physical' | 'support';
type Gains = Partial<Attributes>;

interface CardData {
  name: string;
  category: CardCategory;
  gains: Gains;
}

export const CARDS = {
  readDefense: { name: 'Ler a Defesa', category: 'tactic', gains: { willpower: 2, technique: 1 } },
  pickRoll: { name: 'Pick & Roll', category: 'tactic', gains: { technique: 1, strength: 1 } },
  whiteboard: { name: 'Quadro Tático', category: 'tactic', gains: { willpower: 2 } },
  video: { name: 'Ver Vídeo', category: 'tactic', gains: { willpower: 1, shooting: 1 } },
  transition: { name: 'Transição', category: 'tactic', gains: { speed: 2, stamina: 1 } },
  shooting: { name: 'Lançamento', category: 'technique', gains: { shooting: 3 } },
  dribble: { name: 'Drible', category: 'technique', gains: { technique: 2, speed: 1 } },
  bouncePass: { name: 'Passe Picado', category: 'technique', gains: { technique: 3 } },
  freeThrows: { name: 'Lances Livres', category: 'technique', gains: { shooting: 2, willpower: 1 } },
  hookShot: { name: 'Gancho', category: 'technique', gains: { shooting: 1, strength: 1, jumping: 1 } },
  sprints: { name: 'Sprints', category: 'physical', gains: { speed: 3 } },
  weights: { name: 'Pesos', category: 'physical', gains: { strength: 3 } },
  jumps: { name: 'Saltos', category: 'physical', gains: { jumping: 3 } },
  longRun: { name: 'Corrida Longa', category: 'physical', gains: { stamina: 3 } },
  agility: { name: 'Escada de Agilidade', category: 'physical', gains: { speed: 2, technique: 1 } },
  soup: { name: 'Sopa da Avó', category: 'support', gains: { stamina: 1, strength: 1 } },
  nap: { name: 'Sesta', category: 'support', gains: { willpower: 1 } },
  massage: { name: 'Massagem', category: 'support', gains: { strength: 1 } },
  dance: { name: 'Bailarico', category: 'support', gains: { stamina: 1, speed: 1 } },
  fado: { name: 'Noite de Fado', category: 'support', gains: { willpower: 3 } },
} as const satisfies Record<string, CardData>;

export type CardId = keyof typeof CARDS;
export const CARD_IDS = Object.keys(CARDS) as CardId[];

export interface Combo {
  id: string;
  name: string;
  cards: readonly CardId[];
  gains: Gains;
  move?: MoveId;
  offBall?: OffBallStyle;
  onBall?: OnBallStyle;
}

export const COMBOS: readonly Combo[] = [
  // Movimentos especiais
  { id: 'brokenAnkles', name: 'Tornozelos Partidos', cards: ['dribble', 'sprints', 'readDefense'], gains: { technique: 6, speed: 4 }, move: 'crossover' },
  { id: 'stepBack', name: 'Passo Atrás', cards: ['shooting', 'dribble', 'dance'], gains: { shooting: 6, technique: 3 }, move: 'stepBack' },
  { id: 'skyPass', name: 'Passe ao Céu', cards: ['bouncePass', 'jumps', 'pickRoll'], gains: { technique: 5, jumping: 4 }, move: 'alleyOop' },
  { id: 'rimDanger', name: 'Aro em Perigo', cards: ['weights', 'jumps', 'soup'], gains: { strength: 6, jumping: 6 }, move: 'powerDunk' },
  { id: 'lightHands', name: 'Mãos Leves', cards: ['sprints', 'readDefense', 'nap'], gains: { speed: 4, technique: 4 }, move: 'pickpocket' },
  // Comportamentos sem bola
  { id: 'sharpAim', name: 'Mira Afinada', cards: ['shooting', 'readDefense', 'nap'], gains: { shooting: 8 }, offBall: 'spotUp' },
  { id: 'backDoor', name: 'Porta de Trás', cards: ['sprints', 'bouncePass', 'readDefense'], gains: { speed: 5, technique: 3 }, offBall: 'cutter' },
  { id: 'paintOwner', name: 'Dono da Área', cards: ['weights', 'jumps', 'pickRoll'], gains: { strength: 6, jumping: 3 }, offBall: 'lowPost' },
  { id: 'boardHunter', name: 'Caça-Ressaltos', cards: ['jumps', 'sprints', 'weights'], gains: { jumping: 6, strength: 4 }, offBall: 'crasher' },
  { id: 'runAway', name: 'Fuga para a Frente', cards: ['sprints', 'dance', 'bouncePass'], gains: { speed: 8 }, offBall: 'leaker' },
  { id: 'humanWall', name: 'Parede Humana', cards: ['pickRoll', 'weights', 'readDefense'], gains: { strength: 8 }, offBall: 'screener' },
  { id: 'stickyGuard', name: 'Cola Tudo', cards: ['readDefense', 'sprints', 'massage'], gains: { speed: 3, willpower: 5 }, offBall: 'shadow' },
  // Comportamentos com bola
  { id: 'maestro', name: 'Maestro', cards: ['bouncePass', 'readDefense', 'pickRoll'], gains: { technique: 8 }, onBall: 'playmaker' },
  { id: 'justMe', name: 'Só Eu', cards: ['dribble', 'shooting', 'soup'], gains: { shooting: 5, technique: 3 }, onBall: 'scorer' },
  { id: 'tearDefense', name: 'Rasgar a Defesa', cards: ['dribble', 'sprints', 'weights'], gains: { speed: 5, strength: 3 }, onBall: 'slasher' },
  { id: 'hotHand', name: 'Mão Quente', cards: ['shooting', 'freeThrows', 'nap'], gains: { shooting: 9 }, onBall: 'shooter' },
  { id: 'backToAll', name: 'De Costas Para Todos', cards: ['weights', 'bouncePass', 'jumps'], gains: { strength: 5, technique: 3 }, onBall: 'postUp' },
  // Só atributos
  { id: 'springLegs', name: 'Perna de Mola', cards: ['jumps', 'longRun'], gains: { jumping: 4, stamina: 4 } },
  { id: 'steelLungs', name: 'Pulmões de Aço', cards: ['longRun', 'sprints'], gains: { stamina: 6, speed: 2 } },
  { id: 'perfectSunday', name: 'Domingo Perfeito', cards: ['soup', 'nap', 'massage'], gains: { willpower: 8, strength: 4, stamina: 3, speed: -1 } },
  { id: 'lazyWeekend', name: 'Fim de Semana', cards: ['massage', 'nap'], gains: { willpower: 3, stamina: 3 } },
  { id: 'goldenVoice', name: 'Voz de Ouro', cards: ['fado', 'dance'], gains: { willpower: 7 } },
  { id: 'coldBlood', name: 'Sangue Frio', cards: ['freeThrows', 'fado'], gains: { shooting: 3, willpower: 6 } },
  { id: 'keenEye', name: 'Olho Clínico', cards: ['video', 'shooting'], gains: { shooting: 5 } },
  { id: 'courtVision', name: 'Visão de Jogo', cards: ['video', 'whiteboard'], gains: { technique: 4, willpower: 4 } },
  { id: 'counterPunch', name: 'Contragolpe', cards: ['transition', 'sprints'], gains: { speed: 6 } },
  { id: 'fullGym', name: 'Ginásio Completo', cards: ['weights', 'longRun', 'agility'], gains: { strength: 4, stamina: 4, speed: 3 } },
  { id: 'dancer', name: 'Bailarino', cards: ['agility', 'dance'], gains: { speed: 4, technique: 3 } },
  { id: 'deadlyHook', name: 'Gancho Mortal', cards: ['hookShot', 'jumps'], gains: { shooting: 3, jumping: 4 } },
  { id: 'overtraining', name: 'Excesso de Treino', cards: ['weights', 'sprints', 'longRun'], gains: { strength: 6, speed: 5, stamina: -3, willpower: -2 } },
];

export const MAX_CARDS_PER_PLAYER = 3;
export const MAX_MOVES_PER_PLAYER = 2;
const FATIGUE_BY_CATEGORY: Record<CardCategory, number> = { tactic: 0.03, technique: 0.05, physical: 0.08, support: -0.1 };
const ATTRIBUTE_MAX = 99;
const ATTRIBUTE_MIN = 1;

/** Quanto mais potencial, mais o treino rende: de 60% a 140%. Um jogador cansado aproveita menos. */
export function trainingFactor(potential: number, fatigue: number): number {
  return (0.6 + (potential / 100) * 0.8) * (1 - fatigue * 0.5);
}

/** O maior combo contido nas cartas escolhidas. Só conta um por semana. */
export function comboFor(cards: readonly CardId[]): Combo | null {
  let best: Combo | null = null;
  for (const combo of COMBOS) {
    if (combo.cards.every(card => cards.includes(card)) && (!best || combo.cards.length > best.cards.length)) best = combo;
  }
  return best;
}

export interface TrainingResult {
  player: Player;
  gains: Gains;
  combo: Combo | null;
  newMove: MoveId | null;
  /** Havia um movimento para aprender, mas o jogador já está no limite. */
  moveBlocked: boolean;
}

/** Aplica as cartas de uma semana a um jogador. Não altera o jogador recebido. */
export function trainPlayer(player: Player, cards: readonly CardId[]): TrainingResult {
  if (cards.length > MAX_CARDS_PER_PLAYER) throw new Error(`${player.name}: máximo de ${MAX_CARDS_PER_PLAYER} cartas por semana`);
  if (new Set(cards).size !== cards.length) throw new Error(`${player.name}: as cartas têm de ser diferentes`);
  const factor = trainingFactor(player.potential, player.fatigue);
  const combo = comboFor(cards);
  const raw: Gains = {};
  const add = (gains: Gains): void => {
    for (const key of ATTRIBUTE_KEYS) raw[key] = (raw[key] ?? 0) + (gains[key] ?? 0);
  };
  for (const card of cards) add(CARDS[card].gains);
  if (combo) add(combo.gains);

  const attributes = { ...player.attributes };
  const gains: Gains = {};
  for (const key of ATTRIBUTE_KEYS) {
    const value = raw[key] ?? 0;
    if (value === 0) continue;
    // Um combo mau tira sempre o mesmo: o potencial não torna o erro pior.
    const scaled = value > 0 ? value * factor : value;
    const updated = Math.max(ATTRIBUTE_MIN, Math.min(ATTRIBUTE_MAX, Math.round((attributes[key] + scaled) * 10) / 10));
    gains[key] = Math.round((updated - attributes[key]) * 10) / 10;
    attributes[key] = updated;
  }

  const moves = [...player.moves];
  let newMove: MoveId | null = null;
  let moveBlocked = false;
  if (combo?.move && !moves.includes(combo.move)) {
    if (moves.length < MAX_MOVES_PER_PLAYER) {
      moves.push(combo.move);
      newMove = combo.move;
    } else {
      moveBlocked = true;
    }
  }
  let fatigue = player.fatigue;
  for (const card of cards) fatigue += FATIGUE_BY_CATEGORY[CARDS[card].category];
  return {
    player: {
      ...player,
      attributes,
      moves,
      offBall: combo?.offBall ?? player.offBall,
      onBall: combo?.onBall ?? player.onBall,
      fatigue: Math.max(0, Math.min(1, fatigue)),
    },
    gains,
    combo,
    newMove,
    moveBlocked,
  };
}

/** O que se mostra antes de treinar. Um combo por descobrir não conta, para não se revelar antes de tempo. */
export function previewGains(player: Player, cards: readonly CardId[], knownCombos: readonly string[]): Gains {
  const combo = comboFor(cards);
  if (combo && knownCombos.includes(combo.id)) return trainPlayer(player, cards).gains;
  const factor = trainingFactor(player.potential, player.fatigue);
  const gains: Gains = {};
  for (const card of cards) {
    for (const key of ATTRIBUTE_KEYS) {
      const value = (CARDS[card].gains as Gains)[key];
      if (value) gains[key] = Math.round(((gains[key] ?? 0) + value * factor) * 10) / 10;
    }
  }
  return gains;
}

/** Sem cartas, o jogador treina por conta própria: pouco, e em algo ao acaso. */
export function independentPractice(player: Player, rng: Rng): Player {
  if (!chance(rng, 0.5)) return player;
  const key = ATTRIBUTE_KEYS[Math.floor(next(rng) * ATTRIBUTE_KEYS.length)]!;
  const value = Math.round((player.attributes[key] + between(rng, 0.2, 1) * trainingFactor(player.potential, player.fatigue)) * 10) / 10;
  return { ...player, attributes: { ...player.attributes, [key]: Math.min(ATTRIBUTE_MAX, value) } };
}

// Que carta pode aparecer em cada acontecimento do jogo, e com que probabilidade.
const DROPS: Partial<Record<MatchEvent['type'], readonly (readonly [CardId, number])[]>> = {
  made: [['shooting', 0.05], ['hookShot', 0.03], ['bouncePass', 0.03]],
  rebound: [['jumps', 0.02], ['weights', 0.02], ['longRun', 0.01]],
  steal: [['readDefense', 0.2], ['sprints', 0.1]],
  block: [['jumps', 0.25], ['weights', 0.1]],
  freeThrowMade: [['freeThrows', 0.08]],
  move: [['pickRoll', 0.2], ['dribble', 0.2], ['agility', 0.1]],
  foul: [['massage', 0.05], ['whiteboard', 0.04]],
  timeout: [['whiteboard', 0.4], ['video', 0.3]],
  substitution: [['nap', 0.03], ['soup', 0.02], ['agility', 0.01]],
  period: [['video', 0.15], ['transition', 0.15], ['dance', 0.1], ['fado', 0.08]],
};
export const MAX_CARDS_PER_MATCH = 9;

/** A carta encontrada num acontecimento da equipa, se alguma. Usa um gerador próprio, por isso não muda o jogo. */
export function cardFromEvent(e: MatchEvent, team: TeamIndex, rng: Rng): CardId | null {
  if (e.team !== team && e.type !== 'period') return null;
  for (const [card, probability] of DROPS[e.type] ?? []) {
    if (chance(rng, probability)) return card;
  }
  return null;
}

/** Mesmo a perder se ganham cartas: a derrota dá uma, a vitória duas. */
export function endOfMatchCards(won: boolean, seed: number): CardId[] {
  const rng = makeRng(seed ^ 0x2f6e2b1);
  const count = won ? 2 : 1;
  return Array.from({ length: count }, () => CARD_IDS[Math.floor(next(rng) * CARD_IDS.length)]!);
}
