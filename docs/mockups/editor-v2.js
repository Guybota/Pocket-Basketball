import { DEFAULT_KITS, EMBLEM_BORDER_LIST, EMBLEM_SYMBOLS, EMBLEM_PATTERN_LIST, EMBLEM_SHAPE_LIST, EMBLEM_SYMBOL_LIST, PALETTE, defaultEmblem, emblemImage, isLight } from '../../src/ui/art/kit.ts';
import { drawSprite, lookOf } from '../../src/ui/art/sprites.ts';
import { generateTeam } from '../../src/sim/teamgen.ts';
import { text } from '../../src/ui/art/font.ts';

// Só uma maqueta: usa os desenhos do jogo, mas não toca na gravação nem no jogo.
const team = generateTeam(21, 'Dragões do Minho', 55);
const player = team.roster[0];
const rivalKit = { id: 'rival', name: 'Rival', jersey: '#f4efe0', second: '#cf3a2c', pattern: 'band', trim: '#cf3a2c', shorts: '#cf3a2c' };
const $ = s => document.querySelector(s);
let timer;
const say = m => { clearTimeout(timer); $('#toast').textContent = m; $('#toast').hidden = false; timer = setTimeout(() => ($('#toast').hidden = true), 3000); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const SCREENS = [
  ['e1', 'Emblema · A: modelos e afinação'],
  ['e2', 'Emblema · B: camadas'],
  ['e3', 'Emblema · C: pixel a pixel'],
  ['k1', 'Equipamento · A: manequim'],
  ['k2', 'Equipamento · B: contra o adversário'],
  ['k3', 'Equipamento · C: mesa de corte'],
];
const state = {
  screen: new URLSearchParams(location.search).get('screen') || 'e1',
  emblem: { ...defaultEmblem('DRM'), primary: '#2b5fd9', accent: '#f2c230', symbol: 'star', shape: 'circle' },
  chip: 'primary',
  kit: { ...DEFAULT_KITS[0], jersey: '#2b5fd9', second: '#f2c230', pattern: 'stripes', trim: '#f4efe0', shorts: '#f4f4f4' },
  kitTab: 'home',
  part: 'jersey',
  pix: Array.from({ length: 256 }, (_, i) => (Math.hypot((i % 16) - 7.5, Math.floor(i / 16) - 7.5) < 7.6 ? 1 : 0)),
  pixColor: 2,
  tool: 'pen',
};
const PIX_PALETTE = ['#00000000', '#2b5fd9', '#f2c230', '#f8f0d8', '#cf3a2c', '#1b2230'];

/* ---------- desenhos ---------- */
const SHAPES = EMBLEM_SHAPE_LIST;
const PATTERNS = EMBLEM_PATTERN_LIST;
const SYMBOLS = EMBLEM_SYMBOL_LIST;
const OUTLINES = EMBLEM_BORDER_LIST;
const KIT_PATTERNS = [['plain', 'Liso'], ['stripes', 'Riscas'], ['band', 'Faixa'], ['half', 'Metades'], ['sash', 'Diagonal'], ['hoops', 'Aros'], ['pin', 'Finas'], ['sides', 'Laterais']];
const PRESETS = [
  ['Clássico', { jersey: '#2b5fd9', second: '#f8f0d8', pattern: 'plain', trim: '#ffffff', shorts: '#f4f4f4' }],
  ['Riscas', { jersey: '#2b5fd9', second: '#f2c230', pattern: 'stripes', trim: '#f4efe0', shorts: '#1b2230' }],
  ['Faixa', { jersey: '#f4efe0', second: '#cf3a2c', pattern: 'band', trim: '#cf3a2c', shorts: '#cf3a2c' }],
  ['Diagonal', { jersey: '#1b2230', second: '#f2c230', pattern: 'sash', trim: '#f2c230', shorts: '#1b2230' }],
  ['Metades', { jersey: '#2f8f5b', second: '#ffffff', pattern: 'half', trim: '#1b2230', shorts: '#ffffff' }],
  ['Aros', { jersey: '#7246c4', second: '#f8f0d8', pattern: 'hoops', trim: '#f8f0d8', shorts: '#7246c4' }],
  ['Finas', { jersey: '#f8f0d8', second: '#17737a', pattern: 'pin', trim: '#17737a', shorts: '#17737a' }],
  ['Laterais', { jersey: '#e8622a', second: '#1b2230', pattern: 'sides', trim: '#f8f0d8', shorts: '#1b2230' }],
];
const usesSecond = (kit, x, y, w = 34) => {
  const p = kit.pattern;
  if (p === 'stripes') return x % 4 < 2;
  if (p === 'band') return y >= 22 && y <= 25;
  if (p === 'half') return x >= w / 2;
  if (p === 'sash') return Math.abs(x - y + 6) <= 2;
  if (p === 'hoops') return y % 6 < 3;
  if (p === 'pin') return x % 6 === 0;
  if (p === 'sides') return x < 11 || x > 22;
  return false;
};
/** A camisola grande, píxel a píxel: de alças, como no basquetebol, com o calção por baixo. */
function drawShirt(g, kit, scale, withShorts = true) {
  g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x * scale, y * scale, scale, scale); };
  // Alças de cada lado, decote fundo ao meio e cavas abertas até ao peito.
  const inside = (x, y) => {
    if (x < 8 || x > 25 || y < 0 || y > 25) return false;
    if (y >= 8) return true;
    if (y >= 6) return x >= 9 && x <= 24 && (x <= 12 || x >= 21 || y === 7);
    return (x >= 9 && x <= 12) || (x >= 21 && x <= 24);
  };
  for (let y = 0; y < 26; y++) {
    for (let x = 8; x <= 25; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const trim = (y < 2) || (y === 7 && x >= 13 && x <= 20);
      const color = edge ? '#1b2230' : trim ? kit.trim : usesSecond(kit, x, y) ? kit.second : kit.jersey;
      px(x, y, color);
    }
  }
  if (withShorts) {
    for (let y = 26; y < 40; y++) {
      for (let x = 7; x <= 26; x++) {
        const split = y > 32 && Math.abs(x - 16.5) < 1;
        const edge = y === 39 || x === 7 || x === 26 || split;
        px(x, y, edge ? '#1b2230' : y === 27 ? kit.trim : kit.shorts);
      }
    }
  }
}
const miniShirt = (kit) => { const c = document.createElement('canvas'); c.width = 34; c.height = 40; drawShirt(c.getContext('2d'), kit, 1); return c; };
const figure = (kit, scale, back = false, pose = 'idle') => {
  const c = document.createElement('canvas');
  c.width = 34 * scale; c.height = 46 * scale;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const off = document.createElement('canvas'); off.width = 34; off.height = 46;
  drawSprite(off.getContext('2d'), pose, { ...lookOf(player, 'blue'), custom: kit }, 17, 43, false, back, false);
  g.drawImage(off, 0, 0, 34 * scale, 46 * scale);
  return c;
};
const pixEmblem = (scale = 1) => {
  const c = document.createElement('canvas'); c.width = 16 * scale; c.height = 16 * scale;
  const g = c.getContext('2d');
  state.pix.forEach((v, i) => { if (v) { g.fillStyle = PIX_PALETTE[v]; g.fillRect((i % 16) * scale, Math.floor(i / 16) * scale, scale, scale); } });
  return c.toDataURL();
};

/* ---------- pedaços ---------- */
const bar = (title, right = '') => `<div class="bar"><span>${title}</span><small>${right}</small></div>`;
const foot = (extra = '') => `<footer class="foot"><button data-action="back">‹ Voltar</button>${extra}<button class="primary" data-action="save">Guardar</button></footer>`;
const palette = (attr, current) => `<div class="palette">${PALETTE.map(c => `<button data-${attr}="${c}" class="${c === current ? 'on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>`;
const emblemContexts = (src, letters) => `<div class="contexts">
  <div><img src="${src}" alt=""><span>No plantel e na cidade</span></div>
  <div class="bug"><img src="${src}" alt="">${esc(letters)} <span style="color:#f2c230">12</span> · <span>9</span> RIV</div>
  <div><img src="${src}" alt="" style="width:16px;height:16px"><span>Na camisola, pequeno</span></div>
</div><div class="flag" style="background:${state.emblem.primary}"><img src="${src}" alt=""></div>`;
const templates = () => {
  const list = [];
  for (let n = 0; n < 12; n++) {
    const shape = SHAPES[n % SHAPES.length][0];
    const pattern = PATTERNS[(n * 5) % PATTERNS.length][0];
    const sym = SYMBOLS[(n * 7) % (SYMBOLS.length - 1)][0];
    const primary = PALETTE[n % 8];
    const secondary = isLight(primary) ? '#1b2230' : '#f8f0d8';
    list.push({ ...state.emblem, shape, pattern, symbol: sym, primary, secondary, accent: isLight(primary) ? '#cf3a2c' : '#f2c230', border: n % 3 === 2 ? 'gold' : 'ink' });
  }
  return list;
};

/* ---------- ecrãs ---------- */
const screens = {
  e1() {
    const { emblem } = state;
    const src = emblemImage(emblem);
    const tpl = templates();
    const chip = (key, label, hint) => `<button data-chip="${key}" class="${state.chip === key ? 'on' : ''}"><i style="background:${emblem[key]}"></i><span>${label}<small>${hint}</small></span></button>`;
    return {
      upper: `${bar('Emblema do clube', 'Dragões do Minho')}<div class="stage"><div class="big"><img src="${src}" alt="Emblema grande"></div>${emblemContexts(src, emblem.letters)}</div>`,
      lower: `<div class="lower-scroll">
        <div class="label">Começa por um modelo<small>12 prontos, depois afinas</small></div>
        <div class="templates">${tpl.map((t, i) => `<button data-template="${i}" class="${t.shape === emblem.shape && t.pattern === emblem.pattern && t.symbol === emblem.symbol ? 'on' : ''}"><img src="${emblemImage(t)}" alt=""></button>`).join('')}</div>
        <div class="label">Cores<small>toca numa, depois na paleta</small></div>
        <div class="chips">${chip('primary', 'Fundo', emblem.primary)}${chip('secondary', 'Segunda', emblem.secondary)}${chip('accent', 'Símbolo', emblem.accent)}</div>
        ${palette('em-color', emblem[state.chip])}
        <div class="label">Letras<small>até três</small></div>
        <div class="letters"><input id="letters" maxlength="3" value="${esc(emblem.letters)}"><button class="dice" data-action="shuffle" title="Baralhar">🎲 Baralhar</button></div>
      </div>${foot()}`,
    };
  },
  e2() {
    const { emblem } = state;
    const src = emblemImage(emblem);
    const row = (key, list, label) => {
      const i = list.findIndex(([id]) => id === (key === 'outline' ? emblem.border ?? 'ink' : emblem[key]));
      const name = list[i][1];
      const thumb = key === 'outline' ? `<img src="${src}" alt="">` : `<img src="${emblemImage(key === 'shape' ? { ...emblem, pattern: 'plain', symbol: 'none', letters: '' } : key === 'pattern' ? { ...emblem, symbol: 'none', letters: '' } : { ...emblem, letters: '' })}" alt="">`;
      return `<div class="rowctl"><button data-step="${key}:-1" aria-label="${label} anterior">‹</button>${thumb}<div><b>${name}</b><small>${label} · ${i + 1} de ${list.length}</small></div><button data-step="${key}:1" aria-label="${label} seguinte">›</button></div>`;
    };
    return {
      upper: `${bar('Emblema do clube', 'Dragões do Minho')}<div class="stage"><div class="big"><img src="${src}" alt="Emblema grande"></div>${emblemContexts(src, emblem.letters)}</div>`,
      lower: `<div class="lower-scroll">
        <div class="hint">Cada camada tem o seu carrossel: vê-se o que muda antes de mudar. As cores ficam na própria camada.</div>
        ${row('shape', SHAPES, 'Forma')}${row('pattern', PATTERNS, 'Fundo')}${row('symbol', SYMBOLS, 'Símbolo')}${row('outline', OUTLINES, 'Contorno')}
        <div class="twocol"><div class="chips" style="grid-template-columns:1fr"><button data-chip="primary" class="${state.chip === 'primary' ? 'on' : ''}"><i style="background:${emblem.primary}"></i><span>Fundo</span></button></div><div class="chips" style="grid-template-columns:1fr 1fr"><button data-chip="secondary" class="${state.chip === 'secondary' ? 'on' : ''}"><i style="background:${emblem.secondary}"></i><span>2.ª</span></button><button data-chip="accent" class="${state.chip === 'accent' ? 'on' : ''}"><i style="background:${emblem.accent}"></i><span>Símb.</span></button></div></div>
        ${palette('em-color', emblem[state.chip])}
        <div class="letters"><span class="label">Letras</span><input id="letters" maxlength="3" value="${esc(emblem.letters)}"><button class="dice" data-action="shuffle">🎲</button></div>
      </div>${foot()}`,
    };
  },
  e3() {
    const src = pixEmblem(2);
    return {
      upper: `${bar('Emblema do clube', 'Dragões do Minho')}<div class="stage"><div class="big"><img src="${src}" alt="Emblema desenhado"></div><div class="contexts"><div><img src="${pixEmblem(1)}" alt=""><span>Pequeno, no plantel</span></div><div class="bug"><img src="${pixEmblem(1)}" alt="">DRM <span style="color:#f2c230">12</span> · 9 RIV</div><div><span>16 × 16, seis cores: é o que cabe nos sítios pequenos.</span></div></div></div>`,
      lower: `<div class="lower-scroll">
        <div class="toolbar"><button data-tool="pen" class="${state.tool === 'pen' ? 'on' : ''}">Lápis</button><button data-tool="fill" class="${state.tool === 'fill' ? 'on' : ''}">Balde</button><button data-tool="eraser" class="${state.tool === 'eraser' ? 'on' : ''}">Borracha</button><button data-tool="mirror" class="${state.tool === 'mirror' ? 'on' : ''}">Espelho</button><button data-action="undo">Anular</button></div>
        <div class="pix"><div class="grid" id="grid">${state.pix.map((v, i) => `<i data-px="${i}" style="background:${v ? PIX_PALETTE[v] : 'transparent'}"></i>`).join('')}</div>
        <div class="pixside"><span class="label">Cor</span><div class="pal">${PIX_PALETTE.slice(1).map((c, i) => `<button data-pixcolor="${i + 1}" class="${state.pixColor === i + 1 ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
        <span class="label">Carimbos</span><div class="stamps">${['ball', 'star', 'bolt', 'crown', 'hoop', 'anchor', 'tower', 'flame'].map(s => `<button data-stamp="${s}"><img src="${emblemImage({ ...state.emblem, shape: 'circle', pattern: 'plain', primary: '#00000000', secondary: '#00000000', symbol: s, letters: '' })}" alt="${s}"></button>`).join('')}</div>
        <span class="label">Modelos</span><div class="stamps"><button data-pixbase="circle">●</button><button data-pixbase="shield">⛊</button><button data-pixbase="clear">✕</button></div></div></div>
        <div class="hint">Para quem quer o emblema mesmo seu. Os carimbos põem um símbolo pronto, e o espelho desenha os dois lados de uma vez.</div>
      </div>${foot()}`,
    };
  },
  k1() {
    const { kit } = state;
    const part = (key, label) => `<button data-part="${key}" class="${state.part === key ? 'on' : ''}"><i style="background:${kit[key]}"></i><span>${label}</span></button>`;
    return {
      upper: `${bar('Equipamento principal', 'Dragões do Minho')}<div class="stage"><div class="mannequin"><canvas id="fig-front"></canvas><canvas id="fig-back"></canvas><div style="display:grid;gap:2px"><canvas id="fig-small"></canvas><canvas id="fig-small2"></canvas></div></div>
        <span class="hot ${state.part === 'trim' ? 'on' : ''}" data-part="trim" style="left:10px;top:70px">4 Pormenores</span><span class="hot ${state.part === 'jersey' ? 'on' : ''}" data-part="jersey" style="left:10px;top:104px">1 Camisola</span><span class="hot ${state.part === 'second' ? 'on' : ''}" data-part="second" style="left:10px;top:138px">2 Segunda</span><span class="hot ${state.part === 'shorts' ? 'on' : ''}" data-part="shorts" style="left:10px;top:172px">3 Calções</span></div>`,
      lower: `<div class="lower-scroll">
        <div class="kittabs">${DEFAULT_KITS.map(k => `<button data-kittab="${k.id}" class="${state.kitTab === k.id ? 'on' : ''}">${k.name}</button>`).join('')}</div>
        <div class="label">Toca na peça do boneco, ou aqui<small>e depois na cor</small></div>
        <div class="parts">${part('jersey', 'Camisola')}${part('second', 'Segunda')}${part('shorts', 'Calções')}${part('trim', 'Pormen.')}</div>
        ${palette('kit-color', kit[state.part])}
        <div class="label">Desenho da camisola<small>desliza para ver mais</small></div>
        <div class="patterns" id="patterns">${KIT_PATTERNS.map(([id, label]) => `<button data-pattern="${id}" class="${kit.pattern === id ? 'on' : ''}"><canvas data-mini="${id}"></canvas>${label}</button>`).join('')}</div>
      </div>${foot('<button data-action="dice" class="dice">🎲</button>')}`,
    };
  },
  k2() {
    const { kit } = state;
    const clash = Math.abs(parseInt(kit.jersey.slice(1), 16) - parseInt(rivalKit.jersey.slice(1), 16)) < 0x202020;
    return {
      upper: `${bar('Equipamento principal', 'Jornada 1 · Ribeirinha BC')}<div class="versus" style="background:#c59a56"><div class="col"><span class="who">Dragões do Minho</span><canvas data-fig="ours:0"></canvas><canvas data-fig="ours:1"></canvas></div><div class="col"><span class="who">Ribeirinha BC</span><canvas data-fig="rival:0"></canvas><canvas data-fig="rival:1"></canvas></div>
        <div class="contrast ${clash ? 'bad' : ''}"><span>Contraste com o adversário</span><b>${clash ? 'Fraco: muda a cor' : 'Bom'}</b></div></div>`,
      lower: `<div class="lower-scroll">
        <div class="kittabs">${DEFAULT_KITS.map(k => `<button data-kittab="${k.id}" class="${state.kitTab === k.id ? 'on' : ''}">${k.name}</button>`).join('')}</div>
        <div class="label">Modelos<small>um toque e está vestido</small></div>
        <div class="presets">${PRESETS.map(([name, p], i) => `<button data-preset="${i}" class="${p.pattern === kit.pattern && p.jersey === kit.jersey ? 'on' : ''}"><canvas data-mini-preset="${i}"></canvas>${name}</button>`).join('')}</div>
        <div class="label">Afinar<small>cores desta camisola</small></div>
        <div class="parts">${['jersey', 'second', 'shorts', 'trim'].map((k, i) => `<button data-part="${k}" class="${state.part === k ? 'on' : ''}"><i style="background:${kit[k]}"></i><span>${['Camisola', 'Segunda', 'Calções', 'Pormen.'][i]}</span></button>`).join('')}</div>
        ${palette('kit-color', kit[state.part])}
        <div class="toolbar"><button data-action="swap">Inverter cores</button><button data-action="copy">Copiar do principal</button></div>
      </div>${foot()}`,
    };
  },
  k3() {
    const { kit } = state;
    const part = (key, label, n) => `<button data-part="${key}" class="${state.part === key ? 'on' : ''}"><i style="background:${kit[key]}"></i><span>${n} ${label}</span></button>`;
    return {
      upper: `${bar('Mesa de corte', 'Equipamento principal')}<div class="cut"><canvas id="shirt-big" width="136" height="160"></canvas>
        <span class="hot ${state.part === 'trim' ? 'on' : ''}" data-part="trim" style="left:168px;top:14px">4</span><span class="hot ${state.part === 'jersey' ? 'on' : ''}" data-part="jersey" style="left:128px;top:62px">1</span><span class="hot ${state.part === 'second' ? 'on' : ''}" data-part="second" style="left:208px;top:62px">2</span><span class="hot ${state.part === 'shorts' ? 'on' : ''}" data-part="shorts" style="left:168px;top:126px">3</span>
        <div class="side"><span>Em campo</span><canvas data-fig="ours:0"></canvas><canvas data-fig="back"></canvas></div>
        <div class="nameback">Número nas costas: <b>grande</b></div></div>`,
      lower: `<div class="lower-scroll">
        <div class="parts">${part('jersey', 'Camisola', 1)}${part('second', 'Segunda', 2)}${part('shorts', 'Calções', 3)}${part('trim', 'Pormen.', 4)}</div>
        ${palette('kit-color', kit[state.part])}
        <div class="patterns" id="patterns">${KIT_PATTERNS.map(([id, label]) => `<button data-pattern="${id}" class="${kit.pattern === id ? 'on' : ''}"><canvas data-mini="${id}"></canvas>${label}</button>`).join('')}</div>
        <div class="twocol"><div class="letters"><span class="label">Nome</span><input value="Principal" style="width:120px;font:18px var(--ui);letter-spacing:0;text-transform:none"></div><div class="toolbar"><button data-action="dice" class="dice">🎲 Dado</button><button data-action="swap">Inverter</button></div></div>
        <div class="hint">Tudo à vista sem rolar: a cor escolhida mostra-se no chip, e a paleta é só uma.</div>
      </div>${foot()}`,
    };
  },
};

/* ---------- render ---------- */
function render() {
  const { upper, lower } = screens[state.screen]();
  $('#upper').innerHTML = upper;
  $('#lower').innerHTML = lower;
  $('#nav').innerHTML = SCREENS.map(([id, label]) => `<button data-screen="${id}" class="${state.screen === id ? 'on' : ''}">${label}</button>`).join('');
  paint();
}
function paint() {
  const { kit } = state;
  document.querySelectorAll('[data-mini]').forEach(c => { c.width = 34; c.height = 40; drawShirt(c.getContext('2d'), { ...kit, pattern: c.dataset.mini }, 1); });
  document.querySelectorAll('[data-mini-preset]').forEach(c => { c.width = 34; c.height = 40; drawShirt(c.getContext('2d'), { ...kit, ...PRESETS[Number(c.dataset.miniPreset)][1] }, 1); });
  const big = $('#shirt-big');
  if (big) drawShirt(big.getContext('2d'), kit, 4);
  const put = (id, canvas) => { const el = $(id); if (!el) return; el.width = canvas.width; el.height = canvas.height; el.getContext('2d').drawImage(canvas, 0, 0); };
  put('#fig-front', figure(kit, 3));
  put('#fig-back', figure(kit, 3, true));
  put('#fig-small', figure(kit, 1));
  put('#fig-small2', figure(kit, 1, false, 'run0'));
  document.querySelectorAll('[data-fig]').forEach(el => {
    const [who, n] = el.dataset.fig.split(':');
    const scale = state.screen === 'k2' ? 2 : 3;
    const c = who === 'rival' ? figure(rivalKit, scale, false, n === '1' ? 'defend' : 'idle') : figure(kit, scale, who === 'back', n === '1' ? 'drib0' : 'idle');
    el.width = c.width; el.height = c.height; el.getContext('2d').drawImage(c, 0, 0);
  });
}

/* ---------- interação ---------- */
const stampInto = (symbol) => {
  EMBLEM_SYMBOLS[symbol].forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') state.pix[(y + 3) * 16 + x + 3] = state.pixColor; }));
};
let undo = [];
const setPix = (i, v) => { state.pix[i] = v; if (state.tool === 'mirror') state.pix[Math.floor(i / 16) * 16 + (15 - (i % 16))] = v; };
function paintPixel(i) {
  if (state.tool === 'fill') {
    const from = state.pix[i]; if (from === state.pixColor) return;
    const stack = [i]; const seen = new Set();
    while (stack.length) { const k = stack.pop(); if (seen.has(k) || state.pix[k] !== from) continue; seen.add(k); state.pix[k] = state.pixColor; const x = k % 16; if (x > 0) stack.push(k - 1); if (x < 15) stack.push(k + 1); if (k >= 16) stack.push(k - 16); if (k < 240) stack.push(k + 16); }
  } else setPix(i, state.tool === 'eraser' ? 0 : state.pixColor);
  const el = document.querySelector(`[data-px="${i}"]`);
  document.querySelectorAll('[data-px]').forEach(p => { const v = state.pix[Number(p.dataset.px)]; p.style.background = v ? PIX_PALETTE[v] : 'transparent'; });
  const img = $('#upper .big img'); if (img) img.src = pixEmblem(2);
  document.querySelectorAll('#upper .contexts img').forEach(x => (x.src = pixEmblem(1)));
  void el;
}
let drawing = false;
document.addEventListener('pointerdown', e => {
  const px = e.target.closest('[data-px]');
  if (px) { undo.push([...state.pix]); drawing = true; paintPixel(Number(px.dataset.px)); }
});
document.addEventListener('pointerover', e => { const px = e.target.closest('[data-px]'); if (drawing && px) paintPixel(Number(px.dataset.px)); });
document.addEventListener('pointerup', () => (drawing = false));
document.addEventListener('input', e => {
  if (e.target.id === 'letters') { state.emblem.letters = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3); const src = emblemImage(state.emblem); document.querySelectorAll('#upper img').forEach(i => (i.src = src)); }
});
document.addEventListener('click', e => {
  const t = e.target.closest('button,[data-part]');
  if (!t) return;
  const d = t.dataset;
  if (d.screen) { state.screen = d.screen; history.replaceState(null, '', `?screen=${d.screen}`); }
  else if (d.template !== undefined) state.emblem = { ...templates()[Number(d.template)], letters: state.emblem.letters };
  else if (d.chip) state.chip = d.chip;
  else if (d.emColor) state.emblem[state.chip] = d.emColor;
  else if (d.step) { const [key, dir] = d.step.split(':'); const list = key === 'shape' ? SHAPES : key === 'pattern' ? PATTERNS : key === 'symbol' ? SYMBOLS : OUTLINES; const cur = key === 'outline' ? state.emblem.border ?? 'ink' : state.emblem[key]; const i = (list.findIndex(([id]) => id === cur) + Number(dir) + list.length) % list.length; if (key === 'outline') state.emblem.border = list[i][0]; else state.emblem[key] = list[i][0]; }
  else if (d.tool) state.tool = d.tool;
  else if (d.pixcolor) state.pixColor = Number(d.pixcolor);
  else if (d.stamp) { undo.push([...state.pix]); stampInto(d.stamp); }
  else if (d.pixbase) { undo.push([...state.pix]); state.pix = state.pix.map((_, i) => { const x = (i % 16) - 7.5, y = Math.floor(i / 16) - 7.5; if (d.pixbase === 'clear') return 0; if (d.pixbase === 'circle') return Math.hypot(x, y) < 7.6 ? 1 : 0; return y < 1 ? (Math.abs(x) < 7.5 ? 1 : 0) : Math.abs(x) <= 7.5 - (y - 1) ? 1 : 0; }); }
  else if (d.action === 'undo') { if (undo.length) state.pix = undo.pop(); }
  else if (d.part) state.part = d.part;
  else if (d.kitColor) state.kit[state.part] = d.kitColor;
  else if (d.pattern) state.kit.pattern = d.pattern;
  else if (d.kittab) { state.kitTab = d.kittab; const k = DEFAULT_KITS.find(x => x.id === d.kittab); state.kit = { ...k }; }
  else if (d.preset !== undefined) state.kit = { ...state.kit, ...PRESETS[Number(d.preset)][1] };
  else if (d.action === 'swap') { const { jersey, second } = state.kit; state.kit.jersey = second; state.kit.second = jersey; }
  else if (d.action === 'copy') { state.kit = { ...state.kit, ...DEFAULT_KITS[0], id: state.kit.id, name: state.kit.name }; say('Cores copiadas do principal.'); }
  else if (d.action === 'dice') { const pick = () => PALETTE[Math.floor(Math.random() * PALETTE.length)]; state.kit = { ...state.kit, jersey: pick(), second: pick(), shorts: pick(), trim: pick(), pattern: KIT_PATTERNS[Math.floor(Math.random() * KIT_PATTERNS.length)][0] }; }
  else if (d.action === 'shuffle') { const tpl = templates(); state.emblem = { ...tpl[Math.floor(Math.random() * tpl.length)], letters: state.emblem.letters }; }
  else if (d.action === 'save') { say('Numa maqueta nada se guarda.'); return; }
  else if (d.action === 'back') { say('Voltar ao escritório.'); return; }
  else return;
  render();
// Para a verificação: uma galeria com todas as formas, fundos e símbolos, desenhada com o código do jogo.
window.__emblemGallery = () => {
  const cell = e => `<div style="display:grid;justify-items:center;gap:2px;font:12px var(--sm)"><img src="${emblemImage(e)}" style="width:48px;height:48px;image-rendering:pixelated" alt=""></div>`;
  const base = { ...state.emblem, letters: 'DRM' };
  const rows = [
    SHAPES.map(([shape]) => cell({ ...base, shape })),
    PATTERNS.map(([pattern]) => cell({ ...base, pattern, symbol: 'none', letters: '' })),
    SYMBOLS.filter(([id]) => id !== 'none').map(([symbol]) => cell({ ...base, symbol, pattern: 'plain', shape: 'circle', letters: '' })),
    OUTLINES.map(([border]) => cell({ ...base, border })),
  ];
  document.body.innerHTML = `<div style="background:#f8f0d8;padding:8px;display:grid;gap:8px;width:720px">${rows.map(r => `<div style="display:flex;flex-wrap:wrap;gap:4px">${r.join('')}</div>`).join('')}</div>`;
};
});
render();
