import type { Tactics } from '../sim/types.ts';
import { CARDS, type CardId } from '../sim/training.ts';
import { cardImage } from './art/cards.ts';
import { BALANCE as B } from '../sim/balance.ts';
import { FACILITY_IDS, facilityCost, leaguePosition, surplus, type ClubState, type FacilityId, type Objective, type SeasonRecord } from './club.ts';
import { escapeHtml } from './panel.ts';
import { assistantFacilities, presidentObjective, say } from './staff.ts';

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

// Na Taça da Federação, a ronda pedida, com o artigo certo: «chegar aos oitavos», «às meias-finais».
const CUP_TARGETS = ['à pré-eliminatória', 'aos 1/16 de final', 'aos oitavos de final', 'aos quartos de final', 'às meias-finais', 'à final', 'ganhar'];

/** O objetivo numa frase. A letra do jogo não tem o «º», por isso diz-se «nos N primeiros». */
export function objectiveText(objective: Objective): string {
  if (objective.kind === 'federation') return objective.target >= CUP_TARGETS.length - 1 ? 'Ganhar a Taça da Federação' : `Chegar ${CUP_TARGETS[objective.target]} na Taça da Federação`;
  return objective.target === 1 ? 'Acabar a liga em primeiro' : `Acabar a liga nos ${objective.target} primeiros`;
}

const stakesText = (objective: Objective): string => `${objective.confidence}% de confiança e ${objective.money} mil`;

/** O objetivo na direção: o que se pede, o que está em jogo e como vai. */
export function objectiveHtml(club: ClubState): string {
  const objective = club.objective;
  if (!objective) return '<div class="quote">A direção ainda não deu objetivo para esta época. Dá-o no início da próxima.</div>';
  const played = club.rounds.some(round => round.some(f => f.score));
  const now = objective.kind === 'league' && played ? `<div>Agora: lugar ${leaguePosition(club) + 1}</div>` : '';
  return `<div class="objective"><b>Objetivo: ${escapeHtml(objectiveText(objective))}</b><span>Em jogo: ${stakesText(objective)}</span></div>${now}${say('president', ...presidentObjective(objective))}`;
}

/** O objetivo avaliado, para o fim da época. */
export function objectiveResult(record: SeasonRecord): string {
  const o = record.objective;
  if (!o) return '';
  return `<div class="league-line"><span>Objetivo: ${escapeHtml(objectiveText(o))}</span><span class="${o.met ? 'won' : 'lost'}">${o.met ? 'Cumprido' : 'Falhado'} · ${o.met ? '+' : '-'}${o.confidence}% · ${o.met ? '+' : '-'}${o.money} mil</span></div>`;
}

export const FACILITY_INFO: Record<FacilityId, { name: string; effect: (level: number) => string }> = {
  gym: { name: 'Ginásio', effect: level => `O treino com cartas rende mais ${Math.round(level * B.gymTrainingBonus * 100)}%.` },
  medical: { name: 'Departamento médico', effect: level => `Menos ${Math.round(level * B.medicalInjuryCut * 100)}% de lesões${Math.floor(level * B.medicalWeeksPerLevel) > 0 ? `, e cada uma dura menos ${Math.floor(level * B.medicalWeeksPerLevel)} semana` : ''}.` },
  scouts: { name: 'Olheiros', effect: level => `Mais ${level * B.scoutExtraFreeAgents} ${level * B.scoutExtraFreeAgents === 1 ? 'jogador livre' : 'jogadores livres'} no mercado, e melhores.` },
};

/** As instalações: o nível de cada uma, o que faz e o que custa o seguinte. */
export function facilitiesHtml(club: ClubState): string {
  const rows = FACILITY_IDS.map(id => {
    const level = club.facilities[id];
    const cost = facilityCost(club, id);
    const pips = B.facilityCosts.map((_, n) => `<i class="${n < level ? 'on' : ''}"></i>`).join('');
    const effect = level === 0 ? `Ainda não há. Com o primeiro nível: ${FACILITY_INFO[id].effect(1).toLowerCase()}` : FACILITY_INFO[id].effect(level);
    const button = cost === null ? '<small>No máximo</small>' : `<button type="button" data-facility="${id}" ${surplus(club) < cost ? 'disabled' : ''}>Obras · ${cost} mil</button>`;
    return `<div class="facility"><header><b>${FACILITY_INFO[id].name}</b><span class="pips">${pips}</span></header><span>${effect}</span>${button}</div>`;
  }).join('');
  return `<div class="note"><header><b>Instalações</b><span>Sobra ${surplus(club)} mil</span></header><div class="inner">
    ${say('assistant', ...assistantFacilities(club.facilities))}
    ${rows}
    <div class="quote">As obras pagam-se com o que sobra do orçamento. No fim da época, ${Math.round(B.moneyCarryShare * 100)}% do que sobrar passa para a seguinte.</div>
  </div></div>`;
}

/** O livro de recordes e a galeria de lendas: os melhores jogos e épocas do clube, e quem se despediu dele. */
export function recordsHtml(club: ClubState): string {
  const r = club.records;
  const bestSeason = [...club.history].sort((a, b) => b.wins - a.wins)[0];
  const bestScorer = [...club.history].filter(h => h.topScorer).sort((a, b) => b.topScorerPoints - a.topScorerPoints)[0];
  const legends = club.history.flatMap(h => h.farewells ?? []).sort((a, b) => b.points - a.points);
  const row = (label: string, value: string | null): string => `<tr><td>${label}</td><td>${value ?? '—'}</td></tr>`;
  const book = [
    row('Maior vitória', r.biggestWin && `${r.biggestWin.score[0]}-${r.biggestWin.score[1]} ao ${escapeHtml(r.biggestWin.rival)}, época ${r.biggestWin.season}`),
    row('Mais pontos num jogo', r.mostPoints && `${escapeHtml(r.mostPoints.player)}, ${r.mostPoints.points} ao ${escapeHtml(r.mostPoints.rival)}`),
    row('Vitórias seguidas', r.bestStreak && `${r.bestStreak.wins}, na época ${r.bestStreak.season}${r.streak > 0 ? ` (agora ${r.streak})` : ''}`),
    row('Melhor época', bestSeason ? `${bestSeason.wins} vitórias, na época ${bestSeason.season}` : null),
    row('Melhor marcador', bestScorer ? `${escapeHtml(bestScorer.topScorer)}, ${bestScorer.topScorerPoints} pontos na época ${bestScorer.season}` : null),
  ].join('');
  const gallery = legends.length === 0
    ? '<div class="quote">Ainda ninguém se despediu do clube. Quem acabar a carreira aqui fica nesta galeria.</div>'
    : `<table class="mini-table"><tr><th>#</th><th>Lenda</th><th>Épocas</th><th>Jogos</th><th>Pontos</th></tr>${legends.map(l => `<tr><td>${l.shirt ?? ''}</td><td>${escapeHtml(l.player.name)}</td><td>${l.seasons}</td><td>${l.games}</td><td>${l.points}</td></tr>`).join('')}</table>`;
  return `<div class="note"><header><b>Livro de recordes</b><span>Jogos oficiais</span></header><div class="inner">
    <table class="mini-table">${book}</table>
    <div class="section-head plain"><span>Galeria de lendas</span><span>${legends.length}</span></div>
    ${gallery}
  </div></div>`;
}
