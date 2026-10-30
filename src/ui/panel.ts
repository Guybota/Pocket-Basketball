import type { Body, MatchState, TeamLine } from '../sim/match.ts';
import type { CardId } from '../sim/training.ts';
import { gradeOf, type Attributes, type Position } from '../sim/types.ts';
import { BUILD_NAMES } from './art/body.ts';
import { portraitImage } from './art/portrait.ts';
import { faceImage } from './art/sprites.ts';
import { foundCards } from './club-screens.ts';
import { MOVE_INFO, OFF_BALL_INFO, ON_BALL_INFO, clockText, narrate } from './narrate.ts';
import type { MatchView } from './match-view.ts';

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

export type PanelTab = 'bench' | 'stats' | 'feed' | 'cards';

export function energyColor(energy: number): string {
  if (energy > 0.55) return 'var(--good)';
  if (energy > 0.3) return 'var(--gold)';
  return 'var(--bad)';
}

export const crest = (s: MatchState, team: 0 | 1): string =>
  `<span class="crest team-${team}">${escapeHtml(s.teams[team].short)}</span>`;

function periodTable(view: MatchView): string {
  const { s, periodScores } = view;
  const periods = Math.max(4, periodScores[0].length);
  const head = Array.from({ length: periods }, (_, i) => `<span>${i < 4 ? i + 1 : 'P'}</span>`).join('');
  const row = (team: 0 | 1): string => {
    const cells = Array.from({ length: periods }, (_, i) => `<span>${periodScores[team][i] ?? '-'}</span>`).join('');
    return `<span class="team"><i class="dot team-${team}"></i>${escapeHtml(s.teams[team].name)}</span>${cells}<span class="tot">${s.score[team]}</span>`;
  };
  return `<div class="qt" style="--periods:${periods}"><span></span>${head}<span class="tot">T</span>${row(0)}${row(1)}</div>`;
}

function benchTab(view: MatchView): string {
  const { s } = view;
  const carrier = view.carrier();
  const rows = (team: 0 | 1): string => s.court[team].map((b: Body) => {
    const energy = 1 - b.fatigue;
    return `<button type="button" class="row${b === carrier ? ' has-ball' : ''}" data-player="${s.bodies.indexOf(b)}" aria-label="Ver a ficha de ${escapeHtml(b.player.name)}">
      <img class="face team-${team}" alt="" src="${faceImage(view.lookFor(b))}">
      <span class="pos">${b.player.position}</span>
      <span class="name">${escapeHtml(b.player.name)}</span>
      <span class="bar"><i style="width:${Math.round(energy * 100)}%;background:${energyColor(energy)}"></i></span>
      <span class="num">${b.line.points}</span>
    </button>`;
  }).join('');
  const head = (team: 0 | 1): string => `<div class="section-head team-${team}"><span>${escapeHtml(s.teams[team].name)}</span><span>Energia · Pts</span></div>`;
  return `${periodTable(view)}
    ${head(0)}${rows(0)}
    ${head(1)}${rows(1)}
    <div class="section-head plain"><span>Últimas jogadas</span></div>${feedLines(s, 5)}`;
}

const shooting = (made: number, attempts: number): string => `${made}/${attempts}`;

function statsTab(s: MatchState): string {
  const rows: [string, (line: TeamLine) => string | number, (line: TeamLine) => number][] = [
    ['2 pontos', l => shooting(l.twoMade, l.twoAttempts), l => l.twoMade * 2],
    ['3 pontos', l => shooting(l.threeMade, l.threeAttempts), l => l.threeMade * 3],
    ['Lances livres', l => shooting(l.freeThrowsMade, l.freeThrowAttempts), l => l.freeThrowsMade],
    ['Ressaltos', l => l.offensiveRebounds + l.defensiveRebounds, l => l.offensiveRebounds + l.defensiveRebounds],
    ['Assistências', l => l.assists, l => l.assists],
    ['Roubos de bola', l => l.steals, l => l.steals],
    ['Bolas perdidas', l => l.turnovers, l => l.turnovers],
    ['Desarmes', l => l.blocks, l => l.blocks],
    ['Faltas', l => l.fouls, l => l.fouls],
  ];
  const body = rows.map(([label, value, amount]) => {
    const a = amount(s.lines[0]);
    const b = amount(s.lines[1]);
    const share = a + b === 0 ? 50 : Math.round((a / (a + b)) * 100);
    return `<div class="cmp"><span>${value(s.lines[0])}</span><span class="label">${label}</span><span>${value(s.lines[1])}</span></div>
      <div class="split"><i class="team-0" style="width:${share}%"></i><i class="team-1" style="width:${100 - share}%"></i></div>`;
  }).join('');
  return `<div class="cmp head"><span>${crest(s, 0)}</span><span></span><span>${crest(s, 1)}</span></div>${body}`;
}

function feedLines(s: MatchState, count: number): string {
  const lines: string[] = [];
  for (let i = s.events.length - 1; i >= 0 && lines.length < count; i--) {
    const e = s.events[i]!;
    const line = narrate(e, s);
    if (line) lines.push(`<div class="feed team-text-${e.team}"><span>${clockText(e.clock)}</span><span>${escapeHtml(line)}</span></div>`);
  }
  return lines.join('');
}

export const ATTRIBUTE_LABELS: readonly [keyof Attributes, string][] = [
  ['shooting', 'Lançamento'],
  ['speed', 'Velocidade'],
  ['stamina', 'Resistência'],
  ['technique', 'Técnica'],
  ['strength', 'Físico'],
  ['jumping', 'Salto'],
  ['willpower', 'Vontade'],
];
const POSITION_NAMES: Record<Position, string> = { BAS: 'Base', ESC: 'Escolta', EXT: 'Extremo', EXP: 'Extremo-Poste', POS: 'Poste' };

/** A parte da ficha que muda durante o jogo. É a única que se redesenha, para os botões nunca serem substituídos. */
export function playerCardLive(b: Body): string {
  const l = b.line;
  const stats: [string, number][] = [['Pts', l.points], ['Res', l.rebounds], ['Ass', l.assists], ['Rou', l.steals], ['Fal', l.fouls], ['Seg', Math.round(l.secondsPlayed)]];
  const energy = 1 - b.fatigue;
  return `<span class="card-state">${b.slot >= 0 ? 'Em campo' : 'No banco'}</span>
    <span class="card-label">Energia</span>
    <span class="bar"><i style="width:${Math.round(energy * 100)}%;background:${energyColor(energy)}"></i></span>
    <div class="card-stats">${stats.map(([label, value]) => `<span><b>${value}</b>${label}</span>`).join('')}</div>`;
}

/** A ficha de jogador: o retrato grande, as notas e o que fez neste jogo. */
export function playerCard(view: MatchView, b: Body): string {
  const { s } = view;
  const team = b.team;
  const attributes = ATTRIBUTE_LABELS.map(([key, label]) => {
    const value = b.player.attributes[key];
    const grade = gradeOf(value);
    return `<div class="attr"><span>${label}</span><span class="attr-bar"><i class="grade-${grade}" style="width:${value}%"></i></span><b class="grade grade-${grade}">${grade}</b></div>`;
  }).join('');
  const number = s.teams[team].roster.indexOf(b.player) + 4;
  const look = view.lookFor(b);
  const moves = b.player.moves.length > 0
    ? b.player.moves.map(move => `<div class="move"><b>${MOVE_INFO[move].name}</b><span>${MOVE_INFO[move].description}</span></div>`).join('')
    : '<p class="no-moves">Ainda sem movimentos especiais.</p>';
  return `<div class="card" data-card-body="${s.bodies.indexOf(b)}">
    <div class="card-head team-${team}"><span class="shirt">${number}</span><b>${escapeHtml(b.player.name)}</b><span class="card-pos">${POSITION_NAMES[b.player.position]}</span></div>
    <div class="card-body">
      <img class="portrait team-${team}" alt="Retrato de ${escapeHtml(b.player.name)}" src="${portraitImage(view.lookFor(b))}">
      <div class="card-side">
        <span class="card-club">${escapeHtml(s.teams[team].name)}</span>
        <span class="card-body-info">${b.player.heightCm} cm · ${b.player.weightKg} kg · ${BUILD_NAMES[look.build]}</span>
        <div class="card-live" id="cardLive">${playerCardLive(b)}</div>
      </div>
    </div>
    <div class="attrs">${attributes}</div>
    <div class="moves"><span class="moves-title">Com bola</span><div class="move"><b>${ON_BALL_INFO[b.player.onBall].name}</b><span>${ON_BALL_INFO[b.player.onBall].description}</span></div></div>
    <div class="moves"><span class="moves-title">Sem bola</span><div class="move"><b>${OFF_BALL_INFO[b.player.offBall].name}</b><span>${OFF_BALL_INFO[b.player.offBall].description}</span></div></div>
    <div class="moves"><span class="moves-title">Movimentos especiais</span>${moves}</div>
    <div class="card-nav">
      <button type="button" data-card="prev" aria-label="Jogador anterior">‹</button>
      <button type="button" data-card="close">Fechar</button>
      <button type="button" data-card="next" aria-label="Jogador seguinte">›</button>
    </div>
  </div>`;
}

/** Painel de trocas da equipa do jogador. `subOut` é o lugar escolhido para sair. */
export function subsPanel(view: MatchView, subOut: number | null, inTimeout: boolean): string {
  const { s } = view;
  const team = 0 as const;
  const energyBar = (b: Body): string => {
    const energy = 1 - b.fatigue;
    return `<span class="bar"><i style="width:${Math.round(energy * 100)}%;background:${energyColor(energy)}"></i></span>`;
  };
  const row = (b: Body, attribute: string, selected: boolean, disabled: boolean): string => `<button type="button" class="row${selected ? ' has-ball' : ''}" ${attribute} ${disabled ? 'disabled' : ''}>
      <img class="face team-${team}" alt="" src="${faceImage(view.lookFor(b))}">
      <span class="pos">${b.player.position}</span>
      <span class="name">${escapeHtml(b.player.name)}</span>
      ${energyBar(b)}
      <span class="num">${b.line.fouls}F</span>
    </button>`;
  const onCourt = s.court[team].map((b, slot) => row(b, `data-sub-out="${slot}"`, slot === subOut, false)).join('');
  const bench = s.bodies.filter(b => b.team === team && b.slot === -1);
  const pendingIn = new Set(s.pendingSubs.map(sub => sub.incoming));
  const benchRows = bench.map(b => row(b, `data-sub-in="${s.bodies.indexOf(b)}"`, false, subOut === null || b.line.fouls >= 5 || pendingIn.has(b))).join('');
  const pending = s.pendingSubs.filter(sub => sub.team === team).map(sub =>
    `<div class="pending"><span>Entra ${escapeHtml(sub.incoming.player.name)}, sai ${escapeHtml(s.court[team][sub.slot]!.player.name)}</span><button type="button" data-sub-cancel="${sub.slot}" aria-label="Cancelar esta troca">×</button></div>`).join('');
  const hint = subOut === null ? 'Escolhe quem sai.' : 'Agora escolhe quem entra.';
  return `<div class="subs">
    ${inTimeout ? '<div class="subs-title">Desconto de tempo</div>' : ''}
    ${pending ? `<div class="pending-list"><span class="moves-title">Entram na próxima bola parada</span>${pending}</div>` : ''}
    <div class="section-head team-0"><span>Em campo</span><span>Energia · Faltas</span></div>${onCourt}
    <div class="section-head plain"><span>No banco</span><span>${hint}</span></div>${benchRows}
    <button type="button" class="rotation" data-rotation aria-pressed="${s.autoRotation[team]}">Rotação automática: ${s.autoRotation[team] ? 'ligada' : 'desligada'}</button>
    <button type="button" class="primary" data-subs-close>${inTimeout ? 'Continuar jogo' : 'Fechar'}</button>
  </div>`;
}

export function panelContent(view: MatchView, tab: PanelTab, found: readonly CardId[]): string {
  switch (tab) {
    case 'bench': return benchTab(view);
    case 'stats': return statsTab(view.s);
    case 'feed': return feedLines(view.s, 30);
    case 'cards': return foundCards(found);
  }
}

export function resultScreen(view: MatchView, cards: readonly CardId[]): string {
  const { s } = view;
  const winner: 0 | 1 = s.score[0] > s.score[1] ? 0 : 1;
  const top = s.bodies
    .filter(b => b.team === winner)
    .sort((a, b) => b.line.points + b.line.rebounds + b.line.assists - (a.line.points + a.line.rebounds + a.line.assists))[0]!;
  const l = top.line;
  return `<div class="result">
    <div class="final-score">${crest(s, 0)}<b>${s.score[0]}</b><span>-</span><b>${s.score[1]}</b>${crest(s, 1)}</div>
    <div class="winner">Ganha ${escapeHtml(s.teams[winner].name)}</div>
    <div class="section-head plain"><span>Cartas ganhas</span><span>${cards.length}</span></div>
    ${foundCards(cards)}
    ${periodTable(view)}
    <div class="mvp"><img class="face team-${winner}" alt="" src="${faceImage(view.lookFor(top))}"><span>Melhor em campo: ${escapeHtml(top.player.name)}<br>${l.points} pts, ${l.rebounds} res, ${l.assists} ass</span></div>
    ${statsTab(s)}
  </div>`;
}
