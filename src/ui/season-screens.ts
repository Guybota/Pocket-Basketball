import { FREE_WEEK, LEAGUE_SIZE, MOVING_PLACES, SEASON_WEEKS, weekRound, type Standing } from '../sim/league.ts';
import { DIVISIONS, teamRating } from '../sim/teamgen.ts';
import { gradeOf } from '../sim/types.ts';
import { faceImage, lookOf } from './art/sprites.ts';
import type { TownPlace } from './art/town.ts';
import { foundCards } from './club-screens.ts';
import { PLAYER_CLUB, currentFixture, leaguePosition, leagueTable, opponentOf, swapPlayers, totalCards, type ClubState, type MatchResult, type SeasonRecord } from './club.ts';
import { energyColor, escapeHtml, playerSheet } from './panel.ts';

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
  if (!club.trainedThisWeek && totalCards(club) >= 3) return 'Há cartas por usar. Os jogadores não melhoram com boas intenções.';
  if (club.week === FREE_WEEK) return 'Não há jogo esta semana. Um particular dá cartas, mas também cansa.';
  if (played && position < MOVING_PLACES && club.division < DIVISIONS.length - 1) return 'Estamos em zona de subida. Eu não disse nada.';
  if (played && position >= LEAGUE_SIZE - MOVING_PLACES && club.division > 0) return 'Estamos em zona de descida. O presidente já não me cumprimenta.';
  return 'Nada a assinalar. O café continua mau.';
}

const MONTHS = ['Setembro', 'Outubro', 'Novembro', 'Dezembro', 'Janeiro'] as const;
const WEEKS_PER_MONTH = 4;

/** Por cima do mapa: a data, a confiança e uma etiqueta tocável em cada edifício. */
export function townOverlay(club: ClubState, places: Record<TownPlace, { x: number; y: number }>): string {
  const cards = totalCards(club);
  const week = club.week - 1;
  const month = MONTHS[Math.floor(week / WEEKS_PER_MONTH)] ?? MONTHS[MONTHS.length - 1]!;
  const chip = (place: TownPlace, id: string, label: string, disabled = false): string => {
    const { x, y } = places[place];
    // Sem isto, as etiquetas das pontas sairiam da janela.
    const left = Math.max(0.14, Math.min(0.86, x));
    return `<button type="button" class="town-chip" id="${id}" style="left:${(left * 100).toFixed(1)}%;top:${(y * 100).toFixed(1)}%" ${disabled ? 'disabled' : ''}>${label}</button>`;
  };
  return `<div class="town-bar"><span>${month} · Semana ${week % WEEKS_PER_MONTH + 1}</span><span class="${club.confidence < 15 ? 'low' : ''}">Confiança ${Math.round(club.confidence)}%</span></div>
    ${chip('arena', 'arenaChip', 'Pavilhão')}
    ${chip('office', 'officeBtn', 'Escritório')}
    ${chip('training', 'trainBtn', club.trainedThisWeek ? 'Treino feito' : `Treino (${cards})`, club.trainedThisWeek || cards === 0)}
    ${chip('federation', 'federationBtn', 'Federação')}
    ${chip('tower', 'towerChip', 'Torre')}
    ${chip('airport', 'airportChip', 'Aeroporto')}`;
}

export const TOWER_NOTE = 'A torre guarda tudo sozinha. Este clube fica guardado neste browser.';
export const AIRPORT_NOTE = 'O aeroporto ainda está em obras. Os jogos contra outros treinadores chegam mais tarde.';

/** O que fica por baixo do mapa: a secretária, o próximo jogo e o que não tem edifício próprio. */
export function cityPanel(club: ClubState, saveFailed: boolean): string {
  const fixture = currentFixture(club);
  const opponent = opponentOf(club);
  const home = !fixture || fixture.home === PLAYER_CLUB;
  const round = weekRound(club.week);
  const table = leagueTable(club);
  const own = table.find(row => row.club === PLAYER_CLUB)!;
  const position = table.indexOf(own);
  const teamCard = (team: 0 | 1, name: string, short: string, rating: number): string => `<div class="team-card">
    <span class="crest team-${team}">${escapeHtml(short)}</span>
    <b>${escapeHtml(name)}</b>
    <span>Nível ${gradeOf(rating)}</span>
  </div>`;
  return `<div class="start city">
    <p class="staff-note" id="staffNote"><b>Secretária:</b> ${escapeHtml(staffNote(club))}</p>
    <div class="fixture-label">${round === null ? `Semana livre · Particular contra ${escapeHtml(opponent.name)}` : `Jornada ${round + 1} de ${SEASON_WEEKS - 1} · ${home ? 'Em casa' : 'Fora'} · ${escapeHtml(opponent.name)} · Nível ${gradeOf(teamRating(opponent))}`}</div>
    <div class="fixture-label">Época ${club.season} · ${divisionName(club.division)}${own.played > 0 ? ` · ${place(position)}` : ''} · ${own.wins} V · ${own.losses} D</div>
    <div class="versus">${teamCard(0, club.team.name, club.team.short, teamRating(club.team))}<span class="vs">contra</span>${teamCard(1, opponent.name, opponent.short, teamRating(opponent))}</div>
    ${round === null
      ? '<div class="club-menu even"><button type="button" class="primary" id="startBtn">Particular</button><button type="button" id="skipWeekBtn">Próxima semana</button></div>'
      : '<button type="button" class="primary" id="startBtn">Jogar</button>'}
    <div class="club-menu even">
      <button type="button" id="squadBtn">Plantel</button>
      <button type="button" id="tacticsBtn">Táticas</button>
    </div>
    ${saveFailed ? '<p class="hint warn">Este browser não deixa guardar: o clube perde-se ao fechar a página.</p>' : ''}
  </div>`;
}

export interface ScreenHost {
  panel: HTMLElement;
  club(): ClubState;
  setClub(club: ClubState): void;
  back(): void;
}

/** Desenha um ecrã novo com um só ouvinte de cliques, que desaparece com ele. */
function mount(host: ScreenHost, html: string, onClick: (target: HTMLElement) => void, keepScroll = false): void {
  const scroll = host.panel.querySelector('.content')?.scrollTop ?? 0;
  host.panel.innerHTML = `<div class="train">${html}</div>`;
  const content = host.panel.querySelector('.content');
  if (content && keepScroll) content.scrollTop = scroll;
  host.panel.querySelector('.train')!.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('button');
    if (target && !(target as HTMLButtonElement).disabled) onClick(target);
  });
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

function calendarRows(club: ClubState): string {
  const current = weekRound(club.week);
  return club.rounds.map((round, index) => {
    const fixture = round.find(f => f.home === PLAYER_CLUB || f.away === PLAYER_CLUB)!;
    const home = fixture.home === PLAYER_CLUB;
    const opponent = clubName(club, home ? fixture.away : fixture.home);
    const own = fixture.score ? fixture.score[home ? 0 : 1] : 0;
    const other = fixture.score ? fixture.score[home ? 1 : 0] : 0;
    const score = fixture.score
      ? `<b class="${own > other ? 'won' : 'lost'}">${own}-${other}</b>`
      : '<b></b>';
    return `<div class="calendar-row${index === current ? ' mine' : ''}"><span>J${index + 1}</span><span>${home ? 'Casa' : 'Fora'}</span><span class="name">${escapeHtml(opponent)}</span>${score}</div>`;
  }).join('');
}

/** Classificação e calendário, como o edifício da federação do original. */
export function openFederation(host: ScreenHost): void {
  let tab: 'table' | 'calendar' = 'table';
  const render = (): void => {
    const club = host.club();
    mount(host, `<div class="tabs" role="tablist">
        <button type="button" role="tab" data-fed-tab="table" aria-selected="${tab === 'table'}">Classificação</button>
        <button type="button" role="tab" data-fed-tab="calendar" aria-selected="${tab === 'calendar'}">Calendário</button>
      </div>
      <div class="content">
        ${tab === 'table' ? tableRows(club, leagueTable(club), club.division) : calendarRows(club)}
        ${tab === 'table' ? `<p class="hint">${divisionName(club.division)}. Os ${MOVING_PLACES} primeiros sobem e os ${MOVING_PLACES} últimos descem.</p>` : ''}
      </div>
      <div class="train-actions"><button type="button" class="primary" id="federationBack">Voltar</button></div>`, target => {
      if (target.dataset.fedTab) {
        tab = target.dataset.fedTab as typeof tab;
        render();
      } else if (target.id === 'federationBack') {
        host.back();
      }
    });
  };
  render();
}

/** Titulares e banco. Tocar em dois jogadores troca-os; o «i» abre a ficha. */
export function openSquad(host: ScreenHost): void {
  let selected: number | null = null;
  let sheet: number | null = null;

  const list = (club: ClubState): string => {
    const row = (index: number): string => {
      const player = club.team.roster[index]!;
      const stats = club.stats[player.name];
      const energy = 1 - player.fatigue;
      return `<div class="squad-row${selected === index ? ' selected' : ''}">
        <button type="button" class="squad-main" data-slot="${index}" aria-pressed="${selected === index}">
          <img class="face team-0" alt="" src="${faceImage(lookOf(player, 'blue'))}">
          <span class="pos">${player.position}</span>
          <span class="name">${escapeHtml(player.name)}</span>
          <span class="bar"><i style="width:${Math.round(energy * 100)}%;background:${energyColor(energy)}"></i></span>
          <span class="num">${stats ? stats.points : 0}</span>
        </button>
        <button type="button" class="squad-info" data-sheet="${index}" aria-label="Ver a ficha de ${escapeHtml(player.name)}">i</button>
      </div>`;
    };
    const roster = club.team.roster.map((_, index) => index);
    return `<div class="train-title"><b>Plantel</b><span>${selected === null ? 'Toca em dois para os trocar' : 'Com quem troca?'}</span></div>
      <div class="content">
        <div class="section-head team-0"><span>Titulares</span><span>Energia · Pts</span></div>
        ${roster.slice(0, 5).map(row).join('')}
        <div class="section-head plain"><span>Banco</span><span>Entra primeiro o da mesma posição</span></div>
        ${roster.slice(5).map(row).join('')}
      </div>
      <div class="train-actions"><button type="button" class="primary" id="squadBack">Voltar</button></div>`;
  };

  const sheetHtml = (club: ClubState, index: number): string => {
    const player = club.team.roster[index]!;
    const stats = club.stats[player.name] ?? { games: 0, points: 0, rebounds: 0, assists: 0 };
    const energy = 1 - player.fatigue;
    const side = `<div class="card-live">
      <span class="card-label">Potencial ${gradeOf(player.potential)}</span>
      <span class="card-label">Energia</span>
      <span class="bar"><i style="width:${Math.round(energy * 100)}%;background:${energyColor(energy)}"></i></span>
      <div class="card-stats two">${[['Jog', stats.games], ['Pts', stats.points], ['Res', stats.rebounds], ['Ass', stats.assists]].map(([label, value]) => `<span><b>${value}</b>${label}</span>`).join('')}</div>
    </div>`;
    return `<div class="content"><div class="card">${playerSheet(player, lookOf(player, 'blue'), 0, index + 4, club.team.name, side)}</div></div>
      <div class="train-actions">
        <button type="button" data-sheet-step="-1" aria-label="Jogador anterior">‹</button>
        <button type="button" class="primary" data-sheet-close>Fechar</button>
        <button type="button" data-sheet-step="1" aria-label="Jogador seguinte">›</button>
      </div>`;
  };

  const render = (keepScroll = false): void => {
    const club = host.club();
    mount(host, sheet === null ? list(club) : sheetHtml(club, sheet), target => {
      const data = target.dataset;
      const size = host.club().team.roster.length;
      if (target.id === 'squadBack') {
        host.back();
      } else if (data.sheet !== undefined) {
        sheet = Number(data.sheet);
        selected = null;
        render();
      } else if (data.sheetClose !== undefined) {
        sheet = null;
        render();
      } else if (data.sheetStep !== undefined) {
        sheet = (sheet! + Number(data.sheetStep) + size) % size;
        render();
      } else if (data.slot !== undefined) {
        const index = Number(data.slot);
        if (selected === null) {
          selected = index;
        } else {
          if (selected !== index) host.setClub(swapPlayers(host.club(), selected, index));
          selected = null;
        }
        render(true);
      }
    }, keepScroll);
  };
  render();
}

const OUTCOME_LABEL = { champion: 'Campeões', promoted: 'Subiram', stayed: 'Ficaram', relegated: 'Desceram' } as const;

/** O historial do clube e o botão para começar de novo. */
export function openOffice(host: ScreenHost, onReset: () => void): void {
  const club = host.club();
  const titles = club.history.filter(record => record.outcome === 'champion').length;
  const history = club.history.length === 0
    ? '<p class="hint">Ainda não acabou nenhuma época.</p>'
    : [...club.history].reverse().map(record => `<div class="calendar-row history"><span>É${record.season}</span><span class="name">${divisionName(record.division)}</span><span>${record.position + 1}</span><b>${OUTCOME_LABEL[record.outcome]}</b></div>`).join('');
  mount(host, `<div class="train-title"><b>Gabinete</b><span>${escapeHtml(club.team.name)}</span></div>
    <div class="content">
      ${confidenceBar(club.confidence)}
      <div class="card-stats office-stats">${[['Épocas', club.season], ['Vitórias', club.wins], ['Derrotas', club.losses], ['Títulos', titles]].map(([label, value]) => `<span><b>${value}</b>${label}</span>`).join('')}</div>
      <div class="section-head plain"><span>Historial</span></div>
      ${history}
      <button type="button" class="quiet" id="resetBtn">Novo clube</button>
    </div>
    <div class="train-actions"><button type="button" class="primary" id="officeBack">Voltar</button></div>`, target => {
    if (target.id === 'officeBack') host.back();
    else if (target.id === 'resetBtn') onReset();
  });
}

/** O que muda na liga com este jogo, para o ecrã de resultado. */
export function matchLeagueSummary(result: MatchResult): string {
  const { club, round, confidenceDelta } = result;
  const delta = `<span class="${confidenceDelta >= 0 ? 'won' : 'lost'}">${confidenceDelta >= 0 ? '+' : ''}${confidenceDelta}%</span>`;
  const standing = club.seasonReport
    ? `${place(club.seasonReport.position)} no fim da época`
    : round ? `${place(leaguePosition(club))} na ${divisionName(club.division)}` : 'Particular, não conta para a liga';
  const others = (round ?? []).filter(f => f.home !== PLAYER_CLUB && f.away !== PLAYER_CLUB).map(f =>
    `<div class="round-row"><span class="name">${escapeHtml(club.clubs[f.home]!.name)}</span><b>${f.score![0]}-${f.score![1]}</b><span class="name right">${escapeHtml(club.clubs[f.away]!.name)}</span></div>`).join('');
  return `<div class="league-line"><span>${standing}</span><span>Confiança ${delta}</span></div>
    ${others ? `<div class="section-head plain"><span>Outros jogos da jornada</span></div>${others}` : ''}`;
}

const outcomeTitle = (record: SeasonRecord): string => {
  const top = record.division === DIVISIONS.length - 1;
  switch (record.outcome) {
    case 'champion': return top ? 'Campeões nacionais!' : 'Campeões! E sobem!';
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
