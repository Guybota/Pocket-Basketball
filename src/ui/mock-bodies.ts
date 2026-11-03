import { Camera, courtTextures, drawHoop } from './art/court.ts';
import { BUILD_NAMES, buildOf, pixelsForHeight } from './art/body.ts';
import { portraitImage } from './art/portrait.ts';
import { drawReflection, drawShadow, drawSprite, type Build, type KitName, type Look, type PoseName } from './art/sprites.ts';

const SPRITE_W = 34;
const SPRITE_H = 46;
const FEET_Y = 43;

const element = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

function makeLook(heightCm: number, build: Build, kit: KitName, style: number, skin: number, hair: number, face: number): Look {
  return { kit, skin, hair, style, build, face, ...pixelsForHeight(heightCm) };
}

function drawTile(canvas: HTMLCanvasElement, pose: PoseName, look: Look): void {
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, canvas.width, canvas.height);
  const feet = canvas.height - (SPRITE_H - FEET_Y);
  drawShadow(g, canvas.width / 2, feet);
  drawSprite(g, pose, look, canvas.width / 2, feet, false, false, pose.startsWith('drib'));
}

function tile(pose: PoseName, look: Look, scale: number, width = SPRITE_W, height = SPRITE_H): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.className = 'tile';
  canvas.style.width = `${width * scale}px`;
  canvas.style.height = `${height * scale}px`;
  drawTile(canvas, pose, look);
  return canvas;
}

/* Laboratório: três valores, um jogador. */
const heightInput = element<HTMLInputElement>('height');
const weightInput = element<HTMLInputElement>('weight');
const strengthInput = element<HTMLInputElement>('strength');
const PRESETS: readonly (readonly [string, number, number, number])[] = [
  ['Base franzino', 176, 66, 30],
  ['Escolta', 192, 85, 50],
  ['Extremo forte', 200, 106, 82],
  ['Poste enorme', 216, 138, 55],
];

function updateLab(): void {
  const heightCm = Number(heightInput.value);
  const weightKg = Number(weightInput.value);
  const strength = Number(strengthInput.value);
  const build = buildOf(heightCm, weightKg, strength);
  const look = makeLook(heightCm, build, 'blue', 0, 1, 1, 37);
  element('heightValue').textContent = `${heightCm} cm`;
  element('weightValue').textContent = `${weightKg} kg`;
  element('strengthValue').textContent = String(strength);
  drawTile(element<HTMLCanvasElement>('labBig'), 'idle', look);
  drawTile(element<HTMLCanvasElement>('labReal'), 'idle', look);
  element<HTMLImageElement>('labFace').src = portraitImage(look);
  const meters = heightCm / 100;
  element('labType').textContent = BUILD_NAMES[build];
  element('labInfo').textContent = `Índice de massa corporal ${(weightKg / (meters * meters)).toFixed(1)} · boneco com ${look.legs + look.torso + 12} px de altura`;
}

function applyPreset(heightCm: number, weightKg: number, strength: number): void {
  heightInput.value = String(heightCm);
  weightInput.value = String(weightKg);
  strengthInput.value = String(strength);
  updateLab();
}

for (const [label, heightCm, weightKg, strength] of PRESETS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', () => applyPreset(heightCm, weightKg, strength));
  element('presets').appendChild(button);
}
for (const input of [heightInput, weightInput, strengthInput]) input.addEventListener('input', updateLab);
applyPreset(...(PRESETS[2]!.slice(1) as [number, number, number]));

/* Grelha de tipos e alturas. */
const BUILDS: readonly Build[] = ['slim', 'athletic', 'muscular', 'heavy'];
const HEIGHTS = [[178, 'Baixo, 178 cm'], [193, 'Médio, 193 cm'], [212, 'Alto, 212 cm']] as const;
const grid = element<HTMLTableElement>('grid');
const header = grid.insertRow();
header.appendChild(document.createElement('th'));
for (const build of BUILDS) {
  const cell = document.createElement('th');
  cell.textContent = BUILD_NAMES[build];
  header.appendChild(cell);
}
HEIGHTS.forEach(([heightCm, label], row) => {
  const tr = grid.insertRow();
  const head = document.createElement('th');
  head.className = 'row-head';
  head.textContent = label;
  tr.appendChild(head);
  BUILDS.forEach((build, column) => {
    tr.insertCell().appendChild(tile('idle', makeLook(heightCm, build, row % 2 ? 'cream' : 'blue', (row + column) % 5, (row * 2 + column) % 4, (row + column * 2) % 6, row * 13 + column * 5), 4, 26, 36));
  });
});

/* Poses. */
const POSES: readonly (readonly [PoseName, string])[] = [
  ['idle', 'Parado'], ['run0', 'Corrida'], ['drib0', 'Drible'], ['shoot', 'Lançamento'], ['dunk', 'Afundanço'], ['block', 'Desarme'], ['defend', 'Defesa'], ['cheer1', 'Festejo'], ['sit', 'No banco'],
];
const BUILD_EXAMPLES: Record<Build, number> = { slim: 186, athletic: 193, muscular: 198, heavy: 210 };
for (const build of BUILDS) {
  const block = document.createElement('div');
  block.style.display = 'grid';
  block.style.gap = '6px';
  const title = document.createElement('h3');
  title.textContent = BUILD_NAMES[build];
  const row = document.createElement('div');
  row.className = 'poses';
  const look = makeLook(BUILD_EXAMPLES[build], build, 'blue', 0, 1, 0, 11);
  for (const [pose, label] of POSES) {
    const item = document.createElement('div');
    item.className = 'pose';
    item.appendChild(tile(pose, look, 2));
    const caption = document.createElement('span');
    caption.textContent = label;
    item.appendChild(caption);
    row.appendChild(item);
  }
  block.append(title, row);
  element('poseRows').appendChild(block);
}

/* A mesma jogada, antes e depois. */
type Spot = readonly [x: number, y: number, pose: PoseName, kit: KitName, heightCm: number, weightKg: number, strength: number, style: number, skin: number, hair: number];
const SPOTS: readonly Spot[] = [
  [8.2, 0.4, 'drib0', 'blue', 178, 70, 30, 4, 2, 4],
  [4.9, -5.2, 'idle', 'blue', 192, 80, 45, 0, 0, 1],
  [4.4, 5, 'idle', 'blue', 199, 106, 85, 1, 1, 0],
  [3.4, 2.7, 'idle', 'blue', 206, 100, 60, 3, 3, 0],
  [2.5, -1.9, 'block', 'blue', 214, 134, 45, 2, 3, 4],
  [7, 0.2, 'defend', 'cream', 184, 72, 40, 0, 0, 3],
  [4.2, -4.1, 'defend', 'cream', 194, 88, 50, 1, 0, 1],
  [3.7, 4, 'defend', 'cream', 200, 84, 45, 0, 1, 2],
  [2.7, 1.9, 'defend', 'cream', 205, 124, 88, 3, 2, 0],
  [1.9, -1.1, 'defend', 'cream', 211, 130, 50, 2, 3, 4],
];

function drawScene(id: string, varied: boolean): void {
  const canvas = element<HTMLCanvasElement>(id);
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const camera = new Camera();
  camera.setViewport(canvas.width, canvas.height);
  camera.aim(5.8);
  const textures = courtTextures(2);
  const image = g.createImageData(canvas.width, canvas.height);
  camera.drawScene(new Uint32Array(image.data.buffer), textures, 0);
  g.putImageData(image, 0, 0);
  drawHoop(g, camera, textures.theme, 1.575, 0);
  const placed = SPOTS.map(([x, y, pose, kit, heightCm, weightKg, strength, style, skin, hair], i) => {
    const build = varied ? buildOf(heightCm, weightKg, strength) : 'athletic';
    const height = varied ? heightCm : [178, 190, 190, 205, 205][i % 5]!;
    const look = makeLook(height, build, kit, style, skin, hair, i * 7);
    const [sx, sy] = camera.project(x, y);
    return { sx, sy, pose, look };
  }).sort((a, b) => a.sy - b.sy);
  for (const p of placed) drawReflection(g, p.pose, p.look, p.sx, p.sy, false, false, textures.theme.reflection);
  for (const p of placed) {
    drawShadow(g, p.sx, p.sy);
    drawSprite(g, p.pose, p.look, p.sx, p.sy, false, false, p.pose === 'drib0');
  }
}
drawScene('sceneBefore', false);
drawScene('sceneAfter', true);

/* Retratos. */
BUILDS.forEach((build, i) => {
  const card = document.createElement('div');
  card.className = 'face-card';
  const image = document.createElement('img');
  image.className = 'px';
  image.alt = `Retrato de um jogador ${BUILD_NAMES[build].toLowerCase()}`;
  image.src = portraitImage(makeLook(193, build, i % 2 ? 'cream' : 'blue', [0, 2, 1, 3][i]!, [0, 3, 1, 2][i]!, [1, 4, 0, 0][i]!, [5, 22, 131, 74][i]!));
  image.style.background = `var(${i % 2 ? '--bg-red' : '--bg-blue'})`;
  const name = document.createElement('b');
  name.textContent = BUILD_NAMES[build];
  card.append(image, name);
  element('faces').appendChild(card);
});

// Doze jogadores ao acaso, com a mesma regra usada no jogo para escolher a aparência.
for (let i = 0; i < 12; i++) {
  let hash = 2166136261;
  for (const ch of `jogador${i}`) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
  const look = makeLook(193, i % 5 === 4 ? 'heavy' : 'athletic', i % 2 ? 'cream' : 'blue', (hash >>> 6) % 5, hash % 4, (hash >>> 3) % 6, hash >>> 9);
  const image = document.createElement('img');
  image.className = 'px';
  image.alt = `Exemplo de retrato ${i + 1}`;
  image.src = portraitImage(look);
  image.style.background = `var(${i % 2 ? '--bg-red' : '--bg-blue'})`;
  element('variety').appendChild(image);
}
