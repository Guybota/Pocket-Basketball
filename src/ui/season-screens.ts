import { CUP_NAMES, CUP_ROUNDS, FEDERATION_ROUNDS } from '../sim/cup.ts';
import { LEAGUE_SIZE, MOVING_PLACES, SEASON_WEEKS, weekCup, weekRound, type Standing } from '../sim/league.ts';
import { DIVISIONS } from '../sim/teamgen.ts';
import type { TownPlace } from './art/town.ts';
import { foundCards } from './club-screens.ts';
import { PLAYER_CLUB, cupRoundName, cupStatus, currentGame, currentSeries, leaguePosition, leagueTable, opponentOf, playoffFormat, totalCards, type ClubState, type MatchResult, type SeasonRecord } from './club.ts';
import { PLAYOFF_FORMATS, seriesWins } from '../sim/playoff.ts';
import { energyColor, escapeHtml } from './panel.ts';

// A letra do jogo não tem o «º», por isso diz-se por extenso.
const place = (position: number): string => `Lugar ${position + 1}`;
const divisionName = (division: number): string => DIVISIONS[division]!.name;
const clubName = (club: ClubState, id: number): string => club.clubs[id]!.name;

function confidenceBar(value: number): string {
  return `<div class="confidence"><span>Confiança</span><span class="bar"><i style="width:${value}%;background:${energyColor(value / 100)}"></i></span><b>${Math.round(value)}%</b></div>`;
}

/** Uma frase da secretária, sobre o que mais importa nesta semana. */
export function staffNote(club: ClubState): string {
  const position = leaguePosition(club);
  const played = club.rounds.some(round => round.some(f => f.score));
  const tired = club.team.roster.slice(0, 5).find(player => player.fatigue >= 0.35);
  if (club.confidence < 15) return 'A direção anda a fazer contas à tua indemnização. Convinha ganhar.';
  if (tired) return `O ${tired.name} chegou ao treino de rastos. Talvez o banco lhe faça bem.`;
  if (club.trainedThisWeek.length === 0 && totalCards(club) >= 3) return 'Há cartas por usar. Os jogadores não melhoram com boas intenções.';
  if (currentGame(club)?.playoff) return 'Playoffs. Agora é jogo a jogo, e quem perder vai de férias.';
  if (currentGame(club)?.cup) return 'Semana de taça. Um jogo mau e acabou-se; um jogo bom e a cidade fala disto durante meses.';
  if (!currentGame(club)) return 'Esta semana não há jogo. Há equipas a oferecer jogos de treino.';
  if (played && position < MOVING_PLACES && club.division < DIVISIONS.length - 1) return 'Estamos em zona de subida. Eu não disse nada.';
  if (played && position >= LEAGUE_SIZE - MOVING_PLACES && club.division > 0) return 'Estamos em zona de descida. O presidente já não me cumprimenta.';
  return 'Nada a assinalar. O café continua mau.';
}

const MONTHS = ['Setembro', 'Outubro', 'Novembro', 'Dezembro', 'Janeiro', 'Fevereiro', 'Março', 'Abril'] as const;
const WEEKS_PER_MONTH = 4;

/** Por cima do mapa: a data, a confiança e uma etiqueta tocável em cada edifício. */
export function townOverlay(club: ClubState, places: Record<TownPlace, { x: number; y: number }>): string {
  const cards = totalCards(club);
  const week = club.week - 1;
  const month = MONTHS[Math.floor(week / WEEKS_PER_MONTH)] ?? MONTHS[MONTHS.length - 1]!;
  const chip = (place: TownPlace, id: string, label: string): string => {
    const { x, y } = places[place];
    // Sem isto, as etiquetas das pontas sairiam da janela.
    const left = Math.max(0.14, Math.min(0.86, x));
    return `<button type="button" class="town-chip" id="${id}" style="left:${(left * 100).toFixed(1)}%;top:${(y * 100).toFixed(1)}%">${label}</button>`;
  };
  return `<div class="town-bar"><span>${month} · Semana ${week % WEEKS_PER_MONTH + 1}</span><span class="${club.confidence < 15 ? 'low' : ''}">Confiança ${Math.round(club.confidence)}%</span></div>
    ${chip('arena', 'arenaChip', 'Pavilhão')}
    ${chip('office', 'officeBtn', 'Escritório')}
    ${chip('training', 'trainBtn', `Treino (${cards})`)}
    ${chip('federation', 'federationBtn', 'Federação')}
    ${chip('tower', 'towerChip', 'Torre')}
    ${chip('airport', 'airportChip', 'Aeroporto')}`;
}

export const TOWER_NOTE = 'A torre guarda tudo sozinha. Este clube fica guardado neste browser.';
export const AIRPORT_NOTE = 'O aeroporto ainda está em obras. Os jogos contra outros treinadores chegam mais tarde.';

/** O que fica por baixo do mapa: a secretária, o próximo jogo e o que não tem edifício próprio. */
/** O nome do jogo oficial desta semana: a jornada ou a ronda da taça. */
export function officialLabel(club: ClubState): string {
  const game = currentGame(club);
  if (!game) return 'Semana livre';
  const series = currentSeries(club);
  if (game.playoff && series) {
    const [top, bottom] = seriesWins(series);
    const wins = series.top === PLAYER_CLUB ? [top, bottom] : [bottom, top];
    return `${playoffFormat(club)!.name} · ${playoffFormat(club)!.roundNames[game.round]} · Jogo ${series.games.length + 1} (${wins[0]}-${wins[1]})`;
  }
  return game.cup ? `${CUP_NAMES[game.cup]} · ${cupRoundName(game.cup, game.round)}` : `Jornada ${game.round + 1} de ${(LEAGUE_SIZE - 1) * 2}`;
}

export function cityPanel(club: ClubState, saveFailed: boolean): string {
  const game = currentGame(club);
  const round = game ? game.round : null;
  const own = leagueTable(club).find(row => row.club === PLAYER_CLUB)!;
  const cupWeek = weekCup(club.week);
  const status = cupWeek ? cupStatus(club, cupWeek.cup) : null;
  const label = !game
    ? `Semana livre · ${cupWeek && status ? (status.winner === PLAYER_CLUB ? `Vencedores da ${CUP_NAMES[cupWeek.cup]}` : status.entered ? `Fora da ${CUP_NAMES[cupWeek.cup]}` : `Semana da ${CUP_NAMES[cupWeek.cup]}`) : 'Sem jogo oficial'}`
    : `${officialLabel(club)} · ${game.fixture.home === PLAYER_CLUB ? 'Em casa' : 'Fora'} · ${escapeHtml(opponentOf(club).name)}`;
  return `<div class="cityp">
    <p id="staffNote"><b>Secretária:</b> ${escapeHtml(staffNote(club))}</p>
    <div class="citydetail">${label}</div>
    <div class="citydetail">Época ${club.season} · ${divisionName(club.division)}${own.played > 0 ? ` · ${place(leaguePosition(club))}` : ''} · ${own.wins} V · ${own.losses} D</div>
    ${round === null
      ? '<div class="two"><button type="button" class="primary" id="startBtn">Propostas de jogo</button><button type="button" id="skipWeekBtn">Próxima semana</button></div>'
      : `<div class="two"><button type="button" class="primary" id="startBtn">Ir para o pavilhão</button><button type="button" id="practiceBtn" ${club.practicedThisWeek ? 'disabled' : ''}>${club.practicedThisWeek ? 'Jogo-treino feito' : 'Jogo-treino'}</button></div>`}
    <div class="two"><button type="button" id="squadBtn">Plantel</button><button type="button" id="tacticsBtn">Táticas</button></div>
    ${saveFailed ? '<p class="hint warn">Este browser não deixa guardar: o clube perde-se ao fechar a página.</p>' : ''}
  </div>`;
}

function tableRows(club: ClubState, table: readonly Standing[], division: number): string {
  const rows = table.map((row, position) => {
    const up = position < MOVING_PLACES && division < DIVISIONS.length - 1;
    const down = position >= LEAGUE_SIZE - MOVING_PLACES && division > 0;
    const zone = up ? ' up' : down ? ' down' : '';
    const diff = row.pointsFor - row.pointsAgainst;
    return `<div class="table-row${zone}${row.club === PLAYER_CLUB ? ' mine' : ''}"><span>${position + 1}</span><span class="name">${escapeHtml(clubName(club, row.club))}</span><span>${row.wins}</span><span>${row.losses}</span><span>${diff > 0 ? '+' : ''}${diff}</span></div>`;
  }).join('');
  return `<div class="table-row head"><span></span><span class="name"></span><span>V</span><span>D</span><span>+/-</span></div>${rows}`;
}

/** O que muda na liga com este jogo, para o ecrã de resultado. */
export function matchLeagueSummary(result: MatchResult, practice: boolean): string {
  const { club, round, confidenceDelta } = result;
  const won = confidenceDelta > 0;
  const delta = `<span class="${confidenceDelta >= 0 ? 'won' : 'lost'}">${confidenceDelta >= 0 ? '+' : ''}${confidenceDelta}%</span>`;
  const standing = club.seasonReport
    ? `${place(club.seasonReport.position)} no fim da época`
    : result.series ? (result.series.decided ? (won ? `Série ganha por ${result.series.wins[0]}-${result.series.wins[1]}` : `Série perdida por ${result.series.wins[1]}-${result.series.wins[0]}`) : `Série em ${result.series.wins[0]}-${result.series.wins[1]}, há mais um jogo esta semana`) : result.cup ? (won ? `Seguimos na ${CUP_NAMES[result.cup]}` : `Eliminados da ${CUP_NAMES[result.cup]}`) : round ? `${place(leaguePosition(club))} na ${divisionName(club.division)}` : practice ? 'Jogo-treino, não conta para nada além das cartas' : 'Particular, não conta para a liga';
  const others = (round ?? []).filter(f => f.home !== PLAYER_CLUB && f.away !== PLAYER_CLUB).map(f =>
    `<div class="round-row"><span class="name">${escapeHtml(club.clubs[f.home]!.name)}</span><b>${f.score![0]}-${f.score![1]}</b><span class="name right">${escapeHtml(club.clubs[f.away]!.name)}</span></div>`).join('');
  return `<div class="league-line"><span>${standing}</span>${practice ? '' : `<span>Confiança ${delta}</span>`}</div>
    ${others ? `<div class="section-head plain"><span>${result.cup ? 'Outros jogos da ronda' : 'Outros jogos da jornada'}</span></div>${others}` : ''}`;
}

function playoffLine(record: SeasonRecord): string {
  const format = { ...PLAYOFF_FORMATS }[record.division];
  if (!format) return '';
  const text = record.playoffExit === null ? 'Não apurados' : record.playoffExit >= format.bestOf.length ? 'Vencedores!' : `Eliminados: ${format.roundNames[record.playoffExit]!.toLowerCase()}`;
  return `<div class="league-line"><span>${format.name}</span><span>${text}</span></div>`;
}

const outcomeTitle = (record: SeasonRecord): string => {
  const top = record.division === DIVISIONS.length - 1;
  switch (record.outcome) {
    case 'champion': return top && record.cups.includes('federation') && record.cups.includes('world') ? 'Triplete!' : record.cups.length > 0 ? 'Dobradinha!' : top ? 'Campeões nacionais!' : 'Campeões! E sobem!';
    case 'promoted': return 'Subiram de divisão!';
    case 'stayed': return 'Ficam onde estão';
    case 'relegated': return 'Desceram de divisão';
  }
};

/** O balanço de uma época: a tabela final, o que se ganhou e onde se joga a seguir. */
export function seasonReportHtml(club: ClubState, record: SeasonRecord): string {
  return `<div class="result">
      <div class="winner">${outcomeTitle(record)}</div>
      <div class="league-line"><span>Época ${record.season} · ${divisionName(record.division)}</span><span>${place(record.position)} · ${record.wins} V · ${record.losses} D</span></div>
      ${tableRows(club, record.table, record.division)}
      ${playoffLine(record)}
      <div class="league-line"><span>${CUP_NAMES.federation}</span><span>${record.federationExit >= FEDERATION_ROUNDS.length ? 'Vencedores!' : `Eliminados: ${cupRoundName('federation', record.federationExit).toLowerCase()}`}</span></div>
      ${record.continentalExit === null ? '' : `<div class="league-line"><span>${CUP_NAMES.continental}</span><span>${record.continentalExit >= CUP_ROUNDS.continental.length ? 'Vencedores!' : `Eliminados: ${cupRoundName('continental', record.continentalExit).toLowerCase()}`}</span></div>`}
      ${record.worldExit === null ? '' : `<div class="league-line"><span>${CUP_NAMES.world}</span><span>${record.worldExit >= CUP_ROUNDS.world.length ? 'Campeões do mundo!' : 'Perdida a final'}</span></div>`}
      ${record.topScorer ? `<div class="mvp"><span>Melhor marcador: ${escapeHtml(record.topScorer)}, ${record.topScorerPoints} pontos</span></div>` : ''}
      <div class="section-head plain"><span>Prémio da época</span><span>${record.cards.length} cartas</span></div>
      ${foundCards(record.cards)}
      ${confidenceBar(club.confidence)}
    </div>
    <div class="end-actions"><button type="button" class="primary" id="seasonContinue">${club.fired ? 'Continuar' : `Começar a época ${club.season}`}</button></div>`;
}

/** Abaixo de 3% de confiança, acaba a carreira neste clube. */
export function firedHtml(club: ClubState): string {
  return `<div class="start">
    <div class="club-week"><b>Despedido</b><span>A direção agradece os serviços e pede as chaves do pavilhão.</span></div>
    ${confidenceBar(club.confidence)}
    <div class="card-stats office-stats">${[['Épocas', club.season], ['Vitórias', club.wins], ['Derrotas', club.losses], ['Títulos', club.history.filter(r => r.outcome === 'champion').length]].map(([label, value]) => `<span><b>${value}</b>${label}</span>`).join('')}</div>
    <p class="hint">O ${escapeHtml(club.team.name)} despediu-te na semana ${club.week} da época ${club.season}.</p>
    <button type="button" class="primary" id="firedNewClub">Treinar outro clube</button>
  </div>`;
}
