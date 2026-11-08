// As folhas de sprites e os cenários de teste do agente revisor (skill visual-design): desenham uma animação ou uma
// jogada fora do jogo, com cada frame numerado, e medem o que se pode medir em código. Correm na página anim.html,
// chamados por `npm run review -- <descrição.json>`.
import { createMatch, simulateMatch, step, type MatchState } from '../sim/match.ts';
import type { Body, MatchEvent } from '../sim/match-types.ts';
import { INK } from './art/palette.ts';
import { text, textWidth } from './art/font.ts';
import { ALL_POSES, drawSprite, lookOf, type KitName, type Look, type PoseName } from './art/sprites.ts';
import { weatherFor } from './art/town.ts';
import { clubTeam, newClub, opponentOf, weekSeed } from './club.ts';
import { MatchView } from './match-view.ts';
import { titleTrophy } from './trophies.ts';
import type { CupName } from '../sim/cup.ts';

/** Um aspeto: um jogador do plantel do clube de semente `club` (por omissão 3), com o que se quiser mudar por cima. */
export interface LookSpec extends Partial<Omit<Look, 'kit' | 'custom'>> {
  player?: number;
  club?: number;
  kit?: KitName;
}
/** Uma pose, ou «gesto+pernas» (por exemplo "cheer1+run0"): os braços e a bola de uma, as pernas de outra. */
export type PoseSpec = PoseName | `${string}+${string}`;
export type Variant = 'front' | 'ball' | 'back' | 'backBall' | 'flip' | 'flipBall';

export interface SheetSpec {
  kind: 'sheet';
  name: string;
  /** As poses, ou "all" para todas as de POSES. */
  poses?: PoseSpec[] | 'all';
  /** Em vez de poses soltas, uma animação com tempo: cada pose e quantos ticks dura (1 tick = 50 ms). Uma coluna por tick, com «pose 2-3» (o segundo tick de três). */
  frames?: [PoseSpec, number][];
  looks?: LookSpec[];
  variants?: Variant[];
  /** A ampliação da segunda folha (inteira). */
  zoom?: number;
  background?: string;
}

export interface SceneSpec {
  kind: 'scene';
  name: string;
  /**
   * O evento que tem de acontecer: os campos têm de bater certo com o MatchEvent, por exemplo {"type":"move","move":"powerDunk"}
   * ou {"type":"made","points":3}. Um passe não é evento da simulação: {"type":"pass"}, com "lob": true para um passe em
   * balão, procura o primeiro passe; quem passa é o ator e quem recebe aparece sempre. As marcas `dunk` e `layup` são do
   * evento `shot`, mas também se aceitam no `made`: {"type":"made","dunk":true} é o cesto de um afundanço.
   */
  force: (Partial<MatchEvent> & { type: MatchEvent['type'] }) | { type: 'pass'; lob?: boolean };
  division?: number;
  week?: number;
  /** Uma semente fixa; sem ela, procura-se a primeira em que o evento acontece. */
  seed?: number;
  /**
   * Quantos atacantes (a equipa de quem faz o evento, ele incluído) e quantos defesas se veem: os mais perto dele. Os
   * outros e o árbitro não se desenham. Por omissão, todos.
   */
  attackers?: number;
  defenders?: number;
  /** Segundos antes e depois do evento. */
  before?: number;
  after?: number;
  fps?: number;
  speed?: number;
  /** O recorte à volta de quem faz o evento, em píxeis de arte; null para o campo inteiro. */
  crop?: [number, number] | null;
  zoom?: number;
  /** Com movimento reduzido (a ferramenta emula-o no browser). */
  reducedMotion?: boolean;
  /**
   * A cerimónia do troféu depois do apito final, como depois de uma final: a taça, ou "league" para o campeonato da
   * divisão. Usa-se com {"type": "end"} em `force`, `crop` null e `after` de uns 8 s.
   */
  ceremony?: CupName | 'league';
}

const CELL_W = 40;
const CELL_H = 56;
const LABEL_H = 14;
const SHEET_BACKGROUND = '#56767a';

/** Uma folha ampliada por um inteiro, sem suavizar. */
function zoomed(canvas: HTMLCanvasElement, zoom: number): string {
  const out = document.createElement('canvas');
  out.width = canvas.width * zoom;
  out.height = canvas.height * zoom;
  const g = out.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(canvas, 0, 0, out.width, out.height);
  return out.toDataURL();
}

function lookFrom(spec: LookSpec): Look {
  const { player = 0, club = 3, kit = 'blue', ...rest } = spec;
  return { ...lookOf(newClub(club).team.roster[player]!, kit), ...rest };
}

/** O que se mede num boneco desenhado sozinho sobre fundo transparente. */
interface SpriteMeasure {
  /** A caixa dos píxeis opacos: x0, y0, x1, y1 (inclusive). */
  box: [number, number, number, number];
  /** A linha mais baixa com píxeis: onde estão os pés. */
  feet: number;
  /** Píxeis meio transparentes: num boneco têm de ser 0 (sinal de anti-aliasing, rotação ou escala fracionária). */
  semiAlpha: number;
  /** Píxeis da borda do boneco que não são tinta: o contorno tem falhas. */
  outlineGaps: number;
  colors: number;
}

function measure(g: CanvasRenderingContext2D, w: number, h: number): SpriteMeasure {
  const { data } = g.getImageData(0, 0, w, h);
  const ink = [0x1b, 0x22, 0x30];
  const alpha = (x: number, y: number): number => (x < 0 || y < 0 || x >= w || y >= h ? 0 : data[(y * w + x) * 4 + 3]!);
  let x0 = w, y0 = h, x1 = -1, y1 = -1, semiAlpha = 0, outlineGaps = 0;
  const colors = new Set<number>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3]!;
      if (a === 0) continue;
      if (a < 255) semiAlpha++;
      colors.add((data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      const edge = alpha(x - 1, y) === 0 || alpha(x + 1, y) === 0 || alpha(x, y - 1) === 0 || alpha(x, y + 1) === 0;
      if (edge && (data[i] !== ink[0] || data[i + 1] !== ink[1] || data[i + 2] !== ink[2])) outlineGaps++;
    }
  }
  return { box: [x0, y0, x1, y1], feet: y1, semiAlpha, outlineGaps, colors: colors.size };
}

/** Uma etiqueta de duas linhas por baixo de uma célula: o número e o nome. */
function label(g: CanvasRenderingContext2D, x: number, y: number, width: number, top: string, bottom: string, color = '#f4efe0'): void {
  g.fillStyle = INK;
  g.fillRect(x, y, width, LABEL_H);
  for (const [k, line] of [top, bottom].entries()) {
    let value = line.toUpperCase();
    while (value.length > 1 && textWidth(value, 1) > width - 2) value = value.slice(0, -1);
    text(g, value, x + 1, y + 2 + k * 6, color, 1);
  }
}

/**
 * A folha de sprites: uma linha por aspeto e variante, uma coluna por pose (ou por tick da animação), cada célula com o
 * número e o nome. Devolve a folha a 1×, ampliada, e as medidas de cada célula e os avisos.
 */
export function sheet(spec: SheetSpec): { image: string; zoomed: string; cells: unknown[]; warnings: string[] } {
  const columns: { pose: PoseSpec; caption: string }[] = spec.frames
    ? spec.frames.flatMap(([pose, ticks]) => Array.from({ length: ticks }, (_, k) => ({ pose, caption: `${pose} ${k + 1}-${ticks}` })))
    : (spec.poses === 'all' || !spec.poses ? ALL_POSES : spec.poses).map(pose => ({ pose, caption: pose }));
  const looks = (spec.looks ?? [{ player: 0 }, { player: 4 }, { player: 9 }]).map(lookFrom);
  const variants = spec.variants ?? ['front', 'ball', 'back', 'flip'];
  const rows = looks.flatMap((look, l) => variants.map(variant => ({ look, l, variant })));
  const canvas = document.createElement('canvas');
  canvas.width = CELL_W * columns.length;
  canvas.height = (CELL_H + LABEL_H) * rows.length;
  const g = canvas.getContext('2d')!;
  g.fillStyle = spec.background ?? SHEET_BACKGROUND;
  g.fillRect(0, 0, canvas.width, canvas.height);
  const cell = document.createElement('canvas');
  cell.width = CELL_W;
  cell.height = CELL_H;
  const c = cell.getContext('2d', { willReadFrequently: true })!;
  const cells: (SpriteMeasure & { row: number; column: number; look: number; variant: Variant; pose: PoseSpec; mirrorDiff?: number })[] = [];
  const warnings: string[] = [];
  const front = new Map<string, ImageData>();
  rows.forEach(({ look, l, variant }, row) => {
    columns.forEach(({ pose, caption }, column) => {
      c.clearRect(0, 0, CELL_W, CELL_H);
      const flip = variant.startsWith('flip');
      const ball = variant === 'ball' || variant === 'backBall' || variant === 'flipBall';
      // «gesto+pernas»: os braços de uma pose com as pernas de outra, como no jogo a andar.
      const [arms, legs] = pose.split('+') as [PoseName, PoseName | undefined];
      drawSprite(c, arms, look, CELL_W / 2, CELL_H - 6, flip, variant.startsWith('back'), ball, legs);
      const m = measure(c, CELL_W, CELL_H);
      const entry: (typeof cells)[number] = { ...m, row, column, look: l, variant, pose };
      // O virado tem de ser o espelho exato do de frente (com ou sem bola).
      const pixels = c.getImageData(0, 0, CELL_W, CELL_H);
      const key = `${l}:${column}:${ball}`;
      if (!flip && !variant.startsWith('back')) front.set(key, pixels);
      const original = front.get(key);
      if (flip && original) {
        // O virado pode ficar uma coluna ao lado do espelho exato (a âncora é um píxel, não uma aresta): conta o melhor encaixe.
        let best = Infinity;
        for (const shift of [-2, -1, 0, 1, 2]) {
          let diff = 0;
          for (let y = 0; y < CELL_H; y++) {
            for (let x = 0; x < CELL_W; x++) {
              const mx = CELL_W - 1 - x + shift;
              const a = (y * CELL_W + x) * 4;
              const b = (y * CELL_W + mx) * 4;
              const there = mx >= 0 && mx < CELL_W;
              if ((there ? original.data[b + 3] : 0) !== pixels.data[a + 3] || (there && pixels.data[a] !== original.data[b])) diff++;
            }
          }
          best = Math.min(best, diff);
        }
        entry.mirrorDiff = best;
        if (best) warnings.push(`#${String(column + 1).padStart(2, '0')} ${pose} (aspeto ${l + 1}, ${variant}): o virado difere do espelho em ${best} píxeis`);
      }
      cells.push(entry);
      g.drawImage(cell, column * CELL_W, row * (CELL_H + LABEL_H));
      label(g, column * CELL_W, row * (CELL_H + LABEL_H) + CELL_H, CELL_W - 1, String(column + 1).padStart(2, '0'), caption);
      const where = `#${String(column + 1).padStart(2, '0')} ${pose} (aspeto ${l + 1}, ${variant})`;
      if (m.semiAlpha) warnings.push(`${where}: ${m.semiAlpha} píxeis meio transparentes`);
      if (m.outlineGaps) warnings.push(`${where}: ${m.outlineGaps} píxeis da borda sem contorno de tinta`);
      if (m.box[2] < 0) warnings.push(`${where}: célula vazia`);
      else if (m.box[0] === 0 || m.box[1] === 0 || m.box[2] === CELL_W - 1) warnings.push(`${where}: o boneco toca a borda da célula`);
    });
  });
  // Numa animação com tempo, os pés de cada linha deviam ficar na mesma linha (a não ser que a pose salte).
  if (spec.frames) {
    for (let row = 0; row < rows.length; row++) {
      const feet = cells.filter(e => e.row === row).map(e => e.feet);
      if (Math.max(...feet) - Math.min(...feet) > 0) warnings.push(`linha ${row + 1}: os pés variam entre as linhas ${Math.min(...feet)} e ${Math.max(...feet)} (só é certo em saltos)`);
    }
  }
  return { image: canvas.toDataURL(), zoomed: zoomed(canvas, spec.zoom ?? 4), cells, warnings };
}

type Found = { seed: number; event: MatchEvent; receiver?: string };
/** Um frame do cenário: o tick, a pose do ator, os píxeis mudados, e onde cada boneco, a bola e os rótulos foram desenhados
 * (em píxeis do campo inteiro, não do recorte; `wx` e `wy` em metros, no campo), a parte do ator tapada pelos rótulos (%) e o tremor do ecrã. */
type Frame = {
  frame: number; tick: number; pose: PoseName | null; changed: number;
  bodies: { name: string; team: number; slot: number; pose: PoseName; x: number; y: number; lift: number; wx: number; wy: number; back: boolean; legs: PoseName | null }[];
  ball: [number, number] | null; labels: number[][]; cover: number; shake: string;
  /** Onde fica o centro do campo no ecrã: tira-se às posições para as ter relativas à câmara. */
  camera: [number, number];
};

/** A primeira semente (de 1 a 300) em que o evento acontece no primeiro jogo da época, e o próprio evento. */
function findEvent(spec: SceneSpec): Found | null {
  const division = spec.division ?? 2;
  const force = spec.force;
  for (let seed = spec.seed ?? 1; seed <= (spec.seed ?? 300); seed++) {
    const club = newClub(seed, division);
    if (force.type === 'pass') {
      // Os passes não ficam nos eventos: anda-se passo a passo até haver um a voar.
      const s = createMatch(clubTeam(club), opponentOf(club), weekSeed(club), [true, false]);
      let last: unknown = null;
      while (s.phase !== 'end' && s.tick < 20000) {
        step(s);
        const f = s.flight;
        const fresh = f !== last;
        last = f;
        // Um passe novo, em jogo corrido (não a repor a bola).
        if (fresh && f?.kind === 'pass' && !f.restart && (force.lob === undefined || f.lob === force.lob)) {
          return { seed, event: { type: 'turnover', tick: s.tick, period: s.period, clock: 0, team: f.passer.team, player: f.passer.player.name }, receiver: f.target.player.name };
        }
      }
      continue;
    }
    const s = simulateMatch(clubTeam(club), opponentOf(club), weekSeed(club), [true, false]);
    // Um cesto herda as marcas do lançamento que o fez (afundanço, lay-up), que só vêm no evento `shot`.
    let shot: MatchEvent | undefined;
    const event = s.events.find(e => {
      if (e.type === 'shot') shot = e;
      const last = shot;
      const fields = e.type === 'made' && last && last.player === e.player && last.team === e.team ? { dunk: last.dunk, layup: last.layup, ...e } : e;
      return Object.entries(force).every(([k, v]) => (fields as unknown as Record<string, unknown>)[k] === v);
    });
    if (event) return { seed, event };
  }
  return null;
}

/**
 * O cenário de teste: o jogo à volta de um evento, gravado a `fps` com o relógio fixo (a simulação anda 20 passos por
 * segundo de jogo e cada frame desenha-se com a fração que falta). Devolve os frames, a folha de contacto e as medidas.
 */
export function scene(spec: SceneSpec): { seed: number; tick: number; frames: string[]; sheet: string; timeline: unknown[]; warnings: string[] } | { error: string } {
  const found = findEvent(spec);
  if (!found) return { error: `O evento ${JSON.stringify(spec.force)} não acontece em nenhuma das sementes procuradas` };
  const record = (): { frames: string[]; canvases: HTMLCanvasElement[]; timeline: Frame[]; eventFrame: number } => {
    const division = spec.division ?? 2;
    const club = newClub(found.seed, division);
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 216;
    const view = new MatchView(canvas.getContext('2d', { willReadFrequently: true })!, clubTeam(club), opponentOf(club), weekSeed(club), division,
      { announce: () => {}, event: () => {}, sound: () => {} }, [true, false], 1, undefined, undefined, undefined, 0.9, undefined, undefined, club.emblem, undefined, weatherFor(spec.week ?? 1));
    const s: MatchState = view.s;
    const { camera } = view as unknown as { camera: { project(x: number, y: number): [number, number] } };
    const fps = spec.fps ?? 30;
    const speed = spec.speed ?? 1;
    const start = Math.max(0, found.event.tick - Math.round((spec.before ?? 0.5) * 20));
    while (s.tick < start) view.stepSim();
    const actor = s.bodies.find(b => b.player.name === found.event.player && b.team === found.event.team) ?? null;
    if (actor && (spec.defenders !== undefined || spec.attackers !== undefined)) {
      const receiver = s.bodies.find(b => b.player.name === found.receiver && b.team === actor.team);
      const fixed = receiver ? [actor, receiver] : [actor];
      const near = (team: number, count: number): Body[] =>
        s.bodies.filter(b => !fixed.includes(b) && b.team === team && b.slot >= 0).sort((a, b) => Math.hypot(a.x - actor.x, a.y - actor.y) - Math.hypot(b.x - actor.x, b.y - actor.y)).slice(0, Math.max(0, count));
      const shown = new Set([...fixed, ...near(1 - actor.team, spec.defenders ?? 5), ...near(actor.team, (spec.attackers ?? 5) - fixed.length)]);
      view.visible = b => shown.has(b);
    }
    const total = Math.round(((spec.before ?? 0.5) + (spec.after ?? 2.5)) * fps);
    const crop = spec.crop === undefined ? ([160, 120] as const) : spec.crop;
    const out = document.createElement('canvas');
    out.width = crop ? crop[0] : canvas.width;
    out.height = crop ? crop[1] : canvas.height;
    const o = out.getContext('2d', { willReadFrequently: true })!;
    const frames: string[] = [];
    const canvases: HTMLCanvasElement[] = [];
    const timeline: Frame[] = [];
    let previous: Uint8ClampedArray | null = null;
    let eventFrame = -1;
    let ceremonyStarted = false;
    for (let n = 0; n < total; n++) {
      const time = (n / fps) * 20 * speed;
      // Depois do apito final a simulação já não anda.
      while (s.tick < start + Math.floor(time) && s.phase !== 'end') view.stepSim();
      if (spec.ceremony && s.phase === 'end' && !ceremonyStarted) {
        ceremonyStarted = true;
        const trophy = titleTrophy(spec.ceremony === 'league' ? { kind: 'league', division } : { kind: 'cup', cup: spec.ceremony });
        view.startCeremony(trophy.kind, trophy.banner, s.score[0] > s.score[1] ? 0 : 1);
      }
      view.render(time - Math.floor(time), speed / fps, 1 / fps);
      if (eventFrame < 0 && s.tick >= found.event.tick) eventFrame = n;
      o.clearRect(0, 0, out.width, out.height);
      // O ator onde foi desenhado, já interpolado, para o recorte não tremer com ele.
      const drawn = actor ? view.drawn.bodies.get(actor) : undefined;
      if (crop && actor) {
        const [cx, cy] = drawn ? [drawn.x, drawn.y] : camera.project(actor.x, actor.y);
        const sx = Math.max(0, Math.min(canvas.width - crop[0], Math.round(cx - crop[0] / 2)));
        const sy = Math.max(0, Math.min(canvas.height - crop[1], Math.round(cy - crop[1] * 0.62)));
        o.drawImage(canvas, sx, sy, crop[0], crop[1], 0, 0, crop[0], crop[1]);
      } else o.drawImage(canvas, 0, 0);
      const pixels = o.getImageData(0, 0, out.width, out.height).data;
      let changed = 0;
      if (previous) for (let i = 0; i < pixels.length; i += 4) if (pixels[i] !== previous[i] || pixels[i + 1] !== previous[i + 1] || pixels[i + 2] !== previous[i + 2]) changed++;
      previous = pixels;
      frames.push(out.toDataURL());
      const copy = document.createElement('canvas');
      copy.width = out.width;
      copy.height = out.height;
      copy.getContext('2d')!.drawImage(out, 0, 0);
      canvases.push(copy);
      const round = (v: number): number => Math.round(v * 10) / 10;
      const bodies = [...view.drawn.bodies].map(([b, d]) => ({ name: b.player.name, team: b.team, slot: b.slot, pose: d.pose, x: round(d.x), y: round(d.y), lift: round(d.lift), wx: Math.round(d.world.x * 1000) / 1000, wy: Math.round(d.world.y * 1000) / 1000, back: d.back === true, legs: d.legs ?? null }));
      // Quanto da caixa do ator (14 px de largura, da altura do boneco, acima do salto) os rótulos tapam.
      let cover = 0;
      if (drawn && actor) {
        const h = drawn.height;
        const [ax0, ay0, ax1, ay1] = [drawn.x - 7, drawn.y - drawn.lift - h, drawn.x + 7, drawn.y - drawn.lift];
        for (const [lx, ly, lw, lh] of view.drawn.labels) cover += Math.max(0, Math.min(ax1, lx + lw) - Math.max(ax0, lx)) * Math.max(0, Math.min(ay1, ly + lh) - Math.max(ay0, ly)) / (14 * h);
      }
      timeline.push({
        frame: n + 1, tick: s.tick, pose: actor ? view.bodyPose(actor) : null, changed, bodies,
        ball: view.drawn.ball && [round(view.drawn.ball[0]), round(view.drawn.ball[1])], labels: view.drawn.labels.map(l => [...l]), cover: round(cover * 100), shake: canvas.style.transform,
        camera: camera.project(14, 0).map(round) as [number, number],
      });
    }
    return { frames, canvases, timeline, eventFrame };
  };
  const first = record();
  const warnings: string[] = [];
  // Duas gravações da mesma cena têm de sair iguais, senão a revisão não se pode repetir.
  const second = record();
  const differing = first.frames.findIndex((f, i) => f !== second.frames[i]);
  if (differing >= 0) warnings.push(`não é determinista: o frame ${differing + 1} sai diferente na segunda gravação`);
  // Poses que duram menos de um tick trocam depressa demais para se lerem.
  let run = 1;
  for (let i = 1; i <= first.timeline.length; i++) {
    const current = first.timeline[i]?.pose;
    if (current === first.timeline[i - 1]!.pose) run++;
    else {
      const fps = spec.fps ?? 30;
      if (run * 20 * (spec.speed ?? 1) < fps && i < first.timeline.length) warnings.push(`frames ${i - run + 1}–${i}: a pose ${first.timeline[i - 1]!.pose} dura só ${run} frame(s), menos de um tick`);
      run = 1;
    }
  }
  return { seed: found.seed, tick: found.event.tick, frames: first.frames, sheet: contactSheet(first.canvases, first.timeline, first.eventFrame, spec), timeline: first.timeline, warnings };
}

/** A folha de contacto: 10 frames por linha, cada um com «número · tick · pose», o frame do evento a dourado. */
function contactSheet(frames: HTMLCanvasElement[], timeline: { frame: number; tick: number; pose: PoseName | null }[], eventFrame: number, spec: SceneSpec): string {
  const crop = spec.crop === undefined ? [160, 120] : spec.crop ?? [360, 216];
  const [w, h] = crop as [number, number];
  const per = 10;
  const canvas = document.createElement('canvas');
  canvas.width = per * (w + 2);
  canvas.height = Math.ceil(frames.length / per) * (h + LABEL_H + 2);
  const g = canvas.getContext('2d')!;
  g.fillStyle = INK;
  g.fillRect(0, 0, canvas.width, canvas.height);
  frames.forEach((image, n) => {
    const x = (n % per) * (w + 2) + 1;
    const y = Math.floor(n / per) * (h + LABEL_H + 2) + 1;
    if (n === eventFrame) {
      g.fillStyle = '#f2c230';
      g.fillRect(x - 1, y - 1, w + 2, h + LABEL_H + 2);
    }
    g.drawImage(image, x, y);
    const t = timeline[n]!;
    label(g, x, y + h, w, `${String(t.frame).padStart(4, '0')} T${t.tick}`, t.pose ?? '', n === eventFrame ? '#f2c230' : '#f4efe0');
  });
  return zoomed(canvas, spec.zoom ?? 2);
}
