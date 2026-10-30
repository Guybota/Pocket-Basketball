import type { Body, MatchState, TeamLine } from '../sim/match.ts';
import { clockText, narrate } from './narrate.ts';
import type { MatchView } from './match-view.ts';

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

export type PanelTab = 'bench' | 'stats' | 'feed';

function energyColor(energy: number): string {
  if (energy > 0.55) return 'var(--good)';
  if (energy > 0.3) return 'var(--gold)';
  return 'var(--bad)';
}

function periodTable(view: MatchView): string {
  const { s, periodScores } = view;
  const periods = Math.max(4, periodScores[0].length);
  const head = Array.from({ length: periods }, (_, i) => `<span>${i < 4 ? i + 1 : 'P'}</span>`).join('');
  const row = (team: 0 | 1): string => {
    const cells = Array.from({ length: periods }, (_, i) => `<span>${periodScores[team][i] ?? '-'}</span>`).join('');
    return `<span class="team">${escapeHtml(s.teams[team].name)}</span>${cells}<span class="tot">${s.score[team]}</span>`;
  };
  return `<div class="qt" style="--periods:${periods}"><span></span>${head}<span class="tot">T</span>${row(0)}${row(1)}</div>`;
}

function benchTab(view: MatchView): string {
  const { s } = view;
  const rows = (team: 0 | 1): string => s.court[team].map((b: Body) => {
    const energy = 1 - b.fatigue;
    return `<div class="row"><span>${b.player.position}</span><span class="name">${escapeHtml(b.player.name)}</span><span class="bar"><i style="width:${Math.round(energy * 100)}%;background:${energyColor(energy)}"></i></span><span class="num">${b.line.points}</span></div>`;
  }).join('');
  return `${periodTable(view)}
    <div class="row head"><span>Pos</span><span>${escapeHtml(s.teams[0].short)} em campo</span><span>Energia</span><span class="num">Pts</span></div>${rows(0)}
    <div class="row head"><span>Pos</span><span>${escapeHtml(s.teams[1].short)} em campo</span><span>Energia</span><span class="num">Pts</span></div>${rows(1)}
    <div class="row head"><span></span><span>Últimas jogadas</span></div>${feedLines(s, 6)}`;
}

const shooting = (made: number, attempts: number): string => `${made}/${attempts}`;

function statsTab(s: MatchState): string {
  const rows: [string, (line: TeamLine) => string | number][] = [
    ['2 pontos', l => shooting(l.twoMade, l.twoAttempts)],
    ['3 pontos', l => shooting(l.threeMade, l.threeAttempts)],
    ['Lances livres', l => shooting(l.freeThrowsMade, l.freeThrowAttempts)],
    ['Ressaltos', l => l.offensiveRebounds + l.defensiveRebounds],
    ['Assistências', l => l.assists],
    ['Roubos de bola', l => l.steals],
    ['Bolas perdidas', l => l.turnovers],
    ['Desarmes', l => l.blocks],
    ['Faltas', l => l.fouls],
  ];
  const body = rows.map(([label, value]) => `<div class="cmp"><span>${value(s.lines[0])}</span><span class="label">${label}</span><span>${value(s.lines[1])}</span></div>`).join('');
  return `<div class="cmp head"><span>${escapeHtml(s.teams[0].short)}</span><span></span><span>${escapeHtml(s.teams[1].short)}</span></div>${body}`;
}

function feedLines(s: MatchState, count: number): string {
  const lines: string[] = [];
  for (let i = s.events.length - 1; i >= 0 && lines.length < count; i--) {
    const e = s.events[i]!;
    const line = narrate(e, s);
    if (line) lines.push(`<div class="feed"><span>${clockText(e.clock)}</span><span>${escapeHtml(line)}</span></div>`);
  }
  return lines.join('');
}

export function panelContent(view: MatchView, tab: PanelTab): string {
  switch (tab) {
    case 'bench': return benchTab(view);
    case 'stats': return statsTab(view.s);
    case 'feed': return feedLines(view.s, 30);
  }
}

export function resultScreen(view: MatchView): string {
  const { s } = view;
  const winner: 0 | 1 = s.score[0] > s.score[1] ? 0 : 1;
  const top = s.bodies
    .filter(b => b.team === winner)
    .sort((a, b) => b.line.points + b.line.rebounds + b.line.assists - (a.line.points + a.line.rebounds + a.line.assists))[0]!;
  const l = top.line;
  return `<div class="result">
    <div class="winner">Ganha ${escapeHtml(s.teams[winner].name)}</div>
    ${periodTable(view)}
    <div class="mvp">Melhor em campo: ${escapeHtml(top.player.name)} · ${l.points} pts, ${l.rebounds} res, ${l.assists} ass</div>
    ${statsTab(s)}
  </div>`;
}
