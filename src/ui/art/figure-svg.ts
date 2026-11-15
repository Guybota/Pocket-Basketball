// Jogador de corpo inteiro em SVG, para o ecrã de treino onde a equipa aparece de pé numa fila.
// Desenho vetorial cartoon, como os retratos fora do campo (ver docs/referencias/calciobit/estilo-jogadores.md):
// cabeça grande (2,5 a 2,9 cabeças de altura), contorno de tinta mais grosso por fora do que por dentro,
// duas cores por material com a luz de cima à esquerda, e a cara feita de poucos traços.
// Os traços da cara usam os mesmos bits de `look.face` que o retrato (portrait.ts), para o mesmo jogador ser reconhecível.
import { INK, hairColor, kitColors, kitId, skinColors, type Look } from './sprites.ts';
import { shadeOf, type ClubKit } from './kit.ts';
import { oklabOf } from './color.ts';
import { remember } from './cache.ts';
import type { Mood } from './portrait.ts';

export interface FigureOptions {
  /** 1 baixo, 2 médio, 3 alto; por omissão sai da altura do jogador (`look.legs + look.torso`). */
  height?: 1 | 2 | 3;
  /** Já treinou esta semana: o boneco fica escurecido, como na fila do treino. */
  trained?: boolean;
  /** O número na camisola; por omissão, um número fixo tirado da cara. 0 tira o número. */
  number?: number;
  /** A sombra no chão (por omissão, sim). */
  shadow?: boolean;
  /** A expressão: as sobrancelhas e a boca mudam, o resto da cara fica igual (como no retrato). */
  mood?: Mood;
  /** Só o busto (cabeça e ombros), num quadrado: o retrato das fichas e dos diálogos. */
  bust?: boolean;
  /** Busto para mostrar a 28 px ou menos: traços mais grossos e olhos sem branco, como um ícone. */
  small?: boolean;
}

/** A caixa do desenho, igual para todos: com os pés na mesma linha, uma fila de bonecos alinha-se sozinha. */
export const FIGURE_VIEW = { x: 0, y: 8, width: 120, height: 250 } as const;
const CX = 60;
const GROUND = 252;
const OUTLINE = 1.3;
// O contorno de fora é mais grosso: a silhueta inteira pinta-se primeiro a tinta, com este traço, por baixo de tudo.
const SILHOUETTE = 3.1;
const DETAIL = 0.95;
const LIGHT = '#fbf6e2';
const SOCK = '#f4f4f4';
// A cabeça desenha-se a esta escala, à volta do queixo, com o traço compensado para ter a mesma espessura que o corpo.
const HEAD_SCALE = 1.1;
// Tinta do escurecido: não escurece com o resto, para a cara continuar a ler (no Calciobit o contorno fica preto).
const TRAINED_INK = '#07090d';
// Uma roupa tão escura como a tinta deixa de ter contorno: sobe-se até esta claridade (OKLab L).
const MIN_CLOTH_L = 0.45;
// O cabelo muito escuro também: sem isto, um corte alto azul-marinho era um bloco da cor do contorno.
const MIN_HAIR_L = 0.42;

const BODY = {
  slim: { sh: 31, wa: 22, arm: 10.5, leg: 12, neck: 7.5 },
  athletic: { sh: 33, wa: 24, arm: 12, leg: 13, neck: 8.5 },
  muscular: { sh: 36, wa: 25, arm: 14.5, leg: 15, neck: 10 },
  heavy: { sh: 35, wa: 29, arm: 14, leg: 15.5, neck: 10 },
} as const;

// Meia-largura, altura e meia-largura do queixo; a mesma ordem das formas do retrato.
const HEADS = [
  { w: 32, h: 62, jaw: 21 }, // redonda
  { w: 27, h: 72, jaw: 16 }, // comprida
  { w: 33, h: 63, jaw: 28 }, // quadrada
  { w: 30, h: 67, jaw: 10 }, // queixo fino
] as const;

// Algarismos de camisola, desenhados como traços numa caixa de 7×11 (letra própria, de cantos redondos).
const DIGITS = [
  'M0,0H7V11H0Z', 'M1.5,2.5L4,0V11', 'M0,0H7V5.5H0V11H7', 'M0,0H7V11H0M1.5,5.5H7', 'M0,0V6.5H7M5,0V11',
  'M7,0H0V5H7V11H0', 'M7,0H0V11H7V5.5H0', 'M0,0H7L2.5,11', 'M0,0H7V11H0ZM0,5.5H7', 'M7,5.5H0V0H7V11H0',
] as const;

const n = (v: number): string => String(Math.round(v * 10) / 10);
const pt = (x: number, y: number): string => `${n(x)},${n(y)}`;

function channels(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
function toHex([r, g, b]: readonly number[]): string {
  return `#${[r!, g!, b!].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}`;
}
function mix(a: string, b: string, k: number): string {
  const x = channels(a);
  const y = channels(b);
  return toHex(x.map((c, i) => c + (y[i]! - c) * k));
}
const lightness = (hex: string): number => oklabOf(hex)[0];
/** Clareia uma cor de roupa até se separar da tinta. */
function liftCloth(hex: string, min = MIN_CLOTH_L, toward = '#8a96b4'): string {
  let color = hex;
  for (let k = 0; k < 12 && lightness(color) < min; k++) color = mix(color, toward, 0.12);
  return color;
}

/** Altura de 0 (baixo) a 1 (alto). `pixelsForHeight` dá 10 a 170 cm e 16 a 215 cm. */
function statureOf(look: Look, height?: 1 | 2 | 3): number {
  if (height) return (height - 1) / 2;
  return Math.max(0, Math.min(1, (look.legs + look.torso - 10) / 6));
}

export function figureSvg(look: Look, options: FigureOptions = {}): string {
  const trained = options.trained ?? false;
  // Escurecido: tudo multiplicado por 0,45 (no Calciobit, a camisola verde passa de 174 a 67), menos a tinta.
  // O vermelho desce menos do que o verde e o azul, para o escurecido ficar quente e não cinzento.
  const dim = (hex: string, k: number): string => toHex(channels(hex).map((v, i) => v * (i === 0 ? k * 1.1 : k * 0.93)));
  const c = (hex: string): string => (trained ? dim(hex, 0.45) : hex);
  const ink = trained ? TRAINED_INK : INK;
  const t = options.bust ? 0.5 : statureOf(look, options.height);
  const mood = options.mood ?? 'neutral';
  // No busto o desenho mostra-se pequeno (20 a 84 px): os traços engrossam para o contorno não desaparecer.
  const lw = options.small ? 2.3 : options.bust ? 1.6 : 1;
  const outline = OUTLINE * lw;
  const detail = DETAIL * lw;
  const silhouetteW = SILHOUETTE * lw;
  const trait = (shift: number, count: number): number => (look.face >>> shift) % count;
  const kit = kitColors(look);
  const custom: ClubKit | undefined = look.custom;
  // O pessoal e o público não vestem a camisola de alças: o treinador e o adjunto têm fato de treino, o presidente
  // fato e gravata, a secretária blusa, o árbitro e os adeptos t-shirt.
  const outfit = custom ? null : look.kit;
  const sleeves = outfit === 'coach' || outfit === 'suit' || outfit === 'blouse' ? 'long' : outfit === 'fan' || outfit === 'fan2' || outfit === 'referee' ? 'short' : null;
  const jersey0 = liftCloth(kit.jersey);
  const second0 = look.kit === 'referee' && !look.custom ? '#2c3345' : liftCloth(custom?.second ?? kit.trim);
  const trim0 = liftCloth(kit.trim);
  const shorts0 = liftCloth(kit.shorts);
  const [skin0, skinShade0] = skinColors(look);
  const darkSkin = lightness(skin0) < 0.5;
  // No escurecido, a pele não desce abaixo de L 0,3, para a cara não se fundir com a tinta (a pele mais escura ×0,45 ficava a 0,23).
  let skinDim = 0.45;
  while (trained && skinDim < 0.75 && lightness(dim(skin0, skinDim)) < 0.3) skinDim += 0.05;
  const cs = (hex: string): string => (trained ? dim(hex, skinDim) : hex);
  const skin = cs(skin0);
  const skinShade = cs(skinShade0);
  // O cabelo separa-se da tinta e da pele: na pele escura fica mais escuro do que ela (sem descer à tinta),
  // na clara sobe até se ver contra a tinta. Com a mesma claridade, cabelo e cara liam-se como um gorro.
  let hair0 = liftCloth(hairColor(look), MIN_HAIR_L, '#6a5f78');
  if (darkSkin) for (let k = 0; k < 12 && lightness(hair0) > lightness(skin0) - 0.09 && lightness(hair0) > 0.33; k++) hair0 = mix(hair0, '#1e1618', 0.15);
  const hair = c(hair0);
  const hairLight = c(mix(hair0, '#ffffff', 0.22));
  const strand = c(mix(hair0, INK, 0.45));
  const hairShade = c(mix(hair0, INK, 0.28));
  const uid = `f${hashOf(figureKey(look, options))}`;

  const defs: string[] = [];
  const back: string[] = [];
  const out: string[] = [];
  let clips = 0;
  let ow = outline;
  /** Uma forma com contorno, que entra também na silhueta de fora. */
  const shape = (d: string, fill: string): void => {
    back.push(d);
    out.push(`<path d="${d}" fill="${fill}" stroke="${ink}" stroke-width="${n(ow)}" stroke-linejoin="round"/>`);
  };
  const clip = (d: string, content: string): string => {
    const id = `${uid}c${clips++}`;
    defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
    return `<g clip-path="url(#${id})">${content}</g>`;
  };
  const fill = (d: string, color: string, opacity = 1): string => `<path d="${d}" fill="${color}"${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`;
  const line = (d: string, color: string, width: number): string =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(width * lw)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const edge = (d: string): string => line(d, ink, ow / lw);
  const rect = (x: number, y: number, w: number, h: number): string => `M${pt(x, y)}h${n(w)}v${n(h)}h${n(-w)}Z`;
  const ellipse = (x: number, y: number, rx: number, ry: number): string =>
    `M${pt(x - rx, y)}a${n(rx)},${n(ry)} 0 1,0 ${n(rx * 2)},0a${n(rx)},${n(ry)} 0 1,0 ${n(-rx * 2)},0Z`;
  /** A sombra de uma peça: a mesma forma, só à direita de `x` (a luz vem de cima à esquerda). */
  const shadeRight = (d: string, x: number, color: string): void => {
    out.push(clip(rect(x, 0, 200, 300), fill(d, color)));
  };

  // Medidas de baixo para cima. A cabeça é igual em todos; a altura muda sobretudo nas pernas, e um pouco no tronco.
  const { sh, wa, arm, leg, neck } = BODY[look.build];
  const highSocks = trait(3, 3) !== 0;
  const shoeH = 12;
  const sockH = highSocks ? 13 : 7;
  // A diferença de altura reparte-se pelas pernas, pelos calções e pelo tronco (só nas pernas, os altos pareciam andas).
  const legLen = 19 + 13 * t;
  const shortsH = 33 + 5 * t;
  const torsoH = 36 + 15 * t;
  const sockBottom = GROUND - shoeH + 3;
  const sockTop = sockBottom - sockH;
  const hem = sockTop - legLen + (highSocks ? 6 : 0);
  const waist = hem - shortsH;
  const shoulder = waist - torsoH;
  const head = HEADS[look.face % HEADS.length]!;
  const hw = head.w - (look.build === 'slim' ? 1 : 0);
  const jaw = head.jaw + (look.build === 'heavy' ? 4 : 0);
  const hh = head.h;
  const chin = shoulder - 2;
  const top = chin - hh;
  const legX = wa * 0.5 + 2.5;

  if ((options.shadow ?? true) && !options.bust) out.push(`<ellipse cx="${CX}" cy="${GROUND - 1}" rx="${n(sh + 8)}" ry="5" fill="${INK}" opacity="0.2"/>`);
  const firstShape = out.length;

  // Pernas com joelho, meias e sapatilhas de cano alto. No busto não se veem, e não se desenham.
  const shoeStyle = trait(1, 3);
  const shoeUpper = c(shoeStyle === 0 ? SOCK : shoeStyle === 1 ? liftCloth('#2c3345') : jersey0);
  const shoeAccent = c(shoeStyle === 0 ? jersey0 : shoeStyle === 1 ? trim0 : SOCK);
  for (const side of options.bust ? [] : [-1, 1]) {
    const x = CX + side * legX;
    const half = leg / 2;
    const knee = hem + 2;
    const legD = `M${pt(x - half - 0.5, hem - 6)}L${pt(x + half + 0.5, hem - 6)}L${pt(x + half, knee)}Q${pt(x + half + 0.8, knee + 6)} ${pt(x + half - 0.4, sockTop + 2)}L${pt(x - half + 0.4, sockTop + 2)}Q${pt(x - half - 0.8, knee + 6)} ${pt(x - half, knee)}Z`;
    shape(legD, skin);
    shadeRight(legD, x + leg * 0.2, skinShade);
    out.push(edge(legD));
    out.push(line(`M${pt(x - 2.5, knee)}q2.5,1.6 5,0`, skinShade, detail / lw));
    const sockD = rect(x - half - 0.4, sockTop, leg + 0.8, sockH + 1);
    shape(sockD, c(SOCK));
    out.push(clip(sockD, (highSocks ? fill(rect(x - 10, sockTop + 2.5, 20, 2.4), c(jersey0)) : '') + fill(rect(x + leg * 0.22, sockTop, 10, 20), c('#d6d3cc'))));
    out.push(edge(sockD));
    const sx = x + side * 1.5;
    const sw = half + 5;
    const shoeD = `M${pt(sx - sw, GROUND)}L${pt(sx - sw, GROUND - 5)}Q${pt(sx - sw, GROUND - shoeH)} ${pt(sx - sw + 6, GROUND - shoeH)}L${pt(sx + sw - 6, GROUND - shoeH)}Q${pt(sx + sw, GROUND - shoeH)} ${pt(sx + sw, GROUND - 5)}L${pt(sx + sw, GROUND)}Z`;
    shape(shoeD, shoeUpper);
    out.push(clip(shoeD,
      fill(`M${pt(sx - sw, GROUND - 3)}Q${pt(sx - side * 2, GROUND - 10)} ${pt(sx + sw, GROUND - 7)}L${pt(sx + sw, GROUND - 4.5)}Q${pt(sx - side * 2, GROUND - 6.5)} ${pt(sx - sw, GROUND)}Z`, shoeAccent)
      + fill(rect(sx - sw, GROUND - 3, sw * 2, 4), c(LIGHT))
      + fill(rect(sx + sw * 0.4, GROUND - shoeH, sw, shoeH - 3), INK, 0.15)));
    out.push(edge(shoeD));
    out.push(line(`M${pt(sx - sw + 1, GROUND - 3)}H${n(sx + sw - 1)}`, ink, detail / lw));
  }

  // Braços: de pé na fila, todos com as mãos atrás das costas (uma só pose, como na fila do treino do Calciobit;
  // as mãos ao lado do corpo liam-se como luvas). Vê-se o braço até ao cotovelo, a dobrar para dentro.
  for (const side of [-1, 1]) {
    const outer = CX + side * (sh + 2);
    const elbowY = waist - 3;
    const ex = CX + side * (sh - 1);
    // O ombro cai em curva; o cotovelo faz um ângulo no contorno e o antebraço vira para trás.
    const armD = `M${pt(CX + side * (sh - 12), shoulder + 3)}Q${pt(outer + side * 1, shoulder + 2)} ${pt(outer, shoulder + 16)}Q${pt(ex + side * 1.4, shoulder + 28)} ${pt(ex + side * 1, elbowY - 5)}L${pt(ex - side * arm * 0.2, elbowY + 3)}Q${pt(ex - side * arm * 0.6, elbowY + 5)} ${pt(ex - side * arm * 0.9, elbowY - 2)}L${pt(CX + side * (sh - arm + 1), shoulder + 24)}Z`;
    shape(armD, skin);
    shadeRight(armD, side < 0 ? ex - arm * 0.45 : ex - arm * 0.25, skinShade);
    out.push(edge(armD));
    if (sleeves) {
      // A manga: o mesmo braço, coberto até ao cotovelo (curta) ou até ao punho (comprida), com a bainha da manga.
      const end = sleeves === 'long' ? waist + 6 : shoulder + 21;
      const cover = rect(CX - 60, shoulder - 12, 120, end - shoulder + 12);
      out.push(clip(armD, clip(cover, fill(armD, c(jersey0)) + fill(rect(side < 0 ? ex - arm * 0.3 : ex - arm * 0.35, shoulder - 12, 30, 80), c(shadeOf(jersey0))))));
      out.push(clip(armD, line(`M${pt(CX - 60, end)}H${n(CX + 60)}`, ink, outline / lw)));
      out.push(edge(armD));
    }
    // A mão fechada espreita por trás da anca: os calções, desenhados a seguir, tapam metade.
    const fistD = ellipse(CX + side * (wa + 1), waist + 3, arm * 0.55, arm * 0.62);
    shape(fistD, skin);
    shadeRight(fistD, CX + side * (wa + 1) + arm * 0.15, skinShade);
    out.push(edge(fistD));
  }

  // Calções largos acima do joelho, com a faixa de lado e um V entre as pernas.
  const shortsShade = c(shadeOf(shorts0));
  const crotch = hem - 11;
  const shortsD = `M${pt(CX - wa - 1, waist - 3)}L${pt(CX + wa + 1, waist - 3)}L${pt(CX + legX + leg / 2 + 5, hem)}Q${pt(CX + legX, hem + 1.6)} ${pt(CX + 3, hem + 0.4)}L${pt(CX, crotch)}L${pt(CX - 3, hem + 0.4)}Q${pt(CX - legX, hem + 1.6)} ${pt(CX - legX - leg / 2 - 5, hem)}Z`;
  if (!options.bust) {
    shape(shortsD, c(shorts0));
    out.push(clip(shortsD,
      fill(`M${pt(CX - wa - 2, waist + 1)}L${pt(CX - wa + 3.5, waist + 1)}L${pt(CX - legX - leg / 2 - 0.5, hem + 2)}L${pt(CX - legX - leg / 2 - 6, hem + 2)}Z`, c(trim0))
      + fill(`M${pt(CX + wa + 2, waist + 1)}L${pt(CX + wa - 3.5, waist + 1)}L${pt(CX + legX + leg / 2 + 0.5, hem + 2)}L${pt(CX + legX + leg / 2 + 6, hem + 2)}Z`, c(trim0))
      + fill(`M${pt(CX + wa * 0.35, waist - 4)}H${n(CX + 60)}V${n(hem + 4)}H${n(CX + legX - 1)}Z`, shortsShade, 0.85)
      + fill(rect(CX - 40, waist - 4, 80, 5), shortsShade)));
    out.push(edge(shortsD));
    out.push(line(`M${pt(CX, crotch)}l0,-5`, ink, detail / lw));
  }

  // Pescoço; a sombra do queixo é a sombra mais forte da figura.
  const neckD = rect(CX - neck, chin - 12, neck * 2, shoulder + 16 - (chin - 12));
  shape(neckD, skin);
  out.push(clip(neckD, fill(ellipse(CX, chin - 1, neck + 2, 6.5), skinShade)));
  out.push(edge(neckD));

  // Camisola sem mangas, com decote e cavas debruados e o número ao peito. Fica por dentro dos calções.
  const strap = sh - 13;
  const armpitY = shoulder + 25;
  const neckline = `C${pt(CX + 8, shoulder + 14)} ${pt(CX - 8, shoulder + 14)} ${pt(CX - 9.5, shoulder)}`;
  const leftHole = `C${pt(CX - strap + 1, shoulder + 12)} ${pt(CX - sh + 8, shoulder + 21)} ${pt(CX - sh + 5, armpitY)}`;
  const rightHole = `C${pt(CX + strap - 1, shoulder + 12)} ${pt(CX + sh - 8, shoulder + 21)} ${pt(CX + sh - 5, armpitY)}`;
  // Com mangas, o tronco cobre os ombros (sem cavas); o fato e a blusa abrem em V, o resto tem gola redonda.
  const vNeck = outfit === 'suit' || outfit === 'blouse';
  const shirtNeck = vNeck ? `L${pt(CX, shoulder + 22)}L${pt(CX - 9.5, shoulder)}` : `C${pt(CX + 7, shoulder + 7)} ${pt(CX - 7, shoulder + 7)} ${pt(CX - 9.5, shoulder)}`;
  const shirtD = `M${pt(CX - 9.5, shoulder)}L${pt(CX - sh + 6, shoulder + 2.5)}Q${pt(CX - sh + 1, shoulder + 5)} ${pt(CX - sh + 2, shoulder + 14)}L${pt(CX - sh + 5, armpitY)}Q${pt(CX - wa - 2, shoulder + torsoH * 0.62)} ${pt(CX - wa, waist)}L${pt(CX + wa, waist)}Q${pt(CX + wa + 2, shoulder + torsoH * 0.62)} ${pt(CX + sh - 5, armpitY)}L${pt(CX + sh - 2, shoulder + 14)}Q${pt(CX + sh - 1, shoulder + 5)} ${pt(CX + sh - 6, shoulder + 2.5)}L${pt(CX + 9.5, shoulder)}${shirtNeck}Z`;
  const jerseyD = sleeves ? shirtD : `M${pt(CX - 9.5, shoulder)}L${pt(CX - strap, shoulder + 1)}${leftHole}Q${pt(CX - wa - 2, shoulder + torsoH * 0.62)} ${pt(CX - wa, waist)}L${pt(CX + wa, waist)}Q${pt(CX + wa + 2, shoulder + torsoH * 0.62)} ${pt(CX + sh - 5, armpitY)}C${pt(CX + sh - 8, shoulder + 21)} ${pt(CX + strap - 1, shoulder + 12)} ${pt(CX + strap, shoulder + 1)}L${pt(CX + 9.5, shoulder)}${neckline}Z`;
  back.push(jerseyD);
  const pattern = (main: string, second: string): string => {
    let s = fill(rect(CX - 45, shoulder - 5, 90, torsoH + 12), main);
    // O árbitro: riscas finas escuras na camisa clara.
    const p = custom?.pattern ?? (outfit === 'referee' ? 'pin' : 'plain');
    const y0 = shoulder - 5;
    const h = torsoH + 12;
    const add = (d: string): void => {
      s += fill(d, second);
    };
    if (p === 'stripes') for (let x = CX - 38.5; x < CX + 45; x += 14) add(rect(x, y0, 7, h));
    else if (p === 'pin') for (let x = CX - 37; x < CX + 45; x += 8) add(rect(x, y0, outfit === 'referee' ? 3 : 2, h));
    else if (p === 'hoops') for (let y = shoulder + 4; y < waist + 4; y += 14) add(rect(CX - 45, y, 90, 7));
    else if (p === 'band') add(rect(CX - 45, shoulder + torsoH * 0.62, 90, 9));
    else if (p === 'sash') add(`M${pt(CX - strap - 7, shoulder - 2)}L${pt(CX - strap + 5, shoulder - 2)}L${pt(CX + wa + 7, waist + 4)}L${pt(CX + wa - 5, waist + 4)}Z`);
    else if (p === 'half') add(rect(CX, y0, 45, h));
    else if (p === 'sides') {
      add(rect(CX - 45, y0, 45 - wa + 6, h));
      add(rect(CX + wa - 6, y0, 45, h));
    }
    return s;
  };
  // A sombra da cabeça cai no peito, logo abaixo do decote.
  const headShadow = fill(ellipse(CX + 3, shoulder + 3, sh * 0.62, 9), INK, 0.22);
  const shadeId = `${uid}c${clips++}`;
  defs.push(`<clipPath id="${shadeId}"><path d="${rect(CX + sh * 0.42, shoulder - 6, 60, torsoH + 14)}"/></clipPath>`);
  const trim = c(trim0);
  const number = sleeves || options.bust ? 0 : options.number ?? 1 + ((look.face >>> 2) % 34);
  let numberSvg = '';
  if (number > 0) {
    // O número, com contorno de tinta, na cor do debrum, ou na segunda cor se o debrum não se vê na camisola.
    const digits = String(Math.min(99, Math.floor(number))).split('').map(Number);
    // Se o padrão passa pelo número (riscas, aros, diagonal), o número leva uma placa lisa da cor da camisola,
    // e a cor dele escolhe-se só contra essa cor: nenhuma cor contrastava com as duas riscas ao mesmo tempo.
    const plate = custom !== undefined && (custom.pattern === 'stripes' || custom.pattern === 'pin' || custom.pattern === 'hoops' || custom.pattern === 'sash');
    const score = (color: string): number => Math.abs(lightness(color) - lightness(jersey0));
    const numColor = [trim0, second0, LIGHT, liftCloth('#2c3345')].reduce((best, color) => (score(color) > score(best) + 0.04 ? color : best));
    const k = 1.15;
    const width = (digits.length * 7 + (digits.length - 1) * 4) * k;
    const nx = CX - width / 2;
    const ny = shoulder + 17;
    const paths = digits.map((d, i) => `<path transform="translate(${n(nx + i * 11 * k)} ${n(ny)}) scale(${k})" d="${DIGITS[d]!}"/>`).join('');
    const plateSvg = plate ? `<rect x="${n(nx - 4)}" y="${n(ny - 4)}" width="${n(width + 8)}" height="${n(11 * k + 8)}" rx="3" fill="${c(jersey0)}"/>` : '';
    numberSvg = `${plateSvg}<g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="${ink}" stroke-width="4.6">${paths}</g><g stroke="${trained ? dim(numColor, 0.75) : numColor}" stroke-width="2.4">${paths}</g></g>`;
  }
  /** O que se vê no peito de quem tem mangas. */
  function collar(): string {
    const shade = c(shadeOf(jersey0));
    if (outfit === 'suit') {
      // As lapelas, um tom abaixo do fato (a camisa e a gravata, no V, desenham-se antes).
      return fill(`M${pt(CX - 9.5, shoulder)}L${pt(CX - 15, shoulder + 3)}L${pt(CX - 9, shoulder + 10)}L${pt(CX - 12, shoulder + 13)}L${pt(CX, shoulder + 26)}Z`, shade)
        + fill(`M${pt(CX + 9.5, shoulder)}L${pt(CX + 15, shoulder + 3)}L${pt(CX + 9, shoulder + 10)}L${pt(CX + 12, shoulder + 13)}L${pt(CX, shoulder + 26)}Z`, shade)
        + line(`M${pt(CX - 9.5, shoulder)}L${pt(CX - 15, shoulder + 3)}L${pt(CX - 9, shoulder + 10)}L${pt(CX - 12, shoulder + 13)}L${pt(CX, shoulder + 26)}L${pt(CX + 12, shoulder + 13)}L${pt(CX + 9, shoulder + 10)}L${pt(CX + 15, shoulder + 3)}L${pt(CX + 9.5, shoulder)}`, ink, detail / lw);
    }
    if (outfit === 'blouse') {
      // Gola de bicos clara (o colar desenha-se depois, por cima).
      return fill(`M${pt(CX - 9.5, shoulder)}L${pt(CX - 16, shoulder + 2)}L${pt(CX - 8, shoulder + 12)}L${pt(CX - 3, shoulder + 14)}Z`, trim)
        + fill(`M${pt(CX + 9.5, shoulder)}L${pt(CX + 16, shoulder + 2)}L${pt(CX + 8, shoulder + 12)}L${pt(CX + 3, shoulder + 14)}Z`, trim)
        + line(`M${pt(CX - 9.5, shoulder)}L${pt(CX - 16, shoulder + 2)}L${pt(CX - 8, shoulder + 12)}L${pt(CX - 3, shoulder + 14)}M${pt(CX + 9.5, shoulder)}L${pt(CX + 16, shoulder + 2)}L${pt(CX + 8, shoulder + 12)}L${pt(CX + 3, shoulder + 14)}`, ink, detail / lw);
    }
    // Gola redonda; o fato de treino tem a gola alta da cor do debrum e o fecho ao meio.
    const coach = outfit === 'coach';
    const ring = line(`M${pt(CX + 9.5, shoulder)}${shirtNeck}`, coach ? trim : shade, (coach ? 7 : 4) / lw);
    return ring + (coach ? line(`M${pt(CX, shoulder + 5)}V${n(waist)}`, trim, 2) + line(`M${pt(CX, shoulder + 5)}V${n(waist)}`, ink, 0.6) : '');
  }
  if (outfit === 'suit') {
    // No V do casaco: a camisa clara com o colarinho e a gravata vermelha.
    const tie = `M${pt(CX - 2.6, shoulder + 2)}L${pt(CX + 2.6, shoulder + 2)}L${pt(CX + 3.6, shoulder + 18)}L${pt(CX, shoulder + 23)}L${pt(CX - 3.6, shoulder + 18)}Z`;
    out.push(`<path d="M${pt(CX - 10, shoulder - 1)}L${pt(CX + 10, shoulder - 1)}L${pt(CX, shoulder + 24)}Z" fill="${trim}" stroke="${ink}" stroke-width="${outline}" stroke-linejoin="round"/>`);
    out.push(fill(tie, c('#cf3a2c')) + line(tie, ink, detail / lw));
  }
  out.push(clip(jerseyD,
    pattern(c(jersey0), c(second0))
    + `<g clip-path="url(#${shadeId})">${pattern(c(shadeOf(jersey0)), c(shadeOf(second0)))}</g>`
    + headShadow
    + numberSvg
    // Debrum: o traço fica metade dentro da camisola, metade cortado.
    + (sleeves ? collar() : line(`M${pt(CX + 9.5, shoulder)}${neckline}`, trim, 6.5 / lw)
      + line(`M${pt(CX - strap, shoulder + 1)}${leftHole}`, trim, 6 / lw)
      + line(`M${pt(CX + strap, shoulder + 1)}${rightHole}`, trim, 6 / lw))));
  out.push(`<path d="${jerseyD}" fill="none" stroke="${ink}" stroke-width="${outline}" stroke-linejoin="round"/>`);
  // A cinta dos calções passa por cima da camisola.
  const beltD = `M${pt(CX - wa - 1, waist - 3)}L${pt(CX + wa + 1, waist - 3)}L${pt(CX + wa + 1.3, waist + 1.5)}L${pt(CX - wa - 1.3, waist + 1.5)}Z`;
  if (!options.bust) out.push(`<path d="${beltD}" fill="${shortsShade}" stroke="${ink}" stroke-width="${outline}" stroke-linejoin="round"/>`);
  if (outfit === 'blouse') {
    // O colar: por cima da blusa (dentro dela ficava cortado pelo V do decote).
    let beads = '';
    for (let i = -3; i <= 3; i++) beads += ellipse(CX + i * 2.8, shoulder + 13 - Math.abs(i) * 1.7, 1.4, 1.4);
    out.push(fill(beads, c(LIGHT)) + line(beads, ink, 0.5)
      + fill(ellipse(CX, shoulder + 16.5, 2.4, 2.8), c('#f2c230')) + line(ellipse(CX, shoulder + 16.5, 2.4, 2.8), ink, 0.7));
  }

  // Cabeça: tudo o que vem a seguir desenha-se ampliado à volta do queixo (ver HEAD_SCALE).
  const headOut = out.length;
  const headBack = back.length;
  ow = outline / HEAD_SCALE;
  const headD = `M${pt(CX, top)}C${pt(CX + hw * 0.62, top)} ${pt(CX + hw, top + hh * 0.13)} ${pt(CX + hw, top + hh * 0.43)}C${pt(CX + hw, top + hh * 0.8)} ${pt(CX + jaw, chin)} ${pt(CX, chin)}C${pt(CX - jaw, chin)} ${pt(CX - hw, top + hh * 0.8)} ${pt(CX - hw, top + hh * 0.43)}C${pt(CX - hw, top + hh * 0.13)} ${pt(CX - hw * 0.62, top)} ${pt(CX, top)}Z`;
  const style = look.style % 5;
  // Duas variantes, para haver mais cortes: caracóis curtos em vez do afro, e cabelo rapado em vez de careca.
  const curly = style === 2 && trait(22, 3) === 1;
  // O bit 22 não é usado pelas caras fixas do pessoal (staff.ts): o presidente continua careca.
  const buzz = style === 3 && trait(22, 2) === 1;
  const beard = trait(10, 6);
  const hasBeard = beard >= 1 && beard <= 3;
  // Bigode só com a barba cheia; a barba 1 é uma sombra de barba no queixo (bigodes a mais liam-se como manchas).
  const moustache = beard === 1 || beard === 3;
  const longHair = style === 0 && trait(18, 4) === 0 && !hasBeard;
  // O carrapito só sem barba: as duas coisas juntas faziam uma cara ambígua.
  const bun = longHair && trait(16, 2) === 1 && !hasBeard;
  const fringeY = top + hh * 0.29;
  const sideY = top + hh * 0.47;
  /** A borda de fora do cabelo, em ondas: da têmpora esquerda, por cima, até à direita. */
  const crown = (rx: number, ry: number, cy: number, bumps: number, amp: number): string => {
    let d = '';
    const from = Math.PI * 0.96;
    const to = Math.PI * 2.04;
    for (let i = 0; i <= bumps; i++) {
      const a = from + ((to - from) * i) / bumps;
      const x = CX + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry;
      if (i === 0) {
        d += `M${pt(x, y)}`;
        continue;
      }
      const m = a - (to - from) / bumps / 2;
      d += `Q${pt(CX + Math.cos(m) * (rx + amp), cy + Math.sin(m) * (ry + amp))} ${pt(x, y)}`;
    }
    return d;
  };
  /** A sombra do cabelo segue a calota: uma elipse do lado direito, e não um corte a direito. */
  const hairShadow = (d: string): void => {
    out.push(clip(ellipse(CX + hw * 1.05, top + hh * 0.42, hw * 0.75, hh * 0.8), clip(d, fill(d, hairShade))));
  };
  /** Madeixas: traços curtos mais escuros a descer do alto da cabeça. */
  const strands = (count: number, y0: number, y1: number, spread: number): void => {
    let d = '';
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count - 0.5;
      const x = CX + u * spread;
      d += `M${pt(x - u * 3, y0)}Q${pt(x + u * 6 + 2, (y0 + y1) / 2)} ${pt(x + u * 8, y1)}`;
    }
    out.push(line(d, strand, detail / lw));
  };

  if (style === 2 && !curly) {
    // Afro: uma nuvem de caracóis por trás da cabeça, sem brilho (o cabelo crespo não reflete em arco).
    const cy = top + hh * 0.36;
    const afroD = `${crown(hw + 6, hh * 0.47 + 5, cy, 14, 3.5)}L${pt(CX + hw - 2, sideY + 8)}L${pt(CX - hw + 2, sideY + 8)}Z`;
    shape(afroD, hair);
    hairShadow(afroD);
    out.push(edge(afroD));
    let curls = '';
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1.1 + i * 0.1);
      const r = (hw + 3) * (0.72 + (i % 3) * 0.1);
      const x = CX + Math.cos(a) * r;
      const y = cy - 2 + Math.sin(a) * r * 0.9;
      curls += `M${pt(x - 2.5, y)}q2.5,-3 5,0`;
    }
    out.push(line(curls, strand, detail / lw));
  }
  if (bun) {
    const bunD = ellipse(CX, top - 10, 9, 8);
    shape(bunD, hair);
    out.push(line(`M${pt(CX - 4, top - 12)}q4,-3 8,0`, strand, detail / lw));
  }

  // Orelhas, por trás da cara.
  const earY = top + hh * 0.55;
  for (const side of [-1, 1]) {
    const earD = ellipse(CX + side * (hw - 1), earY, 6.2, 8.5);
    shape(earD, skin);
    out.push(line(`M${pt(CX + side * (hw + 2), earY - 3.5)}q${n(-side * 3)},2 ${n(-side * 1)},6`, skinShade, 1.8));
  }
  if (longHair) {
    // Cabelo comprido: cai por trás da cara até ao queixo, acaba em pontas e tapa as orelhas.
    const by = chin - 4;
    const longD = `M${pt(CX - hw - 4, top + hh * 0.3)}L${pt(CX - hw - 5, by - 6)}L${pt(CX - hw - 3, by + 2)}L${pt(CX - hw + 1, by - 3)}L${pt(CX - hw + 5, by + 1)}L${pt(CX - hw + 8, by - 4)}L${pt(CX + hw - 8, by - 4)}L${pt(CX + hw - 5, by + 1)}L${pt(CX + hw - 1, by - 3)}L${pt(CX + hw + 3, by + 2)}L${pt(CX + hw + 5, by - 6)}L${pt(CX + hw + 4, top + hh * 0.3)}Z`;
    shape(longD, hair);
    hairShadow(longD);
    out.push(edge(longD));
    out.push(line(`M${pt(CX + hw + 1.5, top + hh * 0.5)}l0.5,14M${pt(CX - hw - 1.5, top + hh * 0.55)}l-0.5,12`, strand, detail / lw));
  }

  shape(headD, skin);
  // Nas peles escuras, a tinta quase não se vê: uma orla de luz à esquerda e em cima (a luz vem daí) separa a cara do contorno.
  if (darkSkin) out.push(clip(headD, line(`M${pt(CX + 2, top + 1.5)}C${pt(CX - hw * 0.6, top + 1.5)} ${pt(CX - hw + 1.6, top + hh * 0.13)} ${pt(CX - hw + 1.6, top + hh * 0.45)}`, cs(mix(skin0, '#f6d2a8', 0.32)), 2.6)));
  // Volume: uma meia-lua de sombra junto ao maxilar, do lado direito.
  out.push(clip(headD, fill(`M${pt(CX + hw * 0.82, top + hh * 0.52)}Q${pt(CX + hw * 0.8, chin - 5)} ${pt(CX + 4, chin + 0.5)}L${pt(CX + hw + 4, chin + 4)}L${pt(CX + hw + 4, top + hh * 0.52)}Z`, skinShade, darkSkin ? 0.25 : 0.45)));
  out.push(edge(headD));

  // Barba cheia: uma mancha da cor do cabelo pela pele, sem contorno.
  // A barba fica sempre bem mais escura do que a pele (na pele escura, a cor do cabelo desaparecia).
  const beardColor = style === 3 || darkSkin ? c(mix(skinShade0, '#1e1618', 0.6)) : c(mix(hair0, '#3a2418', 0.2));
  if (beard === 3) {
    out.push(clip(headD, fill(`M${pt(CX - hw - 2, top + hh * 0.6)}Q${pt(CX - hw + 4, top + hh * 0.68)} ${pt(CX - 9, top + hh * 0.9)}Q${pt(CX, top + hh * 0.84)} ${pt(CX + 9, top + hh * 0.9)}Q${pt(CX + hw - 4, top + hh * 0.68)} ${pt(CX + hw + 2, top + hh * 0.6)}L${pt(CX + hw + 2, chin + 2)}L${pt(CX - hw - 2, chin + 2)}Z`, cs(mix(skin0, style === 3 || darkSkin ? '#1e1618' : hair0, darkSkin ? 0.7 : 0.3)))));
  }

  // Cabelo da frente.
  if (style === 0 || style === 4) {
    // Com fita, só as franjas que não fazem pala por baixo dela.
    const fringe = style === 4 ? (trait(14, 2) ? 3 : 0) : trait(14, 4);
    const L = CX - hw + 5;
    const R = CX + hw - 5;
    let front = '';
    if (fringe === 0) {
      // Madeixas soltas, de larguras desiguais.
      const cuts = [0, 0.17, 0.4, 0.58, 0.8, 1];
      for (let i = 1; i < cuts.length; i++) {
        const x0 = R - (R - L) * cuts[i - 1]!;
        const x1 = R - (R - L) * cuts[i]!;
        front += `Q${pt((x0 + x1) / 2 + 2, fringeY + 10 + (i % 2) * 2)} ${pt(x1, fringeY - (i === cuts.length - 1 ? -3 : 2))}`;
      }
    } else if (fringe === 1) {
      // Risca ao meio.
      front = `Q${pt(CX + hw * 0.45, fringeY + 8)} ${pt(CX + 1.5, fringeY - 6)}Q${pt(CX - hw * 0.45, fringeY + 8)} ${pt(L, fringeY + 3)}`;
    } else if (fringe === 2) {
      // Penteado para o lado, com uma ponta.
      front = `Q${pt(CX + hw * 0.35, fringeY - 4)} ${pt(CX - 4, fringeY + 2)}L${pt(CX - 8, fringeY + 3)}Q${pt(CX - hw * 0.45, fringeY + 6)} ${pt(L - 1, fringeY + 11)}`;
    } else {
      // Curto e espetado: pontas pequenas e desiguais por cima da testa (uma linha lisa lia-se como um gorro).
      // Pontas de tamanhos diferentes, a apontar para o lado (dentes iguais e direitos pareciam a malha de um gorro).
      const tips = [0, 0.22, 0.38, 0.6, 0.78, 1];
      for (let i = 1; i < tips.length; i++) {
        const x0 = R - (R - L) * tips[i - 1]!;
        const x1 = R - (R - L) * tips[i]!;
        front += `L${pt(x0 - (x0 - x1) * 0.75, fringeY + (i % 2 ? 9 : 6))}L${pt(x1, fringeY - 1)}`;
      }
    }
    const outerD = crown(hw + 4, hh * 0.43 + 8, top + hh * 0.43, 6 + trait(19, 4), style === 4 ? 3 : 0.8 + trait(15, 2) * 0.4);
    // As patilhas descem por cima do cimo da orelha, com uma ponta.
    const burn = top + hh * 0.53;
    const capD = `${outerD}L${pt(CX + hw + 2, burn - 3)}L${pt(CX + hw - 1, burn + 1)}L${pt(CX + hw - 3.5, sideY)}L${pt(R, fringeY + 3)}${front}L${pt(CX - hw + 3.5, sideY)}L${pt(CX - hw + 1, burn + 1)}L${pt(CX - hw - 2, burn - 3)}Z`;
    shape(capD, hair);
    hairShadow(capD);
    out.push(edge(capD));
    // Sem brilho no cabelo: os traços de luz no alto davam um ar de capacete. A luz é o lado claro do tom de sombra.
    // Com fita, sem madeixas: as riscas por cima da fita liam-se como um gorro de malha.
    if (style === 0) strands(3, top - 3, top + (fringeY - top) * 0.6, hw * 1.1);
    if (style === 4) {
      // Fita na testa, da cor do debrum, abaixo da franja: o cabelo passa por cima e por baixo dela.
      const b = fringeY - 6;
      const bandD = `M${pt(CX - hw - 1.5, b)}Q${pt(CX, b - 6)} ${pt(CX + hw + 1.5, b)}L${pt(CX + hw + 1, b + 7)}Q${pt(CX, b + 1)} ${pt(CX - hw - 1, b + 7)}Z`;
      shape(bandD, trim);
      if (Math.abs(lightness(trim0) - lightness(hair0)) < 0.15) out.push(clip(bandD, line(`M${pt(CX - hw - 2, b + 3.5)}Q${pt(CX, b - 2.5)} ${pt(CX + hw + 2, b + 3.5)}`, c(LIGHT), 1.6)));
    }
  } else if (style === 1) {
    // Corte alto: volume no topo com a borda aos dentes, e os lados rapados a desvanecer a partir das têmporas.
    const lift = 7;
    const topY = top - lift;
    let teeth = '';
    const k = 7;
    for (let i = 1; i <= k; i++) {
      const x = CX - hw + 3 + ((hw * 2 - 6) * i) / k;
      teeth += `L${pt(x - (hw * 2 - 6) / k / 2, topY - (i % 2 ? 2.4 : 1.2))}L${pt(x, topY)}`;
    }
    const hairD = `M${pt(CX - hw - 1, sideY)}L${pt(CX - hw - 1, top + hh * 0.18)}Q${pt(CX - hw + 1, topY - 1)} ${pt(CX - hw + 6, topY)}${teeth}Q${pt(CX + hw - 1, topY - 1)} ${pt(CX + hw + 1, top + hh * 0.18)}L${pt(CX + hw + 1, sideY)}L${pt(CX + hw - 4, sideY)}L${pt(CX + hw - 5, fringeY - 1)}Q${pt(CX, fringeY - 5)} ${pt(CX - hw + 5, fringeY - 1)}L${pt(CX - hw + 4, sideY)}Z`;
    shape(hairD, hair);
    hairShadow(hairD);
    out.push(edge(hairD));
    // O desvanecido: a cor do cabelo passa a pele em três faixas, de cima para baixo, nas têmporas.
    const fadeTop = sideY - 12;
    let fade = '';
    for (let i = 0; i < 3; i++) fade += fill(rect(CX - hw - 3, fadeTop + i * 4, hw * 2 + 6, sideY - fadeTop), c(mix(hair0, skin0, 0.3 + i * 0.18)));
    out.push(clip(hairD, fade));
    out.push(edge(hairD));
    let tufts = '';
    for (let i = 0; i < 6; i++) {
      const x = CX - hw + 8 + ((hw * 2 - 16) * i) / 5;
      tufts += `M${pt(x, topY + 2.5)}l${n(i < 3 ? -0.8 : 0.8)},7`;
    }
    out.push(line(tufts, strand, detail / lw));
  } else if (curly) {
    // Caracóis curtos: uma touca de caracóis pequenos à volta da cabeça, com a linha do cabelo aos caracóis.
    // (Tentou-se tranças rentes: a este tamanho liam-se sempre como uma fita ou um gorro.)
    let front = '';
    const k = 7;
    const R = CX + hw - 2;
    const L = CX - hw + 2;
    for (let i = 1; i <= k; i++) {
      const x0 = R - ((R - L) * (i - 1)) / k;
      const x1 = R - ((R - L) * i) / k;
      const y = i === 1 || i === k ? sideY - 3 : fringeY - 1;
      front += `Q${pt((x0 + x1) / 2, y + 6)} ${pt(x1, i === k ? sideY + 2 : y)}`;
    }
    const capD = `${crown(hw + 4, hh * 0.43 + 8, top + hh * 0.43, 12, 3)}L${pt(R, sideY + 2)}${front}Z`;
    shape(capD, hair);
    hairShadow(capD);
    let curls = '';
    for (let i = 0; i < 7; i++) {
      const x = CX - hw * 0.6 + i * hw * 0.2;
      const y = top + 1 + (i % 2) * 6;
      curls += `M${pt(x - 2.2, y)}q2.2,-2.6 4.4,0`;
    }
    out.push(clip(capD, line(curls, strand, detail / lw)));
    out.push(edge(capD));
  } else if (style === 2) {
    // A frente do afro: a linha do cabelo aos caracóis por cima da testa.
    const capD = `M${pt(CX - hw - 1, sideY + 2)}C${pt(CX - hw - 2, top - 18)} ${pt(CX + hw + 2, top - 18)} ${pt(CX + hw + 1, sideY + 2)}`;
    let curls = `L${pt(CX + hw - 2, sideY)}`;
    const k = 6;
    for (let i = 0; i < k; i++) {
      const x0 = CX + hw - 2 - ((hw * 2 - 4) * i) / k;
      const x1 = CX + hw - 2 - ((hw * 2 - 4) * (i + 1)) / k;
      const y = i === 0 || i === k - 1 ? sideY - 6 : fringeY - 1;
      curls += `Q${pt((x0 + x1) / 2, y + 7)} ${pt(x1, i === k - 1 ? sideY : y)}`;
    }
    out.push(fill(`${capD}${curls}Z`, hair));
    out.push(line(`M${pt(CX + hw + 1, sideY + 2)}${curls}`, ink, ow / lw));
  } else if (buzz) {
    // Rapado: a sombra do cabelo curtíssimo na forma do corte, sem contorno e sempre mais escura do que a pele
    // (um louro rapado claro sobre pele escura lia-se como uma touca).
    out.push(clip(headD, fill(`M${pt(CX - hw - 2, sideY + 2)}L${pt(CX - hw - 2, top - 2)}L${pt(CX + hw + 2, top - 2)}L${pt(CX + hw + 2, sideY + 2)}L${pt(CX + hw - 3, sideY + 2)}L${pt(CX + hw - 5, fringeY + 1)}Q${pt(CX + hw * 0.45, fringeY - 6)} ${pt(CX + 5, fringeY - 1)}Q${pt(CX, fringeY + 1.5)} ${pt(CX - 5, fringeY - 1)}Q${pt(CX - hw * 0.45, fringeY - 6)} ${pt(CX - hw + 5, fringeY + 1)}L${pt(CX - hw + 3, sideY + 2)}Z`, cs(mix(skin0, '#2a1d18', 0.42)))));
    out.push(edge(headD));
  } else {
    // Careca: um brilho morno e discreto no alto da cabeça.
    out.push(line(`M${pt(CX - hw * 0.55, top + 8)}Q${pt(CX - hw * 0.35, top + 4)} ${pt(CX - hw * 0.12, top + 3.5)}`, cs(mix(skin0, '#fff3d6', 0.3)), 2.4));
  }

  // A cara: olhos com branco, íris e pálpebra; abaixo do meio da cabeça.
  const eyeY = top + hh * ((style === 3 ? 0.54 : 0.56) + trait(0, 3) * 0.015);
  const eyeDX = hw * (0.33 + trait(7, 3) * 0.025);
  // Escurecidas para um castanho quente: com a tinta azulada, o louro dava sobrancelhas cor de azeitona.
  // Na pele escura, as sobrancelhas e a boca são quase pretas (com a cor do cabelo ou da pele, quase não se viam;
  // uma orla clara por baixo lia-se como bordado).
  const darkInk = c('#0d0a0c');
  const feature = (d: string, color: string, width: number): string => line(d, darkSkin ? darkInk : color, width);
  const browColor = darkSkin ? c(mix(INK, '#3a2418', 0.35)) : style === 3 ? c(mix(skinShade0, INK, 0.5)) : c(mix(hair0, '#3a2418', lightness(hair0) > 0.6 ? 0.8 : 0.6));
  // Contente, as sobrancelhas sobem; preocupado ou triste, as pontas de fora descem (como no retrato).
  const browMood = mood === 'neutral' ? trait(4, 3) : mood === 'happy' ? 0 : 2;
  const browLift = mood === 'happy' ? -2.2 : 0;
  // Preocupado e triste: a ponta de dentro sobe bem e a de fora desce (o triste ainda mais).
  const browTilt = mood === 'worried' ? 2.4 : mood === 'sad' ? 3.4 : 0;
  const thickBrows = trait(21, 2) === 1 && trait(5, 2) === 1;
  const browY = eyeY - 9.5;
  for (const side of [-1, 1]) {
    const inner = CX + side * 4.5;
    const outer = CX + side * (eyeDX + 7);
    const [yi, yo] = (browMood === 0 ? [browY, browY] : browMood === 1 ? [browY + 2.2, browY - 1.5] : [browY - 1 - browTilt, browY + 2.2 + browTilt * 0.4]).map(y => y + browLift) as [number, number];
    out.push(feature(`M${pt(inner, yi)}Q${pt((inner + outer) / 2, Math.min(yi, yo) - 3)} ${pt(outer, yo)}`, browColor, thickBrows ? 4.2 : 3));
  }
  // Os mesmos bits do retrato; o olho estreito só com o bit 19, que as caras fixas não usam.
  const eyes = trait(6, 3) === 0 && trait(19, 2) === 1 ? 3 : trait(6, 3);
  // Amendoado, redondo ou semicerrado: a mesma construção, com outra forma.
  // Amendoado, redondo, semicerrado ou estreito.
  const [erx, ery, lid] = eyes === 0 ? [5, 3.6, 0] : eyes === 1 ? [4.2, 4.2, 0] : eyes === 2 ? [5, 3.4, 0.8] : [4.6, 2.7, 0];
  for (const side of [-1, 1]) {
    const x = CX + side * eyeDX;
    if (mood === 'happy') {
      // Contente: os olhos fecham-se em arco.
      out.push(line(`M${pt(x - erx, eyeY + 1)}Q${pt(x, eyeY - 4.5)} ${pt(x + erx, eyeY + 1)}`, ink, 2.2));
      continue;
    }
    if (options.small) {
      // Pequeno: só a íris, grande e escura, sem branco (o branco virava um borrão cinzento).
      // Na pele escura, um anel claro à volta, para a íris não desaparecer na pele.
      if (darkSkin) out.push(fill(ellipse(x, eyeY + 0.3, 4.2, 4.8), c(LIGHT)));
      out.push(fill(ellipse(x, eyeY + 0.3, 3, 3.6), ink));
      continue;
    }
    // Triste: a pálpebra de cima desce.
    const droop = mood === 'sad' ? 1.4 : lid;
    const eyeD = ellipse(x, eyeY, erx, ery);
    out.push(fill(eyeD, trained ? mix(LIGHT, INK, 0.2) : LIGHT));
    out.push(clip(eyeD, `<circle cx="${n(x - side * 0.6)}" cy="${n(eyeY + 0.4)}" r="2.7" fill="${ink}"/><circle cx="${n(x - side * 0.6 - 0.9)}" cy="${n(eyeY - 0.6)}" r="0.9" fill="#ffffff"/>${droop ? fill(rect(x - 6, eyeY - 6, 12, 6 + droop - ery + 2.2), skin) : ''}`));
    const lidY = eyeY - ery + droop;
    out.push(line(`M${pt(x - side * (erx + 0.2), eyeY + (droop ? droop * 0.6 : -0.2))}Q${pt(x, lidY - 2.4)} ${pt(x + side * (erx + 1.3), eyeY - 1.2 + droop * 0.6)}`, ink, 1.8));
  }

  if (trait(20, 5) === 0) {
    // Óculos (os jogadores nunca os têm: lookOf evita este bit).
    const frame = c(mix(INK, '#7a5a2c', 0.4));
    for (const side of [-1, 1]) out.push(`<rect x="${n(CX + side * eyeDX - 6.5)}" y="${n(eyeY - 5.5)}" width="13" height="10" rx="3" fill="none" stroke="${frame}" stroke-width="1.5"/>`);
    out.push(line(`M${pt(CX - eyeDX + 6.5, eyeY - 1)}H${n(CX + eyeDX - 6.5)}`, frame, 1.5));
  }

  // Nariz com volume: a luz da esquerda, a sombra à direita e a linha de baixo.
  const noseY = eyeY + 9;
  // O nariz desenha-se 1,25 vezes maior à volta do seu cimo: narizes pequenos davam caras de criança.
  const noseStart = out.length;
  const noseInk = c(mix(skinShade0, INK, darkSkin ? 0.7 : 0.4));
  const nose0 = trait(8, 3) === 1 && trait(22, 2) === 1 ? 3 : trait(8, 3);
  const nose = nose0 === 1 && moustache ? 0 : nose0;
  if (nose === 0) {
    out.push(fill(`M${pt(CX + 1, eyeY + 2)}Q${pt(CX + 4.5, noseY - 1)} ${pt(CX + 3.5, noseY + 1)}L${pt(CX + 0.5, noseY + 1)}Z`, skinShade, 0.8));
    out.push(line(`M${pt(CX + 1, eyeY + 2)}Q${pt(CX + 4.8, noseY - 1)} ${pt(CX + 3.2, noseY + 1.4)}Q${pt(CX, noseY + 2.8)} ${pt(CX - 3, noseY + 0.8)}`, noseInk, 1.6));
  } else if (nose === 1) {
    out.push(fill(ellipse(CX + 1.2, noseY - 0.5, 3.4, 2.6), skinShade, 0.7));
    out.push(line(`M${pt(CX - 3.8, noseY)}Q${pt(CX, noseY + 3.4)} ${pt(CX + 3.8, noseY)}`, noseInk, 1.6));
  } else if (nose === 3) {
    // Nariz largo e redondo, com as narinas.
    out.push(fill(ellipse(CX + 1.6, noseY, 3.2, 3), skinShade, 0.7));
    out.push(line(`M${pt(CX - 3, noseY - 3)}C${pt(CX - 6.5, noseY + 3.5)} ${pt(CX + 6.5, noseY + 3.5)} ${pt(CX + 3, noseY - 3)}`, noseInk, 1.6));
    out.push(fill(ellipse(CX - 1.8, noseY + 1.2, 0.9, 0.7) + ellipse(CX + 1.8, noseY + 1.2, 0.9, 0.7), noseInk));
  } else {
    out.push(fill(`M${pt(CX + 0.5, eyeY + 1)}L${pt(CX + 3, noseY)}L${pt(CX + 0.5, noseY + 1.5)}Z`, skinShade, 0.8));
    out.push(line(`M${pt(CX + 1, eyeY + 1)}L${pt(CX + 3.2, noseY)}Q${pt(CX + 1.5, noseY + 2.2)} ${pt(CX - 1.8, noseY + 1.4)}`, noseInk, 1.6));
  }
  out.push(`<g transform="translate(${CX} ${n(eyeY + 1)}) scale(1.25) translate(${-CX} ${n(-(eyeY + 1))})">${out.splice(noseStart).join('')}</g>`);
  if (trait(17, 8) === 1) out.push(`<circle cx="${n(CX + hw * 0.42)}" cy="${n(noseY + 4)}" r="1" fill="${skinShade}"/>`);

  // Boca e barba. O bigode é uma faixa fina acima da boca, separada dela; com bigode não há sorriso aberto.
  const mouthY = eyeY + 20;
  // O bigode: uma massa com espessura, quase horizontal, com as pontas só um pouco abaixo do meio.
  // A borda de baixo aos bicos, para se ler como pelo e não como um lábio.
  if (moustache) {
    const m = mouthY - 2;
    out.push(fill(`M${pt(CX - 8.5, m - 2.6)}Q${pt(CX - 4, m - 8)} ${pt(CX, m - 7)}Q${pt(CX + 4, m - 8)} ${pt(CX + 8.5, m - 2.6)}L${pt(CX + 5, m - 4.4)}L${pt(CX + 3.4, m - 3.2)}L${pt(CX + 1.2, m - 4.8)}L${pt(CX - 1.2, m - 3.4)}L${pt(CX - 3.4, m - 4.8)}L${pt(CX - 5, m - 3.4)}Z`, beardColor));
  }
  if (beard === 2) out.push(clip(headD, fill(ellipse(CX, Math.min(mouthY + 7.4, chin - 3), 4, 2.6), beardColor)));
  const lips = c(mix(skinShade0, INK, darkSkin ? 0.8 : 0.5));
  // Com bigode, a boca é só um traço: um sorriso por baixo dele empilhava três curvas.
  // A maioria séria (linha, de lado, a descer); sorrisos só em alguns, como numa equipa de adultos à espera do treino.
  // Os bits do retrato (0 linha, 1 de lado, 2 sorriso, 3 aberto); metade dos sorrisos passa a boca séria (bit 15).
  const base = trait(12, 4) === 2 && trait(15, 2) === 1 ? 4 : trait(12, 4);
  // Neutro sem dentes à mostra (o aberto passa a sorriso fechado): os dentes ficam para o contente.
  // A boca ondulada do preocupado não se lê em pequeno nem ao pé da pera: aí fica uma linha.
  const worried = options.small || beard === 2 ? 4 : 6;
  const mouth = mood === 'happy' ? (moustache ? 2 : 3) : mood === 'worried' ? worried : mood === 'sad' ? 5 : base === 3 ? (moustache ? 0 : 2) : base;
  const mouthStart = out.length;
  if (mouth === 0) out.push(feature(`M${pt(CX - 5, mouthY - 0.4)}Q${pt(CX, mouthY + 1.2)} ${pt(CX + 5, mouthY - 0.4)}`, lips, 1.9));
  else if (mouth === 1) out.push(feature(`M${pt(CX - 5.5, mouthY + 0.6)}Q${pt(CX + 1, mouthY + 1)} ${pt(CX + 6, mouthY - 1.6)}`, lips, 1.9));
  else if (mouth === 5) out.push(feature(`M${pt(CX - 6.5, mouthY + 2.6)}Q${pt(CX, mouthY - 3.2)} ${pt(CX + 6.5, mouthY + 2.6)}`, lips, 2.1));
  else if (mouth === 6) out.push(feature(`M${pt(CX - 6, mouthY + 0.6)}q1.5,-1 3,0t3,0t3,0t3,0`, lips, 1.9));
  else if (mouth === 4) out.push(feature(`M${pt(CX - 5.5, mouthY + 0.3)}Q${pt(CX, mouthY - 0.3)} ${pt(CX + 5.5, mouthY + 0.3)}`, lips, 1.9));
  else if (mouth === 2) out.push(feature(`M${pt(CX - 6, mouthY - 1.4)}Q${pt(CX, mouthY + 3.6)} ${pt(CX + 6, mouthY - 1.4)}`, lips, 1.9));
  else {
    const grin = `M${pt(CX - 6.5, mouthY - 1.8)}Q${pt(CX, mouthY + 8)} ${pt(CX + 6.5, mouthY - 1.8)}Z`;
    out.push(clip(grin, fill(grin, c('#7a2f2f')) + fill(rect(CX - 8, mouthY - 3, 16, 3.6), c('#ffffff'))));
    out.push(`<path d="${grin}" fill="none" stroke="${lips}" stroke-width="${n(1.7 * lw)}" stroke-linejoin="round"/>`);
  }
  // Em pequeno, a boca desenha-se maior (é ela que diz a expressão a 20 px).
  if (options.small) out.push(`<g transform="translate(${CX} ${n(mouthY)}) scale(1.5) translate(${-CX} ${n(-mouthY)})">${out.splice(mouthStart).join('')}</g>`);

  const silhouette = (list: readonly string[], width: number): string =>
    `<g fill="${ink}" stroke="${ink}" stroke-width="${n(width)}" stroke-linejoin="round">${list.map(d => `<path d="${d}"/>`).join('')}</g>`;
  const headParts = out.splice(headOut);
  const headSilhouette = silhouette(back.splice(headBack), silhouetteW / HEAD_SCALE);
  out.splice(firstShape, 0, silhouette(back, silhouetteW));
  out.push(`<g transform="translate(${CX} ${n(chin)}) scale(${HEAD_SCALE}) translate(${-CX} ${n(-chin)})">${headSilhouette}${headParts.join('')}</g>`);
  if (options.bust) {
    // O busto: um quadrado da franja até ao peito, com a cabeça a ocupar uns três quartos, como o retrato de 28 px.
    // Fica espaço em cima para o cabelo alto e o carrapito, e em baixo para os ombros e a gola.
    const headTop = chin - HEAD_SCALE * hh;
    const y0 = headTop - (bun || (style === 2 && !curly) ? 27 : style === 1 ? 22 : 17);
    const size = chin - y0 + 26;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(CX - size / 2)} ${n(y0)} ${n(size)} ${n(size)}" width="96" height="96"><defs>${defs.join('')}</defs>${out.join('')}</svg>`;
  }
  const v = FIGURE_VIEW;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${v.x} ${v.y} ${v.width} ${v.height}" width="${v.width}" height="${v.height}"><defs>${defs.join('')}</defs>${out.join('')}</svg>`;
}

function figureKey(look: Look, options: FigureOptions): string {
  return `${kitId(look)}|${look.skin}|${look.hair}|${look.style}|${look.legs}|${look.torso}|${look.build}|${look.face}|${options.height ?? 0}|${options.trained ? 1 : 0}|${options.number ?? -1}|${options.shadow === false ? 0 : 1}|${options.mood ?? ''}|${options.bust ? 1 : 0}|${options.small ? 1 : 0}`;
}

function hashOf(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h.toString(36);
}

const cache = new Map<string, string>();

/** O mesmo boneco como imagem (data URL), para um `<img>` nos ecrãs em HTML. */
export function figureImage(look: Look, options: FigureOptions = {}): string {
  const key = figureKey(look, options);
  const hit = cache.get(key);
  if (hit) return hit;
  // Só se codifica o que um data URL exige (com aspas simples nos atributos): um terço mais curto do que encodeURIComponent.
  const svg = figureSvg(look, options).replace(/"/g, "'").replace(/[%#<>]/g, ch => encodeURIComponent(ch));
  return remember(cache, key, `data:image/svg+xml;charset=utf-8,${svg}`, 600);
}

/** O retrato (cabeça e ombros) como imagem, no mesmo desenho e com a mesma cara do boneco de corpo inteiro.
 * Substitui o `portraitImage` de pixel art: fichas, diálogos do pessoal, despedidas, mini-fichas e opções táticas.
 * `small` para quando se mostra a 32 px ou menos (.face, .cc-who, despedidas, balões de 32): traços mais grossos, olhos sem
 * branco e boca maior. */
export function portraitSvgImage(look: Look, mood: Mood = 'neutral', small = false): string {
  return figureImage(look, { bust: true, mood, small });
}
