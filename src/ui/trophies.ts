import { CUP_NAMES, CUP_ROUNDS, type CupName } from '../sim/cup.ts';
import { standings, type Fixture } from '../sim/league.ts';
import { PLAYOFF_FORMATS } from '../sim/playoff.ts';
import { DIVISIONS } from '../sim/teamgen.ts';
import { COMBOS } from '../sim/training.ts';
import { PLAYER_CLUB, careerOf, currentGame, leagueIds, type CareerRecord, type ClubState, type MatchResult } from './club.ts';

export interface Trophy {
  name: string;
  kind: 'cup' | 'bigCup' | 'plate' | 'medal';
  detail: string;
  won: boolean;
}

/** Um título que um jogo pode decidir: o campeonato de uma divisão, ou uma das taças. */
export type Title = { kind: 'league'; division: number } | { kind: 'cup'; cup: CupName };

/** O troféu de cada título, o mesmo da vitrina, e a faixa da cerimónia (a letra do campo só tem maiúsculas). */
export function titleTrophy(title: Title): { name: string; kind: 'cup' | 'bigCup'; banner: string } {
  if (title.kind === 'league') {
    const name = DIVISIONS[title.division]!.name;
    return { name, kind: title.division === DIVISIONS.length - 1 ? 'bigCup' : 'cup', banner: `CAMPEÕES DA ${name.toUpperCase()}` };
  }
  const name = CUP_NAMES[title.cup];
  return { name, kind: title.cup === 'world' ? 'bigCup' : 'cup', banner: name.toUpperCase() };
}

/** O nosso resultado num jogo da ronda, ou null se não jogámos nela. */
function ourWin(round: readonly Fixture[]): boolean | null {
  const f = round.find(x => x.home === PLAYER_CLUB || x.away === PLAYER_CLUB);
  if (!f?.score) return null;
  return f.home === PLAYER_CLUB ? f.score[0] > f.score[1] : f.score[1] > f.score[0];
}

/** Já ninguém nos apanha: à frente de todos, mesmo que os outros ganhem o que lhes falta; ou acabou tudo e somos 1.º. */
function clinched(ids: readonly number[], rounds: readonly (readonly Fixture[])[]): boolean {
  const table = standings(ids, rounds);
  if (table[0]!.club !== PLAYER_CLUB) return false;
  const left = (id: number): number => rounds.reduce((n, r) => n + r.filter(f => !f.score && (f.home === id || f.away === id)).length, 0);
  return table.every(row => left(row.club) === 0) || table.slice(1).every(row => row.wins + left(row.club) < table[0]!.wins);
}

/**
 * O título que o jogo acabado de jogar nos deu, ou null. `before` é o clube antes de `finishMatch`, e `result` o que ela
 * devolveu. A final de uma taça, a final dos playoffs onde eles decidem o campeão, ou, nas outras divisões, a jornada em
 * que o 1.º lugar fica garantido (no máximo a última).
 */
export function titleWon(before: ClubState, result: MatchResult): Title | null {
  const game = currentGame(before);
  // O amigável do Aeroporto e as semanas livres não dão nada.
  if (!game || (result.round === null && result.series === null)) return null;
  const format = PLAYOFF_FORMATS[before.division];
  if (game.playoff) {
    const series = result.series;
    return format?.decidesTitle && game.round === format.bestOf.length - 1 && series?.decided && series.wins[0] > series.wins[1] ? { kind: 'league', division: before.division } : null;
  }
  if (!result.round) return null;
  if (game.cup) return game.round === CUP_ROUNDS[game.cup].length - 1 && ourWin(result.round) ? { kind: 'cup', cup: game.cup } : null;
  if (format?.decidesTitle) return null;
  const ids = leagueIds(before);
  const after = before.rounds.map((r, i) => (i === game.round ? result.round! : r));
  return !clinched(ids, before.rounds) && clinched(ids, after) ? { kind: 'league', division: before.division } : null;
}

// Numa época de 18 jornadas, só uma época excecional chega aqui.
const COACH_OF_THE_YEAR_WINS = 15;

/** O que o treinador já ganhou, em toda a carreira. O que falta fica em sombra, com a indicação do que pede. */
export function trophyList(club: ClubState): Trophy[] {
  const career = careerOf(club);
  const last = DIVISIONS.length - 1;
  const when = (r: CareerRecord): string => `Época ${r.season}, com o ${r.club}`;
  const cups = DIVISIONS.map((division, index): Trophy => {
    const titles = career.filter(r => r.outcome === 'champion' && r.division === index);
    const latest = titles.at(-1);
    return {
      name: division.name,
      kind: titleTrophy({ kind: 'league', division: index }).kind,
      won: latest !== undefined,
      detail: latest ? `${when(latest)}. ${latest.wins} vitórias e ${latest.losses} derrotas.${titles.length > 1 ? ` Ganha ${titles.length} vezes.` : ''}` : index === last ? 'O título mais alto do país.' : `Ganha a ${division.name} para a veres aqui.`,
    };
  });
  const rises = career.filter(r => (r.outcome === 'champion' || r.outcome === 'promoted') && r.division < last);
  const bestYear = career.find(r => r.wins >= COACH_OF_THE_YEAR_WINS);
  const scorer = career.filter(r => r.topScorerOfDivision).sort((a, b) => b.topScorerPoints - a.topScorerPoints)[0];
  const federationWins = career.filter(r => (r.cups ?? []).includes('federation')).length;
  const federation = career.filter(r => (r.cups ?? []).includes('federation')).at(-1);
  const continental = career.filter(r => (r.cups ?? []).includes('continental')).at(-1);
  const world = career.filter(r => (r.cups ?? []).includes('world')).at(-1);
  const treble = career.filter(r => r.outcome === 'champion' && r.division === last && (r.cups ?? []).includes('federation') && (r.cups ?? []).includes('world')).at(-1);
  // Os prémios individuais: quantas vezes um jogador nosso os ganhou, e o último.
  const award = (name: string, key: 'mvp' | 'rookie' | 'defender', goal: string): Trophy => {
    const seasons = career.filter(r => r.awards?.[key]);
    const latest = seasons.at(-1);
    return { name, kind: 'medal', won: latest !== undefined, detail: latest ? `${when(latest)}: ${latest.awards![key]}.${seasons.length > 1 ? ` ${seasons.length} vezes na carreira.` : ''}` : goal };
  };
  return [
    ...cups,
    { name: 'Subida de divisão', kind: 'medal', won: rises.length > 0, detail: rises.length > 0 ? `${rises.length === 1 ? 'Uma subida' : `${rises.length} subidas`}. A última na ${when(rises.at(-1)!).toLowerCase()}.` : 'Sobe de divisão pela primeira vez.' },
    { name: 'Treinador do Ano', kind: 'plate', won: bestYear !== undefined, detail: bestYear ? `${when(bestYear)}. ${bestYear.wins} vitórias numa só época.` : `Ganha ${COACH_OF_THE_YEAR_WINS} jogos na mesma época.` },
    { name: 'Melhor Marcador', kind: 'medal', won: Boolean(scorer?.topScorer), detail: scorer?.topScorer ? `${when(scorer)}: ${scorer.topScorer}, com ${scorer.topScorerPoints} pontos.` : 'Tem o melhor marcador da divisão numa época, em pontos por jogo.' },
    { name: 'Coleção de combos', kind: 'plate', won: club.knownCombos.length === COMBOS.length, detail: `Descobre todos os combos secretos. Já tens ${club.knownCombos.length} de ${COMBOS.length}.` },
    { name: 'Taça da Federação', kind: titleTrophy({ kind: 'cup', cup: 'federation' }).kind, won: federation !== undefined, detail: federation ? `${when(federation)}. ${federationWins > 1 ? `Ganha ${federationWins} vezes.` : 'A taça de todos os clubes.'}` : 'Seis rondas a um jogo, contra qualquer clube do país.' },
    { name: 'Taça Continental', kind: titleTrophy({ kind: 'cup', cup: 'continental' }).kind, won: continental !== undefined, detail: continental ? `${when(continental)}. Contra os melhores do continente.` : 'Entram os 4 primeiros da Pro Liga 1. Quatro rondas contra clubes de fora, mais fortes do que os de cá.' },
    { name: 'Mundial de Clubes', kind: titleTrophy({ kind: 'cup', cup: 'world' }).kind, won: world !== undefined, detail: world ? `${when(world)}. Campeões do mundo.` : 'Uma final entre o campeão continental e o campeão de outro continente.' },
    award('MVP da época', 'mvp', 'O jogador do plantel que mais faz numa época, em pontos, ressaltos, assistências, roubos e desarmes por jogo.'),
    award('Revelação', 'rookie', 'O melhor dos que chegaram ao clube nessa época.'),
    award('Melhor Defensor', 'defender', 'O jogador com mais roubos de bola e desarmes por jogo numa época.'),
    { name: 'Triplete', kind: 'bigCup', won: treble !== undefined, detail: treble ? `${when(treble)}. Pro Liga 1, Taça da Federação e Mundial na mesma época.` : 'Pro Liga 1, Taça da Federação e Mundial de Clubes na mesma época.' },
  ];
}

/** A vitrina: prateleiras de madeira com o que já se ganhou. O que falta fica em sombra. */
export function drawShelf(canvas: HTMLCanvasElement, trophies: readonly Trophy[]): void {
  const g = canvas.getContext('2d')!;
  const { width: W, height: H } = canvas;
  const rect = (c: string, x: number, y: number, w: number, h: number): void => {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), w, h);
  };
  rect('#3a2a1c', 0, 0, W, H);
  rect('#2a1e14', 8, 8, W - 16, H - 16);
  for (let x = 12; x < W - 12; x += 22) rect('#33261a', x, 8, 2, H - 16);
  const rowY = [Math.round(H * 0.47), Math.round(H * 0.92)];
  for (const y of rowY) {
    rect('#7a4f1e', 8, y, W - 16, 8);
    rect('#a06a2c', 8, y, W - 16, 3);
    rect('rgba(242,194,48,.08)', 8, y - 90, W - 16, 90);
  }
  const perRow = Math.ceil(trophies.length / rowY.length);
  trophies.forEach((t, n) => drawTrophy(g, Math.round((W / perRow) * (n % perRow + 0.5)), rowY[Math.floor(n / perRow)]!, t.kind, t.won));
}

/** Um troféu, com a base em (x, y). O que falta fica em sombra. */
export function drawTrophy(g: CanvasRenderingContext2D, x: number, y: number, kind: Trophy['kind'], won: boolean): void {
  const rect = (c: string, x: number, y: number, w: number, h: number): void => {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), w, h);
  };
  {
    const t = { kind, won };
    const main = !t.won ? '#1b140d' : t.kind === 'cup' ? '#c9ccd4' : t.kind === 'plate' ? '#c98a4a' : '#f2c230';
    const dark = !t.won ? '#1b140d' : t.kind === 'cup' ? '#8f93a0' : t.kind === 'plate' ? '#8f5e2c' : '#c99a14';
    const light = !t.won ? '#1b140d' : '#ffffff';
    if (t.kind === 'cup' || t.kind === 'bigCup') {
      const s = t.kind === 'bigCup' ? 1.3 : 1;
      const w = Math.round(14 * s);
      const h = Math.round(16 * s);
      rect(dark, x - w / 2 - 1, y - 6, w + 2, 6);
      rect(main, x - 3, y - 12, 6, 6);
      rect(main, x - w / 2, y - 12 - h, w, h);
      rect(dark, x + w / 2 - 3, y - 12 - h, 3, h);
      rect(light, x - w / 2 + 2, y - 10 - h, 2, h - 6);
      rect(main, x - w / 2 - 4, y - 10 - h, 4, 2);
      rect(main, x - w / 2 - 4, y - 10 - h, 2, 7);
      rect(main, x - w / 2 - 4, y - 5 - h, 4, 2);
      rect(main, x + w / 2, y - 10 - h, 4, 2);
      rect(main, x + w / 2 + 2, y - 10 - h, 2, 7);
      rect(main, x + w / 2, y - 5 - h, 4, 2);
    } else if (t.kind === 'plate') {
      rect(dark, x - 10, y - 5, 20, 5);
      rect(main, x - 8, y - 27, 16, 22);
      rect(dark, x + 5, y - 27, 3, 22);
      if (t.won) rect('#e8622a', x - 3, y - 21, 6, 6);
    } else {
      rect('#cf3a2c', x - 4, y - 28, 3, 10);
      rect('#2b5fd9', x + 1, y - 28, 3, 10);
      rect(dark, x - 7, y - 18, 14, 14);
      rect(main, x - 6, y - 17, 12, 12);
      if (t.won) rect(light, x - 3, y - 14, 3, 3);
    }
  }
}
