import { slotFit, type Body, type MatchState, type TeamLine } from '../sim/match.ts';
import type { CardId } from '../sim/training.ts';
import { ATTRIBUTE_KEYS, gradeOf, type Attributes, type Player } from '../sim/types.ts';
import { clubIdentity } from './art/identity.ts';
import { emblemImage } from './art/kit.ts';
import { portraitImage } from './art/portrait.ts';
import { heightIcon, attributeIcon, energyIcon, optionStar } from './art/icons.ts';
import { faceImage, type Look } from './art/sprites.ts';
import { BALANCE as B } from '../sim/balance.ts';
import { TICKS_PER_SECOND } from '../sim/court.ts';
import { emptyState, foundCards } from './club-screens.ts';
import { MOVE_INFO, OFF_BALL_INFO, ON_BALL_INFO, clockText, narrate } from './narrate.ts';
import type { MatchView } from './match-view.ts';
import { assistantReport, say } from './staff.ts';
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
/** A altura (1 a 3) numa só estrela, com o número ao centro: cabe em qualquer lista de jogadores. */
export const heightStar = (height: number): string => `<img class="hstar" src="${heightIcon(height)}" title="Altura ${height} de 3" alt="Altura ${height} de 3">`;
export const bodyStars = (p: Player): string => `<span class="body-stars"><span>Alt.</span>${heightStar(p.height)}</span>`;

export function energyColor(energy: number): string {
  if (energy > 0.55) return 'var(--good)';
  if (energy > 0.3) return 'var(--gold)';
  return 'var(--bad)';
}

/** O emblema de uma equipa do jogo: o do nosso clube, se a vista o souber, ou o fixo do clube. */
export const crest = (view: MatchView, team: 0 | 1, size = 24): string =>
  `<img class="emblem" alt="Emblema do ${escapeHtml(view.s.teams[team].name)}" style="width:${size}px;height:${size}px" src="${emblemImage((team === 0 ? view.ownEmblem : view.rivalEmblem) ?? clubIdentity(view.s.teams[team].name).emblem)}">`;

function periodTable(view: MatchView): string {
  const { s, periodScores } = view;
  const periods = Math.max(view.periods, periodScores[0].length);
  const head = Array.from({ length: periods }, (_, i) => `<span>${i < view.periods ? i + 1 : 'P'}</span>`).join('');
  const row = (team: 0 | 1): string => {
    const cells = Array.from({ length: periods }, (_, i) => `<span>${periodScores[team][i] ?? '-'}</span>`).join('');
    return `<span class="team"><i class="dot team-${team}"></i>${escapeHtml(s.teams[team].name)}</span>${cells}<span class="tot">${s.score[team]}</span>`;
  };
  return `<div class="qt" style="--periods:${periods}"><span></span>${head}<span class="tot">T</span>${row(0)}${row(1)}</div>`;
}

/** A estrela ao lado do nome de quem é opção de ataque: dourada para a primeira, prateada para a segunda. */
export function optionMark(options: readonly string[] | undefined, name: string): string {
  const rank = options?.indexOf(name) ?? -1;
  return rank === 0 || rank === 1 ? `<img class="ostar" alt="${rank === 0 ? 'primeira' : 'segunda'} opção" src="${optionStar(rank)}">` : '';
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
      <span class="name">${escapeHtml(b.player.name)}${optionMark(s.tactics[team].options, b.player.name)}</span>
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
  return `<div class="cmp head"><span>${crest(view, 0)}</span><span></span><span>${crest(view, 1)}</span></div>${body}${playerRows(0)}${playerRows(1)}<details class="legend"><summary>Legenda</summary>${legendBody()}</details>`;
}

const minutesText = (seconds: number): string => `${Math.floor(Math.round(seconds) / 60)}:${String(Math.round(seconds) % 60).padStart(2, '0')}`;

/** A aba da liga: os outros jogos da jornada no mesmo ponto do relógio, e a classificação como vai neste momento. */
function leagueTab(view: MatchView, live: LiveLeague | null): string {
  if (!live) return emptyState('Hoje não há outros jogos a seguir. Os resultados dos outros só aparecem nas semanas de jornada ou de taça.');
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
  return `<div class="section-head plain"><span>Outros jogos</span><span>Ao mesmo tempo do nosso</span></div>${games || emptyState('Não há outros jogos a decorrer neste momento.')}
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

const STAT_CODES = 'Pts pontos · Res ressaltos · Ass assistências · Rou roubos de bola · Blq desarmes · Fal faltas · Min minutos · Alt altura';

/** O que querem dizer os ícones dos atributos e as siglas. Por baixo de um cabeçalho que se toca, ou no fim de uma lista. */
export function legendBody(): string {
  return `<div class="legend-body">${ATTRIBUTE_LABELS.map(([key, label]) => `<span><img alt="" src="${attributeIcon(key)}">${label}</span>`).join('')}
    <p>${SLOT_CODES.map((code, i) => `${code} ${SLOT_NAMES[i]}`).join(' · ')}</p><p>${STAT_CODES}</p></div>`;
}

/** Um cabeçalho de lista que, ao tocar, abre a legenda por baixo. */
export const legendHead = (headClass: string, cells: string): string =>
  `<details class="legend"><summary class="${headClass}" title="Tocar para ver a legenda">${cells}</summary>${legendBody()}</details>`;

/** A parte da ficha que muda durante o jogo. É a única que se redesenha, para os botões nunca serem substituídos. */
export function playerCardLive(b: Body): string {
  const l = b.line;
  const stats: [string, number | string][] = [['Pts', l.points], ['Res', l.rebounds], ['Ass', l.assists], ['Rou', l.steals], ['Fal', l.fouls], ['Min', minutesText(l.secondsPlayed)]];
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

/** Painel de trocas: toca-se em dois jogadores e trocam, sejam de campo ou do banco. `picked` é o primeiro, pelo índice em `bodies`. */
export function subsPanel(view: MatchView, picked: number | null, inTimeout: boolean): string {
  const { s } = view;
  const team = 0 as const;
  // A lista mostra logo a equipa como vai ficar: quem entra já aparece no lugar, quem sai já está no banco, com seta verde
  // a quem entra, vermelha a quem sai, e um losango aos dois que trocam de lugar em campo. Igual nos descontos de tempo,
  // onde a troca se faz no momento e as setas ficam até o jogo recomeçar.
  const lineup = [...s.court[team]];
  let bench = s.bodies.filter(b => b.team === team && b.slot === -1);
  const marks = new Map<Body, string>();
  for (const sub of s.pendingSubs) {
    if (sub.team !== team) continue;
    const leaving = lineup[sub.slot]!;
    if (sub.incoming.slot === -1) {
      lineup[sub.slot] = sub.incoming;
      bench = bench.map(b => (b === sub.incoming ? leaving : b));
      marks.set(sub.incoming, 'in');
      marks.set(leaving, 'out');
    } else {
      const from = lineup.indexOf(sub.incoming);
      if (from >= 0) lineup[from] = leaving;
      lineup[sub.slot] = sub.incoming;
      marks.set(sub.incoming, 'swap');
      marks.set(leaving, 'swap');
    }
  }
  if (s.phase === 'timeout' || s.phase === 'break') {
    const since = s.events.reduce((tick, e) => (e.type === 'timeout' || e.type === 'periodEnd' ? e.tick : tick), 0);
    for (const e of s.events) {
      if (e.type !== 'substitution' || e.team !== team || e.tick < since) continue;
      const entered = s.bodies.find(b => b.team === team && b.player.name === e.player);
      const left = s.bodies.find(b => b.team === team && b.player.name === e.other);
      if (entered) marks.set(entered, 'in');
      if (left) marks.set(left, 'out');
    }
  }
  // Com um jogador escolhido, cada lugar possível mostra como ele encaixa lá: verde encaixa, amarelo mais ou menos,
  // vermelho mal. Escolhido um do banco, pinta-se o código dos lugares em campo; escolhido um de campo, cada um do banco
  // mostra o código desse lugar na sua cor.
  const pickedBody = picked !== null ? s.bodies[picked] ?? null : null;
  const pickedSlot = pickedBody ? lineup.indexOf(pickedBody) : -1;
  const fitClass = (player: Body['player'], slot: number): string => {
    const best = Math.max(...[0, 1, 2, 3, 4].map(k => slotFit(player, k)));
    const ratio = slotFit(player, slot) / Math.max(0.01, best);
    return ratio >= 0.92 ? 'fit-good' : ratio >= 0.8 ? 'fit-mid' : 'fit-low';
  };
  const row = (b: Body, slot = -1): string => {
    const index = s.bodies.indexOf(b);
    const energy = 1 - b.fatigue;
    const mark = marks.get(b);
    const fit = pickedBody && pickedBody !== b ? (slot >= 0 && pickedSlot < 0 ? fitClass(pickedBody.player, slot) : slot < 0 && pickedSlot >= 0 ? fitClass(b.player, pickedSlot) : '') : '';
    const code = slot >= 0 ? slotCode(slot) : fit ? slotCode(pickedSlot) : '';
    return `<button type="button" class="srow${slot < 0 ? ' bench' : ''}" data-pick="${index}" aria-pressed="${index === picked}" ${slot < 0 && b.line.fouls >= 5 ? 'disabled' : ''}>
      <span class="face-wrap"><img class="face team-${team}" alt="" src="${faceImage(view.lookFor(b))}">${mark ? `<i class="arrow ${mark}"></i>` : ''}</span>
      <span class="pos${fit ? ` ${fit}` : ''}">${code}</span>
      <span class="name">${escapeHtml(b.player.name)}${optionMark(s.tactics[b.team].options, b.player.name)}</span>
      <span class="bar"><i style="width:${Math.round(energy * 20) * 5}%;background:${energyColor(energy)}"></i></span>
      <span class="num">${b.line.points}</span>
      ${ATTRIBUTE_KEYS.map(key => `<b class="gr gr-${gradeOf(b.player.attributes[key])}">${gradeOf(b.player.attributes[key])}</b>`).join('')}
      ${heightStar(b.player.height)}
    </button>`;
  };
  const head = (label: string, kind: string): string => `<div class="srow head ${kind}"><span></span><span></span><span class="name">${label}</span><img class="energy" alt="Energia" title="Energia" src="${energyIcon()}"><span class="num">Pts</span>${ATTRIBUTE_KEYS.map(key => `<img alt="${ATTRIBUTE_LABELS.find(([k]) => k === key)![1]}" src="${attributeIcon(key)}">`).join('')}<span class="num">Alt</span></div>`;
  const onCourt = lineup.map((b, slot) => row(b, slot)).join('');
  const benchRows = bench.map(b => row(b)).join('');
  // Desligada, fica no cimo: com ela desligada os mesmos cinco jogam até rebentar, e o treinador tem de o ver.
  const rotation = `<button type="button" class="rotation" data-rotation aria-pressed="${s.autoRotation[team]}">Rotação automática: ${s.autoRotation[team] ? 'ligada' : 'desligada · tocar para ligar'}</button>`;
  return `<div class="subs">
    ${inTimeout ? `<div class="subs-title">${s.phase === 'timeout' ? 'Desconto de tempo' : 'Fim do período'}</div>${say('assistant', ...assistantReport(s))}` : ''}
    ${s.autoRotation[team] ? '' : rotation}
    ${head('Em campo', 'team-0')}${onCourt}
    ${head('No banco', 'plain')}${benchRows}
    ${s.autoRotation[team] ? rotation : ''}
    <button type="button" class="primary" data-subs-close>${inTimeout ? (s.timer > B.coachPauseSeconds * TICKS_PER_SECOND ? 'Continuar jogo' : `Continuar jogo (${Math.ceil(s.timer / TICKS_PER_SECOND)} s)`) : 'Fechar'}</button>
  </div>`;
}

export function panelContent(view: MatchView, tab: PanelTab, found: readonly CardId[], live: LiveLeague | null = null): string {
  switch (tab) {
    case 'league': return leagueTab(view, live);
    case 'bench': return benchTab(view);
    case 'stats': return statsTab(view);
    case 'feed': {
      const lines = feedLines(view.s, 30);
      // No arranque há uma ou duas linhas: diz-se o que vem, para o resto do separador não parecer avariado.
      if (!lines) return emptyState('O relato começa com a bola ao alto. As jogadas aparecem aqui, a mais recente em cima.');
      return view.s.events.length < 6 ? `${lines}<p class="hint">As jogadas seguintes vão aparecendo por cima destas.</p>` : lines;
    }
    case 'cards': return found.length ? `${foundCards(found)}<p class="hint">Cartas ganhas neste jogo: ${found.length}. No fim há mais, e usam-se no Treino.</p>` : foundCards(found);
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

/**
 * As três razões do resultado, tiradas das estatísticas: cada candidata vale os pontos (aproximados) que deu ao vencedor,
 * e ficam as três que mais pesaram a favor dele. Os números vêm sempre pela ordem do marcador, casa primeiro.
 */
export function resultReasons(s: MatchState): string[] {
  const [a, b] = s.lines;
  const winner = s.score[0] > s.score[1] ? 0 : 1;
  const sign = winner === 0 ? 1 : -1;
  const rebounds = (l: TeamLine): number => l.offensiveRebounds + l.defensiveRebounds;
  const starters = (team: 0 | 1): number => {
    const list = s.bodies.filter(x => x.team === team && x.starterSlot >= 0);
    return Math.round((list.reduce((sum, x) => sum + 1 - x.fatigue, 0) / Math.max(1, list.length)) * 100);
  };
  const [freshA, freshB] = [starters(0), starters(1)];
  const candidates: [number, string][] = [
    [3 * (a.threeMade - b.threeMade), `De 3: ${a.threeMade}/${a.threeAttempts} contra ${b.threeMade}/${b.threeAttempts}`],
    [2 * (a.twoMade - b.twoMade), `De 2: ${a.twoMade}/${a.twoAttempts} contra ${b.twoMade}/${b.twoAttempts}`],
    [a.freeThrowsMade - b.freeThrowsMade, `Lances livres: ${a.freeThrowsMade}/${a.freeThrowAttempts} contra ${b.freeThrowsMade}/${b.freeThrowAttempts}`],
    [rebounds(a) - rebounds(b), `Ressaltos: ${rebounds(a)}–${rebounds(b)}`],
    [b.turnovers - a.turnovers, `Bolas perdidas: ${a.turnovers}–${b.turnovers}`],
    // Cada 10 pontos de energia a mais nos titulares conta como um cesto.
    [(freshA - freshB) / 5, `Cansaço: os titulares acabaram a ${freshA} % contra ${freshB} %`],
  ];
  return candidates.filter(([value]) => value * sign > 0).sort((x, y) => y[0] * sign - x[0] * sign).slice(0, 3).map(([, text]) => text);
}

/** O relatório do jogo; `headline`, num título, toma o lugar de «Ganha …». */
export function resultScreen(view: MatchView, cards: readonly CardId[], league: string, headline?: string): string {
  const { s } = view;
  const winner: 0 | 1 = s.score[0] > s.score[1] ? 0 : 1;
  const top = s.bodies
    .filter(b => b.team === winner)
    .sort((a, b) => b.line.points + b.line.rebounds + b.line.assists - (a.line.points + a.line.rebounds + a.line.assists))[0]!;
  const l = top.line;
  return `<div class="result">
    <div class="final-score">${crest(view, 0, 32)}<b>${s.score[0]}</b><span>-</span><b>${s.score[1]}</b>${crest(view, 1, 32)}</div>
    <div class="winner">${escapeHtml(headline ?? `Ganha ${s.teams[winner].name}`)}</div>
    <div class="section-head plain"><span>O que decidiu o jogo</span></div>
    <ul class="reasons">${resultReasons(s).map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
    ${league}
    <div class="section-head plain"><span>Cartas ganhas</span><span>${cards.length}</span></div>
    ${foundCards(cards)}
    ${periodTable(view)}
    <div class="mvp"><img class="face team-${winner}" alt="" src="${faceImage(view.lookFor(top))}"><span>Melhor em campo: ${escapeHtml(top.player.name)}<br>${l.points} pts, ${l.rebounds} res, ${l.assists} ass</span></div>
    ${statsTab(view)}
  </div>`;
}

/** A nova lista de opções de ataque depois de escolher `name` para a opção `slot` (0 é a primeira, que fica sempre à frente). */
export function pickOption(options: readonly string[], slot: number, name: string): string[] {
  const next = slot === 0 ? [name, ...options.slice(1).filter(n => n !== name)] : [options[0], name].filter((n, i, all): n is string => Boolean(n) && all.indexOf(n) === i);
  return next.slice(0, 2);
}

/** As opções de ataque: um botão para cada uma, com o jogador escolhido por baixo, e ao tocar a lista do plantel com as notas. */
export function optionsControls(roster: readonly Player[], tactics: { options?: string[] }, picking: number | null, face: (p: Player) => string): string {
  const options = tactics.options ?? [];
  const label = (n: number): string => (n === 0 ? 'Primeira opção' : 'Segunda opção');
  const grade = (value: number): string => `<b class="gr gr-${gradeOf(value)}">${gradeOf(value)}</b>`;
  if (picking !== null) {
    const head = `<div class="optpick head"><span></span><span></span>${ATTRIBUTE_KEYS.map(key => `<img alt="" src="${attributeIcon(key)}">`).join('')}<span class="num">Alt</span></div>`;
    const rows = roster.map((p, i) => `<button type="button" class="optpick${i >= 5 ? ' bench' : ''}" data-option-set="${escapeHtml(p.name)}" aria-pressed="${options[picking] === p.name}"><img alt="" src="${face(p)}"><span>${escapeHtml(p.name)}</span>${ATTRIBUTE_KEYS.map(key => grade(p.attributes[key])).join('')}${heightStar(p.height)}</button>`).join('');
    return `<div class="tacrow"><span>Escolhe a ${label(picking).toLowerCase()}. No banco só conta quando entrar.</span><div class="optlist">${head}${rows}</div><button type="button" data-option-cancel="1">Cancelar</button></div>`;
  }
  const slot = (n: number): string => {
    const player = roster.find(p => p.name === options[n]);
    return `<div class="optslot"><button type="button" data-option-slot="${n}" ${n === 1 && !options[0] ? 'disabled' : ''}>${label(n)}</button>${player ? `<span class="optwho"><img alt="" src="${face(player)}">${escapeHtml(player.name)}</span>` : '<span class="optwho empty">Nenhuma</span>'}</div>`;
  };
  return `<div class="tacrow"><span>Opções de ataque: a equipa procura-as primeiro e monta jogadas para elas, conforme o tipo de jogador.</span><div class="optbtns">${slot(0)}${slot(1)}</div><button type="button" data-option-clear="1" ${options.length ? '' : 'disabled'}>Limpar opções</button></div>`;
}
