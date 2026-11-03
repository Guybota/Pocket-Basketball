import type { Body, MatchState, TeamLine } from '../sim/match.ts';
import type { CardId } from '../sim/training.ts';
import { ATTRIBUTE_KEYS, gradeOf, type Attributes, type Player } from '../sim/types.ts';
import { clubIdentity } from './art/identity.ts';
import { emblemImage } from './art/kit.ts';
import { portraitImage } from './art/portrait.ts';
import { attributeIcon } from './art/icons.ts';
import { faceImage, spriteImage, type Look } from './art/sprites.ts';
import { SPOTS } from '../sim/court.ts';
import { foundCards } from './club-screens.ts';
import { MOVE_INFO, OFF_BALL_INFO, ON_BALL_INFO, clockText, narrate } from './narrate.ts';
import type { MatchView } from './match-view.ts';
import { PLAYER_CLUB, liveTable, scoreAt, type ClubState, type OtherGame } from './club.ts';

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

export type PanelTab = 'bench' | 'stats' | 'feed' | 'cards' | 'league';

/** O que se passa à volta: o clube e os outros jogos da jornada, para a aba da liga. */
export interface LiveLeague {
  club: ClubState;
  others: OtherGame[];
}

/** Altura e peso de 1 a 3 estrelas, pelos terços dos jogadores gerados: até 192 cm e 87 kg é uma estrela, a partir de 203 cm e 105 kg são três. */
export const heightStars = (cm: number): number => (cm < 193 ? 1 : cm < 203 ? 2 : 3);
const stars = (count: number, label: string): string => `<span class="stars" title="${label}" aria-label="${label} ${count} de 3">${[1, 2, 3].map(n => `<i class="${n <= count ? 'on' : ''}"></i>`).join('')}</span>`;
export const bodyStars = (p: Player): string => `<span class="body-stars"><span>Alt.</span>${stars(heightStars(p.heightCm), 'Altura')}</span>`;

export function energyColor(energy: number): string {
  if (energy > 0.55) return 'var(--good)';
  if (energy > 0.3) return 'var(--gold)';
  return 'var(--bad)';
}

/** O emblema de uma equipa do jogo: o do nosso clube, se a vista o souber, ou o fixo do clube. */
export const crest = (view: MatchView, team: 0 | 1, size = 24): string =>
  `<img class="emblem" alt="Emblema do ${escapeHtml(view.s.teams[team].name)}" style="width:${size}px;height:${size}px" src="${emblemImage((team === 0 ? view.ownEmblem : undefined) ?? clubIdentity(view.s.teams[team].name).emblem)}">`;

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

// As barras de energia andam em saltos de 5 %: assim o painel não muda, nem se reescreve, a cada segundo.
function benchTab(view: MatchView): string {
  const { s } = view;
  const carrier = view.carrier();
  const rows = (team: 0 | 1): string => s.court[team].map((b: Body) => {
    const energy = 1 - b.fatigue;
    return `<button type="button" class="row${b === carrier ? ' has-ball' : ''}" data-player="${s.bodies.indexOf(b)}" aria-label="Ver a ficha de ${escapeHtml(b.player.name)}">
      <img class="face team-${team}" alt="" src="${faceImage(view.lookFor(b))}">
      <span class="pos">${slotCode(b.slot)}</span>
      <span class="name">${escapeHtml(b.player.name)}</span>
      <span class="bar"><i style="width:${Math.round(energy * 20) * 5}%;background:${energyColor(energy)}"></i></span>
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

function statsTab(view: MatchView): string {
  const { s } = view;
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
  // Os números de cada jogador que entrou em campo, por equipa.
  const playerRows = (team: 0 | 1): string => `<div class="pstat head"><span class="name">${escapeHtml(s.teams[team].name)}</span><span>Pts</span><span>Res</span><span>Ass</span><span>Rou</span><span>Blq</span><span>Fal</span><span>Min</span></div>${s.bodies
    .filter(b => b.team === team && b.line.secondsPlayed > 0)
    .map(b => `<div class="pstat"><span class="name">${escapeHtml(b.player.name)}</span><span>${b.line.points}</span><span>${b.line.rebounds}</span><span>${b.line.assists}</span><span>${b.line.steals}</span><span>${b.line.blocks}</span><span>${b.line.fouls}</span><span>${minutesText(b.line.secondsPlayed)}</span></div>`)
    .join('')}`;
  return `<div class="cmp head"><span>${crest(view, 0)}</span><span></span><span>${crest(view, 1)}</span></div>${body}${playerRows(0)}${playerRows(1)}`;
}

const minutesText = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(Math.round(seconds) % 60).padStart(2, '0')}`;

/** A aba da liga: os outros jogos da jornada no mesmo ponto do relógio, e a classificação como vai neste momento. */
function leagueTab(view: MatchView, live: LiveLeague | null): string {
  if (!live) return '<p class="hint">Os outros jogos só se veem nas semanas de jornada ou de taça.</p>';
  const { s } = view;
  const { club, others } = live;
  const short = (id: number): string => escapeHtml(club.clubs[id]!.short);
  const games = others.map(o => {
    const [a, b] = scoreAt(o.s, s.period, s.clock);
    return `<div class="lgame"><span>${short(o.home)}</span><b>${a} - ${b}</b><span>${short(o.away)}</span></div>`;
  }).join('');
  const table = liveTable(club, s, others, s.period, s.clock);
  const rows = table?.map((row, i) => {
    const diff = row.pointsFor - row.pointsAgainst;
    return `<div class="lrow${row.club === PLAYER_CLUB ? ' mine' : ''}"><span>${i + 1}</span><span class="name">${short(row.club)}</span><span>${row.played}</span><span>${row.wins}</span><span>${row.losses}</span><span>${diff > 0 ? '+' : ''}${diff}</span></div>`;
  }).join('') ?? '';
  return `<div class="section-head plain"><span>Outros jogos</span><span>Ao mesmo tempo do nosso</span></div>${games || '<p class="hint">Não há outros jogos a decorrer.</p>'}
    ${table ? `<div class="section-head plain"><span>Classificação ao vivo</span></div><div class="lrow head"><span>#</span><span class="name"></span><span>J</span><span>V</span><span>D</span><span>Dif</span></div>${rows}` : ''}`;
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
/** Os cinco lugares em campo têm papéis fixos; qualquer jogador pode ocupar qualquer lugar, e cabe ao treinador escolher pelas notas. */
export const SLOT_CODES = ['BAS', 'ESC', 'EXT', 'EXP', 'POS'] as const;
export const SLOT_NAMES = ['Base', 'Escolta', 'Extremo', 'Extremo-Poste', 'Poste'] as const;
export const slotCode = (slot: number): string => SLOT_CODES[slot] ?? 'SUP';

/** A parte da ficha que muda durante o jogo. É a única que se redesenha, para os botões nunca serem substituídos. */
export function playerCardLive(b: Body): string {
  const l = b.line;
  const stats: [string, number][] = [['Pts', l.points], ['Res', l.rebounds], ['Ass', l.assists], ['Rou', l.steals], ['Fal', l.fouls], ['Seg', Math.round(l.secondsPlayed)]];
  const energy = 1 - b.fatigue;
  return `<span class="card-state">${b.slot >= 0 ? 'Em campo' : 'No banco'}</span>
    <span class="card-label">Energia</span>
    <span class="bar"><i style="width:${Math.round(energy * 20) * 5}%;background:${energyColor(energy)}"></i></span>
    <div class="card-stats">${stats.map(([label, value]) => `<span><b>${value}</b>${label}</span>`).join('')}</div>`;
}

/** O que não muda durante um jogo: retrato, medidas, notas e o que o jogador sabe fazer. */
export function playerSheet(player: Player, look: Look, team: 0 | 1, number: number, clubName: string, side: string, role: string): string {
  const attributes = ATTRIBUTE_LABELS.map(([key, label]) => {
    const value = player.attributes[key];
    const grade = gradeOf(value);
    return `<div class="attr"><span>${label}</span><span class="attr-bar"><i class="grade-${grade}" style="width:${value}%"></i></span><b class="grade grade-${grade}">${grade}</b></div>`;
  }).join('');
  const moves = player.moves.length > 0
    ? player.moves.map(move => `<div class="move"><b>${MOVE_INFO[move].name}</b><span>${MOVE_INFO[move].description}</span></div>`).join('')
    : '<p class="no-moves">Ainda sem movimentos especiais.</p>';
  return `<div class="card-head team-${team}"><span class="shirt">${number}</span><b>${escapeHtml(player.name)}</b><span class="card-pos">${escapeHtml(role)}</span></div>
    <div class="card-body">
      <img class="portrait team-${team}" alt="Retrato de ${escapeHtml(player.name)}" src="${portraitImage(look)}">
      <div class="card-side">
        <span class="card-club">${escapeHtml(clubName)}</span>
        <span class="card-body-info">${bodyStars(player)}</span>
        ${side}
      </div>
    </div>
    <div class="attrs">${attributes}</div>
    <div class="moves"><span class="moves-title">Com bola</span><div class="move"><b>${ON_BALL_INFO[player.onBall].name}</b><span>${ON_BALL_INFO[player.onBall].description}</span></div></div>
    <div class="moves"><span class="moves-title">Sem bola</span><div class="move"><b>${OFF_BALL_INFO[player.offBall].name}</b><span>${OFF_BALL_INFO[player.offBall].description}</span></div></div>
    <div class="moves"><span class="moves-title">Movimentos especiais</span>${moves}</div>`;
}

/** A ficha de jogador durante um jogo: a ficha normal e o que fez até agora. */
export function playerCard(view: MatchView, b: Body, shirts: Readonly<Record<string, number>>): string {
  const { s } = view;
  const number = (b.team === 0 ? shirts[b.player.name] : undefined) ?? s.teams[b.team].roster.indexOf(b.player) + 4;
  const live = `<div class="card-live" id="cardLive">${playerCardLive(b)}</div>`;
  return `<div class="card" data-card-body="${s.bodies.indexOf(b)}">
    ${playerSheet(b.player, view.lookFor(b), b.team, number, s.teams[b.team].name, live, b.slot >= 0 ? SLOT_NAMES[b.slot]! : 'No banco')}
    <div class="card-nav">
      <button type="button" data-card="prev" aria-label="Jogador anterior">‹</button>
      <button type="button" data-card="close">Fechar</button>
      <button type="button" data-card="next" aria-label="Jogador seguinte">›</button>
    </div>
  </div>`;
}

// A prancheta: meio campo visto de cima, com o cesto em cima. As linhas esticam com a largura, que é só um esquema.
const BOARD_LINES = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 110" preserveAspectRatio="none"><g fill="none" stroke="#f4f1e4" stroke-width="2"><rect x="1" y="1" width="198" height="108"/><rect x="67" y="1" width="66" height="45"/><circle cx="100" cy="46" r="12"/><path d="M 10 1 L 10 22 A 90 53 0 0 0 190 22 L 190 1"/></g><circle cx="100" cy="12" r="3" fill="none" stroke="#e8622a" stroke-width="2"/></svg>');

/** Um jogador na prancheta: o boneco no seu lugar de ataque, com o nome numa etiqueta da cor da energia. */
export function boardPlayer(look: Look, name: string, energy: number | null, slot: number, attribute: string, picked: boolean): string {
  const [u, v] = SPOTS[slot]![0]!;
  const tone = energy === null ? '' : energy > 0.65 ? ' good' : energy > 0.35 ? ' mid' : ' low';
  return `<button type="button" class="bpl${picked ? ' picked' : ''}" style="left:${(50 + (v / 7.5) * 46).toFixed(1)}%;top:${((u / 14) * 100 + 8).toFixed(1)}%" ${attribute} aria-pressed="${picked}"><img alt="" src="${spriteImage(look)}"><span class="tag${tone}">${escapeHtml(name)}</span></button>`;
}

export const board = (players: string, away = false): string => `<div class="board${away ? ' away' : ''}" style="background-image:url('data:image/svg+xml,${BOARD_LINES}')">${players}</div>`;

/** Painel de trocas: toca-se em dois jogadores e trocam, sejam de campo ou do banco. `picked` é o primeiro, pelo índice em `bodies`. */
export function subsPanel(view: MatchView, picked: number | null, inTimeout: boolean): string {
  const { s } = view;
  const team = 0 as const;
  // As trocas marcadas: seta verde a quem entra, vermelha a quem sai, e um losango aos dois que trocam de lugar em campo.
  const marks = new Map<Body, string>();
  for (const sub of s.pendingSubs) {
    if (sub.team !== team) continue;
    const leaving = s.court[team][sub.slot]!;
    if (sub.incoming.slot === -1) {
      marks.set(sub.incoming, 'in');
      marks.set(leaving, 'out');
    } else {
      marks.set(sub.incoming, 'swap');
      marks.set(leaving, 'swap');
    }
  }
  const row = (b: Body): string => {
    const index = s.bodies.indexOf(b);
    const energy = 1 - b.fatigue;
    const mark = marks.get(b);
    return `<button type="button" class="srow${b.slot === -1 ? ' bench' : ''}${index === picked ? ' has-ball' : ''}" data-pick="${index}" aria-pressed="${index === picked}" ${b.slot === -1 && b.line.fouls >= 5 ? 'disabled' : ''}>
      <span class="face-wrap"><img class="face team-${team}" alt="" src="${faceImage(view.lookFor(b))}">${mark ? `<i class="arrow ${mark}"></i>` : ''}</span>
      <span class="pos">${b.slot >= 0 ? slotCode(b.slot) : ''}</span>
      <span class="name">${escapeHtml(b.player.name)}</span>
      <span class="bar"><i style="width:${Math.round(energy * 20) * 5}%;background:${energyColor(energy)}"></i></span>
      <span class="num">${b.line.points}</span>
      ${ATTRIBUTE_KEYS.map(key => `<b class="gr gr-${gradeOf(b.player.attributes[key])}">${gradeOf(b.player.attributes[key])}</b>`).join('')}
      ${stars(heightStars(b.player.heightCm), 'Altura')}
    </button>`;
  };
  const head = (label: string, kind: string): string => `<div class="srow head ${kind}"><span></span><span></span><span class="name">${label}</span><span>Energia</span><span class="num">Pts</span>${ATTRIBUTE_KEYS.map(key => `<img alt="${ATTRIBUTE_LABELS.find(([k]) => k === key)![1]}" src="${attributeIcon(key)}">`).join('')}<span class="num">Alt</span></div>`;
  const onCourt = s.court[team].map(row).join('');
  const bench = s.bodies.filter(b => b.team === team && b.slot === -1).map(row).join('');
  const onBoard = board(s.court[team].map((b, slot) => boardPlayer(view.lookFor(b), b.player.name, 1 - b.fatigue, slot, `data-pick="${s.bodies.indexOf(b)}"`, s.bodies.indexOf(b) === picked)).join(''));
  return `<div class="subs">
    ${inTimeout ? '<div class="subs-title">Desconto de tempo</div>' : ''}
    ${onBoard}
    ${head('Em campo', 'team-0')}${onCourt}
    ${head('No banco', 'plain')}${bench}
    <button type="button" class="rotation" data-rotation aria-pressed="${s.autoRotation[team]}">Rotação automática: ${s.autoRotation[team] ? 'ligada' : 'desligada'}</button>
    <button type="button" class="primary" data-subs-close>${inTimeout ? 'Continuar jogo' : 'Fechar'}</button>
  </div>`;
}

export function panelContent(view: MatchView, tab: PanelTab, found: readonly CardId[], live: LiveLeague | null = null): string {
  switch (tab) {
    case 'league': return leagueTab(view, live);
    case 'bench': return benchTab(view);
    case 'stats': return statsTab(view);
    case 'feed': return feedLines(view.s, 30);
    case 'cards': return foundCards(found);
  }
}

/** Antes da bola ao alto: os cinco de cada equipa entram em campo, um a um. */
export function introScreen(view: MatchView, label: string): string {
  const { s } = view;
  const column = (team: 0 | 1): string => `<div class="intro-team team-${team}"><div class="intro-name">${crest(view, team)}<span>${escapeHtml(s.teams[team].name)}</span></div>${s.court[team]
    .map((b, i) => `<div class="intro-row" style="--d:${i * 140}ms"><img alt="" src="${faceImage(view.lookFor(b))}"><b>${escapeHtml(b.player.name)}</b><span>${slotCode(b.slot)}</span></div>`)
    .join('')}</div>`;
  return `<div class="intro"><div class="intro-head">${escapeHtml(label)}</div><div class="intro-teams">${column(0)}${column(1)}</div></div>
    <div class="end-actions"><button type="button" class="primary" id="introSkip">Bola ao alto</button></div>`;
}

/** O instante do cesto que decidiu o jogo: a última vez que o vencedor passou para a frente, ou o último cesto. */
export function decisiveTick(s: MatchState): number {
  let a = 0;
  let b = 0;
  let last = 0;
  let decisive = 0;
  for (const e of s.events) {
    if (e.type !== 'made' && e.type !== 'freeThrowMade') continue;
    const points = e.points ?? 1;
    const before = e.team === 0 ? a - b : b - a;
    if (e.team === 0) a += points;
    else b += points;
    const after = e.team === 0 ? a - b : b - a;
    last = e.tick;
    if (before <= 0 && after > 0) decisive = e.tick;
  }
  return decisive || last;
}

export function resultScreen(view: MatchView, cards: readonly CardId[], league: string): string {
  const { s } = view;
  const winner: 0 | 1 = s.score[0] > s.score[1] ? 0 : 1;
  const top = s.bodies
    .filter(b => b.team === winner)
    .sort((a, b) => b.line.points + b.line.rebounds + b.line.assists - (a.line.points + a.line.rebounds + a.line.assists))[0]!;
  const l = top.line;
  return `<div class="result">
    <div class="final-score">${crest(view, 0, 32)}<b>${s.score[0]}</b><span>-</span><b>${s.score[1]}</b>${crest(view, 1, 32)}</div>
    <div class="winner">Ganha ${escapeHtml(s.teams[winner].name)}</div>
    ${league}
    <div class="section-head plain"><span>Cartas ganhas</span><span>${cards.length}</span></div>
    ${foundCards(cards)}
    ${periodTable(view)}
    <div class="mvp"><img class="face team-${winner}" alt="" src="${faceImage(view.lookFor(top))}"><span>Melhor em campo: ${escapeHtml(top.player.name)}<br>${l.points} pts, ${l.rebounds} res, ${l.assists} ass</span></div>
    ${statsTab(view)}
  </div>`;
}
