// Os menus do jogo: em cima a ficha ou a cena, em baixo as decisões. A cidade e o jogo em si ficam em main.ts.
import { BALANCE as B } from '../sim/balance.ts';
import { CUP_NAMES, CUP_ROUNDS, FEDERATION_ROUNDS, type CupName } from '../sim/cup.ts';
import { seriesWinner, seriesWins } from '../sim/playoff.ts';
import { drawBracket, fullBracket, type BracketRound, type BracketSlot } from './art/bracket.ts';
import { LEAGUE_SIZE, MOVING_PLACES } from '../sim/league.ts';
import { setTactics } from '../sim/match.ts';
import { DIVISIONS, teamRating } from '../sim/teamgen.ts';
import { CARD_IDS, CARDS, COMBOS, MAX_CARDS_PER_PLAYER, previewGains, type CardCategory, type CardId, type TrainingResult } from '../sim/training.ts';
import { ATTRIBUTE_KEYS, MAX_FOCUS, gradeOf, type Attributes, type Player, type Team } from '../sim/types.ts';
import { CATEGORIES, CATEGORY_INFO, cardImage } from './art/cards.ts';
import { KIT_PATTERNS, PALETTE, emblemImage, emblemLetters, type ClubKit, type Emblem, type KitPattern } from './art/kit.ts';
import { portraitImage } from './art/portrait.ts';
import { drawSceneFrame, drawTacticsBoard, type SceneKind } from './art/scenes.ts';
import { INK, KITS, drawSprite, lookOf, type Look } from './art/sprites.ts';
import { CLUB_NAME_MAX, PLAYER_CLUB, activeKit, aiTeam, applyRenewals, cancelOffer, cupRoundName, cupStatus, currentFixture, leagueTable, makeOffer, marketList, salaryFor, sellPlayer, surplus, totalSalaries, transferFee, transferWindowOpen, yearsAtClub, type MarketEntry, opponentId, playoffFormat, renameClub, swapPlayers, totalCards, trainOne, type ClubState } from './club.ts';
import { officialLabel } from './season-screens.ts';
import { TACTIC_ROWS } from './club-screens.ts';
import type { MatchView, Sound } from './match-view.ts';
import { MOVE_INFO, OFF_BALL_INFO, ON_BALL_INFO } from './narrate.ts';
import { ATTRIBUTE_LABELS, escapeHtml as esc, panelContent } from './panel.ts';
import { drawShelf, trophyList } from './trophies.ts';

export type GameKind = 'official' | 'friendly' | 'practice';
type Screen = 'create' | 'market' | 'renewals' | 'rival' | 'squad' | 'train' | 'trainCards' | 'combos' | 'report' | 'emblem' | 'kitEdit' | 'offers' | 'pre' | 'tactics' | 'kit' | 'halfStats' | 'federation' | 'office';
type GoTo = Screen | 'town';
type OfficeItem = 'board' | 'trophies' | 'history' | 'reset';

export interface MenuHost {
  top: HTMLElement;
  panel: HTMLElement;
  club(): ClubState;
  setClub(club: ClubState): void;
  /** O tamanho do ecrã de cima, em píxeis de arte. */
  topSize(): readonly [number, number];
  /** O jogo a decorrer, se estivermos no intervalo. */
  match(): MatchView | undefined;
  showMenus(): void;
  toTown(): void;
  kickOff(kind: GameKind, rivalId: number): void;
  secondHalf(): void;
  halfSubs(): void;
  newClub(): void;
  sound(name: Sound): void;
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

const SHORT_NAMES: Record<CardId, string> = {
  readDefense: 'Ler Defesa', pickRoll: 'Pick&Roll', whiteboard: 'Quadro', video: 'Vídeo', transition: 'Transição',
  shooting: 'Lançar', dribble: 'Drible', bouncePass: 'Passe', freeThrows: 'Livres', hookShot: 'Gancho',
  sprints: 'Sprints', weights: 'Pesos', jumps: 'Saltos', longRun: 'Corrida', agility: 'Agilidade',
  soup: 'Sopa', nap: 'Sesta', massage: 'Massagem', dance: 'Bailarico', fado: 'Fado',
};

/* ---------- Ícones, desenhados aqui para serem nossos ---------- */
function iconFrom(rows: readonly string[], color: string, back: string | null, size = 16): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d')!;
  if (back) {
    g.fillStyle = back;
    g.fillRect(0, 0, size, size);
  }
  const offX = Math.floor((size - rows[0]!.length) / 2);
  const offY = Math.floor((size - rows.length) / 2);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = ch === '#' ? color : ch === 'o' ? '#e8622a' : INK;
      g.fillRect(offX + x, offY + y, 1, 1);
    });
  });
  return canvas.toDataURL();
}

const ATTRIBUTE_ICONS: Record<keyof Attributes, string> = {
  shooting: iconFrom(['..oo.###', '.oooo#.#', '.oooo###', '..oo..#.', '.....#..', '...##...', '.##.....'], '#ffffff', '#7246c4'),
  speed: iconFrom(['#..#....', '##.##...', '.##.##..', '..##.##.', '.##.##..', '##.##...', '#..#....'], '#ffffff', '#2f9b6a'),
  stamina: iconFrom(['...##...', '.######.', '.#....#.', '.#.##.#.', '.#.##.#.', '.#.##.#.', '.#.##.#.', '.######.'], '#ffffff', '#d9772b'),
  technique: iconFrom(['..####..', '.#.##.#.', '#..##..#', '########', '#..##..#', '.#.##.#.', '..####..'], '#ffffff', '#3a4252'),
  strength: iconFrom(['##....##', '##....##', '########', '########', '##....##', '##....##'], '#1b2230', '#f2c230'),
  jumping: iconFrom(['...##...', '..####..', '.######.', '...##...', '...##...', '...##...', '########'], '#ffffff', '#2b8fd0'),
  willpower: iconFrom(['.##..##.', '########', '########', '.######.', '..####..', '...##...'], '#cf3a2c', '#f4e0d8'),
};
const ICON_WHISTLE = iconFrom(['..........', '.xxxxxx.xx', 'x######x#x', 'x##xx##xxx', 'x##xx##x..', 'x######x..', '.xxxxxx...'], '#f2c230', null, 12);
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
const dot = (p: Player): string => `<i class="edot${p.fatigue >= 0.35 ? ' low' : p.fatigue >= 0.15 ? ' mid' : ''}" title="Energia ${Math.round((1 - p.fatigue) * 100)}%"></i>`;
const crest = (short: string, away = false, big = false): string => `<span class="mcrest${away ? ' away' : ''}${big ? ' big' : ''}">${esc(short)}</span>`;
const bar = (...buttons: string[]): string => `<div class="actions">${buttons.join('')}</div>`;
const backBtn = (to: GoTo): string => `<button type="button" class="back" data-go="${to}">‹ Voltar</button>`;
const chevrons = (potential: number): string => {
  const on = Math.round((potential / 100) * 12);
  return `<div class="chevrons">${Array.from({ length: 12 }, (_, n) => `<i class="${n < on ? 'on' : ''}${n < on && n >= 8 ? ' hot' : ''}"></i>`).join('')}</div>`;
};

function playerCard(index: number, extra?: string): string {
  const p = club.team.roster[index]!;
  const stats = club.stats[p.name] ?? { games: 0, points: 0, rebounds: 0, assists: 0 };
  const recent = club.recentTraining[p.name] ?? [];
  const history = [0, 1, 2, 3].map(n => `<i${recent[n] ? ` style="background:${CATEGORY_INFO[recent[n]!].color}"` : ''}></i>`).join('');
  return `<div class="pcard">
    <header>${ownCrest()}<span>${p.position}</span><b>${esc(p.name)}</b><span>${p.heightCm} cm · ${p.weightKg} kg</span></header>
    <div class="pbody">
      <img class="pportrait" alt="Retrato de ${esc(p.name)}" src="${portraitImage(lookFor(p))}">
      <div class="pshirt" aria-label="Camisola ${shirtOf(p)}">${shirtOf(p)}</div>
      <div>
        <div class="grades">${ATTRIBUTE_KEYS.map(key => `<img alt="" title="${ATTRIBUTE_LABELS.find(([k]) => k === key)![1]}" src="${ATTRIBUTE_ICONS[key]}">`).join('')}</div>
        <div class="grades">${ATTRIBUTE_KEYS.map(key => grade(p.attributes[key])).join('')}</div>
        <div class="kv"><span>Sem bola</span><b>${OFF_BALL_INFO[p.offBall].name}</b></div>
        <div class="kv"><span>Com bola</span><b>${ON_BALL_INFO[p.onBall].name}</b></div>
        <div class="kv"><span>Potencial</span>${chevrons(p.potential)}</div>
      </div>
    </div>
    ${extra ?? ''}${`<div class="pfoot${extra ? ' spare' : ''}">
      <div class="rows">
        <div>${dot(p)}<span>Energia ${Math.round((1 - p.fatigue) * 100)}%</span></div>
        <div><span>Na equipa</span><span>${yearsAtClub(club, p.name)} ép.</span></div>
        <div><span>Jogos</span><span>${stats.games}</span></div>
        <div><span>Salário</span><span>${club.salaries[p.name] ?? salaryFor(p)} mil</span></div>
        <div class="history" title="Treino das últimas 4 semanas" style="display:grid">${history}</div>
      </div>
      <div>
        <table class="seasons"><tr><th>Ép</th><th>Equipa</th><th>J</th><th>Pts</th><th>Res</th><th>Ass</th></tr>
          <tr><td>${club.season}</td><td>${esc(club.team.short)}</td><td>${stats.games}</td><td>${stats.points}</td><td>${stats.rebounds}</td><td>${stats.assists}</td></tr></table>
        <div style="padding:2px 0">Movimentos: ${p.moves.map(m => MOVE_INFO[m].name).join(', ') || 'nenhum'}</div>
      </div>
    </div>`}
  </div>`;
}

const attributeHead = ATTRIBUTE_KEYS.map(key => `<img alt="${ATTRIBUTE_LABELS.find(([k]) => k === key)![1]}" src="${ATTRIBUTE_ICONS[key]}">`).join('');

function squadRows(renderEnd: (p: Player, index: number) => string): string {
  const row = (p: Player, index: number): string => `<button type="button" class="prow${index >= 5 ? ' bench' : ''}${swapping === index ? ' swapfrom' : ''}${screen === 'train' && club.trainedThisWeek.includes(p.name) ? ' trained' : ''}" data-player="${index}" aria-pressed="${selected === index}">
      <span class="ppos ppos-${p.position}">${p.position}</span><span class="pnum">${shirtOf(p)}</span><span class="name">${esc(p.name)}</span>${dot(p)}${renderEnd(p, index)}
    </button>`;
  return club.team.roster.map(row).join('');
}

/* ---------- Ecrãs ---------- */
interface Rendered {
  top: string;
  bottom: string;
  after?: () => void;
}

const fullCanvas = (id: string): string => {
  const [width, height] = host.topSize();
  return `<canvas class="full" id="${id}" width="${width}" height="${height}"></canvas>`;
};
const inside = (html: string): string => `<div class="patterned">${html}</div>`;

function squadScreen(): Rendered {
  return {
    top: inside(playerCard(selected)),
    bottom: `<div class="thead"><span>Pos</span><span>#</span><span>Jogador</span><span></span>${attributeHead}</div>
      <div class="scroll">
        <div class="starters"><span>Titulares</span><span>${swapping === null ? '' : 'Toca em quem entra para o lugar dele'}</span></div>
        ${squadRows(p => ATTRIBUTE_KEYS.map(key => grade(p.attributes[key])).join('')).replace('<button type="button" class="prow bench', '<div class="starters plain"><span>Banco</span></div><button type="button" class="prow bench')}
      </div>
      ${bar(backBtn(backFromSquad), `<button type="button" data-act="swap" aria-pressed="${swapping !== null}">${swapping === null ? '⇄ Trocar' : 'Cancelar'}</button>`, backFromSquad === 'town' ? `<button type="button" data-act="sell" aria-pressed="${selling}" ${club.team.roster.length <= 10 ? 'disabled' : ''}>${selling ? `Vender por ${transferFee(club.team.roster[selected]!)}?` : 'Vender'}</button>` : '<button type="button" data-go="tactics">Táticas</button>')}`,
  };
}

function trainSlots(): string {
  return `<div class="slots">${Array.from({ length: MAX_CARDS_PER_PLAYER }, (_, n) => {
    const id = picked[n];
    return id
      ? `<button type="button" class="slot" data-remove="${id}" aria-label="Tirar ${CARDS[id].name}"><img alt="" src="${cardImage(id, CARDS[id].category)}"><span>${SHORT_NAMES[id]}</span></button>`
      : '<div class="slot empty">Vazio</div>';
  }).join('')}</div>`;
}

const leftOf = (id: CardId): number => (club.cards[id] ?? 0) - picked.filter(c => c === id).length;

/** A lista: as notas de todos, como no plantel. Escolhe-se um jogador e treina-se esse. */
function trainScreen(): Rendered {
  const player = club.team.roster[selected]!;
  const done = club.trainedThisWeek.includes(player.name);
  return {
    top: inside(playerCard(selected)),
    bottom: `<div class="thead"><span>Pos</span><span>#</span><span>Jogador</span><span></span>${attributeHead}</div>
      <div class="scroll">${squadRows(p => ATTRIBUTE_KEYS.map(key => grade(p.attributes[key])).join(''))}</div>
      ${bar(backBtn('town'), `<button type="button" data-go="combos">Combos ${club.knownCombos.length}/${COMBOS.length}</button>`, `<button type="button" class="primary" data-act="openCards" ${done || totalCards(club) === 0 ? 'disabled' : ''}>${done ? 'Já treinou' : `Treinar ${esc(player.name)} ›`}</button>`)}`,
  };
}

/** As cartas deste jogador. O treino acontece logo aqui, só para ele. */
function trainCardsScreen(): Rendered {
  const preview = previewGains(club.team.roster[selected]!, picked, club.knownCombos);
  const gains = ATTRIBUTE_KEYS.filter(key => preview[key]).map(key => `<b>${preview[key]! > 0 ? '+' : ''}${preview[key]!.toFixed(1).replace('.', ',')}</b> ${ATTRIBUTE_LABELS.find(([k]) => k === key)![1]}`).join(' · ');
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

function combosScreen(): Rendered {
  const rows = COMBOS.map(combo => {
    const known = club.knownCombos.includes(combo.id);
    return `<tr><td>${known ? esc(combo.name) : '???'}</td><td>${known ? combo.cards.map(id => SHORT_NAMES[id]).join(' + ') : combo.cards.map(id => CATEGORY_INFO[CARDS[id].category].name).join(' + ')}</td></tr>`;
  }).join('');
  return {
    top: inside(`<div class="note"><header><b>Caderno de combos</b><span>${club.knownCombos.length} de ${COMBOS.length}</span></header><div class="inner">
      <div class="quote">Cada combo descoberto fica aqui escrito. Dos outros, só se sabe de que categorias são as cartas.</div>
    </div></div>`),
    bottom: `<div class="scroll"><table class="mini-table"><tr><th>Combo</th><th>Cartas</th></tr>${rows}</table></div>${bar(backBtn('train'))}`,
  };
}

/** O resultado do treino: num combo, as cartas juntam-se e dão lugar ao nome dele. */
function reportScreen(): Rendered {
  const { before, result, cards, isNew, index } = lastTraining!;
  const combo = result.combo;
  const place = [-110, 0, 110];
  const rows = ATTRIBUTE_KEYS.filter(key => result.gains[key]).map(key => {
    const gain = result.gains[key]!;
    return `<div class="gainrow${gain < 0 ? ' down' : ''}"><img alt="" src="${ATTRIBUTE_ICONS[key]}"><span>${ATTRIBUTE_LABELS.find(([k]) => k === key)![1]}</span>${grade(before.attributes[key])}<i>›</i>${grade(result.player.attributes[key])}<b>${gain > 0 ? '+' : ''}${gain.toFixed(1).replace('.', ',')}</b></div>`;
  }).join('');
  const learned = [
    result.newMove ? `Aprendeu ${MOVE_INFO[result.newMove].name}` : '',
    result.moveBlocked ? 'Já sabe 2 movimentos: não aprendeu mais nenhum' : '',
    combo?.offBall ? `Sem bola passa a ${OFF_BALL_INFO[combo.offBall].name}` : '',
    combo?.onBall ? `Com bola passa a ${ON_BALL_INFO[combo.onBall].name}` : '',
  ].filter(Boolean).map(line => `<div class="learned">${line}</div>`).join('');
  const heroCards = cards.map((id, n) => `<img class="fx-card" style="--x:${place[cards.length === 2 ? n * 2 : n]! * (cards.length === 1 ? 0 : 1)}px" alt="${CARDS[id].name}" src="${cardImage(id, CARDS[id].category)}">`).join('');
  const sparks = Array.from({ length: 12 }, (_, n) => `<i class="fx-spark" style="--dx:${Math.round(Math.cos((n / 12) * Math.PI * 2) * 150)}px;--dy:${Math.round(Math.sin((n / 12) * Math.PI * 2) * 110)}px"></i>`).join('');
  return {
    top: combo
      ? `<button type="button" class="combofx" data-act="skipFx" aria-label="Ver já o resultado">
          <span class="fx-rays"></span>
          ${heroCards}
          ${sparks}
          <span class="fx-flash"></span>
          <span class="fx-text"><span class="k">${isNew ? 'Combo secreto descoberto!' : 'Combo!'}</span><span class="n">${esc(combo.name)}</span><span class="cs">${cards.map(id => `<img alt="" src="${cardImage(id, CARDS[id].category)}">`).join('')}</span></span>
        </button>`
      : inside(playerCard(index)),
    bottom: `<div class="after${combo ? ' delayed' : ''}"><div class="matchhead"><span>Treino de ${esc(before.name)}</span><b>${combo ? esc(combo.name) : 'Sem combo'}</b></div><div class="scroll gains">${rows}${learned}</div></div>${bar('<button type="button" class="primary" data-go="train">Continuar</button>')}`,
  };
}

const offers = (): number[] => club.divisions.flatMap((ids, d) => {
  const others = ids.filter(id => id !== PLAYER_CLUB);
  const count = d === club.division ? 5 : d === club.division + 1 ? 3 : 0;
  // Todas as semanas há clubes diferentes a propor jogos.
  const start = (club.week * 3 + club.season) % others.length;
  return [...others.slice(start), ...others.slice(0, start)].slice(0, count);
});
const practiceAllowed = (): boolean => !club.practicedThisWeek;
const friendlyAllowed = (): boolean => !currentFixture(club);

function offersScreen(): Rendered {
  const list = offers();
  const pick = club.clubs[list[offerClub] ?? list[0]!]!;
  const rival = aiTeam(pick);
  const compare = (label: string, a: number, b: number): string => `<div class="compare"><div class="left"><i style="width:${a}%"></i></div><span>${label}</span><div class="right"><i style="width:${b}%"></i></div></div>`;
  const avg = (team: Team, key: keyof Attributes): number => team.roster.slice(0, 5).reduce((sum, p) => sum + p.attributes[key], 0) / 5;
  return {
    top: inside(`<div class="note"><header><b>${offerKind === 'practice' ? 'Jogo-treino' : 'Particular'}</b><span>${offerKind === 'practice' ? 'Pavilhão fechado' : 'No nosso pavilhão'}</span></header><div class="inner">
      <div class="vsbox"><div>${ownCrest(32)}${esc(club.team.name)}<small>Nível ${gradeOf(teamRating(club.team))}</small></div><span>contra</span><div>${crest(rival.short, true, true)}${esc(rival.name)}<small>Nível ${gradeOf(teamRating(rival))}</small></div></div>
      ${(['shooting', 'speed', 'strength', 'jumping'] as const).map(key => compare(ATTRIBUTE_LABELS.find(([k]) => k === key)![1], avg(club.team, key), avg(rival, key))).join('')}
      <div class="quote">${offerKind === 'practice' ? 'Só dois períodos, à porta fechada e sem público. Dá menos cartas, cansa menos e não mexe na confiança.' : 'Jogo inteiro com público. Dá cartas, cansa, e conta metade para a confiança. Não conta para a liga.'}</div>
    </div></div>`),
    bottom: `<div class="chalk"><h2>Propostas de jogo</h2>
      <div class="chalktabs"><button type="button" data-offer-kind="practice" aria-pressed="${offerKind === 'practice'}" ${practiceAllowed() ? '' : 'disabled'}>${practiceAllowed() ? 'Jogo-treino' : 'Jogo-treino feito'}</button><button type="button" data-offer-kind="friendly" aria-pressed="${offerKind === 'friendly'}" ${friendlyAllowed() ? '' : 'disabled'}>Particular</button></div>
      <div class="scroll">${list.map((id, n) => `<button type="button" class="crow offer" data-offer="${n}" aria-pressed="${offerClub === n}"><span class="name">${esc(club.clubs[id]!.name)}</span><img alt="" src="${offerKind === 'practice' ? ICON_WHISTLE : ICON_BALL}"><small>${DIVISIONS[club.divisions.findIndex(ids => ids.includes(id))]!.name.replace('Liga ', '')}</small></button>`).join('')}</div>
    </div>${bar(backBtn('town'), `<button type="button" class="primary" data-pre="${offerKind}">Aceitar</button>`)}`,
  };
}

const rivalId = (): number => (gameKind === 'official' ? opponentId(club) : offers()[offerClub] ?? offers()[0]!);
const currentRival = (): Team => aiTeam(club.clubs[rivalId()]!);

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
    bottom: `<div class="matchhead"><span>${kind}</span><b>${esc(club.team.short)} contra ${esc(rival.name)}</b></div><div class="menu">${bars.join('')}</div>${half ? '' : bar(backBtn(gameKind === 'official' ? 'town' : 'offers'))}`,
  };
}

/** A ficha de um jogador que não é nosso, para o mercado. */
function marketCard(entry: MarketEntry): string {
  const p = entry.player;
  return `<div class="pcard">
    <header>${entry.clubId === null ? '<span>Livre</span>' : crest(club.clubs[entry.clubId]!.short, true)}<span>${p.position}</span><b>${esc(p.name)}</b><span>${p.heightCm} cm · ${p.weightKg} kg</span></header>
    <div class="pbody">
      <img class="pportrait" alt="Retrato de ${esc(p.name)}" src="${portraitImage(lookOf(p, entry.clubId === null ? 'coach' : 'cream'))}">
      <div class="pshirt" aria-label="Sem número">?</div>
      <div>
        <div class="grades">${ATTRIBUTE_KEYS.map(key => `<img alt="" title="${ATTRIBUTE_LABELS.find(([k]) => k === key)![1]}" src="${ATTRIBUTE_ICONS[key]}">`).join('')}</div>
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
      <span class="ppos ppos-${entry.player.position}">${entry.player.position}</span><span class="pnum">${entry.clubId === null ? 'L' : esc(club.clubs[entry.clubId]!.short.slice(0, 1))}</span><span class="name">${esc(entry.player.name)}</span><i class="edot${entry.salary + entry.fee > surplus(club) ? ' low' : ''}"></i>${ATTRIBUTE_KEYS.map(key => grade(entry.player.attributes[key])).join('')}
    </button>`).join('');
  const offers = club.offers.map(o => `<button type="button" class="prow" data-cancel-offer="${esc(o.player.name)}"><span class="ppos ppos-${o.player.position}">${o.player.position}</span><span class="pnum">${o.weeksLeft}s</span><span class="name">${esc(o.player.name)}</span><i class="edot mid"></i><span style="grid-column:span 7;text-align:right;font:400 15px/1 var(--small)">${o.fee} mil · cancelar</span></button>`).join('');
  const canOffer = pick !== null && pick.salary + pick.fee <= surplus(club) && club.team.roster.length + club.offers.length < 15 && (pick.clubId === null || transferWindowOpen(club));
  return {
    top: inside(pick ? marketCard(pick) : '<div class="note"><header><b>Mercado</b></header><div class="inner"><div class="quote">Esta semana não há ninguém à venda.</div></div></div>'),
    bottom: `<div class="thead"><span>Pos</span><span></span><span>${transferWindowOpen(club) ? 'À venda esta semana' : 'Só jogadores livres: o prazo passou'}</span><span></span>${attributeHead}</div>
      <div class="scroll">${offers ? `<div class="starters plain"><span>Propostas à espera</span></div>${offers}` : ''}<div class="starters plain"><span>Mercado</span><span>Sobra ${surplus(club)} mil</span></div>${rows}</div>
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
      <span class="ppos ppos-${p.position}">${p.position}</span><span class="pnum">${shirtOf(p)}</span><span class="name">${esc(p.name)}</span><i class="edot${kept ? '' : ' low'}"></i><span style="grid-column:span 7;text-align:right;font:400 15px/1 var(--small)">${r.current} › <b>${r.asked}</b> mil${kept ? '' : ' · sai'}</span>
    </button>`;
  }).join('');
  return {
    top: inside(`<div class="note"><header><b>Renovações</b><span>Época ${club.season}</span></header><div class="inner">
      <div class="kv"><span>Orçamento</span><b>${club.money} mil</b></div>
      <div class="kv"><span>Salários</span><b>${total} mil</b></div>
      <div class="kv"><span>Sobra</span><b style="color:${left < 0 ? 'var(--bad)' : 'var(--good)'}">${left} mil</b></div>
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
    top: inside(`<div class="note"><header><b id="createName">${esc(club.team.name)}</b><span>${DIVISIONS[club.division]!.name}</span></header><div class="inner kitstage">
      <div id="createCrest">${ownCrest(96)}</div>
      ${flatKit(kit)}
    </div></div>`),
    bottom: `<div class="editor" style="flex:1;min-height:0">
        <div><label for="clubName">Nome do clube</label><input id="clubName" maxlength="${CLUB_NAME_MAX}" autocomplete="off" spellcheck="false" style="width:100%;text-transform:none;letter-spacing:0" value="${esc(club.team.name)}"></div>
        <div class="menu tight" style="padding:0;background:none">
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
  const names = (club.tactics.focus ?? []).map(i => rival.roster[i]?.name).filter((name): name is string => Boolean(name));
  return names.length ? `Alvos: ${names.map(esc).join(', ')}` : 'Plantel e alvos a marcar';
}

/** O adversário desta semana: o plantel e as notas, como no original. As táticas não se veem, porque mudam a meio do jogo. */
function rivalScreen(): Rendered {
  const rival = currentRival();
  const id = rivalId();
  const focus = club.tactics.focus ?? [];
  const played = [...club.rounds.flat(), ...Object.values(club.cups).flatMap(cup => cup.rounds.flat())].filter(f => f.score && (f.home === id || f.away === id));
  const wins = played.filter(f => (f.home === id ? f.score![0] > f.score![1] : f.score![1] > f.score![0])).length;
  const best = [...rival.roster].sort((a, b) => b.attributes.shooting - a.attributes.shooting)[0]!;
  const tallest = [...rival.roster].sort((a, b) => b.heightCm - a.heightCm)[0]!;
  const rows = rival.roster.map((p, index) => `<button type="button" class="prow${index >= 5 ? ' bench' : ''}" data-target="${index}" aria-pressed="${focus.includes(index)}" ${!focus.includes(index) && focus.length >= MAX_FOCUS ? 'disabled' : ''}>
      <span class="ppos ppos-${p.position}">${p.position}</span><span class="pnum">${index + 4}</span><span class="name">${esc(p.name)}</span><i class="edot${focus.includes(index) ? ' target' : ''}"></i>${ATTRIBUTE_KEYS.map(key => grade(p.attributes[key])).join('')}
    </button>`).join('');
  return {
    top: inside(`<div class="note"><header><b>${crest(rival.short, true)} ${esc(rival.name)}</b><span>Nível ${gradeOf(teamRating(rival))}</span></header><div class="inner">
      <div class="compare" style="grid-template-columns:1fr 1fr 1fr"><span>${wins} V</span><span>${played.length - wins} D</span><span>${esc(DIVISIONS[club.divisions.findIndex(ids => ids.includes(id))]!.name)}</span></div>
      <div class="kv"><span>Lança mais</span><b>${esc(best.name)}</b></div>
      <div class="kv"><span>Mais alto</span><b>${esc(tallest.name)}, ${tallest.heightCm} cm</b></div>
      <div class="quote">Marca até ${MAX_FOCUS} jogadores: quem os defende cola-se a eles, e os outros ficam um passo mais soltos. As táticas do adversário não se veem, porque ele também as muda a meio do jogo.</div>
    </div></div>`),
    bottom: `<div class="thead"><span>Pos</span><span>#</span><span>Jogador</span><span></span>${attributeHead}</div>
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
  const { tactics } = club;
  return {
    top: fullCanvas('tacticsBoard'),
    bottom: `<div class="stack">${TACTIC_ROWS.map(({ key, label, options }) => `<div class="tacrow"><span>${label}: ${options.find(([v]) => v === tactics[key])![2]}</span><div>${options.map(([value, name]) => `<button type="button" data-tactic="${key}" data-tactic-value="${value}" aria-pressed="${value === tactics[key]}">${name}</button>`).join('')}</div></div>`).join('')}</div>${bar(backBtn(tacticsBack))}`,
    after: () => drawTacticsBoard(element<HTMLCanvasElement>('tacticsBoard'), tactics),
  };
}

/** Parecido demais com o equipamento creme do adversário? */
function kitClash(kit: ClubKit): boolean {
  const near = (a: string, b: string): boolean => {
    const x = parseInt(a.slice(1), 16);
    const y = parseInt(b.slice(1), 16);
    return Math.abs(((x >> 16) & 255) - ((y >> 16) & 255)) + Math.abs(((x >> 8) & 255) - ((y >> 8) & 255)) + Math.abs((x & 255) - (y & 255)) < 90;
  };
  return near(kit.jersey, KITS.cream.jersey);
}

function kitScreen(): Rendered {
  const rival = currentRival();
  return {
    top: `${fullCanvas('scene')}`,
    bottom: `${kitClash(activeKit(club)) ? `<div class="mwarn">Muito parecido com o equipamento de ${esc(rival.name)}. Em campo, é difícil distinguir as equipas.</div>` : ''}<div class="kits">${club.kits.map(k => `<button type="button" class="kit" data-kit="${k.id}" aria-pressed="${k.id === club.kitChoice}"><canvas data-kit-preview="${k.id}" width="34" height="46"></canvas><span>${esc(k.name)}</span></button>`).join('')}</div>${bar(backBtn('pre'), '<button type="button" data-act="editKit">Editar equipamento</button>')}`,
    after: paintKitPreviews,
  };
}

function paintKitPreviews(): void {
  document.querySelectorAll<HTMLCanvasElement>('[data-kit-preview]').forEach(canvas => {
    const g = canvas.getContext('2d')!;
    g.clearRect(0, 0, canvas.width, canvas.height);
    drawSprite(g, 'idle', { ...lookOf(club.team.roster[selected]!, 'blue'), custom: kitById(canvas.dataset.kitPreview!) }, 17, 43, false, canvas.dataset.back === '1', false);
  });
}

const swatches = (attr: string, current: string): string => `<div class="swatches">${PALETTE.map(color => `<button type="button" class="swatch" style="background:${color}" ${attr}="${color}" aria-label="Cor ${color}" aria-pressed="${current === color}"></button>`).join('')}</div>`;
const choices = (attr: string, list: readonly (readonly [string, string])[], current: string): string => `<div class="choices">${list.map(([id, label]) => `<button type="button" ${attr}="${id}" aria-pressed="${current === id}">${label}</button>`).join('')}</div>`;

const KIT_FABRIC: Record<KitPattern, (kit: ClubKit) => string> = {
  plain: kit => kit.jersey,
  stripes: kit => `repeating-linear-gradient(90deg, ${kit.jersey} 0 9px, ${kit.second} 9px 18px)`,
  band: kit => `linear-gradient(${kit.jersey} 0 42%, ${kit.second} 42% 64%, ${kit.jersey} 64%)`,
  half: kit => `linear-gradient(90deg, ${kit.jersey} 50%, ${kit.second} 50%)`,
};

/** O equipamento estendido, em grande: nos bonecos, o desenho da camisola mal se vê. */
const flatKit = (kit: ClubKit): string => `<div class="kitflat"><div class="pshirt" style="background:${KIT_FABRIC[kit.pattern](kit)}">${ownCrest(20)}</div><div class="kitshorts" style="background:${kit.shorts};border-top-color:${kit.trim}"></div></div>`;

/** O editor de equipamentos: os bonecos de frente e de costas mudam logo. */
function kitEditScreen(): Rendered {
  const kit = kitById(kitEditing);
  return {
    top: inside(`<div class="note"><header><b>Equipamento ${esc(kit.name.toLowerCase())}</b><span>${esc(club.team.name)}</span></header><div class="inner kitstage">
      <canvas data-kit-preview="${kit.id}" width="34" height="46" class="big"></canvas>
      <canvas data-kit-preview="${kit.id}" data-back="1" width="34" height="46" class="big"></canvas>
      <div class="kitside">${flatKit(kit)}<span>${kitClash(kit) ? 'Parecido com o adversário desta semana' : 'Boa diferença para o adversário'}</span></div>
    </div></div>`),
    bottom: `${choices('data-kit-edit', club.kits.map(k => [k.id, esc(k.name)] as const), kitEditing)}
      <div class="scroll editor">
        <div><span>Desenho da camisola</span>${choices('data-kit-pattern', KIT_PATTERNS, kit.pattern)}</div>
        <div><span>Cor principal</span>${swatches('data-kit-jersey', kit.jersey)}</div>
        <div><span>Segunda cor</span>${swatches('data-kit-second', kit.second)}</div>
        <div><span>Calções</span>${swatches('data-kit-shorts', kit.shorts)}</div>
        <div><span>Pormenores</span>${swatches('data-kit-trim', kit.trim)}</div>
      </div>
      ${bar(`<button type="button" class="back" data-go="${kitEditBack}">‹ Voltar</button>`)}`,
    after: paintKitPreviews,
  };
}

/** O editor de emblema, com o resultado à escala e como fica ao lado do nome. */
function emblemScreen(): Rendered {
  const { emblem } = club;
  return {
    top: inside(`<div class="note"><header><b>Emblema do clube</b><span>${esc(club.team.name)}</span></header><div class="inner emblemstage">
      <div id="emblemBig">${ownCrest(160)}</div>
      <div class="kitside"><span>Em tamanho pequeno</span><div id="emblemSmall">${ownCrest(32)}</div><span id="emblemName">${esc(emblem.letters)}</span></div>
    </div></div>`),
    bottom: `<div class="scroll editor">
        <div><span>Forma</span>${choices('data-em-shape', [['shield', 'Escudo'], ['circle', 'Círculo'], ['diamond', 'Losango'], ['pennant', 'Galhardete']], emblem.shape)}</div>
        <div><span>Fundo</span>${choices('data-em-pattern', [['plain', 'Liso'], ['stripes', 'Riscas'], ['half', 'Metades'], ['band', 'Faixa']], emblem.pattern)}</div>
        <div><span>Símbolo</span>${choices('data-em-symbol', [['ball', 'Bola'], ['star', 'Estrela'], ['bolt', 'Raio'], ['crown', 'Coroa'], ['hoop', 'Cesto'], ['none', 'Nenhum']], emblem.symbol)}</div>
        <div><span>Cor principal</span>${swatches('data-em-primary', emblem.primary)}</div>
        <div><span>Segunda cor</span>${swatches('data-em-secondary', emblem.secondary)}</div>
        <div><span>Cor do símbolo</span>${swatches('data-em-accent', emblem.accent)}</div>
        <div><label for="emblemLetters">Letras, até três</label><input id="emblemLetters" maxlength="3" autocomplete="off" value="${esc(emblem.letters)}"></div>
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

function federationScreen(): Rendered {
  const table = leagueTable(club);
  const row = table.find(r => r.club === federationClub) ?? table[0]!;
  const position = table.indexOf(row);
  const info = club.clubs[federationClub]!;
  const team = federationClub === PLAYER_CLUB ? club.team : aiTeam(info);
  const recent = club.rounds.flat().filter(f => f.score && (f.home === federationClub || f.away === federationClub)).slice(-5);
  const form = recent.map(f => {
    const own = f.home === federationClub ? f.score![0] : f.score![1];
    const other = f.home === federationClub ? f.score![1] : f.score![0];
    return `<tr><td>${esc(club.clubs[f.home === federationClub ? f.away : f.home]!.name)}</td><td class="${own > other ? 'won' : 'lost'}" style="color:${own > other ? 'var(--good)' : 'var(--bad)'}">${own}-${other}</td></tr>`;
  }).join('');
  const top = inside(`<div class="note"><header><b>${federationClub === PLAYER_CLUB ? ownCrest(18) : crest(team.short, true)} ${esc(team.name)}</b><span>Lugar ${position + 1}</span></header><div class="inner">
    <div class="compare" style="grid-template-columns:1fr 1fr 1fr 1fr"><span>${row.wins} V</span><span>${row.losses} D</span><span>${row.pointsFor} pts</span><span>Nível ${gradeOf(teamRating(team))}</span></div>
    <table class="mini-table"><tr><th>Últimos jogos</th><th></th></tr>${form}</table>
    <div>Melhor jogador: ${esc([...team.roster].sort((a, b) => b.attributes.shooting - a.attributes.shooting)[0]!.name)}</div>
  </div></div>`);
  let body = '';
  if (federationTab === 'table') {
    body = `<div class="crow head"><span></span><span class="name"></span><span>V</span><span>D</span><span>+/-</span></div>${table.map((r, i) => {
      const format = playoffFormat(club);
      const up = format ? format.places.includes(i) : i < MOVING_PLACES && club.division < DIVISIONS.length - 1;
      const down = i >= LEAGUE_SIZE - MOVING_PLACES && club.division > 0;
      const diff = r.pointsFor - r.pointsAgainst;
      return `<button type="button" class="crow${up ? ' up' : down ? ' down' : ''}${r.club === PLAYER_CLUB ? ' mine' : ''}" data-fed-club="${r.club}" aria-pressed="${federationClub === r.club}"><span>${i + 1}</span><span class="name">${esc(club.clubs[r.club]!.name)}</span><span>${r.wins}</span><span>${r.losses}</span><span>${diff > 0 ? '+' : ''}${diff}</span></button>`;
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
    body = [...DIVISIONS].map((d, n) => ({ d, n })).reverse().map(({ d, n }) => `<div class="crow round" style="grid-template-columns:1fr auto;font:400 18px/1 var(--ui);min-height:44px${n === club.division ? ';color:var(--gold)' : ''}"><span class="name">${d.name}</span><small>${n === club.division ? 'Estás aqui' : `${LEAGUE_SIZE} clubes`}</small></div>`).join('');
  }
  const tabs: [typeof federationTab, string][] = [['table', 'Classificação'], ['calendar', 'Calendário'], ['round', 'Jornada'], ...(playoffFormat(club) ? [['playoffs', 'Playoffs'] as [typeof federationTab, string]] : []), ['cup', 'Taça'], ['ladder', 'Divisões']];
  const bracket = federationTab === 'cup' || federationTab === 'playoffs';
  return {
    top: bracket ? fullCanvas('bracket') : top,
    after: bracket ? () => drawBracket(element<HTMLCanvasElement>('bracket'), ...(federationTab === 'cup' ? cupBracket() : playoffBracket())) : undefined,
    bottom: `<div class="chalk"><h2>${DIVISIONS[club.division]!.name}</h2><div class="chalktabs">${tabs.map(([id, label]) => `<button type="button" data-fed-tab="${id}" aria-pressed="${federationTab === id}">${label}</button>`).join('')}</div><div class="scroll">${body}</div></div>${bar(backBtn('town'))}`,
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

function boardQuote(): string {
  if (club.confidence < 15) return '"Vamos ser francos: ou isto muda já, ou muda o treinador."';
  if (club.confidence < 40) return '"Estamos a ver alguns sinais. Acabe no meio da tabela e ninguém faz perguntas."';
  if (club.confidence < 70) return '"Bom trabalho. Mantenha a equipa a subir e o presidente fica contente."';
  return '"O presidente já anda a falar de si aos amigos. Continue assim."';
}

function officeScreen(): Rendered {
  if (officeItem === 'trophies') return trophyScreen();
  const titles = club.history.filter(record => record.outcome === 'champion').length;
  const seasons = [...club.history].reverse().map(record => `<tr><td>${record.season}</td><td>${DIVISIONS[record.division]!.name}</td><td>${record.position + 1}</td><td>${record.wins}-${record.losses}</td><td>${OUTCOME_LABEL[record.outcome]}</td></tr>`).join('');
  const details: Record<Exclude<OfficeItem, 'trophies'>, string> = {
    board: `<div class="note"><header><b>Direção do clube</b><span>${Math.round(club.confidence)}%</span></header><div class="inner">
      <div>Confiança no treinador</div><div class="gauge"><i style="width:${club.confidence}%;background:${club.confidence < 15 ? 'var(--bad)' : club.confidence < 40 ? 'var(--gold)' : 'var(--good)'}"></i></div>
      <div class="compare" style="grid-template-columns:1fr 1fr 1fr"><span>Orçamento ${club.money}</span><span>Salários ${totalSalaries(club)}</span><span>Sobra ${surplus(club)}</span></div>
      <div class="quote">${boardQuote()}</div>
      <div>Abaixo de ${B.confidenceFired}% de confiança, a direção despede-te.</div>
    </div></div>`,
    history: `<div class="note"><header><b>Historial</b><span>${club.wins} V · ${club.losses} D · ${titles} títulos</span></header><div class="inner">${seasons
      ? `<table class="mini-table"><tr><th>Época</th><th>Divisão</th><th>Lugar</th><th>V-D</th><th></th></tr>${seasons}</table>`
      : '<div class="quote">Ainda não acabou nenhuma época. Aqui ficam as épocas acabadas e os títulos do clube.</div>'}</div></div>`,
    reset: `<div class="note"><header><b>Treinar outro clube</b></header><div class="inner"><div class="quote">Perdes o ${esc(club.team.name)}, na semana ${club.week}, assim que criares o novo clube. Os teus troféus vão contigo.</div><button type="button" id="resetYes" data-act="newClub">Escolher novo clube</button><button type="button" id="resetNo" data-office="board">Ficar com este clube</button></div></div>`,
  };
  const officeBar = ([id, label, note]: [OfficeItem, string, string]): string => `<button type="button" class="mbar" data-office="${id}" aria-pressed="${officeItem === id}" style="grid-template-columns:1fr auto;${officeItem === id ? 'background:var(--gold);color:var(--ink)' : ''}"><span>${label}</span><small>${note}</small></button>`;
  const items: [OfficeItem, string, string][] = [
    ['board', 'Direção', 'Confiança e objetivos'],
    ['trophies', 'Troféus e prémios', `${trophyList(club).filter(t => t.won).length} na vitrina`],
    ['history', 'Historial', 'Épocas e títulos'],
    ['reset', 'Novo clube', 'Começar de novo'],
  ];
  return {
    top: inside(details[officeItem]),
    bottom: `<div class="matchhead"><span>Escritório</span><b>${esc(club.team.name)}</b></div><div class="menu tight">${items.slice(0, 2).map(officeBar).join('')}<button type="button" class="mbar" data-go="emblem" style="grid-template-columns:1fr auto"><span>Emblema</span><small>Forma, cores e símbolo</small></button><button type="button" class="mbar" data-act="editKit" style="grid-template-columns:1fr auto"><span>Equipamentos</span><small>Desenho e cores</small></button><button type="button" class="mbar" data-go="market" style="grid-template-columns:1fr auto"><span>Mercado</span><small>${club.offers.length ? `${club.offers.length} ${club.offers.length === 1 ? 'proposta' : 'propostas'} à espera` : `Sobra ${surplus(club)} mil`}</small></button>${items.slice(2).map(officeBar).join('')}</div>${bar(backBtn('town'))}`,
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
  go('report');
}

/** As táticas ficam no clube e, ao intervalo, entram no jogo a decorrer como comando do treinador, para a repetição. */
function applyTactics(tactics: ClubState['tactics']): void {
  commit({ ...club, tactics });
  if (half) setTactics(host.match()!.s, 0, tactics);
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
  } else if (data.kitJersey) {
    editKit({ jersey: data.kitJersey });
  } else if (data.kitSecond) {
    editKit({ second: data.kitSecond });
  } else if (data.kitShorts) {
    editKit({ shorts: data.kitShorts });
  } else if (data.kitTrim) {
    editKit({ trim: data.kitTrim });
  } else if (data.emShape) {
    editEmblem({ shape: data.emShape as Emblem['shape'] });
  } else if (data.emPattern) {
    editEmblem({ pattern: data.emPattern as Emblem['pattern'] });
  } else if (data.emSymbol) {
    editEmblem({ symbol: data.emSymbol as Emblem['symbol'] });
  } else if (data.emPrimary) {
    editEmblem({ primary: data.emPrimary });
  } else if (data.emSecondary) {
    editEmblem({ secondary: data.emSecondary });
  } else if (data.emAccent) {
    editEmblem({ accent: data.emAccent });
  } else if (data.trophy !== undefined) {
    selectedTrophy = Number(data.trophy);
    render();
  } else if (data.tactic) {
    applyTactics({ ...club.tactics, [data.tactic]: Number(data.tacticValue) });
  } else if (data.target !== undefined) {
    const index = Number(data.target);
    const focus = club.tactics.focus ?? [];
    applyTactics({ ...club.tactics, focus: focus.includes(index) ? focus.filter(i => i !== index) : [...focus, index].slice(0, MAX_FOCUS) });
  } else if (data.act === 'clearFocus') {
    applyTactics({ ...club.tactics, focus: [] });
  } else if (data.kit) {
    commit({ ...club, kitChoice: data.kit });
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
  } else if (data.fedClub !== undefined) {
    federationClub = Number(data.fedClub);
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
    return;
  }
  if (input.id !== 'emblemLetters') return;
  input.value = emblemLetters(input.value);
  commit({ ...club, emblem: { ...club.emblem, letters: input.value } });
  element('emblemBig').innerHTML = ownCrest(160);
  element('emblemSmall').innerHTML = ownCrest(32);
  element('emblemName').textContent = input.value;
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
  if (next === 'federation' && !club.divisions[club.division]!.includes(federationClub)) federationClub = PLAYER_CLUB;
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
  offerKind = practiceAllowed() ? 'practice' : 'friendly';
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

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** As cenas têm vida, por isso desenham-se a cada imagem. */
export function menuFrame(now: number): void {
  const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
  if (!canvas) return;
  const view = host.match();
  const kind: SceneKind = half ? 'lockerHalf' : gameKind === 'practice' ? 'gym' : 'lockerPre';
  const score = half && view ? `${view.s.score[0]} - ${view.s.score[1]}` : '';
  drawSceneFrame(canvas, kind, club.team.roster, activeKit(club), currentRival(), score, reducedMotion ? 0 : now);
}
