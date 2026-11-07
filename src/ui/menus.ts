// Os menus do jogo: em cima a ficha ou a cena, em baixo as decisões. A cidade e o jogo em si ficam em main.ts.
import { reducedMotion } from './settings.ts';
import { BALANCE as B } from '../sim/balance.ts';
import { CUP_NAMES, CUP_ROUNDS, FEDERATION_ROUNDS, type CupName } from '../sim/cup.ts';
import { seriesWinner, seriesWins } from '../sim/playoff.ts';
import { drawBracket, fullBracket, type BracketRound, type BracketSlot } from './art/bracket.ts';
import { LEAGUE_SIZE, MOVING_PLACES, type Standing } from '../sim/league.ts';
import { setTactics } from '../sim/match.ts';
import { DIVISIONS, teamRating } from '../sim/teamgen.ts';
import { CARD_IDS, CARDS, COMBOS, MAX_CARDS_PER_PLAYER, previewGains, type CardCategory, type CardId, type TrainingResult } from '../sim/training.ts';
import { ATTRIBUTE_KEYS, MAX_FOCUS, MAX_OPTIONS, NEUTRAL_TACTICS, gradeOf, type Attributes, type Player, type Tactics, type Team } from '../sim/types.ts';
import { CATEGORIES, CATEGORY_INFO, cardImage } from './art/cards.ts';
import { clubIdentity, kitAgainst } from './art/identity.ts';
import { EMBLEM_BORDER_LIST, EMBLEM_PATTERN_LIST, EMBLEM_SHAPE_LIST, EMBLEM_SYMBOL_LIST, KIT_PATTERNS, PALETTE, emblemCanvas, emblemImage, emblemLetters, type ClubKit, type Emblem, type KitPattern } from './art/kit.ts';
import { attributeIcon, controlIcon, iconFrom, subsIcon } from './art/icons.ts';
import { leagueIcon } from './art/leagues.ts';
import { portraitImage } from './art/portrait.ts';
import { drawSceneFrame, drawTacticsBoard, type SceneKind } from './art/scenes.ts';
import { drawFlagScene } from './art/flag.ts';
import { drawMatchPoster, drawWardrobe, kitImage } from './art/wardrobe.ts';
import { INK, drawSprite, lookOf, spriteImage, type Look, type PoseName } from './art/sprites.ts';
import { clubSeasons, seasonLines, type SeasonLine, CLUB_NAME_MAX, PLAYER_CLUB, SPECIAL_RIVALS, activeKit, aiTeam, applyRenewals, rivalTeam, cancelOffer, cupRoundName, cupStatus, currentFixture, leagueTable, makeOffer, marketList, salaryFor, sellPlayer, surplus, totalSalaries, transferFee, transferWindowOpen, yearsAtClub, type MarketEntry, opponentId, playoffFormat, renameClub, setClubShort, swapPlayers, totalCards, trainOne, type ClubState } from './club.ts';
import { officialLabel } from './season-screens.ts';
import { TACTIC_ROWS, facilitiesHtml, objectiveHtml, recordsHtml, tacticValue } from './club-screens.ts';
import { buyFacility, type FacilityId } from './club.ts';
import type { MatchView, Sound } from './match-view.ts';
import type { MusicTheme } from './music.ts';
import { MOVE_INFO, OFF_BALL_INFO, ON_BALL_INFO } from './narrate.ts';
import { ATTRIBUTE_LABELS, SLOT_NAMES, legendHead, optionMark, optionsControls, pickOption, board, boardPlayer, bodyStars, escapeHtml as esc, panelContent, slotCode } from './panel.ts';
import { drawShelf, drawTrophy, trophyList } from './trophies.ts';
import { assistantReport, assistantPreGame, presidentBoard, presidentRenewals, say } from './staff.ts';

export type GameKind = 'official' | 'friendly' | 'practice';
type Screen = 'create' | 'market' | 'renewals' | 'rival' | 'squad' | 'train' | 'trainCards' | 'combos' | 'report' | 'emblem' | 'kitEdit' | 'offers' | 'pre' | 'tactics' | 'kit' | 'halfStats' | 'federation' | 'office';
type GoTo = Screen | 'town';
type OfficeItem = 'board' | 'trophies' | 'records' | 'facilities' | 'history' | 'reset';

export interface MenuHost {
  top: HTMLElement;
  panel: HTMLElement;
  club(): ClubState;
  setClub(club: ClubState): void;
  /** O tamanho do ecrã de cima, em píxeis de arte. */
  topSize(): readonly [number, number];
  /** Na vertical, um ecrã pode pedir a parte de cima mais alta: diz quanto o painel precisa, e o resto vai para o desenho (0 é o normal). */
  tallTop(panel: number): void;
  /** O jogo a decorrer, se estivermos no intervalo. */
  match(): MatchView | undefined;
  showMenus(): void;
  toTown(): void;
  kickOff(kind: GameKind, rivalId: number): void;
  secondHalf(): void;
  halfSubs(): void;
  newClub(): void;
  sound(name: Sound): void;
  music(theme: MusicTheme): void;
}

let host: MenuHost;
let club: ClubState;
let active = false;
let screen: Screen = 'pre';
let selected = 0;
let swapping: number | null = null;
// Treina-se um jogador de cada vez: estas são as cartas dele, até carregar em Treinar.
let picked: CardId[] = [];
let focusCard: CardId | null = null;
let lastTraining: { before: Player; result: TrainingResult; cards: CardId[]; isNew: boolean; index: number } | null = null;
let federationTab: 'table' | 'calendar' | 'round' | 'cup' | 'playoffs' | 'ladder' = 'table';
// A divisão que se está a ver na federação, e o jogador escolhido no plantel de um clube.
let federationDivision = 0;
// -1 é a ficha do clube; a partir de 0, a ficha desse jogador do plantel.
let federationPlayer = -1;
let federationScroll = 0;
// No ecrã do adversário: as notas ou os números da época.
let rivalStats = false;
// A opção de ataque que se está a escolher na lista: 0, 1, ou nenhuma.
let optionPicking: number | null = null;
let federationClub = PLAYER_CLUB;
let officeItem: OfficeItem = 'board';
let selectedTrophy = 0;
let offerKind: Exclude<GameKind, 'official'> = 'practice';
let offerClub = 0;
let backFromSquad: GoTo = 'town';
let tacticsBack: GoTo = 'town';
let kitEditBack: GoTo = 'office';
let emblemBack: GoTo = 'office';
let federationRound = 0;
let cupView: CupName = 'federation';
// Quem fica, enquanto se decidem as renovações.
let keep = new Set<string>();
let marketPick = 0;
// Vender pede dois toques: o segundo confirma.
let selling = false;
let kitEditing = 'home';
// A peça do equipamento e a cor do emblema que a paleta pinta, e a página da grelha de desenhos.
let kitPart: 'jersey' | 'second' | 'shorts' | 'trim' = 'jersey';
let emblemPart: 'primary' | 'secondary' | 'accent' = 'primary';
let emblemPage = 0;
let gameKind: GameKind = 'official';
let half = false;

const element = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const commit = (next: ClubState): void => {
  club = next;
  host.setClub(next);
};
const lookFor = (p: Player): Look => ({ ...lookOf(p, 'blue'), custom: activeKit(club) });
const kitById = (id: string): ClubKit => club.kits.find(kit => kit.id === id)!;
const shirtOf = (p: Player): number => club.shirts[p.name] ?? club.team.roster.indexOf(p) + 4;

// Só para a grelha do treino, onde a carta tem 50 px; ao tocar nela aparece o nome inteiro, que é o de todos os outros ecrãs.
const SHORT_NAMES: Record<CardId, string> = {
  readDefense: 'Ler Defesa', pickRoll: 'Pick&Roll', whiteboard: 'Quadro', video: 'Vídeo', transition: 'Transição',
  shooting: 'Lançar', dribble: 'Drible', bouncePass: 'Passe', freeThrows: 'Livres', hookShot: 'Gancho',
  sprints: 'Sprints', weights: 'Pesos', jumps: 'Saltos', longRun: 'Corrida', agility: 'Agilidade',
  soup: 'Sopa', nap: 'Sesta', massage: 'Massagem', dance: 'Bailarico', fado: 'Fado',
};

/* ---------- Ícones, desenhados aqui para serem nossos ---------- */
const ICON_BALL = iconFrom(['..oxoo..', '.ooxooo.', 'xoxooxox', 'ooxxxxoo', 'xoxooxox', '.ooxooo.', '..oxoo..'], '#e8622a', null, 12);
const ICON_SQUAD = iconFrom(['.xx...xx.', 'x##x.x##x', 'x##x.x##x', '.xx...xx.', 'x##x.x##x', 'x##x.x##x', 'x##x.x##x'], '#2b5fd9', null, 14);
const ICON_TACTICS = iconFrom(['xxxxxxxxxx', 'x#o#####xx', 'x#########', 'x##x#o####', 'x###x#####', 'x####x####', 'x#####o##x', 'xxxxxxxxxx'], '#17737a', null, 14);
const ICON_KIT = iconFrom(['..xx..xx..', '.x##xx##x.', 'x########x', 'xxx####xxx', '..x####x..', '..x####x..', '..xxxxxx..'], '#e8622a', null, 14);
const ICON_GO = iconFrom(['..........', '.xxxxxx.xx', 'x######x#x', 'x##xx##xxx', 'x##xx##x..', 'x######x..', '.xxxxxx...'], '#ffffff', null, 14);

/* ---------- Pedaços de ecrã ---------- */
const ownCrest = (size = 20): string => `<img class="emblem" alt="Emblema do ${esc(club.team.name)}" style="width:${size}px;height:${size}px" src="${emblemImage(club.emblem)}">`;
const grade = (value: number): string => {
  const letter = gradeOf(value);
  return `<b class="gr gr-${letter}">${letter}</b>`;
};
/** A condição física de semana para semana, como no original: verde, amarelo, vermelho, ou a cruz de lesionado. */
const conditionLabel = (p: Player): string => (p.injuryWeeks ? `Lesionado · ${p.injuryWeeks} sem.` : p.fatigue >= 0.35 ? 'Condição: exausto' : p.fatigue >= 0.15 ? 'Condição: cansado' : 'Condição: boa');
const dot = (p: Player): string => `<i class="edot${p.injuryWeeks ? ' hurt' : p.fatigue >= 0.35 ? ' low' : p.fatigue >= 0.15 ? ' mid' : ''}" title="${conditionLabel(p)}"></i>`;
/** A etiqueta do lugar na lista: os cinco papéis em campo, e os suplentes. */
const slotBadge = (index: number): string => `<span class="ppos ppos-${slotCode(index)}">${slotCode(index)}</span>`;
const bar = (...buttons: string[]): string => `<div class="actions">${buttons.join('')}</div>`;
const backBtn = (to: GoTo): string => `<button type="button" class="back" data-go="${to}">‹ Voltar</button>`;
const chevrons = (potential: number): string => {
  const on = Math.round((potential / 100) * 12);
  return `<div class="chevrons">${Array.from({ length: 12 }, (_, n) => `<i class="${n < on ? 'on' : ''}${n < on && n >= 8 ? ' hot' : ''}"></i>`).join('')}</div>`;
};

function playerCard(index: number, extra?: string): string {
  const p = club.team.roster[index]!;
  const stats = club.stats[p.name] ?? { games: 0, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 };
  const recent = club.recentTraining[p.name] ?? [];
  // As últimas 4 semanas, da mais antiga para esta: um visto nas que treinou, um X vermelho nas que esteve lesionado.
  const history = [3, 2, 1, 0].map(n => {
    const week = club.season * 100 + club.week - n;
    if (recent.includes(-week) || (n === 0 && p.injuryWeeks)) return `<i><img alt="Lesionado" src="${iconFrom(['##....##', '.##..##.', '..####..', '...##...', '..####..', '.##..##.', '##....##'], '#cf3a2c', null, 10)}"></i>`;
    return `<i>${recent.includes(week) ? `<img alt="Treinou" src="${iconFrom(['.......#', '......##', '#....##.', '##..##..', '.####...', '..##....'], '#2f8f5b', null, 10)}">` : ''}</i>`;
  }).join('<u></u>');
  return `<div class="pcard">
    <header>${ownCrest()}<span>${index < 5 ? SLOT_NAMES[index] : 'Suplente'}</span><b>${esc(p.name)}</b>${bodyStars(p)}</header>
    <div class="pbody">
      <img class="pportrait" alt="Retrato de ${esc(p.name)}" src="${portraitImage(lookFor(p))}">
      <div class="pshirt" aria-label="Camisola ${shirtOf(p)}">${shirtOf(p)}</div>
      <div>
        <div class="grades">${ATTRIBUTE_KEYS.map(key => `<img alt="" title="${ATTRIBUTE_LABELS.find(([k]) => k === key)![1]}" src="${attributeIcon(key)}">`).join('')}</div>
        <div class="grades">${ATTRIBUTE_KEYS.map(key => grade(p.attributes[key])).join('')}</div>
        <div class="kv"><span>Sem bola</span><b>${OFF_BALL_INFO[p.offBall].name}</b></div>
        <div class="kv"><span>Com bola</span><b>${ON_BALL_INFO[p.onBall].name}</b></div>
        <div class="kv"><span>Potencial</span>${chevrons(p.potential)}</div>
      </div>
    </div>
    ${extra ?? ''}${`<div class="pfoot${extra ? ' spare' : ''}">
      <div class="rows">
        <div>${dot(p)}<span>${conditionLabel(p)}</span></div>
        <div><span>Na equipa</span><span>${yearsAtClub(club, p.name)} ép.</span></div>
        <div><span>Jogos</span><span>${stats.games}</span></div>
        <div><span>Salário</span><span>${club.salaries[p.name] ?? salaryFor(p)} mil</span></div>
        <div class="history" title="Treino das últimas 4 semanas">${history}</div>
      </div>
      <div>
        <table class="seasons"><tr><th>Ép</th><th>Equipa</th><th>J</th><th>Pts</th><th>Res</th><th>Ass</th></tr>
          <tr><td>${club.season}</td><td>${esc(club.team.short)}</td><td>${stats.games}</td><td>${stats.points}</td><td>${stats.rebounds}</td><td>${stats.assists}</td></tr></table>
        <div style="padding:2px 0">Movimentos: ${p.moves.map(m => MOVE_INFO[m].name).join(', ') || 'nenhum'}</div>
      </div>
    </div>`}
  </div>`;
}

const attributeHead = ATTRIBUTE_KEYS.map(key => `<img alt="${ATTRIBUTE_LABELS.find(([k]) => k === key)![1]}" src="${attributeIcon(key)}">`).join('');

function squadRows(renderEnd: (p: Player, index: number) => string): string {
  const row = (p: Player, index: number): string => `<button type="button" class="prow${index >= B.matchSquad ? ' reserve' : index >= 5 ? ' bench' : ''}${swapping === index ? ' swapfrom' : ''}${screen === 'train' && club.trainedThisWeek.includes(p.name) ? ' trained' : ''}" data-player="${index}" aria-pressed="${selected === index}">
      ${slotBadge(index)}<span class="pnum">${shirtOf(p)}</span><span class="name">${esc(p.name)}${optionMark(liveTactics().options, p.name)}</span>${dot(p)}${renderEnd(p, index)}
    </button>`;
  const rows = club.team.roster.map(row);
  // Para lá da ficha de jogo ficam os reservas: trocam-se para dentro com o ⇄, como os outros.
  if (rows.length > B.matchSquad) rows.splice(B.matchSquad, 0, '<div class="starters plain"><span>Reservas · fora da ficha de jogo</span></div>');
  return rows.join('');
}

/* ---------- Ecrãs ---------- */
interface Rendered {
  top: string;
  bottom: string;
  after?: () => void;
}

const fullCanvas = (id: string, kind?: SceneKind): string => {
  const [width, height] = host.topSize();
  return `<canvas class="full" id="${id}" width="${width}" height="${height}"${kind ? ` data-kind="${kind}"` : ''}></canvas>`;
};
const inside = (html: string): string => `<div class="patterned">${html}</div>`;

function squadScreen(): Rendered {
  return {
    top: inside(playerCard(selected)),
    bottom: `${legendHead('thead', `<span>Pos</span><span>#</span><span>Jogador</span><span aria-label="Legenda">?</span>${attributeHead}`)}
      <div class="scroll">
        <div class="starters"><span>Titulares</span><span>${swapping === null ? 'O lugar na lista é o papel em campo' : 'Toca em quem entra para o lugar dele'}</span></div>
        ${squadRows(p => ATTRIBUTE_KEYS.map(key => grade(p.attributes[key])).join('')).replace('<button type="button" class="prow bench', '<div class="starters plain"><span>Banco</span></div><button type="button" class="prow bench')}
      </div>
      ${bar(backBtn(backFromSquad), `<button type="button" data-act="swap" aria-pressed="${swapping !== null}">${swapping === null ? '⇄ Trocar' : 'Cancelar'}</button>`, backFromSquad === 'town' ? `<button type="button" data-act="sell" aria-pressed="${selling}" ${club.team.roster.length <= 10 ? 'disabled' : ''}>${selling ? `Vender por ${transferFee(club.team.roster[selected]!)}?` : 'Vender'}</button>` : '<button type="button" data-go="tactics">Táticas</button>')}`,
  };
}

function trainSlots(): string {
  return `<div class="slots">${Array.from({ length: MAX_CARDS_PER_PLAYER }, (_, n) => {
    const id = picked[n];
    return id
      ? `<button type="button" class="slot" data-remove="${id}" aria-label="Tirar ${CARDS[id].name}"><img alt="" src="${cardImage(id, CARDS[id].category)}"><span>${CARDS[id].name}</span></button>`
      : '<div class="slot empty">Vazio</div>';
  }).join('')}</div>`;
}

const leftOf = (id: CardId): number => (club.cards[id] ?? 0) - picked.filter(c => c === id).length;

/** A lista: as notas de todos, como no plantel. Escolhe-se um jogador e treina-se esse. */
function trainScreen(): Rendered {
  const player = club.team.roster[selected]!;
  const done = club.trainedThisWeek.includes(player.name);
  const hurt = (player.injuryWeeks ?? 0) > 0;
  return {
    top: inside(playerCard(selected)),
    bottom: `${legendHead('thead', `<span>Pos</span><span>#</span><span>Jogador</span><span aria-label="Legenda">?</span>${attributeHead}`)}
      <div class="scroll">${squadRows(p => ATTRIBUTE_KEYS.map(key => grade(p.attributes[key])).join(''))}</div>
      ${bar(`<button type="button" class="icon back" data-go="town" aria-label="Voltar" title="Voltar"><img class="ink" alt="" src="${controlIcon('back')}"></button>`, `<button type="button" class="icon" data-act="swap" aria-pressed="${swapping !== null}" aria-label="${swapping === null ? 'Trocar de lugar' : 'Cancelar a troca'}" title="Trocar"><img alt="" src="${subsIcon()}"></button>`, `<button type="button" class="icon" data-go="tactics" aria-label="Táticas" title="Táticas"><img class="ink" alt="" src="${controlIcon('board')}"></button>`, `<button type="button" class="icon" data-go="combos" aria-label="Combos: ${club.knownCombos.length} de ${COMBOS.length}" title="Combos"><img class="ink" alt="" src="${controlIcon('book')}"><b class="badge">${club.knownCombos.length}/${COMBOS.length}</b></button>`, `<button type="button" class="icon primary" data-act="openCards" aria-label="${hurt ? 'Lesionado' : done ? 'Já treinou' : `Treinar ${esc(player.name)}`}" title="${hurt ? 'Lesionado' : done ? 'Já treinou' : `Treinar ${esc(player.name)}`}" ${done || hurt || totalCards(club) === 0 ? 'disabled' : ''}><img class="ink" alt="" src="${controlIcon('train')}"></button>`)}`,
  };
}

/** As cartas deste jogador. O treino acontece logo aqui, só para ele. */
function trainCardsScreen(): Rendered {
  const preview = previewGains(club.team.roster[selected]!, picked, club.knownCombos);
  // Nunca se diz quanto: só que sobe, e se é pouco ou muito.
  const gains = ATTRIBUTE_KEYS.filter(key => preview[key]).map(key => `${ATTRIBUTE_LABELS.find(([k]) => k === key)![1]} <b>${(preview[key]! > 0 ? '+' : '-').repeat(gainSize(preview[key]!))}</b>`).join(' · ');
  const frameFor = (category: CardCategory): string => `<div class="frame"><span>${CATEGORY_INFO[category].name}</span>${CARD_IDS.filter(id => CARDS[id].category === category).map(id => {
    const left = leftOf(id);
    const chosen = picked.includes(id);
    return `<button type="button" class="gcard" style="--cat:${CATEGORY_INFO[category].color}" data-card="${id}" aria-pressed="${chosen}" aria-label="${CARDS[id].name}, ${Math.max(0, left)} disponíveis" ${!chosen && (left <= 0 || picked.length >= MAX_CARDS_PER_PLAYER) ? 'disabled' : ''}><b>${SHORT_NAMES[id]}</b><img alt="" src="${cardImage(id, category)}"><em>×${Math.max(0, left)}</em></button>`;
  }).join('')}</div>`;
  return {
    top: inside(playerCard(selected, trainSlots())),
    bottom: `<div class="whiteboard">${CATEGORIES.map(frameFor).join('')}</div>
      <div class="info">${focusCard ? `<b>${CARDS[focusCard].name}</b>. ` : ''}${gains || 'Escolhe até três cartas diferentes. Há combinações secretas por descobrir.'}</div>
      ${bar(backBtn('train'), `<button type="button" class="primary" data-act="trainNow" ${picked.length ? '' : 'disabled'}>Treinar</button>`)}`,
  };
}

/** O último combo descoberto, com as cartas desenhadas, para o caderno não abrir vazio. */
function lastCombo(): string {
  const combo = COMBOS.find(c => c.id === club.knownCombos[club.knownCombos.length - 1]);
  if (!combo) return '<p class="hint">Ainda nenhum. Junta três cartas no treino para descobrires o primeiro.</p>';
  return `<div class="lastcombo"><span>O último descoberto</span><b>${esc(combo.name)}</b><div>${combo.cards.map(id => `<img alt="${esc(CARDS[id].name)}" src="${cardImage(id, CARDS[id].category)}">`).join('')}</div></div>`;
}

function combosScreen(): Rendered {
  const rows = COMBOS.map(combo => {
    const known = club.knownCombos.includes(combo.id);
    return `<tr><td>${known ? esc(combo.name) : '???'}</td><td>${known ? combo.cards.map(id => CARDS[id].name).join(' + ') : '???'}</td></tr>`;
  }).join('');
  return {
    top: inside(`<div class="note"><header><b>Caderno de combos</b><span>${club.knownCombos.length} de ${COMBOS.length}</span></header><div class="inner">
      <div class="quote">Cada combo descoberto fica aqui escrito. Os outros ficam por descobrir.</div>
      <div class="comboprogress"><i style="width:${Math.round((club.knownCombos.length / COMBOS.length) * 100)}%"></i></div>
      ${lastCombo()}
    </div></div>`),
    bottom: `<div class="scroll"><table class="mini-table"><tr><th>Combo</th><th>Cartas</th></tr>${rows}</table></div>${bar(backBtn('train'))}`,
  };
}

/** O resultado do treino: num combo, as cartas juntam-se e dão lugar ao nome dele. */
function reportScreen(): Rendered {
  const { before, result, cards, isNew, index } = lastTraining!;
  const combo = result.combo;
  const place = [-110, 0, 110];
  // Como no original: cada atributo é uma barra que sobe até à nota seguinte, e as frases dizem só se subiu pouco ou muito.
  const bars = ATTRIBUTE_KEYS.map(key => {
    const from = before.attributes[key];
    const to = result.player.attributes[key];
    const [floor, ceiling] = gradeBand(to);
    const start = from < floor ? 0 : from >= ceiling ? 100 : ((from - floor) / (ceiling - floor)) * 100;
    const end = ((to - floor) / (ceiling - floor)) * 100;
    const next = ceiling >= 100 ? 'S' : gradeOf(ceiling);
    return `<div class="bar7${result.gains[key] ? ' changed' : ''}" style="--from:${start.toFixed(0)}%;--to:${end.toFixed(0)}%;--c:${ATTRIBUTE_COLORS[key]}"><b class="gr gr-${next} next" title="Nota seguinte">${next}</b><div class="track"><i class="fill"></i><img alt="${ATTRIBUTE_LABELS.find(([k]) => k === key)![1]}" src="${attributeIcon(key)}"></div>${grade(to)}</div>`;
  }).join('');
  const rows = `<div class="bars">${bars}</div><div class="gainlines">${ATTRIBUTE_KEYS.filter(key => result.gains[key]).map(key => {
    const gain = result.gains[key]!;
    const [article, name] = ATTRIBUTE_PHRASES[key];
    const how = gain < 0 ? 'desceu' : 'subiu';
    const much = gainSize(gain) === 1 ? ' ligeiramente' : gainSize(gain) === 3 ? ' bastante' : '';
    // O fundo é escuro: a cor do atributo clareada, para a técnica e o lançamento se lerem.
    const was = gradeOf(before.attributes[key]);
    const now = gradeOf(result.player.attributes[key]);
    const step = was === now ? `continua ${now}` : `${was} → ${now}`;
    return `<div>${article} <b style="color:color-mix(in srgb, ${ATTRIBUTE_COLORS[key]} 60%, #fff)">${name}</b> ${how}${much}: ${step}.</div>`;
  }).join('') || '<div>Nenhum atributo mudou.</div>'}<div class="gainhint">Em cima, a nota seguinte; em baixo, a de agora. Só mudaram os atributos destacados.</div></div>`;
  const learned = [
    result.newMove ? `Aprendeu ${MOVE_INFO[result.newMove].name}` : '',
    result.moveBlocked ? 'Já sabe 2 movimentos: não aprendeu mais nenhum' : '',
    combo?.offBall ? `Sem bola passa a ${OFF_BALL_INFO[combo.offBall].name}` : '',
    combo?.onBall ? `Com bola passa a ${ON_BALL_INFO[combo.onBall].name}` : '',
    combo && !combo.move && !combo.offBall && !combo.onBall ? `${combo.name}: estas cartas juntas valem mais do que separadas` : '',
  ].filter(Boolean).map(line => `<div class="learned">${line}</div>`).join('');
  const heroCards = cards.map((id, n) => `<img class="fx-card" style="--x:${place[cards.length === 2 ? n * 2 : n]! * (cards.length === 1 ? 0 : 1)}px" alt="${CARDS[id].name}" src="${cardImage(id, CARDS[id].category)}">`).join('');
  const sparks = Array.from({ length: 12 }, (_, n) => `<i class="fx-spark" style="--dx:${Math.round(Math.cos((n / 12) * Math.PI * 2) * 150)}px;--dy:${Math.round(Math.sin((n / 12) * Math.PI * 2) * 110)}px"></i>`).join('');
  return {
    top: combo
      ? `<button type="button" class="combofx" data-act="skipFx" aria-label="Ver já o resultado">
          <span class="fx-rays"></span>
          <canvas id="fxScene" class="fx-scene" width="90" height="50"></canvas>
          ${heroCards}
          ${sparks}
          <span class="fx-flash"></span>
          <span class="fx-text"><span class="k">${isNew ? 'Combo secreto descoberto!' : 'Combo!'}</span><span class="n">${esc(combo.name)}</span><span class="cs">${cards.map(id => `<img alt="" src="${cardImage(id, CARDS[id].category)}">`).join('')}</span></span>
        </button>`
      : inside(playerCard(index, `<div class="slots">${cards.map(id => `<div class="slot"><img alt="" src="${cardImage(id, CARDS[id].category)}"><span>${CARDS[id].name}</span></div>`).join('')}</div>`)),
    bottom: `<div class="trainpop after${combo ? ' delayed' : ''}"><div class="box"><div class="matchhead"><span>Treino de ${esc(before.name)}</span><b>${combo ? esc(combo.name) : 'Sem combo'}</b></div><div class="gains">${rows}${learned}</div>${bar('<button type="button" class="primary" data-go="train">Continuar</button>')}</div></div>`,
    // As barras sobem depois de o ecrã aparecer, senão não havia nada a subir.
    // As barras precisam de ter o estilo inicial calculado antes de receberem a classe final, senão saltam sem transição:
    // ler a altura força esse cálculo. Com requestAnimationFrame, num computador rápido a classe chegava antes do primeiro
    // cálculo de estilo e a barra aparecia já no fim.
    after: () => document.querySelectorAll<HTMLElement>('.bar7').forEach(el => {
      void el.offsetHeight;
      el.classList.add('go');
    }),
  };
}

/** Pouco, normal ou bastante: o tamanho de uma subida, sem nunca dizer o número. */
const gainSize = (gain: number): number => (Math.abs(gain) < 0.8 ? 1 : Math.abs(gain) < 2 ? 2 : 3);
/** O chão e o teto da nota em que um valor está. */
const gradeBand = (value: number): [number, number] => {
  const floors = [0, 17, 34, 50, 67, 84, 100];
  const i = floors.findIndex((floor, n) => value >= floor && value < (floors[n + 1] ?? 101));
  return [floors[i]!, floors[i + 1] ?? 100];
};
const ATTRIBUTE_COLORS: Record<keyof Attributes, string> = { shooting: '#7246c4', speed: '#2f9b6a', stamina: '#d9772b', technique: '#3a4252', strength: '#b8860b', jumping: '#2b8fd0', willpower: '#cf3a2c' };
const ATTRIBUTE_PHRASES: Record<keyof Attributes, [string, string]> = { shooting: ['O', 'lançamento'], speed: ['A', 'velocidade'], stamina: ['A', 'resistência'], technique: ['A', 'técnica'], strength: ['O', 'físico'], jumping: ['O', 'salto'], willpower: ['A', 'vontade'] };

const offers = (): number[] => [
  ...club.divisions.flatMap((ids, d) => {
    const others = ids.filter(id => id !== PLAYER_CLUB);
    const count = d === club.division ? 5 : d === club.division + 1 ? 3 : 0;
    // Todas as semanas há clubes diferentes a propor jogos.
    const start = (club.week * 3 + club.season) % others.length;
    return [...others.slice(start), ...others.slice(0, start)].slice(0, count);
  }),
];
const offerLabel = (id: number): [string, string] => {
  const special = SPECIAL_RIVALS.find(r => r.id === id);
  return special ? [special.name, special.note] : [club.clubs[id]!.name, DIVISIONS[club.divisions.findIndex(ids => ids.includes(id))]!.name.replace('Liga ', '')];
};
const friendlyAllowed = (): boolean => !currentFixture(club);

function offersScreen(): Rendered {
  const list = offers();
  const rival = rivalTeam(club, list[offerClub] ?? list[0]!);
  const compare = (label: string, a: number, b: number): string => `<div class="compare"><div class="left"><i style="width:${a}%"></i></div><span>${label}</span><div class="right"><i style="width:${b}%"></i></div></div>`;
  const avg = (team: Team, key: keyof Attributes): number => team.roster.slice(0, 5).reduce((sum, p) => sum + p.attributes[key], 0) / 5;
  return {
    top: inside(`<div class="note"><header><b>${offerKind === 'practice' ? 'Jogo-treino' : 'Particular'}</b><span>${offerKind === 'practice' ? 'Pavilhão fechado' : 'No nosso pavilhão'}</span></header><div class="inner">
      <div class="vsbox"><div>${ownCrest(32)}${esc(club.team.name)}<small>${esc(DIVISIONS[club.division]!.name)}</small></div><span>contra</span><div><img class="emblem" alt="Emblema do ${esc(rival.name)}" style="width:32px;height:32px" src="${emblemImage(clubIdentity(rival.name).emblem)}">${esc(rival.name)}<small>${esc(SPECIAL_RIVALS.find(r => r.id === (list[offerClub] ?? list[0]!))?.note ?? DIVISIONS[club.divisions.findIndex(ids => ids.includes(list[offerClub] ?? list[0]!))]!.name)}</small></div></div>
      ${(['shooting', 'speed', 'strength', 'jumping'] as const).map(key => compare(ATTRIBUTE_LABELS.find(([k]) => k === key)![1], avg(club.team, key), avg(rival, key))).join('')}
      <div class="quote">${offerKind === 'practice' ? 'Só dois períodos, à porta fechada e sem público. Gasta a semana, dá menos cartas, cansa menos e não mexe na confiança.' : 'Jogo inteiro com público. Dá cartas, cansa, e conta metade para a confiança. Não conta para a liga.'}</div>
    </div></div>`),
    bottom: `<div class="chalk"><h2>Propostas de jogo</h2>
      <div class="chalktabs"><button type="button" data-offer-kind="practice" aria-pressed="${offerKind === 'practice'}">Jogo-treino</button><button type="button" data-offer-kind="friendly" aria-pressed="${offerKind === 'friendly'}" ${friendlyAllowed() ? '' : 'disabled'}>Particular</button></div>
      <div class="scroll growrows">${list.map((id, n) => `<button type="button" class="crow offer" data-offer="${n}" aria-pressed="${offerClub === n}"><span class="name">${esc(offerLabel(id)[0])}</span><img alt="" src="${leagueIcon(club.divisions.findIndex(ids => ids.includes(id)))}"><small>${esc(offerLabel(id)[1])}</small></button>`).join('')}</div>
    </div>${bar(backBtn('town'), `<button type="button" class="primary" data-pre="${offerKind}">Aceitar</button>`)}`,
  };
}

const rivalId = (): number => (gameKind === 'official' ? opponentId(club) : offers()[offerClub] ?? offers()[0]!);
const currentRival = (): Team => rivalTeam(club, rivalId());

function preScreen(): Rendered {
  const rival = currentRival();
  const view = host.match();
  const kind = half ? 'Intervalo' : gameKind === 'official' ? officialLabel(club) : gameKind === 'practice' ? 'Jogo-treino' : 'Particular';
  const score = half && view ? `${view.s.score[0]} - ${view.s.score[1]}` : '';
  const bars: string[] = [
    `<button type="button" class="mbar" ${half ? 'data-act="halfSubs"' : 'data-squad="pre"'}><img alt="" src="${ICON_SQUAD}"><span>${half ? 'Trocas' : 'Plantel'}</span><small>${half ? 'Quem entra na segunda parte' : 'Titulares e banco'}</small></button>`,
    `<button type="button" class="mbar" data-go="rival"><img alt="" src="${ICON_BALL}"><span>Adversário</span><small>${focusLabel(rival)}</small></button>`,
    `<button type="button" class="mbar" data-go="tactics"><img alt="" src="${ICON_TACTICS}"><span>Táticas da equipa</span><small>Pressão, ataque, ritmo</small></button>`,
    half ? `<button type="button" class="mbar" data-go="halfStats"><img alt="" src="${ICON_BALL}"><span>Estatísticas</span><small>Primeira parte</small></button>` : `<button type="button" class="mbar" data-go="kit"><img alt="" src="${ICON_KIT}"><span>Equipamento</span><small>${esc(activeKit(club).name)}</small></button>`,
    `<button type="button" class="mbar go" id="${half ? 'secondHalfBtn' : 'kickoffBtn'}" data-act="${half ? 'secondHalf' : 'startMatch'}"><img alt="" src="${ICON_GO}"><span>${half ? 'Segunda parte' : 'Bola ao alto'}</span><small>${half ? 'A equipa volta ao campo' : gameKind === 'practice' ? 'Dois períodos, sem público' : 'Começa o jogo'}</small></button>`,
  ];
  return {
    top: `${fullCanvas('scene')}${half ? `<div class="banner">Intervalo · ${score}</div>` : ''}`,
    bottom: `<div class="matchhead"><span>${kind}</span><b>${esc(club.team.short)} contra ${esc(rival.name)}</b></div>${say('assistant', ...(half && view ? assistantReport(view.s) : assistantPreGame(club, rival)))}<div class="menu">${bars.join('')}</div>${half ? '' : bar(backBtn(gameKind === 'official' ? 'town' : 'offers'))}`,
  };
}

/** A ficha de um jogador que não é nosso, para o mercado. */
function marketCard(entry: MarketEntry): string {
  const p = entry.player;
  return `<div class="pcard">
    <header>${entry.clubId === null ? '<span>Livre</span>' : `<img class="emblem" alt="" style="width:20px;height:20px" src="${emblemImage(clubIdentity(club.clubs[entry.clubId]!.name).emblem)}">`}<b>${esc(p.name)}</b>${bodyStars(p)}</header>
    <div class="pbody">
      <img class="pportrait" alt="Retrato de ${esc(p.name)}" src="${portraitImage(lookOf(p, entry.clubId === null ? 'coach' : 'cream'))}">
      <div class="pshirt" aria-label="Sem número">?</div>
      <div>
        <div class="grades">${ATTRIBUTE_KEYS.map(key => `<img alt="" title="${ATTRIBUTE_LABELS.find(([k]) => k === key)![1]}" src="${attributeIcon(key)}">`).join('')}</div>
        <div class="grades">${ATTRIBUTE_KEYS.map(key => grade(p.attributes[key])).join('')}</div>
        <div class="kv"><span>Sem bola</span><b>${OFF_BALL_INFO[p.offBall].name}</b></div>
        <div class="kv"><span>Com bola</span><b>${ON_BALL_INFO[p.onBall].name}</b></div>
        <div class="kv"><span>Potencial</span>${chevrons(p.potential)}</div>
      </div>
    </div>
    <div class="pfoot"><div class="rows">
      <div><span>Salário</span><span>${entry.salary} mil</span></div>
      <div><span>${entry.clubId === null ? 'Entra' : 'Pede'}</span><span>${entry.clubId === null ? 'já' : `${entry.fee} mil`}</span></div>
      <div><span>Sobra</span><span>${surplus(club)} mil</span></div>
    </div><div style="padding:2px 0">${entry.clubId === null ? 'Jogadores livres aceitam logo, se houver dinheiro.' : `O ${esc(club.clubs[entry.clubId]!.name)} responde dentro de 1 a 3 semanas, e pode recusar. O dinheiro fica reservado entretanto.`}</div></div>
  </div>`;
}

/** O mercado: o que está à venda esta semana e as propostas à espera. */
function marketScreen(): Rendered {
  const list = marketList(club);
  const pick = list[Math.min(marketPick, list.length - 1)] ?? null;
  const rows = list.map((entry, i) => `<button type="button" class="prow${entry.clubId === null ? '' : ' bench'}" data-market="${i}" aria-pressed="${i === marketPick}">
      <span></span>${entry.clubId === null ? '<span class="pnum">L</span>' : `<img class="emblem" alt="${esc(club.clubs[entry.clubId]!.name)}" style="width:18px;height:18px" src="${emblemImage(clubIdentity(club.clubs[entry.clubId]!.name).emblem)}">`}<span class="name">${esc(entry.player.name)}</span><i class="edot${entry.salary + entry.fee > surplus(club) ? ' low' : ''}"></i>${ATTRIBUTE_KEYS.map(key => grade(entry.player.attributes[key])).join('')}
    </button>`).join('');
  const offers = club.offers.map(o => `<button type="button" class="prow" data-cancel-offer="${esc(o.player.name)}"><span></span><span class="pnum">${o.weeksLeft}s</span><span class="name">${esc(o.player.name)}</span><i class="edot mid"></i><span style="grid-column:span 7;text-align:right;font:400 15px/1 var(--small)">${o.fee} mil · cancelar</span></button>`).join('');
  const canOffer = pick !== null && pick.salary + pick.fee <= surplus(club) && club.team.roster.length + club.offers.length < 15 && (pick.clubId === null || transferWindowOpen(club));
  return {
    top: inside(pick ? marketCard(pick) : '<div class="note"><header><b>Mercado</b></header><div class="inner"><div class="quote">Esta semana não há ninguém à venda.</div></div></div>'),
    bottom: `<div class="thead"><span>Pos</span><span></span><span>${transferWindowOpen(club) ? 'À venda esta semana' : 'Só jogadores livres: o prazo passou'}</span><span></span>${attributeHead}</div>
      <div class="scroll growrows">${offers ? `<div class="starters plain"><span>Propostas à espera</span></div>${offers}` : ''}<div class="starters plain"><span>Mercado</span><span>Sobra ${surplus(club)} mil</span></div>${rows}</div>
      ${bar(backBtn('office'), `<button type="button" class="primary" data-act="offer" ${canOffer ? '' : 'disabled'}>${pick === null ? 'Nada' : pick.clubId === null ? 'Contratar' : 'Propor'}</button>`)}`,
  };
}

/** As renovações: toda a gente pede um salário novo, e só se segue dentro do orçamento. */
function renewalsScreen(): Rendered {
  const renewals = club.pendingRenewals ?? [];
  const total = renewals.filter(r => keep.has(r.name)).reduce((sum, r) => sum + r.asked, 0);
  const left = club.money - total;
  const rows = renewals.map(r => {
    const p = club.team.roster.find(player => player.name === r.name)!;
    const kept = keep.has(r.name);
    return `<button type="button" class="prow${club.team.roster.indexOf(p) >= 5 ? ' bench' : ''}" data-renew="${esc(r.name)}" aria-pressed="${kept}">
      ${slotBadge(club.team.roster.indexOf(p))}<span class="pnum">${shirtOf(p)}</span><span class="name">${esc(p.name)}</span><i class="edot${kept ? '' : ' low'}"></i><span style="grid-column:span 7;text-align:right;font:400 15px/1 var(--small)">${r.current} › <b>${r.asked}</b> mil${kept ? '' : ' · sai'}</span>
    </button>`;
  }).join('');
  return {
    top: inside(`<div class="note"><header><b>Renovações</b><span>Época ${club.season}</span></header><div class="inner">
      <div class="kv"><span>Orçamento</span><b>${club.money} mil</b></div>
      <div class="kv"><span>Salários</span><b>${total} mil</b></div>
      <div class="kv"><span>Sobra</span><b style="color:${left < 0 ? 'var(--bad)' : 'var(--good)'}">${left} mil</b></div>
      ${say('president', ...presidentRenewals(club))}
      <div class="quote">Contratos de um ano. Cada jogador pede o salário que vale agora; quem não ficar sai, e abaixo de 10 jogadores entram livres.</div>
    </div></div>`),
    bottom: `<div class="thead"><span>Pos</span><span>#</span><span>Jogador</span><span></span><span style="grid-column:span 7;text-align:right">Era › Pede</span></div>
      <div class="scroll">${rows}</div>
      ${bar(`<button type="button" class="primary" id="renewalsConfirm" data-act="confirmRenewals" ${left < 0 ? 'disabled' : ''}>${left < 0 ? 'Acima do orçamento' : 'Começar a época'}</button>`)}`,
  };
}

/** Criar o clube: o nome, o emblema e o equipamento, antes da primeira semana. */
function createScreen(): Rendered {
  const kit = activeKit(club);
  return {
    top: inside(`<div class="note"><header><b id="createName">${esc(club.team.name)}</b><span>${DIVISIONS[club.division]!.name}</span></header><div class="inner createstage">
      <div class="createtop"><div id="createCrest">${ownCrest(96)}</div><img alt="" class="createkit" src="${kitImage(kit)}"></div>
      <div class="createplayers">${club.team.roster.slice(0, 3).map(p => `<img alt="" src="${spriteImage(lookFor(p))}">`).join('')}</div>
    </div></div>`),
    bottom: `<div class="editor" style="flex:1;min-height:0">
        <div class="namerow"><div><label for="clubName">Nome do clube</label><input id="clubName" maxlength="${CLUB_NAME_MAX}" autocomplete="off" spellcheck="false" style="width:100%;text-transform:none;letter-spacing:0" value="${esc(club.team.name)}"></div><div><label for="clubShort">Abreviatura</label><input id="clubShort" maxlength="3" autocomplete="off" spellcheck="false" value="${esc(club.team.short)}"></div></div>
        <div class="menu tight" style="padding:0;background:none;flex:none">
          <button type="button" class="mbar" data-go="emblem" style="grid-template-columns:1fr auto"><span>Emblema</span><small>Forma, cores e símbolo</small></button>
          <button type="button" class="mbar" data-act="editKit" style="grid-template-columns:1fr auto"><span>Equipamentos</span><small>Desenho e cores</small></button>
        </div>
        <div class="quote">Começas na ${DIVISIONS[0]!.name}. Treinas a equipa entre jogos, e os jogos correm sozinhos. Tudo isto pode mudar-se depois, no Escritório.</div>
      </div>
      ${bar('<button type="button" class="primary" id="startClubBtn" data-act="startClub">Começar</button>')}`,
  };
}

/** Quem está marcado, para a barra do menu. */
function focusLabel(rival: Team): string {
  const names = (liveTactics().focus ?? []).map(i => rival.roster[i]?.name).filter((name): name is string => Boolean(name));
  return names.length ? `Alvos: ${names.map(esc).join(', ')}` : 'Plantel e alvos a marcar';
}

/** O adversário desta semana: o plantel e as notas, como no original. As táticas não se veem, porque mudam a meio do jogo. */
function rivalScreen(): Rendered {
  const rival = currentRival();
  const id = rivalId();
  const focus = liveTactics().focus ?? [];
  const played = [...club.rounds.flat(), ...Object.values(club.cups).flatMap(cup => cup.rounds.flat())].filter(f => f.score && (f.home === id || f.away === id));
  const wins = played.filter(f => (f.home === id ? f.score![0] > f.score![1] : f.score![1] > f.score![0])).length;
  const best = [...rival.roster].sort((a, b) => b.attributes.shooting - a.attributes.shooting)[0]!;
  const tallest = [...rival.roster].sort((a, b) => b.height - a.height)[0]!;
  const lines = seasonLines(club, id, rival);
  const perGame = (total: number, games: number): string => (games ? (total / games).toFixed(1).replace('.', ',') : '-');
  const statCells = (l: SeasonLine): string => `<span class="num">${l.games}</span><span class="num">${perGame(l.points, l.games)}</span><span class="num">${perGame(l.rebounds, l.games)}</span><span class="num">${perGame(l.assists, l.games)}</span>`;
  const rows = rival.roster.map((p, index) => `<button type="button" class="prow${rivalStats ? ' statcols' : ''}${index >= 5 ? ' bench' : ''}" data-target="${index}" aria-pressed="${focus.includes(index)}" ${!focus.includes(index) && focus.length >= MAX_FOCUS ? 'disabled' : ''}>
      ${slotBadge(index)}<span class="pnum">${index + 4}</span><span class="name">${esc(p.name)}${optionMark(rival.tactics?.options, p.name)}</span><i class="edot${focus.includes(index) ? ' target' : ''}"></i>${rivalStats ? statCells(lines[index]!) : ATTRIBUTE_KEYS.map(key => grade(p.attributes[key])).join('')}
    </button>`).join('');
  // Os cinco do adversário na prancheta, como a ficha de equipa do original. Toca-se num boneco para o marcar.
  const five = board(rival.roster.slice(0, 5).map((p, index) => boardPlayer(lookOf(p, 'cream'), p.name, null, index, `data-target="${index}" ${!focus.includes(index) && focus.length >= MAX_FOCUS ? 'disabled' : ''}`, focus.includes(index))).join(''), true);
  return {
    top: inside(`<div class="note fedsheet"><header><b><img class="emblem" alt="" style="width:24px;height:24px" src="${emblemImage(clubIdentity(rival.name).emblem)}"> ${esc(rival.name)}</b></header><div class="inner">${five}${clubSheet(id, rival)}</div></div>`),
    bottom: `<div class="rivalhead"><b><img class="emblem" alt="" style="width:20px;height:20px" src="${emblemImage(clubIdentity(rival.name).emblem)}"> ${esc(rival.name)}</b><span>${club.divisions.some(ids => ids.includes(id)) ? `<img class="emblem" alt="" style="width:14px;height:14px" src="${leagueIcon(club.divisions.findIndex(ids => ids.includes(id)))}"> ${esc(DIVISIONS[club.divisions.findIndex(ids => ids.includes(id))]!.name)} · ` : ''}${wins} V ${played.length - wins} D</span><span>Lança mais: ${esc(best.name)} · Mais alto: ${esc(tallest.name)}</span><span class="quote">Marca até ${MAX_FOCUS} jogadores: quem os defende cola-se a eles, e os outros ficam um passo mais soltos.</span></div>
      <div class="chalktabs rivalview"><button type="button" data-rival-view="0" aria-pressed="${!rivalStats}">Atributos</button><button type="button" data-rival-view="1" aria-pressed="${rivalStats}">Estatísticas da época</button></div>
      <div class="thead${rivalStats ? ' statcols' : ''}"><span>Pos</span><span>#</span><span>Jogador</span><span></span>${rivalStats ? '<span class="num">J</span><span class="num">Pts</span><span class="num">Res</span><span class="num">Ass</span>' : attributeHead}</div>
      <div class="scroll">${rows}</div>
      ${bar(backBtn('pre'), `<button type="button" data-act="clearFocus" ${focus.length ? '' : 'disabled'}>Sem alvos</button>`)}`,
  };
}

function halfStatsScreen(): Rendered {
  return {
    top: fullCanvas('scene'),
    bottom: `<div class="matchhead"><span>Primeira parte</span><b>Estatísticas</b></div><div class="content">${panelContent(host.match()!, 'stats', [])}</div>${bar(backBtn('pre'))}`,
  };
}

function tacticsScreen(): Rendered {
  const tactics = liveTactics();
  return {
    top: fullCanvas('tacticsBoard'),
    bottom: `<div class="stack">${TACTIC_ROWS.map(({ key, label, fallback, options }) => `<div class="tacrow"><span>${label}: ${(options.find(([v]) => v === (tactics[key] ?? fallback)) ?? options[0]!)[2]}</span><div>${options.map(([value, name]) => `<button type="button" data-tactic="${key}" data-tactic-value="${value}" aria-pressed="${value === (tactics[key] ?? fallback)}">${name}</button>`).join('')}</div></div>`).join('')}${optionsRow()}</div>${bar(backBtn(tacticsBack))}`,
    after: () => drawTacticsBoard(element<HTMLCanvasElement>('tacticsBoard'), tactics),
  };
}

function optionsRow(): string {
  return optionsControls(club.team.roster, liveTactics(), optionPicking, p => portraitImage(lookFor(p)));
}

/** Parecido demais com o equipamento creme do adversário? */
/** As duas camisolas são tão parecidas que em campo não se distinguem as equipas. */
function kitClash(kit: ClubKit, other: ClubKit): boolean {
  const x = parseInt(kit.jersey.slice(1), 16);
  const y = parseInt(other.jersey.slice(1), 16);
  return Math.abs(((x >> 16) & 255) - ((y >> 16) & 255)) + Math.abs(((x >> 8) & 255) - ((y >> 8) & 255)) + Math.abs((x & 255) - (y & 255)) < 90;
}

// O equipamento do adversário escolhido à mão, só para o jogo desta semana contra esse clube; sem escolha, veste o que contrasta.
let rivalKitPick: { week: number; name: string; index: number } | null = null;

/** O equipamento que o adversário veste no jogo: o escolhido no ecrã do equipamento, ou o que contrasta com o nosso. */
export function rivalKitFor(current: ClubState, name: string, ours: ClubKit): ClubKit {
  const pick = rivalKitPick;
  if (pick && pick.week === current.week && pick.name === name) return clubIdentity(name).kits[pick.index] ?? kitAgainst(name, ours);
  return kitAgainst(name, ours);
}

/** O equipamento do jogo: o cartaz com as duas equipas em cima, e em baixo escolhe-se o nosso e o do adversário. */
function kitScreen(): Rendered {
  const rival = currentRival();
  const ours = activeKit(club);
  const theirs = rivalKitFor(club, rival.name, ours);
  const rivalKits = clubIdentity(rival.name).kits;
  const button = (attr: string, value: string, pressed: boolean, preview: string, name: string): string =>
    `<button type="button" class="kitbtn" ${attr}="${value}" aria-pressed="${pressed}"><canvas ${preview} width="20" height="36"></canvas><span>${esc(name)}</span></button>`;
  const rivalNames = ['Principal', 'Alternativo'];
  return {
    top: fullCanvas('poster'),
    bottom: `<div class="kitpick">
      <div class="kithead"><img class="emblem" alt="" src="${emblemImage(club.emblem)}"><b>${esc(club.team.name)}</b></div>
      <div class="kitgrid">${club.kits.map(k => button('data-kit', k.id, k.id === club.kitChoice, `data-kit-preview="${k.id}"`, k.name)).join('')}</div>
      <div class="kithead"><img class="emblem" alt="" src="${emblemImage(clubIdentity(rival.name).emblem)}"><b>${esc(rival.name)}</b></div>
      <div class="kitgrid two">${rivalKits.map((k, i) => button('data-rival-kit', String(i), k.jersey === theirs.jersey && k.second === theirs.second && k.pattern === theirs.pattern, `data-rival-preview="${i}"`, rivalNames[i] ?? k.name)).join('')}</div>
      ${kitClash(ours, theirs) ? `<div class="mwarn">As duas camisolas são muito parecidas: em campo, vai ser difícil distinguir as equipas.</div>` : ''}
    </div>${bar(backBtn('pre'), '<button type="button" data-act="editKit">Editar equipamento</button>')}`,
    after: () => {
      // Num ecrã baixo, os bonecos dos botões ficam mais pequenos, para as duas filas caberem sem deslizar.
      const pick = host.panel.querySelector<HTMLElement>('.kitpick');
      if (pick && pick.scrollHeight > pick.clientHeight + 1) pick.classList.add('compact');
      paintKitPreviews();
      const canvas = document.getElementById('poster') as HTMLCanvasElement | null;
      if (canvas) {
        drawMatchPoster(canvas, gameKind === 'official' ? officialLabel(club).split(' de ')[0]!.split(' · ')[0]! : gameKind === 'practice' ? 'Jogo-treino' : 'Particular',
          { kit: ours, emblem: emblemCanvas(club.emblem), roster: club.team.roster },
          { kit: theirs, emblem: emblemCanvas(clubIdentity(rival.name).emblem), roster: rival.roster });
      }
    },
  };
}

function paintKitPreviews(): void {
  document.querySelectorAll<HTMLCanvasElement>('[data-kit-preview]').forEach(canvas => {
    const g = canvas.getContext('2d')!;
    g.clearRect(0, 0, canvas.width, canvas.height);
    // Os botões pequenos do ecrã do equipamento só mostram o boneco, sem margem: 20 por 36.
    const small = canvas.width === 20;
    drawSprite(g, 'idle', { ...lookOf(club.team.roster[selected]!, 'blue'), custom: kitById(canvas.dataset.kitPreview!) }, small ? 10 : 17, small ? 35 : 43, false, canvas.dataset.back === '1', false);
  });
  const rival = screen === 'kit' ? currentRival() : null;
  document.querySelectorAll<HTMLCanvasElement>('[data-rival-preview]').forEach(canvas => {
    if (!rival) return;
    const g = canvas.getContext('2d')!;
    g.clearRect(0, 0, canvas.width, canvas.height);
    const kit = clubIdentity(rival.name).kits[Number(canvas.dataset.rivalPreview)]!;
    drawSprite(g, 'idle', { ...lookOf(rival.roster[0]!, 'cream'), custom: kit }, 10, 35, true, false, false);
  });
}

const swatches = (attr: string, current: string): string => `<div class="swatches">${PALETTE.map(color => `<button type="button" class="swatch" style="background:${color}" ${attr}="${color}" aria-label="Cor ${color}" aria-pressed="${current === color}"></button>`).join('')}</div>`;
const choices = (attr: string, list: readonly (readonly [string, string])[], current: string): string => `<div class="choices">${list.map(([id, label]) => `<button type="button" ${attr}="${id}" aria-pressed="${current === id}">${label}</button>`).join('')}</div>`;

/** O roupeiro: o equipamento escolhido em destaque, com os nossos vestidos e o adversário da semana ao lado. */
/** O roupeiro do editor, como no original: os quatro equipamentos nos cabides, o que se edita em destaque, e o adversário da semana ao lado. */
function paintWardrobe(): void {
  const canvas = document.getElementById('wardrobe') as HTMLCanvasElement | null;
  if (canvas) drawWardrobe(canvas, club.kits, kitEditing, club.team.roster, currentRival());
}

const chip = (attr: string, id: string, label: string, color: string, on: boolean): string => `<button type="button" class="chip" ${attr}="${id}" aria-pressed="${on}"><i style="background:${color}"></i>${label}</button>`;

/** O editor de equipamentos, como no original: o roupeiro em cima; em baixo a peça, uma só paleta e os desenhos em miniatura. */
function kitEditScreen(): Rendered {
  const kit = kitById(kitEditing);
  const parts: readonly (readonly [typeof kitPart, string])[] = [['jersey', 'Camisola'], ['second', 'Segunda'], ['shorts', 'Calções'], ['trim', 'Pormenores']];
  return {
    top: fullCanvas('wardrobe'),
    bottom: `${choices('data-kit-edit', club.kits.map(k => [k.id, esc(k.name)] as const), kitEditing)}
      <div class="scroll editor">
        <div><span>Peça e cor</span><div class="chips4">${parts.map(([id, label]) => chip('data-kit-part', id, label, kit[id], kitPart === id)).join('')}</div>${swatches('data-kit-color', kit[kitPart])}</div>
        <div><span>Desenho da camisola</span><div class="patterns">${KIT_PATTERNS.map(([id, label]) => `<button type="button" data-kit-pattern="${id}" aria-pressed="${kit.pattern === id}"><img alt="" src="${kitImage({ ...kit, pattern: id })}"><span>${label}</span></button>`).join('')}</div></div>
        <div class="hint">${kitClash(kit, rivalKitFor(club, currentRival().name, kit)) ? 'Parecido com o equipamento do adversário desta semana: em campo, custa distinguir.' : 'Boa diferença para o adversário desta semana.'}</div>
      </div>
      ${bar(`<button type="button" class="back" data-go="${kitEditBack}">‹ Voltar</button>`)}`,
    after: paintWardrobe,
  };
}

/** O editor de emblema, com o resultado à escala e como fica ao lado do nome. */
/** Todos os desenhos possíveis, fundo a fundo: cada página mostra doze. */
const EMBLEM_DESIGNS: readonly (readonly [Emblem['shape'], Emblem['pattern']])[] = EMBLEM_PATTERN_LIST.flatMap(([pattern]) => EMBLEM_SHAPE_LIST.map(([shape]) => [shape, pattern] as const));
const DESIGNS_PER_PAGE = 12;

/** O editor de emblema, como no original: a bandeira a ondear em cima, e em baixo a grelha de desenhos, os símbolos e as cores. */
function emblemScreen(): Rendered {
  const { emblem } = club;
  const pages = Math.ceil(EMBLEM_DESIGNS.length / DESIGNS_PER_PAGE);
  emblemPage = Math.max(0, Math.min(pages - 1, emblemPage));
  const designs = EMBLEM_DESIGNS.slice(emblemPage * DESIGNS_PER_PAGE, (emblemPage + 1) * DESIGNS_PER_PAGE)
    .map(([shape, pattern]) => `<button type="button" data-em-design="${shape}:${pattern}" aria-pressed="${emblem.shape === shape && emblem.pattern === pattern}"><img alt="${EMBLEM_SHAPE_LIST.find(([id]) => id === shape)![1]}, ${EMBLEM_PATTERN_LIST.find(([id]) => id === pattern)![1]}" src="${emblemImage({ ...emblem, shape, pattern })}"></button>`).join('');
  const symbols = EMBLEM_SYMBOL_LIST.map(([id, label]) => `<button type="button" data-em-symbol="${id}" aria-pressed="${emblem.symbol === id}" title="${label}"><img alt="${label}" src="${emblemImage({ ...emblem, shape: 'circle', pattern: 'plain', symbol: id, letters: '' })}"></button>`).join('');
  const parts: readonly (readonly [typeof emblemPart, string])[] = [['primary', 'Fundo'], ['secondary', 'Segunda'], ['accent', 'Símbolo']];
  return {
    top: fullCanvas('flag'),
    bottom: `<div class="scroll editor">
        <div><span>Desenho <small>${emblemPage + 1} de ${pages}</small></span><div class="pager"><button type="button" data-em-page="-1" aria-label="Página anterior">‹</button><div class="designs">${designs}</div><button type="button" data-em-page="1" aria-label="Página seguinte">›</button></div></div>
        <div><span>Símbolo</span><div class="symbols">${symbols}</div></div>
        <div><span>Cores</span><div class="chips4 three">${parts.map(([id, label]) => chip('data-em-part', id, label, emblem[id], emblemPart === id)).join('')}</div>${swatches('data-em-color', emblem[emblemPart])}</div>
        <div><span>Contorno</span>${choices('data-em-border', EMBLEM_BORDER_LIST, emblem.border ?? 'ink')}</div>
      </div>
      ${bar(`<button type="button" class="back" data-go="${emblemBack}">‹ Voltar</button>`)}`,
  };
}

const slotOf = (id: number, score: string, winner: boolean): BracketSlot => ({ short: club.clubs[id]!.short, mine: id === PLAYER_CLUB, score, winner });

/** O quadro de uma taça: as três últimas rondas, que são as que cabem no ecrã. As primeiras ficam na lista. */
function cupBracket(): [BracketRound[], string] {
  const total = CUP_ROUNDS[cupView].length;
  const shown = Math.min(3, total);
  const labels = CUP_ROUNDS[cupView].slice(total - shown).map(name => name.replace(' de final', '').replace('-finais', ''));
  const rounds: BracketRound[] = (club.cups[cupView]?.rounds ?? []).slice(total - shown).map((fixtures, n) => ({
    label: labels[n]!,
    pairs: fixtures.map(f => {
      const homeWon = f.score ? f.score[0] > f.score[1] : false;
      return [slotOf(f.home, f.score ? String(f.score[0]) : '', Boolean(f.score) && homeWon), slotOf(f.away, f.score ? String(f.score[1]) : '', Boolean(f.score) && !homeWon)];
    }),
  }));
  return [fullBracket(rounds, labels, 1 << (shown - 1)), CUP_NAMES[cupView]];
}

function playoffBracket(): [BracketRound[], string] {
  const format = playoffFormat(club)!;
  const rounds: BracketRound[] = (club.playoffs?.rounds ?? []).map((series, n) => ({
    label: format.roundNames[n]!.replace(' de final', '').replace('-finais', ''),
    pairs: series.map(s => {
      const [top, bottom] = seriesWins(s);
      const winner = seriesWinner(s);
      return [slotOf(s.top, String(top), winner === s.top), slotOf(s.bottom, String(bottom), winner === s.bottom)];
    }),
  }));
  return [fullBracket(rounds, format.roundNames.map(name => name.replace(' de final', '').replace('-finais', '')), format.places.length / 2), format.name];
}

/** A ficha de um jogador de outro clube: o que se vê de fora, sem salário nem treino. */
function clubPlayerCard(team: Team, index: number): string {
  const p = team.roster[index]!;
  const { emblem, kits } = clubIdentity(team.name);
  return `<div class="pcard">
    <header><img class="emblem" alt="" style="width:20px;height:20px" src="${emblemImage(emblem)}"><span>${index < 5 ? SLOT_NAMES[index] : 'Suplente'}</span><b>${esc(p.name)}</b>${bodyStars(p)}</header>
    <div class="pbody">
      <img class="pportrait" alt="Retrato de ${esc(p.name)}" src="${portraitImage({ ...lookOf(p, 'cream'), custom: kits[0] })}">
      <div class="pshirt" aria-label="Camisola ${index + 4}">${index + 4}</div>
      <div>
        <div class="grades">${ATTRIBUTE_KEYS.map(key => `<img alt="" title="${ATTRIBUTE_LABELS.find(([k]) => k === key)![1]}" src="${attributeIcon(key)}">`).join('')}</div>
        <div class="grades">${ATTRIBUTE_KEYS.map(key => grade(p.attributes[key])).join('')}</div>
        <div class="kv"><span>Sem bola</span><b>${OFF_BALL_INFO[p.offBall].name}</b></div>
        <div class="kv"><span>Com bola</span><b>${ON_BALL_INFO[p.onBall].name}</b></div>
        <div class="kv"><span>Potencial</span>${chevrons(p.potential)}</div>
      </div>
    </div>
    <div class="pfoot" style="grid-template-columns:1fr">
      <div class="rows">
        <div><span>Altura</span><span>${bodyStars(p)}</span></div>
        <div><span>Movimentos</span><span>${p.moves.map(m => MOVE_INFO[m].name).join(', ') || 'nenhum'}</span></div>
      </div>
    </div>
  </div>`;
}

/** A ficha de um clube: treinador, últimas épocas, mapa de jogo e estilo. Serve a federação e o ecrã do adversário. */
function clubSheet(id: number, team: Team): string {
  const roster = team.roster;
  const tactics = id === PLAYER_CLUB ? club.tactics : team.tactics ?? NEUTRAL_TACTICS;
  const tacticName = (key: string): string => {
    const row = TACTIC_ROWS.find(r => r.key === key)!;
    return String((row.options.find(([v]) => v === (tactics[key as keyof Tactics] ?? row.fallback)) ?? row.options[0]!)[1]);
  };
  // Como no original: um boneco num mapa diz de relance como o clube joga. Na vertical a pressão, na horizontal o ritmo.
  const figure = spriteImage({ ...lookOf(roster[0]!, 'cream'), custom: id === PLAYER_CLUB ? activeKit(club) : clubIdentity(team.name).kits[0] });
  const coach: Look = { ...lookOf({ ...roster[0]!, name: team.name }, 'suit'), style: 0, legs: 6, torso: 6, build: 'athletic' };
  const seasons = clubSeasons(club, id).map(e => `<tr><th>${e.label}</th><td><img class="emblem" alt="" src="${leagueIcon(e.division)}"> ${e.position === null ? '—' : `Lugar ${e.position + 1}`}</td></tr>`).join('');
  return `<div class="fedtop">
      <div class="fedleft"><img class="pportrait" alt="Treinador do ${esc(team.name)}" src="${portraitImage(coach)}"><table class="fedseasons">${seasons}</table></div>
      <div class="fedmap"><span class="n">Pressão alta</span><span class="s">Espera</span><span class="w">Lento</span><span class="e">Rápido</span>
        <div class="field"><img alt="" src="${figure}" style="left:${50 + tactics.pace * 36}%;top:${50 - tactics.pressure * 36}%"></div></div>
    </div>
    <div class="fedstyle">Defesa: <b>${tacticName('defense')}</b> · Ataque: <b>${tacticName('spacing')}</b></div>`;
}

function federationScreen(): Rendered {
  const own = federationDivision === club.division;
  // Só a nossa divisão se joga jogo a jogo: nas outras, os clubes ordenam-se pelo nível.
  const table: Standing[] = own
    ? leagueTable(club)
    : [...club.divisions[federationDivision]!].sort((a, b) => club.clubs[b]!.level - club.clubs[a]!.level).map(id => ({ club: id, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }));
  const row = table.find(r => r.club === federationClub) ?? table[0]!;
  const position = table.indexOf(row);
  const info = club.clubs[federationClub]!;
  const team = federationClub === PLAYER_CLUB ? club.team : aiTeam(info);
  const roster = team.roster;
  const player = Math.min(federationPlayer, roster.length - 1);
  const crestOf = federationClub === PLAYER_CLUB ? club.emblem : clubIdentity(team.name).emblem;
  const recent = club.rounds.flat().filter(f => f.score && (f.home === federationClub || f.away === federationClub)).slice(-5);
  const form = recent.map(f => {
    const own = f.home === federationClub ? f.score![0] : f.score![1];
    const other = f.home === federationClub ? f.score![1] : f.score![0];
    return `<tr><td>${esc(club.clubs[f.home === federationClub ? f.away : f.home]!.name)}</td><td class="${own > other ? 'won' : 'lost'}" style="color:${own > other ? 'var(--good)' : 'var(--bad)'}">${own}-${other}</td></tr>`;
  }).join('');
  const sheet = clubSheet(federationClub, team);
  const squadRowsHtml = `<div class="thead"><span>Pos</span><span>#</span><span>Jogador</span><span></span>${attributeHead}</div>` + roster.map((p, index) => `<button type="button" class="prow${index >= 5 ? ' bench' : ''}" data-fed-player="${index}">
      ${slotBadge(index)}<span class="pnum">${federationClub === PLAYER_CLUB ? shirtOf(p) : index + 4}</span><span class="name">${esc(p.name)}${optionMark(federationClub === PLAYER_CLUB ? club.tactics.options : team.tactics?.options, p.name)}</span><i class="edot"></i>${ATTRIBUTE_KEYS.map(key => grade(p.attributes[key])).join('')}
    </button>`).join('');
  const top = federationPlayer >= 0
    ? inside(federationClub === PLAYER_CLUB ? playerCard(player) : clubPlayerCard(team, player))
    : inside(`<div class="note fedsheet"><header><b><img class="emblem" alt="" style="width:24px;height:24px" src="${emblemImage(crestOf)}"> ${esc(team.name)}</b><span>${own && table.every(r => r.played === 0) ? 'Sem jogos' : `Lugar ${position + 1}`}</span></header><div class="inner">
    ${sheet}
    <div class="compare" style="grid-template-columns:1fr 1fr 1fr"><span>${row.wins} V</span><span>${row.losses} D</span><span>${row.pointsFor} pts</span></div>
    ${form ? `<table class="mini-table"><tr><th>Últimos jogos</th><th></th></tr>${form}</table>` : ''}
    <div class="fedsquad">${squadRowsHtml}</div>
  </div></div>`);
  let body = '';
  if (federationTab === 'table') {
    body = `<div class="crow head"><span></span><span class="name"></span><span>V</span><span>D</span><span>+/-</span></div>${table.map((r, i) => {
      const format = playoffFormat(club);
      const up = format ? format.places.includes(i) : i < MOVING_PLACES && club.division < DIVISIONS.length - 1;
      const down = i >= LEAGUE_SIZE - MOVING_PLACES && club.division > 0;
      const diff = r.pointsFor - r.pointsAgainst;
      const crestImg = `<img class="emblem" alt="" style="width:18px;height:18px;margin-right:4px" src="${emblemImage(r.club === PLAYER_CLUB ? club.emblem : clubIdentity(club.clubs[r.club]!.name).emblem)}">`;
      if (!own) return `<button type="button" class="crow${r.club === PLAYER_CLUB ? ' mine' : ''}" data-fed-club="${r.club}" aria-pressed="${federationClub === r.club}" style="grid-template-columns:22px 1fr"><span>${i + 1}</span><span class="name">${crestImg}${esc(club.clubs[r.club]!.name)}</span></button>`;
      return `<button type="button" class="crow${up ? ' up' : down ? ' down' : ''}${r.club === PLAYER_CLUB ? ' mine' : ''}" data-fed-club="${r.club}" aria-pressed="${federationClub === r.club}"><span>${i + 1}</span><span class="name">${crestImg}${esc(club.clubs[r.club]!.name)}</span><span>${r.wins}</span><span>${r.losses}</span><span>${diff > 0 ? '+' : ''}${diff}</span></button>`;
    }).join('')}`;
  } else if (federationTab === 'calendar') {
    body = club.rounds.map((round, n) => {
      const f = round.find(x => x.home === PLAYER_CLUB || x.away === PLAYER_CLUB)!;
      const home = f.home === PLAYER_CLUB;
      const rival = home ? f.away : f.home;
      const own = f.score ? f.score[home ? 0 : 1] : 0;
      const other = f.score ? f.score[home ? 1 : 0] : 0;
      return `<button type="button" class="crow cal" data-fed-club="${rival}" aria-pressed="${federationClub === rival}"><small>J${n + 1}</small><small>${home ? 'Casa' : 'Fora'}</small><span class="name">${esc(club.clubs[rival]!.name)}</span><b class="${own > other ? 'won' : 'lost'}">${f.score ? `${own}-${other}` : ''}</b></button>`;
    }).join('');
  } else if (federationTab === 'round') {
    const last = club.rounds[federationRound] ?? club.rounds[0]!;
    body = `<div class="crow head" style="grid-template-columns:34px 1fr 34px"><button type="button" class="chalkarrow" data-fed-round="-1" aria-label="Jornada anterior" ${federationRound > 0 ? '' : 'disabled'}>‹</button><span style="text-align:center">Jornada ${federationRound + 1}${last[0]?.score ? '' : ' · por jogar'}</span><button type="button" class="chalkarrow" data-fed-round="1" aria-label="Jornada seguinte" ${federationRound < club.rounds.length - 1 ? '' : 'disabled'}>›</button></div>` + last.map(f => `<div class="crow round"><span class="name">${esc(club.clubs[f.home]!.name)}</span><b>${f.score ? `${f.score[0]}-${f.score[1]}` : '-'}</b><span class="name">${esc(club.clubs[f.away]!.name)}</span></div>`).join('');
  } else if (federationTab === 'playoffs') {
    const format = playoffFormat(club)!;
    const state = club.playoffs;
    const entry = format.decidesTitle ? `Os ${format.places.length} primeiros da fase regular. Quartos e meias à melhor de 3, final à melhor de 5. O vencedor é o campeão; os 2 últimos descem.` : `Do 2.º ao 5.º da fase regular, à melhor de 3. O 1.º sobe logo; o vencedor do playoff sobe com ele.`;
    body = `<div class="crow round" style="grid-template-columns:1fr;min-height:0"><span class="name" style="white-space:normal;padding:3px 0">${entry}</span></div>` + (state
      ? [...state.rounds].map((round, n) => ({ round, n })).reverse().map(({ round, n }) => `<div class="crow head" style="grid-template-columns:1fr auto"><span class="name">${format.roundNames[n]}</span><span>melhor de ${round[0]!.bestOf}</span></div>` + round.map(series => {
        const [top, bottom] = seriesWins(series);
        const winner = seriesWinner(series);
        return `<div class="crow round${series.top === PLAYER_CLUB || series.bottom === PLAYER_CLUB ? ' mine' : ''}"><span class="name">${esc(club.clubs[series.top]!.name)}${winner === series.top ? ' ✓' : ''}</span><b>${top}-${bottom}</b><span class="name">${esc(club.clubs[series.bottom]!.name)}${winner === series.bottom ? ' ✓' : ''}</span></div>`;
      }).join('')).join('')
      : `<div class="crow round" style="grid-template-columns:1fr;min-height:0"><span class="name" style="white-space:normal;padding:3px 0">Começam depois da jornada ${(LEAGUE_SIZE - 1) * 2}. Cada ronda é uma semana, com os jogos da série seguidos.</span></div>`);
  } else if (federationTab === 'cup') {
    const state = club.cups[cupView];
    const status = cupStatus(club, cupView);
    const headline = status.winner === PLAYER_CLUB ? 'Vencedores!' : status.alive ? 'Ainda em prova' : !status.entered ? 'Não entrámos' : status.exit === null ? '' : `Eliminados: ${cupRoundName(cupView, status.exit).toLowerCase()}`;
    const about: Record<CupName, string> = {
      federation: `${FEDERATION_ROUNDS.length} rondas a um jogo. Entram os 40 clubes; os da ${DIVISIONS[0]!.name} e os mais fracos da ${DIVISIONS[1]!.name} começam na pré-eliminatória.`,
      continental: `Os 4 primeiros da ${DIVISIONS[DIVISIONS.length - 1]!.name} da época anterior e 12 clubes de fora, mais fortes do que os de cá. Quatro rondas a um jogo.`,
      world: 'Uma final entre o campeão continental e o campeão de outro continente.',
    };
    const picker = `<div class="chalktabs">${(['federation', 'continental', 'world'] as CupName[]).map(cup => `<button type="button" data-cup-view="${cup}" aria-pressed="${cupView === cup}">${CUP_NAMES[cup].replace('Taça da ', '').replace('Taça ', '').replace(' de Clubes', '')}</button>`).join('')}</div>`;
    body = picker + `<div class="crow head" style="grid-template-columns:1fr auto"><span class="name">${CUP_NAMES[cupView]}</span><span>${headline}</span></div>` + (state ? [...state.rounds].map((round, n) => ({ round, n })).reverse().map(({ round, n }) => `<div class="crow head" style="grid-template-columns:1fr auto"><span class="name">${cupRoundName(cupView, n)}</span><span>${round.length} ${round.length === 1 ? 'jogo' : 'jogos'}</span></div>` + round.map(f => `<div class="crow round${f.home === PLAYER_CLUB || f.away === PLAYER_CLUB ? ' mine' : ''}"><span class="name">${esc(club.clubs[f.home]!.name)}</span><b>${f.score ? `${f.score[0]}-${f.score[1]}` : '-'}</b><span class="name">${esc(club.clubs[f.away]!.name)}</span></div>`).join('')).join('') : '') + ((state?.rounds.length ?? 0) === 0 ? `<div class="crow round" style="grid-template-columns:1fr;min-height:0"><span class="name" style="white-space:normal;padding:3px 0">${cupView === 'world' ? 'Só se joga quando houver campeão continental, na semana 28.' : `O sorteio da primeira ronda é na semana ${cupView === 'federation' ? 2 : 4}.`}</span></div>` : '') + `<div class="crow round" style="grid-template-columns:1fr;min-height:0"><span class="name" style="white-space:normal;padding:3px 0">${about[cupView]}</span></div>`;
  } else {
    // Toca-se numa divisão para ver os clubes dela.
    body = [...DIVISIONS].map((d, n) => ({ d, n })).reverse().map(({ d, n }) => `<button type="button" class="crow round" data-fed-division="${n}" aria-pressed="${federationDivision === n}" style="grid-template-columns:1fr auto;font:400 18px/1 var(--ui);min-height:44px${n === club.division ? ';color:var(--gold)' : ''}"><span class="name"><img class="emblem" alt="" style="width:16px;height:16px;margin-right:4px" src="${leagueIcon(n)}">${d.name}</span><small>${n === club.division ? 'Estás aqui' : `${LEAGUE_SIZE} clubes`}</small></button>`).join('');
  }
  const tabs: [typeof federationTab, string][] = own
    ? [['table', 'Classificação'], ['calendar', 'Calendário'], ['round', 'Jornada'], ...(playoffFormat(club) ? [['playoffs', 'Playoffs'] as [typeof federationTab, string]] : []), ['cup', 'Taça'], ['ladder', 'Divisões']]
    : [['table', 'Clubes'], ['cup', 'Taça'], ['ladder', 'Divisões']];
  const bracket = federationTab === 'cup' || federationTab === 'playoffs';
  return {
    top: bracket ? fullCanvas('bracket') : top,
    after: bracket ? () => drawBracket(element<HTMLCanvasElement>('bracket'), ...(federationTab === 'cup' ? cupBracket() : playoffBracket())) : () => {
      // Ao voltar de um jogador, a ficha fica no sítio do plantel onde estava.
      const inner = document.querySelector('.fedsheet .inner');
      if (inner) inner.scrollTop = federationScroll;
    },
    bottom: `<div class="chalk"><h2><img class="emblem" alt="" style="width:20px;height:20px;margin-right:4px" src="${leagueIcon(federationDivision)}">${DIVISIONS[federationDivision]!.name}</h2><div class="chalktabs">${tabs.map(([id, label]) => `<button type="button" data-fed-tab="${id}" aria-pressed="${federationTab === id}">${label}</button>`).join('')}</div><div class="scroll">${body}</div></div>${bar(backBtn('town'), federationPlayer >= 0 ? '<button type="button" class="primary" data-fed-player="-1">‹ Ficha do clube</button>' : '')}`,
  };
}

function trophyScreen(): Rendered {
  const trophies = trophyList(club);
  const won = trophies.filter(t => t.won).length;
  const t = trophies[selectedTrophy]!;
  return {
    top: `${fullCanvas('shelf')}<div class="tnote"><b>${esc(t.won ? t.name : `${t.name} (por ganhar)`)}</b><span>${esc(t.detail)}</span></div>`,
    bottom: `<div class="matchhead"><span>Carreira do treinador</span><b>${won} de ${trophies.length} troféus e prémios</b></div>
      <div class="scroll">${trophies.map((item, n) => `<button type="button" class="trow" data-trophy="${n}" aria-pressed="${selectedTrophy === n}"><i class="${item.won ? 'yes' : ''}"></i><span>${esc(item.won ? item.name : '???')}</span><small>${item.won ? 'Ganho' : 'Por ganhar'}</small></button>`).join('')}</div>
      ${bar('<button type="button" class="back" data-office="board">‹ Voltar</button>')}`,
    after: () => drawShelf(element<HTMLCanvasElement>('shelf'), trophies),
  };
}

const OUTCOME_LABEL = { champion: 'Campeões', promoted: 'Subiram', stayed: 'Ficaram', relegated: 'Desceram' } as const;

/** A direção, por cima da cena do escritório: o vaso ao lado da secretária mostra a confiança. */
const officeScene = (): string => `${fullCanvas('scene', 'office')}<div class="tnote"><b>Direção do clube · ${Math.round(club.confidence)}%</b>${club.objective ? objectiveHtml(club) : say('president', ...presidentBoard(club))}<span>Orçamento ${club.money} mil · Salários ${totalSalaries(club)} mil · Abaixo de ${B.confidenceFired}% despedem-te</span></div>`;

function officeScreen(): Rendered {
  if (officeItem === 'trophies') return trophyScreen();
  const titles = club.history.filter(record => record.outcome === 'champion').length;
  const seasons = [...club.history].reverse().map(record => `<tr><td>${record.season}</td><td>${DIVISIONS[record.division]!.name}</td><td>${record.position + 1}</td><td>${record.wins}-${record.losses}</td><td>${OUTCOME_LABEL[record.outcome]}</td></tr>`).join('');
  const details: Record<Exclude<OfficeItem, 'trophies'>, string> = {
    board: `<div class="note"><header><b>Direção do clube</b><span>${Math.round(club.confidence)}%</span></header><div class="inner">
      <div>Confiança no treinador</div><div class="gauge"><i style="width:${club.confidence}%;background:${club.confidence < 15 ? 'var(--bad)' : club.confidence < 40 ? 'var(--gold)' : 'var(--good)'}"></i></div>
      <div class="compare" style="grid-template-columns:1fr 1fr 1fr"><span>Orçamento ${club.money} mil</span><span>Salários ${totalSalaries(club)} mil</span><span>Sobra ${surplus(club)} mil</span></div>
      ${club.objective ? '' : say('president', ...presidentBoard(club))}
      ${objectiveHtml(club)}
      <div>Abaixo de ${B.confidenceFired}% de confiança, a direção despede-te.</div>
    </div></div>`,
    history: `<div class="note"><header><b>Historial</b><span>${club.wins} V · ${club.losses} D · ${titles} títulos</span></header><div class="inner">${seasons
      ? `<table class="mini-table"><tr><th>Época</th><th>Divisão</th><th>Lugar</th><th>V-D</th><th></th></tr>${seasons}</table>`
      : '<div class="quote">Ainda não acabou nenhuma época. Aqui ficam as épocas acabadas e os títulos do clube.</div>'}</div></div>`,
    records: recordsHtml(club),
    facilities: facilitiesHtml(club),
    reset: `<div class="note"><header><b>Treinar outro clube</b></header><div class="inner"><div class="quote">Perdes o ${esc(club.team.name)}, na semana ${club.week}, assim que criares o novo clube. Os teus troféus vão contigo.</div><button type="button" id="resetYes" data-act="newClub">Escolher novo clube</button><button type="button" id="resetNo" data-office="board">Ficar com este clube</button></div></div>`,
  };
  const officeBar = ([id, label, note]: [OfficeItem, string, string]): string => `<button type="button" class="mbar" data-office="${id}" aria-pressed="${officeItem === id}" style="grid-template-columns:1fr auto"><span>${label}</span><small>${note}</small></button>`;
  const items: [OfficeItem, string, string][] = [
    ['board', 'Direção', 'Confiança e objetivo'],
    ['trophies', 'Troféus e prémios', `${trophyList(club).filter(t => t.won).length} na vitrina`],
    ['facilities', 'Instalações', 'Ginásio, médico e olheiros'],
    ['records', 'Recordes e lendas', 'O que o clube guarda'],
    ['history', 'Historial', 'Épocas e títulos'],
    ['reset', 'Novo clube', 'Começar de novo'],
  ];
  return {
    top: officeItem === 'board' ? officeScene() : inside(details[officeItem]),
    bottom: `<div class="matchhead"><span>Escritório</span><b>${esc(club.team.name)}</b></div><div class="menu tight">${items.slice(0, 2).map(officeBar).join('')}<button type="button" class="mbar" data-squad="office" style="grid-template-columns:1fr auto"><span>Plantel</span><small>Titulares, banco e vendas</small></button><button type="button" class="mbar" data-go="emblem" style="grid-template-columns:1fr auto"><span>Emblema</span><small>Forma, cores e símbolo</small></button><button type="button" class="mbar" data-act="editKit" style="grid-template-columns:1fr auto"><span>Equipamentos</span><small>Desenho e cores</small></button><button type="button" class="mbar" data-go="market" style="grid-template-columns:1fr auto"><span>Mercado</span><small>${club.offers.length ? `${club.offers.length} ${club.offers.length === 1 ? 'proposta' : 'propostas'} à espera` : `Sobra ${surplus(club)} mil`}</small></button>${items.slice(2).map(officeBar).join('')}</div>${bar(backBtn('town'))}`,
  };
}

const SCREENS: Record<Screen, () => Rendered> = {
  create: createScreen, market: marketScreen, renewals: renewalsScreen, rival: rivalScreen, squad: squadScreen, train: trainScreen, trainCards: trainCardsScreen, combos: combosScreen, report: reportScreen, emblem: emblemScreen, kitEdit: kitEditScreen,
  offers: offersScreen, pre: preScreen, tactics: tacticsScreen, kit: kitScreen, halfStats: halfStatsScreen, federation: federationScreen, office: officeScreen,
};

/** Um padrão de bolas muito discreto atrás das fichas, feito aqui. */
let patternUrl = '';
const pattern = (): string => {
  if (patternUrl) return patternUrl;
  const canvas = document.createElement('canvas');
  canvas.width = 28;
  canvas.height = 28;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#0f5560';
  g.fillRect(0, 0, 28, 28);
  g.fillStyle = '#17737a';
  for (const [x, y] of [[4, 4], [18, 18]] as const) {
    g.fillRect(x + 1, y, 4, 6);
    g.fillRect(x, y + 1, 6, 4);
  }
  patternUrl = canvas.toDataURL();
  return patternUrl;
};

function render(): void {
  const { top: top_, panel } = host;
  const scroll = panel.querySelector('.scroll')?.scrollTop ?? 0;
  host.tallTop(screen === 'kit' ? 450 : screen === 'kitEdit' ? 450 : screen === 'create' ? 290 : screen === 'pre' ? 470 : 0);
  const { top, bottom, after } = SCREENS[screen]();
  top_.innerHTML = top;
  top_.style.backgroundImage = `url(${pattern()})`;
  panel.innerHTML = bottom;
  const nextScroll = panel.querySelector('.scroll');
  if (nextScroll) nextScroll.scrollTop = scroll;
  after?.();
}

function go(next: GoTo): void {
  if (next === 'town') {
    host.toTown();
    return;
  }
  if (next === 'tactics') tacticsBack = screen === 'tactics' ? tacticsBack : screen;
  // O balneário, antes do jogo e ao intervalo, tem o seu tema.
  if (next === 'pre') host.music('locker');
  screen = next;
  swapping = null;
  selling = false;
  active = true;
  host.showMenus();
  render();
}

function trainNow(): void {
  const before = club.team.roster[selected]!;
  const cards = [...picked];
  const { club: trained, result, isNewCombo } = trainOne(club, selected, cards);
  commit(trained);
  lastTraining = { before, result, cards, isNew: isNewCombo, index: selected };
  picked = [];
  focusCard = null;
  host.sound(isNewCombo ? 'bigCheer' : 'cheer');
  if (isNewCombo) host.music('combo');
  go('report');
}

/** Ao intervalo, as táticas que contam são as do jogo; fora dele, as do clube. */
const liveTactics = (): ClubState['tactics'] => (half ? host.match()!.s.tactics[0] : club.tactics);

/** Antes do jogo, as táticas ficam no clube. Ao intervalo entram só no jogo a decorrer, como comando do treinador, para a repetição. */
function applyTactics(tactics: ClubState['tactics']): void {
  if (half) setTactics(host.match()!.s, 0, tactics);
  else commit({ ...club, tactics });
  render();
}

const editKit = (change: Partial<ClubKit>): void => {
  commit({ ...club, kits: club.kits.map(kit => (kit.id === kitEditing ? { ...kit, ...change } : kit)) });
  render();
};
const editEmblem = (change: Partial<Emblem>): void => {
  commit({ ...club, emblem: { ...club.emblem, ...change } });
  render();
};

function onClick(event: Event): void {
  if (!active) return;
  const target = (event.target as HTMLElement).closest<HTMLElement>('button');
  if (!target || (target as HTMLButtonElement).disabled) return;
  const data = target.dataset;
  if (data.go) {
    if (data.go === 'emblem') emblemBack = screen === 'emblem' ? emblemBack : screen;
    go(data.go as GoTo);
  } else if (data.pre) {
    gameKind = data.pre as GameKind;
    half = false;
    go('pre');
  } else if (data.squad) {
    backFromSquad = data.squad as GoTo;
    go('squad');
  } else if (data.player !== undefined) {
    const index = Number(data.player);
    if (swapping !== null && swapping !== index) {
      commit(swapPlayers(club, swapping, index));
      swapping = null;
    }
    selected = index;
    selling = false;
    render();
  } else if (data.card) {
    const id = data.card as CardId;
    picked = picked.includes(id) ? picked.filter(c => c !== id) : [...picked, id];
    focusCard = id;
    render();
  } else if (data.remove) {
    picked = picked.filter(c => c !== data.remove);
    render();
  } else if (data.act === 'editKit') {
    kitEditBack = screen;
    kitEditing = screen === 'kit' ? club.kitChoice : kitEditing;
    go('kitEdit');
  } else if (data.kitEdit) {
    kitEditing = data.kitEdit;
    render();
  } else if (data.kitPattern) {
    editKit({ pattern: data.kitPattern as KitPattern });
  } else if (data.kitPart) {
    kitPart = data.kitPart as typeof kitPart;
    render();
  } else if (data.kitColor) {
    editKit({ [kitPart]: data.kitColor });
  } else if (data.emDesign) {
    const [shape, pattern] = data.emDesign.split(':') as [Emblem['shape'], Emblem['pattern']];
    editEmblem({ shape, pattern });
  } else if (data.emPage) {
    emblemPage += Number(data.emPage);
    render();
  } else if (data.emSymbol) {
    editEmblem({ symbol: data.emSymbol as Emblem['symbol'] });
  } else if (data.emBorder) {
    editEmblem({ border: data.emBorder as Emblem['border'] });
  } else if (data.emPart) {
    emblemPart = data.emPart as typeof emblemPart;
    render();
  } else if (data.emColor) {
    editEmblem({ [emblemPart]: data.emColor });
  } else if (data.trophy !== undefined) {
    selectedTrophy = Number(data.trophy);
    render();
  } else if (data.tactic) {
    applyTactics({ ...liveTactics(), [data.tactic]: tacticValue(data.tactic, data.tacticValue!) });
  } else if (data.optionSlot !== undefined) {
    optionPicking = Number(data.optionSlot);
    render();
  } else if (data.optionSet !== undefined) {
    const options = pickOption(liveTactics().options ?? [], optionPicking ?? 0, data.optionSet);
    optionPicking = null;
    applyTactics({ ...liveTactics(), options });
  } else if (data.optionCancel !== undefined) {
    optionPicking = null;
    render();
  } else if (data.optionClear !== undefined) {
    applyTactics({ ...liveTactics(), options: [] });
  } else if (data.target !== undefined) {
    const index = Number(data.target);
    const focus = liveTactics().focus ?? [];
    applyTactics({ ...liveTactics(), focus: focus.includes(index) ? focus.filter(i => i !== index) : [...focus, index].slice(0, MAX_FOCUS) });
  } else if (data.act === 'clearFocus') {
    applyTactics({ ...liveTactics(), focus: [] });
  } else if (data.kit) {
    commit({ ...club, kitChoice: data.kit });
    render();
  } else if (data.rivalKit !== undefined) {
    rivalKitPick = { week: club.week, name: currentRival().name, index: Number(data.rivalKit) };
    render();
  } else if (data.offerKind) {
    offerKind = data.offerKind as typeof offerKind;
    render();
  } else if (data.offer !== undefined) {
    offerClub = Number(data.offer);
    render();
  } else if (data.fedTab) {
    federationTab = data.fedTab as typeof federationTab;
    render();
  } else if (data.rivalView !== undefined) {
    rivalStats = data.rivalView === '1';
    render();
  } else if (data.fedClub !== undefined) {
    // Tocar num clube abre o plantel dele.
    federationClub = Number(data.fedClub);
    federationPlayer = -1;
    federationScroll = 0;
    render();
  } else if (data.fedDivision !== undefined) {
    federationDivision = Number(data.fedDivision);
    federationClub = federationDivision === club.division ? PLAYER_CLUB : club.divisions[federationDivision]![0]!;
    federationPlayer = -1;
    federationScroll = 0;
    federationTab = 'table';
    render();
  } else if (data.fedPlayer !== undefined) {
    if (Number(data.fedPlayer) >= 0) federationScroll = document.querySelector('.fedsheet .inner')?.scrollTop ?? 0;
    federationPlayer = Number(data.fedPlayer);
    render();
  } else if (data.cupView) {
    cupView = data.cupView as CupName;
    render();
  } else if (data.fedRound !== undefined) {
    federationRound = Math.max(0, Math.min(club.rounds.length - 1, federationRound + Number(data.fedRound)));
    render();
  } else if (data.office) {
    officeItem = data.office as OfficeItem;
    render();
  } else if (data.facility) {
    commit(buyFacility(club, data.facility as FacilityId));
    host.sound('cheer');
    render();
  } else if (data.act === 'swap') {
    swapping = swapping === null ? selected : null;
    render();
  } else if (data.act === 'openCards') {
    picked = [];
    focusCard = null;
    go('trainCards');
  } else if (data.act === 'trainNow') {
    trainNow();
  } else if (data.act === 'skipFx') {
    target.classList.add('done');
    host.panel.querySelector('.after')?.classList.add('done');
  } else if (data.act === 'startMatch') {
    host.kickOff(gameKind, rivalId());
  } else if (data.act === 'secondHalf') {
    host.secondHalf();
  } else if (data.act === 'halfSubs') {
    host.halfSubs();
  } else if (data.act === 'newClub') {
    host.newClub();
  } else if (data.act === 'startClub') {
    host.toTown();
  } else if (data.market !== undefined) {
    marketPick = Number(data.market);
    render();
  } else if (data.act === 'offer') {
    const entry = marketList(club)[marketPick];
    if (entry) commit(makeOffer(club, entry));
    marketPick = 0;
    render();
  } else if (data.cancelOffer) {
    commit(cancelOffer(club, data.cancelOffer));
    render();
  } else if (data.act === 'sell') {
    if (selling) {
      commit(sellPlayer(club, club.team.roster[selected]!.name));
      selected = Math.min(selected, club.team.roster.length - 1);
      selling = false;
    } else selling = true;
    render();
  } else if (data.renew) {
    if (keep.has(data.renew)) keep.delete(data.renew);
    else keep.add(data.renew);
    render();
  } else if (data.act === 'confirmRenewals') {
    commit(applyRenewals(club, [...keep]));
    host.toTown();
  }
}

// As letras só aceitam o que a letra do jogo sabe desenhar, e escrever não pode tirar o cursor do sítio.
function onInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (!active) return;
  if (input.id === 'clubName') {
    commit(renameClub(club, input.value));
    element('createName').textContent = club.team.name;
    element('createCrest').innerHTML = ownCrest(96);
    // Enquanto não se escolhe outra, a abreviatura acompanha o nome.
    const short = document.getElementById('clubShort') as HTMLInputElement | null;
    if (short && short !== document.activeElement) short.value = club.team.short;
    return;
  }
  if (input.id !== 'clubShort') return;
  input.value = emblemLetters(input.value);
  commit(setClubShort(club, input.value));
  element('createCrest').innerHTML = ownCrest(96);
}

export function initMenus(menuHost: MenuHost): void {
  host = menuHost;
  host.top.addEventListener('click', onClick);
  host.panel.addEventListener('click', onClick);
  host.panel.addEventListener('input', onInput);
}

export const menusOpen = (): boolean => active;

export function closeMenus(): void {
  active = false;
}

/** Abre um dos menus a partir da cidade. */
export function openMenu(next: Screen, squadBack: GoTo = 'town'): void {
  club = host.club();
  half = false;
  backFromSquad = squadBack;
  tacticsBack = 'town';
  if (next === 'federation') {
    federationDivision = club.division;
    federationPlayer = -1;
    federationScroll = 0;
    if (!club.divisions[club.division]!.includes(federationClub)) federationClub = PLAYER_CLUB;
  }
  if (next === 'office') {
    officeItem = 'board';
    emblemBack = 'office';
    kitEditBack = 'office';
  }
  if (next === 'federation') {
    federationRound = Math.max(0, club.rounds.map(round => Boolean(round[0]?.score)).lastIndexOf(true));
    if (federationTab === 'playoffs' && !playoffFormat(club)) federationTab = 'table';
  }
  // Assim, o Voltar das táticas sabe que se veio da cidade e não do último menu aberto.
  screen = next;
  go(next);
}

/** Entre o balanço da época e a seguinte: decidir quem fica. Começa com toda a gente que couber, dos melhores para os piores. */
export function openRenewals(): void {
  club = host.club();
  half = false;
  keep = new Set();
  let total = 0;
  for (const r of [...(club.pendingRenewals ?? [])].sort((a, b) => b.asked - a.asked)) {
    if (total + r.asked <= club.money) {
      keep.add(r.name);
      total += r.asked;
    }
  }
  go('renewals');
}

/** O clube acabou de nascer: dá-se-lhe nome, emblema e cores. */
export function openCreate(): void {
  club = host.club();
  half = false;
  emblemBack = 'create';
  kitEditBack = 'create';
  kitEditing = club.kitChoice;
  go('create');
}

/** As propostas de jogo-treino e de particular desta semana. */
export function openOffers(): void {
  club = host.club();
  half = false;
  offerClub = 0;
  offerKind = 'practice';
  go('offers');
}

/** O pavilhão: numa semana com jogo vai-se ao balneário, numa semana livre vêem-se as propostas. */
export function openArena(): void {
  club = host.club();
  half = false;
  gameKind = 'official';
  if (currentFixture(club)) go('pre');
  else openOffers();
}

export function openHalf(kind: GameKind, rival: number): void {
  club = host.club();
  gameKind = kind;
  half = true;
  if (kind !== 'official') offerClub = Math.max(0, offers().indexOf(rival));
  go('pre');
}

/** Uma cena no ecrã de cima, com uma etiqueta, para os ecrãs que não vivem aqui: o despedimento e a descida. */
export function showTopScene(kind: SceneKind, title: string, side: string): void {
  active = false;
  club = host.club();
  host.top.innerHTML = `${fullCanvas('scene', kind)}<div class="tnote"><b>${title}</b><span>${side}</span></div>`;
}

/** Uma ficha no ecrã de cima, para os ecrãs que não vivem aqui, como o balanço da época. */
export function showTopNote(title: string, side: string, inner: string): void {
  active = false;
  club = host.club();
  host.top.innerHTML = inside(`<div class="note"><header><b>${title}</b><span>${side}</span></header><div class="inner">${inner}</div></div>`);
  host.top.style.backgroundImage = `url(${pattern()})`;
}

/** O ecrã de cima mudou de tamanho: só as cenas é que dependem dele. */
export function menusResized(): void {
  if (active && host.top.querySelector('canvas.full')) render();
}


/** Durante o combo, o jogador faz o treino de cada carta: salta, dribla, descansa ou estuda. */
const TRAINING_POSES: Record<CardCategory, PoseName[]> = { physical: ['block', 'idle', 'block', 'defend'], technique: ['drib0', 'drib1', 'crossover', 'drib1'], tactic: ['idle', 'pass', 'defend', 'pass'], support: ['sit', 'sit', 'cheer0', 'sit'] };
let fxStarted = 0;
function drawTrainingFx(canvas: HTMLCanvasElement, now: number): void {
  if (!lastTraining) return;
  if (!fxStarted) fxStarted = now;
  const age = now - fxStarted;
  const g = canvas.getContext('2d')!;
  g.clearRect(0, 0, canvas.width, canvas.height);
  if (age > 1150 && !reducedMotion()) return;
  const look = lookFor(club.team.roster[lastTraining.index]!);
  lastTraining.cards.forEach((id, n) => {
    const poses = TRAINING_POSES[CARDS[id].category];
    const pose = poses[Math.floor(now / 180 + n) % poses.length]!;
    drawSprite(g, pose, look, 15 + n * 30, 46, n === 2, false, CARDS[id].category === 'technique');
  });
}

/** No fim de uma época com título: os cinco a festejar, o do meio com o troféu no ar, e confetti por cima. */
function drawConfetti(canvas: HTMLCanvasElement, now: number): void {
  const g = canvas.getContext('2d')!;
  const kit = activeKit(club);
  g.clearRect(0, 0, canvas.width, canvas.height);
  const record = club.seasonReport;
  if (record) {
    const big = (record.outcome === 'champion' && record.division === DIVISIONS.length - 1) || record.cups.includes('world');
    const bob = (n: number): number => (reducedMotion() ? 0 : Math.floor(now / 220 + n) % 2);
    club.team.roster.slice(0, 5).forEach((p, n) => {
      const lift = n === 2 ? 0 : bob(n);
      drawSprite(g, lift ? 'cheer1' : 'cheer0', { ...lookOf(p, 'blue'), custom: kit }, 18 + n * 20, canvas.height - 4 - lift * 2, n > 2, false, false);
    });
    // A base do troféu fica nas mãos levantadas do jogador do meio.
    drawTrophy(g, 58, canvas.height - 30 - bob(2) * 2, big ? 'bigCup' : 'cup', true);
  }
  if (reducedMotion()) return;
  const colors = [kit.jersey, kit.trim, '#f2c230', '#f4efe0'];
  for (let n = 0; n < 40; n++) {
    const x = ((n * 53) % canvas.width + Math.sin(now / 700 + n) * 8 + canvas.width) % canvas.width;
    const y = ((n * 37) % canvas.height + (now / 1000) * (18 + (n % 4) * 6)) % canvas.height;
    g.fillStyle = colors[n % colors.length]!;
    g.fillRect(Math.round(x), Math.round(y), 3, n % 3 === 0 ? 2 : 3);
  }
}

/** As cenas têm vida, por isso desenham-se a cada imagem. */
export function menuFrame(now: number): void {
  const fx = document.getElementById('fxScene') as HTMLCanvasElement | null;
  if (fx) drawTrainingFx(fx, now);
  else fxStarted = 0;
  const confetti = document.getElementById('confetti') as HTMLCanvasElement | null;
  if (confetti) drawConfetti(confetti, now);
  const flag = document.getElementById('flag') as HTMLCanvasElement | null;
  if (flag) drawFlagScene(flag, club.emblem, reducedMotion() ? 0 : now);
  const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
  if (!canvas) return;
  const view = host.match();
  const kind = (canvas.dataset.kind as SceneKind | undefined) ?? (half ? 'lockerHalf' : gameKind === 'practice' ? 'gym' : 'lockerPre');
  const score = half && view ? `${view.s.score[0]} - ${view.s.score[1]}` : '';
  drawSceneFrame(canvas, kind, club.team.roster, activeKit(club), currentRival(), score, reducedMotion() ? 0 : now, club.confidence);
}
