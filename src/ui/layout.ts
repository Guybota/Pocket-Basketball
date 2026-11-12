// O tamanho e a escala do jogo, sempre na horizontal: a tela do campo, o painel e a parte de cima dos menus.

const LANDSCAPE_PANEL_WIDTH = 360;
// No jogo deitado, o painel pode estreitar até aqui (com a letra igual) se isso deixar o campo subir uma ampliação inteira:
// num iPad deitado, o campo passa de 2,5× a 3×.
const LANDSCAPE_PANEL_MIN = 280;
// Altura máxima da arte no computador: quanto menor, mais gordos os píxeis.
const LANDSCAPE_ART_HEIGHT = 290;
// A cidade tem mais detalhe do que o campo, por isso usa píxeis mais pequenos.
const LANDSCAPE_TOWN_HEIGHT = 360;
// Os menus têm uma ficha ou uma cena por cima, e essas precisam de mais altura do que o campo.
const MENU_STAGE_WIDTH = 360;
const MENU_STAGE_HEIGHT = 270;
// O campo vê-se sempre com o mesmo enquadramento, em qualquer ecrã e rotação: a câmara tem a distância focal fixa, por isso
// uma tela maior mostrava mais campo. A tela do jogo é sempre esta, ampliada por um inteiro, com barras no que sobra.
const MATCH_STAGE_WIDTH = 360;
const MATCH_STAGE_HEIGHT = 216;
// A largura da coluna de botões redondos do jogo (56 px, mais as margens), em píxeis CSS antes do zoom do painel.
const BUTTON_COLUMN = 76;

/** A cidade, a cidade sem etiquetas do ecrã de criar clube, os menus e o jogo em si. */
export type Stage = 'town' | 'title' | 'menu' | 'match';

/** O que decide o esquema: o modo, se o resultado está aberto e quanto o painel do menu pede (0 é o normal). */
export interface LayoutState {
  stage: Stage;
  resultOpen: boolean;
  menuPanel: number;
  /** O campo com o ecrã todo e o painel numa janela por cima (o jogo é sempre assim; o resultado vai ao centro). */
  courtOnly: boolean;
  /** No ecrã inicial, o jogo de demonstração está a correr: a tela fica igual à do jogo. */
  demo?: boolean;
}

export interface LayoutElements {
  game: HTMLElement;
  screen: HTMLElement;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  panel: HTMLElement;
  hud: HTMLElement;
  topUi: HTMLElement;
}

export interface LayoutHooks {
  /** A tela do campo mudou de tamanho em píxeis. */
  canvasResized: () => void;
  /** A parte de cima dos menus mudou de tamanho. */
  topResized: () => void;
}

export interface Layout {
  fit: (state: LayoutState) => void;
  topSize: () => readonly [number, number];
}

// Instalado no ecrã inicial do iPhone, a faixa que o sistema desfoca no topo é mais alta do que a barra de estado.
if ((navigator as Navigator & { standalone?: boolean }).standalone === true) document.documentElement.style.setProperty('--top-extra', '24px');

// Com o telemóvel ao alto, o jogo roda 90° (CSS, `html.turned`) e continua deitado: o body fica com a largura e a altura
// trocadas, e é por ele que se mede.
const turnedQuery = typeof matchMedia === 'function' ? matchMedia('(orientation: portrait) and (pointer: coarse)') : null;
export const turned = (): boolean => turnedQuery?.matches ?? false;
const viewWidth = (): number => (turned() ? document.body.clientWidth : innerWidth);

/** Onde caiu um toque dentro de um elemento, de 0 a 1 em cada eixo do jogo, rodado ou não. */
export function pointIn(event: MouseEvent, element: Element): [number, number] {
  const r = element.getBoundingClientRect();
  return turned()
    ? [(event.clientY - r.top) / r.height, (r.right - event.clientX) / r.width]
    : [(event.clientX - r.left) / r.width, (event.clientY - r.top) / r.height];
}

/** O retângulo de um elemento nas coordenadas do jogo (as do `position: fixed`), rodado ou não. */
export function gameRect(element: Element): { left: number; top: number; width: number; height: number; viewWidth: number } {
  const r = element.getBoundingClientRect();
  if (!turned()) return { left: r.left, top: r.top, width: r.width, height: r.height, viewWidth: innerWidth };
  const body = document.body.getBoundingClientRect();
  return { left: r.top - body.top, top: body.right - r.right, width: r.height, height: r.width, viewWidth: document.body.clientWidth };
}

const typing = (): boolean => document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;

export function createLayout(els: LayoutElements, hooks: LayoutHooks): Layout {
  const { game, screen, canvas, context, panel, hud, topUi } = els;
  let topSize: readonly [number, number] = [MENU_STAGE_WIDTH, MENU_STAGE_HEIGHT];
  let topInsets = '';
  // A altura da janela sem o teclado do telemóvel. Enquanto se escreve num campo de texto, o teclado tira metade da altura:
  // medir aí encolhia o jogo todo, e ficava encolhido depois de o teclado fechar, porque nem sempre vem um aviso de mudança.
  let stableHeight = innerHeight;
  let stableWidth = innerWidth;

  function windowHeight(): number {
    if (turned()) return document.body.clientHeight;
    // Rodar o telemóvel muda a largura: aí a altura guardada já não vale, mesmo com o teclado aberto.
    if (!typing() || innerWidth !== stableWidth) {
      stableHeight = innerHeight;
      stableWidth = innerWidth;
    }
    return Math.max(innerHeight, stableHeight);
  }

  function setCanvasSize(width: number, height: number, cssWidth: number, cssHeight: number): void {
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      hooks.canvasResized();
    }
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    context.imageSmoothingEnabled = false;
  }

  /** `insets`: o espaço do voltar e da janela; as cenas desenham-se no meio, por isso mudá-lo também as redesenha. */
  function setTopSize(width: number, height: number, zoom: number, insets: string): void {
    topUi.style.width = `${width}px`;
    topUi.style.height = `${height}px`;
    screen.style.setProperty('--top-zoom', String(zoom));
    if (topSize[0] === width && topSize[1] === height && topInsets === insets) return;
    topSize = [width, height];
    topInsets = insets;
    hooks.topResized();
  }

  /** O jogo é só na horizontal, como o resto do género: o campo fica ao lado do painel. Com o ecrã ao alto, roda. */
  function fit({ stage, resultOpen, courtOnly, demo }: LayoutState): void {
    game.classList.add('landscape');
    document.body.classList.add('landscape');
    document.documentElement.classList.toggle('turned', turned());
    const innerWidth = viewWidth();
    const viewHeight = windowHeight();
    const dpr = devicePixelRatio || 1;
    // O resultado do jogo, numa janela larga ao centro.
    game.classList.toggle('result-open', resultOpen && stage === 'match');
    const centred = resultOpen && stage === 'match';
    const onlyCourt = courtOnly && stage === 'match' && !resultOpen;
    game.classList.toggle('court-only', onlyCourt);
    // Ecrã único, no jogo e nos menus: a cena tem o ecrã todo e o painel é uma janela por cima.
    const floating = onlyCourt || stage === 'menu';
    game.classList.toggle('floating', floating);
    // O painel cresce com a janela, em quartos: numa janela larga de computador fica maior e legível, sem passar de 37,5 % da largura.
    // Com 37,5 %, uma janela de 1920×1080 chega ao ×2: os ícones do painel ficam com píxeis inteiros, em vez de ×1,75.
    // Nunca abaixo de 1: no telemóvel deitado, encolher deixava os botões abaixo de 44 px e os ícones a escalas partidas.
    // O painel fica com a altura da janela e as listas deslizam.
    const comfortable = Math.max(1, Math.min(Math.floor((innerWidth * 4) / 960) / 4, Math.floor((viewHeight * 4) / 540) / 4));
    // No jogo, o campo primeiro: a maior ampliação inteira que cabe com o painel no mínimo, e o painel fica com o que sobra.
    const courtFirst = Math.floor(Math.min((innerWidth - LANDSCAPE_PANEL_MIN) / MATCH_STAGE_WIDTH, viewHeight / MATCH_STAGE_HEIGHT) * dpr) / dpr;
    const fitted = stage === 'match' && !centred && !onlyCourt && courtFirst >= 1;
    const left = innerWidth - courtFirst * MATCH_STAGE_WIDTH;
    const ui = fitted ? Math.max(1, Math.min(comfortable, Math.floor((left * 4) / LANDSCAPE_PANEL_WIDTH) / 4)) : comfortable;
    // Largura do painel em píxeis do ecrã. Na cidade não há painel: o mapa é o menu e ocupa a janela toda.
    const panelWidth = stage === 'town' || centred || floating ? 0 : fitted ? Math.min(LANDSCAPE_PANEL_WIDTH * ui, Math.max(LANDSCAPE_PANEL_MIN, left)) : LANDSCAPE_PANEL_WIDTH * ui;
    const stageWidth = innerWidth - panelWidth;
    const stageHeight = viewHeight;
    // Nos outros ecrãs, a escala é um múltiplo inteiro de píxeis do ecrã, para a arte ficar sempre nítida.
    // No jogo, a tela tem sempre o mesmo tamanho lógico, para a câmara e os bonecos ficarem iguais em qualquer ecrã, e enche
    // o espaço com qualquer escala, sem saltos: desenha-se ampliada por um inteiro e o browser ajusta-a com suavização
    // (o «sharp bilinear» dos jogos de pixel art). Fica de fora a coluna dos botões redondos, à direita: o campo centra-se
    // no espaço que sobra, sem ficar por baixo deles.
    const buttons = onlyCourt ? BUTTON_COLUMN * ui : 0;
    // A demonstração do ecrã inicial desenha-se como o jogo: o mesmo enquadramento, a mesma resolução e os bonecos do mesmo
    // tamanho. Com a tela da cidade mostrava mais campo, e os bonecos encolhidos numa tela pequena saíam com outras proporções.
    const court = stage === 'match' || (stage === 'title' && demo === true);
    const scale = court
      ? Math.max(1 / dpr, Math.min((stageWidth - buttons) / MATCH_STAGE_WIDTH, stageHeight / MATCH_STAGE_HEIGHT))
      : stage === 'town' || stage === 'title'
        ? Math.max(1, Math.floor((viewHeight * dpr) / LANDSCAPE_TOWN_HEIGHT)) / dpr
        : Math.ceil((stageHeight * dpr) / LANDSCAPE_ART_HEIGHT) / dpr;
    // A demonstração enche o lado do ecrã inicial sem barras: no mínimo o campo do jogo, e mais bancada ou chão onde sobra,
    // sempre com a mesma escala de arte (os bonecos não mudam de tamanho em relação ao campo).
    const width = stage === 'match' ? MATCH_STAGE_WIDTH : court ? Math.max(MATCH_STAGE_WIDTH, Math.floor(stageWidth / scale)) : Math.ceil(stageWidth / scale);
    const height = stage === 'match' ? MATCH_STAGE_HEIGHT : court ? Math.max(MATCH_STAGE_HEIGHT, Math.floor(stageHeight / scale)) : Math.ceil(stageHeight / scale);
    // No jogo, a tela tem a resolução do ecrã: a arte amplia-se por este inteiro, e os bonecos podem ter qualquer tamanho,
    // maiores à frente e mais pequenos atrás, como no Calciobit. Nos outros ecrãs, a tela é da arte e o CSS amplia-a.
    // O inteiro logo acima dos píxeis do ecrã por píxel de arte: a tela tem sempre pelo menos a resolução do ecrã.
    const artScale = court ? Math.max(1, Math.min(6, Math.ceil(scale * dpr - 0.001))) : 1;
    canvas.dataset.artScale = String(artScale);
    // Na escala exata, os píxeis ficam nítidos; entre duas, o ajuste suaviza um nada as bordas, em vez de os pôr desiguais.
    canvas.style.imageRendering = court && Math.abs(scale * dpr - artScale) > 0.001 ? 'auto' : '';
    setCanvasSize(width * artScale, height * artScale, width * scale, height * scale);
    // O marcador e as etiquetas ficam sobre o campo, não sobre as barras.
    const bar = Math.max(0, (viewHeight - height * scale) / 2);
    const side = Math.max(0, (stageWidth - buttons - width * scale) / 2);
    canvas.style.marginTop = `${bar}px`;
    canvas.style.marginLeft = `${side}px`;
    hud.style.top = `${bar}px`;
    hud.style.bottom = `${bar}px`;
    hud.style.left = `${side}px`;
    hud.style.right = `${Math.max(0, stageWidth - side - width * scale)}px`;
    game.style.zoom = '';
    game.style.height = '';
    game.style.width = '';
    screen.style.width = `${stageWidth}px`;
    screen.style.height = `${viewHeight}px`;
    panel.style.zoom = String(ui);
    // Nos menus, a ficha fica à esquerda da janela do painel. Com espaço, a janela flutua com margens e o voltar é um botão
    // redondo no canto; num ecrã estreito (telemóvel deitado, 640×360), a janela encosta à direita com a altura toda e o
    // voltar fica na barra dela, para a ficha ter a largura de antes.
    const windowWidth = LANDSCAPE_PANEL_WIDTH * ui;
    const roomy = stage !== 'menu' || innerWidth - windowWidth - 26 - 76 >= MENU_STAGE_WIDTH * 1.25;
    game.classList.toggle('docked', !roomy);
    const windowSpace = roomy ? windowWidth + 26 : windowWidth + 3;
    const backSpace = roomy && stage === 'menu' ? 76 : 0;
    // No jogo, a janela do painel fica por cima do campo, com a largura de sempre e um pouco menos do que a altura do ecrã.
    panel.style.width = `${centred ? Math.min((innerWidth * 0.9) / ui, LANDSCAPE_PANEL_WIDTH * 1.8) : floating ? LANDSCAPE_PANEL_WIDTH : panelWidth / ui}px`;
    // No jogo, a janela começa debaixo do marcador, para nunca o tapar.
    // O marcador ocupa ~36 px (com o zoom do painel) no cimo do campo.
    const windowTop = onlyCourt ? bar + 40 * ui : floating && roomy ? 12 : 0;
    panel.style.top = floating ? `${windowTop / ui}px` : '';
    panel.style.height = centred ? '' : `${(floating && (roomy || onlyCourt) ? viewHeight - windowTop - 12 : viewHeight) / ui}px`;
    panel.style.maxHeight = centred ? `${(viewHeight * 0.94) / ui}px` : '';
    screen.style.setProperty('--hud-zoom', String(ui));
    // A escala da parte de cima vem do espaço da ficha, como quando a ficha e o painel ficavam lado a lado.
    const cardSpace = stage === 'menu' ? stageWidth - windowSpace - backSpace : stageWidth;
    const topZoom = Math.max(1, Math.floor(Math.min(cardSpace / MENU_STAGE_WIDTH, viewHeight / MENU_STAGE_HEIGHT) * dpr) / dpr);
    // O espaço do voltar e o que a janela do painel tapa à direita, nas unidades da parte de cima: antes de setTopSize,
    // que redesenha as cenas a partir deles.
    screen.style.setProperty('--back-space', `${Math.ceil(backSpace / topZoom)}px`);
    screen.style.setProperty('--window-space', `${Math.ceil(windowSpace / topZoom)}px`);
    // A nota do escritório começa depois do voltar e debaixo do título, que crescem com o zoom do painel.
    screen.style.setProperty('--note-left', `${Math.ceil((84 * ui) / topZoom)}px`);
    // As colunas de botões redondos do escritório, à direita: duas, ou três num ecrã baixo.
    screen.style.setProperty('--hub-space', `${Math.ceil((((viewHeight < 380 ? 3 : 2) * 92 + 20) * ui) / topZoom)}px`);
    screen.style.setProperty('--note-top', `${Math.ceil((66 * ui) / topZoom)}px`);
    setTopSize(Math.floor(stageWidth / topZoom), Math.floor(viewHeight / topZoom), topZoom, `${Math.ceil(backSpace / topZoom)}|${Math.ceil(windowSpace / topZoom)}`);
  }

  return { fit, topSize: () => topSize };
}
