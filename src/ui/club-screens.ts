import { ATTRIBUTE_KEYS, gradeOf, type Attributes, type Player, type Tactics } from '../sim/types.ts';
import { CARD_IDS, CARDS, COMBOS, MAX_CARDS_PER_PLAYER, comboFor, previewGains, type CardCategory, type CardId, type Combo } from '../sim/training.ts';
import { CATEGORIES, CATEGORY_INFO, cardImage } from './art/cards.ts';
import { lookOf, faceImage } from './art/sprites.ts';
import { cardsLeft, runTraining, type ClubState, type TrainingPlan, type TrainingReport } from './club.ts';
import type { Sound } from './match-view.ts';
import { MOVE_INFO, OFF_BALL_INFO, ON_BALL_INFO } from './narrate.ts';
import { ATTRIBUTE_LABELS, energyColor, escapeHtml } from './panel.ts';

const card = (id: CardId): string => cardImage(id, CARDS[id].category);
const tile = (id: CardId | null): string => `<i class="tile"${id ? ` style="background:${CATEGORY_INFO[CARDS[id].category].color}"` : ''}></i>`;
const face = (player: Player): string => `<img class="face team-0" alt="" src="${faceImage(lookOf(player, 'blue'))}">`;
const signed = (value: number): string => `${value > 0 ? '+' : ''}${value.toFixed(1).replace('.', ',')}`;
const attributeName = (key: keyof Attributes): string => ATTRIBUTE_LABELS.find(([k]) => k === key)![1];

function gainsText(gains: Partial<Record<string, number>>): string {
  const parts = ATTRIBUTE_KEYS.filter(key => gains[key]).map(key => `${signed(gains[key]!)} ${attributeName(key)}`);
  return parts.join(', ') || 'Sem ganhos';
}

/** O que o combo ensina, além de subir atributos. */
function comboEffect(combo: Combo): string {
  if (combo.move) return `Aprende ${MOVE_INFO[combo.move].name}`;
  if (combo.offBall) return `Sem bola: ${OFF_BALL_INFO[combo.offBall].name}`;
  if (combo.onBall) return `Com bola: ${ON_BALL_INFO[combo.onBall].name}`;
  return gainsText(combo.gains);
}

function energyBar(player: Player): string {
  const energy = 1 - player.fatigue;
  return `<span class="bar"><i style="width:${Math.round(energy * 100)}%;background:${energyColor(energy)}"></i></span>`;
}

function rosterList(club: ClubState, plan: TrainingPlan): string {
  const free = CARD_IDS.reduce((sum, id) => sum + Math.max(0, cardsLeft(club, plan, id)), 0);
  const rows = club.team.roster.map((player, index) => {
    const cards = plan[index] ?? [];
    const tiles = Array.from({ length: MAX_CARDS_PER_PLAYER }, (_, i) => tile(cards[i] ?? null)).join('');
    return `<button type="button" class="train-row" data-train-player="${index}">
      ${face(player)}
      <span class="pos">${player.position}</span>
      <span class="name">${escapeHtml(player.name)}</span>
      ${energyBar(player)}
      <span class="tiles">${tiles}</span>
    </button>`;
  }).join('');
  const used = Object.values(plan).some(cards => (cards?.length ?? 0) > 0);
  return `<div class="train-title"><b>Treino da semana ${club.week}</b><span>${free} ${free === 1 ? 'carta livre' : 'cartas livres'}</span></div>
    <div class="content">
      <div class="section-head team-0"><span>Escolhe um jogador</span><span>Energia · Cartas</span></div>
      ${rows}
    </div>
    <div class="train-actions">
      <button type="button" data-train-back>Voltar</button>
      <button type="button" data-train-combos>Combos ${club.knownCombos.length}/${COMBOS.length}</button>
      <button type="button" class="primary" id="trainGo" ${used ? '' : 'disabled'}>Treinar</button>
    </div>`;
}

function playerScreen(club: ClubState, plan: TrainingPlan, index: number, category: CardCategory): string {
  const player = club.team.roster[index]!;
  const cards = plan[index] ?? [];
  const preview = previewGains(player, cards, club.knownCombos);
  const attributes = ATTRIBUTE_LABELS.map(([key, label]) => {
    const value = player.attributes[key];
    const grade = gradeOf(value);
    const gain = preview[key];
    return `<div class="attr with-gain"><span>${label}</span><span class="attr-bar"><i class="grade-${grade}" style="width:${value}%"></i></span><span class="gain${gain && gain < 0 ? ' down' : ''}">${gain ? signed(gain) : ''}</span><b class="grade grade-${grade}">${grade}</b></div>`;
  }).join('');
  const slots = Array.from({ length: MAX_CARDS_PER_PLAYER }, (_, i) => {
    const id = cards[i];
    return id
      ? `<button type="button" class="slot" data-remove="${id}" aria-label="Tirar ${CARDS[id].name}"><img src="${card(id)}" alt=""><span>${CARDS[id].name}</span></button>`
      : '<div class="slot empty"><span>Vazio</span></div>';
  }).join('');
  const combo = comboFor(cards);
  const known = combo && club.knownCombos.includes(combo.id);
  const tabs = CATEGORIES.map(c => {
    const count = CARD_IDS.filter(id => CARDS[id].category === c).reduce((sum, id) => sum + Math.max(0, cardsLeft(club, plan, id)), 0);
    return `<button type="button" role="tab" data-category="${c}" aria-selected="${c === category}" style="--cat:${CATEGORY_INFO[c].color}">${CATEGORY_INFO[c].name} ${count}</button>`;
  }).join('');
  const owned = CARD_IDS.filter(id => CARDS[id].category === category && ((club.cards[id] ?? 0) > 0));
  const hand = owned.map(id => {
    const left = cardsLeft(club, plan, id);
    const blocked = left <= 0 || cards.includes(id) || cards.length >= MAX_CARDS_PER_PLAYER;
    return `<button type="button" class="hand-card" data-hand="${id}" ${blocked ? 'disabled' : ''}><img src="${card(id)}" alt=""><span>${CARDS[id].name}</span><b>×${Math.max(0, left)}</b></button>`;
  }).join('');
  return `<div class="train-title team-0">
      <button type="button" class="nav" data-step="-1" aria-label="Jogador anterior">‹</button>
      ${face(player)}
      <b>${escapeHtml(player.name)}</b>
      <span>Potencial ${gradeOf(player.potential)}</span>
      <button type="button" class="nav" data-step="1" aria-label="Jogador seguinte">›</button>
    </div>
    <div class="content">
      <div class="attrs">${attributes}</div>
      <div class="style-line">Energia ${energyBar(player)}</div>
      <div class="style-line">Com bola: ${ON_BALL_INFO[player.onBall].name} · Sem bola: ${OFF_BALL_INFO[player.offBall].name}</div>
      <div class="style-line">Movimentos: ${player.moves.map(move => MOVE_INFO[move].name).join(', ') || 'nenhum'}</div>
      <div class="slots">${slots}</div>
      ${known ? `<div class="combo-known"><b>${combo.name}</b><span>${comboEffect(combo)}</span></div>` : ''}
      <div class="cat-tabs" role="tablist">${tabs}</div>
      ${hand ? `<div class="hand">${hand}</div>` : '<p class="hint">Ainda não tens cartas destas. Ganham-se nos jogos.</p>'}
    </div>
    <div class="train-actions">
      <button type="button" class="primary" data-train-list>Feito</button>
    </div>`;
}

function comboList(club: ClubState): string {
  const rows = COMBOS.map(combo => {
    if (club.knownCombos.includes(combo.id)) {
      return `<div class="combo-row known"><b>${combo.name}</b><span class="tiles">${combo.cards.map(tile).join('')}</span><span>${combo.cards.map(id => CARDS[id].name).join(' + ')}</span><span>${comboEffect(combo)}</span></div>`;
    }
    const hint = combo.cards.map(id => CATEGORY_INFO[CARDS[id].category].name).join(' + ');
    return `<div class="combo-row"><b>???</b><span class="tiles">${combo.cards.map(tile).join('')}</span><span>${hint}</span></div>`;
  }).join('');
  return `<div class="train-title"><b>Combos</b><span>${club.knownCombos.length} de ${COMBOS.length} descobertos</span></div>
    <div class="content">${rows}</div>
    <div class="train-actions"><button type="button" class="primary" data-train-list>Voltar</button></div>`;
}

function reportScreen(club: ClubState, reports: readonly TrainingReport[]): string {
  const heroes = reports.filter(report => report.isNewCombo).map(report => {
    const combo = report.combo!;
    return `<div class="combo-hero">
      <span class="combo-kicker">Combo especial!</span>
      <b class="combo-name">${combo.name}</b>
      <div class="combo-cards">${combo.cards.map(id => `<img src="${card(id)}" alt="${CARDS[id].name}">`).join('')}</div>
      <div class="combo-who">${face(club.team.roster[report.playerIndex]!)}<span>${escapeHtml(report.name)}</span></div>
      <span class="combo-effect">${comboEffect(combo)}</span>
    </div>`;
  }).join('');
  const rows = reports.map(report => {
    const learned = report.newMove ? ` · Aprendeu ${MOVE_INFO[report.newMove].name}` : '';
    const blocked = report.moveBlocked ? ' · Já sabe 2 movimentos: não aprendeu mais nenhum' : '';
    const repeated = report.combo && !report.isNewCombo ? `${report.combo.name}: ` : '';
    return `<div class="report-row">${face(club.team.roster[report.playerIndex]!)}<b>${escapeHtml(report.name)}</b><span>${repeated}${gainsText(report.gains)}${learned}${blocked}</span></div>`;
  }).join('');
  return `<div class="train-title"><b>Treino feito</b><span>Os outros treinaram sozinhos</span></div>
    <div class="content">${heroes}${rows}</div>
    <div class="train-actions"><button type="button" class="primary" data-train-back>Voltar ao clube</button></div>`;
}

export interface TrainingHost {
  panel: HTMLElement;
  club(): ClubState;
  setClub(club: ClubState): void;
  back(): void;
  sound(name: Sound): void;
}

/** O ecrã de treino guarda só as escolhas por confirmar. O clube muda ao carregar em Treinar. */
export function openTraining(host: TrainingHost): void {
  const plan: TrainingPlan = {};
  let screen: 'list' | 'player' | 'combos' | 'report' = 'list';
  let index = 0;
  let category: CardCategory = 'technique';
  let reports: TrainingReport[] = [];

  const render = (keepScroll: boolean): void => {
    const club = host.club();
    const scroll = host.panel.querySelector('.content')?.scrollTop ?? 0;
    const html = screen === 'list' ? rosterList(club, plan)
      : screen === 'player' ? playerScreen(club, plan, index, category)
      : screen === 'combos' ? comboList(club)
      : reportScreen(club, reports);
    host.panel.innerHTML = `<div class="train">${html}</div>`;
    const content = host.panel.querySelector('.content');
    if (content && keepScroll) content.scrollTop = scroll;
    host.panel.querySelector('.train')!.addEventListener('click', onClick);
  };

  const onClick = (event: Event): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('button');
    if (!target || (target as HTMLButtonElement).disabled) return;
    const data = target.dataset;
    if (data.trainBack !== undefined) {
      host.back();
      return;
    }
    if (data.trainList !== undefined) {
      screen = 'list';
      render(false);
    } else if (data.trainCombos !== undefined) {
      screen = 'combos';
      render(false);
    } else if (data.trainPlayer !== undefined) {
      index = Number(data.trainPlayer);
      screen = 'player';
      render(false);
    } else if (data.step !== undefined) {
      const size = host.club().team.roster.length;
      index = (index + Number(data.step) + size) % size;
      render(false);
    } else if (data.category !== undefined) {
      category = data.category as CardCategory;
      render(true);
    } else if (data.hand !== undefined) {
      plan[index] = [...(plan[index] ?? []), data.hand as CardId];
      render(true);
    } else if (data.remove !== undefined) {
      plan[index] = (plan[index] ?? []).filter(id => id !== data.remove);
      render(true);
    } else if (target.id === 'trainGo') {
      const result = runTraining(host.club(), plan);
      host.setClub(result.club);
      reports = result.reports;
      host.sound(reports.some(report => report.isNewCombo) ? 'bigCheer' : 'cheer');
      screen = 'report';
      render(false);
    }
  };
  render(false);
}

const TACTIC_ROWS: readonly { key: keyof Tactics; label: string; options: readonly [number, string, string][] }[] = [
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
