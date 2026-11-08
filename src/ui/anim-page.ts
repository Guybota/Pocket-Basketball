// Desenha as poses e os movimentos especiais numa cena à parte, para a verificação os poder ver sem correr o jogo.
import { requestTimeout, simulateMatch, type MatchState } from '../sim/match.ts';
import { clubIdentity } from './art/identity.ts';
import { drawTown, weatherFor } from './art/town.ts';
import { MOVES, type MoveId } from '../sim/types.ts';
import { drawSprite, lookOf, type PoseName } from './art/sprites.ts';
import { clubTeam, newClub, opponentOf, weekSeed } from './club.ts';
import { MatchView } from './match-view.ts';
import { scene, sheet } from './review.ts';

const POSE_NAMES: PoseName[] = ['idle', 'run0', 'run1', 'run2', 'drib0', 'drib1', 'dribRun0', 'dribRun1', 'dribRun2', 'dribRun3', 'crossover', 'stumble', 'gather', 'shoot', 'dunk', 'block', 'defend', 'pass', 'cheer0', 'cheer1', 'sit', 'fists', 'handsHead', 'slump'];
const CELL = 40;
const STRIP_W = 240;
const STRIP_H = 160;

/** Todas as poses de três jogadores diferentes: de frente, com bola, de costas e viradas. */
function poseSheet(): string {
  const club = newClub(3);
  const looks = [0, 4, 9].map(i => lookOf(club.team.roster[i]!, 'blue'));
  const canvas = document.createElement('canvas');
  canvas.width = CELL * POSE_NAMES.length;
  canvas.height = CELL * 4 * looks.length;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#56767a';
  g.fillRect(0, 0, canvas.width, canvas.height);
  looks.forEach((look, row) => {
    POSE_NAMES.forEach((pose, column) => {
      const x = column * CELL + CELL / 2;
      const y = row * CELL * 4 + CELL - 4;
      drawSprite(g, pose, look, x, y, false, false, false);
      drawSprite(g, pose, look, x, y + CELL, false, false, true);
      drawSprite(g, pose, look, x, y + CELL * 2, false, true, false);
      drawSprite(g, pose, look, x, y + CELL * 3, true, false, true);
    });
  });
  return canvas.toDataURL();
}

/** Uma semente onde o movimento acontece no primeiro jogo da época. */
function seedFor(move: MoveId): { seed: number; tick: number } | null {
  for (let seed = 1; seed <= 120; seed++) {
    const club = newClub(seed, 3);
    const s = simulateMatch(clubTeam(club), opponentOf(club), weekSeed(club), [true, false]);
    const event = s.events.find(e => e.type === 'move' && e.move === move);
    if (event) return { seed, tick: event.tick };
  }
  return null;
}

/** Imagens seguidas à volta de quem fez o movimento, uma por passo da simulação. */
function moveStrip(move: MoveId, frames: number): { image: string; floaters: number } | null {
  const found = seedFor(move);
  if (!found) return null;
  const club = newClub(found.seed, 3);
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 216;
  const view = new MatchView(canvas.getContext('2d')!, clubTeam(club), opponentOf(club), weekSeed(club), 3, { announce: () => {}, event: () => {}, sound: () => {} });
  const s: MatchState = view.s;
  while (s.tick < found.tick) view.stepSim();
  const actor = s.events.find(e => e.type === 'move' && e.move === move && e.tick === found.tick)!;
  const body = s.bodies.find(b => b.team === actor.team && b.player.name === actor.player)!;
  const strip = document.createElement('canvas');
  strip.width = STRIP_W * frames;
  strip.height = STRIP_H;
  const out = strip.getContext('2d')!;
  // Só vale a pena ver os passos a partir de quando o movimento aconteceu, por isso contam-se os rótulos nessa altura.
  const floaters = (view as unknown as { floaters: { label: string }[] }).floaters.filter(f => f.label.length > 3).length;
  for (let frame = 0; frame < frames; frame++) {
    view.render(1, 0.05);
    const [cx, cy] = (view as unknown as { camera: { project(x: number, y: number): [number, number] } }).camera.project(body.x, body.y);
    const sx = Math.max(0, Math.min(canvas.width - STRIP_W, Math.round(cx - STRIP_W / 2)));
    const sy = Math.max(0, Math.min(canvas.height - STRIP_H, Math.round(cy - STRIP_H * 0.62)));
    out.drawImage(canvas, sx, sy, STRIP_W, STRIP_H, frame * STRIP_W, 0, STRIP_W, STRIP_H);
    view.stepSim();
  }
  return { image: strip.toDataURL(), floaters };
}

type Humor = 'dog' | 'pigeon' | 'sleeper' | 'mascot';

/** Um jogo à parte numa tela de 360×216, já a meio do primeiro período: no pavilhão do clube `owner` (sem nome, o nosso), à hora e com o tempo da semana `week`. */
function venueView(division: number, owner: string | null, week: number, seed = 5): MatchView {
  const club = newClub(seed, division);
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 216;
  const identity = owner ? clubIdentity(owner) : null;
  const emblem = identity?.emblem ?? club.emblem;
  const accent = identity ? identity.emblem.primary : club.kits[0]!.jersey;
  return new MatchView(canvas.getContext('2d')!, clubTeam(club), opponentOf(club), weekSeed(club), division, { announce: () => {}, event: () => {}, sound: () => {} },
    [true, false], owner ? 0 : 1, undefined, undefined, accent, 0.9, undefined, emblem, club.emblem, undefined, weatherFor(week));
}

const frames = (view: MatchView, ticks: number): void => {
  for (let i = 0; i < ticks; i++) view.stepSim();
};
const shot = (view: MatchView, renders = 1): string => {
  for (let i = 0; i < renders; i++) view.render(1, 0.05);
  return (view as unknown as { g: CanvasRenderingContext2D }).g.canvas.toDataURL();
};

/** O pavilhão de um clube, a jogar há 15 s. */
function venueShot(division: number, owner: string | null, week: number): string {
  const view = venueView(division, owner, week);
  frames(view, 300);
  return shot(view, 30);
}

/** Os nomes dos clubes de uma divisão: para os pavilhões de três adversários diferentes. */
function rivals(division: number, count: number, mascot?: boolean): string[] {
  const club = newClub(5, division);
  const names = club.clubs.map(c => c.name).filter(name => name !== club.team.name);
  if (mascot === undefined) return names.slice(0, count);
  return names.filter(name => (venueView(division, name, 1) as unknown as { textures: { theme: { mascot?: number } } }).textures.theme.mascot !== undefined === mascot).slice(0, count);
}

/** A cidade numa divisão e numa semana. */
function townShot(division: number, week: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 574;
  drawTown(canvas.getContext('2d')!, 360, 574, division, [], 1000, { jersey: '#2b5fd9', trim: '#f2c230', poster: 'DOMINGO: CERRO BC', festive: false }, weatherFor(week));
  return canvas.toDataURL();
}

/** Um momento de humor, forçado. */
function humorShot(kind: Humor): string[] {
  if (kind === 'pigeon') {
    const view = venueView(2, null, 1);
    view.humor.pigeon = true;
    while (view.s.phase !== 'freeThrow' && view.s.tick < 9000) {
      view.stepSim();
      view.render(1, 0.05);
    }
    return [shot(view, 20), (frames(view, 1), shot(view, 10))];
  }
  if (kind === 'dog') {
    const view = venueView(0, null, 1);
    frames(view, 200);
    view.humor.dogAt = view.s.tick;
    return [70, 110, 60].map(n => {
      frames(view, n);
      return shot(view);
    });
  }
  if (kind === 'sleeper') {
    const view = venueView(3, null, 1);
    view.humor.sleeper = true;
    view.humor.blowout = 0;
    frames(view, 300);
    // A câmara segue a bola; aqui olha-se para quem dorme, com a simulação parada.
    const inside = view as unknown as { sleeperFan: number; fans: { x: number }[]; camera: { lookX: number } };
    const look = (): string => {
      inside.camera.lookX = inside.fans[inside.sleeperFan]!.x;
      view.render(1, 0, 0.05);
      return (view as unknown as { g: CanvasRenderingContext2D }).g.canvas.toDataURL();
    };
    return [look(), look(), (frames(view, 10), look())];
  }
  const view = venueView(2, rivals(2, 1, true)[0]!, 1);
  frames(view, 200);
  requestTimeout(view.s, 0);
  while (view.s.phase !== 'timeout' && view.s.tick < 4000) view.stepSim();
  frames(view, 6);
  return [shot(view, 40), (frames(view, 4), shot(view, 2))];
}

Object.assign(window, { __anim: { poseSheet, moveStrip, moves: MOVES, venueShot, rivals, townShot, humorShot, sheet, scene } });
