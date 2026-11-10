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

/** A cidade, a cidade sem etiquetas do ecrã de criar clube, os menus e o jogo em si. */
export type Stage = 'town' | 'title' | 'menu' | 'match';

/** O que decide o esquema: o modo, se o resultado está aberto e quanto o painel do menu pede (0 é o normal). */
export interface LayoutState {
  stage: Stage;
  resultOpen: boolean;
  menuPanel: number;
  /** No jogo deitado, o painel escondido: o campo fica com o ecrã todo. */
  courtOnly: boolean;
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

const typing = (): boolean => document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;

export function createLayout(els: LayoutElements, hooks: LayoutHooks): Layout {
  const { game, screen, canvas, context, panel, hud, topUi } = els;
  let topSize: readonly [number, number] = [MENU_STAGE_WIDTH, MENU_STAGE_HEIGHT];
  // A altura da janela sem o teclado do telemóvel. Enquanto se escreve num campo de texto, o teclado tira metade da altura:
  // medir aí encolhia o jogo todo, e ficava encolhido depois de o teclado fechar, porque nem sempre vem um aviso de mudança.
  let stableHeight = innerHeight;
  let stableWidth = innerWidth;

  function windowHeight(): number {
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

  function setTopSize(width: number, height: number, zoom: number): void {
    topUi.style.width = `${width}px`;
    topUi.style.height = `${height}px`;
    screen.style.setProperty('--top-zoom', String(zoom));
    if (topSize[0] === width && topSize[1] === height) return;
    topSize = [width, height];
    hooks.topResized();
  }

  /** O jogo é só na horizontal, como o resto do género: o campo fica ao lado do painel. Com o ecrã ao alto, um aviso
   * pede para o rodar (CSS, `#rotateHint`). */
  function fit({ stage, resultOpen, courtOnly }: LayoutState): void {
    game.classList.add('landscape');
    document.body.classList.add('landscape');
    const viewHeight = windowHeight();
    const dpr = devicePixelRatio || 1;
    // O resultado do jogo, numa janela larga ao centro.
    game.classList.toggle('result-open', resultOpen && stage === 'match');
    const centred = resultOpen && stage === 'match';
    const onlyCourt = courtOnly && stage === 'match' && !resultOpen;
    game.classList.toggle('court-only', onlyCourt);
    // O painel cresce com a janela, em quartos: numa janela larga de computador fica maior e legível, sem passar de 37,5 % da largura.
    // Com 37,5 %, uma janela de 1920×1080 chega ao ×2: os ícones do painel ficam com píxeis inteiros, em vez de ×1,75.
    // Nunca abaixo de 1: no telemóvel deitado, encolher deixava os botões abaixo de 44 px e os ícones a escalas partidas.
    // O painel fica com a altura da janela e as listas deslizam.
    const comfortable = Math.max(1, Math.min(Math.floor((innerWidth * 4) / 960) / 4, Math.floor((viewHeight * 4) / 540) / 4));
    // No jogo, o campo primeiro: a maior ampliação inteira que cabe com o painel no mínimo, e o painel fica com o que sobra.
    const courtFirst = Math.floor(Math.min((innerWidth - LANDSCAPE_PANEL_MIN) / MATCH_STAGE_WIDTH, viewHeight / MATCH_STAGE_HEIGHT) * dpr) / dpr;
    const fitted = stage === 'match' && !centred && courtFirst >= 1;
    const left = innerWidth - courtFirst * MATCH_STAGE_WIDTH;
    const ui = fitted ? Math.max(1, Math.min(comfortable, Math.floor((left * 4) / LANDSCAPE_PANEL_WIDTH) / 4)) : comfortable;
    // Largura do painel em píxeis do ecrã. Na cidade não há painel: o mapa é o menu e ocupa a janela toda.
    const panelWidth = stage === 'town' || centred || onlyCourt ? 0 : fitted ? Math.min(LANDSCAPE_PANEL_WIDTH * ui, Math.max(LANDSCAPE_PANEL_MIN, left)) : LANDSCAPE_PANEL_WIDTH * ui;
    const stageWidth = innerWidth - panelWidth;
    const stageHeight = viewHeight;
    // A escala é um múltiplo inteiro de píxeis do ecrã, para a arte ficar sempre nítida.
    // No jogo, a tela tem sempre o mesmo tamanho lógico, para a câmara e os bonecos ficarem iguais em qualquer ecrã.
    const scale = stage === 'match'
      ? Math.max(1, Math.floor(Math.min(stageWidth / MATCH_STAGE_WIDTH, stageHeight / MATCH_STAGE_HEIGHT) * dpr)) / dpr
      : stage === 'town' || stage === 'title'
        ? Math.max(1, Math.floor((viewHeight * dpr) / LANDSCAPE_TOWN_HEIGHT)) / dpr
        : Math.ceil((stageHeight * dpr) / LANDSCAPE_ART_HEIGHT) / dpr;
    const width = stage === 'match' ? MATCH_STAGE_WIDTH : Math.ceil(stageWidth / scale);
    const height = stage === 'match' ? MATCH_STAGE_HEIGHT : Math.ceil(stageHeight / scale);
    setCanvasSize(width, height, width * scale, height * scale);
    // O marcador e as etiquetas ficam sobre o campo, não sobre as barras.
    const bar = Math.max(0, (viewHeight - height * scale) / 2);
    const side = Math.max(0, (stageWidth - width * scale) / 2);
    canvas.style.marginTop = `${bar}px`;
    canvas.style.marginLeft = `${side}px`;
    hud.style.top = `${bar}px`;
    hud.style.bottom = `${bar}px`;
    hud.style.left = `${side}px`;
    hud.style.right = `${side}px`;
    game.style.zoom = '';
    game.style.height = '';
    game.style.width = '';
    screen.style.width = `${stageWidth}px`;
    screen.style.height = `${viewHeight}px`;
    panel.style.zoom = String(ui);
    panel.style.width = `${centred ? Math.min((innerWidth * 0.9) / ui, LANDSCAPE_PANEL_WIDTH * 1.8) : panelWidth / ui}px`;
    panel.style.height = centred ? '' : `${viewHeight / ui}px`;
    panel.style.maxHeight = centred ? `${(viewHeight * 0.94) / ui}px` : '';
    screen.style.setProperty('--hud-zoom', String(ui));
    const topZoom = Math.max(1, Math.floor(Math.min(stageWidth / MENU_STAGE_WIDTH, viewHeight / MENU_STAGE_HEIGHT) * dpr) / dpr);
    setTopSize(Math.floor(stageWidth / topZoom), Math.floor(viewHeight / topZoom), topZoom);
  }

  return { fit, topSize: () => topSize };
}
